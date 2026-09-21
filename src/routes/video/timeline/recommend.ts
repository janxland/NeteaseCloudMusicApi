import type { ModuleQuery, ModuleRequest } from '../../../types'

// 推荐视频

export default (query: ModuleQuery, request: ModuleRequest) => {
  const data: Record<string, any> = {
    offset: query.offset || 0,
    filterLives: '[]',
    withProgramInfo: 'true',
    needUrl: '1',
    resolution: '480',
  }
  return request('POST', `https://music.163.com/api/videotimeline/get`, data, {
    crypto: 'weapi',
    cookie: query.cookie,
    proxy: query.proxy,
    realIP: query.realIP,
  })
}
