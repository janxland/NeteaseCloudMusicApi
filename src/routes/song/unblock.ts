import type { ModuleQuery, ModuleRequest } from '../../types'

// 只是路由清单占位：src/core/routes.ts 由文件名推导出 /song/unblock 并注册，
// 而请求在 src/app.ts 的 serveUnblock 就被短路掉了，这个 handler 永远不会被调用，
// 所以这里刻意不 require 解灰库（启动探测 scripts/bench-modules.cjs 依赖它保持缺席）。
export default (_query: ModuleQuery, _request: ModuleRequest) => {}
