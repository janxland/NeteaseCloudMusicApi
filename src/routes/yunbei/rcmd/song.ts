import type { ModuleQuery, ModuleRequest } from '../../../types'

// 云贝推歌

export default (query: ModuleQuery, request: ModuleRequest) => {
  const data: Record<string, any> = {
    songId: query.id,
    reason: query.reason || '好歌献给你',
    scene: '',
    fromUserId: -1,
    yunbeiNum: query.yunbeiNum || 10,
  }
  return request(
    'POST',
    `https://music.163.com/weapi/yunbei/rcmd/song/submit`,
    data,
    {
      crypto: 'weapi',
      cookie: query.cookie,
      proxy: query.proxy,
      realIP: query.realIP,
    },
  )
}
