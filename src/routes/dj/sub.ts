import type { ModuleQuery, ModuleRequest } from '../../types'

// 订阅与取消电台

export default (query: ModuleQuery, request: ModuleRequest) => {
  query.t = query.t == 1 ? 'sub' : 'unsub'
  const data: Record<string, any> = {
    id: query.rid,
  }
  return request(
    'POST',
    `https://music.163.com/weapi/djradio/${query.t}`,
    data,
    {
      crypto: 'weapi',
      cookie: query.cookie,
      proxy: query.proxy,
      realIP: query.realIP,
    },
  )
}
