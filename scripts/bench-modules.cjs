#!/usr/bin/env node
/**
 * 逐个依赖的 require 成本（每个依赖起一个全新进程，避免 require 缓存串味）。
 *
 *   node scripts/bench-modules.cjs
 *
 * 用途：定位「启动时到底谁在花时间」。装了但启动不 require 的模块（如
 * @unblockneteasemusic/server）应该显示为不在启动路径上。
 */
const { spawnSync } = require('child_process')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')

const MODULES = [
  'fastify',
  'pino',
  'axios',
  '@fastify/swagger',
  '@fastify/swagger-ui',
  '@fastify/multipart',
  '@fastify/formbody',
  '@fastify/compress',
  'safe-decode-uri-component',
  'qrcode',
  'music-metadata',
  'pac-proxy-agent',
  'tunnel',
  '@unblockneteasemusic/server',
]

const probe = (mod) => {
  const code = `
    const t0 = process.hrtime.bigint()
    let ok = true
    try { require(${JSON.stringify(mod)}) } catch { ok = false }
    const t1 = process.hrtime.bigint()
    process.stdout.write(JSON.stringify({ ms: Number(t1 - t0) / 1e6, ok, rss: process.memoryUsage().rss }))
  `
  const r = spawnSync(process.execPath, ['-e', code], { cwd: ROOT, encoding: 'utf8' })
  try {
    return JSON.parse(r.stdout)
  } catch {
    return { ms: NaN, ok: false, rss: 0 }
  }
}

const baseline = (() => {
  const r = spawnSync(process.execPath, ['-e', 'process.stdout.write(JSON.stringify({rss:process.memoryUsage().rss}))'], {
    encoding: 'utf8',
  })
  return JSON.parse(r.stdout).rss
})()

console.log(`node 空进程基线 rss: ${(baseline / 1048576).toFixed(1)} MB\n`)
console.log('| 依赖 | require 耗时 | 该模块带来的 rss | 备注 |')
console.log('|---|---|---|---|')
const rows = MODULES.map((m) => ({ m, ...probe(m) })).sort((a, b) => (b.ms || 0) - (a.ms || 0))
for (const r of rows) {
  const dMb = (r.rss - baseline) / 1048576
  console.log(
    `| \`${r.m}\` | ${r.ok ? r.ms.toFixed(1) + ' ms' : '加载失败'} | ${dMb > 0 ? dMb.toFixed(1) + ' MB' : '—'} | ${
      r.ok ? '' : '未安装/不在启动路径'
    } |`,
  )
}
const total = rows.filter((r) => r.ok).reduce((s, r) => s + r.ms, 0)
console.log(`\n合计（成功加载者）: ${total.toFixed(1)} ms`)
