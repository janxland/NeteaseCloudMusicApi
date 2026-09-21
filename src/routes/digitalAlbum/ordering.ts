import type { ModuleQuery, ModuleRequest } from '../../types'

// 购买数字专辑

export default (query: ModuleQuery, request: ModuleRequest) => {
  const data: Record<string, any> = {
    business: 'Album',
    paymentMethod: query.payment,
    digitalResources: JSON.stringify([
      {
        business: 'Album',
        resourceID: query.id,
        quantity: query.quantity,
      },
    ]),
    from: 'web',
  }
  return request(
    'POST',
    `https://music.163.com/api/ordering/web/digital`,
    data,
    {
      crypto: 'weapi',
      cookie: query.cookie,
      proxy: query.proxy,
      realIP: query.realIP,
    },
  )
}
