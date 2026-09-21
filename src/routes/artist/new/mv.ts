import type { ModuleQuery, ModuleRequest } from '../../../types'

export default (query: ModuleQuery, request: ModuleRequest) => {
  query.cookie.os = 'ios'
  query.cookie.appver = '8.7.01'
  const data: Record<string, any> = {
    limit: query.limit || 20,
    startTimestamp: query.before || Date.now(),
  }
  return request(
    'POST',
    `https://music.163.com/api/sub/artist/new/works/mv/list`,
    data,
    {
      crypto: 'weapi',
      cookie: query.cookie,
      proxy: query.proxy,
      realIP: query.realIP,
    },
  )
}
