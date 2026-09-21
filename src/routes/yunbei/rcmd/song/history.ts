import type { ModuleQuery, ModuleRequest } from '../../../../types'

// 云贝推歌历史记录

export default (query: ModuleQuery, request: ModuleRequest) => {
  const data: Record<string, any> = {
    page: JSON.stringify({
      size: query.size || 20,
      cursor: query.cursor || '',
    }),
  }
  return request(
    'POST',
    `https://music.163.com/weapi/yunbei/rcmd/song/history/list`,
    data,
    {
      crypto: 'weapi',
      cookie: query.cookie,
      proxy: query.proxy,
      realIP: query.realIP,
    },
  )
}
