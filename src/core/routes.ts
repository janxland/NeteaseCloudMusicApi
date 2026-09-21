// 路由发现：只建立「路由路径 → 模块文件」的静态映射，启动阶段不加载任何路由模块。
//
// 为什么能把「注册」与「加载」拆成两件事：
//   1. 路由路径完全由文件名推导（路径即路由），不读模块就能建出完整的路由表；
//   2. Fastify 要求所有路由在 ready() 之前注册完毕 —— ready() 之后追加会抛
//      AVV_ERR_ROOT_PLG_BOOTED，但「注册」只需要路径字符串和 handler 引用。
// 于是启动只做 281 条路径的注册，模块本体推迟到**首次命中该路由**时才 require：
//   · 启动阶段省掉 281 次模块加载（dist 实测约 130 ms，占冷启动 1/5）；
//   · 未被访问的路由永远不占内存（线上真正会被打到的只是子集）。
//
// 不提供「预加载开关」：模块的语法/类型错误在 `npm run build`（tsc）阶段已拦截，
// 运行期初始化错误则在首次请求时以 500 明确暴露 —— 而不是静默降级成 404。
import fs from 'fs'
import path from 'path'
import type { ModuleHandler, RouteDefinition } from '../types'

const ROUTES_DIR = path.join(__dirname, '..', 'routes')

// 历史特例（文件路径已经能推出同名路由，保留仅为显式化）
const SPECIAL_ROUTE: Record<string, string> = {
  'daily_signin.ts': '/daily_signin',
  'fm_trash.ts': '/fm_trash',
  'personal_fm.ts': '/personal_fm',
  'daily_signin.js': '/daily_signin',
  'fm_trash.js': '/fm_trash',
  'personal_fm.js': '/personal_fm',
}

// tsx 直跑时是 .ts，tsc 构建后是 .js（.d.ts 是声明文件，不是路由）
const SOURCE_EXT = /\.(ts|js)$/

const walk = (dir: string): string[] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) return walk(full)
    return SOURCE_EXT.test(entry.name) && !entry.name.endsWith('.d.ts') ? [full] : []
  })

/** 读取模块文件并取出 handler：ESM 默认导出优先，兼容 CJS 直出 */
const loadHandler = (file: string): ModuleHandler => {
  // tsx 下 require 直接吃 .ts；生产构建后指向 dist 下的 .js
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mod = require(file)
  const handler = mod && mod.default ? mod.default : mod
  if (typeof handler !== 'function') {
    throw new TypeError(`[routes] ${path.relative(ROUTES_DIR, file)} 未导出函数 handler`)
  }
  return handler
}

export const loadRoutes = (): RouteDefinition[] => {
  const defs = walk(ROUTES_DIR).map((file) => {
    const rel = path.relative(ROUTES_DIR, file).split(path.sep).join('/')
    const stem = rel.replace(SOURCE_EXT, '')
    const fileName = path.basename(file)
    const route = fileName in SPECIAL_ROUTE ? SPECIAL_ROUTE[fileName] : `/${stem}`

    let resolved: ModuleHandler | undefined
    let failure: Error | undefined
    // 加载失败也要记住：坏模块的顶层代码不应在每个请求上重跑一遍
    const resolveHandler = (): ModuleHandler => {
      if (failure) throw failure
      if (!resolved) {
        try {
          resolved = loadHandler(file)
        } catch (error) {
          failure = error instanceof Error ? error : new Error(String(error))
          throw failure
        }
      }
      return resolved
    }

    return { identifier: stem.split('/').join('_'), route, file, resolveHandler }
  })
  // 与 Express 版保持一致：倒序注册，长路径优先于其前缀
  return defs.sort((a, b) => b.route.localeCompare(a.route))
}
