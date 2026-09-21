import type { ModuleQuery, ModuleRequest } from '../../../types'

// 歌手粉丝数量

export default (query: ModuleQuery, request: ModuleRequest) => {
  const data: Record<string, any> = {
    id: query.id,
  }
  return request(
    'POST',
    `https://music.163.com/weapi/artist/follow/count/get`,
    data,
    {
      crypto: 'weapi',
      cookie: query.cookie,
      proxy: query.proxy,
      realIP: query.realIP,
    },
  )
}
