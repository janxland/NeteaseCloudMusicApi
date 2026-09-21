import type { ModuleQuery, ModuleRequest } from '../../../../types'

// 电台24小时节目榜
export default (query: ModuleQuery, request: ModuleRequest) => {
  const data: Record<string, any> = {
    limit: query.limit || 100,
    // 不支持 offset
  }
  return request(
    'POST',
    `https://music.163.com/api/djprogram/toplist/hours`,
    data,
    {
      crypto: 'weapi',
      cookie: query.cookie,
      proxy: query.proxy,
      realIP: query.realIP,
    },
  )
}
