import type { ModuleQuery, ModuleRequest } from '../../types'

// 歌手介绍

export default (query: ModuleQuery, request: ModuleRequest) => {
  const data: Record<string, any> = {
    id: query.id,
  }
  return request(
    'POST',
    `https://music.163.com/weapi/artist/introduction`,
    data,
    {
      crypto: 'weapi',
      cookie: query.cookie,
      proxy: query.proxy,
      realIP: query.realIP,
    },
  )
}
