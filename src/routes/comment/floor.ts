import type { ModuleQuery, ModuleRequest } from '../../types'

const { resourceTypeMap } = require('../../core/config.json')
export default (query: ModuleQuery, request: ModuleRequest) => {
  query.type = resourceTypeMap[query.type]
  const data: Record<string, any> = {
    parentCommentId: query.parentCommentId,
    threadId: query.type + query.id,
    time: query.time || -1,
    limit: query.limit || 20,
  }
  return request(
    'POST',
    `https://music.163.com/api/resource/comment/floor/get`,
    data,
    {
      crypto: 'weapi',
      cookie: query.cookie,
      proxy: query.proxy,
      realIP: query.realIP,
    },
  )
}
