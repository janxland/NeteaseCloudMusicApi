import type { ModuleQuery, ModuleRequest } from '../../types'

// 相关视频

export default (query: ModuleQuery, request: ModuleRequest) => {
  const data: Record<string, any> = {
    id: query.id,
    type: /^\d+$/.test(query.id) ? 0 : 1,
  }
  return request(
    'POST',
    `https://music.163.com/weapi/cloudvideo/v1/allvideo/rcmd`,
    data,
    {
      crypto: 'weapi',
      cookie: query.cookie,
      proxy: query.proxy,
      realIP: query.realIP,
    },
  )
}
