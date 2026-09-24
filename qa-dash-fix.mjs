import { chromium } from 'file:///C:/Users/许境钧/.workbuddy/binaries/node/workspace/node_modules/playwright-core/index.mjs'
const SS = 'D:/xjj/1/xiaozhangben-web/qa-screenshots'
const browser = await chromium.launch({ executablePath: 'C:/Users/许境钧/.agent-browser/browsers/chrome-154.0.8037.57/chrome.exe' })
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage()
await page.goto('http://localhost:5179/#/landing', { waitUntil: 'domcontentloaded', timeout: 20000 })
await page.waitForTimeout(2000)
await page.locator('.lshow-alt').scrollIntoViewIfNeeded()
await page.waitForTimeout(1600)
const dashW = await page.locator('.ldash').evaluate(el => el.getBoundingClientRect().width)
const barsVisible = await page.locator('.lbars').evaluate(el => { const r = el.getBoundingClientRect(); return r.width > 100 && r.height > 50 })
console.log('dash 宽度:', dashW, '| 柱状图可见:', barsVisible)
await page.screenshot({ path: `${SS}/69-v2-showcase-report-fixed.png` })
console.log(dashW >= 380 && barsVisible ? '✅ 修复生效' : '❌ 仍有问题')
await browser.close()
