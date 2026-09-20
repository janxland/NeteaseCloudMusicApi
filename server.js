const fs = require('fs')
const path = require('path')
const express = require('express')
const request = require('./util/request')
const packageJSON = require('./package.json')
const exec = require('child_process').exec
const cache = require('./util/apicache').middleware
const { cachePolicy, cacheKeyOf } = require('./util/cache-policy')
const { cookieToJson } = require('./util/index')
const fileUpload = require('express-fileupload')
const decode = require('safe-decode-uri-component')
const { qq } = require('./util/qq')
const { kugou } = require('./util/kugou')

// LOG_REQUESTS=1 时打印每条请求的 [OK] 日志
const LOG_REQUESTS = process.env.LOG_REQUESTS === '1'
const CACHE_TTL = '2 minutes'
/**
 * The version check result.
 * @readonly
 * @enum {number}
 */
const VERSION_CHECK_RESULT = {
  FAILED: -1,
  NOT_LATEST: 0,
  LATEST: 1,
}

/**
 * @typedef {{
 *   identifier?: string,
 *   route: string,
 *   module: any
 * }} ModuleDefinition
 */

/**
 * @typedef {{
 *   port?: number,
 *   host?: string,
 *   checkVersion?: boolean,
 *   moduleDefs?: ModuleDefinition[]
 * }} NcmApiOptions
 */

/**
 * @typedef {{
 *   status: VERSION_CHECK_RESULT,
 *   ourVersion?: string,
 *   npmVersion?: string,
 * }} VersionCheckResult
 */

/**
 * @typedef {{
 *  server?: import('http').Server,
 * }} ExpressExtension
 */

/**
 * Get the module definitions dynamically.
 *
 * @param {string} modulesPath The path to modules (JS).
 * @param {Record<string, string>} [specificRoute] The specific route of specific modules.
 * @param {boolean} [doRequire] If true, require() the module directly.
 * Otherwise, print out the module path. Default to true.
 * @returns {Promise<ModuleDefinition[]>} The module definitions.
 *
 * @example getModuleDefinitions("./module", {"album_new.js": "/album/create"})
 */
async function getModulesDefinitions(
  modulesPath,
  specificRoute,
  doRequire = true,
) {
  const files = await fs.promises.readdir(modulesPath)
  const parseRoute = (/** @type {string} */ fileName) =>
    specificRoute && fileName in specificRoute
      ? specificRoute[fileName]
      : `/${fileName.replace(/\.js$/i, '').replace(/_/g, '/')}`

  const modules = files
    .reverse()
    .filter((file) => file.endsWith('.js'))
    .map((file) => {
      const identifier = file.split('.').shift()
      const route = parseRoute(file)
      const modulePath = path.join(modulesPath, file)
      const module = doRequire ? require(modulePath) : modulePath

      return { identifier, route, module }
    })

  return modules
}

/**
 * Check if the version of this API is latest.
 *
 * @returns {Promise<VersionCheckResult>} If true, this API is up-to-date;
 * otherwise, this API should be upgraded and you would
 * need to notify users to upgrade it manually.
 */
async function checkVersion() {
  return new Promise((resolve) => {
    exec('npm info NeteaseCloudMusicApi version', (err, stdout) => {
      if (!err) {
        let version = stdout.trim()

        /**
         * @param {VERSION_CHECK_RESULT} status
         */
        const resolveStatus = (status) =>
          resolve({
            status,
            ourVersion: packageJSON.version,
            npmVersion: version,
          })

        resolveStatus(
          packageJSON.version < version
            ? VERSION_CHECK_RESULT.NOT_LATEST
            : VERSION_CHECK_RESULT.LATEST,
        )
      }
    })

    resolve({
      status: VERSION_CHECK_RESULT.FAILED,
    })
  })
}

/**
 * Construct the server of NCM API.
 *
 * @param {ModuleDefinition[]} [moduleDefs] Customized module definitions [advanced]
 * @returns {Promise<import("express").Express>} The server instance.
 */
