import type { ModuleQuery, ModuleRequest } from '../../types'

// 每日推荐歌曲

export default (query: ModuleQuery, request: ModuleRequest) => {
  query.cookie.os = 'ios'
  const data: Record<string, any> = {}
  return request(
    'POST',
    `https://music.163.com/api/v3/discovery/recommend/songs`,
    data,
    {
      crypto: 'weapi',
      cookie: query.cookie,
      proxy: query.proxy,
      realIP: query.realIP,
    },
  )
}
