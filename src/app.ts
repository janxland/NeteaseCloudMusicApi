// Fastify 装配：对外行为与 server.js（Express 版）1:1，逐条对齐见 docs/refactor-roadmap.md
import fs from 'node:fs'
import path from 'node:path'

import Fastify, { FastifyReply, FastifyRequest } from 'fastify'
import type { FastifyServerOptions } from 'fastify'
import axios from 'axios'
import formbody from '@fastify/formbody'
import multipart from '@fastify/multipart'
import swagger from '@fastify/swagger'
import swaggerUi from '@fastify/swagger-ui'
import decode from 'safe-decode-uri-component'

import { loadRoutes } from './core/routes'
import { upstream } from './core/upstream'
import { cookieToJson, echoCookies, parseCookieHeader } from './core/cookies'
import { cacheKey, cacheStats, readCache, shouldCache, writeCache } from './core/cache'
import * as credentialStore from './core/credential-store'
import { kugou } from './core/multiverse/kugou'
import { qq } from './core/multiverse/qq'
import userAccountModule from './routes/user/account'
import { VERSION } from './core/version'
import type { CookieJar, ModuleQuery } from './types'

const LOG_REQUESTS = process.env.LOG_REQUESTS === '1'

/**
 * 恒真校验器工厂：让 Fastify 跳过所有 schema 的 ajv 编译。
 *
 * 运行期契约：`buildValidator(...)` 返回「编译器」，编译器返回 `(data) => boolean`。
 * 但类型签名要求返回 ajv 的 `ValidateFunction`（带 errors/schema 等属性），
 * 恒真校验器不产生错误对象，所以按运行期契约实现 + 一次显式断言。
 */
type ValidatorFactory = NonNullable<
  NonNullable<FastifyServerOptions['schemaController']>['compilersFactory']
>['buildValidator']
const noopValidatorFactory = (() => () => () => true) as unknown as ValidatorFactory

/** onRequest 命中缓存时给 req 打标记，供 onSend 跳过回写 */
type CacheHitRequest = FastifyRequest & { cacheHit?: boolean }

const OWNER_UID = String(process.env.NETEASE_OWNER_UID || '270496477')

// 查询参数 schema：**只用于 OpenAPI 文档**，绝不参与请求校验。
//
// 这里踩过一个真实的坑：schema 注进去以后 Fastify 的 ajv 默认带 coerceTypes，
// 会把「同名参数重复」（?id=1&id=2 → Fastify 解析成数组）判为类型不符，直接回
// 400 FST_ERR_VALIDATION；而旧版 Express 不做任何校验，同一请求是 200。
// 267 条回归没覆盖到这种请求形态，所以一直没暴露。
// 本项目 281 条 schema 全部是 additionalProperties:true + 纯 string 属性 + 无 required，
// 即「不校验也永远不会拒绝合法请求」，于是把校验器整体换成恒真函数：
// 行为与旧版 1:1，同时省掉 281 个 schema 的 ajv 编译（启动 ~90 ms / 常驻内存 ~12 MB）。
// 约束：新增 schema 若要真正校验，必须同时替换这里的 buildValidator，否则形同虚设。
// 用 fs 读取而非静态 import：docs/api-cases.json 由 scripts/gen-api-test-plan.cjs 生成，
// 生产镜像/打包产物里可能不存在，此时退化为无 schema（不影响运行）
const paramSchema = (() => {
  try {
    const doc = JSON.parse(
      fs.readFileSync(path.join(__dirname, '..', 'docs', 'api-cases.json'), 'utf8'),
    ) as { cases?: any[] }
    const map: Record<string, Record<string, any>> = {}
    for (const c of doc.cases || []) {
      const props: Record<string, any> = {}
      for (const [k] of Object.entries(c.params || {})) {
        // 查询串里一切都是字符串；用联合类型会触发 Fastify 的 strictTypes 告警
        props[k] = { type: 'string' }
      }
      map[c.route] = {
        type: 'object',
        additionalProperties: true,
        properties: props,
      }
    }
    return map
  } catch {
    return {}
  }
})()

