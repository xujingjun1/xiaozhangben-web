// 复现「落地页卡死+布局错乱」
import { chromium } from 'file:///C:/Users/许境钧/.workbuddy/binaries/node/workspace/node_modules/playwright-core/index.mjs'
import fs from 'fs'

const CHROME = 'C:/Users/许境钧/.agent-browser/browsers/chrome-154.0.8037.57/chrome.exe'
const BASE = 'http://localhost:5177'
const SS = 'D:/xjj/1/xiaozhangben-web/qa-screenshots'
fs.mkdirSync(SS, { recursive: true })

const browser = await chromium.launch({ executablePath: CHROME })
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const page = await ctx.newPage()
const errors = []
page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message))
page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()) })

// 未登录全新访问 → 应被守卫送到落地页
await page.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 30000 })
await page.waitForTimeout(2500)
console.log('当前URL:', page.url())

// 布局检查
const sidebarVisible = await page.locator('.desktop-sidebar').isVisible().catch(() => false)
const mainMargin = await page.evaluate(() => {
  const m = document.querySelector('.app-main')
  return m ? getComputedStyle(m).marginLeft : 'N/A'
})
console.log('侧边栏在落地页可见:', sidebarVisible, '| 主内容 margin-left:', mainMargin)
await page.screenshot({ path: `${SS}/40-repro-landing-desktop.png` })

// 交互检查1: 点击「打开网页版」
const urlBefore = page.url()
await page.click('a.lb1:has-text("打开网页版")')
await page.waitForTimeout(1200)
console.log('点击「打开网页版」后 URL:', page.url(), '| 与点击前相同:', page.url() === urlBefore)

// 交互检查2: 点击侧边栏「报表」
if (sidebarVisible) {
  await page.click('.sidebar-nav-item:has-text("报表")')
  await page.waitForTimeout(800)
  console.log('点击侧边栏「报表」后 URL:', page.url())
}

// 交互检查3: 点击「了解更多」锚点滚动
const scrollBefore = await page.evaluate(() => (document.querySelector('.app-main') || document.documentElement).scrollTop)
await page.click('a.lb2:has-text("了解更多")')
await page.waitForTimeout(1000)
const scrollAfter = await page.evaluate(() => (document.querySelector('.app-main') || document.documentElement).scrollTop)
console.log('点击「了解更多」滚动位置:', scrollBefore, '→', scrollAfter, '| 有响应:', scrollAfter !== scrollBefore)

// 交互检查4: 落地页自带 window 滚动监听是否生效（scrolled 类）
await page.evaluate(() => { const m = document.querySelector('.app-main'); if (m) m.scrollTop = 500; else window.scrollTo(0, 500) })
await page.waitForTimeout(500)
const navScrolled = await page.evaluate(() => document.querySelector('.ln')?.classList.contains('scrolled'))
console.log('滚动后导航栏 scrolled 类生效:', navScrolled)

console.log('\n=== 控制台/页面错误 ===')
console.log(errors.length ? errors.join('\n') : '无')
await browser.close()
