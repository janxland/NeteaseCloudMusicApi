import type { ModuleQuery, ModuleRequest } from '../../../types'

// 领取会员成长值

export default (query: ModuleQuery, request: ModuleRequest) => {
  const data: Record<string, any> = {
    taskIds: query.ids,
  }
  return request(
    'POST',
    `https://music.163.com/weapi/vipnewcenter/app/level/task/reward/get`,
    data,
    {
      crypto: 'weapi',
      cookie: query.cookie,
      proxy: query.proxy,
      realIP: query.realIP,
    },
  )
}
