import type { ModuleQuery, ModuleRequest } from '../../types'

// MV排行榜

export default (query: ModuleQuery, request: ModuleRequest) => {
  const data: Record<string, any> = {
    area: query.area || '',
    limit: query.limit || 30,
    offset: query.offset || 0,
    total: true,
  }
  return request('POST', `https://music.163.com/weapi/mv/toplist`, data, {
    crypto: 'weapi',
    cookie: query.cookie,
    proxy: query.proxy,
    realIP: query.realIP,
  })
}
