import type { ModuleQuery, ModuleRequest } from '../../../types'

// 全部视频列表

export default (query: ModuleQuery, request: ModuleRequest) => {
  const data: Record<string, any> = {
    groupId: 0,
    offset: query.offset || 0,
    need_preview_url: 'true',
    total: true,
  }
  //   /api/videotimeline/otherclient/get
  return request(
    'POST',
    `https://music.163.com/api/videotimeline/otherclient/get`,
    data,
    {
      crypto: 'weapi',
      cookie: query.cookie,
      proxy: query.proxy,
      realIP: query.realIP,
    },
  )
}
