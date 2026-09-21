import type { ModuleQuery, ModuleRequest } from '../../types'

// 听歌排行

export default (query: ModuleQuery, request: ModuleRequest) => {
  const data: Record<string, any> = {
    uid: query.uid,
    type: query.type || 0, // 1: 最近一周, 0: 所有时间
  }
  return request('POST', `https://music.163.com/weapi/v1/play/record`, data, {
    crypto: 'weapi',
    cookie: query.cookie,
    proxy: query.proxy,
    realIP: query.realIP,
  })
}
