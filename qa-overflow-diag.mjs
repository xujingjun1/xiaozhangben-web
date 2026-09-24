import { chromium } from 'file:///C:/Users/许境钧/.workbuddy/binaries/node/workspace/node_modules/playwright-core/index.mjs'
const SITE = 'https://xiaozhangben-ledger-88116.app.workbuddy.host'
const browser = await chromium.launch({ executablePath: 'C:/Users/许境钧/.agent-browser/browsers/chrome-154.0.8037.57/chrome.exe' })
const mp = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage()
await mp.goto(SITE + '/#/landing', { waitUntil: 'domcontentloaded', timeout: 25000 })
await mp.waitForTimeout(2500)
const info = await mp.evaluate(() => {
  const bad = []
  document.querySelectorAll('body *').forEach(el => {
    const r = el.getBoundingClientRect()
    if (r.right <= 391.5 && r.left >= -1) return
    // 若祖先有 overflow:hidden 的裁剪容器，则不会撑开文档
    let p = el.parentElement, clipped = false
    while (p) {
      const o = getComputedStyle(p).overflowX
      if (o === 'hidden' || o === 'clip' || o === 'scroll' || o === 'auto') { clipped = true; break }
      p = p.parentElement
    }
    if (!clipped) {
      const cls = typeof el.className === 'string' ? el.className : ''
      bad.push(`${el.tagName}.${cls.split(' ').slice(0,2).join('.')} left=${Math.round(r.left)} right=${Math.round(r.right)} w=${Math.round(r.width)}`)
    }
  })
  return { docW: document.documentElement.scrollWidth, bodyW: document.body.scrollWidth, culprits: bad.slice(0, 20) }
})
console.log(JSON.stringify(info, null, 2))
await browser.close()
