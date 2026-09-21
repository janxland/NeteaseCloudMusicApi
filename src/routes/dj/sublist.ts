import type { ModuleQuery, ModuleRequest } from '../../types'

// 订阅电台列表

export default (query: ModuleQuery, request: ModuleRequest) => {
  const data: Record<string, any> = {
    limit: query.limit || 30,
    offset: query.offset || 0,
    total: true,
  }
  return request(
    'POST',
    `https://music.163.com/weapi/djradio/get/subed`,
    data,
    {
      crypto: 'weapi',
      cookie: query.cookie,
      proxy: query.proxy,
      realIP: query.realIP,
    },
  )
}
