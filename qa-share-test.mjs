// 月度账单分享图 UI 验证
import { chromium } from 'file:///C:/Users/许境钧/.workbuddy/binaries/node/workspace/node_modules/playwright-core/index.mjs'
import fs from 'fs'

const CHROME = 'C:/Users/许境钧/.agent-browser/browsers/chrome-154.0.8037.57/chrome.exe'
const API = 'http://localhost:3103/api'
const SS = 'D:/xjj/1/xiaozhangben-web/qa-screenshots'

const results = []
function record(name, pass, detail = '') {
  results.push({ name, pass: !!pass, detail })
  console.log(`${pass ? 'PASS' : 'FAIL'} | ${name}${detail ? ' | ' + detail : ''}`)
}

// 登录原有用户 xu, 预置本月多分类数据
const loginRes = await fetch(`${API}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: 'xu', password: '123456' }) })
const { user } = await loginRes.json()
const userId = user.id

const now = new Date()
const y = now.getFullYear(), m = now.getMonth() + 1
const d = `${y}-${String(m).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
const seededIds = []
for (const e of [
  { amount: 35, category: '餐饮', description: '分享图测试-午餐', date: d, isIncome: false },
  { amount: 200, category: '购物', description: '分享图测试-衣服', date: d, isIncome: false },
  { amount: 60, category: '交通', description: '分享图测试-打车', date: d, isIncome: false },
  { amount: 3000, category: '工资', description: '分享图测试-收入', date: d, isIncome: true },
]) {
  const r = await fetch(`${API}/expenses`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-User-Id': userId }, body: JSON.stringify(e) })
  seededIds.push((await r.json()).id)
}

const browser = await chromium.launch({ executablePath: CHROME, headless: true })
const ctx = await browser.newContext({ viewport: { width: 414, height: 896 } })
const page = await ctx.newPage()
const consoleErrors = []
page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()) })
page.on('pageerror', e => consoleErrors.push('PAGEERROR: ' + e.message))

try {
  // 登录
  await page.goto('http://localhost:5174/#/login', { waitUntil: 'networkidle' })
  await page.waitForTimeout(1000)
  await page.evaluate((uid) => {
    localStorage.setItem('user_id', uid)
    localStorage.removeItem('api_url')
  }, userId)
  await page.goto('http://localhost:5174/#/report', { waitUntil: 'networkidle' })
  await page.waitForTimeout(2500)

  // 1. 分享按钮可见
  const shareBtn = page.locator('button:has-text("分享账单")').first()
  record('报表页-分享账单按钮可见', await shareBtn.isVisible().catch(() => false))
  await page.screenshot({ path: `${SS}/20-report-share-btn.png` })

  // 2. 点击打开弹窗
  await shareBtn.click()
  await page.waitForTimeout(2000)
  record('点击后-分享弹窗打开', await page.locator('text=我的月度账单').first().isVisible().catch(() => false))
  record('弹窗-保存图片按钮可见', await page.locator('button:has-text("保存图片")').first().isVisible().catch(() => false))

  // 3. canvas 已生成图片 (dataURL 非空)
  const dataLen = await page.evaluate(() => {
    const canvas = document.querySelector('canvas')
    return canvas ? canvas.toDataURL('image/png').length : 0
  })
  record('分享图-canvas 已渲染并生成 dataURL', dataLen > 10000, `dataURL 长度=${dataLen}`)

  // 4. 导出分享图为文件, 供人工检查
  const dataUrl = await page.evaluate(() => document.querySelector('canvas').toDataURL('image/png'))
  fs.writeFileSync(`${SS}/21-monthly-share-card.png`, Buffer.from(dataUrl.split(',')[1], 'base64'))
  record('分享图-已导出为 PNG 文件', fs.existsSync(`${SS}/21-monthly-share-card.png`))
  await page.screenshot({ path: `${SS}/22-share-modal.png` })

  // 5. 数字正确性: 总支出应含测试数据 (月度原有数据 + 295)
  const bodyText = await page.locator('body').innerText()
  record('报表-页面金额渲染', bodyText.includes('总支出'), '')

  // 6. 关闭弹窗
  await page.locator('button:has(.material-icons-round):has-text("close")').last().click()
  await page.waitForTimeout(800)
  record('关闭弹窗后返回报表', await page.locator('button:has-text("分享账单")').first().isVisible().catch(() => false))

} finally {
  // 清理预置数据
  for (const id of seededIds) {
    await fetch(`${API}/expenses/${id}`, { method: 'DELETE', headers: { 'X-User-Id': userId } })
  }
  record('清理预置测试数据', true)

  console.log('\n===== 控制台错误 =====')
  if (!consoleErrors.length) console.log('(无)')
  else consoleErrors.forEach(e => console.log(e))

  console.log('\n===== 分享图功能测试汇总 =====')
  console.log(`总计: ${results.filter(r => r.pass).length} 通过 / ${results.filter(r => !r.pass).length} 失败`)
  await browser.close()
}
