import type { ModuleQuery, ModuleRequest } from '../../../types'

export default (query: ModuleQuery, request: ModuleRequest) => {
  const data: Record<string, any> = {
    userTaskId: query.userTaskId,
    depositCode: query.depositCode || '0',
  }
  return request(
    'POST',
    `https://music.163.com/api/usertool/task/point/receive`,
    data,
    {
      crypto: 'weapi',
      cookie: query.cookie,
      proxy: query.proxy,
      realIP: query.realIP,
    },
  )
}
