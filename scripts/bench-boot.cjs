#!/usr/bin/env node
/**
 * 启动成本拆解：把「模块加载」与「路由注册」分开计时，用于判断惰性加载的收益上限。
 *
 *   node scripts/bench-boot.cjs            # 测量 dist 产物
 *   node scripts/bench-boot.cjs --src      # 同时测量 tsx 直跑 src
 */
const path = require('path')
const fs = require('fs')

const ROOT = path.resolve(__dirname, '..')
const now = () => performance.now()
const MB = (n) => (n / 1048576).toFixed(1)

const walk = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name)
    if (e.isDirectory()) return walk(full)
    return /\.(ts|js)$/.test(e.name) && !e.name.endsWith('.d.ts') ? [full] : []
  })

const readParamSchema = () => {
  const map = {}
  try {
    const doc = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs', 'api-cases.json'), 'utf8'))
    for (const c of doc.cases || []) {
      const props = {}
      for (const k of Object.keys(c.params || {})) props[k] = { type: 'string' }
      map[c.route] = { type: 'object', additionalProperties: true, properties: props }
    }
  } catch {
    /* 无用例文件时退化为空 schema 集 */
  }
  return map
}

const METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']

const benchRegister = async (defs, paramSchema, withSchema) => {
  const Fastify = require('fastify')
  const app = Fastify()
  const t0 = now()
  for (const d of defs) {
    const schema = withSchema ? paramSchema[d.route] : null
    app.route({
      method: METHODS,
      url: d.route,
      schema: schema ? { querystring: schema } : undefined,
      handler: () => {},
    })
  }
  const t1 = now()
  await app.ready()
  const t2 = now()
  const rss = process.memoryUsage().rss
  await app.close()
  return { addMs: t1 - t0, readyMs: t2 - t1, rss }
}

const main = async () => {
  const dir = path.join(ROOT, 'dist', 'routes')
  if (!fs.existsSync(dir)) {
    console.error('缺少 dist/routes，请先 npm run build')
    process.exit(1)
  }

  // ---- 1. loadRoutes 拆解：目录遍历 vs 逐个 require ----
  let t = now()
  const files = walk(dir)
  const walkMs = now() - t

  t = now()
  for (const f of files) require(f)
  const requireMs = now() - t

  console.log(`[1] 目录遍历 ${files.length} 个文件: ${walkMs.toFixed(1)} ms`)
  console.log(
    `    逐个 require 全部路由模块: ${requireMs.toFixed(1)} ms  (${(requireMs / files.length).toFixed(2)} ms/文件)`,
  )

  const defs = files
    .map((f) => path.relative(dir, f).split(path.sep).join('/').replace(/\.(ts|js)$/, ''))
    .map((stem) => ({ route: '/' + stem }))
  const paramSchema = readParamSchema()

  // ---- 2. 注册成本 ----
  const noSchema = await benchRegister(defs, paramSchema, false)
  console.log(
    `[2] 注册 1405 条路由（无 querystring schema）: 注册 ${noSchema.addMs.toFixed(1)} ms + ready ${noSchema.readyMs.toFixed(1)} ms`,
  )
  const withSchema = await benchRegister(defs, paramSchema, true)
  console.log(
    `[3] 注册 1405 条路由（带 querystring schema）: 注册 ${withSchema.addMs.toFixed(1)} ms + ready ${withSchema.readyMs.toFixed(1)} ms`,
  )
  console.log(
    `    => schema 额外成本 ${(withSchema.addMs - noSchema.addMs).toFixed(1)} ms / ${(withSchema.readyMs - noSchema.readyMs).toFixed(1)} ms(ready)`,
  )

  // ---- 3. Fastify 是否允许 ready() 之后再加路由 ----
  const Fastify = require('fastify')
  const app = Fastify()
  app.get('/x', () => 1)
  await app.ready()
  try {
    app.get('/late', () => 2)
    console.log('[4] ready() 后追加路由: 允许')
  } catch (e) {
    console.log(`[4] ready() 后追加路由: 抛错 ${e.code}`)
  }
  await app.close()

  console.log(`\n[mem] 全量加载后 rss ${MB(process.memoryUsage().rss)} MB`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
