import type { ModuleQuery, ModuleRequest } from '../../types'

// 视频链接

export default (query: ModuleQuery, request: ModuleRequest) => {
  const data: Record<string, any> = {
    ids: '["' + query.id + '"]',
    resolution: query.res || 1080,
  }
  return request(
    'POST',
    `https://music.163.com/weapi/cloudvideo/playurl`,
    data,
    {
      crypto: 'weapi',
      cookie: query.cookie,
      proxy: query.proxy,
      realIP: query.realIP,
    },
  )
}
