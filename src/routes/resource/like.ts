import type { ModuleQuery, ModuleRequest } from '../../types'

// 点赞与取消点赞资源
const { resourceTypeMap } = require('../../core/config.json')
export default (query: ModuleQuery, request: ModuleRequest) => {
  query.cookie.os = 'android'
  query.t = query.t == 1 ? 'like' : 'unlike'
  query.type = resourceTypeMap[query.type]
  const data: Record<string, any> = {
    threadId: query.type + query.id,
  }
  if (query.type === 'A_EV_2_') {
    data.threadId = query.threadId
  }
  return request(
    'POST',
    `https://music.163.com/weapi/resource/${query.t}`,
    data,
    {
      crypto: 'weapi',
      cookie: query.cookie,
      proxy: query.proxy,
      realIP: query.realIP,
    },
  )
}
