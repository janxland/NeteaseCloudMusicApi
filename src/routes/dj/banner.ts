import type { ModuleQuery, ModuleRequest } from '../../types'

// 电台banner

export default (query: ModuleQuery, request: ModuleRequest) => {
  const data: Record<string, any> = {}
  query.cookie.os = 'pc'
  return request(
    'POST',
    `https://music.163.com/weapi/djradio/banner/get`,
    {},
    {
      crypto: 'weapi',
      cookie: query.cookie,
      proxy: query.proxy,
      realIP: query.realIP,
    },
  )
}
