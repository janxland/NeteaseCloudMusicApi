import type { ModuleQuery, ModuleRequest } from '../../types'

// 分享歌曲到动态

export default (query: ModuleQuery, request: ModuleRequest) => {
  const data: Record<string, any> = {
    type: query.type || 'song', // song,playlist,mv,djprogram,djradio,noresource
    msg: query.msg || '',
    id: query.id || '',
  }
  return request(
    'POST',
    `https://music.163.com/weapi/share/friends/resource`,
    data,
    {
      crypto: 'weapi',
      cookie: query.cookie,
      proxy: query.proxy,
      realIP: query.realIP,
    },
  )
}
