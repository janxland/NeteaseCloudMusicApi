# 框架级契约验收报告

> base: http://127.0.0.1:3401
> 生成时间：2026-09-21 01:27:24
> 结论：**13/13 通过**

| # | 契约 | 结果 | 实测 |
|---|------|------|------|
| C1 | OPTIONS 任意路径 → 204 + CORS 头 | ✅ | 204 + ACAO=* |
| C2 | 未知路由 → 404 HTML | ✅ | 404 + "Cannot GET /__not_exist" |
| C3 | ?noCookie=1 → 不回写 Set-Cookie | ✅ | status=200，无 Set-Cookie |
| C4 | 同一 GET 连发两次 → 第二次命中缓存 | ✅ | HIT，61616 bytes |
| C5 | UNCACHEABLE 路径不被缓存 | ✅ | 4 条路径均未命中缓存 |
| C6 | GET /netease/credential → 200 或 404 | ✅ | status=404 |
| C7 | 凭据写入护栏 + 删除 | ✅ | 400(缺 MUSIC_U) + DELETE ok=false |
| C8 | ?server=kugou 扇出 | ✅ | kugou 返回 code=200 且带 result |
| C9 | /cloud 解析 multipart，其余路由不受影响 | ✅ | /cloud=301（无 cookie 走 301/参数校验），/album=200 |
| C10 | /song/unblock 走 unblock 服务 | ✅ | status=502 unblock failed |
| C11 | 模块路由对所有 HTTP 方法可达（对齐 app.use） | ✅ | GET/POST/PUT/DELETE/PATCH 均 200 |
| C12 | /cloud 上传链路（带文件进模块 / 不带文件与 Express 同形 404） | ✅ | 带文件=301/code=301，不带文件=404 |
| C13 | 同名查询参数重复不被拦截（对齐 Express 不校验） | ✅ | 重复参数=200（非 400），OpenAPI 仍含 5 个参数 |

## P2 人工用例冒烟（无真实凭据 / 文件，仅确认链路可达）

> 方法按用例声明发送；`/cloud` 带一个 2KB 假 mp3，用于确认 multipart 真的注入了 `query.songFile`。

| 路由 | 方法 | HTTP | body.code | 实测 msg | 人工验收 |
|------|------|------|-----------|----------|----------|
| `/activate/init/profile` | GET | 200 | 301 | — | ☐ |
| `/captcha/sent` | GET | 200 | 400 | 参数错误 | ☐ |
| `/captcha/verify` | GET | 200 | 400 | 参数错误 | ☐ |
| `/cloud` | POST | 301 | 301 | 需要登录 | ☐ |
| `/cloud/match` | GET | 301 | 301 | 需要登录 | ☐ |
| `/login/cellphone` | POST | 404 | 404 | Not Found | ☐ |
| `/login/qr/check` | GET | 200 | 400 | 参数错误 | ☐ |
| `/login/refresh` | GET | 301 | 301 | 需要登录 | ☐ |
| `/login/status` | GET | 200 | — | — | ☐ |
| `/logout` | GET | 200 | 200 | — | ☐ |
| `/rebind` | GET | 200 | 400 | 参数错误 | ☐ |
| `/register/anonimous` | GET | 200 | 200 | — | ☐ |
| `/register/cellphone` | POST | 404 | 404 | Not Found | ☐ |
| `/song/unblock` | GET | 502 | 502 | unblock failed | ☐ |
