// Cookie 解析 / 回写：与 server.js 的解析器逐字对齐（按首个 '=' 切分、safe-decode）
import decode from 'safe-decode-uri-component'

import type { CookieJar } from '../types'

/** 请求头 Cookie -> jar。与 util/index.js:cookieToJson 语义一致 */
export const parseCookieHeader = (header?: string): CookieJar => {
  const jar: CookieJar = {}
  if (!header) return jar
  for (const pair of header.split(/;\s+|(?<!\s)\s+$/g)) {
    const crack = pair.indexOf('=')
    if (crack < 1 || crack == pair.length - 1) continue
    const k = decode(pair.slice(0, crack)).trim()
    jar[k] = decode(pair.slice(crack + 1)).trim()
  }
  return jar
}

/** 字符串形式的 cookie 参数 -> jar（module 侧约定：cookie 可以是 "A=1; B=2"） */
export const cookieToJson = (cookie?: string): CookieJar => {
  const obj: CookieJar = {}
  if (!cookie) return obj
  for (const segment of String(cookie).split(';')) {
    const idx = segment.indexOf('=')
    if (idx <= 0) continue
    const name = segment.slice(0, idx).trim()
    const value = segment.slice(idx + 1).trim()
    if (name) obj[name] = value
  }
  return obj
}

/**
 * 回写上游 Set-Cookie。
 * 扫码登录 802->803 的状态推进完全依赖这条链，任何"统一响应封装"都会把它切断。
 */
export const echoCookies = (
  append: (values: string[]) => unknown,
  cookies: unknown,
  protocol: string,
) => {
  if (!Array.isArray(cookies) || cookies.length === 0) return
  if (protocol === 'https') {
    // CORS SameSite：https 下必须带 Secure，否则浏览器不回传
    append(cookies.map((c) => `${c}; SameSite=None; Secure`))
  } else {
    append(cookies)
  }
}
