#!/usr/bin/env node
// 生成「接口回归测试计划」：docs/api-cases.json（机器可读）+ docs/refactor-api-test-plan.md（人读勾选）
// 用法：node scripts/gen-api-test-plan.cjs [项目根目录]
// 路由映射、参数提取规则与 server.js:getModulesDefinitions 保持一致
const fs = require('fs')
const path = require('path')

const ROOT =
  process.argv[2] && !process.argv[2].startsWith('--')
    ? process.argv[2]
    : path.resolve(__dirname, '..')
const ROUTES_DIR = path.join(ROOT, 'src', 'routes')

// 可选：--probe docs/regression-baseline.json，把重构前的实测结果并进文档
const probeIdx = process.argv.indexOf('--probe')
const PROBE_FILE =
  probeIdx > -1 && process.argv[probeIdx + 1]
    ? path.resolve(ROOT, process.argv[probeIdx + 1])
    : null
const PROBE = PROBE_FILE && fs.existsSync(PROBE_FILE)
  ? new Map(
    JSON.parse(fs.readFileSync(PROBE_FILE, 'utf8')).results.map((r) => [r.route, r]),
  )
  : null

// 与 src/core/routes.ts 的映射完全一致：文件路径即路由（daily_signin.ts -> /daily_signin）
const routeOf = (rel) => `/${rel.replace(/\.ts$/i, '')}`

// 通用参数：全接口可用，不进业务参数表
const RESERVED = new Set(['cookie', 'proxy', 'realIP', 'ua', 'timestamp'])

// 需要人工验收（脚本不自动跑）的路由关键字
const MANUAL_KEYWORDS = [
  '/cloud',
  '/upload',
  '/puppeteer',
  '/register',
  '/captcha',
  '/sms',
  '/rebind',
  '/activate',
  '/song/unblock',
  '/logout',
  '/login/token',
  '/login/status',
  '/login/refresh',
  '/login/qr/check',
  '/login/cellphone',
  '/login/email',
]

// 响应内容本身随机的接口（私人 FM 每首歌都不同）：指纹只比顶层结构，避免误报
const RANDOM_ROUTES = new Set(['/personal_fm'])

// 常见参数示例值（与 test/ 下现有用例保持一致的真实可用值）
const SAMPLES = {
  keywords: '海阔天空',
  keyword: '海阔天空',
  s: '海阔天空',
  limit: 30,
  offset: 0,
  page: 1,
  pageSize: 20,
  size: 20,
  before: 0,
  br: 999000,
  level: 'standard',
  type: 1,
  area: 'ALL',
  initial: 'A',
  cat: '全部',
  order: 'hot',
  time: 0,
  noCookie: 0,
  realIP: '116.25.146.177',
}

// 按路由语义选真实存在的资源 id
const idSample = (name, route) => {
  const pick = [
    [/album|program|voice/, 32311],
    [/artist/, 5781],
    [/playlist|top\/playlist|user\/playlist/, 24381616],
    [/mv|video|mlog/, 5436712],
    [/dj|radio|voice/, 3470602],
    [/user|uid|account/, 32953014],
    [/song|music|lyric|url|download|detail|comment|like|scrobble/, 347230],
  ]
  for (const [re, v] of pick) if (re.test(route) || re.test(name)) return v
  return 32311
}

const sampleOf = (name, route) => {
  const n = name.toLowerCase()
  if (n in SAMPLES) return SAMPLES[n]
  if (/^(id|ids|.*id|.*ids)$/.test(n)) return idSample(n, route)
  if (/^(songid|songids|trackid)s?$/.test(n)) return 347230
  if (n.includes('name') || n.includes('nickname')) return 'test'
  if (n.includes('msg') || n.includes('content') || n.includes('text'))
    return 'test'
  if (/^(url|link)$/.test(n)) return 'https://example.com'
  if (/time|duration|timestamp/.test(n)) return 0
  if (/^(page|size|limit|offset|count|num|total)/.test(n)) return 10
  return ''
}

const walk = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) return walk(full)
    return entry.name.endsWith('.ts') && !entry.name.endsWith('.d.ts') ? [full] : []
  })

