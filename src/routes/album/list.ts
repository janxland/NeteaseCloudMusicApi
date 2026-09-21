import type { ModuleQuery, ModuleRequest } from '../../types'

// 数字专辑-新碟上架
export default (query: ModuleQuery, request: ModuleRequest) => {
  const data: Record<string, any> = {
    limit: query.limit || 30,
    offset: query.offset || 0,
    total: true,
    area: query.area || 'ALL', //ALL:全部,ZH:华语,EA:欧美,KR:韩国,JP:日本
    type: query.type,
  }
  return request(
    'POST',
    `https://music.163.com/weapi/vipmall/albumproduct/list`,
    data,
    {
      crypto: 'weapi',
      cookie: query.cookie,
      proxy: query.proxy,
      realIP: query.realIP,
    },
  )
}
