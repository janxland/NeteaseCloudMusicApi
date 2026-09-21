import type { ModuleQuery, ModuleRequest } from '../../../types'

// 电台个性推荐

export default (query: ModuleQuery, request: ModuleRequest) => {
  return request(
    'POST',
    `https://music.163.com/api/djradio/personalize/rcmd`,
    {
      limit: query.limit || 6,
    },
    {
      crypto: 'weapi',
      cookie: query.cookie,
      proxy: query.proxy,
      realIP: query.realIP,
    },
  )
}
