import type { ModuleQuery, ModuleRequest } from '../../types'

// 关注TA的人(粉丝)

export default (query: ModuleQuery, request: ModuleRequest) => {
  const data: Record<string, any> = {
    userId: query.uid,
    time: '0',
    limit: query.limit || 30,
    offset: query.offset || 0,
    getcounts: 'true',
  }
  return request(
    'POST',
    `https://music.163.com/eapi/user/getfolloweds/${query.uid}`,
    data,
    {
      crypto: 'eapi',
      cookie: query.cookie,
      proxy: query.proxy,
      url: '/api/user/getfolloweds',
      realIP: query.realIP,
    },
  )
}
