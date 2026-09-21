import type { ModuleQuery, ModuleRequest } from '../../types'

// 新版歌词 - 包含逐字歌词

export default (query: ModuleQuery, request: ModuleRequest) => {
  const data: Record<string, any> = {
    id: query.id,
    cp: false,
    tv: 0,
    lv: 0,
    rv: 0,
    kv: 0,
    yv: 0,
    ytv: 0,
    yrv: 0,
  }
  return request(
    'POST',
    `https://interface3.music.163.com/eapi/song/lyric/v1`,
    data,
    {
      crypto: 'eapi',
      cookie: query.cookie,
      proxy: query.proxy,
      realIP: query.realIP,
      url: '/api/song/lyric/v1',
    },
  )
}
