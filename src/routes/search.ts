import type { ModuleQuery, ModuleRequest } from '../types'

// 搜索

export default (query: ModuleQuery, request: ModuleRequest) => {
  if (query.type && query.type == '2000') {
    const data: Record<string, any> = {
      keyword: query.keywords,
      scene: 'normal',
      limit: query.limit || 30,
      offset: query.offset || 0,
    }
    return request('POST', `https://music.163.com/api/search/voice/get`, data, {
      crypto: 'weapi',
      cookie: query.cookie,
      proxy: query.proxy,
      realIP: query.realIP,
    })
  }
  const data: Record<string, any> = {
    s: query.keywords,
    type: query.type || 1, // 1: 单曲, 10: 专辑, 100: 歌手, 1000: 歌单, 1002: 用户, 1004: MV, 1006: 歌词, 1009: 电台, 1014: 视频
    limit: query.limit || 30,
    offset: query.offset || 0,
  }
  return request('POST', `https://music.163.com/weapi/search/get`, data, {
    crypto: 'weapi',
    cookie: query.cookie,
    proxy: query.proxy,
    realIP: query.realIP,
  })
}
