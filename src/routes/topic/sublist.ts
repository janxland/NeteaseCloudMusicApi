import type { ModuleQuery, ModuleRequest } from '../../types'

// 收藏的专栏

export default (query: ModuleQuery, request: ModuleRequest) => {
  const data: Record<string, any> = {
    limit: query.limit || 50,
    offset: query.offset || 0,
    total: true,
  }
  return request('POST', `https://music.163.com/api/topic/sublist`, data, {
    crypto: 'weapi',
    cookie: query.cookie,
    proxy: query.proxy,
    realIP: query.realIP,
  })
}
