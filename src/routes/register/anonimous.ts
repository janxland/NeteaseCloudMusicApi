import type { ModuleQuery, ModuleRequest } from '../../types'

// 游客登录

export default async (query: ModuleQuery, request: ModuleRequest) => {
  query.cookie.os = 'iOS'
  const data: Record<string, any> = {
    /* A base64 encoded string. */
    username:
      'MzEwMjcwYmY0Y2Y0ODcwMzU0ZDFkZmIxMmMzMGYyMTkgVlBaanMwNmtrb1BYMGxOVzVUMUJ3Zz09',
  }
  let result: any = await request(
    'POST',
    `https://music.163.com/api/register/anonimous`,
    data,
    {
      crypto: 'weapi',
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
