import type { ModuleQuery, ModuleRequest } from '../../types'

// 歌手相关MV

export default (query: ModuleQuery, request: ModuleRequest) => {
  const data: Record<string, any> = {
    artistId: query.id,
    limit: query.limit,
    offset: query.offset,
    total: true,
  }
  return request('POST', `https://music.163.com/weapi/artist/mvs`, data, {
    crypto: 'weapi',
    cookie: query.cookie,
    proxy: query.proxy,
    realIP: query.realIP,
  })
}
