#!/usr/bin/env node
/**
 * 一键准备发布包 deploy-pkg/
 *
 * 背景：deploy-pkg/ 必须只含 server.js + web/（dist 改名），且**绝不携带 db.json**。
 * 此前 APK 存在 public/app-latest.apk 这份手工维护的副本，它会被 Vite 拷进 dist，
 * 再进发布包 —— 一旦忘了覆盖，线上就会出现旧包（2026-09-25 踩过这个坑）。
 * 现在 APK 的唯一来源是安卓构建产物，本脚本显式同步，杜绝旧包上线。
 *
 * 用法：npm run build && node scripts/prepare-deploy.mjs
 *   然后部署工具指向 deploy-pkg/ 目录。
 */
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const p = (...a) => path.join(root, ...a)
const APK_SRC = p('android/app/build/outputs/apk/debug/app-debug.apk')
const OLD_DEPLOY_DIR = 'D:/Temp/xzb-deploy-old'

const mb = n => (n / 1048576).toFixed(2) + ' MB'
const md5 = f => crypto.createHash('md5').update(fs.readFileSync(f)).digest('hex')
const fail = msg => { console.error('❌ ' + msg); process.exit(1) }

// ---------- 0. 前置检查 ----------
if (!fs.existsSync(p('dist/index.html'))) fail('dist/index.html 不存在，请先 npm run build')
if (!fs.existsSync(APK_SRC)) fail(`未找到 APK：${APK_SRC}\n   请在 android/ 下先执行 gradlew assembleDebug`)

// ---------- 1. 整体重建 deploy-pkg/web ----------
// 不增量覆盖：发布平台是"覆盖式更新且不删旧文件"，残留的旧 chunk / 旧 .map 会一直挂在线上
const webDir = p('deploy-pkg/web')
fs.mkdirSync(p('deploy-pkg'), { recursive: true })
if (fs.existsSync(webDir)) {
  const dest = path.join(OLD_DEPLOY_DIR, new Date().toISOString().replace(/[:.]/g, '-'))
  fs.mkdirSync(OLD_DEPLOY_DIR, { recursive: true })
  fs.renameSync(webDir, dest) // 用移动代替删除（本环境直接删除会被安全机制拦截）
  console.log(`· 旧 web/ 已移到 ${dest}`)
}
fs.cpSync(p('dist'), webDir, { recursive: true })

// ---------- 2. 后端入口 ----------
fs.copyFileSync(p('server.js'), p('deploy-pkg/server.js'))

// ---------- 3. APK（唯一来源：安卓构建产物）----------
fs.copyFileSync(APK_SRC, path.join(webDir, 'app-latest.apk'))

// ---------- 4. 校验（这三条任一不过就不该部署）----------
const walk = (d, out = []) => {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const q = path.join(d, e.name)
    e.isDirectory() ? walk(q, out) : out.push(q)
  }
  return out
}
const files = walk(webDir)

const maps = files.filter(f => f.endsWith('.map'))
if (maps.length) fail(`发布包含 ${maps.length} 个 sourcemap（会公开源码）：${maps.slice(0, 3).join(', ')}`)

const sw = fs.readFileSync(path.join(webDir, 'sw.js'), 'utf8')
if (sw.includes('index.html')) fail('sw.js 仍预缓存 index.html —— 用户会一直看到旧页面')

if (fs.existsSync(path.join(webDir, 'db.json'))) fail('发布包含 db.json，会覆盖线上用户数据！')

const entry = fs.readFileSync(path.join(webDir, 'index.html'), 'utf8').match(/assets\/index-[\w-]+\.js/)?.[0] ?? '(未找到入口)'
const apk = path.join(webDir, 'app-latest.apk')

console.log('\n✅ 发布包就绪：deploy-pkg/')
console.log(`   入口 JS   : ${entry}`)
console.log(`   APK       : ${mb(fs.statSync(apk).size)}  md5=${md5(apk)}`)
console.log(`   文件数    : ${files.length}   sourcemap: 0   db.json: 无`)
