#!/usr/bin/env node
/**
 * Multi-process production launcher for NeteaseCloudMusicApi.
 *
 * Usage:
 *   node cluster.js                 # workers = CPU count
 *   WORKERS=4 node cluster.js       # explicit worker count
 *   PORT=3000 HOST=0.0.0.0 node cluster.js
 *
 * Why this exists:
 *   `node app.js` runs a single Node process. Express + apicache + the
 *   downstream Netease HTTPS calls are CPU-bound enough that one core is
 *   often the bottleneck (especially with many concurrent /song/url +
 *   /playlist/detail fan-out from the front-end). Running N workers
 *   behind the same listening socket lets the kernel load-balance, and
 *   keeps a hung worker from taking the whole API down.
 */
'use strict'

// Windows PowerShell / cmd 默认是 GBK (936)，Node 默认输出 UTF-8 字节。
// 主进程启动时把当前控制台切到 UTF-8 (chcp 65001)，避免日志中的中文 / unblock
// 模块返回的歌曲名变成乱码（如「鎯充綘灏卞啓淇 」）。
if (process.platform === 'win32') {
  try {
    require('child_process').execSync('chcp 65001 >NUL', { stdio: 'ignore' })
  } catch (_) {
    /* noop */
  }
}

const cluster = require('cluster')
const os = require('os')

const DEFAULT_WORKERS = Math.max(1, Math.min(os.cpus().length, 4))
const WORKER_COUNT = Math.max(
  1,
  parseInt(process.env.WORKERS || '', 10) || DEFAULT_WORKERS,
)

// 关闭 checkVersion (会 spawn `npm info ...` 子进程并请求公网，冷启动慢且无意义)。
// 调用方仍可通过环境变量强制打开。
const CHECK_VERSION = process.env.CHECK_VERSION === '1'

if (cluster.isPrimary || cluster.isMaster) {
  const startedAt = Date.now()
  console.log(
    `[cluster] primary pid=${process.pid} spawning ${WORKER_COUNT} worker(s)`,
  )

  for (let i = 0; i < WORKER_COUNT; i++) {
    cluster.fork()
  }

  let shuttingDown = false
  cluster.on('exit', (worker, code, signal) => {
    if (shuttingDown) return
    console.warn(
      `[cluster] worker pid=${worker.process.pid} exited (code=${code} signal=${signal}); respawning`,
    )
    cluster.fork()
  })

  const shutdown = (signal) => {
    if (shuttingDown) return
    shuttingDown = true
    console.log(`[cluster] received ${signal}, shutting down workers`)
    for (const id in cluster.workers) {
      try {
        cluster.workers[id].process.kill(signal)
      } catch (_) {}
    }
    setTimeout(() => process.exit(0), 5000).unref()
  }
  process.on('SIGINT', () => shutdown('SIGINT'))
  process.on('SIGTERM', () => shutdown('SIGTERM'))

  let listening = 0
  cluster.on('listening', () => {
    listening += 1
    if (listening === WORKER_COUNT) {
      console.log(
        `[cluster] all ${WORKER_COUNT} workers ready in ${Date.now() - startedAt}ms`,
      )
    }
  })
} else {
  process.on('uncaughtException', (err) => {
    console.error(`[worker ${process.pid}] uncaughtException`, err)
  })
  process.on('unhandledRejection', (err) => {
    console.error(`[worker ${process.pid}] unhandledRejection`, err)
  })

  require('./server').serveNcmApi({ checkVersion: CHECK_VERSION })
}
