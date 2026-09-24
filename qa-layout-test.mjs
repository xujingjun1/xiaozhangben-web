// 修复后验证: 落地页布局+交互、登录页、已登录侧边栏、移动端 TabBar
import { chromium } from 'file:///C:/Users/许境钧/.workbuddy/binaries/node/workspace/node_modules/playwright-core/index.mjs'
const CHROME = 'C:/Users/许境钧/.agent-browser/browsers/chrome-154.0.8037.57/chrome.exe'
const BASE = 'http://localhost:5177'
const SS = 'D:/xjj/1/xiaozhangben-web/qa-screenshots'
let pass = 0, fail = 0
const t = (name, ok) => { ok ? pass++ : fail++; console.log(ok ? '✅' : '❌', name) }

const browser = await chromium.launch({ executablePath: CHROME })

// ===== 桌面端 未登录 =====
let ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
let page = await ctx.newPage()
const errors = []
page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message.slice(0, 200)))
page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text().slice(0, 200)) })

await page.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 20000 })
await page.waitForTimeout(2500)
t('未登录重定向到落地页', page.url().includes('/landing'))
t('落地页不显示侧边栏', !(await page.locator('.desktop-sidebar').isVisible().catch(() => false)))
const ml = await page.evaluate(() => getComputedStyle(document.querySelector('.app-main')).marginLeft)
t('主内容无 220px 偏移 (margin-left=' + ml + ')', ml === '0px')
await page.screenshot({ path: `${SS}/41-fixed-landing-desktop.png` })

// 了解更多 → 锚点滚动
const y0 = await page.evaluate(() => window.scrollY)
await page.click('a.lb2:has-text("了解更多")')
await page.waitForTimeout(1200)
const y1 = await page.evaluate(() => window.scrollY)
t(`了解更多触发滚动 (${y0}→${y1})`, y1 > 100)
t('滚动后仍在落地页(未触发路由跳转)', page.url().includes('/landing'))

// 打开网页版 → 登录页
await page.evaluate(() => window.scrollTo(0, 0))
await page.click('a.lb1:has-text("打开网页版")')
await page.waitForTimeout(1500)
t('打开网页版进入登录页', page.url().includes('/login'))
t('登录页不显示侧边栏', !(await page.locator('.desktop-sidebar').isVisible().catch(() => false)))
await page.screenshot({ path: `${SS}/42-fixed-login-desktop.png` })

// 登录页 → 模拟登录态 → 首页侧边栏恢复
await page.evaluate(() => localStorage.setItem('user_id', 'qa-layout-check'))
await page.goto(BASE + '/#/', { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(2000)
t('已登录首页显示侧边栏', await page.locator('.desktop-sidebar').isVisible().catch(() => false))
await page.screenshot({ path: `${SS}/43-fixed-home-desktop.png` })

// 侧边栏导航真实跳转（不再弹回）
await page.click('.sidebar-nav-item:has-text("报表")')
await page.waitForTimeout(1200)
t('侧边栏可正常跳转报表页', page.url().includes('/report'))
await ctx.close()

// ===== 移动端 未登录 =====
ctx = await browser.newContext({ viewport: { width: 390, height: 844 } })
page = await ctx.newPage()
await page.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 20000 })
await page.waitForTimeout(2500)
t('移动端落地页不显示底部TabBar', !(await page.locator('.tabbar, nav.tab-bar, .tab-bar').first().isVisible().catch(() => false)))
await page.screenshot({ path: `${SS}/44-fixed-landing-mobile.png` })
await ctx.close()

console.log('\n=== 控制台/页面错误 ===')
console.log(errors.length ? errors.join('\n') : '无')
console.log(`\n结果: ${pass} 通过, ${fail} 失败`)
await browser.close()
process.exit(fail ? 1 : 0)
