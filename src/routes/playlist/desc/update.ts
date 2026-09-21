import type { ModuleQuery, ModuleRequest } from '../../../types'

// 更新歌单描述

export default (query: ModuleQuery, request: ModuleRequest) => {
  const data: Record<string, any> = {
    id: query.id,
    desc: query.desc,
  }
  return request(
    'POST',
    `https://interface3.music.163.com/eapi/playlist/desc/update`,
    data,
    {
      crypto: 'eapi',
      cookie: query.cookie,
      proxy: query.proxy,
      url: '/api/playlist/desc/update',
      realIP: query.realIP,
    },
  )
}
