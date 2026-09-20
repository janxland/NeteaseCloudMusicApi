// apicache 的存储层。上游实现只有 TTL 淘汰、无容量上限：按账号分桶后
// 每个登录账号都会复制一份完整响应体，高基数 key 下内存单调增长。
// 这里补两道闸：条目数上限（LRU 驱逐）+ 单条目字节上限（超限直接不缓存）。
const DEFAULT_MAX_ENTRIES = 500
const DEFAULT_MAX_VALUE_BYTES = 2 * 1024 * 1024

function maxEntries() {
  const n = Number(process.env.NCM_CACHE_MAX_ENTRIES)
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_MAX_ENTRIES
}

function maxValueBytes() {
  const n = Number(process.env.NCM_CACHE_MAX_VALUE_BYTES)
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_MAX_VALUE_BYTES
}

// cacheObject 的体积集中在 data（字符串或 Buffer），取长度即可，避免全量序列化
function sizeOf(value) {
  if (!value) return 0
  if (typeof value === 'string' || Buffer.isBuffer(value)) return value.length
  if (value.data && (typeof value.data === 'string' || Buffer.isBuffer(value.data)))
    return value.data.length
  return 0
}

function MemoryCache() {
  // Map 保持插入顺序，最早插入的即最久未访问，get 命中时重新 set 实现 LRU
  this.cache = new Map()
  this.size = 0
}

MemoryCache.prototype.add = function (key, value, time, timeoutCallback) {
  var instance = this

  var entry = {
    value: value,
    expire: time + Date.now(),
    timeout: setTimeout(function () {
      instance.delete(key)
      return (
        timeoutCallback &&
        typeof timeoutCallback === 'function' &&
        timeoutCallback(value, key)
      )
    }, time),
  }

  var old = this.cache.get(key)
  if (old) clearTimeout(old.timeout)
  this.cache.set(key, entry)
  this.size = this.cache.size

  while (this.size > maxEntries()) {
    var oldest = this.cache.keys().next()
    if (oldest.done) break
    this.delete(oldest.value)
  }

  return entry
}

MemoryCache.prototype.delete = function (key) {
  var entry = this.cache.get(key)

  if (entry) {
    clearTimeout(entry.timeout)
  }

  this.cache.delete(key)

  this.size = this.cache.size

  return null
}

MemoryCache.prototype.get = function (key) {
  var entry = this.cache.get(key)

  if (entry) {
    // touch：移到队尾，避免热点条目被 LRU 驱逐
    this.cache.delete(key)
    this.cache.set(key, entry)
  }

  return entry
}

MemoryCache.prototype.getValue = function (key) {
  var entry = this.get(key)

  return entry && entry.value
}

MemoryCache.prototype.clear = function () {
  for (var key of this.cache.keys()) {
    this.delete(key)
  }

  return true
}

MemoryCache.prototype.accepts = function (value) {
  return sizeOf(value) <= maxValueBytes()
}

module.exports = MemoryCache
