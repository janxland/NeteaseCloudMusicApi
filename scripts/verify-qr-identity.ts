/**
 * 机械验证：证明「身份固定」与「cookie 通道」可以并存。
 *
 * 上一版改动只做了 node --check（仅验语法），漏掉了运行期引用，
 * 结果把线上打成全站 404。这里改为真实拦截出站请求做断言。
 *
 * 运行：npx tsx scripts/verify-qr-identity.ts
 */
import http from 'node:http'
import assert from 'node:assert'

import { DEVICE } from '../src/core/client-profile'
import { upstream } from '../src/core/upstream'
import checkModule from '../src/routes/login/qr/check'
import keyModule from '../src/routes/login/qr/key'
import historyModule from '../src/routes/user/comment/history'

let captured: any = null
const server = http.createServer((req, res) => {
  captured = {
    cookie: req.headers.cookie || '',
    ua: req.headers['user-agent'],
    realIp: req.headers['x-real-ip'] || null,
  }
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify({ code: 801, message: '等待扫码' }))
})

const parseCookie = (s: string): Record<string, string> =>
  Object.fromEntries(
    s
      .split('; ')
      .filter(Boolean)
      .map((p) => {
        const i = p.indexOf('=')
        return [decodeURIComponent(p.slice(0, i)), decodeURIComponent(p.slice(i + 1))]
      }),
  )

let pass = 0
const ok = (label: string) => {
  console.log(`  ✓ ${label}`)
  pass++
}

const fake = (body: any, cookie: string[] = []) =>
  Promise.resolve({ status: 200, body, cookie }) as any

