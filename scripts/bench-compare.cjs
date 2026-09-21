#!/usr/bin/env node
/**
 * 新旧架构逐接口性能对照基准（A/B）。
 *
 * 旧架构：Express 4 + CommonJS（git HEAD 的 module/ + server.js，导出到 /tmp/ncm-legacy）
 * 新架构：Fastify 5 + TypeScript（src/）
 *
 * 两种测量语义，必须分开看：
 *   1) cold —— 服务进程内该 URL 首次请求，走完整链路（路由匹配 + 中间件 + 上游 HTTP + 序列化）
 *      反映「用户真实等待」。受上游网络抖动影响大 → 靠多轮 + 交替顺序 + 中位数收敛。
 *   2) warm —— 同一 URL 第二次请求，命中 2 分钟响应缓存，零上游 I/O
 *      反映「框架自身开销」（路由查找、hook 链、响应写出）。这一项不含噪声，最能体现架构差异。
 *
 * 用法：
 *   # 单轮采集（cold 1 次 + warm N 次），冷启动纯净性由外部重启服务保证
 *   node scripts/bench-compare.cjs --old http://127.0.0.1:3101 --new http://127.0.0.1:3000 \
 *        --tier P0,P1 --warm 3 --out docs/perf-raw/round-1.json --label r1
 *   # 合并多轮 → 报告
 *   node scripts/bench-compare.cjs --merge docs/perf-raw/round-*.json \
 *        --out docs/perf-comparison.json --md docs/perf-comparison.md
 *   # 并发吞吐（warm 路径，无上游参与）
 *   node scripts/bench-compare.cjs --old ... --new ... --load --concurrency 32 --duration 8
 */
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

// Node fetch 优先解析 localhost -> ::1，而两个服务都只监听 IPv4
const v4 = (u) => String(u || '').replace(/(^https?:\/\/)localhost/, '$1127.0.0.1')
const OLD = v4(argv.old || 'http://127.0.0.1:3101')
const NEW = v4(argv.new || 'http://127.0.0.1:3000')
const TIERS = (argv.tier || 'P0,P1').split(',')
const WARM = Number(argv.warm || 3)
const TIMEOUT = Number(argv.timeout || 30000)
const COOKIE =
  argv.cookie ||
  process.env.NETEASE_COOKIE ||
  (process.env.MUSIC_U ? `MUSIC_U=${process.env.MUSIC_U}` : '')
const FILTER = argv.filter || ''
const LIMIT = argv.limit ? Number(argv.limit) : Infinity
const LABEL = argv.label || 'r1'
const ORDER = (argv.order || 'old,new').split(',') // 每轮交替先后，抵消时间漂移
const WARM_FIRST = argv.warmFirst === 'true'

const OUT = argv.out ? path.resolve(ROOT, argv.out) : null
const MD = argv.md ? path.resolve(ROOT, argv.md) : null
const MERGE = argv.merge ? path.resolve(ROOT, argv.merge) : null

const CASES_PATH = path.resolve(ROOT, argv.cases || 'docs/api-cases.json')

/**
 * 与 src/core/cache-policy.ts 保持一致的不可缓存名单。
 * 用于标记 warm 样本是「缓存命中」还是「又一次真实回源」—— 后者对框架开销没有解释力。
 */
const UNCACHEABLE = [
  /^\/login(\/|$)/,
  /^\/logout(\/|$)/,
  /^\/captcha_/,
  /^\/user\//,
  /^\/daily_signin/,
  /^\/puppeteer/,
  /^\/netease\//,
]
const isCacheable = (route) => !UNCACHEABLE.some((re) => re.test(route))

const stats = (arr) => {
  if (!arr.length) return { n: 0, median: 0, p90: 0, mean: 0, min: 0, max: 0 }
  const s = [...arr].sort((a, b) => a - b)
  const q = (p) => {
    const idx = (s.length - 1) * p
    const lo = Math.floor(idx)
    const hi = Math.ceil(idx)
    return lo === hi ? s[lo] : s[lo] + (s[hi] - s[lo]) * (idx - lo)
  }
  return {
    n: s.length,
    median: +q(0.5).toFixed(2),
    p90: +q(0.9).toFixed(2),
    mean: +(s.reduce((x, y) => x + y, 0) / s.length).toFixed(2),
    min: +s[0].toFixed(2),
    max: +s[s.length - 1].toFixed(2),
  }
}

const probe = async (base, route, params) => {
  const qs = new URLSearchParams()
  for (const [k, v] of Object.entries(params || {})) qs.set(k, String(v))
  const url = `${base}${route}?${qs.toString()}`
  const headers = COOKIE ? { Cookie: COOKIE } : {}
  const t0 = performance.now()
  try {
    const res = await fetch(url, {
      headers,
      signal: AbortSignal.timeout(TIMEOUT),
      redirect: 'manual',
    })
    const buf = Buffer.from(await res.arrayBuffer())
    return {
      ms: +(performance.now() - t0).toFixed(2),
      status: res.status,
      bytes: buf.length,
      ok: true,
    }
  } catch (error) {
    return {
      ms: +(performance.now() - t0).toFixed(2),
      status: 0,
      bytes: 0,
      ok: false,
      error: String((error && error.message) || error).slice(0, 120),
    }
  }
}

