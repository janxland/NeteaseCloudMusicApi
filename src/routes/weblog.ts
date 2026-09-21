import type { ModuleQuery, ModuleRequest } from '../types'

// 操作记录

export default (query: ModuleQuery, request: ModuleRequest) => {
  return request(
    'POST',
    `https://music.163.com/weapi/feedback/weblog`,
    query.data || {},
    {
      crypto: 'weapi',
      cookie: query.cookie,
      proxy: query.proxy,
      realIP: query.realIP,
    },
  )
}
