import type { ModuleQuery, ModuleRequest } from '../../types'

// 用户动态

export default (query: ModuleQuery, request: ModuleRequest) => {
  query.cookie.os = 'ios'
  query.cookie.appver = '8.7.01'
  const data: Record<string, any> = {
    getcounts: true,
    time: query.lasttime || -1,
    limit: query.limit || 30,
    total: false,
  }
  return request(
    'POST',
    `https://music.163.com/api/event/get/${query.uid}`,
    data,
    {
      crypto: 'api',
      cookie: query.cookie,
      proxy: query.proxy,
      realIP: query.realIP,
    },
  )
}