server.listen(0, '127.0.0.1', async () => {
  const url = `http://127.0.0.1:${(server.address() as any).port}/echo`
  try {
    console.log('=== A) 真实出站请求的 Cookie / UA / IP 组装 ===')

    // 模拟"被污染的浏览器 jar"：会话 cookie + 残留凭证 + 伪造的设备身份
    await (upstream as any)('POST', url, {}, {
      cookie: {
        __csrf: 'csrf-abc',
        MUSIC_U: 'stale-user-token',
        _ntes_nuid: 'attacker-supplied',
        NMTID: 'attacker-supplied',
      },
    })
    const c = parseCookie(captured.cookie)

    assert.strictEqual(c.__csrf, 'csrf-abc', '会话 cookie 必须原样带入（802→803 靠它延续）')
    ok('会话 cookie __csrf 原样带入 → 状态机得以延续')

    assert.strictEqual(c.MUSIC_U, 'stale-user-token', '凭证不应被静默改写')
    ok('客户端凭证原样带入（不叠加猜测性过滤）')

    assert.strictEqual(c._ntes_nuid, DEVICE.ntesNuid, '_ntes_nuid 必须被部署级常量覆盖')
    assert.notStrictEqual(c._ntes_nuid, 'attacker-supplied')
    ok('_ntes_nuid 被覆盖为部署级常量 → 身份不再逐请求漂移')

    assert.strictEqual(c.NMTID, DEVICE.nmtid, 'NMTID 必须被部署级常量覆盖')
    ok('NMTID 被覆盖为部署级常量')

    assert.strictEqual(c.__remember_me, 'true')
    ok('__remember_me 已注入')

    assert.strictEqual(captured.ua, DEVICE.userAgent, 'UA 必须是固定值')
    ok('UA 固定（不再从 15 个里随机）')

    assert.strictEqual(captured.realIp, null, '默认不得伪造 X-Real-IP')
    ok('默认不伪造 X-Real-IP → 两条链路对网易云呈现同一出口 IP')

    console.log('\n=== B) 匿名态回落 ===')
    await (upstream as any)('POST', url, {}, { cookie: {} })
    const anon = parseCookie(captured.cookie)
    assert.ok(anon.MUSIC_A && anon.MUSIC_A.length > 10, '无凭证时应回落部署级 anonymous_token')
    assert.strictEqual(anon._ntes_nuid, DEVICE.ntesNuid)
    ok('游客令牌回落到部署级 anonymous_token（不取客户端传来的）')

    console.log('\n=== C) 扫码模块确实走 cookie 通道 ===')
    let opts: any = null
    await (checkModule as any)({ key: 'K1', cookie: { __csrf: 'abc' } }, (_m: any, _u: any, _d: any, o: any) => {
      opts = o
      return fake({ code: 801 })
    })
    assert.deepStrictEqual(opts.cookie, { __csrf: 'abc' }, 'check 必须把客户端 cookie 透传给 request')
    ok('login/qr/check 透传 query.cookie（不再用固定 DEVICE_COOKIE 切断会话）')

    let opts2: any = null
    await (keyModule as any)({ cookie: { __csrf: 'xyz' } }, (_m: any, _u: any, _d: any, o: any) => {
      opts2 = o
      return fake({ code: 200, unikey: 'u1' })
    })
    assert.deepStrictEqual(opts2.cookie, { __csrf: 'xyz' })
    ok('login/qr/key 透传 query.cookie')

    console.log('\n=== D) 803 的 cookie 串必须能被前端 setCookies 还原 ===')
    const r803: any = await (checkModule as any)(
      { key: 'K' },
      () => fake({ code: 803, message: '授权登录成功' }, ['MUSIC_U=token-u', '__csrf=token-c']),
    )
    assert.strictEqual(r803.body.cookie, 'MUSIC_U=token-u;;__csrf=token-c')
    ok("803 以 ';;' 拼接 → 前端 split(';;') 逐条落盘，MUSIC_U 不会丢")

    console.log('\n=== E) 轮询异常不得炸成 404 ===')
    const rErr: any = await (checkModule as any)({ key: 'K' }, () =>
      Promise.reject(Object.assign(new Error('risk'), { body: { code: -462 }, cookie: [] })),
    )
    assert.strictEqual(rErr.status, 200)
    assert.strictEqual(rErr.body.code, -462)
    ok('异常被兜底为 200 + 原始 code（前端不依赖异常分支）')

    console.log('\n=== F) os 字段：账号层开关必须对带凭据的请求补齐 ===')
    await (upstream as any)('POST', url, {}, { cookie: { MUSIC_U: 'valid-token' } })
    const withCred = parseCookie(captured.cookie)
    assert.strictEqual(withCred.os, DEVICE.os, '带凭据的请求必须补上 os，否则账号域接口全判未登录')
    ok(`带凭据请求自动补 os=${DEVICE.os} → /user/account、/user/subcount 等恢复`)

    await (upstream as any)('POST', url, {}, { cookie: { MUSIC_U: 'valid-token', os: 'ios' } })
    assert.strictEqual(parseCookie(captured.cookie).os, 'ios', '调用方显式指定的 os 不得被覆盖')
    ok('调用方显式 os 优先（user/comment/history 的 os=ios 不被改坏）')

    await (upstream as any)('POST', url, {}, { cookie: {} })
    const guest = parseCookie(captured.cookie)
    assert.strictEqual(guest.os, undefined, '匿名态不得注入 os')
    assert.ok(guest.MUSIC_A, '匿名态仍走 anonymous_token')
    ok('匿名态不注入 os（不改变原有身份语义）')

    let historyOpts: any = null
    await (historyModule as any)({ uid: '1', cookie: {} }, (_m: any, _u: any, _d: any, o: any) => {
      historyOpts = o
      return fake({ code: 200 })
    })
    assert.strictEqual(historyOpts.cookie.os, 'ios')
    ok('user/comment/history 自带 os=ios 保持不变')

    console.log(`\n########## 机械验证: ${pass} 项全部通过 ##########`)
  } catch (e: any) {
    console.error('\n✗ 断言失败:', e.message)
    process.exitCode = 1
  } finally {
    server.close()
  }
})
