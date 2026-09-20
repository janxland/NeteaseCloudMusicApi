const { accountFingerprint } = require('./client-profile')

// 登录态流转与账号私有数据：缓存会把扫码状态机卡死在"等待扫码"，
// 或把 A 的登录态响应交给 B（apicache 的 key 原本不含 Cookie）。
const UNCACHEABLE = [
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

// apicache 在回写与命中两侧都会调用此开关，据此彻底旁路
const cachePolicy = (req, res) =>
  res.statusCode === 200 && !UNCACHEABLE.some((rule) => rule.test(req.path))

// 按账号分桶：同路径不同登录态落到不同 key，匿名态共用一份
const cacheKeyOf = (req) => accountFingerprint(req.cookies)

module.exports = { cachePolicy, cacheKeyOf }
