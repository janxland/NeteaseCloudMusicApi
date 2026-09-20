// 首页取歌所用凭据的持久化存储。
//
// 为什么不复用 auth-center 的共享 KV：写入需要 SSO 凭据，而后台服务无法走交互式
// 授权；直连数据库又会让本服务耦合他人的表结构。凭据的消费者就是 ncm-api 本身，
// 由它持有更内聚，也让「播放器登录」与「首页取歌」两条链路彻底互不依赖。
//
// 容器内的 ncm-api 访问不到宿主机的 auth-center(:8085)，因此这里不做自动迁移 ——
// 首次凭据由 POST /netease/credential 写入，或由 scripts/sync-credential.js 从
// 既有 KV 一次性搬运。
//
// 单进程（app.js）与多 worker（cluster.js）共用同一份文件，因此刻意不做进程内缓存：
// 1KB 级文件的读开销在 page cache 上可忽略，换来的是各 worker 视图必然一致。

const fs = require('fs')
const path = require('path')

const FILE =
  process.env.CREDENTIAL_FILE || path.join('/data', 'netease-credential.json')

function read() {
  try {
    const parsed = JSON.parse(fs.readFileSync(FILE, 'utf8'))
    return parsed && typeof parsed.cookie === 'string' && parsed.cookie
      ? parsed
      : null
  } catch (_) {
    return null
  }
}

function write(entry) {
  const payload = { ...entry, updatedAt: new Date().toISOString() }
  fs.mkdirSync(path.dirname(FILE), { recursive: true })
  // 先写临时文件再原子改名，避免读取方读到半截 JSON
  const tmp = `${FILE}.${process.pid}.tmp`
  fs.writeFileSync(tmp, JSON.stringify(payload, null, 2), { mode: 0o600 })
  fs.renameSync(tmp, FILE)
  return payload
}

function clear() {
  try {
    fs.unlinkSync(FILE)
    return true
  } catch (_) {
    return false
  }
}

module.exports = { read, write, clear, FILE }
