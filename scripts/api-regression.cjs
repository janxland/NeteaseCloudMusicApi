#!/usr/bin/env node
// 接口回归执行器：按 docs/api-cases.json 逐条请求，记录结构指纹，可与基线对比
// 用法：
//   node scripts/api-regression.cjs --base http://localhost:3000 --out docs/regression-baseline.json --md docs/regression-report.md
//   node scripts/api-regression.cjs --base http://localhost:3100 --compare docs/regression-baseline.json --md docs/regression-report.md
// 可选：--tier P0|P1|P2|P0,P1  --cookie "..."  --limit 20  --filter /album  --concurrency 8  --timeout 30000
const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const argv = (() => {
  const a = {}
  for (let i = 2; i < process.argv.length; ) {
    const k = process.argv[i]
    if (!k.startsWith('--')) {
      i++
      continue
    }
    const key = k.slice(2)
    const next = process.argv[i + 1]
    if (next && !next.startsWith('--')) {
      a[key] = next
      i += 2
    } else {
      a[key] = 'true'
      i++
    }
  }
  return a
})()

// Node 的 fetch 会优先解析 localhost -> ::1，而服务只监听 IPv4，统一改写成 127.0.0.1
const BASE = (argv.base || 'http://localhost:3000').replace(
  /(^https?:\/\/)localhost/,
  '$1127.0.0.1',
)
const TIERS = (argv.tier || 'P0').split(',')
// --cookie 显式传入；或用 NETEASE_COOKIE / MUSIC_U 环境变量（避免凭据进 shell history 与进程列表）
const COOKIE = argv.cookie || process.env.NETEASE_COOKIE || (process.env.MUSIC_U ? `MUSIC_U=${process.env.MUSIC_U}` : '')
const CONCURRENCY = Number(argv.concurrency || 6)
const TIMEOUT = Number(argv.timeout || 30000)
const LIMIT = argv.limit ? Number(argv.limit) : Infinity
const FILTER = argv.filter || ''
const OUT = argv.out ? path.resolve(ROOT, argv.out) : null
const MD = argv.md ? path.resolve(ROOT, argv.md) : null
const COMPARE = argv.compare ? path.resolve(ROOT, argv.compare) : null

const CASES_PATH = path.resolve(ROOT, argv.cases || 'docs/api-cases.json')
const { cases } = JSON.parse(fs.readFileSync(CASES_PATH, 'utf8'))

const selected = cases
  .filter((c) => TIERS.includes(c.tier))
  .filter((c) => !FILTER || c.route.includes(FILTER))
  .slice(0, LIMIT)

// 比对阶段要看用例标记（looseSignature 等），按路由索引整份用例表
const caseMap = new Map(cases.map((c) => [c.route, c]))

// 结构指纹：递归 key + 值类型，数组取首元素样本，忽略实时数据差异
const signature = (v, depth = 0, maxDepth = 4) => {
  if (depth > maxDepth) return '…'
  if (v === null) return 'null'
  if (Array.isArray(v)) return `[${v.length ? signature(v[0], depth + 1) : 'empty'}]`
  if (typeof v === 'object') {
    const keys = Object.keys(v).sort()
    return `{${keys.map((k) => `${k}:${signature(v[k], depth + 1)}`).join(',')}}`
  }
  return typeof v
}

const fetchJson = async (route, params) => {
  const qs = new URLSearchParams()
  for (const [k, v] of Object.entries(params || {})) qs.set(k, String(v))
  const url = `${BASE}${route}?${qs.toString()}`
  const headers = COOKIE ? { Cookie: COOKIE } : {}
  const started = Date.now()
  const res = await fetch(url, {
    headers,
    signal: AbortSignal.timeout(TIMEOUT),
    redirect: 'manual',
  })
  const text = await res.text()
  const ms = Date.now() - started
  let body = null
  try {
    body = JSON.parse(text)
  } catch {
    /* 非 JSON（如歌词纯文本）保持 null */
  }
  return { status: res.status, body, text, ms }
}

