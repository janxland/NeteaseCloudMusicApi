import type { ModuleQuery, ModuleRequest } from '../../../types'

export default async (query: ModuleQuery, request: ModuleRequest) => {
  const data: Record<string, any> = {
    type: 1,
  }
  const result = await request(
    'POST',
    `https://music.163.com/weapi/login/qrcode/unikey`,
    data,
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
      data: result.body,
      code: 200,
    },
    cookie: result.cookie,
  }
}
