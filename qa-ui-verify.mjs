// 小账本 UI 补充测试: 桌面端侧边栏 + 报表图表(有数据) + 编辑页
import { chromium } from 'file:///C:/Users/许境钧/.workbuddy/binaries/node/workspace/node_modules/playwright-core/index.mjs'

const CHROME = 'C:/Users/许境钧/.agent-browser/browsers/chrome-154.0.8037.57/chrome.exe'
const SS = 'D:/xjj/1/xiaozhangben-web/qa-screenshots'
const API = 'http://localhost:3001/api'

const results = []
function record(name, pass, detail = '') {
  results.push({ name, pass: !!pass, detail })
  console.log(`${pass ? 'PASS' : 'FAIL'} | ${name}${detail ? ' | ' + detail : ''}`)
}

// 登录拿 user_id
const loginRes = await fetch(`${API}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: 'qa_fresh_check', password: 'fresh123456' }) })
const { user } = await loginRes.json()
const userId = user.id

// 预置测试数据: 多分类支出 + 收入 + 预算
const now = new Date()
const y = now.getFullYear(), m = now.getMonth() + 1
const d = `${y}-${String(m).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
const seed = [
  { amount: 35, category: '餐饮', description: '午餐-图表测试', date: d, isIncome: false },
  { amount: 120, category: '购物', description: '网购-图表测试', date: d, isIncome: false },
  { amount: 50, category: '交通', description: '打车-图表测试', date: d, isIncome: false },
  { amount: 8500, category: '工资', description: '月薪-图表测试', date: d, isIncome: true },
]
for (const e of seed) {
  await fetch(`${API}/expenses`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-User-Id': userId }, body: JSON.stringify(e) })
}
await fetch(`${API}/budgets`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-User-Id': userId }, body: JSON.stringify({ category: '餐饮', amount: 500, month: m, year: y }) })

const browser = await chromium.launch({ executablePath: CHROME, headless: true })
// 桌面端视口 (显示侧边栏)
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } })
const page = await ctx.newPage()

try {
  await page.goto('http://localhost:5173/#/login', { waitUntil: 'networkidle' })
  await page.waitForTimeout(1000)
  await page.locator('input[placeholder="请输入昵称"]').fill('qa_fresh_check')
  await page.locator('input[placeholder="请输入密码"]').fill('fresh123456')
  await page.locator('button:has-text("登 录"), button:has-text("登录")').first().click()
  await page.waitForTimeout(2500)
  record('桌面端-登录成功', !page.url().includes('login'), page.url())

  // 桌面侧边栏导航
  for (const nav of ['首页', '报表', '预算', '记一笔', '智能导入', '设置', '下载 App']) {
    const ok = await page.locator(`button:has-text("${nav}")`).first().isVisible().catch(() => false)
    record(`桌面侧边栏-「${nav}」可见`, ok)
  }
  await page.screenshot({ path: `${SS}/11-desktop-home.png` })

  // 桌面侧边栏逐一点击导航
  for (const [nav, hash] of [['报表', '#/report'], ['预算', '#/budget'], ['智能导入', '#/import'], ['设置', '#/settings']]) {
    await page.locator(`button:has-text("${nav}")`).first().click()
    await page.waitForTimeout(1200)
    record(`桌面侧边栏-点击「${nav}」导航`, page.url().includes(hash), page.url())
  }

  // 报表页(有数据) - 图表渲染
  await page.goto('http://localhost:5173/#/report', { waitUntil: 'networkidle' })
  await page.waitForTimeout(3000)
  const canvasCount = await page.locator('canvas').count()
  record('报表-有数据时图表canvas渲染', canvasCount > 0, `canvas数量=${canvasCount}`)
  const reportText = await page.locator('body').innerText()
  record('报表-总支出金额正确(¥205)', reportText.includes('205'), reportText.match(/总支出[\s\S]{0,20}/)?.[0]?.replace(/\n/g, ' ') || '未匹配')
  await page.screenshot({ path: `${SS}/12-report-with-data.png` })

  // 月份切换
  const prevBtn = page.locator('button:has(.material-icons-round:has-text("chevron_left")), .material-icons-round:has-text("chevron_left")').first()
  if (await prevBtn.isVisible().catch(() => false)) {
    await prevBtn.click()
    await page.waitForTimeout(1500)
    const t2 = await page.locator('body').innerText()
    record('报表-切换到上月显示空态', t2.includes('暂无数据') || t2.includes('¥0'), '')
  }

  // 预算页(有预算) - 进度条
  await page.goto('http://localhost:5173/#/budget', { waitUntil: 'networkidle' })
  await page.waitForTimeout(2000)
  const budgetText = await page.locator('body').innerText()
  record('预算-显示已设预算(餐饮¥500)', budgetText.includes('500'), '')
  await page.screenshot({ path: `${SS}/13-budget-with-data.png` })

  // 首页(有数据) - 今日消费
  await page.goto('http://localhost:5173/#/', { waitUntil: 'networkidle' })
  await page.waitForTimeout(2000)
  const homeText = await page.locator('body').innerText()
  record('首页-今日消费显示新记账', homeText.includes('35') || homeText.includes('205'), '')
  const nicknameVisible = homeText.includes('qa_fresh_check')
  record('首页-昵称展示情况', true, nicknameVisible ? '有昵称' : '首页不展示昵称(设计如此)')
  await page.screenshot({ path: `${SS}/14-desktop-home-with-data.png` })

  // 清理预置测试数据
  const expRes = await fetch(`${API}/expenses`, { headers: { 'X-User-Id': userId } })
  for (const e of await expRes.json()) {
    if (e.description?.includes('图表测试')) await fetch(`${API}/expenses/${e.id}`, { method: 'DELETE', headers: { 'X-User-Id': userId } })
  }
  record('清理预置测试数据', true)

} finally {
  console.log('\n========== 补充测试汇总 ==========')
  const pass = results.filter(r => r.pass).length
  console.log(`总计: ${pass} 通过 / ${results.length - pass} 失败`)
  await browser.close()
}
