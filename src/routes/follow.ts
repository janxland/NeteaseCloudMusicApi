import type { ModuleQuery, ModuleRequest } from '../types'

// 关注与取消关注用户

export default (query: ModuleQuery, request: ModuleRequest) => {
  query.cookie.os = 'pc'
  query.t = query.t == 1 ? 'follow' : 'delfollow'
  return request(
    'POST',
    `https://music.163.com/weapi/user/${query.t}/${query.id}`,
    {},
    {
      crypto: 'weapi',
      cookie: query.cookie,
      proxy: query.proxy,
      realIP: query.realIP,
    },
  )
}
