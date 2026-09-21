import type { ModuleQuery, ModuleRequest } from '../../types'

// 相似MV

export default (query: ModuleQuery, request: ModuleRequest) => {
  const data: Record<string, any> = {
    mvid: query.mvid,
  }
  return request('POST', `https://music.163.com/weapi/discovery/simiMV`, data, {
    crypto: 'weapi',
    cookie: query.cookie,
    proxy: query.proxy,
    realIP: query.realIP,
  })
}