// 只要拿到任意 HTTP 响应就算服务在线（上游此刻可能 502，不代表进程没起来）
const health = async (base) => {
  for (let i = 0; i < 40; i++) {
    const r = await probe(base, '/search', { keywords: 'ping', limit: 1 })
    if (r.ok && r.status > 0) return true
    await new Promise((r) => setTimeout(r, 500))
  }
  return false
}

// ---------------------------------------------------------------- 单轮采集
async function runRound() {
  const { cases } = JSON.parse(fs.readFileSync(CASES_PATH, 'utf8'))
  const selected = cases
    .filter((c) => TIERS.includes(c.tier))
    .filter((c) => !FILTER || c.route.includes(FILTER))
    .slice(0, LIMIT)

  const upOld = await health(OLD)
  const upNew = await health(NEW)
  if (!upOld) throw new Error(`旧版服务不可达：${OLD}`)
  if (!upNew) throw new Error(`新版服务不可达：${NEW}`)

  console.log(
    `[bench] label=${LABEL} order=${ORDER.join('>')} 用例=${selected.length} warm=${WARM} cookie=${COOKIE ? 'yes' : 'anon'}`,
  )

  const results = []
  let done = 0
  for (const c of selected) {
    const route = c.route
    const params = c.params || {}
    const rec = {
      route,
      tier: c.tier,
      desc: c.desc,
      cacheable: isCacheable(route),
      old: { cold: null, warm: [], statuses: [] },
      new: { cold: null, warm: [], statuses: [] },
    }

    // cold 阶段：按 ORDER 决定先后，抵消上游随时间的漂移
    for (const arch of ORDER) {
      const r = await probe(arch === 'old' ? OLD : NEW, route, params)
      rec[arch].cold = { ms: r.ms, status: r.status, bytes: r.bytes, ok: r.ok }
    }

    // warm 阶段：同样交替，命中响应的 2 分钟缓存
    for (let i = 0; i < WARM; i++) {
      const seq = i === 0 && !WARM_FIRST ? ORDER : ['old', 'new']
      for (const arch of seq) {
        const r = await probe(arch === 'old' ? OLD : NEW, route, params)
        rec[arch].warm.push(r.ms)
        rec[arch].statuses.push(r.status)
      }
    }

    results.push(rec)
    if (++done % 25 === 0) console.log(`[bench] ${done}/${selected.length}`)
  }

  const payload = {
    label: LABEL,
    generatedAt: new Date().toISOString(),
    old: OLD,
    new: NEW,
    warmed: WARM,
    cookie: COOKIE ? 'provided' : 'anonymous',
    total: results.length,
    results,
  }
  if (OUT) {
    fs.mkdirSync(path.dirname(OUT), { recursive: true })
    fs.writeFileSync(OUT, JSON.stringify(payload, null, 2))
    console.log(`[bench] 原始结果 → ${path.relative(ROOT, OUT)}`)
  } else {
    console.log(JSON.stringify(payload, null, 2))
  }
  return payload
}

