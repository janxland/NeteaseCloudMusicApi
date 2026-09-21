import type { ModuleQuery, ModuleRequest } from '../../types'

// 热门搜索

export default (query: ModuleQuery, request: ModuleRequest) => {
  const data: Record<string, any> = {
    type: 1111,
  }
  return request('POST', `https://music.163.com/weapi/search/hot`, data, {
    crypto: 'weapi',
    ua: 'mobile',
    cookie: query.cookie,
    proxy: query.proxy,
    realIP: query.realIP,
  })
}
