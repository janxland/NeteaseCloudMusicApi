import type { ModuleQuery, ModuleRequest } from '../../../types'

// 歌单打卡

export default (query: ModuleQuery, request: ModuleRequest) => {
  const data: Record<string, any> = {
    id: query.id,
  }
  return request(
    'POST',
    `https://music.163.com/api/playlist/update/playcount`,
    data,
    {
      crypto: 'weapi',
      cookie: query.cookie,
      proxy: query.proxy,
      realIP: query.realIP,
    },
  )
}
