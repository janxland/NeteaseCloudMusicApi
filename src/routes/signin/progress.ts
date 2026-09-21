import type { ModuleQuery, ModuleRequest } from '../../types'

// 签到进度

export default (query: ModuleQuery, request: ModuleRequest) => {
  const data: Record<string, any> = {
    moduleId: query.moduleId || '1207signin-1207signin',
  }
  return request(
    'POST',
    `https://music.163.com/weapi/act/modules/signin/v2/progress`,
    data,
    {
      crypto: 'weapi',
      cookie: query.cookie,
      proxy: query.proxy,
      realIP: query.realIP,
    },
  )
}
