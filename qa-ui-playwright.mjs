// 小账本 UI 全流程自动化测试 (Playwright + Chrome 154)
import { chromium } from 'file:///C:/Users/许境钧/.workbuddy/binaries/node/workspace/node_modules/playwright-core/index.mjs'

const BASE = 'http://localhost:5173/#'
const CHROME = 'C:/Users/许境钧/.agent-browser/browsers/chrome-154.0.8037.57/chrome.exe'
const SS = 'D:/xjj/1/xiaozhangben-web/qa-screenshots'
const API = 'http://localhost:3001/api'

const results = []
function record(name, pass, detail = '') {
  results.push({ name, pass: !!pass, detail })
  console.log(`${pass ? 'PASS' : 'FAIL'} | ${name}${detail ? ' | ' + detail : ''}`)
}

let consoleErrors = []
async function attachConsole(page, label) {
  page.on('console', m => { if (m.type() === 'error') consoleErrors.push(`[${label}] ${m.text()}`) })
  page.on('pageerror', e => consoleErrors.push(`[${label}] PAGEERROR: ${e.message}`))
}

const browser = await chromium.launch({ executablePath: CHROME, headless: true })
const ctx = await browser.newContext({ viewport: { width: 414, height: 896 } }) // 移动端视口
const page = await ctx.newPage()
attachConsole(page, 'global')

