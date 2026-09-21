import type { ModuleQuery, ModuleRequest } from '../../types'

// 删除歌单

export default (query: ModuleQuery, request: ModuleRequest) => {
  query.cookie.os = 'pc'
  const data: Record<string, any> = {
    ids: '[' + query.id + ']',
  }
  return request('POST', `https://music.163.com/weapi/playlist/remove`, data, {
    crypto: 'weapi',
    cookie: query.cookie,
    proxy: query.proxy,
    realIP: query.realIP,
  })
}
