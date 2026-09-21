import type { ModuleQuery, ModuleRequest } from '../../types'

// 相似歌曲

export default (query: ModuleQuery, request: ModuleRequest) => {
  const data: Record<string, any> = {
    songid: query.id,
    limit: query.limit || 50,
    offset: query.offset || 0,
  }
  return request(
    'POST',
    `https://music.163.com/weapi/v1/discovery/simiSong`,
    data,
    {
      crypto: 'weapi',
      cookie: query.cookie,
      proxy: query.proxy,
      realIP: query.realIP,
    },
  )
}
