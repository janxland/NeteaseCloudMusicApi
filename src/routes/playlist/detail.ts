import type { ModuleQuery, ModuleRequest } from '../../types'

// 歌单详情

export default (query: ModuleQuery, request: ModuleRequest) => {
  const data: Record<string, any> = {
    id: query.id,
    n: 100000,
    s: query.s || 8,
  }
  return request('POST', `https://music.163.com/api/v6/playlist/detail`, data, {
    crypto: 'api',
    cookie: query.cookie,
    proxy: query.proxy,
    realIP: query.realIP,
  })
}
