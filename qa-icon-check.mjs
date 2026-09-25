// 渲染介绍页/登录页，验证品牌图标是否已换为新图标
// 用法: node qa-icon-check.mjs [baseUrl]
import { chromium } from 'file:///C:/Users/许境钧/.workbuddy/binaries/node/workspace/node_modules/playwright-core/index.mjs'
import fs from 'fs'

const S = process.argv[2] || 'http://127.0.0.1:3201'
const OUT = 'qa-screenshots'
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true })

const browser = await chromium.launch({
  executablePath: 'C:/Users/许境钧/.agent-browser/browsers/chrome-154.0.8037.57/chrome.exe',
  args: ['--no-sandbox'],
})
const ctx = await browser.newContext({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 2 })
const page = await ctx.newPage()
const bad = []
page.on('response', r => { if (r.status() >= 400) bad.push(r.status() + ' ' + r.url().slice(0, 90)) })

// 1. 静态介绍页
await page.goto(S + '/landing.html', { waitUntil: 'networkidle', timeout: 30000 }).catch(e => console.log('goto err', e.message))
await page.waitForTimeout(1200)
await page.screenshot({ path: `${OUT}/icon-landing-html-top.png`, clip: { x: 0, y: 0, width: 430, height: 200 } })
console.log('[landing.html] URL =', page.url())

// 2. Vue 介绍页（hash 路由）
await page.goto(S + '/#/landing', { waitUntil: 'networkidle', timeout: 30000 }).catch(e => console.log('goto err', e.message))
await page.waitForTimeout(2000)
console.log('[#/landing] 最终 URL =', page.url())
await page.screenshot({ path: `${OUT}/icon-landing-route-top.png`, clip: { x: 0, y: 0, width: 430, height: 200 } })
// 滚到分享卡片区看品牌标
await page.evaluate(() => { const el = document.querySelector('.lshare'); if (el) el.scrollIntoView({ block: 'center' }) })
await page.waitForTimeout(900)
await page.screenshot({ path: `${OUT}/icon-landing-route-share.png` })

// 3. 登录页
await page.goto(S + '/#/login', { waitUntil: 'networkidle', timeout: 30000 }).catch(e => console.log('goto err', e.message))
await page.waitForTimeout(1500)
await page.screenshot({ path: `${OUT}/icon-login-top.png`, clip: { x: 0, y: 0, width: 430, height: 420 } })
console.log('[#/login] URL =', page.url())

console.log('--- 4xx/5xx 资源: ' + (bad.length ? bad.join(' | ') : '无') + ' ---')
await browser.close()
console.log('done')
