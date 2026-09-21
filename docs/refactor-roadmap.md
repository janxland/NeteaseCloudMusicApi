# TS + 新框架重构路线图（NeteaseCloudMusicApi）

> 目标：把 281 个 Express 薄路由改造成 TypeScript + 现代框架（自带 OpenAPI），并且**对外行为 1:1 不变**。
> 验收依据：`docs/refactor-api-test-plan.md`（281 条用例）+ `scripts/api-regression.cjs` + `scripts/verify-contracts.cjs`。

## 当前状态：阶段 0-5 全部完成，JS 双源已删除

| 阶段 | 状态 | 产物 |
|------|------|------|
| 0 建基线 | ✅ | `docs/api-cases.json`、`docs/regression-baseline.json`（267 条自动用例） |
| 1 TS 化基建 | ✅ | `tsconfig.json`（分级 strict）、`tsconfig.build.json`、`npm run typecheck` **0 error**、`src/types.ts`、`src/shims.d.ts` |
| 2 请求层收口 | ✅ | `src/core/{upstream,crypto,cookies,cache,cache-policy,client-profile,credential-store}.ts`——`util/*.js` 已全部内联为 TS 并删除 |
| 3 路由迁移 | ✅ | `src/routes/**/*.ts` 281 个（单一来源，`module/*.js` 已删除），`src/core/routes.ts` 自动发现 |
| 4 切框架 | ✅ | `src/app.ts`（Fastify 5）：CORS/OPTIONS 204、cookie 解析、缓存 hook、`/cloud` multipart、`/puppeteer`、`/netease/credential`、`/song/unblock`、qq/kugou 扇出、Swagger UI |
| 5 文档与观测 | ✅ | `/documentation`、`/healthz`（路由数 + 缓存状态）、`docs/contract-report.md`（C1-C13）、P2 冒烟清单 |

**验收结果**

```
typecheck         0 error
lint              0 error（47 warning，全部是核心层刻意的 any）
全量回归          267/267 通过；与重构前 Express 基线对比 一致=267 差异=0 缺失=0
框架契约 C1-C13   13/13 通过
单元测试          5 passing
生产构建           npm run build && node dist/main.js 正常服务
```

```bash
npm start                  # tsx 直跑 src/main.ts（开发/部署默认）
npm run start:cluster      # 多进程（min(CPU,4) + 崩溃自愈）
npm run dev                # tsx watch
npm run build              # tsc -p tsconfig.build.json -> dist/
npm run start:prod         # node dist/main.js
npm run typecheck          # tsc --noEmit
npm run lint               # eslint src + scripts
npm run regression:compare # 全量 P0+P1 与基线对比
npm test                   # mocha（随机端口起真实实例）
```

## 一、仓库现状（重构后）

| 维度 | 现状 |
|------|------|
| 运行时 | Fastify 5 + TypeScript，`app.route({ method: [GET,POST,PUT,DELETE,PATCH] })`——**对齐原版 `app.use(route)` 的全方法语义** |
| 业务代码 | `src/routes/**/*.ts` 281 个，签名 `(query: ModuleQuery, request: ModuleRequest) => Promise<ModuleResult>` |
| 请求层 | `src/core/upstream.ts`：axios + 四种加密（weapi/eapi/linuxapi/api）+ cookie/proxy/realIP + 连接复用 |
| 横切逻辑 | `src/core/cache.ts`（2min TTL + LRU500 + 账号指纹分桶 + 白名单）、`client-profile.ts`（设备指纹）、扫码登录状态机、多语言扇出（qq/kugou）、`credential-store.ts` |
| 入口 | `src/main.ts`（单进程）、`src/cluster.ts`（多进程）、`src/index.ts`（编程式 API，`main`/`types` 指向 `dist/`） |
| 已删除 | `app.js` `server.js` `cluster.js` `main.js` `main.test.js` `server.test.js` `generateConfig.js` `module/` `util/` `plugins/` `server.d.ts` |
| 测试 | `test/*.test.ts` 5 个（mocha + tsx）+ 端到端回归脚本 + 契约脚本 |

