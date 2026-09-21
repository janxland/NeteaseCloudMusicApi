import type { ModuleQuery, ModuleRequest } from '../../../types'

// 检测手机号码是否已注册

export default (query: ModuleQuery, request: ModuleRequest) => {
  const data: Record<string, any> = {
    cellphone: query.phone,
    countrycode: query.countrycode,
  }
  return request(
    'POST',
    `https://music.163.com/eapi/cellphone/existence/check`,
    data,
    {
      crypto: 'eapi',
      cookie: query.cookie,
      proxy: query.proxy,
      url: '/api/cellphone/existence/check',
      realIP: query.realIP,
    },
  )
}
