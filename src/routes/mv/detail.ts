import type { ModuleQuery, ModuleRequest } from '../../types'

// MV详情

export default (query: ModuleQuery, request: ModuleRequest) => {
  const data: Record<string, any> = {
    id: query.mvid,
  }
  return request('POST', `https://music.163.com/api/v1/mv/detail`, data, {
    crypto: 'weapi',
    cookie: query.cookie,
    proxy: query.proxy,
    realIP: query.realIP,
  })
}
