// 验证 catch-all 路由：未知路由不再白屏
import { chromium } from 'file:///C:/Users/许境钧/.workbuddy/binaries/node/workspace/node_modules/playwright-core/index.mjs'

const CHROME = 'C:/Users/许境钧/.agent-browser/browsers/chrome-154.0.8037.57/chrome.exe'
const APP = 'http://localhost:5176/#'
const API = 'http://localhost:3105/api'

const results = []
function record(name, pass, detail = '') {
  results.push({ name, pass: !!pass, detail })
  console.log(`${pass ? 'PASS' : 'FAIL'} | ${name}${detail ? ' | ' + detail : ''}`)
}

const browser = await chromium.launch({ executablePath: CHROME, headless: true })
const ctx = await browser.newContext({ viewport: { width: 414, height: 896 } })
const page = await ctx.newPage()
const consoleErrors = []
page.on('pageerror', e => consoleErrors.push('PAGEERROR: ' + e.message))

try {
  // ===== 未登录：未知路由 → 落地页 =====
  await page.goto(APP + '/home', { waitUntil: 'networkidle', timeout: 30000 })
  await page.waitForTimeout(1200)
  record('未登录访问 #/home → 重定向', page.url().includes('#/landing'), page.url())
  await page.goto(APP + '/whatever/not/exist', { waitUntil: 'networkidle' })
  await page.waitForTimeout(1200)
  record('未登录访问任意未知路径 → 落地页', page.url().includes('#/landing'), page.url())

  // ===== 已登录：未知路由 → 首页（不再白屏） =====
  const reg = await fetch(API + '/auth/register', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'qa_route_' + Date.now(), password: 'route123456' }),
  }).then(r => r.json())
  const uid = reg?.user?.id
  record('注册验证用户', !!uid)

  await page.evaluate(([id]) => localStorage.setItem('user_id', id), [uid])
  await page.goto(APP + '/home', { waitUntil: 'networkidle', timeout: 30000 })
  await page.waitForTimeout(1500)
  record('已登录访问 #/home → 回到首页', page.url().endsWith('#/'), page.url())
  const homeRendered = await page.locator('text=今日消费').count()
  record('首页正常渲染（非白屏）', homeRendered > 0)

  await page.goto(APP + '/random/junk/path', { waitUntil: 'networkidle' })
  await page.waitForTimeout(1200)
  record('已登录访问任意未知路径 → 回到首页', page.url().endsWith('#/'), page.url())

  // ===== 正常路由不受影响 =====
  for (const [path, marker] of [['/report', '报表'], ['/budget', '预算'], ['/settings', '我的']]) {
    await page.goto(APP + path, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1000)
    const ok = await page.locator(`text=${marker}`).count() > 0
    record(`正常路由 ${path} 渲染正常`, ok)
  }
} catch (e) {
  console.log('EXCEPTION:', e.message)
} finally {
  const passed = results.filter(r => r.pass).length
  console.log(`\n===== 结果: ${passed}/${results.length} 通过 =====`)
  console.log('页面错误:', consoleErrors.length ? JSON.stringify(consoleErrors) : '无')
  await browser.close()
}
