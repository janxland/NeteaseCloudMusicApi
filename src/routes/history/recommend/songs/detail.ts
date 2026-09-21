import type { ModuleQuery, ModuleRequest } from '../../../../types'

// 历史每日推荐歌曲详情

export default (query: ModuleQuery, request: ModuleRequest) => {
  query.cookie.os = 'ios'
  const data: Record<string, any> = {
    date: query.date || '',
  }
  return request(
    'POST',
    `https://music.163.com/api/discovery/recommend/songs/history/detail`,
    data,
    {
      crypto: 'weapi',
      cookie: query.cookie,
      proxy: query.proxy,
      realIP: query.realIP,
    },
  )
}
