import type { ModuleQuery, ModuleRequest } from '../../types'

// 用户电台节目

export default (query: ModuleQuery, request: ModuleRequest) => {
  const data: Record<string, any> = {
    limit: query.limit || 30,
    offset: query.offset || 0,
  }
  return request(
    'POST',
    `https://music.163.com/weapi/dj/program/${query.uid}`,
    data,
    {
      crypto: 'weapi',
      cookie: query.cookie,
      proxy: query.proxy,
      realIP: query.realIP,
    },
  )
}
