import type { ModuleQuery, ModuleRequest } from '../../types'

// 推荐节目

export default (query: ModuleQuery, request: ModuleRequest) => {
  const data: Record<string, any> = {
    cateId: query.type,
    limit: query.limit || 10,
    offset: query.offset || 0,
  }
  return request(
    'POST',
    `https://music.163.com/weapi/program/recommend/v1`,
    data,
    {
      crypto: 'weapi',
      cookie: query.cookie,
      proxy: query.proxy,
      realIP: query.realIP,
    },
  )
}
