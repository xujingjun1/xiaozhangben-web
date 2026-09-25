import { chromium } from 'file:///C:/Users/许境钧/.workbuddy/binaries/node/workspace/node_modules/playwright-core/index.mjs'

const SITE = 'https://xiaozhangben-ledger-88116.app.workbuddy.host'
const SS = 'D:/xjj/1/xiaozhangben-web/qa-screenshots'
const CHROME = 'C:/Users/许境钧/.agent-browser/browsers/chrome-154.0.8037.57/chrome.exe'
const USER = 'qa_share_check'
const PASS = 'share_check_2026'
const errors = []
let pass = 0, fail = 0
function check(name, cond, extra = '') {
  if (cond) { pass++; console.log(`✅ ${name}`) }
  else { fail++; console.log(`❌ ${name} ${extra}`) }
}

const browser = await chromium.launch({ executablePath: CHROME })
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const page = await ctx.newPage()
page.on('pageerror', e => errors.push('desktop: ' + e.message))
page.on('console', m => { if (m.type() === 'error') errors.push('desktop-console: ' + m.text()) })
page.on('response', r => { if (r.status() >= 400) errors.push(`desktop-http: ${r.status()} ${r.request().method()} ${r.url()}`) })

async function api(path, method = 'GET', body = null, uid = null) {
  const headers = { 'Content-Type': 'application/json' }
  if (uid) { headers['User-Id'] = uid; headers['Authorization'] = `Bearer ${uid}`; headers['X-User-Id'] = uid }
  const r = await fetch(SITE + '/api' + path, { method, headers, body: body ? JSON.stringify(body) : null })
  let json = null
  try { json = await r.json() } catch {}
  return { status: r.status, json }
}

// ========== A. 落地页 ==========
console.log('--- A. 落地页 ---')
await page.goto(SITE + '/', { waitUntil: 'domcontentloaded', timeout: 25000 })
await page.waitForTimeout(2500)
check('未登录自动到落地页', page.url().includes('/landing'))
check('Hero 标题', (await page.locator('.lt').textContent()).includes('记录生活'))
check('悬浮气泡', await page.locator('.lchip').count() === 2)
check('无侧边栏', await page.locator('.sidebar').count() === 0)
await page.locator('.lbtns .lb1').click()
await page.waitForTimeout(1200)
check('「打开网页版」进登录页', page.url().includes('/login'))

// ========== B. 注册/登录 ==========
console.log('--- B. 注册与登录 ---')
// 注册（可能已存在则直接登录）
let reg = await api('/auth/register', 'POST', { username: USER, password: PASS })
check('注册或已存在', reg.status === 200 || (reg.status === 400 && (String(reg.json?.error).includes('已') && String(reg.json?.error).includes('注册'))), JSON.stringify(reg.json))
let login = await api('/auth/login', 'POST', { username: USER, password: PASS })
check('API 登录', login.status === 200 && login.json?.user?.id)
const uid = login.json?.user?.id

// UI 登录（先清掉旧会话）
await page.goto(SITE + '/#/login', { waitUntil: 'domcontentloaded', timeout: 25000 })
await page.evaluate(() => localStorage.clear())
await page.goto(SITE + '/#/login', { waitUntil: 'domcontentloaded', timeout: 25000 })
await page.waitForTimeout(1500)
// 错误密码提示
await page.fill('input[placeholder*="昵称"]', USER)
await page.fill('input[placeholder*="密码"]', 'wrongpass999')
await page.click('button[type="submit"], .login-btn, button:has-text("登录")')
// 等待请求完成、按钮恢复可用
await page.waitForSelector('button:has-text("登录"):not([disabled])', { timeout: 20000 }).catch(() => {})
await page.waitForTimeout(800)
const errVisible = await page.locator('text=账号或密码错误').count() > 0
check('错误密码提示', errVisible)
// 正确登录
await page.fill('input[placeholder*="密码"]', PASS)
await page.click('button[type="submit"], .login-btn, button:has-text("登录")')
await page.waitForTimeout(2500)
check('UI 登录成功进首页', !page.url().includes('/login'), page.url())

// ========== C. 核心记账流程 ==========
console.log('--- C. 记账流程 ---')
const today = new Date().toISOString().slice(0, 10)
await page.evaluate(() => { location.hash = '#/add' })
await page.waitForTimeout(1500)
// 填金额与备注
const amountInput = page.locator('input[inputmode="decimal"]').first()
await amountInput.fill('23.5')
const descInput = page.locator('input[placeholder*="备注"], input[placeholder*="说明"], textarea').first()
if (await descInput.count()) await descInput.fill('验收测试支出')
await page.locator('button:text-is("记一笔")').click()
await page.waitForTimeout(2500)
const list = await api('/expenses', 'GET', null, uid)
const found = (list.json || []).find(e => e.description && e.description.includes('验收测试'))
check('记账保存并落库', !!found, `共${(list.json||[]).length}笔`)
check('记账后离开添加页', !page.url().includes('/add'), page.url())

