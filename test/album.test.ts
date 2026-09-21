import assert from 'node:assert'
import axios from 'axios'

declare const global: typeof globalThis & { host?: string }

describe('测试获取歌手专辑列表是否正常', () => {
  it('数据校验', async () => {
    const host = global.host || 'http://127.0.0.1:3000'
    const res = await axios.get(`${host}/album`, {
      params: { ...{ id: 32311 }, realIP: '116.25.146.177' },
      timeout: 30000,
    })
    if (res.status === 200) {
      assert(res.data.code === 200)
    }
  })
})
