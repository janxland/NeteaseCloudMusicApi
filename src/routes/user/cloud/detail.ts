import type { ModuleQuery, ModuleRequest } from '../../../types'

// 云盘数据详情

export default (query: ModuleQuery, request: ModuleRequest) => {
  const id = query.id.replace(/\s/g, '').split(',')
  const data: Record<string, any> = {
    songIds: id,
  }
  return request(
    'POST',
    `https://music.163.com/weapi/v1/cloud/get/byids`,
    data,
    {
      crypto: 'weapi',
      cookie: query.cookie,
      proxy: query.proxy,
      realIP: query.realIP,
    },
  )
}
