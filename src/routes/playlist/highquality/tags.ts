import type { ModuleQuery, ModuleRequest } from '../../../types'

// 精品歌单 tags
export default (query: ModuleQuery, request: ModuleRequest) => {
  const data: Record<string, any> = {}
  return request(
    'POST',
    `https://music.163.com/api/playlist/highquality/tags`,
    data,
    {
      crypto: 'weapi',
      cookie: query.cookie,
      proxy: query.proxy,
      realIP: query.realIP,
    },
  )
}
