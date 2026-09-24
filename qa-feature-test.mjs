// 新功能验证：预算预警 / 记账提醒 / 数据管理增强 / 分享图二维码
import { chromium } from 'file:///C:/Users/许境钧/.workbuddy/binaries/node/workspace/node_modules/playwright-core/index.mjs'

const BASE = 'http://localhost:5175/#'
const API = 'http://localhost:3104/api'
const CHROME = 'C:/Users/许境钧/.agent-browser/browsers/chrome-154.0.8037.57/chrome.exe'
const SS = 'D:/xjj/1/xiaozhangben-web/qa-screenshots'

const results = []
function record(name, pass, detail = '') {
  results.push({ name, pass: !!pass, detail })
  console.log(`${pass ? 'PASS' : 'FAIL'} | ${name}${detail ? ' | ' + detail : ''}`)
}

const now = new Date()
const Y = now.getFullYear()
const M = now.getMonth() + 1
const MM = String(M).padStart(2, '0')
const DD = String(now.getDate()).padStart(2, '0')
const today = `${Y}-${MM}-${DD}`

const USER = 'qa_feat_' + Date.now()
const results_summary = []

async function apiReq(path, method = 'GET', body = null, userId = null) {
  const headers = { 'Content-Type': 'application/json' }
  if (userId) headers['X-User-Id'] = userId
  const res = await fetch(API + path, {
    method, headers, body: body ? JSON.stringify(body) : undefined,
  })
  return { status: res.status, data: await res.json().catch(() => null) }
}

const browser = await chromium.launch({ executablePath: CHROME, headless: true })
const ctx = await browser.newContext({
  viewport: { width: 414, height: 896 },
  acceptDownloads: true,
})
await ctx.grantPermissions(['notifications'], { origin: 'http://localhost:5175' })
const page = await ctx.newPage()

const consoleErrors = []
page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()) })
page.on('pageerror', e => consoleErrors.push('PAGEERROR: ' + e.message))
// 自动接受 confirm 弹窗（恢复/清空流程使用）
page.on('dialog', d => d.accept().catch(() => {}))