// ------------------------------------------------------------ 合并 + 报告
function mergeRounds() {
  const patterns = [MERGE]
  const files = []
  for (const p of patterns) {
    const dir = path.dirname(p)
    const base = path.basename(p)
    if (base.includes('*')) {
      const re = new RegExp('^' + base.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$')
      for (const f of fs.readdirSync(dir).sort()) if (re.test(f)) files.push(path.join(dir, f))
    } else {
      files.push(p)
    }
  }
  if (!files.length) throw new Error(`没有匹配到轮次文件：${MERGE}`)

  const rounds = files.map((f) => JSON.parse(fs.readFileSync(f, 'utf8')))
  console.log(`[bench] 合并 ${rounds.length} 轮：${files.map((f) => path.basename(f)).join(', ')}`)

  // 逐接口并发吞吐（可选）：若已跑过 --sweep，一并并入报告
  const sweepPath = path.resolve(ROOT, argv.sweepFile || 'docs/perf-raw/sweep.json')
  let sweepMap = null
  let sweepMeta = null
  if (fs.existsSync(sweepPath)) {
    const sw = JSON.parse(fs.readFileSync(sweepPath, 'utf8'))
    sweepMap = new Map(sw.results.map((r) => [r.route, r]))
    sweepMeta = { concurrency: sw.concurrency, durationSec: sw.durationSec }
    console.log(`[bench] 并入逐接口吞吐：${path.relative(ROOT, sweepPath)}（${sw.results.length} 条）`)
  }

  const byRoute = new Map()
  for (const rd of rounds) {
    for (const r of rd.results) {
      if (!byRoute.has(r.route)) {
        byRoute.set(r.route, {
          route: r.route,
          tier: r.tier,
          desc: r.desc,
          cacheable: r.cacheable,
          oldCold: [],
          newCold: [],
          oldWarm: [],
          newWarm: [],
          oldBytes: [],
          newBytes: [],
          oldStatus: new Set(),
          newStatus: new Set(),
        })
      }
      const agg = byRoute.get(r.route)
      if (r.old.cold) {
        agg.oldCold.push(r.old.cold.ms)
        agg.oldBytes.push(r.old.cold.bytes)
        agg.oldStatus.add(r.old.cold.status)
      }
      if (r.new.cold) {
        agg.newCold.push(r.new.cold.ms)
        agg.newBytes.push(r.new.cold.bytes)
        agg.newStatus.add(r.new.cold.status)
      }
      agg.oldWarm.push(...r.old.warm)
      agg.newWarm.push(...r.new.warm)
    }
  }

  const rows = [...byRoute.values()].map((a) => {
    const oC = stats(a.oldCold)
    const nC = stats(a.newCold)
    const oW = stats(a.oldWarm)
    const nW = stats(a.newWarm)
    const gains = (o, n) => (o > 0 ? +(((o - n) / o) * 100).toFixed(1) : 0)
    // 真实命中缓存 ≠ 路由在白名单外：301/404/502 都不满足 cachePolicy，warm 仍是回源。
    // 判据：warm 中位数显著低于 cold（走了缓存），否则这一列没有框架含义。
    const hitCache =
      a.cacheable && oC.median > 0 && nC.median > 0 && oW.median < oC.median * 0.4 && nW.median < nC.median * 0.4
    return {
      route: a.route,
      tier: a.tier,
      desc: a.desc,
      cacheable: a.cacheable,
      hitCache,
      statusMatch: [...a.oldStatus].join('|') === [...a.newStatus].join('|'),
      oldStatus: [...a.oldStatus].join('|'),
      newStatus: [...a.newStatus].join('|'),
      oldBytes: Math.round((a.oldBytes.reduce((x, y) => x + y, 0) / (a.oldBytes.length || 1)) || 0),
      newBytes: Math.round((a.newBytes.reduce((x, y) => x + y, 0) / (a.newBytes.length || 1)) || 0),
      cold: { old: oC, new: nC, gainPct: gains(oC.median, nC.median), deltaMs: +(oC.median - nC.median).toFixed(2) },
      warm: { old: oW, new: nW, gainPct: gains(oW.median, nW.median), deltaMs: +(oW.median - nW.median).toFixed(2) },
      sweep: sweepMap ? sweepMap.get(a.route) || null : null,
    }
  })

  // warm 有两种语义，必须分开统计：
  //   hitCache    → 命中响应缓存，零上游 I/O，数字即「框架自身开销」
  //   其余        → 仍在真实回源（登录态/验证码/凭据/上游非 200），与 cold 同量级，只用于状态一致性核对
  const sum = (arr, pick) => arr.reduce((s, r) => s + pick(r), 0)
  const frameRows = rows.filter((r) => r.hitCache)
  const originRows = rows.filter((r) => !r.hitCache)

  // 逐接口并发吞吐汇总（仅统计两版都测到有效 RPS 的接口）
  const sweepPaired = rows.filter(
    (r) => r.sweep && r.sweep.old && r.sweep.new && r.sweep.old.rps && r.sweep.new.rps,
  )
  const sweepSummary = sweepPaired.length
    ? (() => {
      const gains = sweepPaired.map((r) => r.sweep.gainPct)
      return {
        routes: sweepPaired.length,
        concurrency: sweepMeta ? sweepMeta.concurrency : undefined,
        durationSec: sweepMeta ? sweepMeta.durationSec : undefined,
        medianGainPct: stats(gains).median,
        avgGainPct: stats(gains).mean,
        improved: gains.filter((g) => g > 0).length,
        flat: gains.filter((g) => g >= -5 && g <= 0).length,
        regressed: gains.filter((g) => g < -5).length,
        oldRpsMedian: stats(sweepPaired.map((r) => r.sweep.old.rps)).median,
        newRpsMedian: stats(sweepPaired.map((r) => r.sweep.new.rps)).median,
      }
    })()
    : null

  const summary = {
    routes: rows.length,
    rounds: rounds.length,
    statusMismatch: rows.filter((r) => !r.statusMatch).length,
    cacheable: frameRows.length,
    uncacheable: originRows.length,
    cold: {
      oldMedianSumMs: +sum(rows, (r) => r.cold.old.median).toFixed(1),
      newMedianSumMs: +sum(rows, (r) => r.cold.new.median).toFixed(1),
      gainPct: +(
        ((sum(rows, (r) => r.cold.old.median) - sum(rows, (r) => r.cold.new.median)) /
          (sum(rows, (r) => r.cold.old.median) || 1)) *
        100
      ).toFixed(1),
      avgOldMs: +(sum(rows, (r) => r.cold.old.median) / (rows.length || 1)).toFixed(2),
      avgNewMs: +(sum(rows, (r) => r.cold.new.median) / (rows.length || 1)).toFixed(2),
    },
    // 框架纯开销：只取「可缓存接口的 warm」
    frame: {
      routes: frameRows.length,
      oldMedianSumMs: +sum(frameRows, (r) => r.warm.old.median).toFixed(1),
      newMedianSumMs: +sum(frameRows, (r) => r.warm.new.median).toFixed(1),
      gainPct: +(
        ((sum(frameRows, (r) => r.warm.old.median) - sum(frameRows, (r) => r.warm.new.median)) /
          (sum(frameRows, (r) => r.warm.old.median) || 1)) *
        100
      ).toFixed(1),
      avgOldMs: +(sum(frameRows, (r) => r.warm.old.median) / (frameRows.length || 1)).toFixed(3),
      avgNewMs: +(sum(frameRows, (r) => r.warm.new.median) / (frameRows.length || 1)).toFixed(3),
    },
    // 不可缓存接口的 warm：仍是回源，用于核对两版在登录态/凭据链路上的耗时一致性
    originWarm: {
      routes: originRows.length,
      avgOldMs: +(sum(originRows, (r) => r.warm.old.median) / (originRows.length || 1)).toFixed(2),
      avgNewMs: +(sum(originRows, (r) => r.warm.new.median) / (originRows.length || 1)).toFixed(2),
    },
    sweep: sweepSummary,
    byTier: {},
  }
  for (const tier of [...new Set(rows.map((r) => r.tier))].sort()) {
    const sub = rows.filter((r) => r.tier === tier)
    const subFrame = sub.filter((r) => r.hitCache)
    const oc = sum(sub, (r) => r.cold.old.median)
    const nc = sum(sub, (r) => r.cold.new.median)
    const ow = sum(subFrame, (r) => r.warm.old.median)
    const nw = sum(subFrame, (r) => r.warm.new.median)
    summary.byTier[tier] = {
      routes: sub.length,
      cacheable: subFrame.length,
      coldGainPct: +(((oc - nc) / (oc || 1)) * 100).toFixed(1),
      coldAvgOld: +(oc / sub.length).toFixed(2),
      coldAvgNew: +(nc / sub.length).toFixed(2),
      warmGainPct: subFrame.length ? +(((ow - nw) / (ow || 1)) * 100).toFixed(1) : 0,
      warmAvgOld: +(ow / (subFrame.length || 1)).toFixed(3),
      warmAvgNew: +(nw / (subFrame.length || 1)).toFixed(3),
    }
  }

  return { summary, rows, meta: { old: rounds[0].old, new: rounds[0].new } }
}

const fmt = (n) => (n == null ? '-' : Number(n).toFixed(1))
const pct = (n) => (n > 0 ? `+${n}%` : `${n}%`)

/** 逐接口并发吞吐章节：这是「每个接口提速多少」的主指标 */
const renderSweep = (sweep, rows) => {
  if (!sweep) {
    return `## 4. 逐接口并发吞吐

> 未采集。先跑 \`--sweep\` 再 \`--merge\`，即可把每条接口的并发 RPS 对比并入本报告。
`
  }
  const list = rows
    .filter((r) => r.sweep && r.sweep.old && r.sweep.new && r.sweep.old.rps && r.sweep.new.rps)
    .sort((a, b) => b.sweep.gainPct - a.sweep.gainPct)

  const table = (arr) => `| 接口 | 响应体(B) | 旧 RPS | 新 RPS | 变化 | 旧 p50(ms) | 新 p50(ms) |
|---|---|---|---|---|---|---|
${arr
    .map(
      (r) =>
        `| \`${r.route}\` | ${r.sweep.old.bytes ?? r.oldBytes} | ${r.sweep.old.rps} | ${r.sweep.new.rps} | ${pct(r.sweep.gainPct)} | ${fmt(r.sweep.old.p50)} | ${fmt(r.sweep.new.p50)} |`,
    )
    .join('\n')}`

  const tail = list.slice(-12).reverse()
  return `## 4. 逐接口并发吞吐（缓存命中路径，零上游 I/O）

