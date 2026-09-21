import type { ModuleQuery, ModuleRequest } from '../../../types'

// 电台节目榜

export default (query: ModuleQuery, request: ModuleRequest) => {
  const data: Record<string, any> = {
    limit: query.limit || 100,
    offset: query.offset || 0,
  }
  return request('POST', `https://music.163.com/api/program/toplist/v1`, data, {
    crypto: 'weapi',
    cookie: query.cookie,
    proxy: query.proxy,
    realIP: query.realIP,
  })
}
