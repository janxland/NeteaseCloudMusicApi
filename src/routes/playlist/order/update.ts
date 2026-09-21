import type { ModuleQuery, ModuleRequest } from '../../../types'

// 编辑歌单顺序

export default (query: ModuleQuery, request: ModuleRequest) => {
  query.cookie.os = 'pc'
  const data: Record<string, any> = {
    ids: query.ids,
  }
  return request(
    'POST',
    `https://music.163.com/api/playlist/order/update`,
    data,
    {
      crypto: 'weapi',
      cookie: query.cookie,
      proxy: query.proxy,
      realIP: query.realIP,
    },
  )
}