try {
  // ===== 准备：注册并登录 =====
  const reg = await apiReq('/auth/register', 'POST', { username: USER, password: 'feat123456' })
  const uid = reg.data?.user?.id
  record('注册测试用户', reg.status === 200 && !!uid, `uid=${uid}`)

  await page.goto('http://localhost:5175/', { waitUntil: 'networkidle', timeout: 30000 })
  await page.waitForTimeout(800)
  await page.goto(BASE + '/login', { waitUntil: 'networkidle' })
  await page.waitForTimeout(800)
  await page.fill('input[placeholder*="昵称"], input[placeholder*="账号"]', USER)
  await page.fill('input[type="password"]', 'feat123456')
  await page.click('button:has-text("登录")')
  await page.waitForTimeout(2000)
  record('UI 登录成功', page.url().includes('/home') || !page.url().includes('login'), page.url())

  // ===== 1. 首页空状态引导 =====
  await page.goto('http://localhost:5175/#/', { waitUntil: 'networkidle' })
  await page.waitForTimeout(1500)
  const emptyGuide = await page.locator('text=月还没有记录').count()
  record('首页本月空状态引导', emptyGuide > 0)
  const quickAdd = await page.locator('button:has-text("记一笔")').count()
  record('空状态快捷记一笔按钮', quickAdd > 0)

  // ===== 2. 预算预警：先到80%预警 =====
  await apiReq('/budgets', 'POST', { category: '餐饮', amount: 500, year: Y, month: M }, uid)
  await apiReq('/expenses', 'POST', {
    id: crypto.randomUUID(), amount: 450, category: '餐饮',
    description: '预警测试', date: today, tags: [], isIncome: false,
  }, uid)
  await page.goto('http://localhost:5175/#/report', { waitUntil: 'networkidle' })
  await page.waitForTimeout(500)
  await page.goto('http://localhost:5175/#/', { waitUntil: 'networkidle' })
  await page.waitForTimeout(1500)
  const warnText = await page.locator('text=本月预算快用完了').count()
  const warnPct = await page.locator('text=90%').count()
  record('预算80%预警横幅', warnText > 0 && warnPct > 0)
  await page.screenshot({ path: `${SS}/30-budget-warning.png` })

  // ===== 3. 预算预警：超支 =====
  await apiReq('/expenses', 'POST', {
    id: crypto.randomUUID(), amount: 150, category: '餐饮',
    description: '超支测试', date: today, tags: [], isIncome: false,
  }, uid)
  await page.goto('http://localhost:5175/#/report', { waitUntil: 'networkidle' })
  await page.waitForTimeout(500)
  await page.goto('http://localhost:5175/#/', { waitUntil: 'networkidle' })
  await page.waitForTimeout(1500)
  const overText = await page.locator('text=本月预算已超支').count()
  const overAmt = await page.locator('text=超').count()
  record('预算超支红色横幅', overText > 0 && overAmt > 0)
  await page.screenshot({ path: `${SS}/31-budget-exceeded.png` })

  // ===== 4. 分享图二维码 =====
  await page.goto(BASE + '/report', { waitUntil: 'networkidle' })
  await page.waitForTimeout(1500)
  await page.click('button:has-text("分享账单")')
  await page.waitForTimeout(2500)
  const dataUrl = await page.evaluate(() => {
    const c = document.querySelectorAll('canvas')
    const el = Array.from(c).find(x => x.width === 750)
    return el ? el.toDataURL('image/png') : ''
  })
  record('分享图生成(含二维码)', dataUrl.length > 80000, `dataURL ${Math.round(dataUrl.length / 1024)}KB`)
  await page.screenshot({ path: `${SS}/32-share-qr.png` })
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'))
    const close = btns.find(b => String(b.className).includes('bg-white/15'))
    close?.click()
  })
  await page.waitForTimeout(500)

  // ===== 5. 记账提醒设置 =====
  await page.goto(BASE + '/settings', { waitUntil: 'networkidle' })
  await page.waitForTimeout(1500)
  record('提醒卡片渲染', (await page.locator('text=每日记账提醒').count()) > 0)
  // 开启提醒（已授予通知权限）
  const alarmToggle = page.locator('button[disabled], .bg-gray-300 >> nth=0') // 占位,下面按结构点
  const toggles = page.locator('div.rounded-2xl:has-text("每日记账提醒") button')
  const nToggles = await toggles.count()
  const reminderToggle = page.locator('div.rounded-2xl:has-text("每日记账提醒") button.relative')
  await reminderToggle.click()
  await page.waitForTimeout(800)
  const enabledFlag = await page.evaluate(() => localStorage.getItem('reminder_enabled'))
  const timeVal1 = await page.evaluate(() => localStorage.getItem('reminder_time'))
  record('开启提醒并写入配置', enabledFlag === '1' && !!timeVal1, `time=${timeVal1}`)
  // 修改时间
  await page.fill('input[type="time"]', '21:30')
  await page.dispatchEvent('input[type="time"]', 'change')
  await page.waitForTimeout(500)
  const timeVal2 = await page.evaluate(() => localStorage.getItem('reminder_time'))
  record('修改提醒时间持久化', timeVal2 === '21:30', `time=${timeVal2}`)
  const okMsg = await page.locator('text=21:30 提醒你记账').count()
  record('提醒设置反馈文案', okMsg > 0)
  await page.screenshot({ path: `${SS}/33-reminder-settings.png` })

  // ===== 6. CSV 导出 =====
  const csvBtn = page.locator('button:has-text("导出明细")')
  record('CSV导出按钮存在', (await csvBtn.count()) > 0)
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 10000 }),
    csvBtn.click(),
  ])
  const csvName = download.suggestedFilename()
  const csvPath = `${SS}/qa-export-test.csv`
  await download.saveAs(csvPath)
  const csvContent = await (await import('node:fs')).promises.readFile(csvPath, 'utf-8')
  const csvLines = csvContent.trim().split(/\r?\n/)
  record('CSV下载成功', csvName.endsWith('.csv') && csvLines.length >= 3, `${csvName}, ${csvLines.length}行`)
  record('CSV含BOM与表头', csvContent.startsWith('\uFEFF') && csvLines[0].includes('日期'), csvLines[0])
  record('CSV含数据行', csvLines.some(l => l.includes('预警测试') || l.includes('超支测试')))

  // ===== 7. 从备份恢复 =====
  const backup = {
    expenses: [
      { id: crypto.randomUUID(), amount: 12.5, category: '交通', description: '恢复测试1', date: today, tags: [], isIncome: false, createdAt: new Date().toISOString() },
      { id: crypto.randomUUID(), amount: 300, category: '其他', description: '恢复测试2', date: today, tags: [], isIncome: true, createdAt: new Date().toISOString() },
    ],
    budgets: [{ id: crypto.randomUUID(), category: '交通', amount: 200, year: Y, month: M }],
    exportDate: new Date().toISOString(),
  }
  const backupPath = `${SS}/qa-backup-test.json`
  await (await import('node:fs')).promises.writeFile(backupPath, JSON.stringify(backup), 'utf-8')
  const restoreBtn = page.locator('button:has-text("从备份恢复")')
  record('恢复按钮存在', (await restoreBtn.count()) > 0)
  await page.setInputFiles('input[type="file"][accept*="json"]', backupPath)
  await page.waitForTimeout(3000)
  const restoreMsg = await page.locator('text=恢复完成').count()
  const expList = await apiReq('/expenses', 'GET', null, uid)
  const hasRestored = (expList.data || []).some(e => e.description === '恢复测试1')
  record('恢复成功提示', restoreMsg > 0)
  record('恢复数据落库', hasRestored, `总记录数=${(expList.data || []).length}`)

  // ===== 8. 清空账本（含新后端端点） =====
  const clearBtn = page.locator('button:has-text("清空账本记录")')
  record('清空按钮存在', (await clearBtn.count()) > 0)
  await clearBtn.click()
  await page.waitForTimeout(3000)
  const clearedMsg = await page.locator('text=已清空').count()
  const afterClear = await apiReq('/expenses', 'GET', null, uid)
  record('清空成功提示', clearedMsg > 0)
  record('清空后记录为0', Array.isArray(afterClear.data) && afterClear.data.length === 0, `剩余=${(afterClear.data || []).length}`)

  // ===== 9. 加载失败提示与重试 =====
  await page.evaluate(() => localStorage.setItem('api_url', 'http://localhost:39999/api'))
  await page.goto('http://localhost:5175/#/report', { waitUntil: 'networkidle' })
  await page.waitForTimeout(500)
  await page.goto('http://localhost:5175/#/', { waitUntil: 'networkidle' })
  await page.waitForTimeout(3000)
  const errBanner = await page.locator('text=数据加载失败').count()
  const retryBtn = await page.locator('button:has-text("重试")').count()
  record('接口失败错误横幅', errBanner > 0)
  record('错误横幅重试按钮', retryBtn > 0)
  await page.screenshot({ path: `${SS}/34-load-error.png` })
  // 恢复可用地址并重试
  await page.evaluate(() => localStorage.removeItem('api_url'))
  await page.click('button:has-text("重试")')
  await page.waitForTimeout(2500)
  const errGone = await page.locator('text=数据加载失败').count()
  record('重试后恢复', errGone === 0)

} catch (e) {
  console.log('EXCEPTION:', e.message)
} finally {
  const passed = results.filter(r => r.pass).length
  console.log(`\n===== 结果: ${passed}/${results.length} 通过 =====`)
  if (consoleErrors.length) console.log('控制台错误:', JSON.stringify(consoleErrors.slice(0, 10), null, 2))
  else console.log('控制台错误: 无')
  await browser.close()
}
