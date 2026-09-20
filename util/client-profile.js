const crypto = require('crypto')
const config = require('./config.json')

const { device = {} } = config

const derived = (label) =>
  crypto
    .createHash('sha256')
    .update(`${label}\u0000${config.anonymous_token || 'ncm-api'}`)
    .digest('hex')
    .slice(0, 32)

/**
 * 设备身份的唯一来源。
 *
 * 网易云以 (nuid, NMTID, UA) 判定"同一台设备"。上游每请求重新随机这组值，
 * 等于告诉网易云同一份 cookie 正被大量设备轮换 —— 这是本链路唯一真正的
 * 风控触发点，而非 cookie 被几个页面共用。
 *
 * 故固定为部署级常量：集群多 worker 必须共享同一身份，因此只允许来自
 * config 或确定性派生，禁止 Math.random 与每请求随机。
 */
const DEVICE = Object.freeze({
  userAgent: device.userAgent || '',
  ntesNuid: device.ntesNuid || derived('ntes_nuid'),
  nmtid: device.nmtid || derived('NMTID'),
  // 默认不伪造来源 IP：两条链路都让网易云看到同一出口 IP，比互相矛盾的假值更干净
  forwardRealIp: device.forwardRealIp === true,
})

/**
 * 扫码链路的固定身份。
 *
 * 扫码只需要 key，但网易云对这两个接口同样逐请求校验设备与游客令牌：客户端
 * jar 里只要残留一个失效的 MUSIC_A，整条链路立刻被判风控（-462 验证挑战 /
 * 502），而轮询端并无分支可处理，于是永久停在"待确认"。故扫码链路不接入
 * 浏览器 cookie 通道，只使用这组部署级常量（anonymous_token 由 request
 * 统一回落到部署级值，不会取客户端传来的）。
 */
const DEVICE_COOKIE = Object.freeze({
  __remember_me: 'true',
  NMTID: DEVICE.nmtid,
  _ntes_nuid: DEVICE.ntesNuid,
})

// 决定账号归属的凭据。其余 cookie（NMTID/_ntes_nuid/__remember_me）随请求波动，
// 纳入身份会让同一账号分裂、纳入缓存键会让缓存永久失效。
const CREDENTIAL_KEYS = ['MUSIC_U', 'MUSIC_A']

/** 账号指纹：同登录态恒定，不同账号与匿名态互相隔离 */
const accountFingerprint = (jar = {}) => {
  const credentials = CREDENTIAL_KEYS.map((key) => jar[key] || '')
  if (!credentials.some(Boolean)) return 'anonymous'
  return crypto
    .createHash('sha256')
    .update(credentials.join('\u0000'))
    .digest('hex')
    .slice(0, 16)
}

module.exports = { DEVICE, DEVICE_COOKIE, accountFingerprint }
