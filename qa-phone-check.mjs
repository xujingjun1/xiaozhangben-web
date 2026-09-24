import { chromium } from 'file:///C:/Users/许境钧/.workbuddy/binaries/node/workspace/node_modules/playwright-core/index.mjs'
const browser = await chromium.launch({ executablePath: 'C:/Users/许境钧/.agent-browser/browsers/chrome-154.0.8037.57/chrome.exe' })
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage()
await page.goto('http://localhost:5178/', { waitUntil: 'domcontentloaded', timeout: 20000 })
await page.waitForTimeout(3000)
console.log('金额颜色:', await page.evaluate(() => getComputedStyle(document.querySelector('.lpht > div:last-child')).color))
await page.screenshot({ path: 'D:/xjj/1/xiaozhangben-web/qa-screenshots/55-phone-card-fixed.png', clip: { x: 620, y: 120, width: 480, height: 700 } })
await browser.close()
console.log('done')