## 二、框架选型（结论先行）

**选定：Fastify + TypeScript + `@fastify/swagger`**

| 候选 | 适配度 | 判断 |
|------|--------|------|
| **Fastify**（选用） | ★★★★★ | schema 即校验即文档、内置 OpenAPI、插件封装模型天然对应"281 个独立路由"、吞吐约为 Express 的 2-3 倍、启动快 |
| NestJS + FastifyAdapter | ★★★☆☆ | DI/模块化/@nestjs/swagger 很香，但 281 个无状态薄路由会变成 281 个 controller+service+DTO，样板代码爆炸；装饰器反射启动慢、调试链路长 |
| Elysia / Hono | ★★☆☆☆ | 类型体验极佳、性能最强，但生态要自己补；本项目强依赖 Node 生态（axios、@unblockneteasemusic/server、music-metadata） |
| 维持 Express + TS | ★★☆☆☆ | 迁移成本最低，但拿不到自动 OpenAPI、schema 校验、性能提升，等于只做了一半 |

## 三、实际落地结构

```
src/
  app.ts                     # Fastify 实例装配（插件注册顺序即生命周期）
  main.ts / cluster.ts       # 进程入口
  index.ts                   # 编程式 API（由 CJS server.js 导出面转来）
  types.ts                   # ModuleQuery / ModuleRequest / ModuleResult / RouteDefinition
  shims.d.ts                 # 无类型第三方包与浏览器全局的声明（只补类型，不改行为）
  core/
    upstream.ts              # axios + 加密 + cookie/proxy/realIP + 连接复用
    crypto.ts                # weapi / eapi / linuxapi / api 编解码
    cookies.ts               # parseCookieHeader / cookieToJson / echoCookies
    cache.ts                 # 2min TTL + LRU500 + 账号指纹分桶
    cache-policy.ts          # UNCACHEABLE 白名单
    client-profile.ts        # 设备指纹（UA/NMTID/_ntes_nuid/os）
    credential-store.ts      # 自持凭据读写
    routes.ts                # 扫描 src/routes/** 建表（路径即路由；模块惰性加载，见 3.1）
    version.ts / util.ts     # 版本号、toBoolean
    multiverse/{base,qq,kugou}.ts   # ?server=qq|kugou 扇出
  plugins/{upload,songUpload}.ts
  routes/**/*.ts             # 281 个路由，路径即路由
scripts/
  gen-api-test-plan.cjs      # 扫描生成用例（--probe 并入实测）
  api-regression.cjs         # 回归执行 + 基线对比（--compare/--write-back/--cookie/--tier）
  verify-contracts.cjs       # 框架级契约 C1-C13 + P2 冒烟
  verify-qr-identity.ts      # 扫码身份链路机械验证
  generate-config.ts         # 生成 util/config.json 替代品
  bench-compare.cjs          # 新旧架构逐接口性能对照（--sweep / --load / --merge）
  bench-boot.cjs             # 启动成本拆解：目录遍历 / 模块加载 / 路由注册各占多少
  bench-lazy-ab.cjs          # 惰性 vs 全量加载 A/B（交替采样 + 真实冷启动计时）
  bench-modules.cjs          # 逐个依赖的 require 成本（独立进程测，避免缓存串味）
  bench-bootpath.cjs         # 启动路径审计：buildApp 后扫 require.cache，看谁在启动时被加载
test/                        # mocha + test/bootstrap.ts（随机端口起真实实例）
docs/
  refactor-api-test-plan.md  # 待测试文档（281 条）
  regression-baseline.json   # 重构前 Express 版基线（267 条）
  regression-latest.json     # 最近一次执行
  regression-report.md       # 人读执行报告
  contract-report.md         # 契约 C1-C13 + P2 冒烟报告
```

