// 编程式 API 入口（原 main.js）。
//
// 与旧版一致：`require('netease-cloud-music-api').album({ id: 32311 })`
// 直接拿到 module 结果；另暴露 serveNcmApi / getModulesDefinitions 供复用装配。
//
// 用 export = 而非 export default：让 CJS 侧 `require(...).album` 与旧版完全同形。
import buildApp from './app'
import { cookieToJson } from './core/cookies'
import { loadRoutes } from './core/routes'
import { upstream } from './core/upstream'
import type { ModuleQuery } from './types'

type ApiFn = (data?: Record<string, any>) => Promise<any>

/** 每个 module 的调用器：字符串 cookie 自动解析成 jar（与 main.js 同语义） */
const bind = (handler: (q: ModuleQuery, r: any) => any): ApiFn => (data = {}) => {
  if (typeof data.cookie === 'string') data.cookie = cookieToJson(data.cookie)
  return handler({ ...data, cookie: data.cookie || {} }, upstream)
}

const routes = loadRoutes()

const api: Record<string, any> = {}
for (const def of routes) {
  // 同样惰性：只有真正调用 api.album({...}) 时才加载对应模块，
  // 避免 `require('netease-cloud-music-api')` 一个动作就把 281 个模块全部拉起来
  api[def.identifier] = (data?: Record<string, any>) => bind(def.resolveHandler())(data)
}
// 兼容旧 main.js：serveNcmApi / getModulesDefinitions 与 module 函数同层导出
api.serveNcmApi = buildApp
api.getModulesDefinitions = () => routes

export = api
