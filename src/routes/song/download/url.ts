import type { ModuleQuery, ModuleRequest } from '../../../types'

// 获取客户端歌曲下载链接

export default (query: ModuleQuery, request: ModuleRequest) => {
  const data: Record<string, any> = {
    id: query.id,
    br: parseInt(query.br || 999000),
  }
  return request(
    'POST',
    `https://interface.music.163.com/eapi/song/enhance/download/url`,
    data,
    {
      crypto: 'eapi',
      cookie: query.cookie,
      proxy: query.proxy,
      realIP: query.realIP,
      url: '/api/song/enhance/download/url',
    },
  )
}
