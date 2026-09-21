import type { ModuleQuery, ModuleRequest } from '../types'

// 推荐歌单

export default (query: ModuleQuery, request: ModuleRequest) => {
  const data: Record<string, any> = {
    limit: query.limit || 30,
    // offset: query.offset || 0,
    total: true,
    n: 1000,
  }
  return request(
    'POST',
    `https://music.163.com/weapi/personalized/playlist`,
    data,
    {
      crypto: 'weapi',
      cookie: query.cookie,
      proxy: query.proxy,
      realIP: query.realIP,
    },
  )
}
