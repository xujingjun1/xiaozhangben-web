// 抓取线上页面产生的 4xx 请求 URL
import { chromium } from 'file:///C:/Users/许境钧/.workbuddy/binaries/node/workspace/node_modules/playwright-core/index.mjs'

const SITE = 'https://xiaozhangben-ledger-88116.app.workbuddy.host/'
const EXEC = 'C:/Users/许境钧/.agent-browser/browsers/chrome-154.0.8037.57/chrome.exe'

const browser = await chromium.launch({ executablePath: EXEC, headless: true })
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })

const bad = []
page.on('response', r => {
  const s = r.status()
  if (s >= 400) bad.push(`${s}  ${r.request().method()}  ${r.url()}`)
})

await page.goto(SITE, { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(2500)

// 走一遍登录页，看是否触发密保接口
await page.evaluate(() => { location.hash = '#/login' })
await page.waitForTimeout(1500)

// 点「忘记密码」类按钮（若存在）
const btns = await page.locator('button, a').allTextContents()
const forgot = btns.find(t => /忘记密码|找回密码|重置密码/.test(t))
if (forgot) {
  try { await page.locator(`button:text-is("${forgot}"), a:text-is("${forgot}")`).first().click() } catch {}
  await page.waitForTimeout(1500)
}

console.log('=== 4xx 请求 ===')
console.log(bad.length ? [...new Set(bad)].join('\n') : '(无)')
console.log('\n=== 登录页按钮 ===')
console.log(btns.filter(Boolean).slice(0, 20).join(' | '))

await browser.close()
