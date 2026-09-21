import type { ModuleQuery, ModuleRequest } from '../../types'

// MV链接

export default (query: ModuleQuery, request: ModuleRequest) => {
  const data: Record<string, any> = {
    id: query.id,
    r: query.r || 1080,
  }
  return request(
    'POST',
    `https://music.163.com/weapi/song/enhance/play/mv/url`,
    data,
    {
      crypto: 'weapi',
      cookie: query.cookie,
      proxy: query.proxy,
      realIP: query.realIP,
    },
  )
}
