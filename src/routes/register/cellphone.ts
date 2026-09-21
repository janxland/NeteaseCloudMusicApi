import type { ModuleQuery, ModuleRequest } from '../../types'

// 注册账号
const crypto = require('node:crypto')

export default (query: ModuleQuery, request: ModuleRequest) => {
  query.cookie.os = 'pc'
  const data: Record<string, any> = {
    captcha: query.captcha,
    phone: query.phone,
    password: crypto.createHash('md5').update(query.password).digest('hex'),
    nickname: query.nickname,
    countrycode: query.countrycode || '86',
  }
  return request('POST', `https://music.163.com/api/register/cellphone`, data, {
    crypto: 'weapi',
    cookie: query.cookie,
    proxy: query.proxy,
    realIP: query.realIP,
  })
}
