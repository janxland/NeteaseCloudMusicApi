module.exports = {
  toBoolean(val) {
    if (typeof val === 'boolean') return val
    if (val === '') return val
    return val === 'true' || val == '1'
  },
  cookieToJson(cookie) {
    if (!cookie) return {}
    // 按首个 '=' 切分：base64 值本身可能含 '='，用 split('=')[1] 会截断
    const obj = {}
    for (const segment of String(cookie).split(';')) {
      const idx = segment.indexOf('=')
      if (idx <= 0) continue
      const name = segment.slice(0, idx).trim()
      const value = segment.slice(idx + 1).trim()
      if (name) obj[name] = value
    }
    return obj
  },
  getRandom(num) {
    var random = Math.floor(
      (Math.random() + Math.floor(Math.random() * 9 + 1)) *
        Math.pow(10, num - 1),
    )
    return random
  },
}
