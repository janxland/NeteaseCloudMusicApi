import type { ModuleQuery, ModuleRequest } from '../../types'

// 通知

export default (query: ModuleQuery, request: ModuleRequest) => {
  const data: Record<string, any> = {
    limit: query.limit || 30,
    time: query.lasttime || -1,
  }
  return request('POST', `https://music.163.com/api/msg/notices`, data, {
    crypto: 'weapi',
    cookie: query.cookie,
    proxy: query.proxy,
    realIP: query.realIP,
  })
}
