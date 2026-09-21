import type { ModuleQuery, ModuleRequest } from '../../types'

// 默认搜索关键词

export default (query: ModuleQuery, request: ModuleRequest) => {
  return request(
    'POST',
    `https://interface3.music.163.com/eapi/search/defaultkeyword/get`,
    {},
    {
      crypto: 'eapi',
      cookie: query.cookie,
      proxy: query.proxy,
      url: '/api/search/defaultkeyword/get',
      realIP: query.realIP,
    },
  )
}
