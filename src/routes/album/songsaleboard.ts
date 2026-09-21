import type { ModuleQuery, ModuleRequest } from '../../types'

// 数字专辑&数字单曲-榜单
export default (query: ModuleQuery, request: ModuleRequest) => {
  let data: Record<string, any> = {
    albumType: query.albumType || 0, //0为数字专辑,1为数字单曲
  }
  const type = query.type || 'daily' // daily,week,year,total
  if (type === 'year') {
    data = {
      ...data,
      year: query.year,
    }
  }
  return request(
    'POST',
    `https://music.163.com/api/feealbum/songsaleboard/${type}/type`,
    data,
    {
      crypto: 'weapi',
      cookie: query.cookie,
      proxy: query.proxy,
      realIP: query.realIP,
    },
  )
}
