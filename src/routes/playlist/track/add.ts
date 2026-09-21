import type { ModuleQuery, ModuleRequest } from '../../../types'

export default async (query: ModuleQuery, request: ModuleRequest) => {
  query.cookie.os = 'pc'
  query.ids = query.ids || ''
  const data: Record<string, any> = {
    id: query.pid,
    tracks: JSON.stringify(
      query.ids.split(',').map((item) => {
        return { type: 3, id: item }
      }),
    ),
  }
  console.log(data)

  return request('POST', `https://music.163.com/api/playlist/track/add`, data, {
    crypto: 'weapi',
    cookie: query.cookie,
    proxy: query.proxy,
    realIP: query.realIP,
  })
}
