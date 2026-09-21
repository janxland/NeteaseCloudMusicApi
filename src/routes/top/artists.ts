import type { ModuleQuery, ModuleRequest } from '../../types'

// 热门歌手

export default (query: ModuleQuery, request: ModuleRequest) => {
  const data: Record<string, any> = {
    limit: query.limit || 50,
    offset: query.offset || 0,
    total: true,
  }
  return request('POST', `https://music.163.com/weapi/artist/top`, data, {
    crypto: 'weapi',
    cookie: query.cookie,
    proxy: query.proxy,
    realIP: query.realIP,
  })
}
