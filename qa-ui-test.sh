#!/bin/bash
# 小账本 UI 自动化测试 - 单次运行完整流程
export PATH="/c/Users/许境钧/.workbuddy/binaries/node/versions/22.22.2-3:/c/Users/许境钧/.workbuddy/binaries/PortableGit/versions/1.2.0/usr/bin:$PATH"
AB="C:/Users/许境钧/.workbuddy/binaries/node/workspace/node_modules/agent-browser/bin/agent-browser.js"
SS="D:/xjj/1/xiaozhangben-web/qa-screenshots"
LOG="/tmp/qa-ui.log"
mkdir -p "$SS"
: > "$LOG"

# 清理残留 daemon 状态
rm -f "C:/Users/许境钧/.agent-browser/default.pid" "C:/Users/许境钧/.agent-browser/default.port" "C:/Users/许境钧/.agent-browser/default.stream"

log() { echo "[$(date +%H:%M:%S)] $*" | tee -a "$LOG"; }

ab() { timeout 90 node "$AB" "$@" 2>&1; }

log "=== 启动浏览器并打开登录页 ==="
ab open http://localhost:5173/#/login | head -3 | tee -a "$LOG"
sleep 2

# 注入控制台错误收集器
ab eval "window.__errs=[]; window.addEventListener('error',e=>window.__errs.push('ERROR: '+e.message)); window.addEventListener('unhandledrejection',e=>window.__errs.push('REJECT: '+(e.reason&&e.reason.message||e.reason))); 'collector-installed'" | tee -a "$LOG"

log "=== 登录页快照 ==="
ab snapshot > /tmp/snap-login-full.txt
grep -E "textbox|button.*ref=|heading|link" /tmp/snap-login-full.txt | head -30 | tee -a "$LOG"
ab screenshot "$SS/02-login.png" | head -1 | tee -a "$LOG"

# 提取用户名/密码输入框 ref
USER_REF=$(grep -oE 'textbox "[^"]*用户名[^"]*" \[ref=[a-z0-9]+\]' /tmp/snap-login-full.txt | grep -oE 'ref=[a-z0-9]+' | head -1 | cut -d= -f2)
PASS_REF=$(grep -oE 'textbox "[^"]*密码[^"]*" \[ref=[a-z0-9]+\]' /tmp/snap-login-full.txt | grep -oE 'ref=[a-z0-9]+' | head -1 | cut -d= -f2)
if [ -z "$USER_REF" ]; then USER_REF=$(grep -B1 '用户名\|昵称' /tmp/snap-login-full.txt | grep -oE 'ref=[a-z0-9]+' | head -1 | cut -d= -f2); fi
if [ -z "$PASS_REF" ]; then PASS_REF=$(grep -A1 '密码' /tmp/snap-login-full.txt | grep -oE 'ref=[a-z0-9]+' | head -1 | cut -d= -f2); fi
log "输入框 refs: user=$USER_REF pass=$PASS_REF"

if [ -n "$USER_REF" ] && [ -n "$PASS_REF" ]; then
  log "=== UI 登录流程 (qa_fresh_check) ==="
  ab type "$USER_REF" "qa_fresh_check" | head -1 | tee -a "$LOG"
  ab type "$PASS_REF" "fresh123456" | head -1 | tee -a "$LOG"
  # 找登录按钮
  LOGIN_REF=$(grep -oE 'button "[^"]*登 录[^"]*"[^]]*\[ref=[a-z0-9]+\]|button "登录"[^]]*\[ref=[a-z0-9]+\]' /tmp/snap-login-full.txt | grep -oE 'ref=[a-z0-9]+' | head -1 | cut -d= -f2)
  if [ -z "$LOGIN_REF" ]; then LOGIN_REF=$(grep -B2 -A2 '登 录\|"登录"' /tmp/snap-login-full.txt | grep -oE 'ref=[a-z0-9]+' | head -1 | cut -d= -f2); fi
  log "登录按钮 ref=$LOGIN_REF"
  if [ -n "$LOGIN_REF" ]; then
    ab click "$LOGIN_REF" | head -1 | tee -a "$LOG"
    sleep 3
    ab eval "location.hash" | tee -a "$LOG"
  fi
else
  log "!! 未找到登录输入框, 快照片段:"
  head -40 /tmp/snap-login-full.txt | tee -a "$LOG"
fi

log "=== 登录后首页 ==="
ab snapshot > /tmp/snap-home.txt
grep -E "heading|本月|支出|StaticText \"¥|ref=" /tmp/snap-home.txt | head -20 | tee -a "$LOG"
ab screenshot "$SS/03-home.png" | head -1 | tee -a "$LOG"

log "=== 逐页访问测试 ==="
for page in add report budget import settings rating privacy help download; do
  log "--- /$page ---"
  ab open "http://localhost:5173/#/$page" | head -2 | tee -a "$LOG"
  sleep 3
  ab snapshot > "/tmp/snap-$page.txt"
  LINES=$(wc -l < "/tmp/snap-$page.txt")
  log "/$page 快照行数: $LINES"
  head -8 "/tmp/snap-$page.txt" | tee -a "$LOG"
  ab screenshot "$SS/04-$page.png" | head -1 | tee -a "$LOG"
done

log "=== 汇总控制台错误 ==="
ab eval "JSON.stringify(window.__errs||[])" | tee -a "$LOG"

log "=== 关闭浏览器 ==="
ab close | head -1 | tee -a "$LOG"
log "=== UI 测试脚本执行完毕 ==="
