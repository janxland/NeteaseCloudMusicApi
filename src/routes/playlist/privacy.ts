import type { ModuleQuery, ModuleRequest } from '../../types'

// 公开隐私歌单

export default (query: ModuleQuery, request: ModuleRequest) => {
  const data: Record<string, any> = {
    id: query.id,
    privacy: 0,
  }
  return request(
    'POST',
    `https://interface.music.163.com/eapi/playlist/update/privacy`,
    data,
    {
      crypto: 'eapi',
      cookie: query.cookie,
      proxy: query.proxy,
      realIP: query.realIP,
      url: '/api/playlist/update/privacy',
    },
  )
}
