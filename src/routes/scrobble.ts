import type { ModuleQuery, ModuleRequest } from '../types'

// 听歌打卡
//
// weapi 形态的 feedback/weblog 自 2025 年起「回 200 success 但静默丢弃」——
// 本仓原有实现正是这一支，所以历史上所有上报都石沉大海。实测唯一能落库的组合：
// eapi 加密 + clientlog.music.163.com + cookie 带 os=osx 的桌面客户端身份
// （android / iphone / pc 三种取值均被丢弃）。
//
// 且「最近播放」与「听歌排行」由两条不同的日志写入：只发 play 不会进最近播放，
// 必须补一条 startplay。两条都发，缺一条就少一半记录。
const WEBLOG = 'https://clientlog.music.163.com/eapi/feedback/weblog'
// eapi 的签名路径用 /api/... ，与真正请求的 /eapi/... 不是一个字符串
const SIGN_PATH = '/api/feedback/weblog'

export default async (query: ModuleQuery, request: ModuleRequest) => {
  const id = Number(query.id)
  const sourceId = Number(query.sourceid)
  const time = Math.max(0, Math.floor(Number(query.time) || 0))

  const options = {
    crypto: 'eapi' as const,
    url: SIGN_PATH,
    cookie: {
      ...query.cookie,
      os: 'osx',
      appver: '3.1.10.5100',
      osver: '15.5',
      channel: 'netease',
    },
    proxy: query.proxy,
    realIP: query.realIP,
  }
  const mainsite = {
    mainsite: '1',
    mainsiteWeb: '1',
    content: `id=${sourceId}`,
  }

  await request(
    'POST',
    WEBLOG,
    { logs: JSON.stringify([{ action: 'startplay', json: { id, type: 'song', ...mainsite } }]) },
    options,
  )

  return request(
    'POST',
    WEBLOG,
    {
      logs: JSON.stringify([
        {
          action: 'play',
          json: {
            download: 0,
            end: 'playend',
            id,
            sourceId,
            time,
            type: 'song',
            wifi: 0,
            source: 'list',
            ...mainsite,
          },
        },
      ]),
    },
    options,
  )
}