### 3.1 路由「注册」与「加载」是两件事（惰性加载）

Fastify 有一条硬约束：**所有路由必须在 `ready()` 之前注册完毕**，`ready()` 之后追加会抛
`AVV_ERR_ROOT_PLG_BOOTED`（已实测）。所以严格意义的「按需注册路由」在这个框架上做不到 ——
路由表必须在启动时定型。

但定型路由表只需要**路径字符串**：本项目路径完全由文件名推导（路径即路由），不读模块就能
建出完整的 281 条表。于是把两件事拆开：

| 阶段 | 做什么 | 实测成本 |
|------|--------|----------|
| 启动 | 遍历目录建表 + 注册 281×5=1405 条路由（只持有文件路径） | 遍历 8 ms，注册 80 ms |
| 首次命中某路由 | `require()` 该模块并缓存 | 中位 0.08 ms / 均值 0.40 ms |

实现落在 `src/core/routes.ts`：`loadRoutes()` 返回 `{ identifier, route, file, resolveHandler }`，
只有 `resolveHandler()` 被调用时才真正 `require`（失败也缓存，避免坏模块在每个请求上重跑顶层代码）。
`src/index.ts` 的编程式 API 同样惰性 —— 否则 `require()` 一个 SDK 就会拉起全部 281 个模块。

**`app.ts` 里 `def.resolveHandler()` 必须放在 `try/catch` 之外**：那个 catch 是照原版
server.js 写的，它把异常当作「module 返回的错误响应」处理，`!body` 时直接回 404。若把加载
放进 try 内，模块加载失败会被静默降级成「路由不存在」。放在 try 外则冒泡给 Fastify，
明确回 500 + 真实错误信息（已用顶层抛错的探针模块验证：服务照常启动，命中该路由回
`500 {"message":"theow is not defined"}`，其余路由不受影响）。

实测收益（同一份 `dist` 产物，只切换加载时机，7 次交替采样取中位数）：

| 指标 | 启动即全量加载（重构前） | 惰性加载（现状） | 变化 |
|------|------------------------|-----------------|------|
| 真实冷启动 spawn → `/healthz` 200 | 524.5 ms | 433.9 ms | **省 90.6 ms（17.3%）** |
| 进程内「到可服务」 | 433.2 ms | 372.4 ms | 省 60.8 ms |
| rss | 129.1 MB | 125.8 MB | 少 3.3 MB |

**取舍**：换成「模块坏了要到首次请求才暴露」。构建期 `tsc` 已拦住语法/类型错误，端到端回归
（267 条）会打到每一条路由 —— 等于把 fail-fast 移到了 CI，而不是生产启动时。
刻意**不提供「预加载开关」**：预加载等于把省下的 90 ms 又花回去。

首次加载全部 281 个模块合计 113 ms，但摊到单条中位仅 0.08 ms；真正重的是三个拖插件的路由：
`/cloud` 40 ms、`/playlist/cover/update` 21 ms、`/login/qr/create` 16 ms —— 只在它们首次
被访问时付出，相对 80 ms 量级的上游往返可忽略。

### 3.2 schema 只喂文档，不参与校验（顺带修掉一处行为偏差）

`paramSchema` 从 `docs/api-cases.json` 生成 281 条 querystring schema，用途**只有一个**：
让 `/documentation` 列出每个接口的参数。原注释写的是「仅用于 Swagger 文档与宽松类型提示，
不拦截请求」—— **这句是错的**，而且 267 条回归覆盖不到：

| 请求 | 旧版 Express | 重构后（带 ajv 校验） |
|------|-------------|---------------------|
| `/search?keywords=a&keywords=b&limit=1` | **200 / code=200** | **400 / FST_ERR_VALIDATION** |
| `/album?id=1&id=2` | **200 / code=400** | **400 / FST_ERR_VALIDATION** |
| `/search?keywords=a&limit=1` | 200 | 200 |

