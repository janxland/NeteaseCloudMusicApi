import type { ModuleQuery, ModuleRequest } from '../../types'

// 曲风偏好

export default (query: ModuleQuery, request: ModuleRequest) => {
  const data: Record<string, any> = {}
  return request(
    'POST',
    `https://music.163.com/api/tag/my/preference/get`,
    data,
    {
      crypto: 'weapi',
      cookie: query.cookie,
      proxy: query.proxy,
      realIP: query.realIP,
    },
  )
}
