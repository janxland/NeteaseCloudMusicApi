import type { ModuleQuery, ModuleRequest } from '../../types'

// 搜索建议

export default (query: ModuleQuery, request: ModuleRequest) => {
  const data: Record<string, any> = {
    s: query.keywords || '',
  }
  let type: any = query.type == 'mobile' ? 'keyword' : 'web'
  return request(
    'POST',
    `https://music.163.com/weapi/search/suggest/` + type,
    data,
    {
      crypto: 'weapi',
      cookie: query.cookie,
      proxy: query.proxy,
      realIP: query.realIP,
    },
  )
}
