import type { ModuleQuery, ModuleRequest } from '../../../types'

// 一起听创建房间

export default (query: ModuleQuery, request: ModuleRequest) => {
  const data: Record<string, any> = {
    refer: 'songplay_more',
  }
  return request(
    'POST',
    `http://interface.music.163.com/eapi/listen/together/room/create`,
    data,
    {
      crypto: 'eapi',
      cookie: query.cookie,
      proxy: query.proxy,
      realIP: query.realIP,
      url: '/api/listen/together/room/create',
    },
  )
}
