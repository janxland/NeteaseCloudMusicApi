import type { ModuleQuery, ModuleRequest } from '../../types'

// 相似歌手
const config = require('../../core/config.json')
export default (query: ModuleQuery, request: ModuleRequest) => {
  const data: Record<string, any> = {
    artistid: query.id,
  }
  return request(
    'POST',
    `https://music.163.com/weapi/discovery/simiArtist`,
    data,
    {
      crypto: 'weapi',
      cookie: query.cookie,
      proxy: query.proxy,
      realIP: query.realIP,
    },
  )
}
