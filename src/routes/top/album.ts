import type { ModuleQuery, ModuleRequest } from '../../types'

// 新碟上架

export default (query: ModuleQuery, request: ModuleRequest) => {
  const date = new Date()

  const data: Record<string, any> = {
    area: query.area || 'ALL', // //ALL:全部,ZH:华语,EA:欧美,KR:韩国,JP:日本
    limit: query.limit || 50,
    offset: query.offset || 0,
    type: query.type || 'new',
    year: query.year || date.getFullYear(),
    month: query.month || date.getMonth() + 1,
    total: false,
    rcmd: true,
  }
  return request(
    'POST',
    `https://music.163.com/api/discovery/new/albums/area`,
    data,
    {
      crypto: 'weapi',
      cookie: query.cookie,
      proxy: query.proxy,
      realIP: query.realIP,
    },
  )
}
