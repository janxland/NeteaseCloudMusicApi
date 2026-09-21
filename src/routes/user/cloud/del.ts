import type { ModuleQuery, ModuleRequest } from '../../../types'

// 云盘歌曲删除

export default (query: ModuleQuery, request: ModuleRequest) => {
  const data: Record<string, any> = {
    songIds: [query.id],
  }
  return request('POST', `https://music.163.com/weapi/cloud/del`, data, {
    crypto: 'weapi',
    cookie: query.cookie,
    proxy: query.proxy,
    realIP: query.realIP,
  })
}