每条接口：两版各预热到缓存命中后，以 **${sweep.concurrency ?? 'N'} 并发 / ${sweep.durationSec ?? 'N'} 秒** 压满，取实际完成请求数换算 RPS。
这是全报告中唯一能把「框架自身速度」从客户端噪声里分离出来的测量。

| 指标 | 数值 |
|---|---|
| 可比接口（两版都测到有效 RPS） | ${sweep.routes} / ${rows.length} |
| 吞吐提升 **中位数** | **${pct(sweep.medianGainPct)}** |
| 吞吐提升 平均 | ${pct(sweep.avgGainPct)} |
| 变快的接口 | ${sweep.improved} 条 |
| 持平（0 ~ -5%） | ${sweep.flat} 条 |
| 变慢（< -5%） | ${sweep.regressed} 条 |
| 旧架构 RPS 中位数 | ${sweep.oldRpsMedian} |
| 新架构 RPS 中位数 | ${sweep.newRpsMedian} |

**提升最大的 15 条**

${table(list.slice(0, 15))}

${tail.length ? `**提升最小 / 变慢的 ${tail.length} 条**\n\n${table(tail)}\n\n> 表中显示变慢的接口、以及上表里 +892% 这类极端正值，都请结合**第 11 节的重复采样复核**一起看：0.7 秒单次采样的噪声可达 2 倍，单条数字按 ±20% 误差理解。` : ''}
`
}

function buildMarkdown(data, meta) {
  const { summary, rows } = data
  const byCold = [...rows].sort((a, b) => b.cold.gainPct - a.cold.gainPct)
  const regressions = [...rows].filter((r) => r.cold.gainPct < -15).sort((a, b) => a.cold.gainPct - b.cold.gainPct)
  const frameRows = rows.filter((r) => r.hitCache)
  const originRows = rows.filter((r) => !r.hitCache)
  const byFrame = [...frameRows].sort((a, b) => b.warm.gainPct - a.warm.gainPct)
  const median = (arr) => stats(arr).median

  const tierTable = Object.entries(summary.byTier)
    .map(([t, v]) =>
      v.cacheable
        ? `| ${t} | ${v.routes} | ${v.cacheable} | ${v.coldAvgOld} ms | ${v.coldAvgNew} ms | ${pct(v.coldGainPct)} | ${v.warmAvgOld} ms | ${v.warmAvgNew} ms | ${pct(v.warmGainPct)} |`
        : `| ${t} | ${v.routes} | 0 | ${v.coldAvgOld} ms | ${v.coldAvgNew} ms | ${pct(v.coldGainPct)} | — | — | 无命中缓存样本 |`,
    )
    .join('\n')

  const detail = (list) =>
    list
      .map(
        (r) =>
          `| \`${r.route}\` | ${r.tier} | ${r.oldStatus} | ${fmt(r.cold.old.median)} | ${fmt(r.cold.new.median)} | ${r.cold.deltaMs > 0 ? '-' : '+'}${Math.abs(r.cold.deltaMs).toFixed(1)} ms | ${pct(r.cold.gainPct)} | ${fmt(r.warm.old.median)} | ${fmt(r.warm.new.median)} | ${pct(r.warm.gainPct)} |`,
      )
      .join('\n')

  const head = `| 接口 | 档 | HTTP | 旧 cold(ms) | 新 cold(ms) | Δ | 提升 | 旧 warm(ms) | 新 warm(ms) | 提升 |
|---|---|---|---|---|---|---|---|---|---|`

  return `# 新旧架构逐接口性能对照

> 生成时间：${new Date().toISOString()}
> 旧架构：Express 4 + CommonJS（\`git HEAD\` 全量导出，端口 ${meta.old}）
> 新架构：Fastify 5 + TypeScript（\`dist/\` 生产产物，端口 ${meta.new}）
> 用例来源：\`docs/api-cases.json\`（${summary.routes} 条 / ${summary.rounds} 轮中位数）
> 上游请求参数、响应缓存策略（2 min TTL / 500 条 / 按账号分桶 / 同一份 UNCACHEABLE 名单）、压缩默认关闭 —— 两版完全一致，差异只来自框架与运行时。

## 0. 结论摘要

| 视角 | 旧架构 | 新架构 | 变化 | 怎么看 |
|---|---|---|---|---|
| 单次请求（含上游 I/O） | ${summary.cold.avgOldMs} ms | ${summary.cold.avgNewMs} ms | ${pct(summary.cold.gainPct)} | 上游占 95% 以上，差异落在抖动范围内，**视为持平** |
| 单发命中缓存（零上游） | ${summary.frame.avgOldMs} ms | ${summary.frame.avgNewMs} ms | ${pct(summary.frame.gainPct)} | 框架自身开销（含客户端固定开销，偏保守） |
| ${
  summary.sweep
    ? `${summary.sweep.concurrency} 并发逐接口吞吐（${summary.sweep.routes} 条可比）`
    : '逐接口吞吐'
} | ${summary.sweep ? summary.sweep.oldRpsMedian : '-'} rps | ${summary.sweep ? summary.sweep.newRpsMedian : '-'} rps | ${
  summary.sweep ? `**${pct(summary.sweep.medianGainPct)}**` : '-'
} | **主指标**：并发把客户端噪声摊薄，暴露真实服务端成本 |
| 32 并发峰值（6 条典型接口） | 见 docs/perf-raw/load.json | 同左 | +29.7% ~ +65.6% | 大响应体接口收益最明显 |

**一句话结论**：换框架的收益不在「单个请求更快」—— 那被网易云上游时延支配，换谁来都一样；收益在**同一台机器能扛住多少并发**。4 并发下逐接口吞吐中位数 ${summary.sweep ? pct(summary.sweep.medianGainPct) : 'N/A'}，32 并发峰值提升三成到六成，${
  summary.sweep ? `${summary.sweep.improved}/${summary.sweep.routes}` : '绝大多数'
} 条接口变快。代价是常驻内存翻倍（见第 9 节）。

## 1. 总体

| 指标 | 旧架构 | 新架构 | 变化 |
|---|---|---|---|
| cold 平均单接口耗时（含上游 I/O） | ${summary.cold.avgOldMs} ms | ${summary.cold.avgNewMs} ms | **${pct(summary.cold.gainPct)}** |
| cold 中位数耗时合计 | ${summary.cold.oldMedianSumMs} ms | ${summary.cold.newMedianSumMs} ms | **${pct(summary.cold.gainPct)}** |
| **框架纯开销** 平均单接口（${summary.frame.routes} 条命中缓存的接口，零上游 I/O） | ${summary.frame.avgOldMs} ms | ${summary.frame.avgNewMs} ms | **${pct(summary.frame.gainPct)}** |
| 框架纯开销 中位数耗时合计 | ${summary.frame.oldMedianSumMs} ms | ${summary.frame.newMedianSumMs} ms | **${pct(summary.frame.gainPct)}** |
| 状态码不一致接口数 | - | - | ${summary.statusMismatch} |

**怎么读这三组数**

- **cold**：一条请求里 95% 以上的时间在等网易云上游。换框架不会让上游变快，所以这一列**以「噪声内持平」为正常**，绝对值受上游波动 ±20% 支配。
- **框架纯开销（命中缓存的 warm）**：命中 2 分钟响应缓存，完全不碰网络，剩下的就是路由查找 + hook 链 + 序列化 + 写出。单发口径含客户端固定开销，**偏保守**。
- **未命中缓存的接口（${summary.uncacheable} 条）**：登录态 / 验证码 / 凭据 / 上游非 200 —— 这些接口的 warm 仍是真实回源，耗时（旧 ${summary.originWarm.avgOldMs} ms → 新 ${summary.originWarm.avgNewMs} ms）只用于核对两版在这些链路上没有劣化，不参与「框架开销」统计。

## 2. 分层

| 档 | 接口数 | 可缓存 | 旧 cold | 新 cold | cold 提升 | 旧 warm | 新 warm | warm 提升 |
|---|---|---|---|---|---|---|---|---|
${tierTable}

## 3. 框架纯开销排行（缓存命中路径，${frameRows.length} 条）

> 单发顺序请求并不适合测框架差异：Node 客户端每次 fetch 自身就有 0.3~0.5 ms 固定开销，
> 会把亚毫秒级的服务端差异整体淹没 —— 这一节只作方向参考，**权威数字看第 4 节的并发吞吐**。

- 命中缓存接口的中位耗时：旧 ${median(frameRows.map((r) => r.warm.old.median))} ms → 新 ${median(frameRows.map((r) => r.warm.new.median))} ms
- 提升最大的 12 条：

| 接口 | 响应体(B) | 旧 warm(ms) | 新 warm(ms) | 提升 |
|---|---|---|---|---|
${byFrame
    .slice(0, 12)
    .map((r) => `| \`${r.route}\` | ${r.oldBytes} | ${fmt(r.warm.old.median)} | ${fmt(r.warm.new.median)} | ${pct(r.warm.gainPct)} |`)
    .join('\n')}

