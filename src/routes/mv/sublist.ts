import type { ModuleQuery, ModuleRequest } from '../../types'

// 已收藏MV列表

export default (query: ModuleQuery, request: ModuleRequest) => {
  const data: Record<string, any> = {
    limit: query.limit || 25,
    offset: query.offset || 0,
    total: true,
  }
  return request(
    'POST',
    `https://music.163.com/weapi/cloudvideo/allvideo/sublist`,
    data,
    {
      crypto: 'weapi',
      cookie: query.cookie,
      proxy: query.proxy,
      realIP: query.realIP,
    },
  )
}
