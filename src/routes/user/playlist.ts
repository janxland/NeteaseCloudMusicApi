import type { ModuleQuery, ModuleRequest } from '../../types'

// 用户歌单

export default (query: ModuleQuery, request: ModuleRequest) => {
  const data: Record<string, any> = {
    uid: query.uid,
    limit: query.limit || 30,
    offset: query.offset || 0,
    includeVideo: true,
  }
  return request('POST', `https://music.163.com/api/user/playlist`, data, {
    crypto: 'weapi',
    cookie: query.cookie,
    proxy: query.proxy,
    realIP: query.realIP,
  })
}