Fastify 的 ajv 默认带 `coerceTypes`，同名参数重复时 `req.query.id` 是数组，schema 声明
`type: 'string'` → 直接拒。旧版 Express 没有任何 schema，原样往下传。

修法：用 Fastify 官方的扩展点 `schemaController.compilersFactory.buildValidator` 把校验器换成
恒真函数。本项目 281 条 schema 全是 `additionalProperties:true` + 纯 string 属性 + 无 required，
**不校验也永远不会拒绝合法请求**，而 swagger 读的是 `routeOptions.schema` 原始对象，与校验器无关
（已实测 `/documentation/json` 仍是 284 条路径、参数齐全）。

- 效果：`ready()` 从 **102 ms → 4.9 ms**，常驻内存 **-13 MB**；
- 风险与约束：新增 schema 若真要校验，必须同时替换这个 `buildValidator`，否则形同虚设；
- 已固化为契约 **C13**（重复参数必须 200 且 OpenAPI 仍带参数），此后不会被无声改回去。

> 参考：Fastify 维护者 Manuel Spigolon 的《How to unlock the fastest Fastify server startup?》——
> 「启动里最重的一步是 JSON Schema 编译」，官方解法是 build/read 两阶段 + `StandaloneValidator`
> 预编译（适合 schema 复杂、路由少的场景）。本项目是 281 条极简 schema，预编译反而要付出
> 281 次模块 require，所以改用「文档留 schema、校验走恒真」这条更轻的路。

### 3.3 启动路径审计：把「可选功能」的重依赖移出启动

写了 `scripts/bench-bootpath.cjs`：`buildApp()` 之后扫 `require.cache`，列出哪些重依赖**在启动
阶段就被加载**。首轮结果直接暴露两个纯浪费（默认配置下从不使用，却让每个请求替它们买单）：

| 依赖 | require 成本 | 何时才需要 | 处置 |
|------|-------------|-----------|------|
| `pac-proxy-agent` | **107.6 ms / +24 MB** | 仅 `?proxy=pac://` | 挪进 `getProxyAgents()` 里惰性 require |
| `tunnel` | 6.4 ms / +4.6 MB | 仅 `?proxy=http://` | 同上 |
| `@fastify/compress` | 22.9 ms / +11 MB | 仅 `ENABLE_COMPRESS=1` | 顶层 import 改为启用时才 `require` |

代理分支已实测（`?proxy=http://127.0.0.1:7897` → 200 走真实代理；`?proxy=pac+...` → 502 走原
错误路径），两者都不再报模块加载错误。启动路径上的模块数 **748 → 549**；仍在启动路径的只剩
真正必需的：`fastify`、`axios`、`@fastify/swagger(-ui)`、`multipart`、`formbody`、
`safe-decode-uri-component`。`@unblockneteasemusic/server`、`music-metadata`、`qrcode`、`pino`
本就不在启动路径（前两者靠 3.1 的路由惰性加载顺带推迟）。

### 3.4 三轮优化的累计效果

三轮都只改「什么时候加载」，不改任何业务语义；每轮后都跑同一套门禁（契约 + 267 条回归 + 单测）。

| 阶段 | 冷启动 spawn → `/healthz` 200 | 常驻内存 | `ready()` |
|------|------------------------------|---------|-----------|
| 重构后初始态（全量加载 + ajv 校验） | 524.5 ms | ~95–99 MB | ~102 ms |
| + 3.1 路由模块惰性加载 | 433.9 ms | ~91–93 MB | ~102 ms |
| + 3.2 去掉 ajv 校验编译 | 282.8 ms | ~78–80 MB | 4.9 ms |
| + 3.3 可选依赖移出启动路径（**现状**） | **224.8 ms** | **64–67 MB** | 3.3 ms |
| 累计 | **-299.7 ms（-57%）** | **-30 MB（-32%）** | **-97 ms** |

（除「初始态」外均为同机 7 次交替采样中位数；内存为同条件全新进程的 `footprint phys_footprint`。）

