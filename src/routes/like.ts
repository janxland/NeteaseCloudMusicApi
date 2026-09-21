import type { ModuleQuery, ModuleRequest } from '../types'

// 红心与取消红心歌曲

export default (query: ModuleQuery, request: ModuleRequest) => {
  query.cookie.os = 'pc'
  query.cookie.appver = '2.9.7'
  query.like = query.like == 'false' ? false : true
  const data: Record<string, any> = {
    alg: 'itembased',
    trackId: query.id,
    like: query.like,
    time: '3',
  }
  return request('POST', `https://music.163.com/api/radio/like`, data, {
    crypto: 'weapi',
    cookie: query.cookie,
    proxy: query.proxy,
    realIP: query.realIP,
  })
}
