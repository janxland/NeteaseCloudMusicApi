// 核心类型：module/*.ts 统一签名（由 scripts/convert-modules.cjs 注入）
export type CookieJar = Record<string, string>

export interface ModuleQuery extends Record<string, any> {
  /**
   * 登录态：字符串（原始 Cookie）或已解析的 jar。
   * 阶段 1 保留 any：module 里普遍直接写 query.cookie.os/appver，
   * 收窄成联合类型会一次性炸出上百处报错，等 module 全部收敛后再收紧。
   */
  cookie?: any
  proxy?: string
  realIP?: string
  ua?: string
  timestamp?: string | number
  noCookie?: string | number | boolean
  server?: string
}

export type CryptoKind = 'weapi' | 'eapi' | 'linuxapi' | 'api'

export interface UpstreamOptions {
  crypto?: CryptoKind
  cookie?: CookieJar | string
  ua?: string | false
  realIP?: string
  ip?: string
  proxy?: string
  url?: string
}

export interface ModuleResult {
  status: number
  body: any
  cookie: string[]
}

export type ModuleRequest = (
  method: string,
  url: string,
  data?: Record<string, any>,
  options?: UpstreamOptions,
) => Promise<ModuleResult>

export type ModuleHandler = (
  query: ModuleQuery,
  request: ModuleRequest,
) => Promise<ModuleResult> | ModuleResult

/** 路由定义：identifier 为源文件名，route 为对外路径 */
export interface RouteDefinition {
  identifier: string
  route: string
  /** 路由模块文件的绝对路径（tsx 直跑为 .ts，构建产物为 .js） */
  file: string
  /**
   * 惰性取得 handler：首次调用才 require 模块文件，之后返回缓存；
   * 加载失败时抛出（并缓存该失败），不返回兜底实现。
   */
  resolveHandler: () => ModuleHandler
}
