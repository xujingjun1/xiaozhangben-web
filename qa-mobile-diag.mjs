// 移动端落地页未生效诊断
import { chromium } from 'file:///C:/Users/许境钧/.workbuddy/binaries/node/workspace/node_modules/playwright-core/index.mjs'
const browser = await chromium.launch({ executablePath: 'C:/Users/许境钧/.agent-browser/browsers/chrome-154.0.8037.57/chrome.exe' })
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 },
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  isMobile: true,
  hasTouch: true,
})
const page = await ctx.newPage()
page.on('console', m => console.log('CON[' + m.type() + ']', m.text().slice(0, 150)))
page.on('pageerror', e => console.log('PAGEERROR:', e.message.slice(0, 200)))
page.on('framenavigated', f => { if (f === page.mainFrame()) console.log('NAV →', f.url()) })

await page.goto('https://xiaozhangben-ledger-88116.app.workbuddy.host/', { waitUntil: 'domcontentloaded', timeout: 30000 })
for (let i = 0; i < 5; i++) {
  await page.waitForTimeout(1000)
  console.log(`t=${i + 1}s url=${page.url()}`)
}
console.log('localStorage:', await page.evaluate(() => JSON.stringify(Object.keys(localStorage))))
console.log('user_id:', await page.evaluate(() => localStorage.getItem('user_id')))
console.log('body首200字:', await page.evaluate(() => document.body.innerText.slice(0, 200).replace(/\n/g, ' | ')))
console.log('SW注册数:', await page.evaluate(() => navigator.serviceWorker?.getRegistrations().then(r => r.length)))
await browser.close()
