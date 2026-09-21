import type { ModuleQuery, ModuleRequest } from '../../types'

// 电台详情

export default (query: ModuleQuery, request: ModuleRequest) => {
  const data: Record<string, any> = {
    time: query.time || '-1',
    id: query.id,
    limit: query.limit || '20',
    total: 'true',
  }
  return request('POST', `https://music.163.com/api/djradio/subscriber`, data, {
    crypto: 'weapi',
    cookie: query.cookie,
    proxy: query.proxy,
    realIP: query.realIP,
  })
}
