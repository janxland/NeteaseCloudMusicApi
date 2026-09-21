import type { ModuleQuery, ModuleRequest } from '../../types'

//热门话题

export default (query: ModuleQuery, request: ModuleRequest) => {
  const data: Record<string, any> = {
    limit: query.limit || 20,
    offset: query.offset || 0,
  }
  return request('POST', `https://music.163.com/api/act/hot`, data, {
    crypto: 'weapi',
    cookie: query.cookie,
    proxy: query.proxy,
    realIP: query.realIP,
  })
}