## 四、JS → TS 用了什么

实际没走"通用迁移工具"路线，而是**按结构机械化迁移**：281 个模块的签名高度统一，用一次性脚本比 ts-migrate（会插入大量 `any`/`@ts-expect-error`）更可控、产物更干净。

| 手段 | 干了什么 |
|------|----------|
| 自定义转换脚本 | `module.exports = (query, request) => {}` → `export default async (query: ModuleQuery, request: ModuleRequest) => {}`；`require('crypto')` → `require('node:crypto')`；`const data = {}` 后补字段的统一放宽为 `Record<string, any>` |
| 手工收口 | `util/*.js` 逐个改写为 `src/core/*.ts`（这部分有真实逻辑，不能机械改） |
| tsc 分级 strict | `strict:false → noImplicitAny → strictNullChecks → strict:true`；当前停在第一级，`any` 集中在核心层且有 lint warning 兜底 |

> gogocode 的官方插件（gogocode-plugin-vue）只解决 Vue2→Vue3，本项目用不上；其 core API 本可写 codemod，但本项目模块签名只有一种形态，正则级替换已足够且更易复核。

## 五、分阶段落地（每阶段都能跑）

| 阶段 | 内容 | 完成判据 | 结果 |
|------|------|----------|------|
| 0 | 建基线 | `regression-baseline.json` 267/267 绿；`refactor-api-test-plan.md` 281 条 | ✅ |
| 1 | TS 化基建 | `npm run typecheck` 通过；回归全绿 | ✅ |
| 2 | 请求层插件化 | 接口签名不变；回归全绿 | ✅ |
| 3 | 路由声明化 | 281 路由全部可发现；回归全绿 | ✅ |
| 4 | 切框架 | 框架契约全过；回归全绿 | ✅ |
| 5 | 文档与观测 | `/documentation` 覆盖 281 路由；`--compare` 差异 0 | ✅ |

## 六、重构期实测踩坑（都已修）

| 坑 | 现象 | 修法 |
|----|------|------|
| `@fastify/compress` 与缓存 hook 顺序 | 命中缓存返回 0 字节：onSend 拿到压缩流被当字符串存进缓存 | 压缩默认关闭（`ENABLE_COMPRESS=1` 开启），且 onSend 只缓存 `typeof payload === 'string'` |
| brotli 编码 | Node 的 fetch/undici 不会自动解压 br，客户端拿到裸压缩流 | 只允许 gzip |
| **HTTP 方法矩阵** | 原版用 `app.use(route)`（全方法），我最初注册成 GET-only → `POST /login/cellphone` 等直接 404 | 改成 `method: ['GET','POST','PUT','DELETE','PATCH']`（HEAD 由 Fastify 从 GET 派生），并加了契约 C11 防回归 |
| **querystring schema 真的会拦请求** | 注释写着「仅用于文档、不拦截」，但 ajv 的 `coerceTypes` 把 `?id=1&id=2`（数组）判为非法 → **400**，旧版 Express 是 **200**。267 条回归全是单值参数，覆盖不到 | 校验器换成恒真函数（详见 3.2），行为回到旧版并省掉 ajv 编译；固化契约 **C13** |
| **随机内容接口的指纹误报** | `/personal_fm` 每次返回不同歌曲，结构指纹必然不同 → 每次都报 1 条差异 | 用例标 `looseSignature`，比对阶段直接跳过指纹只比 status+code（基线存的是旧算法深指纹，不能拿它比） |
| `util/qq.js`、`util/kugou.js` 的 `{ success(fn) }` 回调风格 | async handler 在回调触发前就结束，Fastify 回一个空 200 | `otherServerHandler` 里把 `.success()` 包成 Promise |
| Fastify 默认 404 是 JSON | 与 Express 的 HTML `Cannot GET /x` 不一致 | `setNotFoundHandler` 复刻 Express finalhandler 输出 |
| 模块里 `require('crypto')` | TS 解析到 `globalThis.crypto`（webcrypto），没有 `createHash` | 改写为 `require('node:crypto')` |
| `module.exports` 转换后的类型推断 | `const data = {}` 后补字段、`let cursor = ''` 后赋 number 都会炸 | 统一放宽为 `Record<string, any>` / `let x: any` |
| 上游既有 bug | `module/user_bindingcellphone.js` 用了 `crypto` 却没 require（运行时必崩） | 已在源 module 补 require，转换产物同步修复 |
| 无类型第三方包 | `safe-decode-uri-component` 没有 `@types`，`require` 写法触发 lint error | 加 `src/shims.d.ts` 声明，改用 `import`；浏览器全局（`async`/`cookieGet`）也用 `declare` 收口 |
| `disableRequestLogging` 在 Fastify 5.12 已废弃 | 启动打 deprecation warning | 去掉该选项，需要日志时开 `logger: true`（逐请求日志本来就由 `LOG_REQUESTS` 分支自己打印） |
| mocha 加载 `.ts` 引导文件 | `MODULE_TYPELESS_PACKAGE_JSON` 警告（Node 把 .ts 当 ESM 重解析） | `.mocharc.json` 用 `node-option: ["import=tsx"]`，`npm test` 输出干净 |
| 部署入口残留 | `Dockerfile`/`scf_bootstrap`/`vercel.json`/`index.js` 仍指向 `app.js` | 全部指向 `src/main.ts`（tsx）或 `dist/main.js`（构建产物），并补 `tsconfig.build.json` |