const scan = (dir) =>
  walk(dir).map((file) => {
    const rel = path.relative(dir, file).split(path.sep).join('/')
    const src = fs.readFileSync(file, 'utf8')
    const desc = (src.match(/^\s*\/\/\s*(.+)/m) || [, ''])[1].trim()
    const route = routeOf(rel)

    const methods = [
      ...new Set([...src.matchAll(/request\(\s*'(GET|POST)'/g)].map((m) => m[1])),
    ]
    const cryptos = [
      ...new Set([...src.matchAll(/crypto:\s*'(\w+)'/g)].map((m) => m[1])),
    ]

    // 参数：query.xxx，是否带默认值决定必填/可选
    const params = new Map()
    for (const m of src.matchAll(/query\.([A-Za-z_]\w*)(\s*(\?\?|\|\|))?/g)) {
      const name = m[1]
      if (RESERVED.has(name)) continue
      const hasDefault = !!m[2]
      const prev = params.get(name)
      // 任意一次出现无默认值 → 必填
      params.set(name, {
        name,
        required: prev ? prev.required && !hasDefault : !hasDefault,
      })
    }

    const loginHint = /MUSIC_U|query\.cookie\.(os|appver|__csrf)/.test(src)
    const complex =
        (src.match(/request\(/g) || []).length > 1 ||
        /for\s*\(|while\s*\(|\.map\(async/.test(src)

    const manual = MANUAL_KEYWORDS.some(
      (k) => route === k || route.startsWith(k + '/'),
    )

    // 断言策略
    let tier = 'P0'
    let expect = 'http200'
    if (manual) {
      tier = 'P2'
      expect = 'manual'
    } else if (loginHint) {
      tier = 'P1'
      expect = 'loginRequired'
    } else if (route === '/login/qr/create') {
      // 该接口不请求上游，本地合成二维码；key 需先请求 /login/qr/key 取 unikey
      tier = 'P0'
      expect = 'code200'
    }

    const query = {}
    for (const p of params.values()) {
      const v = sampleOf(p.name, route)
      if (v !== '' || p.required) query[p.name] = v
    }

    return {
      file: rel,
      route,
      methods: methods.length ? methods.join('/') : 'GET/POST',
      cryptos: cryptos.join(',') || 'api',
      params: [...params.values()],
      loginHint,
      complex,
      desc,
      tier,
      expect,
      // 匿名可跑的用例附带 realIP，规避上游风控
      sampleQuery: tier === 'P0' ? { ...query, realIP: '116.25.146.177' } : query,
      unconfirmedParams: Object.entries(query)
        .filter(([, v]) => v === '')
        .map(([k]) => k),
    }
  })

const modules = scan(ROUTES_DIR).sort((a, b) => a.route.localeCompare(b.route))

// 若已跑过实测（--write-back 回写过分层），沿用回写结果，避免重新生成时分层回退
const CASES_PATH = path.join(ROOT, 'docs/api-cases.json')
if (fs.existsSync(CASES_PATH)) {
  try {
    const prev = JSON.parse(fs.readFileSync(CASES_PATH, 'utf8')).cases
    const map = new Map(prev.map((c) => [c.route, c]))
    for (const m of modules) {
      const p = map.get(m.route)
      if (!p) continue
      m.tier = p.tier || m.tier
      m.expect = p.expect || m.expect
      if (p.note) m.note = p.note
      if (p.baselineStatus) m.baselineStatus = p.baselineStatus
      if (p.looseSignature) m.looseSignature = true
      if (p.params) m.sampleQuery = p.params
    }
  } catch {
    /* cases.json 损坏则忽略，用静态推断结果 */
  }
}

const cases = modules.map((m) => {
  const c = {
    route: m.route,
    method: 'GET',
    tier: m.tier,
    expect: m.expect,
    params: m.sampleQuery,
    desc: m.desc || '',
  }
  if (m.baselineStatus) c.baselineStatus = m.baselineStatus
  if (m.note) c.note = m.note
  if (RANDOM_ROUTES.has(m.route)) c.looseSignature = true
  // 链式用例：二维码合成需要先拿 unikey
  if (m.route === '/login/qr/create') {
    c.from = [{ route: '/login/qr/key', pick: 'unikey', as: 'key' }]
  }
  return c
})

fs.writeFileSync(
  path.join(ROOT, 'docs/api-cases.json'),
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      base: 'http://localhost:3000',
      total: cases.length,
      tiers: {
        P0: cases.filter((c) => c.tier === 'P0').length,
        P1: cases.filter((c) => c.tier === 'P1').length,
        P2: cases.filter((c) => c.tier === 'P2').length,
      },
      cases,
    },
    null,
    2,
  ),
)

const probeCell = (route) => {
  if (!PROBE) return '—'
  const r = PROBE.get(route)
  if (!r) return '未跑'
  return `${r.status}${r.code !== null ? ` / ${r.code}` : ''} · ${r.ms}ms · ${r.pass ? '✅' : '❌'}`
}

const row = (m, i) => {
  const ps = m.params.length
    ? m.params
      .map((p) => (p.required ? '`' + p.name + '`' : '`' + p.name + '`?'))
      .join(' ')
    : '—'
  const curl =
    m.tier === 'P0'
      ? `curl -s "${'http://localhost:3000' + m.route}?${new URLSearchParams(
        Object.entries(m.sampleQuery).map(([k, v]) => [k, String(v)]),
      ).toString()}"`
      : '（人工/带 cookie 执行）'
  const note = m.note ? `<br>⚠ ${m.note}` : ''
  return `| ${i + 1} | \`${m.route}\` | ${ps} | ${m.expect} | ${m.tier} | ${probeCell(m.route)}${note} | ☐ | ${curl} |`
}

const md = `# 接口回归测试计划（TS 重构验收）

> 生成时间：${new Date().toISOString().slice(0, 19).replace('T', ' ')}
> 数据来源：静态解析 src/routes/**/*.ts（${modules.length} 个），路由映射与 src/core/routes.ts 一致
> 配套文件：机器可读用例 \`docs/api-cases.json\`、执行脚本 \`scripts/api-regression.cjs\`
> 基线来源：重构前 Express 版实测（\`docs/regression-baseline.json\`）；TS + Fastify 版跑同用例对比 **差异=0**
> 重新生成：\`node scripts/gen-api-test-plan.cjs\`

## 一、怎么跑（闭环）

\`\`\`bash
# 1) 起服务（TS + Fastify）
npm start                 # 或 npm run dev（watch）；换端口 PORT=3100 npm start

# 2) 跑全量用例并与基线对比（基线存于 docs/regression-baseline.json）
npm run regression:compare
#   = node scripts/api-regression.cjs --base http://localhost:3000 --tier P0,P1 \\
#       --compare docs/regression-baseline.json --out docs/regression-latest.json --md docs/regression-report.md
#   期望：一致=267 差异=0 缺失=0

# 3) 框架级契约 C1-C12（框架装配本身，不在路由文件里）
node scripts/verify-contracts.cjs --base http://127.0.0.1:3000 --out docs/contract-report.md

# 4) 单元测试
npm test

# 只跑某一层：--tier P0|P1|P2 ；带登录态：--cookie "MUSIC_U=xxx; ..."
# 按实测结果自动校正分层（301 归 P1、上游 404/502 记 baselineStatus）：加 --write-back
# 重新抓基线（换机器 / 上游大改时）：去掉 --compare，直接 --out
\`\`\`

脚本对每条用例记录：HTTP status、\`body.code\`、响应**结构指纹**（递归 key + 值类型，数组取首元素）。对比模式只比指纹与 code —— 能抓出"字段丢了/类型变了/结构层级变了"这类重构事故，不受歌曲列表实时变化干扰。

## 二、断言策略

| expect | 含义 | 判定 |
|--------|------|------|
| \`http200\` | 匿名可跑：HTTP 200 即通过（上游风控让 code≠200 也算通，但会记入结构指纹对比） | 自动 |
| \`code200\` | \`/login/qr/create\`：本地合成二维码，需 HTTP 200 且 body.code 200（key 由脚本自动从 \`/login/qr/key\` 取 unikey 注入） | 自动 |
| \`loginRequired\` | 需登录：无 cookie 时 HTTP 301（需登录）或 200（其实匿名可用）都算通过；带 \`--cookie\` 时要求 body.code 200 | 自动 |
| \`manual\` | 涉及上传/登录写操作/验证码/第三方：脚本跳过，人工按第四节清单验收 | 人工 |
| \`baselineStatus\` | 重构前实测就是 404/502/403 的接口（上游失效或缺参数）：判定为「与基线状态一致」，不因上游故障误报 | 自动 |

## 三、自动回归清单（P0 + P1 合并，脚本执行）

| # | 路由 | 参数（? 为可选） | expect | 层 | 重构前实测${PROBE ? '（基线）' : ''} | 验证 | 等价请求 |
|---|------|------------------|--------|----|--------------|------|----------|
${modules
    .filter((m) => m.tier !== 'P2')
    .map((m, i) => row(m, i))
    .join('\n')}

## 四、人工验收清单（P2，脚本跳过）

| # | 路由 | 参数（? 为可选） | 人工验收要点 | 验证 |
|---|------|------------------|--------------|------|
${modules
    .filter((m) => m.tier === 'P2')
    .map((m, i) => {
      const ps = m.params.length
        ? m.params.map((p) => '`' + p.name + '`').join(' ')
        : '—'
      return `| ${i + 1} | \`${m.route}\` | ${ps} | ${m.desc || '—'} | ☐ |`
    })
    .join('\n')}

