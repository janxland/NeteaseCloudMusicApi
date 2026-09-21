import type { ModuleQuery, ModuleRequest } from '../../../types'

// MV 点赞转发评论数数据

export default (query: ModuleQuery, request: ModuleRequest) => {
  const data: Record<string, any> = {
    threadid: `R_MV_5_${query.mvid}`,
    composeliked: true,
  }
  return request(
    'POST',
    `https://music.163.com/api/comment/commentthread/info`,
    data,
    {
      crypto: 'weapi',
      cookie: query.cookie,
      proxy: query.proxy,
      realIP: query.realIP,
    },
  )
}
