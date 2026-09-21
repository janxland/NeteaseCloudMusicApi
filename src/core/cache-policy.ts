// 缓存准入：哪些路径绝不能进缓存。原 util/cache-policy.js 直译。
import { accountFingerprint } from './client-profile'
import type { CookieJar } from '../types'

// 登录态流转与账号私有数据：缓存会把扫码状态机卡死在"等待扫码"，
// 或把 A 的登录态响应交给 B（apicache 的 key 原本不含 Cookie）。
const UNCACHEABLE: RegExp[] = [
  /^\/login(\/|$)/,
  /^\/logout(\/|$)/,
  /^\/captcha_/,
  /^\/user\//,
  /^\/daily_signin/,
  /^\/puppeteer/,
  // 凭据读写必须实时：缓存会让「刚粘贴的 cookie」延迟生效，
  // 也会让 DELETE 清空后仍读到旧凭据
  /^\/netease\//,
]

/** 仅 200 且不在 UNCACHEABLE 名单内才可缓存 */
export const cachePolicy = (path: string, statusCode: number): boolean =>
  statusCode === 200 && !UNCACHEABLE.some((rule) => rule.test(path))

/** 按账号分桶：同路径不同登录态落到不同 key，匿名态共用一份 */
export const cacheKeyOf = (cookies: CookieJar): string => accountFingerprint(cookies)

export default { cachePolicy, cacheKeyOf }
