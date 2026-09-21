import type { ModuleQuery, ModuleRequest } from '../types'

// 设置

export default (query: ModuleQuery, request: ModuleRequest) => {
  const data: Record<string, any> = {}
  return request('POST', `https://music.163.com/api/user/setting`, data, {
    crypto: 'weapi',
    cookie: query.cookie,
    proxy: query.proxy,
    realIP: query.realIP,
  })
}
