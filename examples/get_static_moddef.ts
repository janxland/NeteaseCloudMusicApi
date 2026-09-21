// 导出当前路由定义（identifier / route / module）快照，供二开方做静态映射
import fs from 'node:fs/promises'
import path from 'node:path'

import { loadRoutes } from '../src/core/routes'

const exportFile = path.join(__dirname, 'moddef.json')

const main = async () => {
  const def = loadRoutes().map((r) => ({
    identifier: r.identifier,
    route: r.route,
    // 原 server.js 在 doRequire=false 时输出的是文件名，这里保持同样的可序列化形态
    module: r.identifier,
  }))

  await fs.writeFile(exportFile, JSON.stringify(def, null, 4))
  console.log(`👍 Get your own definition at: ${exportFile}`)
}

main()
