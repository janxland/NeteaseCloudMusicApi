import type { ModuleQuery, ModuleRequest } from '../../types'

// 歌曲详情

export default (query: ModuleQuery, request: ModuleRequest) => {
  query.ids = query.ids.split(/\s*,\s*/)
  const data: Record<string, any> = {
    c: '[' + query.ids.map((id) => '{"id":' + id + '}').join(',') + ']',
  }
  return request('POST', `https://music.163.com/api/v3/song/detail`, data, {
    crypto: 'weapi',
    cookie: query.cookie,
    proxy: query.proxy,
    realIP: query.realIP,
  })
}
