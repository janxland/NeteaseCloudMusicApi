# 接口回归测试计划（TS 重构验收）

> 生成时间：2026-09-20 17:12:13
> 数据来源：静态解析 src/routes/**/*.ts（281 个），路由映射与 src/core/routes.ts 一致
> 配套文件：机器可读用例 `docs/api-cases.json`、执行脚本 `scripts/api-regression.cjs`
> 基线来源：重构前 Express 版实测（`docs/regression-baseline.json`）；TS + Fastify 版跑同用例对比 **差异=0**
> 重新生成：`node scripts/gen-api-test-plan.cjs`

## 一、怎么跑（闭环）

```bash
# 1) 起服务（TS + Fastify）
npm start                 # 或 npm run dev（watch）；换端口 PORT=3100 npm start

# 2) 跑全量用例并与基线对比（基线存于 docs/regression-baseline.json）
npm run regression:compare
#   = node scripts/api-regression.cjs --base http://localhost:3000 --tier P0,P1 \
#       --compare docs/regression-baseline.json --out docs/regression-latest.json --md docs/regression-report.md
#   期望：一致=267 差异=0 缺失=0

# 3) 框架级契约 C1-C12（框架装配本身，不在路由文件里）
node scripts/verify-contracts.cjs --base http://127.0.0.1:3000 --out docs/contract-report.md

# 4) 单元测试
npm test

# 只跑某一层：--tier P0|P1|P2 ；带登录态：--cookie "MUSIC_U=xxx; ..."
# 按实测结果自动校正分层（301 归 P1、上游 404/502 记 baselineStatus）：加 --write-back
# 重新抓基线（换机器 / 上游大改时）：去掉 --compare，直接 --out
```

脚本对每条用例记录：HTTP status、`body.code`、响应**结构指纹**（递归 key + 值类型，数组取首元素）。对比模式只比指纹与 code —— 能抓出"字段丢了/类型变了/结构层级变了"这类重构事故，不受歌曲列表实时变化干扰。

## 二、断言策略

| expect | 含义 | 判定 |
|--------|------|------|
| `http200` | 匿名可跑：HTTP 200 即通过（上游风控让 code≠200 也算通，但会记入结构指纹对比） | 自动 |
| `code200` | `/login/qr/create`：本地合成二维码，需 HTTP 200 且 body.code 200（key 由脚本自动从 `/login/qr/key` 取 unikey 注入） | 自动 |
| `loginRequired` | 需登录：无 cookie 时 HTTP 301（需登录）或 200（其实匿名可用）都算通过；带 `--cookie` 时要求 body.code 200 | 自动 |
| `manual` | 涉及上传/登录写操作/验证码/第三方：脚本跳过，人工按第四节清单验收 | 人工 |
| `baselineStatus` | 重构前实测就是 404/502/403 的接口（上游失效或缺参数）：判定为「与基线状态一致」，不因上游故障误报 | 自动 |

## 三、自动回归清单（P0 + P1 合并，脚本执行）

