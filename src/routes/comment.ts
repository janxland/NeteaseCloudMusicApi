import type { ModuleQuery, ModuleRequest } from '../types'

const { resourceTypeMap } = require('../core/config.json')
// 发送与删除评论

export default (query: ModuleQuery, request: ModuleRequest) => {
  query.cookie.os = 'android'
  query.t = {
    1: 'add',
    0: 'delete',
    2: 'reply',
  }[query.t]
  query.type = resourceTypeMap[query.type]
  const data: Record<string, any> = {
    threadId: query.type + query.id,
  }

  if (query.type == 'A_EV_2_') {
    data.threadId = query.threadId
  }
  if (query.t == 'add') data.content = query.content
  else if (query.t == 'delete') data.commentId = query.commentId
  else if (query.t == 'reply') {
    data.commentId = query.commentId
    data.content = query.content
  }
  return request(
    'POST',
    `https://music.163.com/weapi/resource/comments/${query.t}`,
    data,
    {
      crypto: 'weapi',
      cookie: query.cookie,
      proxy: query.proxy,
      realIP: query.realIP,
    },
  )
}
