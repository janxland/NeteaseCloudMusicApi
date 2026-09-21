import type { ModuleQuery, ModuleRequest } from '../../types'

// 评论

export default (query: ModuleQuery, request: ModuleRequest) => {
  const data: Record<string, any> = {
    beforeTime: query.before || '-1',
    limit: query.limit || 30,
    total: 'true',
    uid: query.uid,
  }

  return request(
    'POST',
    `https://music.163.com/api/v1/user/comments/${query.uid}`,
    data,
    {
      crypto: 'weapi',
      cookie: query.cookie,
      proxy: query.proxy,
      realIP: query.realIP,
    },
  )
}
