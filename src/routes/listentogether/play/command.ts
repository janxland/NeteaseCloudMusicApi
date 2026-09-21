import type { ModuleQuery, ModuleRequest } from '../../../types'

// 一起听 发送播放状态

export default (query: ModuleQuery, request: ModuleRequest) => {
  const data: Record<string, any> = {
    roomId: query.roomId,
    commandInfo: JSON.stringify({
      commandType: query.commandType,
      progress: query.progress || 0,
      playStatus: query.playStatus,
      formerSongId: query.formerSongId,
      targetSongId: query.targetSongId,
      clientSeq: query.clientSeq,
    }),
  }
  return request(
    'POST',
    `http://interface.music.163.com/eapi/listen/together/play/command/report`,
    data,
    {
      crypto: 'eapi',
      cookie: query.cookie,
      proxy: query.proxy,
      realIP: query.realIP,
      url: '/api/listen/together/play/command/report',
    },
  )
}
