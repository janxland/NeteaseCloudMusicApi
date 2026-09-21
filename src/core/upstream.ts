// 上游请求唯一入口：四种加密 + 进程级连接复用 + 代理。
// 由原 util/request.js 完整内联（不再 require 任何 util/*.js），行为逐行对齐。
import http from 'node:http'
import https from 'node:https'
import { URLSearchParams } from 'node:url'

import axios from 'axios'

import { decrypt, eapi, linuxapi, weapi } from './crypto'
import { DEVICE } from './client-profile'
import config from './config.json'
import type { ModuleRequest, ModuleResult, UpstreamOptions } from '../types'

// pac-proxy-agent / tunnel 无官方类型，按需 require 收口。
//
// 这两个包必须在**首次用到代理时**才加载：pac-proxy-agent 一个包的 require 就要
// ~108 ms / +24 MB 常驻（它会把 pac 解析链路全拉起来），而代理是**每请求可选参数**
// （?proxy=...），绝大多数部署一次都不用。放顶层等于让所有请求替它买单。
// 加载失败会抛给调用方（在 getProxyAgents 里），与「解灰」同一套惰性策略。
let pacProxyAgent: any
let tunnel: any
const loadProxyModules = () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  pacProxyAgent ||= require('pac-proxy-agent')
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  tunnel ||= require('tunnel')
  return { pacProxyAgent, tunnel }
}

// 进程级共享 Agent：原实现在每次 createRequest 里 new Agent，请求结束即被丢弃，
// keepAlive 从未真正复用 —— 每个上游调用都付一次 TCP+TLS 握手。
const sharedHttpAgent = new http.Agent({ keepAlive: true, maxFreeSockets: 64 })
const sharedHttpsAgent = new https.Agent({ keepAlive: true, maxFreeSockets: 64 })

// 代理 Agent 按代理地址缓存复用（tunnel agent 每请求新建会泄漏 socket 与监听器）
const proxyAgentCache = new Map<string, Record<string, any>>()
const getProxyAgents = (proxy: string) => {
  if (proxyAgentCache.has(proxy)) return proxyAgentCache.get(proxy)
  const { pacProxyAgent: PacProxyAgent, tunnel } = loadProxyModules()
  let agents: Record<string, any> | null
  if (proxy.indexOf('pac') > -1) {
    agents = { httpAgent: new PacProxyAgent(proxy), httpsAgent: new PacProxyAgent(proxy) }
  } else {
    const purl = new URL(proxy)
    if (!purl.hostname) return null
    const agent = tunnel.httpsOverHttp({
      proxy: { host: purl.hostname, port: purl.port || 80 },
    })
    agents = { httpAgent: agent, httpsAgent: agent }
  }
  proxyAgentCache.set(proxy, agents)
  return agents
}

const USER_AGENT_POOLS: Record<string, string[]> = {
  mobile: [
    // iOS 13.5.1 14.0 beta with safari
    'Mozilla/5.0 (iPhone; CPU iPhone OS 13_5_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.1.1 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.',
    // iOS with qq micromsg
    'Mozilla/5.0 (iPhone; CPU iPhone OS 13_5_1 like Mac OS X) AppleWebKit/602.1.50 (KHTML like Gecko) Mobile/14A456 QQ/6.5.7.408 V1_IPH_SQ_6.5.7_1_APP_A Pixel/750 Core/UIWebView NetType/4G Mem/103',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 13_5_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/7.0.15(0x17000f27) NetType/WIFI Language/zh',
    // Android -> Huawei Xiaomi
    'Mozilla/5.0 (Linux; Android 9; PCT-AL10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/70.0.3538.64 HuaweiBrowser/10.0.3.311 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; U; Android 9; zh-cn; Redmi Note 8 Build/PKQ1.190616.001) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/71.0.3578.141 Mobile Safari/537.36 XiaoMi/MiuiBrowser/12.5.22',
    // Android + qq micromsg
    'Mozilla/5.0 (Linux; Android 10; YAL-AL00 Build/HUAWEIYAL-AL00; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/78.0.3904.62 XWEB/2581 MMWEBSDK/200801 Mobile Safari/537.36 MMWEBID/3027 MicroMessenger/7.0.18.1740(0x27001235) Process/toolsmp WeChat/arm64 NetType/WIFI Language/zh_CN ABI/arm64',
    'Mozilla/5.0 (Linux; U; Android 8.1.0; zh-cn; BKK-AL10 Build/HONORBKK-AL10) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/66.0.3359.126 MQQBrowser/10.6 Mobile Safari/537.36',
  ],
  pc: [
    // macOS 10.15.6  Firefox / Chrome / Safari
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:80.0) Gecko/20100101 Firefox/80.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/86.0.4240.30 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.1.2 Safari/605.1.15',
    // Windows 10 Firefox / Chrome / Edge
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:80.0) Gecko/20100101 Firefox/80.0',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/86.0.4240.30 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/42.0.2311.135 Safari/537.36 Edge/13.10586',
  ],
}

