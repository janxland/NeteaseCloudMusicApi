import type { ModuleQuery, ModuleRequest } from '../../types'

// 全部MV

export default (query: ModuleQuery, request: ModuleRequest) => {
  const data: Record<string, any> = {
    tags: JSON.stringify({
      地区: query.area || '全部',
      类型: query.type || '全部',
      排序: query.order || '上升最快',
    }),
    offset: query.offset || 0,
    total: 'true',
    limit: query.limit || 30,
  }
  return request('POST', `https://interface.music.163.com/api/mv/all`, data, {
    crypto: 'weapi',
    cookie: query.cookie,
    proxy: query.proxy,
    realIP: query.realIP,
  })
}