## 七、重构期必须 1:1 保留的行为

1. 缓存 2 分钟 TTL + UNCACHEABLE 白名单 + 账号指纹分桶 key（改错会导致登录态串号/数据错乱）
2. `code==301 → 需要登录` 与 Set-Cookie 回写链（`echoCookies`，`?noCookie` 例外）
3. 扫码登录状态机 802→803 依赖 Set-Cookie，任何"统一响应封装"都会切断它
4. 设备指纹 UA/NMTID/_ntes_nuid 与 `os` Cookie 补全（防风控，删了会导致大面积 -460）
5. multipart 只在 `/cloud` 解析（全局挂会拖慢所有路由）
6. `?server=qq|kugou` 扇出与 `/song/unblock` 短路分支
7. `app.use(route)` 的全方法语义（不只是 GET），以及模块抛错时 `!body → 404 {code:404,data:null,msg:"Not Found"}` 的既有形态
8. cluster 多进程 + 崩溃自愈

## 八、验收门禁（进 CI）

```bash
npm run typecheck                                                            # 0 error
npm run lint                                                                 # 0 error
npm run build                                                                # 构建产物可跑
npm test                                                                     # 单元
node scripts/api-regression.cjs --compare docs/regression-baseline.json       # 差异 0
node scripts/verify-contracts.cjs                                            # C1-C13 全过
```

## 九、剩余边界（需要真实凭据才能闭环）

| 项 | 原因 | 怎么闭环 |
|----|------|----------|
| P2 14 条（`/cloud` 上传、`/login/cellphone`、`/register/cellphone`、`/captcha/*`、`/rebind`、`/activate/init/profile`） | 需要真实账号密码/验证码，或真实音乐文件；自动发短信/试密码有副作用，脚本刻意不发 | `node scripts/api-regression.cjs --tier P2 --cookie "MUSIC_U=...; __csrf=..."` 手工跑一次 |
| P1 层 81 条中真正需要登录的部分 | 无 cookie 时既有行为就是 301，脚本按 301 判定通过；要验"登录后 200"必须给真 cookie | 同上，带 `--cookie` 跑一遍 |
| strict 收紧 | 当前 `strict:false`，核心层仍有 47 处 `any`（lint warning 可见） | 按 `noImplicitAny → strictNullChecks → strict` 逐级开，每级跑回归 |
