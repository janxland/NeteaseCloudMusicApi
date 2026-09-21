import type { ModuleQuery, ModuleRequest } from '../../types'

// 歌单收藏者

export default (query: ModuleQuery, request: ModuleRequest) => {
  const data: Record<string, any> = {
    id: query.id,
    limit: query.limit || 20,
    offset: query.offset || 0,
  }
  return request(
    'POST',
    `https://music.163.com/weapi/playlist/subscribers`,
    data,
    {
      crypto: 'weapi',
      cookie: query.cookie,
      proxy: query.proxy,
      realIP: query.realIP,
    },
  )
}
