import type { ModuleQuery, ModuleRequest } from '../../types'

// 多类型搜索

export default (query: ModuleQuery, request: ModuleRequest) => {
  const data: Record<string, any> = {
    type: query.type || 1,
    s: query.keywords || '',
  }
  return request(
    'POST',
    `https://music.163.com/weapi/search/suggest/multimatch`,
    data,
    {
      crypto: 'weapi',
      cookie: query.cookie,
      proxy: query.proxy,
      realIP: query.realIP,
    },
  )
}