| # | 路由 | 参数（? 为可选） | expect | 层 | 重构前实测（基线） | 验证 | 等价请求 |
|---|------|------------------|--------|----|--------------|------|----------|
| 1 | `/album` | `id` | http200 | P0 | 200 / 200 · 323ms · ✅ | ☐ | curl -s "http://localhost:3000/album?id=32311&realIP=116.25.146.177" |
| 2 | `/album/detail` | `id` | http200 | P0 | 404 / 404 · 142ms · ✅<br>⚠ 重构前实测 HTTP 404（上游失效/缺参数，重构后需保持一致） | ☐ | curl -s "http://localhost:3000/album/detail?id=32311&realIP=116.25.146.177" |
| 3 | `/album/detail/dynamic` | `id` | http200 | P0 | 200 / 200 · 116ms · ✅ | ☐ | curl -s "http://localhost:3000/album/detail/dynamic?id=32311&realIP=116.25.146.177" |
| 4 | `/album/list` | `limit`? `offset`? `area`? `type` | http200 | P0 | 200 / 200 · 200ms · ✅ | ☐ | curl -s "http://localhost:3000/album/list?limit=30&offset=0&area=ALL&type=1&realIP=116.25.146.177" |
| 5 | `/album/list/style` | `limit`? `offset`? `area`? | http200 | P0 | 404 / 404 · 115ms · ✅<br>⚠ 重构前实测 HTTP 404（上游失效/缺参数，重构后需保持一致） | ☐ | curl -s "http://localhost:3000/album/list/style?limit=30&offset=0&area=ALL&realIP=116.25.146.177" |
| 6 | `/album/new` | `limit`? `offset`? `area`? | http200 | P0 | 200 / 200 · 121ms · ✅ | ☐ | curl -s "http://localhost:3000/album/new?limit=30&offset=0&area=ALL&realIP=116.25.146.177" |
| 7 | `/album/newest` | — | http200 | P0 | 200 / 200 · 81ms · ✅ | ☐ | curl -s "http://localhost:3000/album/newest?realIP=116.25.146.177" |
| 8 | `/album/songsaleboard` | `albumType`? `type`? `year` | http200 | P0 | 404 / 404 · 61ms · ✅<br>⚠ 重构前实测 HTTP 404（上游失效/缺参数，重构后需保持一致） | ☐ | curl -s "http://localhost:3000/album/songsaleboard?type=1&year=&realIP=116.25.146.177" |
| 9 | `/album/sub` | `t` `id` | loginRequired | P1 | 301 / 301 · 54ms · ✅ | ☐ | （人工/带 cookie 执行） |
| 10 | `/album/sublist` | `limit`? `offset`? | loginRequired | P1 | 301 / 301 · 58ms · ✅ | ☐ | （人工/带 cookie 执行） |
| 11 | `/artist/album` | `limit`? `offset`? `id` | http200 | P0 | 200 / 200 · 114ms · ✅ | ☐ | curl -s "http://localhost:3000/artist/album?limit=30&offset=0&id=32311&realIP=116.25.146.177" |
| 12 | `/artist/desc` | `id` | http200 | P0 | 200 / 200 · 112ms · ✅ | ☐ | curl -s "http://localhost:3000/artist/desc?id=5781&realIP=116.25.146.177" |
| 13 | `/artist/detail` | `id` | http200 | P0 | 200 / 200 · 110ms · ✅ | ☐ | curl -s "http://localhost:3000/artist/detail?id=5781&realIP=116.25.146.177" |
| 14 | `/artist/fans` | `id` `limit`? `offset`? | http200 | P0 | 200 / 200 · 88ms · ✅ | ☐ | curl -s "http://localhost:3000/artist/fans?id=5781&limit=30&offset=0&realIP=116.25.146.177" |
| 15 | `/artist/follow/count` | `id` | http200 | P0 | 200 / 200 · 95ms · ✅ | ☐ | curl -s "http://localhost:3000/artist/follow/count?id=5781&realIP=116.25.146.177" |
| 16 | `/artist/list` | `initial`? `offset`? `limit`? `type`? `area` | http200 | P0 | 200 / 400 · 90ms · ✅ | ☐ | curl -s "http://localhost:3000/artist/list?initial=A&offset=0&limit=30&type=1&area=ALL&realIP=116.25.146.177" |
| 17 | `/artist/mv` | `id` `limit` `offset` | http200 | P0 | 200 / 200 · 82ms · ✅ | ☐ | curl -s "http://localhost:3000/artist/mv?id=5781&limit=30&offset=0&realIP=116.25.146.177" |
| 18 | `/artist/new/mv` | `limit`? `before`? | loginRequired | P1 | 301 / 301 · 57ms · ✅ | ☐ | （人工/带 cookie 执行） |
| 19 | `/artist/new/song` | `limit`? `before`? | loginRequired | P1 | 301 / 301 · 54ms · ✅ | ☐ | （人工/带 cookie 执行） |
| 20 | `/artist/songs` | `id` `order`? `offset`? `limit`? | http200 | P0 | 200 / 200 · 634ms · ✅ | ☐ | curl -s "http://localhost:3000/artist/songs?id=5781&order=hot&offset=0&limit=30" |
| 21 | `/artist/sub` | `t` `id` | loginRequired | P1 | 301 / 301 · 82ms · ✅ | ☐ | （人工/带 cookie 执行） |
| 22 | `/artist/sublist` | `limit`? `offset`? | loginRequired | P1 | 301 / 301 · 58ms · ✅ | ☐ | （人工/带 cookie 执行） |
| 23 | `/artist/top/song` | `id` | http200 | P0 | 200 / 200 · 129ms · ✅ | ☐ | curl -s "http://localhost:3000/artist/top/song?id=5781&realIP=116.25.146.177" |
| 24 | `/artist/video` | `id` `size`? `cursor`? `order`? | http200 | P0 | 502 / 502 · 49ms · ✅<br>⚠ 重构前实测 HTTP 502（上游失效/缺参数，重构后需保持一致） | ☐ | curl -s "http://localhost:3000/artist/video?id=5781&size=20&order=hot&realIP=116.25.146.177" |
| 25 | `/artists` | `id` | http200 | P0 | 200 / 200 · 901ms · ✅ | ☐ | curl -s "http://localhost:3000/artists?id=5781&realIP=116.25.146.177" |
| 26 | `/audio/match` | — | http200 | P0 | 200 / 200 · 222ms · ✅ | ☐ | curl -s "http://localhost:3000/audio/match?" |
| 27 | `/avatar/upload` | — | http200 | P0 | 404 / 404 · 2ms · ✅<br>⚠ 重构前实测 HTTP 404（上游失效/缺参数，重构后需保持一致） | ☐ | curl -s "http://localhost:3000/avatar/upload?realIP=116.25.146.177" |
| 28 | `/banner` | `type`? | http200 | P0 | 200 / 200 · 61ms · ✅ | ☐ | curl -s "http://localhost:3000/banner?type=1&realIP=116.25.146.177" |
| 29 | `/batch` | — | http200 | P0 | 200 / 400 · 44ms · ✅ | ☐ | curl -s "http://localhost:3000/batch?realIP=116.25.146.177" |
| 30 | `/calendar` | `startTime`? `endTime`? | loginRequired | P1 | 301 / 301 · 47ms · ✅ | ☐ | （人工/带 cookie 执行） |
| 31 | `/cellphone/existence/check` | `phone` `countrycode` | http200 | P0 | 200 / 400 · 56ms · ✅ | ☐ | curl -s "http://localhost:3000/cellphone/existence/check?phone=&countrycode=10&realIP=116.25.146.177" |
| 32 | `/check/music` | `id` `br`? | http200 | P0 | 200 · 163ms · ✅ | ☐ | curl -s "http://localhost:3000/check/music?id=347230&br=999000&realIP=116.25.146.177" |
| 33 | `/cloudsearch` | `keywords` `type`? `limit`? `offset`? | http200 | P0 | 200 / 200 · 317ms · ✅ | ☐ | curl -s "http://localhost:3000/cloudsearch?keywords=%E6%B5%B7%E9%98%94%E5%A4%A9%E7%A9%BA&type=1&limit=30&offset=0&realIP=116.25.146.177" |
| 34 | `/comment` | `t` `type` `id` `threadId` `content` `commentId` | http200 | P0 | 200 / 400 · 59ms · ✅ | ☐ | curl -s "http://localhost:3000/comment?t=&type=1&id=347230&threadId=347230&content=test&commentId=347230" |
| 35 | `/comment/album` | `id` `limit`? `offset`? `before`? | http200 | P0 | 200 / 200 · 217ms · ✅ | ☐ | curl -s "http://localhost:3000/comment/album?id=32311&limit=30&offset=0&before=0" |
| 36 | `/comment/dj` | `id` `limit`? `offset`? `before`? | http200 | P0 | 200 / 200 · 78ms · ✅ | ☐ | curl -s "http://localhost:3000/comment/dj?id=3470602&limit=30&offset=0&before=0" |
| 37 | `/comment/event` | `limit`? `offset`? `before`? `threadId` | http200 | P0 | 200 / 400 · 64ms · ✅ | ☐ | curl -s "http://localhost:3000/comment/event?limit=30&offset=0&before=0&threadId=347230&realIP=116.25.146.177" |
| 38 | `/comment/floor` | `type` `parentCommentId` `id` `time`? `limit`? | http200 | P0 | 200 / 400 · 63ms · ✅ | ☐ | curl -s "http://localhost:3000/comment/floor?type=1&parentCommentId=347230&id=347230&time=0&limit=30&realIP=116.25.146.177" |
| 39 | `/comment/hot` | `type` `id` `limit`? `offset`? `before`? | http200 | P0 | 200 / 200 · 100ms · ✅ | ☐ | curl -s "http://localhost:3000/comment/hot?type=1&id=347230&limit=30&offset=0&before=0" |
| 40 | `/comment/hug/list` | `type`? `sid` `uid` `cid` `cursor`? `page`? `idCursor`? `pageSize`? | loginRequired | P1 | 301 / 301 · 58ms · ✅ | ☐ | （人工/带 cookie 执行） |
| 41 | `/comment/like` | `t` `type` `id` `cid` `threadId` | loginRequired | P1 | 301 / 301 · 73ms · ✅ | ☐ | （人工/带 cookie 执行） |
| 42 | `/comment/music` | `id` `limit`? `offset`? `before`? | http200 | P0 | 200 / 200 · 168ms · ✅ | ☐ | curl -s "http://localhost:3000/comment/music?id=347230&limit=30&offset=0&before=0" |
| 43 | `/comment/mv` | `id` `limit`? `offset`? `before`? | http200 | P0 | 200 / 200 · 167ms · ✅ | ☐ | curl -s "http://localhost:3000/comment/mv?id=5436712&limit=30&offset=0&before=0" |
| 44 | `/comment/new` | `type` `id` `pageSize`? `pageNo`? `sortType` `cursor`? `showInner`? | http200 | P0 | 200 / 200 · 72ms · ✅ | ☐ | curl -s "http://localhost:3000/comment/new?type=1&id=347230&pageSize=10&pageNo=10&sortType=" |
| 45 | `/comment/playlist` | `id` `limit`? `offset`? `before`? | http200 | P0 | 200 / 200 · 72ms · ✅ | ☐ | curl -s "http://localhost:3000/comment/playlist?id=24381616&limit=30&offset=0&before=0" |
| 46 | `/comment/video` | `id` `limit`? `offset`? `before`? | http200 | P0 | 200 / 200 · 93ms · ✅ | ☐ | curl -s "http://localhost:3000/comment/video?id=5436712&limit=30&offset=0&before=0" |
| 47 | `/countries/code/list` | — | http200 | P0 | 200 / 200 · 107ms · ✅ | ☐ | curl -s "http://localhost:3000/countries/code/list?realIP=116.25.146.177" |
| 48 | `/daily_signin` | `type`? | loginRequired | P1 | 301 / 301 · 49ms · ✅ | ☐ | （人工/带 cookie 执行） |
| 49 | `/digitalAlbum/detail` | `id` | http200 | P0 | 404 / 404 · 70ms · ✅<br>⚠ 重构前实测 HTTP 404（上游失效/缺参数，重构后需保持一致） | ☐ | curl -s "http://localhost:3000/digitalAlbum/detail?id=347230&realIP=116.25.146.177" |
| 50 | `/digitalAlbum/ordering` | `payment` `id` `quantity` | http200 | P0 | 502 / 502 · 60ms · ✅<br>⚠ 重构前实测 HTTP 502（上游失效/缺参数，重构后需保持一致） | ☐ | curl -s "http://localhost:3000/digitalAlbum/ordering?payment=&id=32311&quantity=&realIP=116.25.146.177" |
| 51 | `/digitalAlbum/purchased` | `limit`? `offset`? | loginRequired | P1 | 301 / 301 · 66ms · ✅ | ☐ | （人工/带 cookie 执行） |
| 52 | `/digitalAlbum/sales` | `ids` | http200 | P0 | 200 / 200 · 51ms · ✅ | ☐ | curl -s "http://localhost:3000/digitalAlbum/sales?ids=32311&realIP=116.25.146.177" |
| 53 | `/dj/banner` | — | http200 | P0 | 200 / 200 · 61ms · ✅ | ☐ | curl -s "http://localhost:3000/dj/banner?" |
| 54 | `/dj/category/excludehot` | — | http200 | P0 | 200 / 200 · 58ms · ✅ | ☐ | curl -s "http://localhost:3000/dj/category/excludehot?realIP=116.25.146.177" |
| 55 | `/dj/category/recommend` | — | http200 | P0 | 200 / 200 · 251ms · ✅ | ☐ | curl -s "http://localhost:3000/dj/category/recommend?realIP=116.25.146.177" |
| 56 | `/dj/catelist` | — | http200 | P0 | 200 / 200 · 47ms · ✅ | ☐ | curl -s "http://localhost:3000/dj/catelist?realIP=116.25.146.177" |
| 57 | `/dj/detail` | `rid` | http200 | P0 | 404 / 404 · 58ms · ✅<br>⚠ 重构前实测 HTTP 404（上游失效/缺参数，重构后需保持一致） | ☐ | curl -s "http://localhost:3000/dj/detail?rid=3470602&realIP=116.25.146.177" |
| 58 | `/dj/hot` | `limit`? `offset`? | http200 | P0 | 200 / 200 · 80ms · ✅ | ☐ | curl -s "http://localhost:3000/dj/hot?limit=30&offset=0&realIP=116.25.146.177" |
| 59 | `/dj/paygift` | `limit`? `offset`? | http200 | P0 | 200 / 200 · 67ms · ✅ | ☐ | curl -s "http://localhost:3000/dj/paygift?limit=30&offset=0&realIP=116.25.146.177" |
| 60 | `/dj/personalize/recommend` | `limit`? | http200 | P0 | 200 / 200 · 96ms · ✅ | ☐ | curl -s "http://localhost:3000/dj/personalize/recommend?limit=30&realIP=116.25.146.177" |
| 61 | `/dj/program` | `rid` `limit`? `offset`? `asc` | http200 | P0 | 200 / 200 · 60ms · ✅ | ☐ | curl -s "http://localhost:3000/dj/program?rid=32311&limit=30&offset=0&asc=&realIP=116.25.146.177" |
| 62 | `/dj/program/detail` | `id` | http200 | P0 | 404 / 404 · 59ms · ✅<br>⚠ 重构前实测 HTTP 404（上游失效/缺参数，重构后需保持一致） | ☐ | curl -s "http://localhost:3000/dj/program/detail?id=32311&realIP=116.25.146.177" |
| 63 | `/dj/program/toplist` | `limit`? `offset`? | http200 | P0 | 200 / 200 · 301ms · ✅ | ☐ | curl -s "http://localhost:3000/dj/program/toplist?limit=30&offset=0&realIP=116.25.146.177" |
| 64 | `/dj/program/toplist/hours` | `limit`? | http200 | P0 | 200 / 200 · 253ms · ✅ | ☐ | curl -s "http://localhost:3000/dj/program/toplist/hours?limit=30&realIP=116.25.146.177" |
| 65 | `/dj/radio/hot` | `cateId` `limit`? `offset`? | http200 | P0 | 200 / 200 · 63ms · ✅ | ☐ | curl -s "http://localhost:3000/dj/radio/hot?cateId=3470602&limit=30&offset=0&realIP=116.25.146.177" |
| 66 | `/dj/recommend` | — | http200 | P0 | 200 / 200 · 82ms · ✅ | ☐ | curl -s "http://localhost:3000/dj/recommend?realIP=116.25.146.177" |
| 67 | `/dj/recommend/type` | `type` | http200 | P0 | 200 / 200 · 60ms · ✅ | ☐ | curl -s "http://localhost:3000/dj/recommend/type?type=1&realIP=116.25.146.177" |
| 68 | `/dj/sub` | `t` `rid` | loginRequired | P1 | 301 / 301 · 57ms · ✅ | ☐ | （人工/带 cookie 执行） |
| 69 | `/dj/sublist` | `limit`? `offset`? | http200 | P0 | 200 / 200 · 55ms · ✅ | ☐ | curl -s "http://localhost:3000/dj/sublist?limit=30&offset=0&realIP=116.25.146.177" |
| 70 | `/dj/subscriber` | `time`? `id` `limit`? | http200 | P0 | 200 / 200 · 56ms · ✅ | ☐ | curl -s "http://localhost:3000/dj/subscriber?time=0&id=3470602&limit=30&realIP=116.25.146.177" |
| 71 | `/dj/today/perfered` | `page`? | http200 | P0 | 200 / 200 · 64ms · ✅ | ☐ | curl -s "http://localhost:3000/dj/today/perfered?page=1&realIP=116.25.146.177" |
| 72 | `/dj/toplist` | `limit`? `offset`? `type`? | http200 | P0 | 200 / 200 · 88ms · ✅ | ☐ | curl -s "http://localhost:3000/dj/toplist?limit=30&offset=0&type=1&realIP=116.25.146.177" |
| 73 | `/dj/toplist/hours` | `limit`? | http200 | P0 | 200 / 200 · 233ms · ✅ | ☐ | curl -s "http://localhost:3000/dj/toplist/hours?limit=30&realIP=116.25.146.177" |
| 74 | `/dj/toplist/newcomer` | `limit`? `offset`? | http200 | P0 | 200 / 200 · 169ms · ✅ | ☐ | curl -s "http://localhost:3000/dj/toplist/newcomer?limit=30&offset=0&realIP=116.25.146.177" |
| 75 | `/dj/toplist/pay` | `limit`? | http200 | P0 | 200 / 200 · 83ms · ✅ | ☐ | curl -s "http://localhost:3000/dj/toplist/pay?limit=30&realIP=116.25.146.177" |
| 76 | `/dj/toplist/popular` | `limit`? | http200 | P0 | 200 / 200 · 178ms · ✅ | ☐ | curl -s "http://localhost:3000/dj/toplist/popular?limit=30&realIP=116.25.146.177" |
| 77 | `/event` | `pagesize`? `lasttime`? | loginRequired | P1 | 301 / 301 · 85ms · ✅ | ☐ | （人工/带 cookie 执行） |
| 78 | `/event/del` | `evId` | http200 | P0 | 403 / 403 · 53ms · ✅<br>⚠ 重构前实测 HTTP 403（上游失效/缺参数，重构后需保持一致） | ☐ | curl -s "http://localhost:3000/event/del?evId=32311&realIP=116.25.146.177" |
| 79 | `/event/forward` | `forwards` `evId` `uid` | loginRequired | P1 | 301 / 301 · 53ms · ✅ | ☐ | （人工/带 cookie 执行） |
| 80 | `/fm_trash` | `id` `time`? | loginRequired | P1 | 301 / 301 · 56ms · ✅ | ☐ | （人工/带 cookie 执行） |
| 81 | `/follow` | `t` `id` | loginRequired | P1 | 301 / 301 · 70ms · ✅ | ☐ | （人工/带 cookie 执行） |
| 82 | `/history/recommend/songs` | — | http200 | P0 | 200 / 200 · 58ms · ✅ | ☐ | curl -s "http://localhost:3000/history/recommend/songs?" |
| 83 | `/history/recommend/songs/detail` | `date`? | loginRequired | P1 | 301 / 301 · 50ms · ✅ | ☐ | （人工/带 cookie 执行） |
| 84 | `/homepage/block/page` | `refresh`? `cursor` | http200 | P0 | 200 / 200 · 98ms · ✅ | ☐ | curl -s "http://localhost:3000/homepage/block/page?cursor=" |
| 85 | `/homepage/dragon/ball` | — | http200 | P0 | 200 / 200 · 58ms · ✅ | ☐ | curl -s "http://localhost:3000/homepage/dragon/ball?" |
| 86 | `/hot/topic` | `limit`? `offset`? | loginRequired | P1 | 301 / 301 · 57ms · ✅ | ☐ | （人工/带 cookie 执行） |
| 87 | `/hug/comment` | `type`? `sid` `uid` `cid` | loginRequired | P1 | 301 / 301 · 70ms · ✅ | ☐ | （人工/带 cookie 执行） |
| 88 | `/inner/version` | — | http200 | P0 | 200 / 200 · 7ms · ✅ | ☐ | curl -s "http://localhost:3000/inner/version?realIP=116.25.146.177" |
| 89 | `/like` | `like` `id` | loginRequired | P1 | 301 / 301 · 56ms · ✅ | ☐ | （人工/带 cookie 执行） |
| 90 | `/likelist` | `uid` | loginRequired | P1 | 301 / 301 · 60ms · ✅ | ☐ | （人工/带 cookie 执行） |
| 91 | `/listentogether/end` | `roomId` | http200 | P0 | 200 / 301 · 91ms · ✅ | ☐ | curl -s "http://localhost:3000/listentogether/end?roomId=32311&realIP=116.25.146.177" |
| 92 | `/listentogether/heatbeat` | `roomId` `songId` `playStatus` `progress` | http200 | P0 | 502 / 502 · 83ms · ✅<br>⚠ 重构前实测 HTTP 502（上游失效/缺参数，重构后需保持一致） | ☐ | curl -s "http://localhost:3000/listentogether/heatbeat?roomId=32311&songId=347230&playStatus=&progress=&realIP=116.25.146.177" |
| 93 | `/listentogether/play/command` | `roomId` `commandType` `progress`? `playStatus` `formerSongId` `targetSongId` `clientSeq` | http200 | P0 | 200 / 301 · 77ms · ✅ | ☐ | curl -s "http://localhost:3000/listentogether/play/command?roomId=32311&commandType=&playStatus=&formerSongId=347230&targetSongId=347230&clientSeq=&realIP=116.25.146.177" |
| 94 | `/listentogether/room/check` | `roomId` | http200 | P0 | 200 / 301 · 82ms · ✅ | ☐ | curl -s "http://localhost:3000/listentogether/room/check?roomId=32311&realIP=116.25.146.177" |
| 95 | `/listentogether/room/create` | — | http200 | P0 | 200 / 301 · 80ms · ✅ | ☐ | curl -s "http://localhost:3000/listentogether/room/create?realIP=116.25.146.177" |
| 96 | `/listentogether/status` | — | loginRequired | P1 | 301 / 301 · 55ms · ✅ | ☐ | （人工/带 cookie 执行） |
| 97 | `/listentogether/sync/list/command` | `roomId` `commandType` `userId` `version` `randomList` `displayList` | http200 | P0 | 200 / 301 · 39ms · ✅ | ☐ | curl -s "http://localhost:3000/listentogether/sync/list/command?roomId=32311&commandType=&userId=32953014&version=&randomList=&displayList=&realIP=116.25.146.177" |
| 98 | `/listentogether/sync/playlist/get` | `roomId` | http200 | P0 | 200 / 301 · 39ms · ✅ | ☐ | curl -s "http://localhost:3000/listentogether/sync/playlist/get?roomId=24381616&realIP=116.25.146.177" |
| 99 | `/login` | `email` `md5_password`? `password` | http200 | P0 | 200 / 502 · 171ms · ✅ | ☐ | curl -s "http://localhost:3000/login?email=&password=" |
| 100 | `/login/qr/create` | `key` `qrimg` | code200 | P0 | 200 / 200 · 1ms · ✅ | ☐ | curl -s "http://localhost:3000/login/qr/create?key=&qrimg=&realIP=116.25.146.177" |
| 101 | `/login/qr/key` | — | http200 | P0 | 200 / 200 · 56ms · ✅ | ☐ | curl -s "http://localhost:3000/login/qr/key?realIP=116.25.146.177" |
| 102 | `/lyric` | `id` | http200 | P0 | 200 / 200 · 79ms · ✅ | ☐ | curl -s "http://localhost:3000/lyric?id=347230" |
| 103 | `/lyric/new` | `id` | http200 | P0 | 200 / 200 · 63ms · ✅ | ☐ | curl -s "http://localhost:3000/lyric/new?id=347230&realIP=116.25.146.177" |
| 104 | `/mlog/music/rcmd` | `mvid`? `limit`? `songid` | http200 | P0 | 200 / 200 · 89ms · ✅ | ☐ | curl -s "http://localhost:3000/mlog/music/rcmd?mvid=5436712&limit=30&songid=5436712&realIP=116.25.146.177" |
| 105 | `/mlog/to/video` | `id` | http200 | P0 | 200 / 400 · 50ms · ✅ | ☐ | curl -s "http://localhost:3000/mlog/to/video?id=5436712&realIP=116.25.146.177" |
| 106 | `/mlog/url` | `id` `res`? | http200 | P0 | 200 / 400 · 95ms · ✅ | ☐ | curl -s "http://localhost:3000/mlog/url?id=5436712&realIP=116.25.146.177" |
| 107 | `/msg/comments` | `before`? `limit`? `uid` | loginRequired | P1 | 301 / 301 · 71ms · ✅ | ☐ | （人工/带 cookie 执行） |
| 108 | `/msg/forwards` | `offset`? `limit`? | loginRequired | P1 | 301 / 301 · 81ms · ✅ | ☐ | （人工/带 cookie 执行） |
| 109 | `/msg/notices` | `limit`? `lasttime`? | loginRequired | P1 | 301 / 301 · 81ms · ✅ | ☐ | （人工/带 cookie 执行） |
| 110 | `/msg/private` | `offset`? `limit`? | loginRequired | P1 | 301 / 301 · 85ms · ✅ | ☐ | （人工/带 cookie 执行） |
| 111 | `/msg/private/history` | `uid` `limit`? `before`? | loginRequired | P1 | 301 / 301 · 87ms · ✅ | ☐ | （人工/带 cookie 执行） |
| 112 | `/msg/recentcontact` | — | loginRequired | P1 | 301 / 301 · 101ms · ✅ | ☐ | （人工/带 cookie 执行） |
| 113 | `/musician/cloudbean` | — | loginRequired | P1 | 301 / 301 · 55ms · ✅ | ☐ | （人工/带 cookie 执行） |
| 114 | `/musician/cloudbean/obtain` | `id` `period` | loginRequired | P1 | 301 / 301 · 52ms · ✅ | ☐ | （人工/带 cookie 执行） |
| 115 | `/musician/data/overview` | — | http200 | P0 | 200 / 302 · 53ms · ✅ | ☐ | curl -s "http://localhost:3000/musician/data/overview?realIP=116.25.146.177" |
| 116 | `/musician/play/trend` | `startTime` `endTime` | http200 | P0 | 200 / 302 · 119ms · ✅ | ☐ | curl -s "http://localhost:3000/musician/play/trend?startTime=0&endTime=0&realIP=116.25.146.177" |
| 117 | `/musician/sign` | — | http200 | P0 | 200 / 302 · 55ms · ✅ | ☐ | curl -s "http://localhost:3000/musician/sign?realIP=116.25.146.177" |
| 118 | `/musician/tasks` | — | loginRequired | P1 | 301 / 301 · 52ms · ✅ | ☐ | （人工/带 cookie 执行） |
| 119 | `/musician/tasks/new` | — | loginRequired | P1 | 301 / 301 · 55ms · ✅ | ☐ | （人工/带 cookie 执行） |
| 120 | `/mv/all` | `area`? `type`? `order`? `offset`? `limit`? | http200 | P0 | 200 / 400 · 37ms · ✅ | ☐ | curl -s "http://localhost:3000/mv/all?area=ALL&type=1&order=hot&offset=0&limit=30&realIP=116.25.146.177" |
| 121 | `/mv/detail` | `mvid` | http200 | P0 | 200 / 200 · 85ms · ✅ | ☐ | curl -s "http://localhost:3000/mv/detail?mvid=5436712&realIP=116.25.146.177" |
| 122 | `/mv/detail/info` | `mvid` | http200 | P0 | 200 / 200 · 111ms · ✅ | ☐ | curl -s "http://localhost:3000/mv/detail/info?mvid=5436712&realIP=116.25.146.177" |
| 123 | `/mv/exclusive/rcmd` | `offset`? `limit`? | http200 | P0 | 200 / 200 · 57ms · ✅ | ☐ | curl -s "http://localhost:3000/mv/exclusive/rcmd?offset=0&limit=30&realIP=116.25.146.177" |
| 124 | `/mv/first` | `offset`? `area`? `limit`? | http200 | P0 | 200 / 200 · 101ms · ✅ | ☐ | curl -s "http://localhost:3000/mv/first?offset=0&area=ALL&limit=30&realIP=116.25.146.177" |
| 125 | `/mv/sub` | `t` `mvid` | loginRequired | P1 | 301 / 301 · 54ms · ✅ | ☐ | （人工/带 cookie 执行） |
| 126 | `/mv/sublist` | `limit`? `offset`? | loginRequired | P1 | 301 / 301 · 55ms · ✅ | ☐ | （人工/带 cookie 执行） |
| 127 | `/mv/url` | `id` `r`? | http200 | P0 | 200 / 200 · 116ms · ✅ | ☐ | curl -s "http://localhost:3000/mv/url?id=5436712&realIP=116.25.146.177" |
| 128 | `/nickname/check` | `nickname` | http200 | P0 | 200 / 200 · 58ms · ✅ | ☐ | curl -s "http://localhost:3000/nickname/check?nickname=test&realIP=116.25.146.177" |
| 129 | `/personal_fm` | — | http200 | P0 | 200 / 200 · 120ms · ✅ | ☐ | curl -s "http://localhost:3000/personal_fm?realIP=116.25.146.177" |
| 130 | `/personalized` | `limit`? `offset`? | http200 | P0 | 200 / 200 · 330ms · ✅ | ☐ | curl -s "http://localhost:3000/personalized?limit=30&offset=0&realIP=116.25.146.177" |
| 131 | `/personalized/djprogram` | — | http200 | P0 | 200 / 200 · 276ms · ✅ | ☐ | curl -s "http://localhost:3000/personalized/djprogram?realIP=116.25.146.177" |
| 132 | `/personalized/mv` | — | http200 | P0 | 200 / 200 · 74ms · ✅ | ☐ | curl -s "http://localhost:3000/personalized/mv?realIP=116.25.146.177" |
| 133 | `/personalized/newsong` | `limit`? `areaId`? | http200 | P0 | 200 / 200 · 192ms · ✅ | ☐ | curl -s "http://localhost:3000/personalized/newsong?limit=30&areaId=347230" |
| 134 | `/personalized/privatecontent` | — | http200 | P0 | 200 / 200 · 59ms · ✅ | ☐ | curl -s "http://localhost:3000/personalized/privatecontent?realIP=116.25.146.177" |
| 135 | `/personalized/privatecontent/list` | `offset`? `limit`? | http200 | P0 | 200 / 200 · 56ms · ✅ | ☐ | curl -s "http://localhost:3000/personalized/privatecontent/list?offset=0&limit=30&realIP=116.25.146.177" |
| 136 | `/pl/count` | — | http200 | P0 | 200 · 60ms · ✅ | ☐ | curl -s "http://localhost:3000/pl/count?realIP=116.25.146.177" |
| 137 | `/playlist/catlist` | — | http200 | P0 | 200 / 200 · 63ms · ✅ | ☐ | curl -s "http://localhost:3000/playlist/catlist?realIP=116.25.146.177" |
| 138 | `/playlist/cover/update` | `imgFile` `id` | http200 | P0 | 400 / 400 · 2ms · ✅<br>⚠ 重构前实测 HTTP 400（上游失效/缺参数，重构后需保持一致） | ☐ | curl -s "http://localhost:3000/playlist/cover/update?imgFile=&id=24381616&realIP=116.25.146.177" |
| 139 | `/playlist/create` | `name` `privacy` `type`? | loginRequired | P1 | 301 / 301 · 64ms · ✅ | ☐ | （人工/带 cookie 执行） |
| 140 | `/playlist/delete` | `id` | loginRequired | P1 | 301 / 301 · 52ms · ✅ | ☐ | （人工/带 cookie 执行） |
| 141 | `/playlist/desc/update` | `id` `desc` | http200 | P0 | 200 / 301 · 57ms · ✅ | ☐ | curl -s "http://localhost:3000/playlist/desc/update?id=24381616&desc=&realIP=116.25.146.177" |
| 142 | `/playlist/detail` | `id` `s`? | http200 | P0 | 200 / 400 · 54ms · ✅ | ☐ | curl -s "http://localhost:3000/playlist/detail?id=24381616&s=%E6%B5%B7%E9%98%94%E5%A4%A9%E7%A9%BA&realIP=116.25.146.177" |
| 143 | `/playlist/detail/dynamic` | `id` `s`? | http200 | P0 | 200 / 200 · 63ms · ✅ | ☐ | curl -s "http://localhost:3000/playlist/detail/dynamic?id=24381616&s=%E6%B5%B7%E9%98%94%E5%A4%A9%E7%A9%BA&realIP=116.25.146.177" |
| 144 | `/playlist/highquality/tags` | — | http200 | P0 | 200 / 200 · 55ms · ✅ | ☐ | curl -s "http://localhost:3000/playlist/highquality/tags?realIP=116.25.146.177" |
| 145 | `/playlist/hot` | — | http200 | P0 | 200 / 200 · 49ms · ✅ | ☐ | curl -s "http://localhost:3000/playlist/hot?realIP=116.25.146.177" |
| 146 | `/playlist/mylike` | `time`? `limit`? | loginRequired | P1 | 301 / 301 · 52ms · ✅ | ☐ | （人工/带 cookie 执行） |
| 147 | `/playlist/name/update` | `id` `name` | http200 | P0 | 200 / 301 · 67ms · ✅ | ☐ | curl -s "http://localhost:3000/playlist/name/update?id=24381616&name=test&realIP=116.25.146.177" |
| 148 | `/playlist/order/update` | `ids` | loginRequired | P1 | 301 / 301 · 51ms · ✅ | ☐ | （人工/带 cookie 执行） |
| 149 | `/playlist/privacy` | `id` | http200 | P0 | 200 / 301 · 39ms · ✅ | ☐ | curl -s "http://localhost:3000/playlist/privacy?id=24381616&realIP=116.25.146.177" |
| 150 | `/playlist/subscribe` | `t` `id` | http200 | P0 | 403 / 403 · 56ms · ✅<br>⚠ 重构前实测 HTTP 403（上游失效/缺参数，重构后需保持一致） | ☐ | curl -s "http://localhost:3000/playlist/subscribe?t=&id=24381616&realIP=116.25.146.177" |
| 151 | `/playlist/subscribers` | `id` `limit`? `offset`? | http200 | P0 | 200 / 200 · 62ms · ✅ | ☐ | curl -s "http://localhost:3000/playlist/subscribers?id=24381616&limit=30&offset=0&realIP=116.25.146.177" |
| 152 | `/playlist/tags/update` | `id` `tags` | http200 | P0 | 200 / 301 · 109ms · ✅ | ☐ | curl -s "http://localhost:3000/playlist/tags/update?id=24381616&tags=&realIP=116.25.146.177" |
| 153 | `/playlist/track/add` | `ids`? `pid` | loginRequired | P1 | 301 / 301 · 53ms · ✅ | ☐ | （人工/带 cookie 执行） |
| 154 | `/playlist/track/all` | `id` `s`? `limit` `offset` | http200 | P0 | 404 / 404 · 71ms · ✅<br>⚠ 重构前实测 HTTP 404（上游失效/缺参数，重构后需保持一致） | ☐ | curl -s "http://localhost:3000/playlist/track/all?id=24381616&s=%E6%B5%B7%E9%98%94%E5%A4%A9%E7%A9%BA&limit=30&offset=0&realIP=116.25.146.177" |
| 155 | `/playlist/track/delete` | `ids`? `id` | loginRequired | P1 | 301 / 301 · 53ms · ✅ | ☐ | （人工/带 cookie 执行） |
| 156 | `/playlist/tracks` | `tracks` `op` `pid` | http200 | P0 | 200 / 301 · 52ms · ✅ | ☐ | curl -s "http://localhost:3000/playlist/tracks?tracks=&op=&pid=24381616" |
| 157 | `/playlist/update` | `desc`? `tags`? `id` `name` | http200 | P0 | 200 / 200 · 64ms · ✅ | ☐ | curl -s "http://localhost:3000/playlist/update?id=24381616&name=test" |
| 158 | `/playlist/update/playcount` | `id` | http200 | P0 | 200 / 200 · 58ms · ✅ | ☐ | curl -s "http://localhost:3000/playlist/update/playcount?id=24381616&realIP=116.25.146.177" |
| 159 | `/playlist/video/recent` | — | http200 | P0 | 200 / 200 · 47ms · ✅ | ☐ | curl -s "http://localhost:3000/playlist/video/recent?realIP=116.25.146.177" |
| 160 | `/playmode/intelligence/list` | `id` `pid` `sid`? `count`? | loginRequired | P1 | 301 / 301 · 55ms · ✅ | ☐ | （人工/带 cookie 执行） |
| 161 | `/program/recommend` | `type` `limit`? `offset`? | http200 | P0 | 200 / 200 · 155ms · ✅ | ☐ | curl -s "http://localhost:3000/program/recommend?type=1&limit=30&offset=0&realIP=116.25.146.177" |
| 162 | `/recommend/resource` | — | loginRequired | P1 | 301 / 301 · 59ms · ✅ | ☐ | （人工/带 cookie 执行） |
| 163 | `/recommend/songs` | — | http200 | P0 | 200 / 200 · 111ms · ✅ | ☐ | curl -s "http://localhost:3000/recommend/songs?" |
| 164 | `/record/recent/album` | `limit`? | http200 | P0 | 200 / 200 · 55ms · ✅ | ☐ | curl -s "http://localhost:3000/record/recent/album?limit=30&realIP=116.25.146.177" |
| 165 | `/record/recent/dj` | `limit`? | http200 | P0 | 200 / 200 · 49ms · ✅ | ☐ | curl -s "http://localhost:3000/record/recent/dj?limit=30&realIP=116.25.146.177" |
| 166 | `/record/recent/playlist` | `limit`? | http200 | P0 | 200 / 200 · 53ms · ✅ | ☐ | curl -s "http://localhost:3000/record/recent/playlist?limit=30&realIP=116.25.146.177" |
| 167 | `/record/recent/song` | `limit`? | http200 | P0 | 200 / 200 · 50ms · ✅ | ☐ | curl -s "http://localhost:3000/record/recent/song?limit=30&realIP=116.25.146.177" |
| 168 | `/record/recent/video` | `limit`? | http200 | P0 | 200 / 200 · 52ms · ✅ | ☐ | curl -s "http://localhost:3000/record/recent/video?limit=30&realIP=116.25.146.177" |
| 169 | `/record/recent/voice` | `limit`? | http200 | P0 | 200 / 200 · 56ms · ✅ | ☐ | curl -s "http://localhost:3000/record/recent/voice?limit=30&realIP=116.25.146.177" |
| 170 | `/related/allvideo` | `id` | http200 | P0 | 200 / 200 · 77ms · ✅ | ☐ | curl -s "http://localhost:3000/related/allvideo?id=5436712&realIP=116.25.146.177" |
| 171 | `/related/playlist` | `id` | http200 | P0 | 200 / 200 · 283ms · ✅ | ☐ | curl -s "http://localhost:3000/related/playlist?id=24381616&realIP=116.25.146.177" |
| 172 | `/resource/like` | `t` `type` `id` `threadId` | loginRequired | P1 | 301 / 301 · 81ms · ✅ | ☐ | （人工/带 cookie 执行） |
| 173 | `/scrobble` | `id` `sourceid` `time` | http200 | P0 | 200 / 200 · 51ms · ✅ | ☐ | curl -s "http://localhost:3000/scrobble?id=347230&sourceid=347230&time=0&realIP=116.25.146.177" |
| 174 | `/search` | `type`? `keywords` `limit`? `offset`? | http200 | P0 | 200 / 200 · 265ms · ✅ | ☐ | curl -s "http://localhost:3000/search?type=1&keywords=%E6%B5%B7%E9%98%94%E5%A4%A9%E7%A9%BA&limit=30&offset=0&realIP=116.25.146.177" |
| 175 | `/search/default` | — | http200 | P0 | 200 / 200 · 78ms · ✅ | ☐ | curl -s "http://localhost:3000/search/default?realIP=116.25.146.177" |
| 176 | `/search/hot` | — | http200 | P0 | 200 / 200 · 121ms · ✅ | ☐ | curl -s "http://localhost:3000/search/hot?realIP=116.25.146.177" |
| 177 | `/search/hot/detail` | — | http200 | P0 | 200 / 200 · 97ms · ✅ | ☐ | curl -s "http://localhost:3000/search/hot/detail?realIP=116.25.146.177" |
| 178 | `/search/multimatch` | `type`? `keywords`? | http200 | P0 | 200 / 200 · 202ms · ✅ | ☐ | curl -s "http://localhost:3000/search/multimatch?type=1&keywords=%E6%B5%B7%E9%98%94%E5%A4%A9%E7%A9%BA&realIP=116.25.146.177" |
| 179 | `/search/suggest` | `keywords`? `type` | http200 | P0 | 200 / 200 · 98ms · ✅ | ☐ | curl -s "http://localhost:3000/search/suggest?keywords=%E6%B5%B7%E9%98%94%E5%A4%A9%E7%A9%BA&type=1&realIP=116.25.146.177" |
| 180 | `/send/album` | `id` `msg`? `user_ids` | loginRequired | P1 | 301 / 301 · 88ms · ✅ | ☐ | （人工/带 cookie 执行） |
| 181 | `/send/playlist` | `playlist` `msg` `user_ids` | loginRequired | P1 | 301 / 301 · 83ms · ✅ | ☐ | （人工/带 cookie 执行） |
| 182 | `/send/song` | `id` `msg`? `user_ids` | loginRequired | P1 | 301 / 301 · 89ms · ✅ | ☐ | （人工/带 cookie 执行） |
| 183 | `/send/text` | `msg` `user_ids` | loginRequired | P1 | 301 / 301 · 99ms · ✅ | ☐ | （人工/带 cookie 执行） |
| 184 | `/setting` | — | http200 | P0 | 200 / 400 · 54ms · ✅ | ☐ | curl -s "http://localhost:3000/setting?realIP=116.25.146.177" |
| 185 | `/share/resource` | `type`? `msg`? `id`? | loginRequired | P1 | 301 / 301 · 67ms · ✅ | ☐ | （人工/带 cookie 执行） |
| 186 | `/sheet/list` | `id` `ab`? | http200 | P0 | 200 / 200 · 50ms · ✅ | ☐ | curl -s "http://localhost:3000/sheet/list?id=32311&realIP=116.25.146.177" |
| 187 | `/sheet/preview` | `id` | http200 | P0 | 200 / 200 · 45ms · ✅ | ☐ | curl -s "http://localhost:3000/sheet/preview?id=32311&realIP=116.25.146.177" |
| 188 | `/sign/happy/info` | — | http200 | P0 | 200 / 302 · 60ms · ✅ | ☐ | curl -s "http://localhost:3000/sign/happy/info?realIP=116.25.146.177" |
| 189 | `/signin/progress` | `moduleId`? | loginRequired | P1 | 301 / 301 · 54ms · ✅ | ☐ | （人工/带 cookie 执行） |
| 190 | `/simi/artist` | `id` | loginRequired | P1 | 301 / 301 · 57ms · ✅ | ☐ | （人工/带 cookie 执行） |
| 191 | `/simi/mv` | `mvid` | http200 | P0 | 200 / 200 · 61ms · ✅ | ☐ | curl -s "http://localhost:3000/simi/mv?mvid=5436712&realIP=116.25.146.177" |
| 192 | `/simi/playlist` | `id` `limit`? `offset`? | http200 | P0 | 200 / 200 · 66ms · ✅ | ☐ | curl -s "http://localhost:3000/simi/playlist?id=24381616&limit=30&offset=0&realIP=116.25.146.177" |
| 193 | `/simi/song` | `id` `limit`? `offset`? | http200 | P0 | 200 / 200 · 595ms · ✅ | ☐ | curl -s "http://localhost:3000/simi/song?id=347230&limit=30&offset=0&realIP=116.25.146.177" |
| 194 | `/simi/user` | `id` `limit`? `offset`? | loginRequired | P1 | 301 / 301 · 56ms · ✅ | ☐ | （人工/带 cookie 执行） |
| 195 | `/song/detail` | `ids` | http200 | P0 | 200 / 200 · 165ms · ✅ | ☐ | curl -s "http://localhost:3000/song/detail?ids=347230&realIP=116.25.146.177" |
| 196 | `/song/download/url` | `id` `br`? | http200 | P0 | 200 / 200 · 59ms · ✅ | ☐ | curl -s "http://localhost:3000/song/download/url?id=347230&br=999000&realIP=116.25.146.177" |
| 197 | `/song/order/update` | `pid` `ids` | loginRequired | P1 | 301 / 301 · 42ms · ✅ | ☐ | （人工/带 cookie 执行） |
| 198 | `/song/purchased` | `limit`? `offset`? | loginRequired | P1 | 301 / 301 · 60ms · ✅ | ☐ | （人工/带 cookie 执行） |
| 199 | `/song/url` | `id` `br`? | http200 | P0 | 200 / 200 · 85ms · ✅ | ☐ | curl -s "http://localhost:3000/song/url?id=347230&br=999000" |
| 200 | `/song/url/v1` | `id` `level` | http200 | P0 | 200 / 200 · 71ms · ✅ | ☐ | curl -s "http://localhost:3000/song/url/v1?id=347230&level=standard" |
| 201 | `/song/wiki/summary` | `id` | http200 | P0 | 200 / 200 · 169ms · ✅ | ☐ | curl -s "http://localhost:3000/song/wiki/summary?id=347230&realIP=116.25.146.177" |
| 202 | `/style/album` | `cursor`? `size`? `tagId` `sort`? | http200 | P0 | 200 / 200 · 63ms · ✅ | ☐ | curl -s "http://localhost:3000/style/album?size=20&tagId=32311&realIP=116.25.146.177" |
| 203 | `/style/artist` | `cursor`? `size`? `tagId` | http200 | P0 | 200 / 200 · 62ms · ✅ | ☐ | curl -s "http://localhost:3000/style/artist?size=20&tagId=5781&realIP=116.25.146.177" |
| 204 | `/style/detail` | `tagId` | http200 | P0 | 200 / 200 · 52ms · ✅ | ☐ | curl -s "http://localhost:3000/style/detail?tagId=347230&realIP=116.25.146.177" |
| 205 | `/style/list` | — | http200 | P0 | 200 / 200 · 75ms · ✅ | ☐ | curl -s "http://localhost:3000/style/list?realIP=116.25.146.177" |
| 206 | `/style/playlist` | `cursor`? `size`? `tagId` | http200 | P0 | 200 / 200 · 100ms · ✅ | ☐ | curl -s "http://localhost:3000/style/playlist?size=20&tagId=24381616&realIP=116.25.146.177" |
| 207 | `/style/preference` | — | http200 | P0 | 200 / 200 · 91ms · ✅ | ☐ | curl -s "http://localhost:3000/style/preference?realIP=116.25.146.177" |
| 208 | `/style/song` | `cursor`? `size`? `tagId` `sort`? | http200 | P0 | 200 / 200 · 71ms · ✅ | ☐ | curl -s "http://localhost:3000/style/song?size=20&tagId=347230&realIP=116.25.146.177" |
| 209 | `/top/album` | `area`? `limit`? `offset`? `type`? `year`? `month`? | http200 | P0 | 200 / 200 · 827ms · ✅ | ☐ | curl -s "http://localhost:3000/top/album?area=ALL&limit=30&offset=0&type=1&realIP=116.25.146.177" |
| 210 | `/top/artists` | `limit`? `offset`? | http200 | P0 | 200 / 200 · 62ms · ✅ | ☐ | curl -s "http://localhost:3000/top/artists?limit=30&offset=0&realIP=116.25.146.177" |
| 211 | `/top/list` | `idx` `id` | http200 | P0 | 200 / 400 · 54ms · ✅ | ☐ | curl -s "http://localhost:3000/top/list?idx=&id=32311" |
| 212 | `/top/mv` | `area`? `limit`? `offset`? | http200 | P0 | 200 / 400 · 52ms · ✅ | ☐ | curl -s "http://localhost:3000/top/mv?area=ALL&limit=30&offset=0&realIP=116.25.146.177" |
| 213 | `/top/playlist` | `cat`? `order`? `limit`? `offset`? | http200 | P0 | 200 / 200 · 115ms · ✅ | ☐ | curl -s "http://localhost:3000/top/playlist?cat=%E5%85%A8%E9%83%A8&order=hot&limit=30&offset=0&realIP=116.25.146.177" |
| 214 | `/top/playlist/highquality` | `cat`? `limit`? `before`? | http200 | P0 | 200 / 200 · 104ms · ✅ | ☐ | curl -s "http://localhost:3000/top/playlist/highquality?cat=%E5%85%A8%E9%83%A8&limit=30&before=0&realIP=116.25.146.177" |
| 215 | `/top/song` | `type`? `limit`? `offset`? | http200 | P0 | 200 / 200 · 57ms · ✅ | ☐ | curl -s "http://localhost:3000/top/song?type=1&limit=30&offset=0&realIP=116.25.146.177" |
| 216 | `/topic/detail` | `actid` | http200 | P0 | 404 / 404 · 55ms · ✅<br>⚠ 重构前实测 HTTP 404（上游失效/缺参数，重构后需保持一致） | ☐ | curl -s "http://localhost:3000/topic/detail?actid=347230&realIP=116.25.146.177" |
| 217 | `/topic/detail/event/hot` | `actid` | http200 | P0 | 404 / 404 · 55ms · ✅<br>⚠ 重构前实测 HTTP 404（上游失效/缺参数，重构后需保持一致） | ☐ | curl -s "http://localhost:3000/topic/detail/event/hot?actid=347230&realIP=116.25.146.177" |
| 218 | `/topic/sublist` | `limit`? `offset`? | loginRequired | P1 | 301 / 301 · 57ms · ✅ | ☐ | （人工/带 cookie 执行） |
| 219 | `/toplist` | — | http200 | P0 | 200 / 200 · 95ms · ✅ | ☐ | curl -s "http://localhost:3000/toplist?realIP=116.25.146.177" |
| 220 | `/toplist/artist` | `type`? | http200 | P0 | 200 / 200 · 88ms · ✅ | ☐ | curl -s "http://localhost:3000/toplist/artist?type=1&realIP=116.25.146.177" |
| 221 | `/toplist/detail` | — | http200 | P0 | 200 / 200 · 429ms · ✅ | ☐ | curl -s "http://localhost:3000/toplist/detail?realIP=116.25.146.177" |
| 222 | `/user/account` | — | http200 | P0 | 200 / 200 · 58ms · ✅ | ☐ | curl -s "http://localhost:3000/user/account?realIP=116.25.146.177" |
| 223 | `/user/audio` | `uid` | http200 | P0 | 200 / 200 · 69ms · ✅ | ☐ | curl -s "http://localhost:3000/user/audio?uid=32953014&realIP=116.25.146.177" |
| 224 | `/user/binding` | `uid` | loginRequired | P1 | 301 / 301 · 58ms · ✅ | ☐ | （人工/带 cookie 执行） |
| 225 | `/user/bindingcellphone` | `phone` `countrycode`? `captcha` `password` | loginRequired | P1 | 301 / 301 · 53ms · ✅ | ☐ | （人工/带 cookie 执行） |
| 226 | `/user/cloud` | `limit`? `offset`? | loginRequired | P1 | 301 / 301 · 86ms · ✅ | ☐ | （人工/带 cookie 执行） |
| 227 | `/user/cloud/del` | `id` | loginRequired | P1 | 301 / 301 · 64ms · ✅ | ☐ | （人工/带 cookie 执行） |
| 228 | `/user/cloud/detail` | `id` | loginRequired | P1 | 301 / 301 · 102ms · ✅ | ☐ | （人工/带 cookie 执行） |
| 229 | `/user/comment/history` | `limit`? `uid` `time`? | http200 | P0 | 200 / 200 · 215ms · ✅ | ☐ | curl -s "http://localhost:3000/user/comment/history?limit=30&uid=32953014&time=0" |
| 230 | `/user/detail` | `uid` | http200 | P0 | 200 / 200 · 342ms · ✅ | ☐ | curl -s "http://localhost:3000/user/detail?uid=32953014&realIP=116.25.146.177" |
| 231 | `/user/dj` | `limit`? `offset`? `uid` | http200 | P0 | 200 / 200 · 326ms · ✅ | ☐ | curl -s "http://localhost:3000/user/dj?limit=30&offset=0&uid=3470602&realIP=116.25.146.177" |
| 232 | `/user/event` | `lasttime`? `limit`? `uid` | http200 | P0 | 200 / 200 · 302ms · ✅ | ☐ | curl -s "http://localhost:3000/user/event?lasttime=0&limit=30&uid=32953014" |
| 233 | `/user/followeds` | `uid` `limit`? `offset`? | http200 | P0 | 200 / 200 · 242ms · ✅ | ☐ | curl -s "http://localhost:3000/user/followeds?uid=32953014&limit=30&offset=0&realIP=116.25.146.177" |
| 234 | `/user/follows` | `offset`? `limit`? `uid` | http200 | P0 | 200 / 200 · 226ms · ✅ | ☐ | curl -s "http://localhost:3000/user/follows?offset=0&limit=30&uid=32953014&realIP=116.25.146.177" |
| 235 | `/user/level` | — | loginRequired | P1 | 301 / 301 · 119ms · ✅ | ☐ | （人工/带 cookie 执行） |
| 236 | `/user/playlist` | `uid` `limit`? `offset`? | http200 | P0 | 200 / 200 · 120ms · ✅ | ☐ | curl -s "http://localhost:3000/user/playlist?uid=24381616&limit=30&offset=0&realIP=116.25.146.177" |
| 237 | `/user/record` | `uid` `type`? | http200 | P0 | 400 / -2 · 115ms · ✅<br>⚠ 重构前实测 HTTP 400（上游失效/缺参数，重构后需保持一致） | ☐ | curl -s "http://localhost:3000/user/record?uid=32953014&type=1&realIP=116.25.146.177" |
| 238 | `/user/replacephone` | `phone` `captcha` `oldcaptcha` `countrycode`? | loginRequired | P1 | 301 / 301 · 93ms · ✅ | ☐ | （人工/带 cookie 执行） |
| 239 | `/user/subcount` | — | loginRequired | P1 | 301 / 301 · 59ms · ✅ | ☐ | （人工/带 cookie 执行） |
| 240 | `/user/update` | `birthday` `city` `gender` `nickname` `province` `signature` | http200 | P0 | 403 / 403 · 60ms · ✅<br>⚠ 重构前实测 HTTP 403（上游失效/缺参数，重构后需保持一致） | ☐ | curl -s "http://localhost:3000/user/update?birthday=&city=&gender=&nickname=test&province=&signature=&realIP=116.25.146.177" |
| 241 | `/video/category/list` | `offset`? `limit`? | loginRequired | P1 | 301 / 301 · 78ms · ✅ | ☐ | （人工/带 cookie 执行） |
| 242 | `/video/detail` | `id` | http200 | P0 | 200 / 400 · 133ms · ✅ | ☐ | curl -s "http://localhost:3000/video/detail?id=5436712&realIP=116.25.146.177" |
| 243 | `/video/detail/info` | `vid` | http200 | P0 | 200 / 200 · 78ms · ✅ | ☐ | curl -s "http://localhost:3000/video/detail/info?vid=5436712&realIP=116.25.146.177" |
| 244 | `/video/group` | `id` `offset`? | loginRequired | P1 | 301 / 301 · 130ms · ✅ | ☐ | （人工/带 cookie 执行） |
| 245 | `/video/group/list` | — | http200 | P0 | 200 / 200 · 57ms · ✅ | ☐ | curl -s "http://localhost:3000/video/group/list?realIP=116.25.146.177" |
| 246 | `/video/sub` | `t` `id` | loginRequired | P1 | 301 / 301 · 49ms · ✅ | ☐ | （人工/带 cookie 执行） |
| 247 | `/video/timeline/all` | `offset`? | loginRequired | P1 | 301 / 301 · 60ms · ✅ | ☐ | （人工/带 cookie 执行） |
| 248 | `/video/timeline/recommend` | `offset`? | loginRequired | P1 | 301 / 301 · 62ms · ✅ | ☐ | （人工/带 cookie 执行） |
| 249 | `/video/url` | `id` `res`? | http200 | P0 | 200 / 200 · 51ms · ✅ | ☐ | curl -s "http://localhost:3000/video/url?id=5436712&realIP=116.25.146.177" |
| 250 | `/vip/growthpoint` | — | http200 | P0 | 200 / 200 · 53ms · ✅ | ☐ | curl -s "http://localhost:3000/vip/growthpoint?realIP=116.25.146.177" |
| 251 | `/vip/growthpoint/details` | `limit`? `offset`? | loginRequired | P1 | 301 / 301 · 56ms · ✅ | ☐ | （人工/带 cookie 执行） |
| 252 | `/vip/growthpoint/get` | `ids` | http200 | P0 | 401 / 401 · 56ms · ✅<br>⚠ 重构前实测 HTTP 401（上游失效/缺参数，重构后需保持一致） | ☐ | curl -s "http://localhost:3000/vip/growthpoint/get?ids=32311&realIP=116.25.146.177" |
| 253 | `/vip/info` | — | loginRequired | P1 | 301 / 301 · 60ms · ✅ | ☐ | （人工/带 cookie 执行） |
| 254 | `/vip/tasks` | — | loginRequired | P1 | 301 / 301 · 45ms · ✅ | ☐ | （人工/带 cookie 执行） |
| 255 | `/vip/timemachine` | `startTime` `endTime` `limit`? | loginRequired | P1 | 301 / 301 · 76ms · ✅ | ☐ | （人工/带 cookie 执行） |
| 256 | `/weblog` | `data`? | http200 | P0 | 200 / 200 · 46ms · ✅ | ☐ | curl -s "http://localhost:3000/weblog?realIP=116.25.146.177" |
| 257 | `/yunbei` | — | loginRequired | P1 | 301 / 301 · 51ms · ✅ | ☐ | （人工/带 cookie 执行） |
| 258 | `/yunbei/expense` | `limit`? `offset`? | loginRequired | P1 | 301 / 301 · 76ms · ✅ | ☐ | （人工/带 cookie 执行） |
| 259 | `/yunbei/info` | — | http200 | P0 | 404 / 404 · 60ms · ✅<br>⚠ 重构前实测 HTTP 404（上游失效/缺参数，重构后需保持一致） | ☐ | curl -s "http://localhost:3000/yunbei/info?realIP=116.25.146.177" |
| 260 | `/yunbei/rcmd/song` | `id` `reason`? `yunbeiNum`? | loginRequired | P1 | 301 / 301 · 49ms · ✅ | ☐ | （人工/带 cookie 执行） |
| 261 | `/yunbei/rcmd/song/history` | `size`? `cursor`? | loginRequired | P1 | 301 / 301 · 60ms · ✅ | ☐ | （人工/带 cookie 执行） |
| 262 | `/yunbei/receipt` | `limit`? `offset`? | loginRequired | P1 | 301 / 301 · 51ms · ✅ | ☐ | （人工/带 cookie 执行） |
| 263 | `/yunbei/sign` | — | loginRequired | P1 | 301 / 301 · 57ms · ✅ | ☐ | （人工/带 cookie 执行） |
| 264 | `/yunbei/task/finish` | `userTaskId` `depositCode`? | loginRequired | P1 | 301 / 301 · 51ms · ✅ | ☐ | （人工/带 cookie 执行） |
| 265 | `/yunbei/tasks` | — | loginRequired | P1 | 301 / 301 · 60ms · ✅ | ☐ | （人工/带 cookie 执行） |
| 266 | `/yunbei/tasks/todo` | — | loginRequired | P1 | 301 / 301 · 55ms · ✅ | ☐ | （人工/带 cookie 执行） |
| 267 | `/yunbei/today` | — | loginRequired | P1 | 301 / 301 · 52ms · ✅ | ☐ | （人工/带 cookie 执行） |