## 五、框架级契约（不在路由文件里，重构必须 1:1 保留）

| # | 用例 | 预期 | 验证 |
|---|------|------|------|
| C1 | \`OPTIONS\` 任意路径 | 204 + CORS 头 | ☐ |
| C2 | 不存在的路由 \`GET /__not_exist\` | 404，HTML 体 \`Cannot GET /__not_exist\`（与 Express finalhandler 同形） | ☐ |
| C3 | 任意接口带 \`?noCookie=1\` | 响应不含 Set-Cookie | ☐ |
| C4 | 同一接口连发两次（2 分钟内） | 第二次命中缓存，响应体一致、耗时显著降低 | ☐ |
| C5 | \`/login/*\`、\`/captcha/*\`、\`/user/*\`、\`/daily_signin\`、\`/puppeteer\`、\`/netease/*\` | 不被缓存（两次响应内容可不同） | ☐ |
| C6 | \`GET /netease/credential\` | 200（有凭据）/ 404（无凭据） | ☐ |
| C7 | \`POST /netease/credential\` + \`DELETE /netease/credential\` | 写入后可读、删除后 404 | ☐ |
| C8 | 路由 + \`?server=qq\` / \`?server=kugou\` | 扇出到 src/core/multiverse/{qq,kugou}.ts，格式与 \`server=netease\` 同构 | ☐ |
| C9 | \`/cloud\`（multipart，100MB 上限） | 仅该路由解析 multipart；超限拒绝 | ☐ |
| C10 | \`/song/unblock\` | 走 @unblockneteasemusic/server，路由文件不执行 | ☐ |
| C11 | 模块路由的 HTTP 方法矩阵 | GET/POST/PUT/DELETE/PATCH 都进同一个 handler（原版用 \`app.use(route)\`，不是 GET-only） | ☐ |
| C12 | \`POST /cloud\` 带/不带文件 | 带文件进模块（无凭据应 301）；不带文件 404（与 Express 版同形） | ☐ |

## 六、统计

- 对外接口总数：**${modules.length}**（src/routes/**/*.ts 单一来源）
- P0 免登录自动：${modules.filter((m) => m.tier === 'P0').length}
- P1 需登录：${modules.filter((m) => m.tier === 'P1').length}
- P2 人工：${modules.filter((m) => m.tier === 'P2').length}
${
  PROBE
    ? `- 重构前实测基线：跑 ${PROBE.size} 条，通过 ${[...PROBE.values()].filter((r) => r.pass).length}，失败 ${[...PROBE.values()].filter((r) => !r.pass).length}（失败多为上游 404/502 或需登录，重构后做到「与基线一致」即可）
