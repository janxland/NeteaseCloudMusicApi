// 响应缓存：对齐 server.js 的 apicache 配置（2 分钟 TTL / LRU 500 / 单值 2MB /
// 按账号分桶 / UNCACHEABLE 白名单）。策略来源 src/core/cache-policy.ts 单一来源。
import { cacheKeyOf, cachePolicy } from './cache-policy'
import type { CookieJar } from '../types'

const TTL_MS = 2 * 60 * 1000
const MAX_ENTRIES = 500
const MAX_PAYLOAD = 2 * 1024 * 1024

/** 波动参数：不进 key，否则缓存形同虚设（与 server.js VOLATILE_QUERY_PARAMS 一致） */
const VOLATILE = new Set(['timestamp', '_t', 'realIP', 'real_ip', 'proxy', 'noCookie'])

/** 写入侧入参：handler 产出的是字符串（Fastify 序列化后的 JSON / 纯文本） */
export interface CacheWrite {
  status: number
  payload: string
  contentType?: string
}

/**
 * 存储条目：只留预编码字节，不留字符串。
 *
 * 命中路径是热路径（大响应体在压测下每秒数千次），字符串形态每次命中都要
 * 重新 UTF-8 编码 + `Buffer.byteLength` 全文扫描；存 Buffer 则命中直接写字节，
 * 既省掉两趟 O(n)，也避免同一份 80KB 载荷在内存里存两份。
 */
export interface CacheEntry {
  status: number
  body: Buffer
  contentType?: string
}

type StoredEntry = CacheEntry & { expires: number }

const store = new Map<string, StoredEntry>()

export const normalizeUrl = (url: string): string => {
  const idx = url.indexOf('?')
  if (idx < 0) return url
  const path = url.slice(0, idx)
  const filtered = url
    .slice(idx + 1)
    .split('&')
    .filter((seg) => seg && !VOLATILE.has(seg.split('=')[0]))
    .join('&')
  return filtered ? `${path}?${filtered}` : path
}

export const cacheKey = (url: string, cookies: CookieJar): string =>
  `${cacheKeyOf(cookies)}::${normalizeUrl(url)}`

/** 是否可缓存：仅 200 且不在 UNCACHEABLE 名单内 */
export const shouldCache = (path: string, statusCode: number): boolean =>
  cachePolicy(path, statusCode)

export const readCache = (key: string): CacheEntry | null => {
  const hit = store.get(key)
  if (!hit) return null
  if (hit.expires < Date.now()) {
    store.delete(key)
    return null
  }
  // LRU：命中后移到末尾
  store.delete(key)
  store.set(key, hit)
  return { status: hit.status, body: hit.body, contentType: hit.contentType }
}

export const writeCache = (key: string, entry: CacheWrite): void => {
  // 编码一次并直接用长度做容量判断，省掉额外的 Buffer.byteLength 扫描
  const body = Buffer.from(entry.payload ?? '', 'utf8')
  if (body.length > MAX_PAYLOAD) return
  store.set(key, { status: entry.status, body, contentType: entry.contentType, expires: Date.now() + TTL_MS })
  if (store.size > MAX_ENTRIES) {
    // Map 保持插入顺序，最早的键即最久未用
    const oldest = store.keys().next().value
    if (oldest !== undefined) store.delete(oldest)
  }
}

export const cacheStats = () => ({ size: store.size, ttlMs: TTL_MS, max: MAX_ENTRIES })
