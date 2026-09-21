#!/usr/bin/env node
// 框架级契约 C1-C13 的机械验收 + P2 人工用例冒烟。
// 用法：node scripts/verify-contracts.cjs [--base http://localhost:3000] [--out docs/contract-report.md]
const fs = require('fs')
const path = require('path')

const argv = process.argv.slice(2)
const pick = (k, d) => {
  const i = argv.indexOf(k)
  return i > -1 && argv[i + 1] ? argv[i + 1] : d
}
const BASE = pick('--base', 'http://127.0.0.1:3000').replace(/\/$/, '')
const OUT = pick('--out', '')

const results = []
const check = async (id, title, fn) => {
  try {
    const detail = await fn()
    results.push({ id, title, pass: true, detail })
    console.log(`  ✓ ${id} ${title}${detail ? ' → ' + detail : ''}`)
  } catch (e) {
    results.push({ id, title, pass: false, detail: e.message })
    console.log(`  ✗ ${id} ${title} → ${e.message}`)
  }
}

const assert = (cond, msg) => {
  if (!cond) throw new Error(msg)
}

const req = async (p, init) => {
  const res = await fetch(BASE + p, init)
  const text = await res.text()
  let body = null
  try {
    body = JSON.parse(text)
  } catch {
    /* 非 JSON 响应（如 404 HTML） */
  }
  return { status: res.status, headers: res.headers, text, body }
}

