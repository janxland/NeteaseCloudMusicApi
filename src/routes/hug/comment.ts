import type { ModuleQuery, ModuleRequest } from '../../types'

const { resourceTypeMap } = require('../../core/config.json')
export default (query: ModuleQuery, request: ModuleRequest) => {
  query.cookie.os = 'ios'
  query.cookie.appver = '8.7.01'
  query.type = resourceTypeMap[query.type || 0]
  const threadId = query.type + query.sid
  const data: Record<string, any> = {
    targetUserId: query.uid,
    commentId: query.cid,
    threadId: threadId,
  }
  return request(
    'POST',
    `https://music.163.com/api/v2/resource/comments/hug/listener`,
    data,
    {
      crypto: 'api',
      cookie: query.cookie,
      proxy: query.proxy,
      realIP: query.realIP,
    },
  )
}