## 四、人工验收清单（P2，脚本跳过）

| # | 路由 | 参数（? 为可选） | 人工验收要点 | 验证 |
|---|------|------------------|--------------|------|
| 1 | `/activate/init/profile` | `nickname` | 初始化名字 | ☐ |
| 2 | `/captcha/sent` | `ctcode` `phone` | 发送验证码 | ☐ |
| 3 | `/captcha/verify` | `ctcode` `phone` `captcha` | 校验验证码 | ☐ |
| 4 | `/cloud` | `songFile` | 命令行上传没有md5和size信息,需要填充 | ☐ |
| 5 | `/cloud/match` | `uid` `sid` `asid` | — | ☐ |
| 6 | `/login/cellphone` | `phone` `countrycode` `captcha` `md5_password` `password` | 手机登录 | ☐ |
| 7 | `/login/qr/check` | `key` | ';;' 是前端 setCookies 的分隔约定：803 必须让每个 Set-Cookie 各自 | ☐ |
| 8 | `/login/refresh` | — | 登录刷新 | ☐ |
| 9 | `/login/status` | — | — | ☐ |
| 10 | `/logout` | — | 退出登录 | ☐ |
| 11 | `/rebind` | `captcha` `phone` `oldcaptcha` `ctcode` | 更换手机 | ☐ |
| 12 | `/register/anonimous` | — | 游客登录 | ☐ |
| 13 | `/register/cellphone` | `captcha` `phone` `password` `nickname` `countrycode` | 注册账号 | ☐ |
| 14 | `/song/unblock` | `id` `br` | 歌曲解灰 | ☐ |

