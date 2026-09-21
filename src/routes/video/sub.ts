import type { ModuleQuery, ModuleRequest } from '../../types'

// 收藏与取消收藏视频

export default (query: ModuleQuery, request: ModuleRequest) => {
  query.t = query.t == 1 ? 'sub' : 'unsub'
  const data: Record<string, any> = {
    id: query.id,
  }
  return request(
    'POST',
    `https://music.163.com/weapi/cloudvideo/video/${query.t}`,
    data,
    {
      crypto: 'weapi',
      cookie: query.cookie,
      proxy: query.proxy,
      realIP: query.realIP,
    },
  )
}
