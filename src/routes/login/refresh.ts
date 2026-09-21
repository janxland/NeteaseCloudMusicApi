import type { ModuleQuery, ModuleRequest } from '../../types'

// 登录刷新

export default async (query: ModuleQuery, request: ModuleRequest) => {
  let result: any = await request(
    'POST',
    `https://music.163.com/weapi/login/token/refresh`,
    {},
    {
      crypto: 'weapi',
      ua: 'pc',
      cookie: query.cookie,
      proxy: query.proxy,
      realIP: query.realIP,
    },
  )
  if (result.body.code === 200) {
    result = {
      status: 200,
      body: {
        ...result.body,
        cookie: result.cookie.join(';'),
      },
      cookie: result.cookie,
    }
  }
  return result
}
