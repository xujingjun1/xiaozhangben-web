import { chromium } from 'file:///C:/Users/许境钧/.workbuddy/binaries/node/workspace/node_modules/playwright-core/index.mjs'
const SITE = 'https://xiaozhangben-ledger-88116.app.workbuddy.host'
const SS = 'D:/xjj/1/xiaozhangben-web/qa-screenshots'
const errors = []
let pass = 0, fail = 0
function check(name, cond) { if (cond) { pass++; console.log(`✅ ${name}`) } else { fail++; console.log(`❌ ${name}`) } }

const browser = await chromium.launch({ executablePath: 'C:/Users/许境钧/.agent-browser/browsers/chrome-154.0.8037.57/chrome.exe' })
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage()
page.on('pageerror', e => errors.push(e.message))
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()) })

await page.goto(SITE + '/', { waitUntil: 'domcontentloaded', timeout: 25000 })
await page.waitForTimeout(2500)
check('未登录跳落地页', page.url().includes('/landing'))
check('悬浮气泡x2', await page.locator('.lchip').count() === 2)
await page.screenshot({ path: `${SS}/70-online-v2-hero.png` })

await page.locator('.lstats').scrollIntoViewIfNeeded()
await page.waitForTimeout(2200)
const statVals = await page.locator('.lstat-v').allTextContents()
check('统计数字动画', statVals[0].includes('3') && statVals[2].includes('100'))

await page.locator('.lshow-alt').scrollIntoViewIfNeeded()
await page.waitForTimeout(1500)
const barsVisible = await page.locator('.lbars').evaluate(el => { const r = el.getBoundingClientRect(); return r.width > 100 })
check('报表场景柱状图可见', barsVisible)
await page.screenshot({ path: `${SS}/71-online-v2-report.png` })

await page.locator('.lfaq1').first().locator('summary').click()
await page.waitForTimeout(400)
check('FAQ 展开', await page.locator('.lfaq1').first().getAttribute('open') !== null)

await page.locator('.ldlb .lb1').click()
await page.waitForTimeout(1500)
check('CTA 跳登录页', page.url().includes('/login'))

// 移动端
const mp = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage()
mp.on('pageerror', e => errors.push('mobile: ' + e.message))
await mp.goto(SITE + '/#/landing', { waitUntil: 'domcontentloaded', timeout: 25000 })
await mp.waitForTimeout(2500)
await mp.screenshot({ path: `${SS}/72-online-v2-mobile.png` })
check('移动端无横向溢出', await mp.evaluate(() => document.documentElement.scrollWidth <= 391))

console.log(`\n========== 线上终验: ${pass} 通过, ${fail} 失败 ==========`)
console.log('页面错误:', errors.length ? errors : '无')
await browser.close()
