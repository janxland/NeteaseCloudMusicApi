import type { ModuleQuery, ModuleRequest } from '../../types'

// 歌手粉丝

export default (query: ModuleQuery, request: ModuleRequest) => {
  const data: Record<string, any> = {
    id: query.id,
    limit: query.limit || 20,
    offset: query.offset || 0,
  }
  return request('POST', `https://music.163.com/weapi/artist/fans/get`, data, {
    crypto: 'weapi',
    cookie: query.cookie,
    proxy: query.proxy,
    realIP: query.realIP,
  })
}
