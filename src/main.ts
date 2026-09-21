// TS + Fastify 版入口：与 app.js 的启动行为对齐
import buildApp from './app'

const start = async () => {
  process.on('uncaughtException', (err) => console.error('[app] uncaughtException', err))
  process.on('unhandledRejection', (err) => console.error('[app] unhandledRejection', err))

  const port = Number(process.env.PORT || '3000')
  const host = process.env.HOST || ''

  const app = await buildApp()
  await app.listen({ port, host })

  const server = app.server
  if (server) {
    server.keepAliveTimeout = 60000
    server.headersTimeout = 65000
    server.requestTimeout = 0
  }
  console.log(`[ts] server running @ http://${host ? host : 'localhost'}:${port}`)
}

start().catch((err) => {
  console.error(err)
  process.exit(1)
})
