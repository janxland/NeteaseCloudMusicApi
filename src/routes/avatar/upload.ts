import type { ModuleQuery, ModuleRequest } from '../../types'

import uploadPlugin from '../../plugins/upload'
export default async (query: ModuleQuery, request: ModuleRequest) => {
  const uploadInfo = await uploadPlugin(query, request)
  const res = await request(
    'POST',
    `https://music.163.com/weapi/user/avatar/upload/v1`,
    {
      imgid: uploadInfo.imgId,
    },
    {
      crypto: 'weapi',
      cookie: query.cookie,
      proxy: query.proxy,
      realIP: query.realIP,
    },
  )
  return {
    status: 200,
    body: {
      code: 200,
      data: {
        ...uploadInfo,
        ...res.body,
      },
    },
  }
}
