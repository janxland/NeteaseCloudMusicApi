import type { ModuleQuery, ModuleRequest } from '../../types'

// 创建歌单

export default (query: ModuleQuery, request: ModuleRequest) => {
  query.cookie.os = 'pc'
  const data: Record<string, any> = {
    name: query.name,
    privacy: query.privacy, //0 为普通歌单，10 为隐私歌单
    type: query.type || 'NORMAL', // NORMAL|VIDEO|SHARED
  }
  return request('POST', `https://music.163.com/api/playlist/create`, data, {
    crypto: 'weapi',
    cookie: query.cookie,
    proxy: query.proxy,
    realIP: query.realIP,
  })
}
