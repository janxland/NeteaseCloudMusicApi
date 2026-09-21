import type { ModuleQuery, ModuleRequest } from '../../../types'

// 智能播放

export default (query: ModuleQuery, request: ModuleRequest) => {
  const data: Record<string, any> = {
    songId: query.id,
    type: 'fromPlayOne',
    playlistId: query.pid,
    startMusicId: query.sid || query.id,
    count: query.count || 1,
  }
  return request(
    'POST',
    `https://music.163.com/weapi/playmode/intelligence/list`,
    data,
    {
      crypto: 'weapi',
      cookie: query.cookie,
      proxy: query.proxy,
      realIP: query.realIP,
    },
  )
}