async function consturctServer(moduleDefs) {
  const app = express()
  const { CORS_ALLOW_ORIGIN } = process.env
  app.set('trust proxy', true)
  app.disable('x-powered-by')
  app.set('etag', 'strong')

  // 可选 gzip 压缩，未安装依赖时跳过
  try {
    const compression = require('compression')
    app.use(compression({ threshold: 1024 }))
  } catch (_) {}

  let otherServerHandler = (req, res) => {
    const api_map = {
      tencent: qq,
      kugou: kugou,
    }
    try {
      api_map[req.query.server].api_map[req.baseUrl](
        req._parsedUrl.search,
      ).success((data) => {
        res.status(200).send(data)
      })
    } catch (error) {
      res.status(500).send({ msg: '666' })
    }
  }

  // CORS & Preflight
  app.use((req, res, next) => {
    if (req.path !== '/' && !req.path.includes('.')) {
      res.set({
        'Access-Control-Allow-Credentials': true,
        'Access-Control-Allow-Origin':
          CORS_ALLOW_ORIGIN || req.headers.origin || '*',
        'Access-Control-Allow-Headers': 'X-Requested-With,Content-Type',
        'Access-Control-Allow-Methods': 'PUT,POST,GET,DELETE,OPTIONS',
        'Content-Type': 'application/json; charset=utf-8',
      })
    }
    req.method === 'OPTIONS' ? res.status(204).end() : next()
  })

  // Cookie parser
  app.use((req, _, next) => {
    req.cookies = {}
    ;(req.headers.cookie || '').split(/;\s+|(?<!\s)\s+$/g).forEach((pair) => {
      let crack = pair.indexOf('=')
      if (crack < 1 || crack == pair.length - 1) return
      req.cookies[decode(pair.slice(0, crack)).trim()] = decode(
        pair.slice(crack + 1),
      ).trim()
    })
    next()
  })

  app.use(express.json())
  app.use(express.urlencoded({ extended: false }))
  // multipart 解析只对云盘上传路由开启：全局挂载会把每条请求的边界解析
  // 与文件缓冲都压在内存里，而 281 个接口中只有 /cloud 用到 req.files
  app.use(
    '/cloud',
    fileUpload({ limits: { fileSize: 100 * 1024 * 1024, files: 1 } }),
  )
  app.use(express.static(path.join(__dirname, 'public')))

  // 归一化 apicache 的 key：剔除波动参数，避免 timestamp/realIP 让缓存形同虚设
  const VOLATILE_QUERY_PARAMS = new Set([
    'timestamp',
    '_t',
    'realIP',
    'real_ip',
    'proxy',
    'noCookie',
  ])
  app.use((req, _res, next) => {
    if (req.originalUrl && req.originalUrl.includes('?')) {
      const [pathPart, qs] = req.originalUrl.split('?')
      const filtered = qs
        .split('&')
        .filter((seg) => {
          if (!seg) return false
          const k = seg.split('=')[0]
          return !VOLATILE_QUERY_PARAMS.has(k)
        })
        .join('&')
      const normalized = filtered ? `${pathPart}?${filtered}` : pathPart
      req.originalUrl = normalized
      req.url = normalized
    }
    next()
  })

  // appendKey 让缓存按账号分桶，否则不同登录态会命中同一份响应
  app.use(cache(CACHE_TTL, cachePolicy, { appendKey: cacheKeyOf }))

  const axios = require('axios')
  app.use('/puppeteer', async (req, res) => {
    let url = req.body.url || req.query.url
    if (!url) {
      return res.status(400).send('Missing "url" parameter')
    }
    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'janxland/ablaze-backend',
        },
        timeout: 10000,
      })
      res.send(response.data)
    } catch (error) {
      console.error((error && error.message) || error)
      res.status(500).send('Error fetching URL content')
    }
  })

  // 首页取歌凭据：由 ncm-api 自持，与播放器登录解耦。
  // 只接受能自证归属的凭据 —— 回源 /user/account 校验 uid，其余一律拒绝；
  // 因此该接口即使公开，也无法把他人的 cookie 写进来劫持首页取歌。
  const credentialStore = require('./util/credential-store')
  const userAccountModule = require('./module/user_account')
  const OWNER_UID = String(process.env.NETEASE_OWNER_UID || '270496477')

  app.get('/netease/credential', (req, res) => {
    const entry = credentialStore.read()
    if (!entry || !entry.cookie) {
      res.status(404).type('text/plain').send('')
      return
    }
    res.type('text/plain').send(entry.cookie)
  })

  app.post('/netease/credential', async (req, res) => {
    const cookie =
      typeof req.body?.cookie === 'string' ? req.body.cookie.trim() : ''
    if (!/MUSIC_U=/.test(cookie)) {
      res.status(400).json({ ok: false, reason: 'missing_music_u' })
      return
    }
    try {
      const { body } = await userAccountModule(
        { cookie: cookieToJson(cookie) },
        request,
      )
      const uid = body && body.profile && body.profile.userId
      if (String(uid) !== OWNER_UID) {
        res
          .status(403)
          .json({ ok: false, reason: 'not_owner', uid: uid ?? null })
        return
      }
      const entry = credentialStore.write({
        cookie,
        uid,
        nickname: body.profile.nickname,
        source: 'player-login',
      })
      res.json({
        ok: true,
        uid: entry.uid,
        nickname: entry.nickname,
        updatedAt: entry.updatedAt,
      })
    } catch (error) {
      res.status(502).json({
        ok: false,
        reason: 'verify_failed',
        msg: String((error && error.message) || error),
      })
    }
  })

  app.delete('/netease/credential', (req, res) => {
    res.json({ ok: credentialStore.clear() })
  })

  // 解灰提供方与路由解耦：惰性加载，且必须兜底 —— 原实现的 .then 无 catch，
  // 上游 reject 会冒泡成 unhandledRejection，量大时拖慢实例。
  const UNBLOCK_SOURCES = {
    basic: ['pyncmd'],
    extended: ['pyncmd', 'qq', 'kugou', 'bilibili'],
  }
  let unblockMatcher = null
  const serveUnblock = async (req, res) => {
    try {
      unblockMatcher ||= require('@unblockneteasemusic/server')
      const sources =
        req.query.https === 'true'
          ? UNBLOCK_SOURCES.extended
          : UNBLOCK_SOURCES.basic
      res.send(await unblockMatcher(req.query.id, sources))
    } catch (error) {
      console.error('[unblock]', req.query.id, (error && error.message) || error)
      res.status(502).send({ code: 502, msg: 'unblock failed' })
    }
  }

  const special = {
    'daily_signin.js': '/daily_signin',
    'fm_trash.js': '/fm_trash',
    'personal_fm.js': '/personal_fm',
  }

  const moduleDefinitions =
    moduleDefs ||
    (await getModulesDefinitions(path.join(__dirname, 'module'), special))

  for (const moduleDef of moduleDefinitions) {
    app.use(moduleDef.route, async (req, res) => {
      if (req.baseUrl === '/song/unblock') {
        return serveUnblock(req, res)
      }
      if (req.query.server && req.query.server != 'netease') {
        otherServerHandler(req, res)
        return
      }
      ;[req.query, req.body].forEach((item) => {
        if (typeof item.cookie === 'string') {
          item.cookie = cookieToJson(decode(item.cookie))
        }
      })

      let query = Object.assign(
        {},
        { cookie: req.cookies },
        req.query,
        req.body,
        req.files,
      )
      // 上游行为：扫码链路的会话 cookie 靠 Set-Cookie 回写延续，不可阻断
      const echoCookies = !query.noCookie

      try {
        const moduleResponse = await moduleDef.module(query, (...params) => {
          // 注入客户端 IP
          const obj = [...params]
          let ip = req.ip
          if (ip.substr(0, 7) == '::ffff:') {
            ip = ip.substr(7)
          }
          obj[3] = {
            ...obj[3],
            ip,
          }
          return request(...obj)
        })
        if (LOG_REQUESTS) console.log('[OK]', decode(req.originalUrl))

        const cookies = moduleResponse.cookie
        if (echoCookies) {
          if (Array.isArray(cookies) && cookies.length > 0) {
            if (req.protocol === 'https') {
              // CORS SameSite
              res.append(
                'Set-Cookie',
                cookies.map((cookie) => {
                  return cookie + '; SameSite=None; Secure'
                }),
              )
            } else {
              res.append('Set-Cookie', cookies)
            }
          }
        }
        res.status(moduleResponse.status).send(moduleResponse.body)
      } catch (/** @type {*} */ moduleResponse) {
        console.log('[ERR]', decode(req.originalUrl), {
          status: moduleResponse.status,
          body: moduleResponse.body,
        })
        if (!moduleResponse.body) {
          res.status(404).send({
            code: 404,
            data: null,
            msg: 'Not Found',
          })
          return
        }
        if (moduleResponse.body.code == '301')
          moduleResponse.body.msg = '需要登录'
        if (!query.noCookie) {
          res.append('Set-Cookie', moduleResponse.cookie)
        }

        res.status(moduleResponse.status).send(moduleResponse.body)
      }
    })
  }

  return app
}

