const { DEVICE_COOKIE } = require('../util/client-profile')

module.exports = async (query, request) => {
  const data = {
    key: query.key,
    type: 1,
  }
  try {
    const result = await request(
      'POST',
      `https://music.163.com/weapi/login/qrcode/client/login`,
      data,
      {
        crypto: 'weapi',
        cookie: DEVICE_COOKIE,
        proxy: query.proxy,
        realIP: query.realIP,
      },
    )
    return {
      status: 200,
      body: {
        ...result.body,
        // ';;' 是前端 setCookies 的分隔约定：803 必须让每个 Set-Cookie 各自
        // 落一次 document.cookie，否则只有第一个（且未必是 MUSIC_U）生效。
        cookie: result.cookie.join(';;'),
      },
      cookie: result.cookie,
    }
  } catch (error) {
    // 轮询失败不能抛 404：前端据 body.code 决定是否继续轮询，
    // 抛出会让扫码状态机断链（原实现引用了未定义的 result → ReferenceError）。
    return {
      status: 200,
      body: error.body || {},
      cookie: error.cookie || [],
    }
  }
}
