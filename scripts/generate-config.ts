// 重新签发部署级游客令牌，写回 src/core/config.json（原 generateConfig.js）
// 运行：npx tsx scripts/generate-config.ts
import fs from 'node:fs'
import path from 'node:path'

import { cookieToJson } from '../src/core/cookies'
import config from '../src/core/config.json'
import registerAnonimous from '../src/routes/register/anonimous'
import { upstream } from '../src/core/upstream'

const CONFIG_PATH = path.resolve(__dirname, '..', 'src', 'core', 'config.json')

const generateConfig = async () => {
  try {
    const res: any = await (registerAnonimous as any)({ cookie: {} }, upstream)
    const cookie = res.body?.cookie
    if (!cookie) {
      console.log('未取到游客 cookie，保持原配置')
      return
    }
    const cookieObj = cookieToJson(cookie)
    if (!cookieObj.MUSIC_A) {
      console.log('cookie 中没有 MUSIC_A，保持原配置')
      return
    }
    const next = { ...(config as Record<string, any>), anonymous_token: cookieObj.MUSIC_A }
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(next, null, 2), 'utf-8')
    console.log('已更新 anonymous_token ->', CONFIG_PATH)
  } catch (error) {
    console.log(error)
  }
}

generateConfig()
