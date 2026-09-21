// 版本号：src/core 与 dist/core 下 `__dirname/../../package.json` 都指向仓库根，
// 用运行时 require 而非静态 import，避免构建后相对路径跨层失效。
import path from 'node:path'

export const VERSION: string = (() => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require(path.join(__dirname, '..', '..', 'package.json')).version as string
  } catch {
    return process.env.npm_package_version || '0.0.0'
  }
})()

export default VERSION
