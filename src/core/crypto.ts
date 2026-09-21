// 网易云四种加密（weapi / linuxapi / eapi）。原 util/crypto.js 直译，算法与常量不得改动。
import crypto from 'node:crypto'

const iv = Buffer.from('0102030405060708')
const presetKey = Buffer.from('0CoJUm6Qyw8W8jud')
const linuxapiKey = Buffer.from('rFgB&h#%2?^eDg:Q')
const base62 = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
const publicKey =
  '-----BEGIN PUBLIC KEY-----\nMIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDgtQn2JZ34ZC28NWYpAUd98iZ37BUrX/aKzmFbt7clFSs6sXqHauqKWqdtLkF2KexO40H1YTX8z2lSgBBOAxLsvaklV8k4cBFK9snQXE9/DDaFt6Rr7iVZMldczhC0JNgTz+SHXT6CBHuX3e9SdB1Ua44oncaTWz7OBGLbCiK45wIDAQAB\n-----END PUBLIC KEY-----'
const eapiKey = 'e82ckenh8dichen8'

const aesEncrypt = (
  buffer: Buffer,
  mode: string,
  key: Buffer | string,
  ivOrEmpty: Buffer | string,
): Buffer => {
  const cipher = crypto.createCipheriv('aes-128-' + mode, key, ivOrEmpty)
  return Buffer.concat([cipher.update(buffer), cipher.final()])
}

const rsaEncrypt = (buffer: Buffer, key: string): Buffer => {
  const padded = Buffer.concat([Buffer.alloc(128 - buffer.length), buffer])
  return crypto.publicEncrypt(
    { key, padding: crypto.constants.RSA_NO_PADDING },
    padded,
  )
}

export const weapi = (object: unknown): { params: string; encSecKey: string } => {
  const text = JSON.stringify(object)
  const secretKey = crypto
    .randomBytes(16)
    // charCodeAt() 无参等价于 charCodeAt(0)：取该 base62 字符的字节码
    .map((n) => base62.charAt(n % 62).charCodeAt(0))
  return {
    params: aesEncrypt(
      Buffer.from(aesEncrypt(Buffer.from(text), 'cbc', presetKey, iv).toString('base64')),
      'cbc',
      Buffer.from(secretKey),
      iv,
    ).toString('base64'),
    encSecKey: rsaEncrypt(Buffer.from(secretKey.reverse()), publicKey).toString('hex'),
  }
}

export const linuxapi = (object: unknown): { eparams: string } => {
  const text = JSON.stringify(object)
  return {
    eparams: aesEncrypt(Buffer.from(text), 'ecb', linuxapiKey, '')
      .toString('hex')
      .toUpperCase(),
  }
}

export const eapi = (url: string, object: unknown): { params: string } => {
  const text = typeof object === 'object' ? JSON.stringify(object) : String(object)
  const message = `nobody${url}use${text}md5forencrypt`
  const digest = crypto.createHash('md5').update(message).digest('hex')
  const data = `${url}-36cd479b6b5-${text}-36cd479b6b5-${digest}`
  return {
    params: aesEncrypt(Buffer.from(data), 'ecb', eapiKey, '')
      .toString('hex')
      .toUpperCase(),
  }
}

export const decrypt = (cipherBuffer: Buffer): Buffer => {
  const decipher = crypto.createDecipheriv('aes-128-ecb', eapiKey, '')
  return Buffer.concat([decipher.update(cipherBuffer), decipher.final()])
}

export default { weapi, linuxapi, eapi, decrypt }
