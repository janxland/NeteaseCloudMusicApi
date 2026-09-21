import type { ModuleQuery, ModuleRequest } from '../../../types'

// 歌手热门 50 首歌曲
export default (query: ModuleQuery, request: ModuleRequest) => {
  const data: Record<string, any> = {
    id: query.id,
  }
  return request('POST', `https://music.163.com/api/artist/top/song`, data, {
    crypto: 'weapi',
    cookie: query.cookie,
    proxy: query.proxy,
    realIP: query.realIP,
  })
}
