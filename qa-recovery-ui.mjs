// 验证恢复码功能的前端 UI：首页引导条 + 设置页恢复码卡片 + 明文展示
import { chromium } from 'file:///C:/Users/许境钧/.workbuddy/binaries/node/workspace/node_modules/playwright-core/index.mjs'
import fs from 'fs'

const SITE = 'https://xiaozhangben-ledger-88116.app.workbuddy.host/'
const API = SITE + 'api'
const CHROME = 'C:/Users/许境钧/.agent-browser/browsers/chrome-154.0.8037.57/chrome.exe'
const USER = 'qa_share_check'
const PASS = 'share_check_2026'
const OUT = 'qa-screenshots'
fs.mkdirSync(OUT, { recursive: true })

const P = (n, ok, extra = '') => console.log((ok ? '✅' : '❌') + ' ' + n + (extra ? '  ' + extra : ''))

// 通过 API 拿登录态
let res = await fetch(API + '/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username: USER, password: PASS }),
})
let json = await res.json()
if (res.status !== 200) {
  const r2 = await fetch(API + '/auth/register', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: USER, password: PASS }),
  })
  json = await r2.json()
}
const uid = json?.user?.id
P('获取登录态', !!uid, 'uid=' + (uid || '').slice(0, 8))

const browser = await chromium.launch({ executablePath: CHROME, headless: true })
const page = await browser.newPage({ viewport: { width: 390, height: 844 } })

const errors = []
page.on('pageerror', e => errors.push('pageerror: ' + e.message))
page.on('response', r => { if (r.status() >= 400) errors.push(`http ${r.status()} ${r.url()}`) })

// 注入登录态后进入首页
await page.goto(SITE, { waitUntil: 'domcontentloaded' })
await page.evaluate(({ id, user }) => {
  localStorage.setItem('user_id', id)
  localStorage.setItem('user_info', JSON.stringify(user))
}, { id: uid, user: json.user })
await page.evaluate(() => { location.hash = '#/' })
await page.reload({ waitUntil: 'domcontentloaded' })
await page.waitForTimeout(3000)

const tipVisible = await page.locator('text=建议设置密保问题和恢复码').count()
P('首页显示安全引导条', tipVisible > 0)
await page.screenshot({ path: `${OUT}/recovery-1-home-tip.png` })

// 进设置页
await page.evaluate(() => { location.hash = '#/settings' })
await page.waitForTimeout(3000)
const cardVisible = await page.locator('text=密码恢复码').count()
P('设置页有恢复码卡片', cardVisible > 0)
await page.screenshot({ path: `${OUT}/recovery-2-settings-card.png` })

// 生成恢复码（把卡片滚动到可见区域）
await page.locator('text=密码恢复码').first().scrollIntoViewIfNeeded()
await page.waitForTimeout(800)
await page.screenshot({ path: `${OUT}/recovery-2b-card-visible.png` })

const genBtn = page.locator('button').filter({ hasText: /^(生成|重新生成)$/ }).first()
await genBtn.click({ timeout: 15000 })
await page.waitForTimeout(2500)

// 页面上有多个 .font-mono（如「服务器地址」显示 /api），按恢复码格式精确择取
const allMono = await page.locator('.font-mono').allTextContents()
const codeText = allMono.map(t => (t || '').trim()).find(t => /^[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/.test(t)) || ''
P('生成后展示明文恢复码', !!codeText, codeText)
await page.screenshot({ path: `${OUT}/recovery-3-code-shown.png` })

const savedBtn = await page.locator('button').filter({ hasText: /我已保存/ }).count()
P('展示「我已保存」按钮', savedBtn > 0)

if (savedBtn > 0) {
  await page.locator('button').filter({ hasText: /我已保存/ }).first().click()
  await page.waitForTimeout(1200)
  const after = await page.locator('.font-mono').allTextContents()
  const stillShown = after.map(t => (t || '').trim()).some(t => /^[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/.test(t))
  P('保存后明文已隐藏', !stillShown)
}

console.log('\n=== 页面错误 ===')
console.log(errors.length ? [...new Set(errors)].join('\n') : '(无)')

await browser.close()
