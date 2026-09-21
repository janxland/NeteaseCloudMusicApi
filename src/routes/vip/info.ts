import type { ModuleQuery, ModuleRequest } from '../../types'

// 获取 VIP 信息

export default (query: ModuleQuery, request: ModuleRequest) => {
  return request(
    'POST',
    `https://music.163.com/weapi/music-vip-membership/front/vip/info`,
    {},
    {
      crypto: 'weapi',
      cookie: query.cookie,
      proxy: query.proxy,
      realIP: query.realIP,
    },
  )
}
