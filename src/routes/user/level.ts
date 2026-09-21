import type { ModuleQuery, ModuleRequest } from '../../types'

// 类别热门电台

export default (query: ModuleQuery, request: ModuleRequest) => {
  const data: Record<string, any> = {}
  return request('POST', `https://music.163.com/weapi/user/level`, data, {
    crypto: 'weapi',
    cookie: query.cookie,
    proxy: query.proxy,
    realIP: query.realIP,
  })
}
