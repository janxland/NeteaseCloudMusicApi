import type { ModuleQuery, ModuleRequest } from '../../types'

// 最新MV

export default (query: ModuleQuery, request: ModuleRequest) => {
  const data: Record<string, any> = {
    // 'offset': query.offset || 0,
    area: query.area || '',
    limit: query.limit || 30,
    total: true,
  }
  return request(
    'POST',
    `https://interface.music.163.com/weapi/mv/first`,
    data,
    {
      crypto: 'weapi',
      cookie: query.cookie,
      proxy: query.proxy,
      realIP: query.realIP,
    },
  )
}
