import type { ModuleQuery, ModuleRequest } from '../../types'

// 电台节目列表
import { toBoolean } from '../../core/util'
export default (query: ModuleQuery, request: ModuleRequest) => {
  const data: Record<string, any> = {
    radioId: query.rid,
    limit: query.limit || 30,
    offset: query.offset || 0,
    asc: toBoolean(query.asc),
  }
  return request(
    'POST',
    `https://music.163.com/weapi/dj/program/byradio`,
    data,
    {
      crypto: 'weapi',
      cookie: query.cookie,
      proxy: query.proxy,
      realIP: query.realIP,
    },
  )
}
