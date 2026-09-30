// 站主自持路由：哪些路由允许由服务端注入站主凭据，以及注入前的三道闸。
//
// 为什么裁决点在 API 层而不是 nginx 再加一条 location：
// www vhost 里已经有一份 lua 注入（`/api/netapi/song`，自带 Referer 门禁 + limit_req），
// 同一条策略落到第二个地方，将来只会变成「两处规则不一致」。而 scrobble 需要的恰恰是
// lua 里写不动的东西 —— 按调用方身份分档冷却。故新规则一律进这里，nginx 不再新增注入。
//
// 凭据来源与 lua 那份同源：`credentialStore.read()` 读 /data/netease-credential.json
// （宿主 /www/wwwroot/ncm-share），不是第二个凭据副本。
//
// 注入的语义后果：本站播放器只带本站登录态、不带任何网易云 cookie，所以「无凭据即注入」
// 等价于「本站访客的播放行为记到站主账号」—— 这正是目的。因此下面两道闸缺一不可：
// 页面来源门禁（站外/脚本直连一律不注入，退回改造前的匿名行为）、
// 每 IP 最短间隔与小时配额（挡刷），
// 且白名单只放纯写播放记录的端点，任何能读到账号数据的端点都不进来。
import { cookieToJson } from './cookies'
import * as credentialStore from './credential-store'
import type { CookieJar } from '../types'

/** 允许触发注入的页面来源：本站各子域；本地开发经 vite 代理转发，Origin 是 localhost */
const ALLOWED_PAGE_ORIGIN =
  /^https?:\/\/([\w-]+\.)*(roginx\.ink|localhost|127\.0\.0\.1)(?::\d+)?(?:\/|$)/

export interface OwnerRequest {
  ip: string
  headers: { origin?: string; referer?: string; 'sec-fetch-site'?: string }
}

/**
 * 这次请求是本站页面发起的吗？
 *
 * 主判据必须是 Sec-Fetch-Site 而不是 Referer —— 本站 index.html 里有
 * `<meta name="referrer" content="no-referrer">`（防盗链），页面发出的任何请求都不带
 * Referer，只认 Referer 的门禁会把真实上报 100% 拒掉（浏览器实测踩过）。
 * 而这个头由浏览器控制、页面脚本改不了，是跨站滥用的硬拦网。
 * 只有老浏览器不发它时，才退回 Origin/Referer 白名单。
 */
const isOwnPage = (req: OwnerRequest): boolean => {
  const fetchSite = req.headers['sec-fetch-site']
  if (fetchSite === 'same-origin') return true
  const page = req.headers.origin || req.headers.referer || ''
  if (fetchSite) return fetchSite === 'same-site' && ALLOWED_PAGE_ORIGIN.test(page)
  return ALLOWED_PAGE_ORIGIN.test(page)
}

interface OwnerPolicy {
  /** 同一 IP 两次放行的最短间隔 */
  minIntervalMs: number
  /** 同一 IP 一小时内的放行上限 */
  hourlyCap: number
}

/** 站主自持路由白名单。加条目 = 扩凭据使用面，必须逐条审。 */
export const OWNER_SELF_ROUTES: Record<string, OwnerPolicy> = {
  // /scrobble → weapi/feedback/weblog，只追加听歌记录，不返回也不读账号数据
  '/scrobble': { minIntervalMs: 10_000, hourlyCap: 120 },
}

export type OwnerVerdict =
  /** 不归本模块管：非白名单路由、调用方自带凭据、来源不可信、或站主凭据尚未落盘 —— 原样走匿名 */
  | { action: 'skip' }
  /** 用站主凭据替换调用方的空 jar */
  | { action: 'inject'; cookie: CookieJar }
  /** 超出配额（此时绝不外传凭据） */
  | { action: 'reject'; status: number; msg: string }

interface Ledger {
  lastAt: number
  windowStart: number
  count: number
}

const ledger = new Map<string, Ledger>()

/** 清掉过期桶。条目只在白名单路由被命中时增长，顺带回收防止长期驻留 */
const prune = (now: number): void => {
  if (ledger.size < 64) return
  for (const [ip, entry] of ledger) {
    if (now - entry.windowStart > 3_600_000) ledger.delete(ip)
  }
}

/**
 * 裁决一次站主凭据的使用。
 *
 * @param hasOwnCredential 调用方是否已带 MUSIC_U/MUSIC_A —— 带了就以调用方身份为准，
 *   绝不覆盖（music.roginx.ink 上登录用户自报播放走的正是这一支）
 */
export const ownerVerdict = (
  req: OwnerRequest,
  route: string,
  hasOwnCredential: boolean,
): OwnerVerdict => {
  const policy = OWNER_SELF_ROUTES[route]
  if (!policy || hasOwnCredential) return { action: 'skip' }

  // 来源不可信 → 不注入，但也不拦。/scrobble 在改造前就对所有调用方开放（脚本直连是
  // 这门 API 的正常用法），门禁的职责是「保住站主凭据不被站外白嫖」，不是把一条原有
  // 路由改成默认拒绝 —— 那就成了未经批准的接口封锁。
  if (!isOwnPage(req)) return { action: 'skip' }

  const entry = credentialStore.read()
  if (!entry) return { action: 'skip' }

  // 过了来源与凭据两道闸才开始记账：配额只针对「真会消耗站主账号」的请求
  const now = Date.now()
  const hit = ledger.get(req.ip)
  if (hit && now - hit.windowStart > 3_600_000) ledger.delete(req.ip)
  const bucket = ledger.get(req.ip) || { lastAt: 0, windowStart: now, count: 0 }

  if (now - bucket.lastAt < policy.minIntervalMs) {
    return { action: 'reject', status: 429, msg: 'scrobble too fast' }
  }
  if (bucket.count >= policy.hourlyCap) {
    return { action: 'reject', status: 429, msg: 'scrobble quota exceeded' }
  }

  bucket.lastAt = now
  bucket.count += 1
  ledger.set(req.ip, bucket)
  prune(now)

  return { action: 'inject', cookie: cookieToJson(entry.cookie) }
}

export default { ownerVerdict, OWNER_SELF_ROUTES }
