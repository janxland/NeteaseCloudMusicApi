import type { ModuleQuery, ModuleRequest } from '../../types'

export default (query: ModuleQuery, request: ModuleRequest) => {
  query.cookie.os = 'ios'
  query.cookie.appver = '8.7.01'
  const data: Record<string, any> = {
    userId: query.uid,
    songId: query.sid,
    adjustSongId: query.asid,
  }
  return request(
    'POST',
    `https://music.163.com/api/cloud/user/song/match`,
    data,
    {
      crypto: 'weapi',
      cookie: query.cookie,
      proxy: query.proxy,
      realIP: query.realIP,
    },
  )
}
