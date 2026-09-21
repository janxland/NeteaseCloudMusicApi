#!/usr/bin/env bash
# 新旧架构性能对照：一条命令内自包含「启停服务 → 多轮采集 → 压测 → 合并报告」。
# 宿主会回收命令结束后残留的后台进程，所以启停必须与采集同生命周期。
#
# 用法：
#   bash scripts/bench-all.sh              # 默认 3 轮，P0+P1
#   ROUNDS=1 TIERS=P0 LIMIT=20 bash scripts/bench-all.sh   # 小规模验证
set -uo pipefail

ROOT=/Users/Admin1/Desktop/project/janxland/NeteaseCloudMusicApi
LEGACY_DIR=/tmp/ncm-legacy
OLD_PORT=${OLD_PORT:-3101}
NEW_PORT=${NEW_PORT:-3102}
ROUNDS=${ROUNDS:-3}
TIERS=${TIERS:-P0,P1}
WARM=${WARM:-2}
LIMIT=${LIMIT:-}
NODE_BIN=$(command -v node)

cd "$ROOT"
mkdir -p docs/perf-raw

cleanup() {
  [ -f /tmp/ncm-legacy.pid ] && kill "$(cat /tmp/ncm-legacy.pid)" 2>/dev/null
  [ -f /tmp/ncm-dist.pid ] && kill "$(cat /tmp/ncm-dist.pid)" 2>/dev/null
  pkill -f "node app.js" 2>/dev/null
  pkill -f "node dist/main.js" 2>/dev/null
  return 0
}
trap cleanup EXIT

start_services() {
  cleanup
  sleep 0.5
  ( cd "$LEGACY_DIR" && PORT=$OLD_PORT "$NODE_BIN" app.js > /tmp/ncm-legacy.log 2>&1 & echo $! > /tmp/ncm-legacy.pid )
  ( cd "$ROOT" && PORT=$NEW_PORT "$NODE_BIN" dist/main.js > /tmp/ncm-dist.log 2>&1 & echo $! > /tmp/ncm-dist.pid )
}

wait_ready() {
  local port=$1 name=$2 tries=0
  until [ "$(curl -s -o /dev/null --noproxy '*' -w '%{http_code}' "http://127.0.0.1:$port/search?keywords=ping&limit=1" 2>/dev/null)" != "000" ]; do
    tries=$((tries + 1))
    [ "$tries" -gt 60 ] && { echo "[bench-all] $name(:$port) 启动超时"; tail -5 "/tmp/ncm-$name.log" 2>/dev/null; return 1; }
    sleep 0.5
  done
  echo "[bench-all] $name(:$port) 就绪"
}

echo "=== 启动两个架构实例 ==="
T0=$(date +%s)
start_services
wait_ready "$OLD_PORT" legacy || exit 1
T_OLD=$(date +%s)
echo "[bench-all] 旧版(Express) 冷启动 $(($T_OLD - T0))s"
wait_ready "$NEW_PORT" dist || exit 1
echo "[bench-all] 新版(Fastify/dist) 冷启动 $(($(date +%s) - $T_OLD))s"

LIMIT_ARG=""
[ -n "$LIMIT" ] && LIMIT_ARG="--limit $LIMIT"

for r in $(seq 1 "$ROUNDS"); do
  # 逐轮交替先后，抵消上游随时间的漂移
  if [ $((r % 2)) -eq 1 ]; then ORDER="old,new"; else ORDER="new,old"; fi
  echo ""
  echo "=== 第 $r/$ROUNDS 轮（order=$ORDER）==="
  $NODE_BIN scripts/bench-compare.cjs \
    --old "http://127.0.0.1:$OLD_PORT" --new "http://127.0.0.1:$NEW_PORT" \
    --tier "$TIERS" --warm "$WARM" --order "$ORDER" $LIMIT_ARG \
    --label "r$r" --out "docs/perf-raw/round-$r.json" || exit 1
  if [ "$r" -lt "$ROUNDS" ]; then
    echo "[bench-all] 重启服务以恢复 cold 纯净性"
    start_services
    wait_ready "$OLD_PORT" legacy || exit 1
    wait_ready "$NEW_PORT" dist || exit 1
  fi
done

echo ""
echo "=== 逐接口并发吞吐扫描（缓存命中路径，零上游）==="
$NODE_BIN scripts/bench-compare.cjs \
  --sweep --old "http://127.0.0.1:$OLD_PORT" --new "http://127.0.0.1:$NEW_PORT" \
  --tier "$TIERS" --concurrency "${SWEEP_CONC:-4}" --duration "${SWEEP_DUR:-0.5}" \
  --out docs/perf-raw/sweep.json || true

echo ""
echo "=== 峰值并发吞吐（6 条典型接口）==="
$NODE_BIN scripts/bench-compare.cjs \
  --old "http://127.0.0.1:$OLD_PORT" --new "http://127.0.0.1:$NEW_PORT" \
  --load --concurrency "${CONC:-32}" --duration "${DURATION:-8}" \
  --out docs/perf-raw/load.json || true

echo ""
echo "=== 合并生成报告 ==="
$NODE_BIN scripts/bench-compare.cjs --merge "docs/perf-raw/round-*.json" \
  --out docs/perf-comparison.json --md docs/perf-comparison.md

echo ""
echo "=== 完成 ==="
