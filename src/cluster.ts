// 多进程启动器（与 cluster.js 同构：worker 数 = min(CPU, 4)，崩溃自动重启）
import cluster from 'cluster'
import os from 'os'

const DEFAULT_WORKERS = Math.max(1, Math.min(os.cpus().length, 4))
const WORKER_COUNT = Math.max(
  1,
  parseInt(process.env.WORKERS || '', 10) || DEFAULT_WORKERS,
)

if (cluster.isPrimary) {
  const startedAt = Date.now()
  console.log(`[cluster] primary pid=${process.pid} spawning ${WORKER_COUNT} worker(s)`)

  for (let i = 0; i < WORKER_COUNT; i++) cluster.fork()

  let shuttingDown = false
  cluster.on('exit', (worker, code, signal) => {
    if (shuttingDown) return
    console.warn(
      `[cluster] worker pid=${worker.process.pid} exited (code=${code} signal=${signal}); respawning`,
    )
    cluster.fork()
  })

  const shutdown = (signal: NodeJS.Signals) => {
    if (shuttingDown) return
    shuttingDown = true
    console.log(`[cluster] received ${signal}, shutting down workers`)
    for (const id in cluster.workers) {
      try {
        cluster.workers[id]?.process.kill(signal)
      } catch (_) {
        /* noop */
      }
    }
    setTimeout(() => process.exit(0), 5000).unref()
  }
  process.on('SIGINT', () => shutdown('SIGINT'))
  process.on('SIGTERM', () => shutdown('SIGTERM'))

  let listening = 0
  cluster.on('listening', () => {
    listening += 1
    if (listening === WORKER_COUNT) {
      console.log(`[cluster] all ${WORKER_COUNT} workers ready in ${Date.now() - startedAt}ms`)
    }
  })
} else {
  process.on('uncaughtException', (err) => {
    console.error(`[worker ${process.pid}] uncaughtException`, err)
  })
  process.on('unhandledRejection', (err) => {
    console.error(`[worker ${process.pid}] unhandledRejection`, err)
  })
  import('./main')
}
