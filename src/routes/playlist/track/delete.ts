import type { ModuleQuery, ModuleRequest } from '../../../types'

// 收藏单曲到歌单 从歌单删除歌曲

export default async (query: ModuleQuery, request: ModuleRequest) => {
  query.cookie.os = 'pc'
  query.ids = query.ids || ''
  const data: Record<string, any> = {
    id: query.id,
    tracks: JSON.stringify(
      query.ids.split(',').map((item) => {
        return { type: 3, id: item }
      }),
    ),
  }

  return request(
    'POST',
    `https://music.163.com/api/playlist/track/delete`,
    data,
    {
      crypto: 'weapi',
      cookie: query.cookie,
      proxy: query.proxy,
      realIP: query.realIP,
    },
  )
}
