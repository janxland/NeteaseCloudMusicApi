import type { ModuleQuery, ModuleRequest } from '../../../types'

// 视频分类列表

export default (query: ModuleQuery, request: ModuleRequest) => {
  const data: Record<string, any> = {
    offset: query.offset || 0,
    total: 'true',
    limit: query.limit || 99,
  }
  return request(
    'POST',
    `https://music.163.com/api/cloudvideo/category/list`,
    data,
    {
      crypto: 'weapi',
      cookie: query.cookie,
      proxy: query.proxy,
      realIP: query.realIP,
    },
  )
}
