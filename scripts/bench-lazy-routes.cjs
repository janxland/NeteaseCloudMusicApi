#!/usr/bin/env node
/**
 * 惰性路由加载的 A/B 对照（单次采样，必须由外部交替多次调用后取中位数）。
 *
 *   node scripts/bench-lazy-routes.cjs --mode=lazy    # 现状：只注册路径，模块首次命中才加载
 *   node scripts/bench-lazy-routes.cjs --mode=eager   # 重构前：启动时把 281 个模块全量加载
 *
 * 输出一行 JSON，便于外部聚合。必须在独立进程里跑单次：同进程跑两次会把框架自身
 * （fastify / swagger 等）的首次 require 成本算到先跑的那一侧。
 */
const path = require('path')

const mode = (process.argv.find((a) => a.startsWith('--mode=')) || '--mode=lazy').split('=')[1]
const now = () => performance.now()
const ROOT = path.resolve(__dirname, '..')
process.chdir(ROOT)

const run = async () => {
  const t0 = now()
  const { loadRoutes } = require(path.join(ROOT, 'dist/core/routes.js'))
  const routes = loadRoutes()
  const tTable = now()

  if (mode === 'eager') for (const d of routes) d.resolveHandler()
  const tLoaded = now()

  const buildApp = require(path.join(ROOT, 'dist/app.js')).default
  const app = await buildApp()
  const tBuilt = now()
  await app.ready()
  const tReady = now()

  const rss = process.memoryUsage().rss
  await app.close()

  return {
    mode,
    routes: routes.length,
    tableMs: +(tTable - t0).toFixed(1), // 建路由表（惰性下只有这一步）
    loadMs: +(tLoaded - tTable).toFixed(1), // 加载 281 个模块（惰性下为 0）
    buildMs: +(tBuilt - tLoaded).toFixed(1), // buildApp 装配（含插件注册 + 路由注册）
    readyMs: +(tReady - tBuilt).toFixed(1), // ready()：ajv 编译 + 路由树定型
    totalMs: +(tReady - t0).toFixed(1), // 进程内「到可服务」
    rssMB: +(rss / 1048576).toFixed(1),
  }
}

run()
  .then((r) => console.log(JSON.stringify(r)))
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
