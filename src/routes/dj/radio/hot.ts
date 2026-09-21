import type { ModuleQuery, ModuleRequest } from '../../../types'

// 类别热门电台

export default (query: ModuleQuery, request: ModuleRequest) => {
  const data: Record<string, any> = {
    cateId: query.cateId,
    limit: query.limit || 30,
    offset: query.offset || 0,
  }
  return request('POST', `https://music.163.com/api/djradio/hot`, data, {
    crypto: 'weapi',
    cookie: query.cookie,
    proxy: query.proxy,
    realIP: query.realIP,
  })
}
