// 通用小工具（原 util/index.js 的 toBoolean / getRandom；cookieToJson 在 core/cookies.ts）

/** 表单/查询串的布尔语义：'' 原样返回，'true' / '1' 为真 */
export const toBoolean = (val: unknown): boolean | string | unknown => {
  if (typeof val === 'boolean') return val
  if (val === '') return val
  return val === 'true' || val == '1'
}

/** 与旧实现一致的随机整数（用于 requestId 之类的噪声字段） */
export const getRandom = (num: number): number =>
  Math.floor((Math.random() + Math.floor(Math.random() * 9 + 1)) * Math.pow(10, num - 1))

export default { toBoolean, getRandom }
