import type { ModuleQuery, ModuleRequest } from '../../../types'

// 音乐百科基础信息
const crypto = require('node:crypto')
export default (query: ModuleQuery, request: ModuleRequest) => {
  const data: Record<string, any> = {
    songId: query.id,
  }
  return request(
    'POST',
    `https://interface3.music.163.com/eapi/music/wiki/home/song/get`,
    data,
    {
      crypto: 'eapi',
      cookie: query.cookie,
      proxy: query.proxy,
      realIP: query.realIP,
      url: '/api/song/play/about/block/page',
    },
  )
}