/**
 * Serve the NCM API.
 * @param {NcmApiOptions} options
 * @returns {Promise<import('express').Express & ExpressExtension>}
 */
async function serveNcmApi(options) {
  const port = Number(options.port || process.env.PORT || '3000')
  const host = options.host || process.env.HOST || ''

  const checkVersionSubmission =
    options.checkVersion &&
    checkVersion().then(({ npmVersion, ourVersion, status }) => {
      if (status == VERSION_CHECK_RESULT.NOT_LATEST) {
        console.log(
          `最新版本: ${npmVersion}, 当前版本: ${ourVersion}, 请及时更新`,
        )
      }
    })
  const constructServerSubmission = consturctServer(options.moduleDefs)

  const [_, app] = await Promise.all([
    checkVersionSubmission,
    constructServerSubmission,
  ])

  /** @type {import('express').Express & ExpressExtension} */
  const appExt = app
  appExt.server = app.listen(port, host, () => {
    const tag = process.env.NODE_APP_INSTANCE
      ? ` worker#${process.env.NODE_APP_INSTANCE}`
      : process.send
        ? ` worker pid=${process.pid}`
        : ''
    console.log(
      `server running @ http://${host ? host : 'localhost'}:${port}${tag}`,
    )
  })

  // keep-alive: 复用 TCP，避免高频请求反复握手
  appExt.server.keepAliveTimeout = 60000
  appExt.server.headersTimeout = 65000
  appExt.server.requestTimeout = 0

  return appExt
}
module.exports = {
  serveNcmApi,
  getModulesDefinitions,
}
