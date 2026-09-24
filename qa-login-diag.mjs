import { chromium } from 'file:///C:/Users/许境钧/.workbuddy/binaries/node/workspace/node_modules/playwright-core/index.mjs'
const SITE = 'https://xiaozhangben-ledger-88116.app.workbuddy.host'
const browser = await chromium.launch({ executablePath: 'C:/Users/许境钧/.agent-browser/browsers/chrome-154.0.8037.57/chrome.exe' })
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage()

page.on('request', r => { if (r.url().includes('/api/')) console.log('→', r.method(), r.url()) })
page.on('response', async r => { if (r.url().includes('/api/')) console.log('←', r.status(), r.url()) })
page.on('requestfailed', r => { if (r.url().includes('/api/')) console.log('✗ FAILED:', r.url(), r.failure()?.errorText) })
page.on('console', m => console.log('[console]', m.type(), m.text().slice(0, 200)))
page.on('pageerror', e => console.log('[pageerror]', e.message))

await page.goto(SITE + '/#/login', { waitUntil: 'domcontentloaded', timeout: 25000 })
await page.waitForTimeout(2000)
console.log('url:', page.url())
const inputs = await page.locator('input').evaluateAll(els => els.map(e => e.placeholder))
console.log('页面输入框:', JSON.stringify(inputs))
const swCount = await page.evaluate(async () => (await navigator.serviceWorker?.getRegistrations() || []).length)
console.log('ServiceWorker 数量:', swCount)

console.log('--- 填写并点击登录(错误密码) ---')
await page.fill('input[placeholder*="昵称"]', 'qa_share_check')
await page.fill('input[placeholder*="密码"]', 'wrongpass999')
await page.click('button:has-text("登录")')
for (let i = 0; i < 10; i++) {
  await page.waitForTimeout(2000)
  const btnText = await page.locator('button:has-text("登录"), button:disabled').first().textContent().catch(() => '?')
  const err = await page.locator('.text-error, p.text-error').first().textContent().catch(() => '')
  console.log(`t+${(i + 1) * 2}s 按钮="${btnText?.trim()}" 错误提示="${err?.trim()}"`)
  if (btnText?.trim() === '登录') break
}
await browser.close()
