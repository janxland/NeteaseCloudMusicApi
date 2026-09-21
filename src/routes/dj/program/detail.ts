import type { ModuleQuery, ModuleRequest } from '../../../types'

// 电台节目详情

export default (query: ModuleQuery, request: ModuleRequest) => {
  const data: Record<string, any> = {
    id: query.id,
  }
  return request('POST', `https://music.163.com/api/dj/program/detail`, data, {
    crypto: 'weapi',
    cookie: query.cookie,
    proxy: query.proxy,
    realIP: query.realIP,
  })
}
