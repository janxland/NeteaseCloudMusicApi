import type { ModuleQuery, ModuleRequest } from '../../types'

export default (query: ModuleQuery, request: ModuleRequest) => {
  const data: Record<string, any> = {
    phone: query.phone,
    captcha: query.captcha,
    oldcaptcha: query.oldcaptcha,
    countrycode: query.countrycode || '86',
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
