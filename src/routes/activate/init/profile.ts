import type { ModuleQuery, ModuleRequest } from '../../../types'

// 初始化名字

export default (query: ModuleQuery, request: ModuleRequest) => {
  const data: Record<string, any> = {
    nickname: query.nickname,
  }
  return request(
    'POST',
    `https://music.163.com/eapi/activate/initProfile`,
    data,
    {
      crypto: 'eapi',
      cookie: query.cookie,
      proxy: query.proxy,
      realIP: query.realIP,
      url: '/api/activate/initProfile',
    },
  )
}
