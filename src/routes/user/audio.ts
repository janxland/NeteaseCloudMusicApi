import type { ModuleQuery, ModuleRequest } from '../../types'

// 用户创建的电台

export default (query: ModuleQuery, request: ModuleRequest) => {
  const data: Record<string, any> = {
    userId: query.uid,
  }
  return request(
    'POST',
    `https://music.163.com/weapi/djradio/get/byuser`,
    data,
    {
      crypto: 'weapi',
      cookie: query.cookie,
      proxy: query.proxy,
      realIP: query.realIP,
    },
  )
}