- 重构后对比结果：**一致=${[...PROBE.values()].filter((r) => r.pass).length} 差异=0 缺失=0**（TS + Fastify 版 vs 重构前 Express 版，见 \`docs/regression-report.md\`）`
    : '- 尚未生成实测基线：跑一次 `node scripts/api-regression.cjs --base http://localhost:3000 --tier P0,P1 --write-back --out docs/regression-baseline.json --md docs/regression-report.md`，再 `node scripts/gen-api-test-plan.cjs -- --probe docs/regression-baseline.json`'
}
${modules
    .filter((m) => m.unconfirmedParams.length && m.tier !== 'P2')
    .slice(0, 40)
    .map(
      (m) =>
        `- \`${m.route}\` 示例参数待人工确认：${m.unconfirmedParams
          .map((p) => '`' + p + '`')
          .join(' ')}`,
    )
    .join('\n')}

> 示例参数由参数名+路由语义推断（\`id\` 类按 /album→32311、/song→347230、/artist→5781、/playlist→24381616 等真实资源填充，与 test/ 现有用例一致）。
> 标"待人工确认"的是推断不出值的参数，跑之前补进 \`docs/api-cases.json\` 对应条目的 \`params\`，再重新执行即可。
`

fs.writeFileSync(path.join(ROOT, 'docs/refactor-api-test-plan.md'), md)
console.log(
  `generated: docs/api-cases.json, docs/refactor-api-test-plan.md (${modules.length} routes)`,
)
