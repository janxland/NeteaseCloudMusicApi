import type { ModuleQuery, ModuleRequest } from '../../types'

// 视频标签/分类下的视频

export default (query: ModuleQuery, request: ModuleRequest) => {
  const data: Record<string, any> = {
    groupId: query.id,
    offset: query.offset || 0,
    need_preview_url: 'true',
    total: true,
  }
  return request(
    'POST',
    `https://music.163.com/api/videotimeline/videogroup/otherclient/get`,
    data,
    {
      crypto: 'weapi',
      cookie: query.cookie,
      proxy: query.proxy,
      realIP: query.realIP,
    },
  )
}
