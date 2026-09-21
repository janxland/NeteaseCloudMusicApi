import type { ModuleQuery, ModuleRequest } from '../../types'

// 曲风-歌曲

export default (query: ModuleQuery, request: ModuleRequest) => {
  const data: Record<string, any> = {
    cursor: query.cursor || 0,
    size: query.size || 20,
    tagId: query.tagId,
    sort: query.sort || 0,
  }
  return request(
    'POST',
    `https://music.163.com/api/style-tag/home/song`,
    data,
    {
      crypto: 'weapi',
      cookie: query.cookie,
      proxy: query.proxy,
      realIP: query.realIP,
    },
  )
}