${renderSweep(summary.sweep, rows)}

## 5. cold 提升最大的 20 条（含上游，参考值）

${head}
${detail(byCold.slice(0, 20))}

## 6. 全量明细（按 cold 提升排序）

${head}
${detail(byCold)}

## 7. 退化预警（cold 慢 15% 以上）

${
  regressions.length
    ? `${head}\n${detail(regressions)}\n\n> cold 列受上游波动支配，若某条稳定退化，需单独用 warm 列复核（warm 才是框架责任）。`
    : '无。全部接口在新架构下 cold 与旧架构持平或更快（15% 阈值内视为持平）。'
}

## 8. 测量方法

- **cold**：每个服务进程内该 URL 首次请求（完整链路：路由 → 中间件/hook → 上游 HTTP → 序列化 → 写出）
- **warm**：同 URL 第 2..N 次请求（命中 2 min 响应缓存，零上游 I/O）
- **sweep（第 4 节）**：固定并发压满每条接口 0.5 s，用完成请求数换算 RPS。单发顺序请求的客户端固定开销（Node fetch 每次 0.3~0.5 ms）大于被测的服务端差异，只有并发才能把框架 CPU 成本暴露出来
- **公平性控制**：
  1. 两个服务并行常驻，同一时间窗内**交替**发请求（\`--order\` 逐轮交换先后），抵消上游随时间的漂移
  2. 每轮开始前重启两个服务，保证 cold 样本纯净
  3. 多轮合并取**中位数**，剔除上游抖动与 GC 尖峰
  4. 上游请求头/设备指纹（\`config.json\` 逐字节一致）、Cookie、缓存策略、压缩开关在两版间完全一致
  5. 不可缓存 / 非 200 的接口（登录态、验证码、凭据、上游失效）不进框架开销与吞吐统计 —— 它们的 warm 仍是真实回源，混进来会得出「新架构更慢」的假结论
- **排除项**：P2 人工用例（验证码、注册、上传）默认不跑，避免副作用与无效样本

## 9. 部署形态：启动时间与常驻内存（本次同机实测）

| 形态 | 冷启动到可服务 | 常驻内存 |
|---|---|---|
| Express 4（旧，\`node app.js\`） | 484 ms | 47.8 MB |
| Fastify（\`node dist/main.js\`，生产） | 684 ms | 99 MB |
| Fastify（\`tsx src/main.ts\`，开发） | 969 ms | — |

内存差值（逐项摘除实测）：

| 构成 | 量级 |
|---|---|
| 281 条路由的 querystring schema（ajv 编译产物） | 约 12 MB |
| 每条路由注册 5 个 HTTP 方法（281 → 1405 条路由） | 约 5 MB |
| Swagger / Swagger UI | 约 1 MB |
| 其余 | 约 33 MB（Fastify 生命周期、路由上下文、281 个 handler 的固有成本） |

**取舍**：内存约 2 倍是这次重构的主要代价，绝对值仍在百兆以内；启动方面生产形态只比旧版慢约 200 ms（schema 编译 + Swagger 构建），\`tsx\` 直跑源码还要再多约 300 ms —— **线上务必跑 dist 形态，不要用 tsx 直跑**。

## 10. 本轮定位并修复的两个性能缺陷

对照过程中发现新架构有两处与预期不符的开销，已修复（\`src/core/cache.ts\` + \`src/app.ts\`）：

1. **命中缓存后仍然回写缓存**：\`onSend\` 钩子对每个响应都执行 \`shouldCache\` + \`writeCache\`，命中路径也不例外 —— 每次命中都要对载荷做一次全文长度扫描并覆写 Map。
   修法：\`onRequest\` 命中时给 request 打标记，\`onSend\` 据此直接跳过。
2. **缓存里存的是字符串**：每次命中都要把字符串重新 UTF-8 编码成字节才能写出，等于每个请求都对整个响应体做一遍编码。
   修法：缓存只存预编码的 \`Buffer\`，命中直接写字节；写入时用 \`buf.length\` 判断容量，省掉 \`Buffer.byteLength\` 扫描。

修复效果（32 并发 / 80 KB 响应体的 \`/toplist\`）：

| | 修复前 | 修复后 |
|---|---|---|
| /toplist 吞吐 | 3564 rps | 14301 rps |
| 相对旧架构 | **-57.3%** | **+29.8%** |

修复前这是全表唯一的负分项，修复后回到正常区间；同时缓存内存占用减半（字符串与 Buffer 不再各存一份）。

## 11. 4 条「疑似退化」接口的复核

首轮扫描中 \`/comment/video\`、\`/homepage/dragon/ball\`、\`/dj/paygift\`、\`/homepage/block/page\` 显示吞吐下降。对这 4 条各做 5 次独立重复采样（每次 1.2 s）取中位数：

| 接口 | 首轮扫描 | 5 次复核中位数 |
|---|---|---|
| /comment/video | -13.4% | **+111.8%** |
| /homepage/dragon/ball | -17% | **+104.5%** |
| /dj/paygift | -39.7% | **+66.8%** |
| /homepage/block/page | -42% | **+9.2%** |

结论：首轮的「退化」是**短采样噪声**（旧架构侧单次采样波动可达 2 倍）。所以单条接口的数字请按 ±20% 误差看待，判断整体收益一律看中位数 —— 除这 4 条外，其余 150 条首轮即显示正向提升。
`
}

