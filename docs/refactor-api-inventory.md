# 后端接口基线清单（重构验收用）

> 生成时间：2026-09-20　基准：master c2ede03
> 用途：TS + 新框架重构后，逐接口回归比对本清单，"验证"列全部勾完才算迁移完成。
> 扫描方式：静态解析 module/*.js，路由映射与 server.js:getModulesDefinitions 一致。
> 重新生成：`node scripts/scan-api.cjs . docs/refactor-api-inventory.md`（脚本已随仓库提交）

## 总览

- **module 接口：281 个**（路由 = 文件名去 .js、下划线转斜杠；/daily_signin、/fm_trash、/personal_fm 为特例映射）
- 所有路由经 `app.use(route, handler)` 挂载：**GET 与 POST 均可**，参数分别在 query / body（body 支持 json、urlencoded、/cloud 的 multipart）
- 通用可选参数（全接口可用，不在每行列出）：`cookie`(字符串，等价于 Header Cookie)、`proxy`、`realIP`、`ua`、`timestamp`（后四者已被 server.js 归一化出缓存 key）
- 上游加密：`weapi` / `eapi` / `linuxapi` / `api`（明文）

## 框架级（非 module）路由 —— 二开自有，重构必须 1:1 保留

| # | 路由 | 方法 | 说明 | 验证 |
|---|------|------|------|------|
| F1 | `/puppeteer` | GET/POST | URL 代理抓取（?url= 或 body.url），已列入不可缓存 | ☐ |
| F2 | `/netease/credential` | GET | 读取自持凭据（纯文本 Cookie），404=未存 | ☐ |
| F3 | `/netease/credential` | POST | 写入凭据：回源 /user/account 校验 OWNER_UID（默认 270496477） | ☐ |
| F4 | `/netease/credential` | DELETE | 清空凭据文件 | ☐ |
| F5 | 任意 module 路由 + `?server=qq\|kugou` | GET/POST | 多源扇出到 util/qq.js、util/kugou.js（api_map 按 baseUrl 分发） | ☐ |
| F6 | `/`、`/login/qr` 等所有路径 OPTIONS | OPTIONS | CORS 预检统一 204 | ☐ |
| F7 | `/song/unblock` | GET | 特殊：server.js 以 @unblockneteasemusic/server 短路，module/song_unblock.js 实际不会被执行（重构时二选一并保持对外行为） | ☐ |

## 全局行为契约（重构后必须一致）

1. **响应策略**：module 正常 → 透传上游 status/body 与 Set-Cookie（`echoCookies`，除非 `?noCookie`）；异常 → 404 {code:404}，body.code==301 → msg"需要登录"
2. **缓存**：2 分钟 TTL（server.js CACHE_TTL），LRU 500 条 / 单值 2MB 上限；不可缓存路由清单见 util/cache-policy.js UNCACHEABLE：`/login*` `/logout*` `/captcha_*` `/user/*` `/daily_signin` `/puppeteer` `/netease/*`；key 按账号指纹分桶（cacheKeyOf）
3. **扫码状态机**：`/login/qr/create`→`check` 依赖 Set-Cookie 回写链（802→803），不可切断；`qrimg` 参数返回 base64 PNG
4. **设备指纹**：util/client-profile.js 固定 UA/NMTID/_ntes_nuid，带凭据请求自动补 `os` Cookie —— 全部是防风控行为
5. **上传**：multipart 仅在 `/cloud` 解析（fileUpload limits 100MB×1）
6. **cluster**：cluster.js 多进程(min(cpus,4))+崩溃自愈，worker 各自 serveNcmApi

## module 接口清单（281）

| # | 路由 | 方法 | 业务参数 | 加密 | 需登录 | 复杂⚠ | 说明 | 验证 |
|---|------|------|----------|------|--------|-------|------|------|
| 1 | `/activate/init/profile` | POST | `nickname` | eapi |  |  | 初始化名字 | ☐ |
| 2 | `/album` | POST | `id` | weapi |  |  | 专辑内容 | ☐ |
| 3 | `/album/detail` | POST | `id` | weapi |  |  | 数字专辑详情 | ☐ |
| 4 | `/album/detail/dynamic` | POST | `id` | weapi |  |  | 专辑动态信息 | ☐ |
| 5 | `/album/list` | POST | `limit` `offset` `area` `type` | weapi |  |  | 数字专辑-新碟上架 | ☐ |
| 6 | `/album/list/style` | POST | `limit` `offset` `area` | weapi |  |  | 数字专辑-语种风格馆 | ☐ |
| 7 | `/album/new` | POST | `limit` `offset` `area` | weapi |  |  | 全部新碟 | ☐ |
| 8 | `/album/newest` | POST | — | weapi |  |  | 最新专辑 | ☐ |
| 9 | `/album/songsaleboard` | POST | `albumType` `type` `year` | weapi |  |  | 数字专辑&数字单曲-榜单 | ☐ |
| 10 | `/album/sub` | POST | `id` | weapi |  |  | 收藏/取消收藏专辑 | ☐ |
| 11 | `/album/sublist` | POST | `limit` `offset` | weapi |  |  | 已收藏专辑列表 | ☐ |
| 12 | `/artist/album` | POST | `limit` `offset` `id` | weapi |  |  | 歌手专辑列表 | ☐ |
| 13 | `/artist/desc` | POST | `id` | weapi |  |  | 歌手介绍 | ☐ |
| 14 | `/artist/detail` | POST | `id` | weapi |  |  | — | ☐ |
| 15 | `/artist/fans` | POST | `id` `limit` `offset` | weapi |  |  | 歌手粉丝 | ☐ |
| 16 | `/artist/follow/count` | POST | `id` | weapi |  |  | 歌手粉丝数量 | ☐ |
| 17 | `/artist/list` | POST | `initial` `offset` `limit` `type` `area` | weapi |  |  | 歌手分类 | ☐ |
| 18 | `/artist/mv` | POST | `id` `limit` `offset` | weapi |  |  | 歌手相关MV | ☐ |
| 19 | `/artist/new/mv` | POST | `limit` `before` | weapi | 是 |  | — | ☐ |
| 20 | `/artist/new/song` | POST | `limit` `before` | weapi | 是 |  | — | ☐ |
| 21 | `/artist/songs` | POST | `id` `order` `offset` `limit` | weapi | 是 |  | — | ☐ |
| 22 | `/artist/sub` | POST | `id` | weapi |  |  | 收藏与取消收藏歌手 | ☐ |
| 23 | `/artist/sublist` | POST | `limit` `offset` | weapi |  |  | 关注歌手列表 | ☐ |
| 24 | `/artist/top/song` | POST | `id` | weapi |  |  | 歌手热门 50 首歌曲 | ☐ |
| 25 | `/artist/video` | POST | `id` `size` `cursor` `order` | weapi |  |  | 歌手相关视频 | ☐ |
| 26 | `/artists` | POST | `id` | weapi |  |  | 歌手单曲 | ☐ |
| 27 | `/audio/match` | POST | — | weapi | 是 |  | — | ☐ |
| 28 | `/avatar/upload` | POST | — | weapi |  | ⚠ | — | ☐ |
| 29 | `/banner` | POST | `type` | api |  |  | 首页轮播图 | ☐ |
| 30 | `/batch` | POST | — | eapi |  |  | 批量请求接口 | ☐ |
| 31 | `/calendar` | POST | `startTime` `endTime` | weapi |  |  | — | ☐ |
| 32 | `/captcha/sent` | POST | `ctcode` `phone` | weapi |  |  | 发送验证码 | ☐ |
| 33 | `/captcha/verify` | POST | `ctcode` `phone` `captcha` | weapi |  |  | 校验验证码 | ☐ |
| 34 | `/cellphone/existence/check` | POST | `phone` `countrycode` | eapi |  |  | 检测手机号码是否已注册 | ☐ |
| 35 | `/check/music` | POST | `id` `br` | weapi |  |  | 歌曲可用性 | ☐ |
| 36 | `/cloud` | POST | `songFile` | weapi | 是 | ⚠ | 命令行上传没有md5和size信息,需要填充 | ☐ |
| 37 | `/cloud/match` | POST | `uid` `sid` `asid` | weapi | 是 |  | — | ☐ |
| 38 | `/cloudsearch` | POST | `keywords` `type` `limit` `offset` | eapi |  |  | 搜索 | ☐ |
| 39 | `/comment` | POST | `type` `id` `threadId` `content` `commentId` | weapi | 是 |  | 发送与删除评论 | ☐ |
| 40 | `/comment/album` | POST | `id` `limit` `offset` `before` | weapi | 是 |  | 专辑评论 | ☐ |
| 41 | `/comment/dj` | POST | `id` `limit` `offset` `before` | weapi | 是 |  | 电台评论 | ☐ |
| 42 | `/comment/event` | POST | `limit` `offset` `before` `threadId` | weapi |  |  | 获取动态评论 | ☐ |
| 43 | `/comment/floor` | POST | `type` `parentCommentId` `id` `time` `limit` | weapi |  |  | — | ☐ |
| 44 | `/comment/hot` | POST | `type` `id` `limit` `offset` `before` | weapi | 是 |  | 热门评论 | ☐ |
| 45 | `/comment/hug/list` | POST | `type` `sid` `uid` `cid` `cursor` `page` `idCursor` `pageSize` | api | 是 |  | — | ☐ |
| 46 | `/comment/like` | POST | `type` `id` `cid` `threadId` | weapi | 是 |  | 点赞与取消点赞评论 | ☐ |
| 47 | `/comment/music` | POST | `id` `limit` `offset` `before` | weapi | 是 |  | 歌曲评论 | ☐ |
| 48 | `/comment/mv` | POST | `id` `limit` `offset` `before` | weapi | 是 |  | MV评论 | ☐ |
| 49 | `/comment/new` | POST | `type` `id` `pageSize` `pageNo` `sortType` `cursor` `showInner` | eapi | 是 |  | 评论 | ☐ |
| 50 | `/comment/playlist` | POST | `id` `limit` `offset` `before` | weapi | 是 |  | 歌单评论 | ☐ |
| 51 | `/comment/video` | POST | `id` `limit` `offset` `before` | weapi | 是 |  | 视频评论 | ☐ |
| 52 | `/countries/code/list` | POST | — | eapi |  |  | 国家编码列表 | ☐ |
| 53 | `/daily_signin` | POST | `type` | weapi |  |  | 签到 | ☐ |
| 54 | `/digitalAlbum/detail` | POST | `id` | weapi |  |  | 数字专辑详情 | ☐ |
| 55 | `/digitalAlbum/ordering` | POST | `payment` `id` `quantity` | weapi |  |  | 购买数字专辑 | ☐ |
| 56 | `/digitalAlbum/purchased` | POST | `limit` `offset` | weapi |  |  | 我的数字专辑 | ☐ |
| 57 | `/digitalAlbum/sales` | POST | `ids` | weapi |  |  | 数字专辑销量 | ☐ |
| 58 | `/dj/banner` | POST | — | weapi | 是 |  | 电台banner | ☐ |
| 59 | `/dj/category/excludehot` | POST | — | weapi |  |  | 电台非热门类型 | ☐ |
| 60 | `/dj/category/recommend` | POST | — | weapi |  |  | 电台推荐类型 | ☐ |
| 61 | `/dj/catelist` | POST | — | weapi |  |  | 电台分类列表 | ☐ |
| 62 | `/dj/detail` | POST | `rid` | weapi |  |  | 电台详情 | ☐ |
| 63 | `/dj/hot` | POST | `limit` `offset` | weapi |  |  | 热门电台 | ☐ |
| 64 | `/dj/paygift` | POST | `limit` `offset` | weapi |  |  | 付费电台 | ☐ |
| 65 | `/dj/personalize/recommend` | POST | `limit` | weapi |  |  | 电台个性推荐 | ☐ |
| 66 | `/dj/program` | POST | `rid` `limit` `offset` `asc` | weapi |  |  | 电台节目列表 | ☐ |
| 67 | `/dj/program/detail` | POST | `id` | weapi |  |  | 电台节目详情 | ☐ |
| 68 | `/dj/program/toplist` | POST | `limit` `offset` | weapi |  |  | 电台节目榜 | ☐ |
| 69 | `/dj/program/toplist/hours` | POST | `limit` | weapi |  |  | 电台24小时节目榜 | ☐ |
| 70 | `/dj/radio/hot` | POST | `cateId` `limit` `offset` | weapi |  |  | 类别热门电台 | ☐ |
| 71 | `/dj/recommend` | POST | — | weapi |  |  | 精选电台 | ☐ |
| 72 | `/dj/recommend/type` | POST | `type` | weapi |  |  | 精选电台分类 | ☐ |
| 73 | `/dj/sub` | POST | `rid` | weapi |  |  | 订阅与取消电台 | ☐ |
| 74 | `/dj/sublist` | POST | `limit` `offset` | weapi |  |  | 订阅电台列表 | ☐ |
| 75 | `/dj/subscriber` | POST | `time` `id` `limit` | weapi |  |  | 电台详情 | ☐ |
| 76 | `/dj/today/perfered` | POST | `page` | weapi |  |  | 电台今日优选 | ☐ |
| 77 | `/dj/toplist` | POST | `limit` `offset` `type` | weapi |  |  | 新晋电台榜/热门电台榜 | ☐ |
| 78 | `/dj/toplist/hours` | POST | `limit` | weapi |  |  | 电台24小时主播榜 | ☐ |
| 79 | `/dj/toplist/newcomer` | POST | `limit` `offset` | weapi |  |  | 电台新人榜 | ☐ |
| 80 | `/dj/toplist/pay` | POST | `limit` | weapi |  |  | 付费精品 | ☐ |
| 81 | `/dj/toplist/popular` | POST | `limit` | weapi |  |  | 电台最热主播榜 | ☐ |
| 82 | `/event` | POST | `pagesize` `lasttime` | weapi |  |  | 动态 | ☐ |
| 83 | `/event/del` | POST | `evId` | weapi |  |  | 删除动态 | ☐ |
| 84 | `/event/forward` | POST | `forwards` `evId` `uid` | weapi | 是 |  | 转发动态 | ☐ |
| 85 | `/fm_trash` | POST | `id` `time` | weapi |  |  | 垃圾桶 | ☐ |
| 86 | `/follow` | POST | `id` | weapi | 是 |  | 关注与取消关注用户 | ☐ |
| 87 | `/history/recommend/songs` | POST | — | weapi | 是 |  | 历史每日推荐歌曲 | ☐ |
| 88 | `/history/recommend/songs/detail` | POST | `date` | weapi | 是 |  | 历史每日推荐歌曲详情 | ☐ |
| 89 | `/homepage/block/page` | POST | `refresh` `cursor` | weapi | 是 |  | 首页-发现 block page | ☐ |
| 90 | `/homepage/dragon/ball` | POST | — | eapi | 是 |  | 首页-发现 dragon ball | ☐ |
| 91 | `/hot/topic` | POST | `limit` `offset` | weapi |  |  | 热门话题 | ☐ |
| 92 | `/hug/comment` | POST | `type` `sid` `uid` `cid` | api | 是 |  | — | ☐ |
| 93 | `/inner/version` | GET/POST | — | api/无 |  |  | — | ☐ |
| 94 | `/like` | POST | `like` `id` | weapi | 是 |  | 红心与取消红心歌曲 | ☐ |
| 95 | `/likelist` | POST | `uid` | weapi |  |  | 喜欢的歌曲(无序) | ☐ |
| 96 | `/listentogether/end` | POST | `roomId` | eapi |  |  | 一起听 结束房间 | ☐ |
| 97 | `/listentogether/heatbeat` | POST | `roomId` `songId` `playStatus` `progress` | eapi |  |  | 一起听 发送心跳 | ☐ |
| 98 | `/listentogether/play/command` | POST | `roomId` `commandType` `progress` `playStatus` `formerSongId` `targetSongId` `clientSeq` | eapi |  |  | 一起听 发送播放状态 | ☐ |
| 99 | `/listentogether/room/check` | POST | `roomId` | eapi |  |  | 一起听 房间情况 | ☐ |
| 100 | `/listentogether/room/create` | POST | — | eapi |  |  | 一起听创建房间 | ☐ |
| 101 | `/listentogether/status` | POST | — | weapi |  |  | 一起听状态 | ☐ |
| 102 | `/listentogether/sync/list/command` | POST | `roomId` `commandType` `userId` `version` `randomList` `displayList` | eapi |  |  | 一起听 更新播放列表 | ☐ |
| 103 | `/listentogether/sync/playlist/get` | POST | `roomId` | eapi |  |  | 一起听 当前列表获取 | ☐ |
| 104 | `/login` | POST | `email` `md5_password` `password` | weapi | 是 |  | 邮箱登录 | ☐ |
| 105 | `/login/cellphone` | POST | `phone` `countrycode` `captcha` `md5_password` `password` | weapi | 是 |  | 手机登录 | ☐ |
| 106 | `/login/qr/check` | POST | `key` | weapi | 是 |  | ';;' 是前端 setCookies 的分隔约定：803 必须让每个 Set-Cookie 各自 | ☐ |
| 107 | `/login/qr/create` | GET/POST | `key` `qrimg` | api/无 |  |  | — | ☐ |
| 108 | `/login/qr/key` | POST | — | weapi |  |  | — | ☐ |
| 109 | `/login/refresh` | POST | — | weapi |  |  | 登录刷新 | ☐ |
| 110 | `/login/status` | POST | — | weapi |  |  | — | ☐ |
| 111 | `/logout` | POST | — | weapi |  |  | 退出登录 | ☐ |
| 112 | `/lyric` | POST | `id` | api | 是 |  | 歌词 | ☐ |
| 113 | `/lyric/new` | POST | `id` | eapi |  |  | 新版歌词 - 包含逐字歌词 | ☐ |
| 114 | `/mlog/music/rcmd` | POST | `mvid` `limit` `songid` | eapi |  |  | 歌曲相关视频 | ☐ |
| 115 | `/mlog/to/video` | POST | `id` | weapi |  |  | 将mlog id转为video id | ☐ |
| 116 | `/mlog/url` | POST | `id` `res` | weapi |  |  | mlog链接 | ☐ |
| 117 | `/msg/comments` | POST | `before` `limit` `uid` | weapi |  |  | 评论 | ☐ |
| 118 | `/msg/forwards` | POST | `offset` `limit` | weapi |  |  | @我 | ☐ |
| 119 | `/msg/notices` | POST | `limit` `lasttime` | weapi |  |  | 通知 | ☐ |
| 120 | `/msg/private` | POST | `offset` `limit` | weapi |  |  | 私信 | ☐ |
| 121 | `/msg/private/history` | POST | `uid` `limit` `before` | weapi |  |  | 私信内容 | ☐ |
| 122 | `/msg/recentcontact` | POST | — | weapi |  |  | 最近联系 | ☐ |
| 123 | `/musician/cloudbean` | POST | — | weapi |  |  | 账号云豆数 | ☐ |
| 124 | `/musician/cloudbean/obtain` | POST | `id` `period` | weapi |  |  | 领取云豆 | ☐ |
| 125 | `/musician/data/overview` | POST | — | weapi |  |  | 音乐人数据概况 | ☐ |
| 126 | `/musician/play/trend` | POST | `startTime` `endTime` | weapi |  |  | 音乐人歌曲播放趋势 | ☐ |
| 127 | `/musician/sign` | POST | — | weapi |  |  | 音乐人签到 | ☐ |
| 128 | `/musician/tasks` | POST | — | weapi |  |  | 获取音乐人任务 | ☐ |
| 129 | `/musician/tasks/new` | POST | — | weapi |  |  | 获取音乐人任务 | ☐ |
| 130 | `/mv/all` | POST | `area` `type` `order` `offset` `limit` | weapi |  |  | 全部MV | ☐ |
| 131 | `/mv/detail` | POST | `mvid` | weapi |  |  | MV详情 | ☐ |
| 132 | `/mv/detail/info` | POST | `mvid` | weapi |  |  | MV 点赞转发评论数数据 | ☐ |
| 133 | `/mv/exclusive/rcmd` | POST | `offset` `limit` | weapi |  |  | 网易出品 | ☐ |
| 134 | `/mv/first` | POST | `offset` `area` `limit` | weapi |  |  | 最新MV | ☐ |
| 135 | `/mv/sub` | POST | `mvid` | weapi |  |  | 收藏与取消收藏MV | ☐ |
| 136 | `/mv/sublist` | POST | `limit` `offset` | weapi |  |  | 已收藏MV列表 | ☐ |
| 137 | `/mv/url` | POST | `id` | weapi |  |  | MV链接 | ☐ |
| 138 | `/nickname/check` | POST | `nickname` | weapi |  |  | — | ☐ |
| 139 | `/personal_fm` | POST | — | weapi |  |  | 私人FM | ☐ |
| 140 | `/personalized` | POST | `limit` `offset` | weapi |  |  | 推荐歌单 | ☐ |
| 141 | `/personalized/djprogram` | POST | — | weapi |  |  | 推荐电台 | ☐ |
| 142 | `/personalized/mv` | POST | — | weapi |  |  | 推荐MV | ☐ |
| 143 | `/personalized/newsong` | POST | `limit` `areaId` | weapi | 是 |  | 推荐新歌 | ☐ |
| 144 | `/personalized/privatecontent` | POST | — | weapi |  |  | 独家放送 | ☐ |
| 145 | `/personalized/privatecontent/list` | POST | `offset` `limit` | weapi |  |  | 独家放送列表 | ☐ |
| 146 | `/pl/count` | POST | — | weapi |  |  | 数字专辑-新碟上架 | ☐ |
| 147 | `/playlist/catlist` | POST | — | weapi |  |  | 全部歌单分类 | ☐ |
| 148 | `/playlist/cover/update` | POST | `imgFile` `id` | weapi |  | ⚠ | — | ☐ |
| 149 | `/playlist/create` | POST | `name` `privacy` `type` | weapi | 是 |  | 创建歌单 | ☐ |
| 150 | `/playlist/delete` | POST | `id` | weapi | 是 |  | 删除歌单 | ☐ |
| 151 | `/playlist/desc/update` | POST | `id` `desc` | eapi |  |  | 更新歌单描述 | ☐ |
| 152 | `/playlist/detail` | POST | `id` | api |  |  | 歌单详情 | ☐ |
| 153 | `/playlist/detail/dynamic` | POST | `id` | api |  |  | 初始化名字 | ☐ |
| 154 | `/playlist/highquality/tags` | POST | — | weapi |  |  | 精品歌单 tags | ☐ |
| 155 | `/playlist/hot` | POST | — | weapi |  |  | 热门歌单分类 | ☐ |
| 156 | `/playlist/mylike` | POST | `time` `limit` | weapi |  |  | — | ☐ |
| 157 | `/playlist/name/update` | POST | `id` `name` | eapi |  |  | 更新歌单名 | ☐ |
| 158 | `/playlist/order/update` | POST | `ids` | weapi | 是 |  | 编辑歌单顺序 | ☐ |
| 159 | `/playlist/privacy` | POST | `id` | eapi |  |  | 公开隐私歌单 | ☐ |
| 160 | `/playlist/subscribe` | POST | `id` | weapi |  |  | 收藏与取消收藏歌单 | ☐ |
| 161 | `/playlist/subscribers` | POST | `id` `limit` `offset` | weapi |  |  | 歌单收藏者 | ☐ |
| 162 | `/playlist/tags/update` | POST | `id` `tags` | eapi |  |  | 更新歌单标签 | ☐ |
| 163 | `/playlist/track/add` | POST | `ids` `pid` | weapi | 是 |  | — | ☐ |
| 164 | `/playlist/track/all` | POST | `id` `limit` `offset` | api,weapi |  | ⚠ | 通过传过来的歌单id拿到所有歌曲数据 | ☐ |
| 165 | `/playlist/track/delete` | POST | `ids` `id` | weapi | 是 |  | 收藏单曲到歌单 从歌单删除歌曲 | ☐ |
| 166 | `/playlist/tracks` | POST | `tracks` `op` `pid` | weapi | 是 | ⚠ | 收藏单曲到歌单 从歌单删除歌曲 | ☐ |
| 167 | `/playlist/update` | POST | `desc` `tags` `id` `name` | weapi | 是 |  | 编辑歌单 | ☐ |
| 168 | `/playlist/update/playcount` | POST | `id` | weapi |  |  | 歌单打卡 | ☐ |
| 169 | `/playlist/video/recent` | POST | — | weapi |  |  | — | ☐ |
| 170 | `/playmode/intelligence/list` | POST | `id` `pid` `sid` `count` | weapi |  |  | 智能播放 | ☐ |
| 171 | `/program/recommend` | POST | `type` `limit` `offset` | weapi |  |  | 推荐节目 | ☐ |
| 172 | `/rebind` | POST | `captcha` `phone` `oldcaptcha` `ctcode` | weapi |  |  | 更换手机 | ☐ |
| 173 | `/recommend/resource` | POST | — | weapi |  |  | 每日推荐歌单 | ☐ |
| 174 | `/recommend/songs` | POST | — | weapi | 是 |  | 每日推荐歌曲 | ☐ |
| 175 | `/record/recent/album` | POST | `limit` | weapi |  |  | — | ☐ |
| 176 | `/record/recent/dj` | POST | `limit` | weapi |  |  | — | ☐ |
| 177 | `/record/recent/playlist` | POST | `limit` | weapi |  |  | — | ☐ |
| 178 | `/record/recent/song` | POST | `limit` | weapi |  |  | — | ☐ |
| 179 | `/record/recent/video` | POST | `limit` | weapi |  |  | — | ☐ |
| 180 | `/record/recent/voice` | POST | `limit` | weapi |  |  | — | ☐ |
| 181 | `/register/anonimous` | POST | — | weapi | 是 |  | 游客登录 | ☐ |
| 182 | `/register/cellphone` | POST | `captcha` `phone` `password` `nickname` `countrycode` | weapi | 是 |  | 注册账号 | ☐ |
| 183 | `/related/allvideo` | POST | `id` | weapi |  |  | 相关视频 | ☐ |
| 184 | `/related/playlist` | GET | `id` | api/无 |  | ⚠ | 相关歌单 | ☐ |
| 185 | `/resource/like` | POST | `type` `id` `threadId` | weapi | 是 |  | 点赞与取消点赞资源 | ☐ |
| 186 | `/scrobble` | POST | `id` `sourceid` `time` | weapi |  |  | 听歌打卡 | ☐ |
| 187 | `/search` | POST | `type` `keywords` `limit` `offset` | weapi |  | ⚠ | 搜索 | ☐ |
| 188 | `/search/default` | POST | — | eapi |  |  | 默认搜索关键词 | ☐ |
| 189 | `/search/hot` | POST | — | weapi |  |  | 热门搜索 | ☐ |
| 190 | `/search/hot/detail` | POST | — | weapi |  |  | 热搜列表 | ☐ |
| 191 | `/search/multimatch` | POST | `type` `keywords` | weapi |  |  | 多类型搜索 | ☐ |
| 192 | `/search/suggest` | POST | `keywords` `type` | weapi |  |  | 搜索建议 | ☐ |
| 193 | `/send/album` | POST | `id` `msg` `user_ids` | api | 是 |  | 私信专辑 | ☐ |
| 194 | `/send/playlist` | POST | `playlist` `msg` `user_ids` | weapi | 是 |  | 私信歌单 | ☐ |
| 195 | `/send/song` | POST | `id` `msg` `user_ids` | api | 是 |  | 私信歌曲 | ☐ |
| 196 | `/send/text` | POST | `msg` `user_ids` | weapi | 是 |  | 私信 | ☐ |
| 197 | `/setting` | POST | — | weapi |  |  | 设置 | ☐ |
| 198 | `/share/resource` | POST | `type` `msg` `id` | weapi |  |  | 分享歌曲到动态 | ☐ |
| 199 | `/sheet/list` | POST | `id` `ab` | eapi |  |  | 乐谱列表 | ☐ |
| 200 | `/sheet/preview` | POST | `id` | eapi |  |  | 乐谱预览 | ☐ |
| 201 | `/sign/happy/info` | POST | — | weapi |  |  | — | ☐ |
| 202 | `/signin/progress` | POST | `moduleId` | weapi |  |  | 签到进度 | ☐ |
| 203 | `/simi/artist` | POST | `id` | weapi |  |  | 相似歌手 | ☐ |
| 204 | `/simi/mv` | POST | `mvid` | weapi |  |  | 相似MV | ☐ |
| 205 | `/simi/playlist` | POST | `id` `limit` `offset` | weapi |  |  | 相似歌单 | ☐ |
| 206 | `/simi/song` | POST | `id` `limit` `offset` | weapi |  |  | 相似歌曲 | ☐ |
| 207 | `/simi/user` | POST | `id` `limit` `offset` | weapi |  |  | 相似用户 | ☐ |
| 208 | `/song/detail` | POST | `ids` | weapi |  |  | 歌曲详情 | ☐ |
| 209 | `/song/download/url` | POST | `id` `br` | eapi |  |  | 获取客户端歌曲下载链接 | ☐ |
| 210 | `/song/order/update` | POST | `pid` `ids` | weapi |  |  | 更新歌曲顺序 | ☐ |
| 211 | `/song/purchased` | POST | `limit` `offset` | weapi |  |  | 已购单曲 | ☐ |
| 212 | `/song/unblock` | GET/POST | `id` `br` | api/无 | 是 |  | 歌曲解灰 | ☐ |
| 213 | `/song/url` | POST | `id` `br` | eapi | 是 |  | 歌曲链接 | ☐ |
| 214 | `/song/url/v1` | POST | `id` `level` | eapi | 是 |  | 歌曲链接 - v1 | ☐ |
| 215 | `/song/wiki/summary` | POST | `id` | eapi |  |  | 音乐百科基础信息 | ☐ |
| 216 | `/style/album` | POST | `cursor` `size` `tagId` `sort` | weapi |  |  | 曲风-专辑 | ☐ |
| 217 | `/style/artist` | POST | `cursor` `size` `tagId` | weapi |  |  | 曲风-歌手 | ☐ |
| 218 | `/style/detail` | POST | `tagId` | weapi |  |  | 曲风详情 | ☐ |
| 219 | `/style/list` | POST | — | weapi |  |  | 曲风列表 | ☐ |
| 220 | `/style/playlist` | POST | `cursor` `size` `tagId` | weapi |  |  | 曲风-歌单 | ☐ |
| 221 | `/style/preference` | POST | — | weapi |  |  | 曲风偏好 | ☐ |
| 222 | `/style/song` | POST | `cursor` `size` `tagId` `sort` | weapi |  |  | 曲风-歌曲 | ☐ |
| 223 | `/top/album` | POST | `area` `limit` `offset` `type` `year` `month` | weapi |  |  | 新碟上架 | ☐ |
| 224 | `/top/artists` | POST | `limit` `offset` | weapi |  |  | 热门歌手 | ☐ |
| 225 | `/top/list` | POST | `idx` `id` | weapi | 是 |  | 排行榜 | ☐ |
| 226 | `/top/mv` | POST | `area` `limit` `offset` | weapi |  |  | MV排行榜 | ☐ |
| 227 | `/top/playlist` | POST | `cat` `order` `limit` `offset` | weapi |  |  | 分类歌单 | ☐ |
| 228 | `/top/playlist/highquality` | POST | `cat` `limit` `before` | weapi |  |  | 精品歌单 | ☐ |
| 229 | `/top/song` | POST | `type` `limit` `offset` | weapi |  |  | 新歌速递 | ☐ |
| 230 | `/topic/detail` | POST | `actid` | weapi |  |  | — | ☐ |
| 231 | `/topic/detail/event/hot` | POST | `actid` | weapi |  |  | — | ☐ |
| 232 | `/topic/sublist` | POST | `limit` `offset` | weapi |  |  | 收藏的专栏 | ☐ |
| 233 | `/toplist` | POST | — | api |  |  | 所有榜单介绍 | ☐ |
| 234 | `/toplist/artist` | POST | `type` | weapi |  |  | 歌手榜 | ☐ |
| 235 | `/toplist/detail` | POST | — | weapi |  |  | 所有榜单内容摘要 | ☐ |
| 236 | `/user/account` | POST | — | weapi |  |  | — | ☐ |
| 237 | `/user/audio` | POST | `uid` | weapi |  |  | 用户创建的电台 | ☐ |
| 238 | `/user/binding` | POST | `uid` | weapi |  |  | — | ☐ |
| 239 | `/user/bindingcellphone` | POST | `phone` `countrycode` `captcha` `password` | weapi |  |  | — | ☐ |
| 240 | `/user/cloud` | POST | `limit` `offset` | weapi |  |  | 云盘数据 | ☐ |
| 241 | `/user/cloud/del` | POST | `id` | weapi |  |  | 云盘歌曲删除 | ☐ |
| 242 | `/user/cloud/detail` | POST | `id` | weapi |  |  | 云盘数据详情 | ☐ |
| 243 | `/user/comment/history` | POST | `limit` `uid` `time` | weapi | 是 |  | — | ☐ |
| 244 | `/user/detail` | POST | `uid` | weapi |  |  | 用户详情 | ☐ |
| 245 | `/user/dj` | POST | `limit` `offset` `uid` | weapi |  |  | 用户电台节目 | ☐ |
| 246 | `/user/event` | POST | `lasttime` `limit` `uid` | api | 是 |  | 用户动态 | ☐ |
| 247 | `/user/followeds` | POST | `uid` `limit` `offset` | eapi |  |  | 关注TA的人(粉丝) | ☐ |
| 248 | `/user/follows` | POST | `offset` `limit` `uid` | weapi |  |  | TA关注的人(关注) | ☐ |
| 249 | `/user/level` | POST | — | weapi |  |  | 类别热门电台 | ☐ |
| 250 | `/user/playlist` | POST | `uid` `limit` `offset` | weapi |  |  | 用户歌单 | ☐ |
| 251 | `/user/record` | POST | `uid` `type` | weapi |  |  | 听歌排行 | ☐ |
| 252 | `/user/replacephone` | POST | `phone` `captcha` `oldcaptcha` `countrycode` | weapi |  |  | — | ☐ |
| 253 | `/user/subcount` | POST | — | weapi |  |  | 收藏计数 | ☐ |
| 254 | `/user/update` | POST | `birthday` `city` `gender` `nickname` `province` `signature` | weapi |  |  | 编辑用户信息 | ☐ |
| 255 | `/video/category/list` | POST | `offset` `limit` | weapi |  |  | 视频分类列表 | ☐ |
| 256 | `/video/detail` | POST | `id` | weapi |  |  | 视频详情 | ☐ |
| 257 | `/video/detail/info` | POST | `vid` | weapi |  |  | 视频点赞转发评论数数据 | ☐ |
| 258 | `/video/group` | POST | `id` `offset` | weapi |  |  | 视频标签/分类下的视频 | ☐ |
| 259 | `/video/group/list` | POST | — | weapi |  |  | 视频标签列表 | ☐ |
| 260 | `/video/sub` | POST | `id` | weapi |  |  | 收藏与取消收藏视频 | ☐ |
| 261 | `/video/timeline/all` | POST | `offset` | weapi |  |  | 全部视频列表 | ☐ |
| 262 | `/video/timeline/recommend` | POST | `offset` | weapi |  |  | 推荐视频 | ☐ |
| 263 | `/video/url` | POST | `id` `res` | weapi |  |  | 视频链接 | ☐ |
| 264 | `/vip/growthpoint` | POST | — | weapi |  |  | 会员成长值 | ☐ |
| 265 | `/vip/growthpoint/details` | POST | `limit` `offset` | weapi |  |  | 会员成长值领取记录 | ☐ |
| 266 | `/vip/growthpoint/get` | POST | `ids` | weapi |  |  | 领取会员成长值 | ☐ |
| 267 | `/vip/info` | POST | — | weapi |  |  | 获取 VIP 信息 | ☐ |
| 268 | `/vip/tasks` | POST | — | weapi |  |  | 会员任务 | ☐ |
| 269 | `/vip/timemachine` | POST | `startTime` `endTime` `limit` | weapi |  |  | 黑胶时光机 | ☐ |
| 270 | `/weblog` | POST | `data` | weapi |  |  | 操作记录 | ☐ |
| 271 | `/yunbei` | POST | — | weapi |  |  | /api/point/today/get | ☐ |
| 272 | `/yunbei/expense` | POST | `limit` `offset` | api |  |  | — | ☐ |
| 273 | `/yunbei/info` | POST | — | weapi |  |  | — | ☐ |
| 274 | `/yunbei/rcmd/song` | POST | `id` `reason` `yunbeiNum` | weapi |  |  | 云贝推歌 | ☐ |
| 275 | `/yunbei/rcmd/song/history` | POST | `size` `cursor` | weapi |  |  | 云贝推歌历史记录 | ☐ |
| 276 | `/yunbei/receipt` | POST | `limit` `offset` | api |  |  | — | ☐ |
| 277 | `/yunbei/sign` | POST | — | weapi |  |  | — | ☐ |
| 278 | `/yunbei/task/finish` | POST | `userTaskId` `depositCode` | weapi |  |  | — | ☐ |
| 279 | `/yunbei/tasks` | POST | — | weapi |  |  | — | ☐ |
| 280 | `/yunbei/tasks/todo` | POST | — | weapi |  |  | — | ☐ |
| 281 | `/yunbei/today` | POST | — | weapi |  |  | — | ☐ |

> "复杂⚠" = 单文件多次上游调用/循环/分页拼接，重构时人工核对响应合成逻辑。
> "需登录" 为启发式判定（源码出现 MUSIC_U 或对 cookie 写 os/appver），仅作参考——实际多数接口匿名可用、仅数据完整度不同。
> "上游加密" 为 api/无 的通常是走 eapi/weapi 变量拼接或纯本地逻辑，重构时人工确认。

## 上游端点映射（对照加密通道，重构后请求层等价性检查用）

- `/activate/init/profile` → `eapi/activate/initProfile`
- `/album` → `weapi/v1/album/{x}`
- `/album/detail` → `weapi/vipmall/albumproduct/detail`
- `/album/detail/dynamic` → `api/album/detail/dynamic`
- `/album/list` → `weapi/vipmall/albumproduct/list`
- `/album/list/style` → `weapi/vipmall/appalbum/album/style`
- `/album/new` → `weapi/album/new`
- `/album/newest` → `api/discovery/newAlbum`
- `/album/songsaleboard` → `api/feealbum/songsaleboard/{x}/type`
- `/album/sub` → `api/album/{x}`
- `/album/sublist` → `weapi/album/sublist`
- `/artist/album` → `weapi/artist/albums/{x}`
- `/artist/desc` → `weapi/artist/introduction`
- `/artist/detail` → `api/artist/head/info/get`
- `/artist/fans` → `weapi/artist/fans/get`
- `/artist/follow/count` → `weapi/artist/follow/count/get`
- `/artist/list` → `api/v1/artist/list`
- `/artist/mv` → `weapi/artist/mvs`
- `/artist/new/mv` → `api/sub/artist/new/works/mv/list`
- `/artist/new/song` → `api/sub/artist/new/works/song/list`
- `/artist/songs` → `api/v1/artist/songs`
- `/artist/sub` → `weapi/artist/{x}`
- `/artist/sublist` → `weapi/artist/sublist`
- `/artist/top/song` → `api/artist/top/song`
- `/artist/video` → `weapi/mlog/artist/video`
- `/artists` → `weapi/v1/artist/{x}`
- `/audio/match` → `api/music/audio/match`
- `/avatar/upload` → `weapi/user/avatar/upload/v1`
- `/banner` → `api/v2/banner/get`
- `/batch` → `eapi/batch`
- `/calendar` → `api/mcalendar/detail`
- `/captcha/sent` → `api/sms/captcha/sent`
- `/captcha/verify` → `weapi/sms/captcha/verify`
- `/cellphone/existence/check` → `eapi/cellphone/existence/check`
- `/check/music` → `weapi/song/enhance/player/url`
- `/cloud` → `api/cloud/upload/check` + `weapi/nos/token/alloc` + `api/upload/cloud/info/v2` + `api/cloud/pub/v2`
- `/cloud/match` → `api/cloud/user/song/match`
- `/cloudsearch` → `eapi/cloudsearch/pc`
- `/comment` → `weapi/resource/comments/{x}`
- `/comment/album` → `weapi/v1/resource/comments/R_AL_3_{x}`
- `/comment/dj` → `weapi/v1/resource/comments/A_DJ_1_{x}`
- `/comment/event` → `weapi/v1/resource/comments/{x}`
- `/comment/floor` → `api/resource/comment/floor/get`
- `/comment/hot` → `weapi/v1/resource/hotcomments/{x}{x}`
- `/comment/hug/list` → `api/v2/resource/comments/hug/list`
- `/comment/like` → `weapi/v1/comment/{x}`
- `/comment/music` → `api/v1/resource/comments/R_SO_4_{x}`
- `/comment/mv` → `weapi/v1/resource/comments/R_MV_5_{x}`
- `/comment/new` → `api/v2/resource/comments`
- `/comment/playlist` → `weapi/v1/resource/comments/A_PL_0_{x}`
- `/comment/video` → `weapi/v1/resource/comments/R_VI_62_{x}`
- `/countries/code/list` → `eapi/lbs/countries/v1`
- `/daily_signin` → `weapi/point/dailyTask`
- `/digitalAlbum/detail` → `weapi/vipmall/albumproduct/detail`
- `/digitalAlbum/ordering` → `api/ordering/web/digital`
- `/digitalAlbum/purchased` → `api/digitalAlbum/purchased`
- `/digitalAlbum/sales` → `weapi/vipmall/albumproduct/album/query/sales`
- `/dj/banner` → `weapi/djradio/banner/get`
- `/dj/category/excludehot` → `weapi/djradio/category/excludehot`
- `/dj/category/recommend` → `weapi/djradio/home/category/recommend`
- `/dj/catelist` → `weapi/djradio/category/get`
- `/dj/detail` → `api/djradio/v2/get`
- `/dj/hot` → `weapi/djradio/hot/v1`
- `/dj/paygift` → `weapi/djradio/home/paygift/list?_nmclfl=1`
- `/dj/personalize/recommend` → `api/djradio/personalize/rcmd`
- `/dj/program` → `weapi/dj/program/byradio`
- `/dj/program/detail` → `api/dj/program/detail`
- `/dj/program/toplist` → `api/program/toplist/v1`
- `/dj/program/toplist/hours` → `api/djprogram/toplist/hours`
- `/dj/radio/hot` → `api/djradio/hot`
- `/dj/recommend` → `weapi/djradio/recommend/v1`
- `/dj/recommend/type` → `weapi/djradio/recommend`
- `/dj/sub` → `weapi/djradio/{x}`
- `/dj/sublist` → `weapi/djradio/get/subed`
- `/dj/subscriber` → `api/djradio/subscriber`
- `/dj/today/perfered` → `weapi/djradio/home/today/perfered`
- `/dj/toplist` → `api/djradio/toplist`
- `/dj/toplist/hours` → `api/dj/toplist/hours`
- `/dj/toplist/newcomer` → `api/dj/toplist/newcomer`
- `/dj/toplist/pay` → `api/djradio/toplist/pay`
- `/dj/toplist/popular` → `api/dj/toplist/popular`
- `/event` → `weapi/v1/event/get`
- `/event/del` → `eapi/event/delete`
- `/event/forward` → `weapi/event/forward`
- `/fm_trash` → `weapi/radio/trash/add?alg=RT&songId=${`
- `/follow` → `weapi/user/{x}/{x}`
- `/history/recommend/songs` → `api/discovery/recommend/songs/history/recent`
- `/history/recommend/songs/detail` → `api/discovery/recommend/songs/history/detail`
- `/homepage/block/page` → `api/homepage/block/page`
- `/homepage/dragon/ball` → `eapi/homepage/dragon/ball/static`
- `/hot/topic` → `api/act/hot`
- `/hug/comment` → `api/v2/resource/comments/hug/listener`
- `/like` → `api/radio/like`
- `/likelist` → `weapi/song/like/get`
- `/listentogether/end` → `eapi/listen/together/end/v2`
- `/listentogether/heatbeat` → `eapi/listen/together/heartbeat`
- `/listentogether/play/command` → `eapi/listen/together/play/command/report`
- `/listentogether/room/check` → `eapi/listen/together/room/check`
- `/listentogether/room/create` → `eapi/listen/together/room/create`
- `/listentogether/status` → `api/listen/together/status/get`
- `/listentogether/sync/list/command` → `eapi/listen/together/sync/list/command/report`
- `/listentogether/sync/playlist/get` → `eapi/listen/together/sync/playlist/get`
- `/login` → `api/login`
- `/login/cellphone` → `weapi/login/cellphone`
- `/login/qr/check` → `weapi/login/qrcode/client/login`
- `/login/qr/key` → `weapi/login/qrcode/unikey`
- `/login/refresh` → `weapi/login/token/refresh`
- `/login/status` → `weapi/w/nuser/account/get`
- `/logout` → `weapi/logout`
- `/lyric` → `api/song/lyric?_nmclfl=1`
- `/lyric/new` → `eapi/song/lyric/v1`
- `/mlog/music/rcmd` → `eapi/mlog/rcmd/feed/list`
- `/mlog/to/video` → `weapi/mlog/video/convert/id`
- `/mlog/url` → `weapi/mlog/detail/v1`
- `/msg/comments` → `api/v1/user/comments/{x}`
- `/msg/forwards` → `api/forwards/get`
- `/msg/notices` → `api/msg/notices`
- `/msg/private` → `api/msg/private/users`
- `/msg/private/history` → `api/msg/private/history`
- `/msg/recentcontact` → `api/msg/recentcontact/get`
- `/musician/cloudbean` → `weapi/cloudbean/get`
- `/musician/cloudbean/obtain` → `weapi/nmusician/workbench/mission/reward/obtain/new`
- `/musician/data/overview` → `weapi/creator/musician/statistic/data/overview/get`
- `/musician/play/trend` → `weapi/creator/musician/play/count/statistic/data/trend/get`
- `/musician/sign` → `weapi/creator/user/access`
- `/musician/tasks` → `weapi/nmusician/workbench/mission/cycle/list`
- `/musician/tasks/new` → `api/nmusician/workbench/mission/stage/list`
- `/mv/all` → `api/mv/all`
- `/mv/detail` → `api/v1/mv/detail`
- `/mv/detail/info` → `api/comment/commentthread/info`
- `/mv/exclusive/rcmd` → `api/mv/exclusive/rcmd`
- `/mv/first` → `weapi/mv/first`
- `/mv/sub` → `weapi/mv/{x}`
- `/mv/sublist` → `weapi/cloudvideo/allvideo/sublist`
- `/mv/url` → `weapi/song/enhance/play/mv/url`
- `/nickname/check` → `api/nickname/duplicated`
- `/personal_fm` → `weapi/v1/radio/get`
- `/personalized` → `weapi/personalized/playlist`
- `/personalized/djprogram` → `weapi/personalized/djprogram`
- `/personalized/mv` → `weapi/personalized/mv`
- `/personalized/newsong` → `api/personalized/newsong`
- `/personalized/privatecontent` → `weapi/personalized/privatecontent`
- `/personalized/privatecontent/list` → `api/v2/privatecontent/list`
- `/pl/count` → `weapi/pl/count`
- `/playlist/catlist` → `weapi/playlist/catalogue`
- `/playlist/cover/update` → `weapi/playlist/cover/update`
- `/playlist/create` → `api/playlist/create`
- `/playlist/delete` → `weapi/playlist/remove`
- `/playlist/desc/update` → `eapi/playlist/desc/update`
- `/playlist/detail` → `api/v6/playlist/detail`
- `/playlist/detail/dynamic` → `api/playlist/detail/dynamic`
- `/playlist/highquality/tags` → `api/playlist/highquality/tags`
- `/playlist/hot` → `weapi/playlist/hottags`
- `/playlist/mylike` → `api/mlog/playlist/mylike/bytime/get`
- `/playlist/name/update` → `eapi/playlist/update/name`
- `/playlist/order/update` → `api/playlist/order/update`
- `/playlist/privacy` → `eapi/playlist/update/privacy`
- `/playlist/subscribe` → `weapi/playlist/{x}`
- `/playlist/subscribers` → `weapi/playlist/subscribers`
- `/playlist/tags/update` → `eapi/playlist/tags/update`
- `/playlist/track/add` → `api/playlist/track/add`
- `/playlist/track/all` → `api/v6/playlist/detail` + `api/v3/song/detail`
- `/playlist/track/delete` → `api/playlist/track/delete`
- `/playlist/tracks` → `weapi/playlist/manipulate/tracks` + `api/playlist/manipulate/tracks`
- `/playlist/update` → `weapi/batch`
- `/playlist/update/playcount` → `api/playlist/update/playcount`
- `/playlist/video/recent` → `api/playlist/video/recent`
- `/playmode/intelligence/list` → `weapi/playmode/intelligence/list`
- `/program/recommend` → `weapi/program/recommend/v1`
- `/rebind` → `api/user/replaceCellphone`
- `/recommend/resource` → `weapi/v1/discovery/recommend/resource`
- `/recommend/songs` → `api/v3/discovery/recommend/songs`
- `/record/recent/album` → `api/play-record/album/list`
- `/record/recent/dj` → `api/play-record/djradio/list`
- `/record/recent/playlist` → `api/play-record/playlist/list`
- `/record/recent/song` → `api/play-record/song/list`
- `/record/recent/video` → `api/play-record/newvideo/list`
- `/record/recent/voice` → `api/play-record/voice/list`
- `/register/anonimous` → `api/register/anonimous`
- `/register/cellphone` → `api/register/cellphone`
- `/related/allvideo` → `weapi/cloudvideo/v1/allvideo/rcmd`
- `/resource/like` → `weapi/resource/{x}`
- `/scrobble` → `weapi/feedback/weblog`
- `/search` → `api/search/voice/get` + `weapi/search/get`
- `/search/default` → `eapi/search/defaultkeyword/get`
- `/search/hot` → `weapi/search/hot`
- `/search/hot/detail` → `weapi/hotsearchlist/get`
- `/search/multimatch` → `weapi/search/suggest/multimatch`
- `/search/suggest` → `weapi/search/suggest/`
- `/send/album` → `api/msg/private/send`
- `/send/playlist` → `weapi/msg/private/send`
- `/send/song` → `api/msg/private/send`
- `/send/text` → `weapi/msg/private/send`
- `/setting` → `api/user/setting`
- `/share/resource` → `weapi/share/friends/resource`
- `/sheet/list` → `eapi/music/sheet/list/v1`
- `/sheet/preview` → `eapi//music/sheet/preview/info?id={x}`
- `/sign/happy/info` → `api/sign/happy/info`
- `/signin/progress` → `weapi/act/modules/signin/v2/progress`
- `/simi/artist` → `weapi/discovery/simiArtist`
- `/simi/mv` → `weapi/discovery/simiMV`
- `/simi/playlist` → `weapi/discovery/simiPlaylist`
- `/simi/song` → `weapi/v1/discovery/simiSong`
- `/simi/user` → `weapi/discovery/simiUser`
- `/song/detail` → `api/v3/song/detail`
- `/song/download/url` → `eapi/song/enhance/download/url`
- `/song/order/update` → `api/playlist/manipulate/tracks`
- `/song/purchased` → `weapi/single/mybought/song/list`
- `/song/url` → `eapi/song/enhance/player/url`
- `/song/url/v1` → `eapi/song/enhance/player/url/v1`
- `/song/wiki/summary` → `eapi/music/wiki/home/song/get`
- `/style/album` → `api/style-tag/home/album`
- `/style/artist` → `api/style-tag/home/artist`
- `/style/detail` → `api/style-tag/home/head`
- `/style/list` → `api/tag/list/get`
- `/style/playlist` → `api/style-tag/home/playlist`
- `/style/preference` → `api/tag/my/preference/get`
- `/style/song` → `api/style-tag/home/song`
- `/top/album` → `api/discovery/new/albums/area`
- `/top/artists` → `weapi/artist/top`
- `/top/list` → `api/playlist/v4/detail`
- `/top/mv` → `weapi/mv/toplist`
- `/top/playlist` → `weapi/playlist/list`
- `/top/playlist/highquality` → `api/playlist/highquality/list`
- `/top/song` → `weapi/v1/discovery/new/songs`
- `/topic/detail` → `api/act/detail`
- `/topic/detail/event/hot` → `api/act/event/hot`
- `/topic/sublist` → `api/topic/sublist`
- `/toplist` → `api/toplist`
- `/toplist/artist` → `weapi/toplist/artist`
- `/toplist/detail` → `weapi/toplist/detail`
- `/user/account` → `api/nuser/account/get`
- `/user/audio` → `weapi/djradio/get/byuser`
- `/user/binding` → `api/v1/user/bindings/{x}`
- `/user/bindingcellphone` → `api/user/bindingCellphone`
- `/user/cloud` → `api/v1/cloud/get`
- `/user/cloud/del` → `weapi/cloud/del`
- `/user/cloud/detail` → `weapi/v1/cloud/get/byids`
- `/user/comment/history` → `api/comment/user/comment/history`
- `/user/detail` → `weapi/v1/user/detail/{x}`
- `/user/dj` → `weapi/dj/program/{x}`
- `/user/event` → `api/event/get/{x}`
- `/user/followeds` → `eapi/user/getfolloweds/{x}`
- `/user/follows` → `weapi/user/getfollows/{x}`
- `/user/level` → `weapi/user/level`
- `/user/playlist` → `api/user/playlist`
- `/user/record` → `weapi/v1/play/record`
- `/user/replacephone` → `api/user/replaceCellphone`
- `/user/subcount` → `weapi/subcount`
- `/user/update` → `weapi/user/profile/update`
- `/video/category/list` → `api/cloudvideo/category/list`
- `/video/detail` → `weapi/cloudvideo/v1/video/detail`
- `/video/detail/info` → `api/comment/commentthread/info`
- `/video/group` → `api/videotimeline/videogroup/otherclient/get`
- `/video/group/list` → `api/cloudvideo/group/list`
- `/video/sub` → `weapi/cloudvideo/video/{x}`
- `/video/timeline/all` → `api/videotimeline/otherclient/get`
- `/video/timeline/recommend` → `api/videotimeline/get`
- `/video/url` → `weapi/cloudvideo/playurl`
- `/vip/growthpoint` → `weapi/vipnewcenter/app/level/growhpoint/basic`
- `/vip/growthpoint/details` → `weapi/vipnewcenter/app/level/growth/details`
- `/vip/growthpoint/get` → `weapi/vipnewcenter/app/level/task/reward/get`
- `/vip/info` → `weapi/music-vip-membership/front/vip/info`
- `/vip/tasks` → `weapi/vipnewcenter/app/level/task/list`
- `/vip/timemachine` → `weapi/vipmusic/newrecord/weekflow`
- `/weblog` → `weapi/feedback/weblog`
- `/yunbei` → `api/point/signed/get`
- `/yunbei/info` → `api/v1/user/info`
- `/yunbei/rcmd/song` → `weapi/yunbei/rcmd/song/submit`
- `/yunbei/rcmd/song/history` → `weapi/yunbei/rcmd/song/history/list`
- `/yunbei/sign` → `api/point/dailyTask`
- `/yunbei/task/finish` → `api/usertool/task/point/receive`
- `/yunbei/tasks` → `api/usertool/task/list/all`
- `/yunbei/tasks/todo` → `api/usertool/task/todo/query`
- `/yunbei/today` → `api/point/today/get`
