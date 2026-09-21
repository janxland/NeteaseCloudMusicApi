import type { ModuleQuery, ModuleRequest } from '../../../types'

export default (query: ModuleQuery, request: ModuleRequest) => {
  const data: Record<string, any> = {
    limit: query.limit || 100,
  }
  return request(
    'POST',
    `https://music.163.com/api/play-record/djradio/list`,
    data,
    {
      crypto: 'weapi',
      cookie: query.cookie,
      proxy: query.proxy,
      realIP: query.realIP,
    },
  )
}
