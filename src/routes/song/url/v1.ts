import type { ModuleQuery, ModuleRequest } from '../../../types'

// 歌曲链接 - v1
// 此版本不再采用 br 作为音质区分的标准
// 而是采用 standard, exhigh, lossless, hires, jyeffect, jymaster 进行音质判断

const crypto = require('node:crypto')
export default (query: ModuleQuery, request: ModuleRequest) => {
  query.cookie.os = 'android'
  const data: Record<string, any> = {
    ids: '[' + query.id + ']',
    level: query.level,
    encodeType: 'flac',
  }
  return request(
    'POST',
    `https://interface.music.163.com/eapi/song/enhance/player/url/v1`,
    data,
    {
      crypto: 'eapi',
      cookie: query.cookie,
      proxy: query.proxy,
      realIP: query.realIP,
      url: '/api/song/enhance/player/url/v1',
    },
  )
}
