/**
 * 客户端可见响应策略。
 *
 * 扫码链路的响应 cookie 属于"网易云设备会话"，回写浏览器只会污染 jar：
 * 下一次轮询或取歌带着它会被判风控（-462 验证挑战 / 502），而轮询端没有
 * 对应分支，于是永久停在"待确认"。登录结果由 body.cookie 下发，客户端并不
 * 依赖 Set-Cookie，故这些路由关闭回写；其余路由保持上游行为。
 */
const NO_SET_COOKIE_ROUTES = ['/login/qr/']

/** @param {string} baseUrl 该模块被挂载的路由前缀 @param {object} query 查询参数 */
const shouldEchoCookies = (baseUrl, query = {}) =>
  !query.noCookie &&
  !NO_SET_COOKIE_ROUTES.some((route) => baseUrl.startsWith(route))

module.exports = { shouldEchoCookies, NO_SET_COOKIE_ROUTES }
