import type { ModuleQuery, ModuleRequest } from '../../types'

// 所有榜单内容摘要

export default (query: ModuleQuery, request: ModuleRequest) => {
  return request(
    'POST',
    `https://music.163.com/weapi/toplist/detail`,
    {},
    {
      crypto: 'weapi',
      cookie: query.cookie,
      proxy: query.proxy,
      realIP: query.realIP,
    },
  )
}
