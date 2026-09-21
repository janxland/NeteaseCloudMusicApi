import type { ModuleQuery, ModuleRequest } from '../../types'

const { resourceTypeMap } = require('../../core/config.json')
// 热门评论

export default (query: ModuleQuery, request: ModuleRequest) => {
  query.cookie.os = 'pc'
  query.type = resourceTypeMap[query.type]
  const data: Record<string, any> = {
    rid: query.id,
    limit: query.limit || 20,
    offset: query.offset || 0,
    beforeTime: query.before || 0,
  }
  return request(
    'POST',
    `https://music.163.com/weapi/v1/resource/hotcomments/${query.type}${query.id}`,
    data,
    {
      crypto: 'weapi',
      cookie: query.cookie,
      proxy: query.proxy,
      realIP: query.realIP,
    },
  )
}
