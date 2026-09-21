import type { ModuleQuery, ModuleRequest } from '../../types'

// 歌手专辑列表

export default (query: ModuleQuery, request: ModuleRequest) => {
  const data: Record<string, any> = {
    limit: query.limit || 30,
    offset: query.offset || 0,
    total: true,
  }
  return request(
    'POST',
    `https://music.163.com/weapi/artist/albums/${query.id}`,
    data,
    {
      crypto: 'weapi',
      cookie: query.cookie,
      proxy: query.proxy,
      realIP: query.realIP,
    },
  )
}
