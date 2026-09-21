#!/usr/bin/env node
/**
 * 启动路径审计：buildApp() 完成后，哪些重依赖真的被加载进了 require.cache？
 *
 *   node scripts/bench-bootpath.cjs
 *
 * 只看「启动阶段就加载」的模块 —— 它们是启动耗时与常驻内存的直接来源。
 * 惰性加载的目标模块（代理、解灰、上传解析）若不在此列，说明已经推迟成功。
 */
const path = require('path')

const ROOT = path.resolve(__dirname, '..')

// 关注的模块 → 用途说明
const WATCH = {
  fastify: 'HTTP 框架本体',
  axios: '上游请求',
  'pac-proxy-agent': 'PAC 代理（仅 ?proxy=pac:// 时使用）',
  tunnel: 'HTTP 隧道代理（仅 ?proxy=http:// 时使用）',
  '@unblockneteasemusic/server': '解灰（仅 /song/unblock 使用）',
  'music-metadata': '音频元数据（仅 /cloud 上传使用）',
  qrcode: '二维码（仅扫码登录使用）',
  'safe-decode-uri-component': 'URL 解码（每请求）',
  '@fastify/swagger': 'OpenAPI 文档',
  '@fastify/swagger-ui': '文档 UI',
  '@fastify/multipart': 'multipart 解析（/cloud）',
  '@fastify/formbody': '表单体解析',
  '@fastify/compress': '压缩（默认关闭）',
  pino: '日志（默认关闭）',
}

;(async () => {
  await require(path.join(ROOT, 'dist/app.js')).default()
  const loaded = Object.keys(require.cache)
  const has = (name) => loaded.some((p) => p.includes(`/node_modules/${name}/`))

  const inBoot = []
  const lazy = []
  for (const [mod, desc] of Object.entries(WATCH)) {
    ;(has(mod) ? inBoot : lazy).push(`| \`${mod}\` | ${desc} |`)
  }
  console.log(`启动完成，require.cache 中模块数: ${loaded.length}\n`)
  console.log('### 启动阶段就加载（开销记在启动上）\n')
  console.log('| 模块 | 用途 |')
  console.log('|---|---|')
  console.log(inBoot.join('\n'))
  console.log('\n### 未在启动路径上（已惰性 / 按需）\n')
  console.log('| 模块 | 用途 |')
  console.log('|---|---|')
  console.log(lazy.length ? lazy.join('\n') : '（无）')
  process.exit(0)
})().catch((e) => {
  console.error(e)
  process.exit(1)
})
