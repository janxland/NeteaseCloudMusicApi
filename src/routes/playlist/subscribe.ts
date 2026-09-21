import type { ModuleQuery, ModuleRequest } from '../../types'

// 收藏与取消收藏歌单

export default (query: ModuleQuery, request: ModuleRequest) => {
  query.t = query.t == 1 ? 'subscribe' : 'unsubscribe'
  const data: Record<string, any> = {
    id: query.id,
  }
  return request(
    'POST',
    `https://music.163.com/weapi/playlist/${query.t}`,
    data,
    {
      crypto: 'weapi',
      cookie: query.cookie,
      proxy: query.proxy,
      realIP: query.realIP,
    },
  )
}
