import type { ModuleQuery, ModuleRequest } from '../../types'

// 校验验证码

export default (query: ModuleQuery, request: ModuleRequest) => {
  const data: Record<string, any> = {
    ctcode: query.ctcode || '86',
    cellphone: query.phone,
    captcha: query.captcha,
  }
  return request(
    'POST',
    `https://music.163.com/weapi/sms/captcha/verify`,
    data,
    {
      crypto: 'weapi',
      cookie: query.cookie,
      proxy: query.proxy,
      realIP: query.realIP,
    },
  )
}