/**
 * 上游在池内随机取值，导致同一份 cookie 每请求换一个 UA —— 这是网易云
 * 最容易识别的设备异常。此处固定取池内首个，具体值由 config.device.userAgent 覆盖。
 */
const chooseUserAgent = (ua: string | false = false): string => {
  if (DEVICE.userAgent) return DEVICE.userAgent
  if (ua === false) return USER_AGENT_POOLS.pc[0]
  return USER_AGENT_POOLS[ua] ? USER_AGENT_POOLS[ua][0] : ua
}

const buildCookieHeader = (jar: Record<string, any>): string =>
  Object.keys(jar)
    .map((key) => encodeURIComponent(key) + '=' + encodeURIComponent(jar[key]))
    .join('; ')

const createRequest = async (
  method: string,
  url: string,
  data: Record<string, any> = {},
  options: UpstreamOptions = {},
): Promise<ModuleResult> => {
  const headers: Record<string, any> = { 'User-Agent': chooseUserAgent(options.ua ?? false) }
  if (method.toUpperCase() === 'POST')
    headers['Content-Type'] = 'application/x-www-form-urlencoded'
  if (url.includes('music.163.com')) headers['Referer'] = 'https://music.163.com'

  const ip = DEVICE.forwardRealIp ? options.realIP || options.ip || '' : ''
  if (ip) {
    headers['X-Real-IP'] = ip
    headers['X-Forwarded-For'] = ip
  }

  if (typeof options.cookie === 'object' && options.cookie !== null) {
    const cookie = options.cookie as Record<string, any>
    // 网易云账号层要求 Cookie 里带 os：缺失时 /nuser/account/get 回 account:null、
    // /user/subcount 等回 code:301，即使 MUSIC_U 完全有效也一律「未登录」。
    // 仅对携带真实凭据的请求补齐 —— 匿名态本就无账号（account:null 是正确答案），
    // 给它补 os 只会平白改变其身份语义。只填不覆盖：调用方显式指定的值优先
    // （如 user/comment/history 需要 os=ios 走移动端通道）。
    const credentialed = Boolean(cookie.MUSIC_U || cookie.MUSIC_A)
    if (credentialed && !cookie.os) cookie.os = DEVICE.os
    const jar: Record<string, any> = {
      ...cookie,
      __remember_me: true,
      NMTID: DEVICE.nmtid,
      _ntes_nuid: DEVICE.ntesNuid,
    }
    if (!jar.MUSIC_U && !jar.MUSIC_A) {
      // 游客
      jar.MUSIC_A = config.anonymous_token
    }
    options.cookie = jar
    headers['Cookie'] = buildCookieHeader(jar)
  } else if (options.cookie) {
    headers['Cookie'] = options.cookie as string
  } else {
    headers['Cookie'] = '__remember_me=true; NMTID=xxx'
  }

  if (options.crypto === 'weapi') {
    const csrfToken = (headers['Cookie'] || '').match(/_csrf=([^(;|$)]+)/)
    data.csrf_token = csrfToken ? csrfToken[1] : ''
    data = weapi(data) as unknown as Record<string, any>
    url = url.replace(/\w*api/, 'weapi')
  } else if (options.crypto === 'linuxapi') {
    data = linuxapi({
      method,
      url: url.replace(/\w*api/, 'api'),
      params: data,
    }) as unknown as Record<string, any>
    headers['User-Agent'] =
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3112.90 Safari/537.36'
    url = 'https://music.163.com/api/linux/forward'
  } else if (options.crypto === 'eapi') {
    const cookie = (options.cookie || {}) as Record<string, any>
    const csrfToken = cookie['__csrf'] || ''
    const header: Record<string, any> = {
      osver: cookie.osver, //系统版本
      deviceId: cookie.deviceId,
      appver: cookie.appver || '8.9.70', // app版本
      versioncode: cookie.versioncode || '140', //版本号
      mobilename: cookie.mobilename, //设备model
      buildver: cookie.buildver || Date.now().toString().substr(0, 10),
      resolution: cookie.resolution || '1920x1080', //设备分辨率
      __csrf: csrfToken,
      os: cookie.os || 'android',
      channel: cookie.channel,
      requestId: `${Date.now()}_${Math.floor(Math.random() * 1000)
        .toString()
        .padStart(4, '0')}`,
    }
    if (cookie.MUSIC_U) header['MUSIC_U'] = cookie.MUSIC_U
    if (cookie.MUSIC_A) header['MUSIC_A'] = cookie.MUSIC_A
    headers['Cookie'] = buildCookieHeader(header)
    data.header = header
    data = eapi(options.url || url, data) as unknown as Record<string, any>
    url = url.replace(/\w*api/, 'eapi')
  }

  const answer: ModuleResult = { status: 500, body: {}, cookie: [] }
  const settings: Record<string, any> = {
    method,
    url,
    headers,
    data: new URLSearchParams(data).toString(),
    httpAgent: sharedHttpAgent,
    httpsAgent: sharedHttpsAgent,
  }

  if (options.crypto === 'eapi') {
    settings.encoding = null
    settings.responseType = 'arraybuffer'
  }

  if (options.proxy) {
    const agents = getProxyAgents(options.proxy)
    if (agents) {
      settings.httpAgent = agents.httpAgent
      settings.httpsAgent = agents.httpsAgent
      settings.proxy = false
    } else {
      console.error('代理配置无效,不使用代理')
    }
  } else {
    settings.proxy = false
  }

  let res: any
  try {
    res = await axios(settings)
  } catch (err) {
    // 网络层失败：与旧版一致，统一 502 + 原始错误
    answer.status = 502
    answer.body = { code: 502, msg: err }
    throw answer
  }

  {
    const body = res.data
    answer.cookie = (res.headers['set-cookie'] || []).map((x: string) =>
      x.replace(/\s*Domain=[^(;|$)]+;*/, ''),
    )
    try {
      answer.body =
        options.crypto === 'eapi' ? JSON.parse(decrypt(body).toString()) : body
      answer.status = answer.body.code || res.status
      if ([201, 302, 400, 502, 800, 801, 802, 803].indexOf(answer.body.code) > -1) {
        // 特殊状态码
        answer.status = 200
      }
    } catch {
      try {
        answer.body = JSON.parse(body.toString())
      } catch {
        // can't decrypt and can't parse directly
        answer.body = body
      }
      answer.status = res.status
    }

    answer.status = 100 < answer.status && answer.status < 600 ? answer.status : 400
    // 非 200 一律以 reject 抛出：module 的 .catch 分支依赖 status/body 原样传递
    if (answer.status === 200) return answer
    throw answer
  }
}

export const upstream: ModuleRequest = (method, url, data = {}, options = {}) =>
  createRequest(method, url, data, options)

export default upstream
