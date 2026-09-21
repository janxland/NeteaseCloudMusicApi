import type { ModuleQuery, ModuleRequest } from '../../types'

// 关注歌手列表

export default (query: ModuleQuery, request: ModuleRequest) => {
  const data: Record<string, any> = {
    limit: query.limit || 25,
    offset: query.offset || 0,
    total: true,
  }
  return request('POST', `https://music.163.com/weapi/artist/sublist`, data, {
    crypto: 'weapi',
    cookie: query.cookie,
    proxy: query.proxy,
    realIP: query.realIP,
  })
}