// 匿名冒烟只保证「链路通、非服务端异常」：
// - http200       : HTTP 200 即通过（上游风控导致 code≠200 仍然算通，但记入指纹对比）
// - code802       : /login/qr/create 首帧必须是 802
// - loginRequired : 无 cookie 时 301（需登录）或 200（该接口其实匿名可用）都算通过
const judge = (c, r) => {
  // 重构前就是 404/502/403 的（上游失效或缺参数）：做到「与基线一致」即通过
  if (c.baselineStatus && r.status === c.baselineStatus) {
    return { pass: true, reason: '', baseline: true }
  }
  if (c.expect === 'code802') {
    return r.status === 200 && r.body && r.body.code === 802
      ? { pass: true, reason: '' }
      : { pass: false, reason: `http=${r.status} code=${r.body?.code}` }
  }
  if (c.expect === 'code200') {
    return r.status === 200 && r.body && r.body.code === 200
      ? { pass: true, reason: '' }
      : { pass: false, reason: `http=${r.status} code=${r.body?.code}` }
  }
  if (c.expect === 'loginRequired' && !COOKIE) {
    return r.status === 200 || r.status === 301
      ? { pass: true, reason: '' }
      : { pass: false, reason: `http ${r.status}` }
  }
  if (r.status !== 200) return { pass: false, reason: `http ${r.status}` }
  if (c.expect === 'loginRequired' && COOKIE) {
    return r.body && r.body.code === 200
      ? { pass: true, reason: '' }
      : { pass: false, reason: `code=${r.body?.code}` }
  }
  return { pass: true, reason: '' }
}

const runPool = async (items, worker) => {
  const results = new Array(items.length)
  let cursor = 0
  const runners = Array.from({ length: Math.min(CONCURRENCY, items.length) }, async () => {
    while (cursor < items.length) {
      const i = cursor++
      results[i] = await worker(items[i], i)
    }
  })
  await Promise.all(runners)
  return results
}

// 链式依赖：先请求 from[].route，按 pick 路径取值，填入 params[as]
const resolveDeps = async (c) => {
  if (!c.from || !c.from.length) return c.params
  const params = { ...c.params }
  for (const dep of c.from) {
    const r = await fetchJson(dep.route, {})
    const val = dep.pick.split('.').reduce((o, k) => (o == null ? o : o[k]), r.body)
    if (val != null) params[dep.as] = val
  }
  return params
}

