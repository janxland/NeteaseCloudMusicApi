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

module.exports = { DEVICE, accountFingerprint }
