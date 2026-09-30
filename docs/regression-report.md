# 接口回归执行报告

- 目标服务：`http://127.0.0.1:3000`　层：P0+P1　登录态：匿名
- 用例 267 条：通过 267，失败 0，耗时 4.2s
- 生成时间：2026-09-30T04:41:06.427Z
- 与基线 `docs/regression-baseline.json` 对比：一致 258，结构/码变化 9，基线中存在但本次缺失 0

| # | 路由 | 层 | HTTP | body.code | 耗时 | 判定 | 与基线 |
|---|------|----|------|-----------|------|------|--------|
| 1 | `/album` | P0 | 200 | 200 | 233ms | ✅ | 一致 |
| 2 | `/album/detail` | P0 | 404 | 404 | 109ms | ✅ | 一致 |
| 3 | `/album/detail/dynamic` | P0 | 200 | 200 | 114ms | ✅ | 一致 |
| 4 | `/album/list` | P0 | 200 | 200 | 120ms | ✅ | 一致 |
| 5 | `/album/list/style` | P0 | 404 | 404 | 204ms | ✅ | 一致 |
| 6 | `/album/new` | P0 | 200 | 200 | 129ms | ✅ | ⚠ 差异 |
| 7 | `/album/newest` | P0 | 200 | 200 | 58ms | ✅ | 一致 |
| 8 | `/album/songsaleboard` | P0 | 404 | 404 | 42ms | ✅ | 一致 |
| 9 | `/album/sub` | P1 | 301 | 301 | 58ms | ✅ | 一致 |
| 10 | `/album/sublist` | P1 | 301 | 301 | 50ms | ✅ | 一致 |
| 11 | `/artist/album` | P0 | 200 | 200 | 136ms | ✅ | 一致 |
| 12 | `/artist/desc` | P0 | 200 | 200 | 76ms | ✅ | 一致 |
| 13 | `/artist/detail` | P0 | 200 | 200 | 103ms | ✅ | 一致 |
| 14 | `/artist/fans` | P0 | 200 | 200 | 68ms | ✅ | 一致 |
| 15 | `/artist/follow/count` | P0 | 200 | 200 | 83ms | ✅ | 一致 |
| 16 | `/artist/list` | P0 | 200 | 400 | 43ms | ✅ | 一致 |
| 17 | `/artist/mv` | P0 | 200 | 200 | 90ms | ✅ | 一致 |
| 18 | `/artist/new/mv` | P1 | 301 | 301 | 46ms | ✅ | 一致 |
| 19 | `/artist/new/song` | P1 | 301 | 301 | 70ms | ✅ | 一致 |
| 20 | `/artist/songs` | P0 | 200 | 200 | 451ms | ✅ | 一致 |
| 21 | `/artist/sub` | P1 | 301 | 301 | 43ms | ✅ | 一致 |
| 22 | `/artist/sublist` | P1 | 301 | 301 | 88ms | ✅ | 一致 |
| 23 | `/artist/top/song` | P0 | 200 | 200 | 129ms | ✅ | 一致 |
| 24 | `/artist/video` | P0 | 502 | 502 | 47ms | ✅ | 一致 |
| 25 | `/artists` | P0 | 200 | 200 | 773ms | ✅ | 一致 |
| 26 | `/audio/match` | P0 | 200 | 200 | 249ms | ✅ | 一致 |
| 27 | `/avatar/upload` | P0 | 404 | 404 | 3ms | ✅ | 一致 |
| 28 | `/banner` | P0 | 200 | 200 | 50ms | ✅ | 一致 |
| 29 | `/batch` | P0 | 200 | 400 | 36ms | ✅ | 一致 |
| 30 | `/calendar` | P1 | 301 | 301 | 67ms | ✅ | 一致 |
| 31 | `/cellphone/existence/check` | P0 | 200 | 400 | 60ms | ✅ | 一致 |
| 32 | `/check/music` | P0 | 200 | — | 60ms | ✅ | 一致 |
| 33 | `/cloudsearch` | P0 | 200 | 200 | 330ms | ✅ | 一致 |
| 34 | `/comment` | P0 | 200 | 400 | 46ms | ✅ | 一致 |
| 35 | `/comment/album` | P0 | 200 | 200 | 246ms | ✅ | 一致 |
| 36 | `/comment/dj` | P0 | 200 | 200 | 60ms | ✅ | 一致 |
| 37 | `/comment/event` | P0 | 200 | 400 | 50ms | ✅ | 一致 |
| 38 | `/comment/floor` | P0 | 200 | 400 | 49ms | ✅ | 一致 |
| 39 | `/comment/hot` | P0 | 200 | 200 | 55ms | ✅ | 一致 |
| 40 | `/comment/hug/list` | P1 | 301 | 301 | 59ms | ✅ | 一致 |
| 41 | `/comment/like` | P1 | 301 | 301 | 61ms | ✅ | 一致 |
| 42 | `/comment/music` | P0 | 200 | 200 | 158ms | ✅ | 一致 |
| 43 | `/comment/mv` | P0 | 200 | 200 | 167ms | ✅ | 一致 |
| 44 | `/comment/new` | P0 | 200 | 200 | 77ms | ✅ | 一致 |
| 45 | `/comment/playlist` | P0 | 200 | 200 | 67ms | ✅ | 一致 |
| 46 | `/comment/video` | P0 | 200 | 200 | 77ms | ✅ | 一致 |
| 47 | `/countries/code/list` | P0 | 200 | 200 | 117ms | ✅ | 一致 |
| 48 | `/daily_signin` | P1 | 301 | 301 | 61ms | ✅ | 一致 |
| 49 | `/digitalAlbum/detail` | P0 | 404 | 404 | 46ms | ✅ | 一致 |
| 50 | `/digitalAlbum/ordering` | P0 | 502 | 502 | 53ms | ✅ | 一致 |
| 51 | `/digitalAlbum/purchased` | P1 | 301 | 301 | 86ms | ✅ | 一致 |
| 52 | `/digitalAlbum/sales` | P0 | 200 | 200 | 48ms | ✅ | 一致 |
| 53 | `/dj/banner` | P0 | 200 | 200 | 52ms | ✅ | 一致 |
| 54 | `/dj/category/excludehot` | P0 | 200 | 200 | 91ms | ✅ | 一致 |
| 55 | `/dj/category/recommend` | P0 | 200 | 200 | 220ms | ✅ | 一致 |
| 56 | `/dj/catelist` | P0 | 200 | 200 | 44ms | ✅ | 一致 |
| 57 | `/dj/detail` | P0 | 404 | 404 | 64ms | ✅ | 一致 |
| 58 | `/dj/hot` | P0 | 200 | 200 | 72ms | ✅ | 一致 |
| 59 | `/dj/paygift` | P0 | 200 | 200 | 64ms | ✅ | 一致 |
| 60 | `/dj/personalize/recommend` | P0 | 200 | 200 | 72ms | ✅ | 一致 |
| 61 | `/dj/program` | P0 | 200 | 200 | 55ms | ✅ | 一致 |
| 62 | `/dj/program/detail` | P0 | 404 | 404 | 52ms | ✅ | 一致 |
| 63 | `/dj/program/toplist` | P0 | 200 | 200 | 294ms | ✅ | ⚠ 差异 |
| 64 | `/dj/program/toplist/hours` | P0 | 200 | 200 | 302ms | ✅ | 一致 |
| 65 | `/dj/radio/hot` | P0 | 200 | 200 | 52ms | ✅ | 一致 |
| 66 | `/dj/recommend` | P0 | 200 | 200 | 83ms | ✅ | 一致 |
| 67 | `/dj/recommend/type` | P0 | 200 | 200 | 62ms | ✅ | 一致 |
| 68 | `/dj/sub` | P1 | 301 | 301 | 107ms | ✅ | 一致 |
| 69 | `/dj/sublist` | P0 | 200 | 200 | 55ms | ✅ | 一致 |
| 70 | `/dj/subscriber` | P0 | 200 | 200 | 88ms | ✅ | 一致 |
| 71 | `/dj/today/perfered` | P0 | 200 | 200 | 106ms | ✅ | 一致 |
| 72 | `/dj/toplist` | P0 | 200 | 200 | 102ms | ✅ | 一致 |
| 73 | `/dj/toplist/hours` | P0 | 200 | 200 | 244ms | ✅ | ⚠ 差异 |
| 74 | `/dj/toplist/newcomer` | P0 | 200 | 200 | 182ms | ✅ | 一致 |
| 75 | `/dj/toplist/pay` | P0 | 200 | 200 | 78ms | ✅ | 一致 |
| 76 | `/dj/toplist/popular` | P0 | 200 | 200 | 155ms | ✅ | 一致 |
| 77 | `/event` | P1 | 301 | 301 | 50ms | ✅ | 一致 |
| 78 | `/event/del` | P0 | 403 | 403 | 49ms | ✅ | 一致 |
| 79 | `/event/forward` | P1 | 301 | 301 | 51ms | ✅ | 一致 |
| 80 | `/fm_trash` | P1 | 301 | 301 | 43ms | ✅ | 一致 |
| 81 | `/follow` | P1 | 301 | 301 | 56ms | ✅ | 一致 |
| 82 | `/history/recommend/songs` | P0 | 200 | 200 | 39ms | ✅ | 一致 |
| 83 | `/history/recommend/songs/detail` | P1 | 301 | 301 | 44ms | ✅ | 一致 |
| 84 | `/homepage/block/page` | P0 | 200 | 200 | 107ms | ✅ | 一致 |
| 85 | `/homepage/dragon/ball` | P0 | 200 | 200 | 34ms | ✅ | 一致 |
| 86 | `/hot/topic` | P1 | 301 | 301 | 43ms | ✅ | 一致 |
| 87 | `/hug/comment` | P1 | 301 | 301 | 43ms | ✅ | 一致 |
| 88 | `/inner/version` | P0 | 200 | 200 | 2ms | ✅ | 一致 |
| 89 | `/like` | P1 | 301 | 301 | 44ms | ✅ | 一致 |
| 90 | `/likelist` | P1 | 301 | 301 | 45ms | ✅ | 一致 |
| 91 | `/listentogether/end` | P0 | 200 | 301 | 71ms | ✅ | 一致 |
| 92 | `/listentogether/heatbeat` | P0 | 502 | 502 | 78ms | ✅ | 一致 |
| 93 | `/listentogether/play/command` | P0 | 200 | 301 | 82ms | ✅ | 一致 |
| 94 | `/listentogether/room/check` | P0 | 200 | 301 | 78ms | ✅ | 一致 |
| 95 | `/listentogether/room/create` | P0 | 200 | 301 | 89ms | ✅ | 一致 |
| 96 | `/listentogether/status` | P1 | 301 | 301 | 42ms | ✅ | 一致 |
| 97 | `/listentogether/sync/list/command` | P0 | 200 | 301 | 37ms | ✅ | 一致 |
| 98 | `/listentogether/sync/playlist/get` | P0 | 200 | 301 | 37ms | ✅ | 一致 |
| 99 | `/login` | P0 | 200 | 502 | 158ms | ✅ | 一致 |
| 100 | `/login/qr/create` | P0 | 200 | 200 | 28ms | ✅ | 一致 |
| 101 | `/login/qr/key` | P0 | 200 | 200 | 66ms | ✅ | 一致 |
| 102 | `/lyric` | P0 | 200 | 200 | 66ms | ✅ | 一致 |
| 103 | `/lyric/new` | P0 | 200 | 200 | 44ms | ✅ | 一致 |
| 104 | `/mlog/music/rcmd` | P0 | 200 | 200 | 89ms | ✅ | 一致 |
| 105 | `/mlog/to/video` | P0 | 200 | 400 | 50ms | ✅ | 一致 |
| 106 | `/mlog/url` | P0 | 200 | 400 | 56ms | ✅ | 一致 |
| 107 | `/msg/comments` | P1 | 301 | 301 | 51ms | ✅ | 一致 |
| 108 | `/msg/forwards` | P1 | 301 | 301 | 49ms | ✅ | 一致 |
| 109 | `/msg/notices` | P1 | 301 | 301 | 73ms | ✅ | 一致 |
| 110 | `/msg/private` | P1 | 301 | 301 | 54ms | ✅ | 一致 |
| 111 | `/msg/private/history` | P1 | 301 | 301 | 82ms | ✅ | 一致 |
| 112 | `/msg/recentcontact` | P1 | 301 | 301 | 76ms | ✅ | 一致 |
| 113 | `/musician/cloudbean` | P1 | 301 | 301 | 46ms | ✅ | 一致 |
| 114 | `/musician/cloudbean/obtain` | P1 | 301 | 301 | 47ms | ✅ | 一致 |
| 115 | `/musician/data/overview` | P0 | 200 | 302 | 48ms | ✅ | 一致 |
| 116 | `/musician/play/trend` | P0 | 200 | 302 | 39ms | ✅ | 一致 |
| 117 | `/musician/sign` | P0 | 200 | 302 | 39ms | ✅ | 一致 |
| 118 | `/musician/tasks` | P1 | 301 | 301 | 62ms | ✅ | 一致 |
| 119 | `/musician/tasks/new` | P1 | 301 | 301 | 50ms | ✅ | 一致 |
| 120 | `/mv/all` | P0 | 200 | 400 | 44ms | ✅ | 一致 |
| 121 | `/mv/detail` | P0 | 200 | 200 | 75ms | ✅ | 一致 |
| 122 | `/mv/detail/info` | P0 | 200 | 200 | 48ms | ✅ | 一致 |
| 123 | `/mv/exclusive/rcmd` | P0 | 200 | 200 | 125ms | ✅ | 一致 |
| 124 | `/mv/first` | P0 | 200 | 200 | 43ms | ✅ | 一致 |
| 125 | `/mv/sub` | P1 | 301 | 301 | 42ms | ✅ | 一致 |
| 126 | `/mv/sublist` | P1 | 301 | 301 | 71ms | ✅ | 一致 |
| 127 | `/mv/url` | P0 | 200 | 200 | 77ms | ✅ | 一致 |
| 128 | `/nickname/check` | P0 | 200 | 200 | 44ms | ✅ | 一致 |
| 129 | `/personal_fm` | P0 | 200 | 200 | 80ms | ✅ | 一致 |
| 130 | `/personalized` | P0 | 200 | 200 | 154ms | ✅ | 一致 |
| 131 | `/personalized/djprogram` | P0 | 200 | 200 | 223ms | ✅ | ⚠ 差异 |
| 132 | `/personalized/mv` | P0 | 200 | 200 | 65ms | ✅ | 一致 |
| 133 | `/personalized/newsong` | P0 | 200 | 200 | 176ms | ✅ | 一致 |
| 134 | `/personalized/privatecontent` | P0 | 200 | 200 | 60ms | ✅ | 一致 |
| 135 | `/personalized/privatecontent/list` | P0 | 200 | 200 | 49ms | ✅ | 一致 |
| 136 | `/pl/count` | P0 | 200 | — | 52ms | ✅ | 一致 |
| 137 | `/playlist/catlist` | P0 | 200 | 200 | 70ms | ✅ | 一致 |
| 138 | `/playlist/cover/update` | P0 | 400 | 400 | 2ms | ✅ | 一致 |
| 139 | `/playlist/create` | P1 | 301 | 301 | 63ms | ✅ | 一致 |
| 140 | `/playlist/delete` | P1 | 301 | 301 | 45ms | ✅ | 一致 |
| 141 | `/playlist/desc/update` | P0 | 200 | 301 | 59ms | ✅ | 一致 |
| 142 | `/playlist/detail` | P0 | 200 | 400 | 56ms | ✅ | 一致 |
| 143 | `/playlist/detail/dynamic` | P0 | 200 | 200 | 55ms | ✅ | 一致 |
| 144 | `/playlist/highquality/tags` | P0 | 200 | 200 | 49ms | ✅ | 一致 |
| 145 | `/playlist/hot` | P0 | 200 | 200 | 45ms | ✅ | 一致 |
| 146 | `/playlist/mylike` | P1 | 301 | 301 | 45ms | ✅ | 一致 |
| 147 | `/playlist/name/update` | P0 | 200 | 301 | 54ms | ✅ | 一致 |
| 148 | `/playlist/order/update` | P1 | 301 | 301 | 43ms | ✅ | 一致 |
| 149 | `/playlist/privacy` | P0 | 200 | 301 | 43ms | ✅ | 一致 |
| 150 | `/playlist/subscribe` | P0 | 403 | 403 | 43ms | ✅ | 一致 |
| 151 | `/playlist/subscribers` | P0 | 200 | 200 | 64ms | ✅ | 一致 |
| 152 | `/playlist/tags/update` | P0 | 200 | 301 | 98ms | ✅ | 一致 |
| 153 | `/playlist/track/add` | P1 | 301 | 301 | 40ms | ✅ | 一致 |
| 154 | `/playlist/track/all` | P0 | 404 | 404 | 79ms | ✅ | 一致 |
| 155 | `/playlist/track/delete` | P1 | 301 | 301 | 41ms | ✅ | 一致 |
| 156 | `/playlist/tracks` | P0 | 200 | 301 | 40ms | ✅ | 一致 |
| 157 | `/playlist/update` | P0 | 200 | 200 | 59ms | ✅ | 一致 |
| 158 | `/playlist/update/playcount` | P0 | 200 | 200 | 48ms | ✅ | 一致 |
| 159 | `/playlist/video/recent` | P0 | 200 | 200 | 37ms | ✅ | 一致 |
| 160 | `/playmode/intelligence/list` | P1 | 301 | 301 | 46ms | ✅ | 一致 |
| 161 | `/program/recommend` | P0 | 200 | 200 | 155ms | ✅ | 一致 |
| 162 | `/recommend/resource` | P1 | 301 | 301 | 47ms | ✅ | 一致 |
| 163 | `/recommend/songs` | P0 | 200 | 200 | 157ms | ✅ | ⚠ 差异 |
| 164 | `/record/recent/album` | P0 | 200 | 200 | 44ms | ✅ | 一致 |
| 165 | `/record/recent/dj` | P0 | 200 | 200 | 42ms | ✅ | 一致 |
| 166 | `/record/recent/playlist` | P0 | 200 | 200 | 40ms | ✅ | 一致 |
| 167 | `/record/recent/song` | P0 | 200 | 200 | 52ms | ✅ | 一致 |
| 168 | `/record/recent/video` | P0 | 200 | 200 | 49ms | ✅ | 一致 |
| 169 | `/record/recent/voice` | P0 | 200 | 200 | 44ms | ✅ | 一致 |
| 170 | `/related/allvideo` | P0 | 200 | 200 | 48ms | ✅ | 一致 |
| 171 | `/related/playlist` | P0 | 200 | 200 | 301ms | ✅ | 一致 |
| 172 | `/resource/like` | P1 | 301 | 301 | 49ms | ✅ | 一致 |
| 173 | `/scrobble` | P0 | 200 | 200 | 76ms | ✅ | 一致 |
| 174 | `/search` | P0 | 200 | 200 | 304ms | ✅ | 一致 |
| 175 | `/search/default` | P0 | 200 | 200 | 63ms | ✅ | 一致 |
| 176 | `/search/hot` | P0 | 200 | 200 | 57ms | ✅ | 一致 |
| 177 | `/search/hot/detail` | P0 | 200 | 200 | 82ms | ✅ | 一致 |
| 178 | `/search/multimatch` | P0 | 200 | 200 | 133ms | ✅ | ⚠ 差异 |
| 179 | `/search/suggest` | P0 | 200 | 200 | 107ms | ✅ | 一致 |
| 180 | `/send/album` | P1 | 301 | 301 | 85ms | ✅ | 一致 |
| 181 | `/send/playlist` | P1 | 301 | 301 | 88ms | ✅ | 一致 |
| 182 | `/send/song` | P1 | 301 | 301 | 88ms | ✅ | 一致 |
| 183 | `/send/text` | P1 | 301 | 301 | 98ms | ✅ | 一致 |
| 184 | `/setting` | P0 | 200 | 400 | 71ms | ✅ | 一致 |
| 185 | `/share/resource` | P1 | 301 | 301 | 75ms | ✅ | 一致 |
| 186 | `/sheet/list` | P0 | 200 | 200 | 153ms | ✅ | 一致 |
| 187 | `/sheet/preview` | P0 | 200 | 200 | 72ms | ✅ | 一致 |
| 188 | `/sign/happy/info` | P0 | 200 | 302 | 64ms | ✅ | 一致 |
| 189 | `/signin/progress` | P1 | 301 | 301 | 124ms | ✅ | 一致 |
| 190 | `/simi/artist` | P1 | 301 | 301 | 134ms | ✅ | 一致 |
| 191 | `/simi/mv` | P0 | 200 | 200 | 130ms | ✅ | 一致 |
| 192 | `/simi/playlist` | P0 | 200 | 200 | 106ms | ✅ | 一致 |
| 193 | `/simi/song` | P0 | 200 | 200 | 178ms | ✅ | ⚠ 差异 |
| 194 | `/simi/user` | P1 | 301 | 301 | 106ms | ✅ | 一致 |
| 195 | `/song/detail` | P0 | 200 | 200 | 106ms | ✅ | 一致 |
| 196 | `/song/download/url` | P0 | 200 | 200 | 98ms | ✅ | 一致 |
| 197 | `/song/order/update` | P1 | 301 | 301 | 96ms | ✅ | 一致 |
| 198 | `/song/purchased` | P1 | 301 | 301 | 70ms | ✅ | 一致 |
| 199 | `/song/url` | P0 | 200 | 200 | 77ms | ✅ | 一致 |
| 200 | `/song/url/v1` | P0 | 200 | 200 | 77ms | ✅ | 一致 |
| 201 | `/song/wiki/summary` | P0 | 200 | 200 | 186ms | ✅ | 一致 |
| 202 | `/style/album` | P0 | 200 | 200 | 68ms | ✅ | 一致 |
| 203 | `/style/artist` | P0 | 200 | 200 | 65ms | ✅ | 一致 |
| 204 | `/style/detail` | P0 | 200 | 200 | 43ms | ✅ | 一致 |
| 205 | `/style/list` | P0 | 200 | 200 | 67ms | ✅ | 一致 |
| 206 | `/style/playlist` | P0 | 200 | 200 | 53ms | ✅ | 一致 |
| 207 | `/style/preference` | P0 | 200 | 200 | 48ms | ✅ | 一致 |
| 208 | `/style/song` | P0 | 200 | 200 | 49ms | ✅ | 一致 |
| 209 | `/top/album` | P0 | 200 | 200 | 1227ms | ✅ | ⚠ 差异 |
| 210 | `/top/artists` | P0 | 200 | 200 | 66ms | ✅ | 一致 |
| 211 | `/top/list` | P0 | 200 | 400 | 67ms | ✅ | 一致 |
| 212 | `/top/mv` | P0 | 200 | 400 | 43ms | ✅ | 一致 |
| 213 | `/top/playlist` | P0 | 200 | 200 | 122ms | ✅ | 一致 |
| 214 | `/top/playlist/highquality` | P0 | 200 | 200 | 115ms | ✅ | 一致 |
| 215 | `/top/song` | P0 | 200 | 200 | 61ms | ✅ | 一致 |
| 216 | `/topic/detail` | P0 | 404 | 404 | 59ms | ✅ | 一致 |
| 217 | `/topic/detail/event/hot` | P0 | 404 | 404 | 66ms | ✅ | 一致 |
| 218 | `/topic/sublist` | P1 | 301 | 301 | 44ms | ✅ | 一致 |
| 219 | `/toplist` | P0 | 200 | 200 | 104ms | ✅ | 一致 |
| 220 | `/toplist/artist` | P0 | 200 | 200 | 71ms | ✅ | 一致 |
| 221 | `/toplist/detail` | P0 | 200 | 200 | 186ms | ✅ | 一致 |
| 222 | `/user/account` | P0 | 200 | 200 | 58ms | ✅ | 一致 |
| 223 | `/user/audio` | P0 | 200 | 200 | 72ms | ✅ | 一致 |
| 224 | `/user/binding` | P1 | 301 | 301 | 44ms | ✅ | 一致 |
| 225 | `/user/bindingcellphone` | P1 | 301 | 301 | 51ms | ✅ | 一致 |
| 226 | `/user/cloud` | P1 | 301 | 301 | 49ms | ✅ | 一致 |
| 227 | `/user/cloud/del` | P1 | 301 | 301 | 50ms | ✅ | 一致 |
| 228 | `/user/cloud/detail` | P1 | 301 | 301 | 46ms | ✅ | 一致 |
| 229 | `/user/comment/history` | P0 | 200 | 200 | 50ms | ✅ | 一致 |
| 230 | `/user/detail` | P0 | 200 | 200 | 109ms | ✅ | 一致 |
| 231 | `/user/dj` | P0 | 200 | 200 | 83ms | ✅ | 一致 |
| 232 | `/user/event` | P0 | 200 | 200 | 82ms | ✅ | 一致 |
| 233 | `/user/followeds` | P0 | 200 | 200 | 154ms | ✅ | ⚠ 差异 |
| 234 | `/user/follows` | P0 | 200 | 200 | 79ms | ✅ | 一致 |
| 235 | `/user/level` | P1 | 301 | 301 | 49ms | ✅ | 一致 |
| 236 | `/user/playlist` | P0 | 200 | 200 | 100ms | ✅ | 一致 |
| 237 | `/user/record` | P0 | 400 | -2 | 48ms | ✅ | 一致 |
| 238 | `/user/replacephone` | P1 | 301 | 301 | 51ms | ✅ | 一致 |
| 239 | `/user/subcount` | P1 | 301 | 301 | 52ms | ✅ | 一致 |
| 240 | `/user/update` | P0 | 403 | 403 | 78ms | ✅ | 一致 |
| 241 | `/video/category/list` | P1 | 301 | 301 | 57ms | ✅ | 一致 |
| 242 | `/video/detail` | P0 | 200 | 400 | 57ms | ✅ | 一致 |
| 243 | `/video/detail/info` | P0 | 200 | 200 | 55ms | ✅ | 一致 |
| 244 | `/video/group` | P1 | 301 | 301 | 49ms | ✅ | 一致 |
| 245 | `/video/group/list` | P0 | 200 | 200 | 49ms | ✅ | 一致 |
| 246 | `/video/sub` | P1 | 301 | 301 | 45ms | ✅ | 一致 |
| 247 | `/video/timeline/all` | P1 | 301 | 301 | 45ms | ✅ | 一致 |
| 248 | `/video/timeline/recommend` | P1 | 301 | 301 | 53ms | ✅ | 一致 |
| 249 | `/video/url` | P0 | 200 | 200 | 86ms | ✅ | 一致 |
| 250 | `/vip/growthpoint` | P0 | 200 | 200 | 46ms | ✅ | 一致 |
| 251 | `/vip/growthpoint/details` | P1 | 301 | 301 | 58ms | ✅ | 一致 |
| 252 | `/vip/growthpoint/get` | P0 | 401 | 401 | 42ms | ✅ | 一致 |
| 253 | `/vip/info` | P1 | 301 | 301 | 53ms | ✅ | 一致 |
| 254 | `/vip/tasks` | P1 | 301 | 301 | 85ms | ✅ | 一致 |
| 255 | `/vip/timemachine` | P1 | 301 | 301 | 45ms | ✅ | 一致 |
| 256 | `/weblog` | P0 | 200 | 200 | 35ms | ✅ | 一致 |
| 257 | `/yunbei` | P1 | 301 | 301 | 38ms | ✅ | 一致 |
| 258 | `/yunbei/expense` | P1 | 301 | 301 | 65ms | ✅ | 一致 |
| 259 | `/yunbei/info` | P0 | 404 | 404 | 43ms | ✅ | 一致 |
| 260 | `/yunbei/rcmd/song` | P1 | 301 | 301 | 40ms | ✅ | 一致 |
| 261 | `/yunbei/rcmd/song/history` | P1 | 301 | 301 | 46ms | ✅ | 一致 |
| 262 | `/yunbei/receipt` | P1 | 301 | 301 | 40ms | ✅ | 一致 |
| 263 | `/yunbei/sign` | P1 | 301 | 301 | 41ms | ✅ | 一致 |
| 264 | `/yunbei/task/finish` | P1 | 301 | 301 | 44ms | ✅ | 一致 |
| 265 | `/yunbei/tasks` | P1 | 301 | 301 | 40ms | ✅ | 一致 |
| 266 | `/yunbei/tasks/todo` | P1 | 301 | 301 | 41ms | ✅ | 一致 |
| 267 | `/yunbei/today` | P1 | 301 | 301 | 44ms | ✅ | 一致 |

