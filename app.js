#!/usr/bin/env node
if (process.platform === 'win32') {
  try {
    require('child_process').execSync('chcp 65001 >NUL', { stdio: 'ignore' })
  } catch (_) {}
}

async function start() {
  process.on('uncaughtException', function (err) {
    console.error('[app] uncaughtException', err)
  })
  process.on('unhandledRejection', function (err) {
    console.error('[app] unhandledRejection', err)
  })
  require('./server').serveNcmApi({
    checkVersion: process.env.CHECK_VERSION === '1',
  })
}
start()
