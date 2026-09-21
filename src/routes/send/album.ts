import type { ModuleQuery, ModuleRequest } from '../../types'

// 私信专辑

export default (query: ModuleQuery, request: ModuleRequest) => {
  query.cookie.os = 'ios'
  query.cookie.appver = '8.7.01'
  const data: Record<string, any> = {
    id: query.id,
    msg: query.msg || '',
    type: 'album',
    userIds: '[' + query.user_ids + ']',
  }
  return request('POST', `https://music.163.com/api/msg/private/send`, data, {
    crypto: 'api',
    cookie: query.cookie,
    proxy: query.proxy,
    realIP: query.realIP,
  })
}