// ========== D. 报表页 ==========
console.log('--- D. 报表页 ---')
await page.evaluate(() => { location.hash = '#/report' })
await page.waitForTimeout(2500)
check('报表页渲染', await page.locator('text=报表').count() > 0 || await page.locator('.report, [class*="report"]').count() > 0)
const shareBtn = page.locator('button:has-text("分享")')
check('分享按钮存在', await shareBtn.count() > 0)

// ========== E. 分享图 ==========
console.log('--- E. 账单分享图 ---')
if (await shareBtn.count()) {
  await shareBtn.first().click()
  await page.waitForTimeout(2500)
  const canvas = page.locator('.fixed canvas, canvas').first()
  check('分享图弹窗打开', await canvas.count() > 0)
  const canvasOk = await canvas.evaluate(c => {
    const ctx2 = c.getContext('2d')
    const d = ctx2.getImageData(0, 0, c.width, c.height).data
    let colored = 0
    for (let i = 0; i < d.length; i += 4000) { if (d[i+3] > 0 && (d[i] !== d[i+1] || d[i+1] !== d[i+2])) colored++ }
    return colored > 50
  })
  check('分享图已绘制内容', canvasOk)
  await page.screenshot({ path: `${SS}/80-acceptance-share.png` })
  await page.keyboard.press('Escape')
  await page.locator('.fixed button:has-text("关闭"), .fixed [class*="close"], .fixed button').first().click().catch(() => {})
  await page.waitForTimeout(600)
}

// ========== F. 预算 ==========
console.log('--- F. 预算页 ---')
const errsBeforeBudget = errors.length
await page.evaluate(() => { location.hash = '#/budget' })
await page.waitForTimeout(2000)
check('预算页渲染', page.url().includes('/budget') && errors.length === errsBeforeBudget)
await page.screenshot({ path: `${SS}/81-acceptance-budget.png` })

// ========== G. 设置页 ==========
console.log('--- G. 设置页 ---')
await page.evaluate(() => { location.hash = '#/settings' })
await page.waitForTimeout(2000)
const settingsText = await page.locator('body').textContent()
check('记账提醒卡片', settingsText.includes('提醒'))
check('数据管理区', settingsText.includes('导出') && settingsText.includes('备份'))
await page.screenshot({ path: `${SS}/82-acceptance-settings.png` })

// ========== H. 移动端关键路径 ==========
console.log('--- H. 移动端 ---')
const mp = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage()
mp.on('pageerror', e => errors.push('mobile: ' + e.message))
mp.on('console', m => { if (m.type() === 'error') errors.push('mobile-console: ' + m.text()) })
await mp.goto(SITE + '/', { waitUntil: 'domcontentloaded', timeout: 25000 })
await mp.waitForTimeout(2500)
check('移动端落地页', mp.url().includes('/landing'))
check('移动端无横向溢出', await mp.evaluate(() => document.documentElement.scrollWidth <= 391))
check('移动端无底部Tab', await mp.locator('.tabbar').count() === 0)
await mp.evaluate(() => { location.hash = '#/login' })
await mp.waitForTimeout(1500)
await mp.fill('input[placeholder*="昵称"]', USER)
await mp.fill('input[placeholder*="密码"]', PASS)
await mp.click('button[type="submit"], .login-btn, button:has-text("登录")')
await mp.waitForTimeout(2500)
check('移动端登录进首页', !mp.url().includes('/login'))
check('移动端登录后Tab出现', await mp.locator('nav[aria-label="主导航"]').count() === 1)
await mp.screenshot({ path: `${SS}/83-acceptance-mobile-home.png` })

// ========== I. 健康与性能 ==========
console.log('--- I. 健康检查 ---')
const t0 = Date.now()
const health = await api('/health')
check('API 健康', health.status === 200 && health.json?.status === 'ok')
const t1 = Date.now()
check('API 响应 <3s', t1 - t0 < 3000, `${t1 - t0}ms`)
const home = await fetch(SITE + '/')
check('首页 HTTP 200', home.status === 200)
const html = await home.text()
check('页面引用了 JS 资源', html.includes('assets/index-'))

// ========== J. 清理测试数据 ==========
console.log('--- J. 清理测试数据 ---')
const clear = await api('/expenses', 'DELETE', null, uid)
check('清空测试支出', clear.status === 200)
const after = await api('/expenses', 'GET', null, uid)
check('测试支出已清空', (after.json || []).length === 0)

console.log(`\n========== 最终验收: ${pass} 通过, ${fail} 失败 ==========`)
console.log('页面错误:', errors.length ? errors : '无')
await browser.close()
process.exit(fail > 0 ? 1 : 0)
