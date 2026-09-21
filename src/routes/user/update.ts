import type { ModuleQuery, ModuleRequest } from '../../types'

// 编辑用户信息

export default (query: ModuleQuery, request: ModuleRequest) => {
  const data: Record<string, any> = {
    avatarImgId: '0',
    birthday: query.birthday,
    city: query.city,
    gender: query.gender,
    nickname: query.nickname,
    province: query.province,
    signature: query.signature,
  }
  return request(
    'POST',
    `https://music.163.com/weapi/user/profile/update`,
    data,
    {
      crypto: 'weapi',
      cookie: query.cookie,
      proxy: query.proxy,
      realIP: query.realIP,
    },
  )
}
