import assert from 'node:assert'
import axios from 'axios'

declare const global: typeof globalThis & { host?: string }

describe('测试获取歌曲是否正常', () => {
  it('数据校验', async () => {
    const host = global.host || 'http://127.0.0.1:3000'
    const res = await axios.get(`${host}/song/url`, {
      params: { ...{ id: 462791935, br: 999000 }, realIP: '116.25.146.177' },
      timeout: 30000,
    })
    if (res.status === 200) {
      assert(!!res.data.data[0].url)
    }
  })
})
