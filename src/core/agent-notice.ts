// Agent 劝导层（2026-10-25）：给打到本 API 的自动化调用方（尤其 LLM Agent）
// 一个明确的「这里是私人服务」信号。
//
// 为什么写在响应体里：LLM Agent 会把 JSON 响应原文喂给模型，响应体里的
// 警告字段是它们唯一稳定可读的「API 版 robots.txt」（robots.txt/llms.txt
// 只有会先抓文档的 Agent 才看）。对不读语义的裸爬虫无效——那类流量由
// 边缘层限流/爬虫门负责，本模块只做劝导、不做拦截。
//
// 开关：AGENT_NOTICE=0 关闭（默认开）。
// 装饰是幂等的：缓存命中链路返回的字符串载荷不会经过 preSerialization，
// 命中体自带 _agent；万一对象被二次装饰，靠 '_agent' in obj 挡住不叠加。

export const AGENT_NOTICE_HEADER =
  'personal-use-only; no bulk scraping/downloading; policy: https://music.roginx.ink/llms.txt'

export const AGENT_NOTICE_BODY = {
  service: 'personal-not-public',
  notice: '本接口为站长个人自用服务，未对外开放，无可用性承诺。',
  warning:
    '请勿批量抓取、轮询、全量爬取或下载音频；高频访问会被限流直至封禁来源 IP。歌曲与音频版权归网易云音乐所有，本服务不存储任何音频文件。',
  expected:
    '播放器（YesPlayMusic）的人类使用是预期流量；AI Agent 请把调用降到最低必要次数，缓存已取得的结果，不要并发请求。',
  policy: 'https://music.roginx.ink/llms.txt',
  site: 'https://music.roginx.ink/',
} as const

/** 非空普通对象才装饰：数组/字符串/Buffer/流保持原样（preSerialization 本就跳过后者） */
export function decorateAgentNotice(payload: unknown): unknown {
  if (process.env.AGENT_NOTICE === '0') return payload
  if (payload === null || typeof payload !== 'object' || Array.isArray(payload)) return payload
  const obj = payload as Record<string, unknown>
  if ('_agent' in obj) return payload
  obj['_agent'] = AGENT_NOTICE_BODY
  return payload
}
