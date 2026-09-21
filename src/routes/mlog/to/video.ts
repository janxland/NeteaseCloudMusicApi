import type { ModuleQuery, ModuleRequest } from '../../../types'

// 将mlog id转为video id

export default (query: ModuleQuery, request: ModuleRequest) => {
  const data: Record<string, any> = {
    mlogId: query.id,
  }
  return request(
    'POST',
    `https://music.163.com/weapi/mlog/video/convert/id`,
    data,
    {
      crypto: 'weapi',
      cookie: query.cookie,
      proxy: query.proxy,
      realIP: query.realIP,
    },
  )
}
