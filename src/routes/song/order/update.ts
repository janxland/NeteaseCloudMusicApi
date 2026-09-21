import type { ModuleQuery, ModuleRequest } from '../../../types'

// 更新歌曲顺序

export default (query: ModuleQuery, request: ModuleRequest) => {
  const data: Record<string, any> = {
    pid: query.pid,
    trackIds: query.ids,
    op: 'update',
  }

  return request(
    'POST',
    `http://interface.music.163.com/api/playlist/manipulate/tracks`,
    data,
    {
      crypto: 'weapi',
      cookie: query.cookie,
      proxy: query.proxy,
      url: '/api/playlist/desc/update',
      realIP: query.realIP,
    },
  )
}
