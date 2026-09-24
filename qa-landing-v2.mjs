import { chromium } from 'file:///C:/Users/许境钧/.workbuddy/binaries/node/workspace/node_modules/playwright-core/index.mjs'

const BASE = 'http://localhost:5179/#/landing'
const SS = 'D:/xjj/1/xiaozhangben-web/qa-screenshots'
const errors = []
let pass = 0, fail = 0
function check(name, cond) { if (cond) { pass++; console.log(`✅ ${name}`) } else { fail++; console.log(`❌ ${name}`) } }

const browser = await chromium.launch({ executablePath: 'C:/Users/许境钧/.agent-browser/browsers/chrome-154.0.8037.57/chrome.exe' })

// ===== 桌面端 =====
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage()
page.on('pageerror', e => errors.push('desktop: ' + e.message))
page.on('console', m => { if (m.type() === 'error') errors.push('desktop-console: ' + m.text()) })
await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 20000 })
await page.waitForTimeout(2200)

check('侧边栏不出现', await page.locator('.sidebar').count() === 0)

// 首屏 + 悬浮气泡
check('悬浮气泡x2', await page.locator('.lchip').count() === 2)
await page.screenshot({ path: `${SS}/60-v2-hero.png` })

// 统计条: 滚动触发数字动画
await page.locator('.lstats').scrollIntoViewIfNeeded()
await page.waitForTimeout(2200)
const statVals = await page.locator('.lstat-v').allTextContents()
console.log('统计数字:', JSON.stringify(statVals))
check('统计数字滚动到终值', statVals[0].includes('3') && statVals[2].includes('100'))
await page.screenshot({ path: `${SS}/61-v2-stats.png` })

// 标签带
check('标签带存在', await page.locator('.lmarq').count() === 1)

// 大场景 01 OCR
await page.locator('.lshow').first().scrollIntoViewIfNeeded()
await page.waitForTimeout(1500)
check('OCR场景: 小票+结果卡', await page.locator('.lreceipt').count() === 1 && await page.locator('.lresult').count() === 1)
await page.screenshot({ path: `${SS}/62-v2-showcase-ocr.png` })

// 大场景 02 报表
await page.locator('.lshow-alt').scrollIntoViewIfNeeded()
await page.waitForTimeout(1500)
check('报表场景: 环形图+柱状+预算条', await page.locator('.ldonut').count() === 1 && await page.locator('.lbar').count() === 7 && await page.locator('.lbudget-fill').count() === 1)
await page.screenshot({ path: `${SS}/63-v2-showcase-report.png` })

// 大场景 03 分享
const shows = page.locator('.lshow')
await shows.nth(2).scrollIntoViewIfNeeded()
await page.waitForTimeout(1500)
check('分享场景: 分享卡+同步链', await page.locator('.lshare').count() === 1 && await page.locator('.lsync-cloud').count() === 1)
await page.screenshot({ path: `${SS}/64-v2-showcase-share.png` })

// FAQ 折叠交互
await page.locator('.lfaq').scrollIntoViewIfNeeded()
await page.waitForTimeout(1200)
const faqFirst = page.locator('.lfaq1').first()
await faqFirst.locator('summary').click()
await page.waitForTimeout(500)
check('FAQ 点击展开', await faqFirst.getAttribute('open') !== null)
const faqText = await faqFirst.locator('p').textContent()
check('FAQ 内容显示', faqText.includes('免费'))
await page.screenshot({ path: `${SS}/65-v2-faq.png` })

// 页脚
await page.locator('.lft2').scrollIntoViewIfNeeded()
await page.waitForTimeout(800)
check('页脚多栏', await page.locator('.lft2-col').count() === 2)
check('页脚链接: 帮助/隐私', await page.locator('.lft2 a[href="/#/help"]').count() === 1 && await page.locator('.lft2 a[href="/#/privacy"]').count() === 1)
await page.screenshot({ path: `${SS}/66-v2-footer.png` })

// 交互闭环: 打开网页版仍跳登录页
const errsBefore = errors.length
await page.locator('.ldlb .lb1').click()
await page.waitForTimeout(1500)
check('CTA 跳转登录页', page.url().includes('/login'))
check('无横向溢出', await page.evaluate(() => document.documentElement.scrollWidth <= 1441))

// ===== 移动端 =====
const mp = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage()
mp.on('pageerror', e => errors.push('mobile: ' + e.message))
mp.on('console', m => { if (m.type() === 'error') errors.push('mobile-console: ' + m.text()) })
await mp.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 20000 })
await mp.waitForTimeout(2200)
await mp.screenshot({ path: `${SS}/67-v2-mobile-hero.png` })
await mp.locator('.lshow').first().scrollIntoViewIfNeeded()
await mp.waitForTimeout(1300)
await mp.screenshot({ path: `${SS}/68-v2-mobile-showcase.png` })
check('移动端无横向溢出', await mp.evaluate(() => document.documentElement.scrollWidth <= 391))
check('移动端 Tab 栏不出现', await mp.locator('.tabbar').count() === 0)

console.log(`\n========== 结果: ${pass} 通过, ${fail} 失败 ==========`)
console.log('页面错误:', errors.length ? errors : '无')
await browser.close()
