/**
 * 机械验证：站主凭据只能按白名单、按门禁、按配额流向 /scrobble。
 *
 * 这块改动把「可写站主账号」的凭据使用面从 1 条路径扩到 2 条，所以断言全部围绕
 * 三条不变量：①白名单外与自带凭据的请求绝不碰站主 cookie；②非本站页面发起的绝不注入
 * 凭据（但接口本身照旧匿名放行，不因为这次改动变成默认拒绝）；③真注入时受每 IP 配额约束。
 * 被挡下注入的路径不出网，因此本地可整跑，无需真实凭据。
 *
 * 运行：npm run verify:scrobble
 */
import assert from 'node:assert'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

// 必须在任何 src 导入之前落定：credential-store 在模块初始化时就固化 FILE
const credFile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'ncm-owner-')), 'cred.json')
process.env.CREDENTIAL_FILE = credFile
fs.writeFileSync(credFile, JSON.stringify({ cookie: 'MUSIC_U=FAKEOWNERSESSION; os=pc', uid: 1 }))

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { ownerVerdict, OWNER_SELF_ROUTES } = require('../src/core/owner-routes')
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { shouldCache } = require('../src/core/cache')

const main = () => {
  let pass = 0
  const ok = (label: string) => {
    console.log(`  ✓ ${label}`)
    pass++
  }
  const req = (ip: string, headers: Record<string, string> = {}) => ({ ip, headers })
  const ROUTE = '/scrobble'
  /** 真实线上形态：本站页面发的同源请求。站内 meta 关了 Referer，所以它是空的 */
  const ownPage = (ip: string) =>
    req(ip, { 'sec-fetch-site': 'same-origin', host: 'www.roginx.ink' })

  console.log('=== A) 白名单与调用方凭据优先 ===')
  assert.deepEqual(ownerVerdict(ownPage('9.9.9.1'), '/song/url', false), { action: 'skip' })
  ok('白名单外路由一律 skip（连凭据文件都不读）')
  assert.deepEqual(ownerVerdict(ownPage('9.9.9.2'), ROUTE, true), { action: 'skip' })
  ok('调用方自带 MUSIC_U 时以它为准，绝不覆盖成站主身份')
  assert.ok(OWNER_SELF_ROUTES[ROUTE], '/scrobble 在白名单内')
  assert.strictEqual(Object.keys(OWNER_SELF_ROUTES).length, 1)
  ok('/scrobble 是白名单里唯一一条')

  console.log('=== B) 页面来源门禁 ===')
  // 不可信来源只有一条后果：拿不到站主凭据。请求本身照旧走匿名 —— /scrobble 改造前
  // 就对脚本直连开放，门禁不把它变成默认拒绝。
  const untrusted: [string, Record<string, string>][] = [
    // 站外页面跨站直连（Sec-Fetch-Site 由浏览器给出，伪造不了）
    ['站外页面跨站', { 'sec-fetch-site': 'cross-site', origin: 'https://evil.example.com' }],
    // 浏览器里手开 URL / 非 fetch 上下文
    ['手动开 URL', { 'sec-fetch-site': 'none' }],
    // 同站但主机不是白名单上那台（拼接域名白嫖）
    ['拼接域名', { 'sec-fetch-site': 'same-site', origin: 'https://evil.roginx.ink.attacker.com' }],
    // 2026-09-30 事故：同一后端还反代着 music（YesPlayMusic），它的播放器替每个匿名
    // 访客切歌上报，同源判据本身分不出「是哪一台前端」—— 必须连 Host 一起看
    ['同后端第二个前端（同源分支）', { 'sec-fetch-site': 'same-origin', host: 'music.roginx.ink' }],
    ['同后端第二个前端（同站分支）', { 'sec-fetch-site': 'same-site', origin: 'https://music.roginx.ink' }],
    // 第三方把本 API 自建到自己域名下，页面调用同样是 same-origin
    ['第三方自建同源直连', { 'sec-fetch-site': 'same-origin', host: 'api.attacker.com' }],
    // 老浏览器：没有 Sec-Fetch-Site，只能看 Origin/Referer —— 两个都没有（curl 直连）
    ['curl 直连（无任何来源头）', {}],
    ['老浏览器 + 站外 Referer', { referer: 'https://evil.example.com/scrobble' }],
  ]
  untrusted.forEach(([label, headers], i) => {
    const v = ownerVerdict(req(`8.8.8.${i}`, headers), ROUTE, false)
    assert.strictEqual(v.action, 'skip', `不可信来源不该被封锁，但绝不注入：${label}`)
    assert.ok(!('cookie' in v), `不可信来源的裁决里绝不能带凭据：${label}`)
  })
  ok('八种不可信来源一律不注入凭据，且原样放行（接口未被封锁）')

  const allowed: [string, Record<string, string>][] = [
    ['同源（本站播放器，无 Referer）', { 'sec-fetch-site': 'same-origin', host: 'www.roginx.ink' }],
    ['同源带端口（本地起的服务）', { 'sec-fetch-site': 'same-origin', host: 'localhost:3000' }],
    ['老浏览器 + 本站 Referer', { referer: 'https://www.roginx.ink/library' }],
    ['本地开发（vite 代理）', { referer: 'http://localhost:9001/' }],
  ]
  allowed.forEach(([label, headers], i) => {
    const v = ownerVerdict(req(`7.7.7.${i}`, headers), ROUTE, false)
    if (v.action !== 'inject') throw new Error(`应放行：${label} → ${JSON.stringify(v)}`)
    assert.strictEqual(v.cookie.MUSIC_U, 'FAKEOWNERSESSION')
  })
  ok('四种真实来源全部注入落盘那份凭据')

  console.log('=== C) 每 IP 配额（10s 最短间隔 / 120 每小时）===')
  const throttled = ownerVerdict(ownPage('6.6.6.6'), ROUTE, false)
  assert.strictEqual(throttled.action, 'inject')
  const second = ownerVerdict(ownPage('6.6.6.6'), ROUTE, false)
  if (second.action !== 'reject') throw new Error('同 IP 连报第二次应被限频')
  assert.strictEqual(second.status, 429)
  assert.ok(!('cookie' in second), '被限频时绝不能把凭据发出去')
  ok('同 IP 连报第二次即被 429 挡下')
  assert.strictEqual(ownerVerdict(ownPage('6.6.6.7'), ROUTE, false).action, 'inject')
  ok('换一个 IP 不受上一个 IP 的冷却影响')

  console.log('=== D) 上报不许进响应缓存 ===')
  // 匿名访客共用一个缓存桶：一旦可缓存，TTL 内的第二次上报会直接命中、根本不出网
  assert.strictEqual(shouldCache(ROUTE, 200), false)
  assert.strictEqual(shouldCache('/playlist/detail', 200), true)
  ok('/scrobble 旁路缓存，其余只读路由不受影响')

  console.log(`\n全部通过：${pass} 项`)
}

main()
