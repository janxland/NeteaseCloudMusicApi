import type { ModuleQuery, ModuleRequest } from '../../../types'

// 音乐人数据概况

export default (query: ModuleQuery, request: ModuleRequest) => {
  const data: Record<string, any> = {}
  return request(
    'POST',
    `https://music.163.com/weapi/creator/musician/statistic/data/overview/get`,
    data,
    {
      crypto: 'weapi',
      cookie: query.cookie,
      proxy: query.proxy,
      realIP: query.realIP,
    },
  )
}
