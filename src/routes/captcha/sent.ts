import type { ModuleQuery, ModuleRequest } from '../../types'

// 发送验证码

export default (query: ModuleQuery, request: ModuleRequest) => {
  const data: Record<string, any> = {
    ctcode: query.ctcode || '86',
    cellphone: query.phone,
  }
  return request('POST', `https://music.163.com/api/sms/captcha/sent`, data, {
    crypto: 'weapi',
    cookie: query.cookie,
    proxy: query.proxy,
    realIP: query.realIP,
  })
}
