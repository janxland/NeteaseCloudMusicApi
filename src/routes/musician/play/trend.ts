import type { ModuleQuery, ModuleRequest } from '../../../types'

// 音乐人歌曲播放趋势

export default (query: ModuleQuery, request: ModuleRequest) => {
  const data: Record<string, any> = {
    startTime: query.startTime,
    endTime: query.endTime,
  }
  return request(
    'POST',
    `https://music.163.com/weapi/creator/musician/play/count/statistic/data/trend/get`,
    data,
    {
      crypto: 'weapi',
      cookie: query.cookie,
      proxy: query.proxy,
      realIP: query.realIP,
    },
  )
}