## 五、框架级契约（不在路由文件里，重构必须 1:1 保留）

| # | 用例 | 预期 | 验证 |
|---|------|------|------|
| C1 | `OPTIONS` 任意路径 | 204 + CORS 头 | ☐ |
| C2 | 不存在的路由 `GET /__not_exist` | 404，HTML 体 `Cannot GET /__not_exist`（与 Express finalhandler 同形） | ☐ |
| C3 | 任意接口带 `?noCookie=1` | 响应不含 Set-Cookie | ☐ |
| C4 | 同一接口连发两次（2 分钟内） | 第二次命中缓存，响应体一致、耗时显著降低 | ☐ |
| C5 | `/login/*`、`/captcha/*`、`/user/*`、`/daily_signin`、`/puppeteer`、`/netease/*` | 不被缓存（两次响应内容可不同） | ☐ |
| C6 | `GET /netease/credential` | 200（有凭据）/ 404（无凭据） | ☐ |
| C7 | `POST /netease/credential` + `DELETE /netease/credential` | 写入后可读、删除后 404 | ☐ |
| C8 | 路由 + `?server=qq` / `?server=kugou` | 扇出到 src/core/multiverse/{qq,kugou}.ts，格式与 `server=netease` 同构 | ☐ |
| C9 | `/cloud`（multipart，100MB 上限） | 仅该路由解析 multipart；超限拒绝 | ☐ |
| C10 | `/song/unblock` | 走 @unblockneteasemusic/server，路由文件不执行 | ☐ |
| C11 | 模块路由的 HTTP 方法矩阵 | GET/POST/PUT/DELETE/PATCH 都进同一个 handler（原版用 `app.use(route)`，不是 GET-only） | ☐ |
| C12 | `POST /cloud` 带/不带文件 | 带文件进模块（无凭据应 301）；不带文件 404（与 Express 版同形） | ☐ |

