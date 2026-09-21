import type { ModuleQuery, ModuleRequest } from '../../types'

export default (query: ModuleQuery, request: ModuleRequest) => {
  const data: Record<string, any> = {
    nickname: query.nickname,
  }
  return request(
    'POST',
    `https://music.163.com/api/nickname/duplicated`,
    data,
    {
      crypto: 'weapi',
      cookie: query.cookie,
      proxy: query.proxy,
      realIP: query.realIP,
    },
  )
}
