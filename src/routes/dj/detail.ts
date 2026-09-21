import type { ModuleQuery, ModuleRequest } from '../../types'

// 电台详情

export default (query: ModuleQuery, request: ModuleRequest) => {
  const data: Record<string, any> = {
    id: query.rid,
  }
  return request('POST', `https://music.163.com/api/djradio/v2/get`, data, {
    crypto: 'weapi',
    cookie: query.cookie,
    proxy: query.proxy,
    realIP: query.realIP,
  })
}
