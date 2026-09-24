// 线上落地页移动端实测
import { chromium } from 'file:///C:/Users/许境钧/.workbuddy/binaries/node/workspace/node_modules/playwright-core/index.mjs'
const browser = await chromium.launch({ executablePath: 'C:/Users/许境钧/.agent-browser/browsers/chrome-154.0.8037.57/chrome.exe' })
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 },
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  isMobile: true,
  hasTouch: true,
})
const page = await ctx.newPage()
await page.goto('https://xiaozhangben-ledger-88116.app.workbuddy.host/', { waitUntil: 'domcontentloaded', timeout: 30000 })
await page.waitForTimeout(3500)
console.log('URL:', page.url())
console.log('主标题可见:', await page.locator('h1.lt').isVisible().catch(() => false))
console.log('演示手机卡片可见:', await page.locator('.lph').isVisible().catch(() => false))
console.log('底部TabBar(应为false):', await page.locator('.tabbar').isVisible().catch(() => false))
console.log('页面溢出横向滚动:', await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 5))
await page.screenshot({ path: 'D:/xjj/1/xiaozhangben-web/qa-screenshots/46-online-landing-mobile.png' })
await page.evaluate(() => window.scrollTo(0, 1200))
await page.waitForTimeout(800)
await page.screenshot({ path: 'D:/xjj/1/xiaozhangben-web/qa-screenshots/47-online-landing-mobile-features.png' })
await browser.close()
console.log('done')
