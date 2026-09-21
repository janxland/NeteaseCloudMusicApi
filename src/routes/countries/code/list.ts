import type { ModuleQuery, ModuleRequest } from '../../../types'

// 国家编码列表
export default (query: ModuleQuery, request: ModuleRequest) => {
  const data: Record<string, any> = {}
  return request(
    'POST',
    `https://interface3.music.163.com/eapi/lbs/countries/v1`,
    data,
    {
      crypto: 'eapi',
      cookie: query.cookie,
      proxy: query.proxy,
      url: '/api/lbs/countries/v1',
      realIP: query.realIP,
    },
  )
}
