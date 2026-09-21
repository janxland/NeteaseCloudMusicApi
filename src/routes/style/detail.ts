import type { ModuleQuery, ModuleRequest } from '../../types'

// 曲风详情

export default (query: ModuleQuery, request: ModuleRequest) => {
  const data: Record<string, any> = {
    tagId: query.tagId,
  }
  return request(
    'POST',
    `https://music.163.com/api/style-tag/home/head`,
    data,
    {
      crypto: 'weapi',
      cookie: query.cookie,
      proxy: query.proxy,
      realIP: query.realIP,
    },
  )
}
