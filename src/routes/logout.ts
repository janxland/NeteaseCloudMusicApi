import type { ModuleQuery, ModuleRequest } from '../types'

// 退出登录

export default (query: ModuleQuery, request: ModuleRequest) => {
  return request(
    'POST',
    `https://music.163.com/weapi/logout`,
    {},
    {
      crypto: 'weapi',
      ua: 'pc',
      cookie: query.cookie,
      proxy: query.proxy,
      realIP: query.realIP,
    },
  )
}