const buildApp = async () => {
  const app = Fastify({
    trustProxy: true,
    bodyLimit: 100 * 1024 * 1024,
    // 请求日志由下面的 LOG_REQUESTS 分支自己打印（与 Express 版 [OK]/[ERR] 同形），
    // 所以这里不开 Fastify logger；开了才需要 logController 去关逐请求日志
    ...(LOG_REQUESTS ? { logger: true } : {}),
    // 关掉请求校验的 ajv 编译：本项目的 schema 只喂给 OpenAPI 文档，
    // 不承担校验职责（原因见上面 paramSchema 的注释）。恒真校验器让行为回到
    // 旧版 Express 的「完全不校验」，同时省掉 281 次 schema 编译。
    schemaController: { compilersFactory: { buildValidator: noopValidatorFactory } },
  })

  app.addHook('onRequest', (req, reply, done) => {
    // 对齐 Express 版：非根路径、非静态资源才写 CORS 与 Content-Type
    const path = req.url.split('?')[0]
    if (path !== '/' && !path.includes('.')) {
      reply.header('Access-Control-Allow-Credentials', 'true')
      reply.header(
        'Access-Control-Allow-Origin',
        process.env.CORS_ALLOW_ORIGIN || req.headers.origin || '*',
      )
      reply.header('Access-Control-Allow-Headers', 'X-Requested-With,Content-Type')
      reply.header('Access-Control-Allow-Methods', 'PUT,POST,GET,DELETE,OPTIONS')
      reply.header('Content-Type', 'application/json; charset=utf-8')
    }
    if (req.method === 'OPTIONS') {
      reply.status(204).send('')
      return
    }
    done()
  })

  // 只用 gzip：Node 的 fetch/undici 对 brotli 不会自动解压，客户端会拿到裸压缩流
  // 缓存：必须在 compress 之前注册 —— onSend 按注册顺序执行，
  // 否则拿到的是压缩后的流，缓存里会存进空串。
  app.addHook('onRequest', async (req, reply) => {
    if (req.method !== 'GET') return
    const jar = parseCookieHeader(req.headers.cookie)
    const hit = readCache(cacheKey(req.url, jar))
    if (!hit) return
    // 标记命中：onSend 据此跳过回写（否则每次命中都要对载荷做一次全文扫描 + Map 覆写）
    ;(req as CacheHitRequest).cacheHit = true
    reply.header('x-cache', 'HIT')
    if (hit.contentType) reply.header('content-type', hit.contentType)
    // 直发预编码字节：命中的是 Buffer，无需再 UTF-8 编码，也不会触发 Content-Length 扫描
    reply.status(hit.status).send(hit.body)
    return reply
  })

  app.addHook('onSend', async (req, reply, payload) => {
    if ((req as CacheHitRequest).cacheHit) return payload
    const path = req.url.split('?')[0]
    if (req.method === 'GET' && shouldCache(path, reply.statusCode)) {
      const jar = parseCookieHeader(req.headers.cookie)
      // 只缓存字符串：压缩开启时 onSend 拿到的是流，存进去会在命中时返回空
      if (typeof payload !== 'string') return payload
      writeCache(cacheKey(req.url, jar), {
        status: reply.statusCode,
        payload,
        contentType: reply.getHeader('content-type') as string | undefined,
      })
    }
    return payload
  })

  // 压缩默认关闭：Express 版没装 compression（可选依赖缺失即跳过），开启后
  // onSend 拿到的是压缩流而非 JSON 字符串，会把空内容写进缓存（命中即空响应）。
  // 需要压缩时设 ENABLE_COMPRESS=1，此时缓存自动跳过非字符串 payload。
  // 模块本身也只在真的启用时才 require：默认部署不该为未启用的中间件付
  // @fastify/compress 的加载成本（~23 ms / +11 MB 常驻）。
  if (process.env.ENABLE_COMPRESS === '1') {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    await app.register(require('@fastify/compress'), { threshold: 1024, encodings: ['gzip'] })
  }
  await app.register(formbody)
  await app.register(multipart, { limits: { fileSize: 100 * 1024 * 1024, files: 1 } })
  await app.register(swagger, {
    openapi: {
      info: {
        title: 'NeteaseCloudMusicApi',
        description: '网易云音乐 NodeJS 版 API（TS + Fastify 重构版）',
        version: VERSION,
      },
    },
  })
  await app.register(swaggerUi, { routePrefix: '/documentation' })

  // 代理抓取（不可缓存路由之一）
  app.all('/puppeteer', async (req, reply) => {
    const url = (req.body as any)?.url || (req.query as any)?.url
    if (!url) return reply.status(400).send('Missing "url" parameter')
    try {
      const res = await axios.get(url, {
        headers: { 'User-Agent': 'janxland/ablaze-backend' },
        timeout: 10000,
      })
      return reply.send(res.data)
    } catch (error) {
      console.error((error && error.message) || error)
      return reply.status(500).send('Error fetching URL content')
    }
  })

  // 自持凭据：读写都必须实时，故不进缓存（cache-policy UNCACHEABLE 已含 /netease/）
  app.get('/netease/credential', (_req, reply) => {
    const entry = credentialStore.read()
    if (!entry || !entry.cookie) {
      reply.status(404).type('text/plain').send('')
      return
    }
    reply.type('text/plain').send(entry.cookie)
  })

  app.post('/netease/credential', async (req, reply) => {
    const cookie =
      typeof (req.body as any)?.cookie === 'string'
        ? (req.body as any).cookie.trim()
        : ''
    if (!/MUSIC_U=/.test(cookie)) {
      reply.status(400).send({ ok: false, reason: 'missing_music_u' })
      return
    }
    try {
      const { body } = await userAccountModule({ cookie: cookieToJson(cookie) }, upstream)
      const uid = body && body.profile && body.profile.userId
      if (String(uid) !== OWNER_UID) {
        reply.status(403).send({ ok: false, reason: 'not_owner', uid: uid ?? null })
        return
      }
      const entry = credentialStore.write({
        cookie,
        uid,
        nickname: body.profile.nickname,
        source: 'player-login',
      })
      reply.send({ ok: true, uid: entry.uid, nickname: entry.nickname, updatedAt: entry.updatedAt })
    } catch (error) {
      reply.status(502).send({
        ok: false,
        reason: 'verify_failed',
        msg: String((error && error.message) || error),
      })
    }
  })

  app.delete('/netease/credential', (_req, reply) => {
    reply.send({ ok: credentialStore.clear() })
  })

  // 解灰：惰性加载 + 必须兜底（原 .then 无 catch 会冒泡成 unhandledRejection）
  // 源分组只按一条硬规则：https=true 的分支必须只含「能回 https 直链」的源，
  // 否则浏览器端会因混合内容直接不放行。实测（30 首付费独占灰歌 / 生产网络）：
  //   pyncmd 30/30 且全 https 320k；bodian、kuwo、qq 只回 http（kuwo 还只有 64k）
  //   qq / kugou / bilibili / migu / joox 在生产网络 0/30，纯刷错误日志
  const UNBLOCK_SOURCES = {
    basic: ['pyncmd', 'bodian', 'kuwo'],
    extended: ['pyncmd'],
  }
  let unblockMatcher: any = null
  const serveUnblock = async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      // 默认是并发抢答、先到先赢：kuwo 只有 64k，却可能在 pyncmd 抖动时抢先返回，
      // 把音质拉低。按数组顺序取源才能保证「320k 优先、64k 只当最后防线」。
      process.env.FOLLOW_SOURCE_ORDER ||= 'true'
      unblockMatcher ||= require('@unblockneteasemusic/server')
      const sources =
        (req.query as any)?.https === 'true' ? UNBLOCK_SOURCES.extended : UNBLOCK_SOURCES.basic
      reply.send(await unblockMatcher((req.query as any)?.id, sources))
    } catch (error) {
      console.error('[unblock]', (req.query as any)?.id, (error && error.message) || error)
      reply.status(502).send({ code: 502, msg: 'unblock failed' })
    }
  }

  // 多源扇出：?server=qq|kugou
  // util/qq.js、util/kugou.js 用 { success(fn) } 回调风格返回，必须包成 Promise，
  // 否则 async handler 会在回调触发前就结束，Fastify 直接回一个空的 200。
  const otherServerHandler = async (
    req: FastifyRequest,
    reply: FastifyReply,
    route: string,
  ) => {
    const apiMap: Record<string, any> = { tencent: qq, kugou }
    try {
      const search = req.url.slice(req.url.indexOf('?'))
      const data = await new Promise((resolve, reject) => {
        const ret = apiMap[(req.query as any)?.server].api_map[route](search)
        if (!ret || typeof ret.success !== 'function') {
          reject(new Error('unsupported multiverse route'))
          return
        }
        ret.success(resolve)
      })
      reply.status(200).send(data)
    } catch (error) {
      reply.status(500).send({ msg: '666' })
    }
  }

  const routes = loadRoutes()
  for (const def of routes) {
    const schema = paramSchema[def.route]
    app.route({
      // 对齐 Express 版的 app.use(route)：所有方法都进同一个 handler。
      // HEAD 由 Fastify 从 GET 自动派生；OPTIONS 在 onRequest 就被 204 短路。
      method: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
      url: def.route,
      schema: schema ? { querystring: schema } : undefined,
      handler: async (req: FastifyRequest, reply: FastifyReply) => {
        if (def.route === '/song/unblock') return serveUnblock(req, reply)

        const qs = (req.query || {}) as Record<string, any>
        if (qs.server && qs.server != 'netease') {
          return otherServerHandler(req, reply, def.route)
        }

        // cookie 参数可以是字符串（客户端常这么传）
        const files: Record<string, any> = {}
        if (def.route === '/cloud' && (req as any).isMultipart?.()) {
          for await (const part of (req as any).files({ limits: { files: 1 } })) {
            const buffer = await part.toBuffer()
            files[part.fieldname] = {
              name: part.filename,
              data: buffer,
              size: buffer.length,
              mimetype: part.mimetype,
            }
          }
        }

        const body = (req.body || {}) as Record<string, any>
        for (const item of [qs, body]) {
          if (typeof item.cookie === 'string') {
            item.cookie = cookieToJson(decode(item.cookie))
          }
        }

        const query: ModuleQuery = Object.assign(
          {},
          { cookie: parseCookieHeader(req.headers.cookie) as CookieJar },
          qs,
          body,
          files,
        )
        const echo = !query.noCookie

        // 惰性加载：首次命中该路由时才 require 模块文件。必须放在 try 之外 ——
        // 下面的 catch 会把异常当作「module 返回的错误响应」，加载失败会被它
        // 静默降级成 404；放在这里则冒泡给 Fastify，明确回 500。
        const handler = def.resolveHandler()

        try {
          const moduleResponse = await handler(query, (...params: any[]) => {
            const obj = [...params]
            let ip = req.ip
            if (ip.startsWith('::ffff:')) ip = ip.slice(7)
            obj[3] = { ...obj[3], ip }
            return (upstream as any)(...obj)
          })

          if (LOG_REQUESTS) console.log('[OK]', decode(req.url))

          if (echo) {
            echoCookies(
              (values: string[]) => reply.header('Set-Cookie', values),
              moduleResponse.cookie,
              req.protocol,
            )
          }
          reply.status(moduleResponse.status).send(moduleResponse.body)
        } catch (moduleResponse: any) {
          console.log('[ERR]', decode(req.url), {
            status: moduleResponse?.status,
            body: moduleResponse?.body,
          })
          if (!moduleResponse?.body) {
            reply.status(404).send({ code: 404, data: null, msg: 'Not Found' })
            return
          }
          if (moduleResponse.body.code == '301') moduleResponse.body.msg = '需要登录'
          if (echo) {
            echoCookies(
              (values: string[]) => reply.header('Set-Cookie', values),
              moduleResponse.cookie,
              req.protocol,
            )
          }
          reply.status(moduleResponse.status).send(moduleResponse.body)
        }
      },
    })
  }

  // 未知路由：对齐 Express 的 finalhandler（HTML 404），客户端按 status 判断，
  // 但响应体格式保持与旧版一致，避免依赖方解析差异
  app.setNotFoundHandler((req, reply) => {
    const path = req.url.split('?')[0]
    reply
      .status(404)
      .type('text/html')
      .send(
        `<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<title>Error</title>\n</head>\n<body>\n<pre>Cannot ${req.method} ${path}</pre>\n</body>\n</html>`,
      )
  })

  app.get('/healthz', async () => ({ ok: true, routes: routes.length, cache: cacheStats() }))

  return app
}

export default buildApp