const main = async () => {
  const started = Date.now()
  const results = await runPool(selected, async (c) => {
    try {
      const params = await resolveDeps(c)
      const r = await fetchJson(c.route, params)
      const { pass, reason, baseline } = judge(c, r)
      return {
        baseline: !!baseline,
        route: c.route,
        tier: c.tier,
        expect: c.expect,
        status: r.status,
        code: r.body?.code ?? null,
        ms: r.ms,
        // 4xx/5xx 响应体是 axios 错误对象（含随机字段），降噪为固定标记，避免误报差异
        signature:
          r.status >= 400
            ? `ERR:${r.status}`
            : signature(r.body ?? r.text, 0, c.looseSignature ? 1 : 4),
        pass,
        reason,
      }
    } catch (e) {
      return {
        route: c.route,
        tier: c.tier,
        expect: c.expect,
        status: 0,
        code: null,
        ms: TIMEOUT,
        signature: '',
        pass: false,
        reason: String(e.message || e),
      }
    }
  })

  const passed = results.filter((r) => r.pass).length
  const summary = {
    base: BASE,
    generatedAt: new Date().toISOString(),
    tiers: TIERS,
    total: results.length,
    passed,
    failed: results.length - passed,
    matchedBaseline: results.filter((r) => r.baseline).length,
    elapsedMs: Date.now() - started,
    withCookie: !!COOKIE,
  }

  // 对比基线
  let diff = null
  if (COMPARE && fs.existsSync(COMPARE)) {
    const base = JSON.parse(fs.readFileSync(COMPARE, 'utf8'))
    const baseMap = new Map(base.results.map((r) => [r.route, r]))
    diff = { same: 0, changed: 0, missing: [], changes: [] }
    for (const r of results) {
      const b = baseMap.get(r.route)
      if (!b) {
        diff.missing.push(r.route)
        continue
      }
      // 内容本身随机的接口（/personal_fm 每次都是不同的歌）：指纹无意义，
      // 只比 status + code。基线里存的是旧算法的深指纹，拿它比必然误报。
      const loose = caseMap.get(r.route)?.looseSignature
      const sigDiff = loose ? false : b.signature !== r.signature
      const codeDiff = b.code !== r.code
      if (sigDiff || codeDiff) {
        diff.changed++
        diff.changes.push({
          route: r.route,
          baseCode: b.code,
          newCode: r.code,
          baseSig: b.signature,
          newSig: r.signature,
        })
      } else {
        diff.same++
      }
    }
    const seen = new Set(results.map((r) => r.route))
    diff.absent = base.results.filter((r) => !seen.has(r.route)).map((r) => r.route)
    summary.compare = { baseline: path.relative(ROOT, COMPARE), ...diff, changes: undefined }
  }

  // 回写用例分层：把实测 301 的 P0 归到 P1，把匿名其实可用的 P1 归回 P0
  if (argv['write-back']) {
    const doc = JSON.parse(fs.readFileSync(CASES_PATH, 'utf8'))
    const map = new Map(results.map((r) => [r.route, r]))
    doc.cases = doc.cases.map((c) => {
      const r = map.get(c.route)
      if (!r) return c
      const next = { ...c }
      if (r.status === 301) {
        next.tier = 'P1'
        next.expect = 'loginRequired'
      } else if (r.status === 200 && c.tier === 'P1') {
        next.tier = 'P0'
        next.expect = 'http200'
      }
      if (r.status !== 200 && r.status !== 301) {
        next.baselineStatus = r.status
        next.note = `重构前实测 HTTP ${r.status}（上游失效/缺参数，重构后需保持一致）`
      } else if (next.baselineStatus) {
        delete next.baselineStatus
        delete next.note
      }
      return next
    })
    fs.writeFileSync(CASES_PATH, JSON.stringify(doc, null, 2))
    console.log(`write-back -> ${path.relative(ROOT, CASES_PATH)}`)
  }

  const payload = { summary, results, diff }
  if (OUT) {
    fs.mkdirSync(path.dirname(OUT), { recursive: true })
    fs.writeFileSync(OUT, JSON.stringify(payload, null, 2))
  }

  if (MD) {
    const lines = []
    lines.push('# 接口回归执行报告')
    lines.push('')
    lines.push(`- 目标服务：\`${BASE}\`　层：${TIERS.join('+')}　登录态：${COOKIE ? '带 cookie' : '匿名'}`)
    lines.push(
      `- 用例 ${summary.total} 条：通过 ${summary.passed}，失败 ${summary.failed}，耗时 ${(summary.elapsedMs / 1000).toFixed(1)}s`,
    )
    lines.push(`- 生成时间：${summary.generatedAt}`)
    if (summary.compare) {
      const c = summary.compare
      lines.push(
        `- 与基线 \`${c.baseline}\` 对比：一致 ${c.same}，结构/码变化 ${c.changed}，基线中存在但本次缺失 ${c.absent.length}`,
      )
    }
    lines.push('')
    lines.push('| # | 路由 | 层 | HTTP | body.code | 耗时 | 判定 | 与基线 |')
    lines.push('|---|------|----|------|-----------|------|------|--------|')
    const baseMap = diff
      ? new Map(
        JSON.parse(fs.readFileSync(COMPARE, 'utf8')).results.map((r) => [r.route, r]),
      )
      : new Map()
    results.forEach((r, i) => {
      const b = baseMap.get(r.route)
      // 与汇总口径保持一致：随机内容接口（looseSignature）只比 status + code。
      // 否则表格把这些行标成 ⚠，汇总却算「一致」，同一份报告自相矛盾。
      const loose = caseMap.get(r.route)?.looseSignature
      const cmp = !b
        ? '—'
        : (loose || b.signature === r.signature) && b.code === r.code
          ? '一致'
          : '⚠ 差异'
      lines.push(
        `| ${i + 1} | \`${r.route}\` | ${r.tier} | ${r.status} | ${r.code ?? '—'} | ${r.ms}ms | ${r.pass ? '✅' : '❌ ' + r.reason} | ${cmp} |`,
      )
    })
    if (diff && diff.changes.length) {
      lines.push('')
      lines.push('## 差异明细')
      lines.push('')
      lines.push('| 路由 | 基线 code | 新 code | 基线结构指纹（截断 120 字符） | 新结构指纹 |')
      lines.push('|------|-----------|---------|------------------------------|------------|')
      diff.changes.forEach((c) =>
        lines.push(
          `| \`${c.route}\` | ${c.baseCode ?? '—'} | ${c.newCode ?? '—'} | \`${c.baseSig.slice(0, 120)}\` | \`${c.newSig.slice(0, 120)}\` |`,
        ),
      )
    }
    fs.mkdirSync(path.dirname(MD), { recursive: true })
    fs.writeFileSync(MD, lines.join('\n') + '\n')
  }

  console.log(
    `[regression] base=${BASE} tiers=${TIERS.join('+')} total=${summary.total} pass=${summary.passed} fail=${summary.failed}` +
      (summary.compare
        ? ` | 一致=${summary.compare.same} 差异=${summary.compare.changed} 缺失=${summary.compare.absent.length}`
        : ''),
  )
  const failed = results.filter((r) => !r.pass)
  if (failed.length) {
    console.log('--- 失败用例（前 30）---')
    failed.slice(0, 30).forEach((r) => console.log(`${r.route} :: ${r.reason}`))
  }
  if (OUT) console.log(`json -> ${path.relative(ROOT, OUT)}`)
  if (MD) console.log(`md   -> ${path.relative(ROOT, MD)}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
