import type { ModuleQuery, ModuleRequest } from '../../types'

// 删除动态

export default (query: ModuleQuery, request: ModuleRequest) => {
  const data: Record<string, any> = {
    id: query.evId,
  }
  return request('POST', `https://music.163.com/eapi/event/delete`, data, {
    crypto: 'weapi',
    cookie: query.cookie,
    proxy: query.proxy,
    realIP: query.realIP,
  })
}
