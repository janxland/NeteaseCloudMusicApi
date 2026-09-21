import type { ModuleQuery, ModuleRequest } from '../../../types'

const QRCode = require('qrcode')

export default (query: ModuleQuery, request: ModuleRequest) => {
  return new Promise(async (resolve) => {
    const url = `https://music.163.com/login?codekey=${query.key}`
    return resolve({
      code: 200,
      status: 200,
      body: {
        code: 200,
        data: {
          qrurl: url,
          qrimg: query.qrimg ? await QRCode.toDataURL(url) : '',
        },
      },
    })
  })
}
