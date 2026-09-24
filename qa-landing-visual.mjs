// 新版落地页实拍: 桌面首屏/功能区/步骤/CTA + 移动首屏
import { chromium } from 'file:///C:/Users/许境钧/.workbuddy/binaries/node/workspace/node_modules/playwright-core/index.mjs'
const browser = await chromium.launch({ executablePath: 'C:/Users/许境钧/.agent-browser/browsers/chrome-154.0.8037.57/chrome.exe' })
const SS = 'D:/xjj/1/xiaozhangben-web/qa-screenshots'

// 桌面端
let ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
let page = await ctx.newPage()
page.on('pageerror', e => console.log('PAGEERROR:', e.message.slice(0, 200)))
await page.goto('http://localhost:5178/', { waitUntil: 'domcontentloaded', timeout: 20000 })
await page.waitForTimeout(3000)
console.log('URL:', page.url())
await page.screenshot({ path: `${SS}/50-new-landing-hero.png` })
// 滚动触发 reveal 后逐区截图
const shots = [
  ['#features', '51-new-landing-features.png'],
  ['.lss', '52-new-landing-steps.png'],
  ['#download', '53-new-landing-cta.png'],
]
for (const [sel, file] of shots) {
  await page.evaluate(s => document.querySelector(s)?.scrollIntoView({ behavior: 'instant', block: 'start' }), sel)
  await page.waitForTimeout(1300)
  await page.screenshot({ path: `${SS}/${file}` })
}
// reveal 动效是否生效（首屏元素应有 revealed 类）
console.log('首屏reveal生效:', await page.evaluate(() => document.querySelector('.lt')?.classList.contains('revealed')))
console.log('功能卡reveal生效:', await page.evaluate(() => document.querySelectorAll('.lfc.revealed').length), '/6')
// 交互: 按钮悬停 + 锚点
await page.evaluate(() => window.scrollTo(0, 0))
await page.waitForTimeout(600)
await page.click('a.lb2:has-text("了解更多")')
await page.waitForTimeout(1200)
console.log('了解更多滚动:', await page.evaluate(() => window.scrollY) > 100 ? 'OK' : 'FAIL')
await ctx.close()

// 移动端
ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
page = await ctx.newPage()
await page.goto('http://localhost:5178/', { waitUntil: 'domcontentloaded', timeout: 20000 })
await page.waitForTimeout(3000)
await page.screenshot({ path: `${SS}/54-new-landing-mobile.png` })
console.log('移动端横向溢出:', await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 5))
console.log('移动端TabBar(应false):', await page.locator('.tabbar').isVisible().catch(() => false))
await ctx.close()
await browser.close()
console.log('done')
