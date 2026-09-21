import type { ModuleQuery, ModuleRequest } from '../../../types'

// 私信内容

export default (query: ModuleQuery, request: ModuleRequest) => {
  const data: Record<string, any> = {
    userId: query.uid,
    limit: query.limit || 30,
    time: query.before || 0,
    total: 'true',
  }
  return request(
    'POST',
    `https://music.163.com/api/msg/private/history`,
    data,
    {
      crypto: 'weapi',
      cookie: query.cookie,
      proxy: query.proxy,
      realIP: query.realIP,
    },
  )
}
