import type { ModuleQuery, ModuleRequest } from '../../types'

// 收藏/取消收藏专辑

export default (query: ModuleQuery, request: ModuleRequest) => {
  query.t = query.t == 1 ? 'sub' : 'unsub'
  const data: Record<string, any> = {
    id: query.id,
  }
  return request('POST', `https://music.163.com/api/album/${query.t}`, data, {
    crypto: 'weapi',
    cookie: query.cookie,
    proxy: query.proxy,
    realIP: query.realIP,
  })
}
