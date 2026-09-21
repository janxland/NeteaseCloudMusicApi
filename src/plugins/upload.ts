// 图片上传（/avatar/upload、/playlist/cover/update 共用）。原 plugins/upload.js 直译。
import axios from 'axios'

import type { ModuleQuery, ModuleRequest } from '../types'

export interface UploadResult {
  url_pre: string
  url: string
  imgId: string
}

const upload = async (query: ModuleQuery, request: ModuleRequest): Promise<UploadResult> => {
  const data = {
    bucket: 'yyimgs',
    ext: 'jpg',
    filename: query.imgFile.name,
    local: false,
    nos_product: 0,
    return_body: `{"code":200,"size":"$(ObjectSize)"}`,
    type: 'other',
  }
  //   获取 key 和 token
  const res = await request('POST', `https://music.163.com/weapi/nos/token/alloc`, data, {
    crypto: 'weapi',
    cookie: query.cookie,
    proxy: query.proxy,
  })
  //   上传图片
  await axios({
    method: 'post',
    url: `https://nosup-hz1.127.net/yyimgs/${res.body.result.objectKey}?offset=0&complete=true&version=1.0`,
    headers: {
      'x-nos-token': res.body.result.token,
      'Content-Type': 'image/jpeg',
    },
    data: query.imgFile.data,
  })
  //   获取裁剪后图片的 id
  const imgSize = query.imgSize || 300
  const imgX = query.imgX || 0
  const imgY = query.imgY || 0
  const res3 = await request(
    'POST',
    `https://music.163.com/upload/img/op?id=${res.body.result.docId}&op=${imgX}y${imgY}y${imgSize}y${imgSize}`,
    {},
    { crypto: 'weapi', cookie: query.cookie, proxy: query.proxy },
  )

  return {
    url_pre: 'https://p1.music.126.net/' + res.body.result.objectKey,
    url: res3.body.url,
    imgId: res3.body.id,
  }
}

export default upload