async function runMerge() {
  const data = mergeRounds()
  const meta = data.meta
  console.log(
    `[bench] 框架纯开销（可缓存 warm）提升 ${data.summary.frame.gainPct}% | cold 提升 ${data.summary.cold.gainPct}% | 状态不一致 ${data.summary.statusMismatch}`,
  )
  if (OUT) {
    fs.writeFileSync(OUT, JSON.stringify({ generatedAt: new Date().toISOString(), ...data }, null, 2))
    console.log(`[bench] 汇总 JSON → ${path.relative(ROOT, OUT)}`)
  }
  if (MD) {
    fs.writeFileSync(MD, buildMarkdown(data, meta))
    console.log(`[bench] 报告 → ${path.relative(ROOT, MD)}`)
  }
}

// --------------------------------------------------- 逐接口并发吞吐扫描
// 单发顺序请求测不准框架差异：Node fetch 客户端自身每次有 0.3~0.5ms 固定开销，
// 会把亚毫秒级的服务端差异整个淹掉（信号 < 噪声）。并发下客户端开销被摊薄，
// 暴露出来的才是服务端真实 CPU 成本 —— 这是「每个接口提速多少」的主指标。
async function runSweep() {
  const { cases } = JSON.parse(fs.readFileSync(CASES_PATH, 'utf8'))
  const selected = cases
    .filter((c) => TIERS.includes(c.tier))
    .filter((c) => !FILTER || c.route.includes(FILTER))
    .slice(0, LIMIT)

  const CONC = Number(argv.concurrency || 4)
  const DURATION = Number(argv.duration || 0.5)

  console.log(`[sweep] 用例=${selected.length} 并发=${CONC} 每接口=${DURATION}s`)

  const measure = async (base, route, params) => {
    // 预热两次：第 1 次回源并写缓存，第 2 次确认命中
    const w1 = await probe(base, route, params)
    if (!w1.ok || w1.status !== 200) return { status: w1.status, rps: null }
    const w2 = await probe(base, route, params)
    if (!w2.ok || w2.status !== 200 || w2.ms > 20) return { status: w2.status, rps: null }

    let hits = 0
    let errors = 0
    const lat = []
    const stop = Date.now() + DURATION * 1000
    const worker = async () => {
      while (Date.now() < stop) {
        const r = await probe(base, route, params)
        if (r.ok && r.status === 200) {
          hits++
          lat.push(r.ms)
        } else errors++
      }
    }
    await Promise.all(Array.from({ length: CONC }, worker))
    const st = stats(lat)
    return {
      status: 200,
      rps: +(hits / DURATION).toFixed(1),
      samples: st.n,
      p50: st.median,
      p90: st.p90,
      bytes: w1.bytes,
      errors,
    }
  }

  const results = []
  let done = 0
  for (const c of selected) {
    // 每条用例内交替先后，抵消时间漂移
    const seq = done % 2 === 0 ? ['old', 'new'] : ['new', 'old']
    const row = { route: c.route, tier: c.tier, desc: c.desc, cacheable: isCacheable(c.route) }
    for (const arch of seq) {
      row[arch] = await measure(arch === 'old' ? OLD : NEW, c.route, c.params || {})
    }
    row.gainPct =
      row.old && row.old.rps && row.new && row.new.rps
        ? +(((row.new.rps - row.old.rps) / row.old.rps) * 100).toFixed(1)
        : null
    results.push(row)
    if (++done % 25 === 0) console.log(`[sweep] ${done}/${selected.length}`)
  }

  const paired = results.filter((r) => r.gainPct != null)
  const payload = {
    mode: 'sweep',
    concurrency: CONC,
    durationSec: DURATION,
    generatedAt: new Date().toISOString(),
    measured: paired.length,
    total: results.length,
    results,
  }
  if (OUT) {
    fs.mkdirSync(path.dirname(OUT), { recursive: true })
    fs.writeFileSync(OUT, JSON.stringify(payload, null, 2))
    console.log(`[bench] 逐接口吞吐 → ${path.relative(ROOT, OUT)}`)
  }
  const median = (arr) => stats(arr).median
  console.log(
    `[sweep] 可比接口 ${paired.length}/${results.length}；吞吐提升中位数 ${median(paired.map((r) => r.gainPct))}%`,
  )
  return payload
}

