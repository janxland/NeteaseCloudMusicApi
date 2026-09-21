// 歌曲上传（/cloud）。原 plugins/songUpload.js 直译。
import axios from 'axios'

import type { ModuleQuery, ModuleRequest } from '../types'

const songUpload = async (query: ModuleQuery, request: ModuleRequest) => {
  let ext = 'mp3'
  if (query.songFile.name.indexOf('flac') > -1) {
    ext = 'flac'
  }
  const filename = query.songFile.name
    .replace('.' + ext, '')
    .replace(/\s/g, '')
    .replace(/\./g, '_')
  //   获取 key 和 token
  const tokenRes = await request('POST', `https://music.163.com/weapi/nos/token/alloc`, {
    bucket: 'jd-musicrep-privatecloud-audio-public',
    ext: ext,
    filename: filename,
    local: false,
    nos_product: 3,
    type: 'audio',
    md5: query.songFile.md5,
  }, { crypto: 'weapi', cookie: query.cookie, proxy: query.proxy })

  // 上传
  const objectKey = tokenRes.body.result.objectKey.replace('/', '%2F')
  try {
    await axios({
      method: 'post',
      url: `http://45.127.129.8/jd-musicrep-privatecloud-audio-public/${objectKey}?offset=0&complete=true&version=1.0`,
      headers: {
        'x-nos-token': tokenRes.body.result.token,
        'Content-MD5': query.songFile.md5,
        'Content-Type': 'audio/mpeg',
        'Content-Length': String(query.songFile.size),
      },
      data: query.songFile.data,
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    })
  } catch (error: any) {
    console.log('error', error.response)
    throw error.response
  }
  return {
    ...tokenRes,
  }
}

export default songUpload
