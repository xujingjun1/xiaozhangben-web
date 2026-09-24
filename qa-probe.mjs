import { chromium } from 'file:///C:/Users/许境钧/.workbuddy/binaries/node/workspace/node_modules/playwright-core/index.mjs'
const browser = await chromium.launch({ executablePath: 'C:/Users/许境钧/.agent-browser/browsers/chrome-154.0.8037.57/chrome.exe' })
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage()
page.on('pageerror', e => console.log('PAGEERROR:', e.message.slice(0, 300)))
page.on('console', m => { if (m.type() === 'error') console.log('CONSOLE:', m.text().slice(0, 300)) })

await page.goto('http://localhost:5177/', { waitUntil: 'domcontentloaded', timeout: 20000 })
await page.waitForTimeout(2500)
console.log('A. 落地页URL:', page.url())
console.log('B. 侧边栏可见:', await page.locator('.desktop-sidebar').isVisible())
console.log('C. 主内容margin-left:', await page.evaluate(() => getComputedStyle(document.querySelector('.app-main')).marginLeft))
await page.screenshot({ path: 'D:/xjj/1/xiaozhangben-web/qa-screenshots/40-repro-landing-desktop.png' })

// 点击「打开网页版」
try {
  await page.click('a.lb1:has-text("打开网页版")', { timeout: 5000 })
  await page.waitForTimeout(1200)
  console.log('D. 点击打开网页版后:', page.url())
} catch (e) { console.log('D. 点击失败:', e.message.slice(0, 120)) }

// 点击侧边栏「报表」
try {
  await page.click('.sidebar-nav-item:has-text("报表")', { timeout: 5000 })
  await page.waitForTimeout(800)
  console.log('E. 点击侧边栏报表后:', page.url())
} catch (e) { console.log('E. 点击失败:', e.message.slice(0, 120)) }

// 点击「了解更多」锚点
const s0 = await page.evaluate(() => document.querySelector('.app-main').scrollTop)
await page.click('a.lb2:has-text("了解更多")', { timeout: 5000 }).catch(e => console.log('F. 点击失败:', e.message.slice(0, 120)))
await page.waitForTimeout(1000)
const s1 = await page.evaluate(() => document.querySelector('.app-main').scrollTop)
console.log('F. 了解更多滚动:', s0, '→', s1, s1 !== s0 ? '有响应' : '无响应')

// window 滚动监听（scrolled 类）
await page.evaluate(() => { document.querySelector('.app-main').scrollTop = 600 })
await page.waitForTimeout(400)
console.log('G. 滚动后导航scrolled类:', await page.evaluate(() => document.querySelector('.ln')?.classList.contains('scrolled')))

await browser.close()
console.log('H. done')
