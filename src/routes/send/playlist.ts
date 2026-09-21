import type { ModuleQuery, ModuleRequest } from '../../types'

// 私信歌单

export default (query: ModuleQuery, request: ModuleRequest) => {
  query.cookie.os = 'pc'
  const data: Record<string, any> = {
    id: query.playlist,
    type: 'playlist',
    msg: query.msg,
    userIds: '[' + query.user_ids + ']',
  }
  return request('POST', `https://music.163.com/weapi/msg/private/send`, data, {
    crypto: 'weapi',
    cookie: query.cookie,
    proxy: query.proxy,
    realIP: query.realIP,
  })
}