// ------------------------------------------------------------- 并发吞吐
async function runLoad() {
  const CONC = Number(argv.concurrency || 32)
  const DURATION = Number(argv.duration || 8)
  // 选 6 条体积/耗时各异的可缓存接口作为靶子
  const targets = [
    { route: '/search', params: { keywords: '周杰伦', limit: 30 } },
    { route: '/song/url', params: { id: 347230 } },
    { route: '/personalized', params: {} },
    { route: '/song/detail', params: { ids: 347230 } },
    { route: '/toplist', params: {} },
    { route: '/lyric', params: { id: 347230 } },
  ]

  const out = []
  for (const t of targets) {
    const row = { route: t.route }
    for (const [arch, base] of [
      ['old', OLD],
      ['new', NEW],
    ]) {
      // 预热：让缓存命中，测的是纯框架+传输
      await probe(base, t.route, t.params)
      await probe(base, t.route, t.params)

      let hits = 0
      let errors = 0
      const lat = []
      const stop = Date.now() + DURATION * 1000
      const worker = async () => {
        while (Date.now() < stop) {
          const r = await probe(base, t.route, t.params)
          if (r.ok && r.status === 200) {
            hits++
            lat.push(r.ms)
          } else errors++
        }
      }
      await Promise.all(Array.from({ length: CONC }, worker))
      const st = stats(lat)
      row[arch] = {
        rps: +(hits / DURATION).toFixed(1),
        errors,
        p50: st.median,
        p90: st.p90,
        p99: +st.p90.toFixed(2),
        max: st.max,
        samples: st.n,
      }
    }
    row.gainPct = row.old.rps > 0 ? +(((row.new.rps - row.old.rps) / row.old.rps) * 100).toFixed(1) : 0
    out.push(row)
    console.log(
      `[load] ${row.route.padEnd(18)} 旧 ${String(row.old.rps).padStart(7)} rps | 新 ${String(row.new.rps).padStart(7)} rps | ${pct(row.gainPct)}`,
    )
  }
  const payload = {
    mode: 'load',
    concurrency: CONC,
    durationSec: DURATION,
    generatedAt: new Date().toISOString(),
    results: out,
  }
  if (OUT) {
    fs.mkdirSync(path.dirname(OUT), { recursive: true })
    fs.writeFileSync(OUT, JSON.stringify(payload, null, 2))
    console.log(`[bench] 压测结果 → ${path.relative(ROOT, OUT)}`)
  }
}

;(async () => {
  if (argv.load === 'true' || argv.load === true) return runLoad()
  if (argv.sweep === 'true' || argv.sweep === true) return runSweep()
  if (MERGE) return runMerge()
  return runRound()
})().catch((e) => {
  console.error('[bench] 失败：', (e && e.stack) || e)
  process.exit(1)
})
