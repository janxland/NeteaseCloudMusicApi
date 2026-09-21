// 首页取歌所用凭据的持久化存储。原 util/credential-store.js 直译。
//
// 单进程与多 worker 共用同一份文件，因此刻意不做进程内缓存：
// 1KB 级文件的读开销在 page cache 上可忽略，换来的是各 worker 视图必然一致。
import fs from 'node:fs'
import path from 'node:path'

export interface CredentialEntry {
  cookie: string
  uid?: number | string
  nickname?: string
  source?: string
  updatedAt?: string
}

export const FILE =
  process.env.CREDENTIAL_FILE || path.join('/data', 'netease-credential.json')

export const read = (): (CredentialEntry & { cookie: string }) | null => {
  try {
    const parsed = JSON.parse(fs.readFileSync(FILE, 'utf8'))
    return parsed && typeof parsed.cookie === 'string' && parsed.cookie ? parsed : null
  } catch {
    return null
  }
}

export const write = (entry: CredentialEntry): CredentialEntry => {
  const payload: CredentialEntry = { ...entry, updatedAt: new Date().toISOString() }
  fs.mkdirSync(path.dirname(FILE), { recursive: true })
  // 先写临时文件再原子改名，避免读取方读到半截 JSON
  const tmp = `${FILE}.${process.pid}.tmp`
  fs.writeFileSync(tmp, JSON.stringify(payload, null, 2), { mode: 0o600 })
  fs.renameSync(tmp, FILE)
  return payload
}

export const clear = (): boolean => {
  try {
    fs.unlinkSync(FILE)
    return true
  } catch {
    return false
  }
}

export default { read, write, clear, FILE }
