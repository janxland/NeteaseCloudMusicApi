#!/usr/bin/env node
/**
 * 惰性路由加载 A/B：交替采样 + 取中位数，并测量真实「进程冷启动 → 可服务」耗时。
 *
 *   node scripts/bench-lazy-ab.cjs [reps]
 *
 * A（lazy，现状）：启动只注册路径，281 个路由模块首次命中才 require
 * B（eager，重构前）：启动即 require 全部路由模块
 * 两者跑的是同一份 dist 产物，唯一差别是「何时加载模块」，因此差值即惰性化的净收益。
 */
const { spawn, spawnSync } = require('child_process')
const fs = require('fs')
const path = require('path')
const os = require('os')

const ROOT = path.resolve(__dirname, '..')
const REPS = Number(process.argv[2] || 3)
const NODE = process.execPath
const now = () => performance.now()
const median = (a) => {
  const s = [...a].sort((x, y) => x - y)
  return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/** —— 1. 进程内「到可服务」：独立进程单次采样 —— */
const inProcess = (mode) =>
  JSON.parse(
    spawnSync(NODE, [path.join(__dirname, 'bench-lazy-routes.cjs'), `--mode=${mode}`], {
      cwd: ROOT,
      encoding: 'utf8',
    }).stdout.trim(),
  )

/** —— 2. 真实冷启动：spawn 入口 → 轮询 /healthz 直到 200 —— */
const bootToServing = async (label, port, entry) => {
  const t0 = now()
  const child = spawn(NODE, [entry], {
    cwd: ROOT,
    env: { ...process.env, PORT: String(port) },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  let settled = false
  const done = new Promise((resolve) => {
    const poll = async () => {
      while (!settled && now() - t0 < 30000) {
        try {
          const r = await fetch(`http://127.0.0.1:${port}/healthz`)
          if (r.ok) {
            settled = true
            resolve(now() - t0)
            return
          }
        } catch {
          /* 还没起来 */
        }
        await sleep(15)
      }
      resolve(null)
    }
    poll()
  })
  const ms = await done
  child.kill('SIGKILL')
  await sleep(150)
  return { label, ms: ms == null ? null : +ms.toFixed(1) }
}

/** eager 入口：先 require 全部路由模块，再走正常 main */
const eagerEntry = path.join(os.tmpdir(), 'ncm-eager-main.cjs')
fs.writeFileSync(
  eagerEntry,
  `// 复刻重构前的启动行为：加载阶段就把 281 个路由模块全部 require 进来\n` +
    `const path = require('path')\n` +
    `const { loadRoutes } = require(${JSON.stringify(path.join(ROOT, 'dist/core/routes.js'))})\n` +
    `for (const d of loadRoutes()) d.resolveHandler()\n` +
    `require(${JSON.stringify(path.join(ROOT, 'dist/main.js'))})\n`,
)

;(async () => {
  const lazy = []
  const eager = []
  for (let i = 0; i < REPS; i++) {
    // 交替先后，抵消机器随时间的漂移
    if (i % 2 === 0) {
      lazy.push(inProcess('lazy'))
      eager.push(inProcess('eager'))
    } else {
      eager.push(inProcess('eager'))
      lazy.push(inProcess('lazy'))
    }
  }

  const pick = (rows, k) => median(rows.map((r) => r[k]))
  console.log(`=== 进程内「到可服务」耗时（${REPS} 次交替采样，中位数）===`)
  console.log(`  建路由表（仅路径）  A ${pick(lazy, 'tableMs')} ms   B ${pick(eager, 'tableMs')} ms`)
  console.log(`  加载 281 个模块     A ${pick(lazy, 'loadMs')} ms   B ${pick(eager, 'loadMs')} ms`)
  console.log(`  buildApp 装配       A ${pick(lazy, 'buildMs')} ms   B ${pick(eager, 'buildMs')} ms`)
  console.log(`  ready()             A ${pick(lazy, 'readyMs')} ms   B ${pick(eager, 'readyMs')} ms`)
  console.log(
    `  合计→可服务          A ${pick(lazy, 'totalMs')} ms   B ${pick(eager, 'totalMs')} ms   ` +
      `省 ${(pick(eager, 'totalMs') - pick(lazy, 'totalMs')).toFixed(1)} ms`,
  )
  console.log(
    `  rss                 A ${pick(lazy, 'rssMB')} MB   B ${pick(eager, 'rssMB')} MB   ` +
      `少 ${(pick(eager, 'rssMB') - pick(lazy, 'rssMB')).toFixed(1)} MB`,
  )

  // —— 真实冷启动（含 node 进程引导 + 模块解析 + listen）——
  const boot = { lazy: [], eager: [] }
  for (let i = 0; i < REPS; i++) {
    const order = i % 2 === 0 ? ['lazy', 'eager'] : ['eager', 'lazy']
    for (const m of order) {
      const port = m === 'lazy' ? 3311 : 3312
      const entry = m === 'lazy' ? path.join(ROOT, 'dist/main.js') : eagerEntry
      const r = await bootToServing(m, port, entry)
      if (r.ms != null) boot[m].push(r.ms)
    }
  }
  console.log(`\n=== 真实冷启动：spawn → /healthz 200（${REPS} 次交替，中位数）===`)
  const bl = median(boot.lazy)
  const be = median(boot.eager)
  console.log(`  A 惰性 : ${bl} ms`)
  console.log(`  B 全量 : ${be} ms`)
  console.log(`  省下   : ${(be - bl).toFixed(1)} ms（${(((be - bl) / be) * 100).toFixed(1)}%）`)
})().catch((e) => {
  console.error(e)
  process.exit(1)
})
