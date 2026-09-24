// 线上新版落地页终验
import { chromium } from 'file:///C:/Users/许境钧/.workbuddy/binaries/node/workspace/node_modules/playwright-core/index.mjs'
const browser = await chromium.launch({ executablePath: 'C:/Users/许境钧/.agent-browser/browsers/chrome-154.0.8037.57/chrome.exe' })
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage()
const errors = []
page.on('pageerror', e => errors.push(e.message.slice(0, 150)))
await page.goto('https://xiaozhangben-ledger-88116.app.workbuddy.host/', { waitUntil: 'domcontentloaded', timeout: 30000 })
await page.waitForTimeout(4000)
console.log('URL:', page.url())
console.log('reveal生效:', await page.evaluate(() => document.querySelector('.lt')?.classList.contains('revealed')))
console.log('金额颜色:', await page.evaluate(() => getComputedStyle(document.querySelector('.lpht > div:last-child') || document.body).color))
await page.screenshot({ path: 'D:/xjj/1/xiaozhangben-web/qa-screenshots/56-online-new-landing.png' })
await page.click('a.lb2:has-text("了解更多")')
await page.waitForTimeout(1200)
console.log('锚点滚动:', await page.evaluate(() => window.scrollY) > 100 ? 'OK' : 'FAIL')
console.log('页面错误:', errors.length ? errors.join(';') : '无')
await browser.close()
console.log('done')