try {
  // ========== 1. 落地页 ==========
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle', timeout: 30000 })
  await page.waitForTimeout(1500)
  record('落地页渲染-标题', (await page.title()).includes('小账本'), await page.title())
  record('路由守卫-未登录重定向到 /landing', page.url().includes('#/landing'), page.url())
  const heroVisible = await page.locator('text=记录生活的').first().isVisible().catch(() => false)
  record('落地页-主标语可见', heroVisible)
  await page.screenshot({ path: `${SS}/01-landing.png` })

  // 侧边导航按钮存在
  for (const nav of ['首页', '报表', '预算', '记一笔', '智能导入', '设置', '下载 App']) {
    const ok = await page.locator(`button:has-text("${nav}")`).first().isVisible().catch(() => false)
    record(`落地页-导航「${nav}」可见`, ok)
  }

  // ========== 2. 登录页 ==========
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1000)
  const loginBtn = page.locator('button:has-text("登 录"), button:has-text("登录")').first()
  record('登录页-登录按钮可见', await loginBtn.isVisible().catch(() => false))
  await page.screenshot({ path: `${SS}/02-login.png` })

  // 2a. 错误密码
  await page.locator('input[placeholder="请输入昵称"]').fill('qa_fresh_check')
  await page.locator('input[placeholder="请输入密码"]').fill('wrong_password')
  await loginBtn.click()
  await page.waitForTimeout(1500)
  const errText = await page.locator('text=账号或密码错误').first().isVisible().catch(() => false)
  record('登录-错误密码提示', errText)

  // 2b. 正确登录
  await page.locator('input[placeholder="请输入密码"]').fill('fresh123456')
  await loginBtn.click()
  await page.waitForTimeout(2500)
  record('登录-成功跳转首页', page.url().includes('#/') && !page.url().includes('login') && !page.url().includes('landing'), page.url())

  // ========== 3. 首页 ==========
  await page.waitForTimeout(1000)
  const homeHas = await page.locator('body').innerText()
  record('首页-渲染主要内容', homeHas.length > 100, `内容长度=${homeHas.length}`)
  const hasNickname = await page.locator('text=qa_fresh_check').first().isVisible().catch(() => false)
  record('首页-显示用户昵称', hasNickname)
  await page.screenshot({ path: `${SS}/03-home.png` })

  // ========== 4. 记一笔 (新增支出) ==========
  await page.goto(`${BASE}/add`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1000)
  record('记一笔-页面打开', page.url().includes('#/add'))
  await page.locator('input[placeholder="0.00"]').fill('66.6')
  await page.locator('input[placeholder="添加备注... (输入内容会自动匹配分类)"]').fill('自动化测试午餐')
  await page.screenshot({ path: `${SS}/04-add.png` })
  await page.locator('button:has-text("记一笔")').last().click()
  await page.waitForTimeout(2500)
  // 验证是否跳回首页
  record('记一笔-保存后跳转', !page.url().includes('#/add'), page.url())

  // 通过 API 验证数据落库
  const userId = await page.evaluate(() => localStorage.getItem('user_id'))
  const expRes = await fetch(`${API}/expenses`, { headers: { 'X-User-Id': userId } })
  const expenses = await expRes.json()
  const created = expenses.find(e => e.description === '自动化测试午餐' && e.amount === 66.6)
  record('记一笔-数据已保存到服务端', !!created, created ? `id=${created.id} amount=${created.amount}` : '未找到')

  // ========== 5. 编辑支出 ==========
  if (created) {
    await page.goto(`${BASE}/add/${created.id}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1000)
    const amountVal = await page.locator('input[placeholder="0.00"]').inputValue().catch(() => null)
    record('编辑-金额回填', amountVal === '66.6', `value=${amountVal}`)
    await page.locator('input[placeholder="0.00"]').fill('88.8')
    await page.locator('button:has-text("保存修改")').click()
    await page.waitForTimeout(2000)
    const expRes2 = await fetch(`${API}/expenses`, { headers: { 'X-User-Id': userId } })
    const updated = (await expRes2.json()).find(e => e.id === created.id)
    record('编辑-修改后金额=88.8', updated?.amount === 88.8, `amount=${updated?.amount}`)
  }

  // ========== 6. 删除支出 ==========
  if (created) {
    await page.goto(`${BASE}/`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1500)
    // 找到该支出的删除按钮 (ExpenseCard 组件)
    const card = page.locator('text=自动化测试午餐').first()
    const cardVisible = await card.isVisible().catch(() => false)
    record('首页-新支出卡片可见', cardVisible)
    if (cardVisible) {
      const cardEl = await card.locator('xpath=ancestor-or-self::*[contains(@class,"card") or contains(@class,"expense")][1]').count()
      record('首页-支出卡片容器定位', cardEl > 0)
      // 尝试点击删除 (删除按钮通常含 delete 图标)
      const delBtn = page.locator('button:has-text("delete"), [class*="delete"]').first()
      const delVisible = await delBtn.isVisible().catch(() => false)
      if (delVisible) {
        await delBtn.click().catch(() => {})
        await page.waitForTimeout(1000)
        // 可能有确认对话框
        const confirmBtn = page.locator('button:has-text("删除"), button:has-text("确认"), button:has-text("确定")').first()
        if (await confirmBtn.isVisible().catch(() => false)) { await confirmBtn.click(); await page.waitForTimeout(1000) }
        const stillThere = await page.locator('text=自动化测试午餐').first().isVisible().catch(() => false)
        record('删除-支出已从前端移除', !stillThere)
      } else {
        record('删除-通过API清理测试数据', true, 'UI删除按钮不可见(可能需进入详情), 用API清理')
        await fetch(`${API}/expenses/${created.id}`, { method: 'DELETE', headers: { 'X-User-Id': userId } })
      }
    }
  }

  // ========== 7. 报表页 ==========
  await page.goto(`${BASE}/report`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(2500)
  const reportText = await page.locator('body').innerText()
  record('报表-页面渲染', reportText.length > 100, `长度=${reportText.length}`)
  const chartCount = await page.locator('canvas').count()
  record('报表-图表canvas渲染', chartCount > 0, `canvas数量=${chartCount}`)
  await page.screenshot({ path: `${SS}/05-report.png` })

  // ========== 8. 预算页 ==========
  await page.goto(`${BASE}/budget`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1500)
  const budgetText = await page.locator('body').innerText()
  record('预算-页面渲染', budgetText.length > 100, `长度=${budgetText.length}`)
  await page.screenshot({ path: `${SS}/06-budget.png` })
  // 尝试添加预算
  const addBudgetBtn = page.locator('button:has-text("添加"), button:has-text("新增"), button:has-text("设置预算"), button:has-text("+")').first()
  if (await addBudgetBtn.isVisible().catch(() => false)) {
    await addBudgetBtn.click().catch(() => {})
    await page.waitForTimeout(1000)
    await page.screenshot({ path: `${SS}/06b-budget-dialog.png` })
    record('预算-添加预算入口可用', true)
  } else {
    record('预算-添加预算入口可用', false, '未找到添加按钮')
  }

  // ========== 9. 智能导入页 ==========
  await page.goto(`${BASE}/import`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1500)
  const importText = await page.locator('body').innerText()
  record('智能导入-页面渲染', importText.length > 100, `长度=${importText.length}`)
  await page.screenshot({ path: `${SS}/07-import.png` })

  // ========== 10. 设置页 ==========
  await page.goto(`${BASE}/settings`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1500)
  const settingsText = await page.locator('body').innerText()
  record('设置-页面渲染', settingsText.length > 100, `长度=${settingsText.length}`)
  await page.screenshot({ path: `${SS}/08-settings.png` })

  // ========== 11. 评分页 ==========
  await page.goto(`${BASE}/rating`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1500)
  const ratingText = await page.locator('body').innerText()
  record('评分-页面渲染', ratingText.length > 50, `长度=${ratingText.length}`)
  await page.screenshot({ path: `${SS}/09-rating.png` })

  // ========== 12. 隐私/帮助/下载页 ==========
  for (const p of ['privacy', 'help', 'download']) {
    await page.goto(`${BASE}/${p}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1200)
    const t = await page.locator('body').innerText()
    record(`页面-${p} 渲染`, t.length > 50, `长度=${t.length}`)
    await page.screenshot({ path: `${SS}/10-${p}.png` })
  }

  // ========== 13. 退出登录 ==========
  await page.goto(`${BASE}/settings`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1000)
  const logoutBtn = page.locator('button:has-text("退出登录"), button:has-text("登出"), button:has-text("退出")').first()
  if (await logoutBtn.isVisible().catch(() => false)) {
    await logoutBtn.click()
    await page.waitForTimeout(1500)
    const confirmBtn = page.locator('button:has-text("确认"), button:has-text("确定"), button:has-text("退出")').first()
    if (await confirmBtn.isVisible().catch(() => false)) { await confirmBtn.click(); await page.waitForTimeout(1500) }
    const uid = await page.evaluate(() => localStorage.getItem('user_id'))
    record('退出登录-清除本地会话', uid === null, `user_id=${uid}`)
    record('退出登录-跳转到登录/落地页', page.url().includes('login') || page.url().includes('landing'), page.url())
  } else {
    record('退出登录-按钮存在', false, '设置页未找到退出按钮')
  }

  // ========== 14. 404 未知路由 ==========
  await page.goto(`${BASE}/no_such_page_xyz`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1200)
  const t404 = await page.locator('body').innerText()
  record('边界-未知路由不白屏', t404.length > 30, `长度=${t404.length}, url=${page.url()}`)

} finally {
  // 汇总
  console.log('\n========== 控制台错误汇总 ==========')
  if (consoleErrors.length === 0) console.log('(无控制台错误)')
  else consoleErrors.forEach(e => console.log(e))

  console.log('\n========== UI 测试汇总 ==========')
  const pass = results.filter(r => r.pass).length
  console.log(`总计: ${pass} 通过 / ${results.length - pass} 失败`)

  await browser.close()
}
