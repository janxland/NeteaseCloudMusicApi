import type { ModuleQuery, ModuleRequest } from '../../types'

// 歌手榜

export default (query: ModuleQuery, request: ModuleRequest) => {
  const data: Record<string, any> = {
    type: query.type || 1,
    limit: 100,
    offset: 0,
    total: true,
  }
  return request('POST', `https://music.163.com/weapi/toplist/artist`, data, {
    crypto: 'weapi',
    cookie: query.cookie,
    proxy: query.proxy,
    realIP: query.realIP,
  })
}
