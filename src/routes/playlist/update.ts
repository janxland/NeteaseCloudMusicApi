import type { ModuleQuery, ModuleRequest } from '../../types'

// 编辑歌单

export default (query: ModuleQuery, request: ModuleRequest) => {
  query.cookie.os = 'pc'
  query.desc = query.desc || ''
  query.tags = query.tags || ''
  const data: Record<string, any> = {
    '/api/playlist/desc/update': `{"id":${query.id},"desc":"${query.desc}"}`,
    '/api/playlist/tags/update': `{"id":${query.id},"tags":"${query.tags}"}`,
    '/api/playlist/update/name': `{"id":${query.id},"name":"${query.name}"}`,
  }
  return request('POST', `https://music.163.com/weapi/batch`, data, {
    crypto: 'weapi',
    cookie: query.cookie,
    proxy: query.proxy,
    realIP: query.realIP,
  })
}
