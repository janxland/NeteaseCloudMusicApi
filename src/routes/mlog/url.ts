import type { ModuleQuery, ModuleRequest } from '../../types'

// mlog链接

export default (query: ModuleQuery, request: ModuleRequest) => {
  const data: Record<string, any> = {
    id: query.id,
    resolution: query.res || 1080,
    type: 1,
  }
  return request('POST', `https://music.163.com/weapi/mlog/detail/v1`, data, {
    crypto: 'weapi',
    cookie: query.cookie,
    proxy: query.proxy,
    realIP: query.realIP,
  })
}
