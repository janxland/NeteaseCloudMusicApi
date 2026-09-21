// 多源扇出（qq / kugou）的公共工具。原 util/base.js 直译；
// 浏览器专属的 window 分支在 Node 侧不可达，保留签名但不再引用 window。
import axios from 'axios'

// 浏览器专属：Node 侧永不可达，仅保留原签名
declare const window: { location: { href: string } } | undefined

export const getParameterByName = (name: string, url?: string): string | null => {
  if (!url) {
    if (typeof window === 'undefined') return null
    url = window.location.href
  }
  name = name.replace(/[[\]]/g, '\\$&')
  const regex = new RegExp(`[?&]${name}(=([^&#]*)|&|#|$)`)

  const results = regex.exec(url)
  if (!results) return null
  if (!results[2]) return ''
  return decodeURIComponent(results[2].replace(/\+/g, ' '))
}

export const getQueryFromUrl = (
  key?: string,
  search?: string,
): Record<string, any> | string | undefined => {
  try {
    const sArr = String(search).split('?')
    let s = ''
    if (sArr.length > 1) {
      s = sArr[1]
    } else {
      return key ? undefined : {}
    }
    const querys = s.split('&')
    const result: Record<string, any> = {}
    querys.forEach((item) => {
      const temp = item.split('=')
      result[temp[0]] = decodeURIComponent(temp[1])
    })
    return key ? result[key] : result
  } catch {
    // 除去 search 为空等异常
    return key ? '' : {}
  }
}

export const changeUrlQuery = (obj: Record<string, any>, baseUrl: string): string => {
  const query = getQueryFromUrl(undefined, baseUrl) as Record<string, any>
  const url = baseUrl.split('?')[0]

  const newQuery = { ...query, ...obj }
  const queryArr: string[] = []
  Object.keys(newQuery).forEach((key) => {
    if (newQuery[key] !== undefined && newQuery[key] !== '') {
      queryArr.push(`${key}=${encodeURIComponent(newQuery[key])}`)
    }
  })
  return `${url}?${queryArr.join('&')}`.replace(/\?$/, '')
}

export { axios }
export default { getParameterByName, getQueryFromUrl, changeUrlQuery, axios }
