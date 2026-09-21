import type { ModuleQuery, ModuleRequest } from '../../types'

// 会员成长值

export default (query: ModuleQuery, request: ModuleRequest) => {
  const data: Record<string, any> = {}
  return request(
    'POST',
    `https://music.163.com/weapi/vipnewcenter/app/level/growhpoint/basic`,
    data,
    {
      crypto: 'weapi',
      cookie: query.cookie,
      proxy: query.proxy,
      realIP: query.realIP,
    },
  )
}
