import type { ModuleQuery, ModuleRequest } from '../types'

// 更换手机

export default (query: ModuleQuery, request: ModuleRequest) => {
  const data: Record<string, any> = {
    captcha: query.captcha,
    phone: query.phone,
    oldcaptcha: query.oldcaptcha,
    ctcode: query.ctcode || '86',
  }
  return request(
    'POST',
    `https://music.163.com/api/user/replaceCellphone`,
    data,
    {
      crypto: 'weapi',
      cookie: query.cookie,
      proxy: query.proxy,
      realIP: query.realIP,
    },
  )
}
