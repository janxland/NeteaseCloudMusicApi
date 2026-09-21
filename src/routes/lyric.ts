import type { ModuleQuery, ModuleRequest } from '../types'

// 歌词

export default (query: ModuleQuery, request: ModuleRequest) => {
  query.cookie.os = 'ios'

  const data: Record<string, any> = {
    id: query.id,
    tv: -1,
    lv: -1,
    rv: -1,
    kv: -1,
  }
  return request(
    'POST',
    `https://music.163.com/api/song/lyric?_nmclfl=1`,
    data,
    {
      crypto: 'api',
      cookie: query.cookie,
      proxy: query.proxy,
      realIP: query.realIP,
    },
  )
}
