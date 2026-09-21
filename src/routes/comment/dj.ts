import type { ModuleQuery, ModuleRequest } from '../../types'

// 电台评论

export default (query: ModuleQuery, request: ModuleRequest) => {
  query.cookie.os = 'pc'
  const data: Record<string, any> = {
    rid: query.id,
    limit: query.limit || 20,
    offset: query.offset || 0,
    beforeTime: query.before || 0,
  }
  return request(
    'POST',
    `https://music.163.com/weapi/v1/resource/comments/A_DJ_1_${query.id}`,
    data,
    {
      crypto: 'weapi',
      cookie: query.cookie,
      proxy: query.proxy,
      realIP: query.realIP,
    },
  )
}
