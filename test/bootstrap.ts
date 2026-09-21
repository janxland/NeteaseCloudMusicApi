// mocha 引导：起一个真实的 Fastify 实例（随机端口），把 host 挂到 global 供各用例使用。
// 替代原 server.test.js（Express 版）—— 现在测的是 TS + Fastify 装配本身。
import type { FastifyInstance } from 'fastify'

import buildApp from '../src/app'

declare const global: typeof globalThis & { host?: string; __app?: FastifyInstance }

let app: FastifyInstance

export const mochaHooks = {
  async beforeAll() {
    app = await buildApp()
    await app.listen({ port: 0, host: '127.0.0.1' })
    const addr = app.server.address()
    const port = addr && typeof addr === 'object' ? addr.port : 0
    if (!port) throw new Error('failed to set up host')
    global.host = `http://127.0.0.1:${port}`
    global.__app = app
  },
  async afterAll() {
    if (app) await app.close()
  },
}