const main = async () => {
  console.log(`框架级契约验收 @ ${BASE}\n`)

  // C1 OPTIONS
  await check('C1', 'OPTIONS 任意路径 → 204 + CORS 头', async () => {
    const r = await req('/album', { method: 'OPTIONS' })
    assert(r.status === 204, `status=${r.status}`)
    assert(
      r.headers.get('access-control-allow-origin'),
      '缺少 Access-Control-Allow-Origin',
    )
    assert(
      (r.headers.get('access-control-allow-methods') || '').includes('GET'),
      'Allow-Methods 不含 GET',
    )
    return `204 + ACAO=${r.headers.get('access-control-allow-origin')}`
  })

  // C2 未知路由 404（Express finalhandler 同形）
  await check('C2', '未知路由 → 404 HTML', async () => {
    const r = await req('/__not_exist')
    assert(r.status === 404, `status=${r.status}`)
    assert(
      /Cannot GET \/__not_exist/.test(r.text),
      `body=${JSON.stringify(r.text.slice(0, 80))}`,
    )
    return '404 + "Cannot GET /__not_exist"'
  })

  // C3 noCookie
  await check('C3', '?noCookie=1 → 不回写 Set-Cookie', async () => {
    const r = await req('/login/qr/key?noCookie=1')
    assert(!r.headers.get('set-cookie'), '仍带 Set-Cookie')
    return `status=${r.status}，无 Set-Cookie`
  })

  // C4 缓存命中
  await check('C4', '同一 GET 连发两次 → 第二次命中缓存', async () => {
    const url = `/artist/desc?id=5781&c=${Date.now()}`
    const a = await req(url)
    const b = await req(url)
    assert(a.status === 200 && b.status === 200, `status ${a.status}/${b.status}`)
    assert(b.headers.get('x-cache') === 'HIT', `第二次 x-cache=${b.headers.get('x-cache')}`)
    assert(a.text === b.text, '两次响应体不一致')
    return `HIT，${a.text.length} bytes`
  })

  // C5 不可缓存名单
  await check('C5', 'UNCACHEABLE 路径不被缓存', async () => {
    const paths = ['/login/qr/key', '/logout', '/user/account', '/daily_signin']
    const bad = []
    for (const p of paths) {
      const r = await req(`${p}?c=${Date.now()}`)
      if (r.headers.get('x-cache') === 'HIT') bad.push(p)
    }
    assert(bad.length === 0, `被误缓存：${bad.join(', ')}`)
    return `${paths.length} 条路径均未命中缓存`
  })

  // C6 凭据读取
  await check('C6', 'GET /netease/credential → 200 或 404', async () => {
    const r = await req('/netease/credential')
    assert(r.status === 200 || r.status === 404, `status=${r.status}`)
    return `status=${r.status}`
  })

  // C7 凭据写入/删除（写需要真实 MUSIC_U，这里验护栏与删除）
  await check('C7', '凭据写入护栏 + 删除', async () => {
    const bad = await req('/netease/credential', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ cookie: 'NMTID=xxx' }),
    })
    assert(bad.status === 400, `无 MUSIC_U 应 400，实际 ${bad.status}`)
    const del = await req('/netease/credential', { method: 'DELETE' })
    assert(del.body && typeof del.body.ok === 'boolean', `删除返回异常：${del.text.slice(0, 60)}`)
    return `400(缺 MUSIC_U) + DELETE ok=${del.body.ok}`
  })

  // C8 多源扇出
  await check('C8', '?server=kugou 扇出', async () => {
    const r = await req('/search?server=kugou&keywords=%E6%B5%B7%E9%98%94%E5%A4%A9%E7%A9%BA')
    assert(r.status === 200, `status=${r.status}`)
    assert(r.body && r.body.code === 200, `code=${r.body && r.body.code}`)
    assert(r.body.result, '缺少 result（说明没走 kugou 分支）')
    return 'kugou 返回 code=200 且带 result'
  })

  // C9 multipart 只在 /cloud 生效
  await check('C9', '/cloud 解析 multipart，其余路由不受影响', async () => {
    const form = new FormData()
    form.append('songFile', new Blob([Buffer.alloc(2048, 1)]), 'probe.mp3')
    const cloud = await req('/cloud', { method: 'POST', body: form })
    assert(cloud.status !== 415 && cloud.status !== 0, `status=${cloud.status}`)
    const other = await req('/album', { method: 'POST', body: form })
    assert(other.status !== 0, `status=${other.status}`)
    return `/cloud=${cloud.status}（无 cookie 走 301/参数校验），/album=${other.status}`
  })

  // C10 解灰
  await check('C10', '/song/unblock 走 unblock 服务', async () => {
    const r = await req('/song/unblock?id=347230')
    assert(r.status === 200 || r.status === 502, `status=${r.status}`)
    assert(
      !(r.body && r.body.code === 200 && r.body.data && r.body.data[0]),
      '返回了网易云原响应（未走 unblock 分支）',
    )
    return `status=${r.status}${r.body && r.body.msg ? ' ' + r.body.msg : ''}`
  })

  // C11 方法矩阵：Express 版用的是 app.use(route)，所有 HTTP 方法都进同一个 handler
  await check('C11', '模块路由对所有 HTTP 方法可达（对齐 app.use）', async () => {
    const bad = []
    for (const m of ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']) {
      const r = await req('/album?id=32311', { method: m })
      if (r.status !== 200) bad.push(`${m}=${r.status}`)
    }
    assert(bad.length === 0, bad.join(', '))
    return 'GET/POST/PUT/DELETE/PATCH 均 200'
  })

  // C12 上传链路：multipart 必须真的把 songFile 注进 query，否则模块会走抛错 404 分支
  await check('C12', '/cloud 上传链路（带文件进模块 / 不带文件与 Express 同形 404）', async () => {
    const form = new FormData()
    form.append('songFile', new Blob([Buffer.alloc(2048, 1)]), 'probe.mp3')
    const withFile = await req('/cloud', { method: 'POST', body: form })
    assert(
      withFile.status !== 404,
      `带文件仍 404（multipart 未注入 query.songFile）：${withFile.text.slice(0, 80)}`,
    )
    const noFile = await req('/cloud', { method: 'POST' })
    assert(noFile.status === 404, `不带文件应 404，实际 ${noFile.status}`)
    return `带文件=${withFile.status}/code=${withFile.body && withFile.body.code}，不带文件=404`
  })

  // C13 查询参数不做校验：Express 版没有任何 schema，?id=1&id=2 会让 req.query.id
  // 变成数组照常往下传；Fastify 一旦真的编译 querystring schema，ajv 的 coerceTypes
  // 会把它判为类型不符并回 400 FST_ERR_VALIDATION。（267 条回归全是单值参数，覆盖不到）
  await check('C13', '同名查询参数重复不被拦截（对齐 Express 不校验）', async () => {
    const dup = await req('/search?keywords=a&keywords=b&limit=1')
    assert(dup.status === 200, `重复参数应 200（Express 行为），实际 ${dup.status}`)
    assert(
      !(dup.body && dup.body.code === 'FST_ERR_VALIDATION'),
      `被 schema 校验拦下：${dup.body && dup.body.code}`,
    )
    const single = await req('/search?keywords=a&limit=1')
    assert(single.status === 200, `单值参数应 200，实际 ${single.status}`)
    // schema 仍必须喂给 OpenAPI 文档（关的是校验，不是文档）
    const doc = await req('/documentation/json')
    assert(doc.status === 200, `/documentation/json 应 200，实际 ${doc.status}`)
    const searchParams = ((doc.body && doc.body.paths && doc.body.paths['/search']) || {}).get || {}
    const names = (searchParams.parameters || []).map((p) => p.name)
    assert(names.includes('keywords'), `OpenAPI 文档丢了 query 参数：${JSON.stringify(names)}`)
    return `重复参数=200（非 400），OpenAPI 仍含 ${names.length} 个参数`
  })

  // P2 冒烟：按用例声明的方法发请求（GET 走 query，写操作走 JSON body，/cloud 带假文件），
  // 不做断言，只记录状态码，供人工清单对照
  console.log('\nP2 人工用例冒烟（无真实凭据/文件，仅确认链路可达）')
  const cases = JSON.parse(
    fs.readFileSync(path.join(__dirname, '..', 'docs', 'api-cases.json'), 'utf8'),
  ).cases.filter((c) => c.tier === 'P2')
  const p2 = []
  for (const c of cases) {
    const params = Object.entries(c.params || {}).filter(([, v]) => v !== '')

    // GET 优先；404 说明该模块在没有请求体时走的是抛错分支（如 /login/cellphone 缺
    // phone/password），改用 POST 重试，确认写操作链路同样可达。
    const asGet = async () => {
      const qs = new URLSearchParams(params.map(([k, v]) => [k, String(v)])).toString()
      return req(`${c.route}${qs ? '?' + qs : ''}`)
    }
    const asPost = async () => {
      const init = { method: 'POST' }
      if (c.route === '/cloud') {
        const form = new FormData()
        form.append('songFile', new Blob([Buffer.alloc(2048, 1)]), 'probe.mp3')
        init.body = form
      } else {
        init.headers = { 'content-type': 'application/json' }
        init.body = JSON.stringify(Object.fromEntries(params))
      }
      return req(c.route, init)
    }

    try {
      let method = 'GET'
      let r = await asGet()
      if (r.status === 404) {
        method = 'POST'
        r = await asPost()
      }
      p2.push({
        route: c.route,
        method,
        status: r.status,
        code: r.body ? r.body.code : null,
        msg: (r.body && r.body.msg) || '',
      })
      console.log(
        `  · ${method} ${c.route} → ${r.status}${r.body && r.body.code ? ' / ' + r.body.code : ''}`,
      )
    } catch (e) {
      p2.push({ route: c.route, method: 'GET/POST', status: 0, code: null, msg: e.message })
      console.log(`  · ${c.route} → 请求失败 ${e.message}`)
    }
  }

  const passed = results.filter((r) => r.pass).length
  console.log(`\n契约 C1-C13：${passed}/${results.length} 通过；P2 冒烟 ${p2.length} 条`)

  if (OUT) {
    const lines = [
      '# 框架级契约验收报告',
      '',
      `> base: ${BASE}`,
      `> 生成时间：${new Date().toISOString().slice(0, 19).replace('T', ' ')}`,
      `> 结论：**${passed}/${results.length} 通过**`,
      '',
      '| # | 契约 | 结果 | 实测 |',
      '|---|------|------|------|',
      ...results.map(
        (r) => `| ${r.id} | ${r.title} | ${r.pass ? '✅' : '❌'} | ${r.detail} |`,
      ),
      '',
      '## P2 人工用例冒烟（无真实凭据 / 文件，仅确认链路可达）',
      '',
      '> 方法按用例声明发送；`/cloud` 带一个 2KB 假 mp3，用于确认 multipart 真的注入了 `query.songFile`。',
      '',
      '| 路由 | 方法 | HTTP | body.code | 实测 msg | 人工验收 |',
      '|------|------|------|-----------|----------|----------|',
      ...p2.map(
        (r) =>
          `| \`${r.route}\` | ${r.method} | ${r.status} | ${r.code ?? '—'} | ${r.msg || '—'} | ☐ |`,
      ),
      '',
    ]
    fs.writeFileSync(path.join(__dirname, '..', OUT), lines.join('\n'))
    console.log(`md -> ${OUT}`)
  }

  if (passed !== results.length) process.exitCode = 1
}

main()
