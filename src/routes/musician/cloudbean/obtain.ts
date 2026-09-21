import type { ModuleQuery, ModuleRequest } from '../../../types'

// 领取云豆

export default (query: ModuleQuery, request: ModuleRequest) => {
  const data: Record<string, any> = {
    userMissionId: query.id,
    period: query.period,
  }
  return request(
    'POST',
    `https://music.163.com/weapi/nmusician/workbench/mission/reward/obtain/new`,
    data,
    {
      crypto: 'weapi',
      cookie: query.cookie,
      proxy: query.proxy,
      realIP: query.realIP,
    },
  )
}
