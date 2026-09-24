// 由 public/favicon.svg 渲染生成 PWA 两尺寸 PNG（透明圆角，可直接作 maskable）
import { chromium } from 'file:///C:/Users/许境钧/.workbuddy/binaries/node/workspace/node_modules/playwright-core/index.mjs'
import { readFileSync } from 'fs'

const CHROME = 'C:/Users/许境钧/.agent-browser/browsers/chrome-154.0.8037.57/chrome.exe'
const ROOT = 'D:/xjj/1/xiaozhangben-web'
const svg = readFileSync(ROOT + '/public/favicon.svg', 'utf8')

const browser = await chromium.launch({ executablePath: CHROME })
for (const size of [192, 512]) {
  const page = await browser.newPage({ viewport: { width: size, height: size } })
  const sized = svg.replace('<svg ', `<svg width="${size}" height="${size}" `)
  await page.setContent(`<body style="margin:0;padding:0;overflow:hidden">${sized}</body>`)
  await page.screenshot({
    path: `${ROOT}/public/pwa-${size}x${size}.png`,
    omitBackground: true,
  })
  await page.close()
  console.log(`generated pwa-${size}x${size}.png`)
}
await browser.close()
console.log('all done')