## 差异明细

| 路由 | 基线 code | 新 code | 基线结构指纹（截断 120 字符） | 新结构指纹 |
|------|-----------|---------|------------------------------|------------|
| `/album/new` | 200 | 200 | `{albums:[{alias:[empty],artist:{albumSize:number,alias:[…],briefDesc:string,followed:boolean,id:number,img1v1Id:number,i` | `{albums:[{alias:[empty],artist:{albumSize:number,alias:[empty],briefDesc:string,followed:boolean,id:number,img1v1Id:numb` |
| `/dj/program/toplist` | 200 | 200 | `{code:number,toplist:[{lastRank:number,program:{adIconInfo:null,additionIconList:null,aiGenerated:null,alg:null,auditDis` | `{code:number,toplist:[{lastRank:number,program:{adIconInfo:null,additionIconList:null,aiGenerated:boolean,alg:null,audit` |
| `/dj/toplist/hours` | 200 | 200 | `{code:number,data:{list:[{avatarDetail:null,avatarUrl:string,id:number,lastRank:number,liveId:number,liveStatus:number,l` | `{code:number,data:{list:[{avatarDetail:{identityIconUrl:…,identityLevel:…,userType:…},avatarUrl:string,id:number,lastRan` |
| `/personalized/djprogram` | 200 | 200 | `{category:number,code:number,result:[{alg:string,canDislike:boolean,copywriter:string,id:number,name:string,picUrl:strin` | `{category:number,code:number,result:[{alg:string,canDislike:boolean,copywriter:string,id:number,name:string,picUrl:strin` |
| `/recommend/songs` | 200 | 200 | `{code:number,data:{algReturnDemote:boolean,dailyRecommendInfo:null,dailySongs:[{a:null,additionalTitle:null,al:{id:…,nam` | `{code:number,data:{algReturnDemote:boolean,dailyRecommendInfo:null,dailySongs:[{a:null,additionalTitle:null,al:{id:…,nam` |
| `/search/multimatch` | 200 | 200 | `{code:number,result:{artist:[{albumSize:number,alg:string,alias:[empty],briefDesc:string,fansSize:number,id:number,img1v` | `{code:number,result:{artist:[{albumSize:number,alg:string,alias:[empty],briefDesc:string,fansSize:number,id:number,img1v` |
| `/simi/song` | 200 | 200 | `{code:number,songs:[{album:{alias:[empty],artist:{albumSize:…,alias:…,briefDesc:…,followed:…,id:…,img1v1Id:…,img1v1Id_st` | `{code:number,songs:[{album:{alias:[empty],artist:{albumSize:…,alias:…,briefDesc:…,followed:…,id:…,img1v1Id:…,img1v1Id_st` |
| `/top/album` | 200 | 200 | `{code:number,hasMore:boolean,monthData:[{alias:[empty],areaId:number,artist:{albumSize:number,alias:[empty],briefDesc:st` | `{code:number,hasMore:boolean,monthData:[{alias:[string],areaId:number,artist:{albumSize:number,alias:[empty],briefDesc:s` |
| `/user/followeds` | 200 | 200 | `{code:number,followeds:[{accountStatus:number,authStatus:number,avatarDetail:null,avatarUrl:string,eventCount:number,exp` | `{code:number,followeds:[{accountStatus:number,authStatus:number,avatarDetail:null,avatarUrl:string,eventCount:number,exp` |
