import type { ModuleQuery, ModuleRequest } from '../../../../types'

export default (query: ModuleQuery, request: ModuleRequest) => {
  const data: Record<string, any> = {
    actid: query.actid,
  }
  return request('POST', `https://music.163.com/api/act/event/hot`, data, {
    crypto: 'weapi',
    cookie: query.cookie,
    proxy: query.proxy,
    realIP: query.realIP,
  })
}
