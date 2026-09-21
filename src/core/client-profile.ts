// 部署级设备身份 + 账号指纹。原 util/client-profile.js 直译。
import crypto from 'node:crypto'

import config from './config.json'
import type { CookieJar } from '../types'

const { device = {} as Record<string, any> } = config as Record<string, any>

const derived = (label: string): string =>
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
export const DEVICE = Object.freeze({
  userAgent: device.userAgent || '',
  ntesNuid: device.ntesNuid || derived('ntes_nuid'),
  nmtid: device.nmtid || derived('NMTID'),
  // 账号层开关。Cookie 里缺 os 时，网易云的 /nuser/account/get、/w/nuser/account/get
  // 一律返回 `account:null, profile:null`（等价「未登录」），/user/subcount、/vip/info、
  // /playlist/mylike 之类更直接回 `code:301 需要登录` —— 与风控无关，纯粹是字段缺失。
  // 它和 userAgent/NMTID 一样是部署级设备身份，故收敛到这里统一补齐。
  // 取值须与 userAgent 自洽：本部署用 PC 端 UA，因此默认 pc。
  os: device.os || 'pc',
  // 默认不伪造来源 IP：两条链路都让网易云看到同一出口 IP，比互相矛盾的假值更干净
  forwardRealIp: device.forwardRealIp === true,
})

// 决定账号归属的凭据。其余 cookie（NMTID/_ntes_nuid/__remember_me）随请求波动，
// 纳入身份会让同一账号分裂、纳入缓存键会让缓存永久失效。
const CREDENTIAL_KEYS = ['MUSIC_U', 'MUSIC_A']

/** 账号指纹：同登录态恒定，不同账号与匿名态互相隔离 */
export const accountFingerprint = (jar: CookieJar = {}): string => {
  const credentials = CREDENTIAL_KEYS.map((key) => jar[key] || '')
  if (!credentials.some(Boolean)) return 'anonymous'
  return crypto
    .createHash('sha256')
    .update(credentials.join('\u0000'))
    .digest('hex')
    .slice(0, 16)
}
