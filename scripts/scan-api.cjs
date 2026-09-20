// 一次性扫描脚本：枚举全部对外接口，生成重构基线清单 MD
// 路由映射逻辑与 server.js getModulesDefinitions 保持一致
const fs = require('fs')
const path = require('path')

const ROOT = process.argv[2] || '.'
const OUT = process.argv[3] || path.join(ROOT, 'docs/refactor-api-inventory.md')

const SPECIAL_ROUTE = {
  'daily_signin.js': '/daily_signin',
  'fm_trash.js': '/fm_trash',
  'personal_fm.js': '/personal_fm',
}

const routeOf = (file) =>
  file in SPECIAL_ROUTE
    ? SPECIAL_ROUTE[file]
    : `/${file.replace(/\.js$/i, '').replace(/_/g, '/')}`

const scan = (dir) =>
  fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.js'))
    .map((f) => {
      const src = fs.readFileSync(path.join(dir, f), 'utf8')
      const desc = (src.match(/^\s*\/\/\s*(.+)/m) || [, ''])[1].trim()

      const methods = [
        ...new Set(
          [...src.matchAll(/request\(\s*'(GET|POST)'/g)].map((m) => m[1]),
        ),
      ]
      const reqCount = (src.match(/request\(/g) || []).length

      const upstreams = [
        ...new Set(
          [...src.matchAll(/music\.163\.com\/(\w*api[^\s`'"]*)/g)].map((m) =>
            m[1].replace(/\$\{[^}]*\}/g, '{x}'),
          ),
        ),
      ]
      const cryptos = [
        ...new Set(
          [...src.matchAll(/crypto:\s*'(\w+)'/g)].map((m) => m[1]),
        ),
      ]

      const reserved = new Set(['cookie', 'proxy', 'realIP', 'ua', 'timestamp'])
      const params = [
        ...new Set(
          [...src.matchAll(/query\.([A-Za-z_]\w+)/g)].map((m) => m[1]),
        ),
      ].filter((p) => !reserved.has(p))

      const login = /MUSIC_U|query\.cookie\.(os|appver|__csrf)/.test(src)

      // 多步/条件分支等高阶信息无法纯静态穷尽，标记需人工核对
      const complex =
        reqCount > 1 ||
        /\bawait\b[\s\S]*\bawait\b/.test(src) ||
        /for\s*\(|while\s*\(|\.map\(async/.test(src)

      return {
        file: f,
        route: routeOf(f),
        methods: methods.length ? methods.join('/') : 'GET/POST',
        reqCount,
        upstreams,
        cryptos,
        params,
        login,
        complex,
        desc,
      }
    })

const modules = scan(path.join(ROOT, 'module')).sort((a, b) =>
  a.route.localeCompare(b.route),
)

const rows = modules.map(
  (m, i) =>
    `| ${i + 1} | \`${m.route}\` | ${m.methods} | ${m.params.length ? m.params.map((p) => '`' + p + '`').join(' ') : '—'} | ${m.cryptos.join(',') || 'api/无'} | ${m.login ? '是' : ''} | ${m.complex ? '⚠' : ''} | ${m.desc || '—'} | ☐ |`,
)

const upLines = modules
  .filter((m) => m.upstreams.length)
  .map((m) => `- \`${m.route}\` → ${m.upstreams.map((u) => '`' + u + '`').join(' + ')}`)

const md = `# 后端接口基线清单（重构验收用）

> 生成时间：${new Date().toISOString().slice(0, 10)}　基准：master ${require('child_process').execSync('git -C ' + ROOT + ' rev-parse --short HEAD', { encoding: 'utf8' }).trim()}
> 用途：TS + 新框架重构后，逐接口回归比对本清单，"验证"列全部勾完才算迁移完成。
> 扫描方式：静态解析 module/*.js，路由映射与 server.js:getModulesDefinitions 一致。
> 重新生成：\`node scripts/scan-api.cjs . docs/refactor-api-inventory.md\`（脚本已随仓库提交）

## 总览

- **module 接口：${modules.length} 个**（路由 = 文件名去 .js、下划线转斜杠；${Object.values(SPECIAL_ROUTE).join('、')} 为特例映射）
- 所有路由经 \`app.use(route, handler)\` 挂载：**GET 与 POST 均可**，参数分别在 query / body（body 支持 json、urlencoded、/cloud 的 multipart）
- 通用可选参数（全接口可用，不在每行列出）：\`cookie\`(字符串，等价于 Header Cookie)、\`proxy\`、\`realIP\`、\`ua\`、\`timestamp\`（后四者已被 server.js 归一化出缓存 key）
- 上游加密：\`weapi\` / \`eapi\` / \`linuxapi\` / \`api\`（明文）

## 框架级（非 module）路由 —— 二开自有，重构必须 1:1 保留

| # | 路由 | 方法 | 说明 | 验证 |
|---|------|------|------|------|
| F1 | \`/puppeteer\` | GET/POST | URL 代理抓取（?url= 或 body.url），已列入不可缓存 | ☐ |
| F2 | \`/netease/credential\` | GET | 读取自持凭据（纯文本 Cookie），404=未存 | ☐ |
| F3 | \`/netease/credential\` | POST | 写入凭据：回源 /user/account 校验 OWNER_UID（默认 270496477） | ☐ |
| F4 | \`/netease/credential\` | DELETE | 清空凭据文件 | ☐ |
| F5 | 任意 module 路由 + \`?server=qq\\|kugou\` | GET/POST | 多源扇出到 util/qq.js、util/kugou.js（api_map 按 baseUrl 分发） | ☐ |
| F6 | \`/\`、\`/login/qr\` 等所有路径 OPTIONS | OPTIONS | CORS 预检统一 204 | ☐ |
| F7 | \`/song/unblock\` | GET | 特殊：server.js 以 @unblockneteasemusic/server 短路，module/song_unblock.js 实际不会被执行（重构时二选一并保持对外行为） | ☐ |

## 全局行为契约（重构后必须一致）

1. **响应策略**：module 正常 → 透传上游 status/body 与 Set-Cookie（\`echoCookies\`，除非 \`?noCookie\`）；异常 → 404 {code:404}，body.code==301 → msg"需要登录"
2. **缓存**：2 分钟 TTL（server.js CACHE_TTL），LRU 500 条 / 单值 2MB 上限；不可缓存路由清单见 util/cache-policy.js UNCACHEABLE：\`/login*\` \`/logout*\` \`/captcha_*\` \`/user/*\` \`/daily_signin\` \`/puppeteer\` \`/netease/*\`；key 按账号指纹分桶（cacheKeyOf）
3. **扫码状态机**：\`/login/qr/create\`→\`check\` 依赖 Set-Cookie 回写链（802→803），不可切断；\`qrimg\` 参数返回 base64 PNG
4. **设备指纹**：util/client-profile.js 固定 UA/NMTID/_ntes_nuid，带凭据请求自动补 \`os\` Cookie —— 全部是防风控行为
5. **上传**：multipart 仅在 \`/cloud\` 解析（fileUpload limits 100MB×1）
6. **cluster**：cluster.js 多进程(min(cpus,4))+崩溃自愈，worker 各自 serveNcmApi

## module 接口清单（${modules.length}）

| # | 路由 | 方法 | 业务参数 | 加密 | 需登录 | 复杂⚠ | 说明 | 验证 |
|---|------|------|----------|------|--------|-------|------|------|
${rows.join('\n')}

> "复杂⚠" = 单文件多次上游调用/循环/分页拼接，重构时人工核对响应合成逻辑。
> "需登录" 为启发式判定（源码出现 MUSIC_U 或对 cookie 写 os/appver），仅作参考——实际多数接口匿名可用、仅数据完整度不同。
> "上游加密" 为 api/无 的通常是走 eapi/weapi 变量拼接或纯本地逻辑，重构时人工确认。

## 上游端点映射（对照加密通道，重构后请求层等价性检查用）

${upLines.join('\n')}
`

fs.mkdirSync(path.dirname(OUT), { recursive: true })
fs.writeFileSync(OUT, md)
console.log(`written ${OUT}: ${modules.length} module routes + 7 framework routes`)
const noParams = modules.filter((m) => m.params.length === 0).map((m) => m.route)
console.log('zero-param (核对):', noParams.join(' ') || 'none')
console.log('complex:', modules.filter((m) => m.complex).length)