## 六、统计

- 对外接口总数：**281**（src/routes/**/*.ts 单一来源）
- P0 免登录自动：186
- P1 需登录：81
- P2 人工：14
- 重构前实测基线：跑 267 条，通过 267，失败 0（失败多为上游 404/502 或需登录，重构后做到「与基线一致」即可）
- 重构后对比结果：**一致=267 差异=0 缺失=0**（TS + Fastify 版 vs 重构前 Express 版，见 `docs/regression-report.md`）
- `/album/songsaleboard` 示例参数待人工确认：`year`
- `/album/sub` 示例参数待人工确认：`t`
- `/artist/sub` 示例参数待人工确认：`t`
- `/cellphone/existence/check` 示例参数待人工确认：`phone`
- `/comment` 示例参数待人工确认：`t`
- `/comment/like` 示例参数待人工确认：`t`
- `/comment/new` 示例参数待人工确认：`sortType`
- `/digitalAlbum/ordering` 示例参数待人工确认：`payment` `quantity`
- `/dj/program` 示例参数待人工确认：`asc`
- `/dj/sub` 示例参数待人工确认：`t`
- `/event/forward` 示例参数待人工确认：`forwards`
- `/follow` 示例参数待人工确认：`t`
- `/homepage/block/page` 示例参数待人工确认：`cursor`
- `/like` 示例参数待人工确认：`like`
- `/listentogether/heatbeat` 示例参数待人工确认：`playStatus` `progress`
- `/listentogether/play/command` 示例参数待人工确认：`commandType` `playStatus` `clientSeq`
- `/listentogether/sync/list/command` 示例参数待人工确认：`commandType` `version` `randomList` `displayList`
- `/login` 示例参数待人工确认：`email` `password`
- `/login/qr/create` 示例参数待人工确认：`key` `qrimg`
- `/musician/cloudbean/obtain` 示例参数待人工确认：`period`
- `/mv/sub` 示例参数待人工确认：`t`
- `/playlist/cover/update` 示例参数待人工确认：`imgFile`
- `/playlist/create` 示例参数待人工确认：`privacy`
- `/playlist/desc/update` 示例参数待人工确认：`desc`
- `/playlist/subscribe` 示例参数待人工确认：`t`
- `/playlist/tags/update` 示例参数待人工确认：`tags`
- `/playlist/tracks` 示例参数待人工确认：`tracks` `op`
- `/resource/like` 示例参数待人工确认：`t`
- `/send/playlist` 示例参数待人工确认：`playlist`
- `/top/list` 示例参数待人工确认：`idx`
- `/user/bindingcellphone` 示例参数待人工确认：`phone` `captcha` `password`
- `/user/replacephone` 示例参数待人工确认：`phone` `captcha` `oldcaptcha`
- `/user/update` 示例参数待人工确认：`birthday` `city` `gender` `province` `signature`
- `/video/sub` 示例参数待人工确认：`t`

> 示例参数由参数名+路由语义推断（`id` 类按 /album→32311、/song→347230、/artist→5781、/playlist→24381616 等真实资源填充，与 test/ 现有用例一致）。
> 标"待人工确认"的是推断不出值的参数，跑之前补进 `docs/api-cases.json` 对应条目的 `params`，再重新执行即可。
