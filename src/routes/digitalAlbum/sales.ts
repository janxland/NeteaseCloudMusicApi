import type { ModuleQuery, ModuleRequest } from '../../types'

// 数字专辑销量

export default (query: ModuleQuery, request: ModuleRequest) => {
  const data: Record<string, any> = {
    albumIds: query.ids,
  }
  return request(
    'POST',
    `https://music.163.com/weapi/vipmall/albumproduct/album/query/sales`,
    data,
    {
      crypto: 'weapi',
      cookie: query.cookie,
      proxy: query.proxy,
      realIP: query.realIP,
    },
  )
}
