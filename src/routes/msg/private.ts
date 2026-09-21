import type { ModuleQuery, ModuleRequest } from '../../types'

// 私信

export default (query: ModuleQuery, request: ModuleRequest) => {
  const data: Record<string, any> = {
    offset: query.offset || 0,
    limit: query.limit || 30,
    total: 'true',
  }
  return request('POST', `https://music.163.com/api/msg/private/users`, data, {
    crypto: 'weapi',
    cookie: query.cookie,
    proxy: query.proxy,
    realIP: query.realIP,
  })
}
