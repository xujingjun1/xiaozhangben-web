// 生成 Android launcher 图标（自适应图标 foreground / legacy 方形 / legacy 圆形）
// 数据源统一为 public/favicon.svg，避免再次出现"图标换了 App 没跟上"
import { chromium } from 'file:///C:/Users/许境钧/.workbuddy/binaries/node/workspace/node_modules/playwright-core/index.mjs'
import { readFileSync } from 'fs'

const CHROME = 'C:/Users/许境钧/.agent-browser/browsers/chrome-154.0.8037.57/chrome.exe'
const ROOT = 'D:/xjj/1/xiaozhangben-web'
const RES = ROOT + '/android/app/src/main/res'

const bg = '#6C63FF'

// 原 favicon 内容（去掉紫色圆角底板），包围盒 x:132~414 y:96~426，中心 (273,261)
const content = `
  <rect x="132" y="116" width="248" height="280" rx="26" fill="#FFFFFF"/>
  <path d="M132 142 Q132 116 158 116 L176 116 L176 396 L158 396 Q132 396 132 370 Z" fill="#D9D4FF"/>
  <path d="M300 96 L332 96 L332 172 L316 156 L300 172 Z" fill="#FF6B6B"/>
  <line x1="208" y1="200" x2="332" y2="200" stroke="#6C63FF" stroke-width="18" stroke-linecap="round"/>
  <line x1="208" y1="248" x2="306" y2="248" stroke="#6C63FF" stroke-width="18" stroke-linecap="round"/>
  <line x1="208" y1="296" x2="318" y2="296" stroke="#6C63FF" stroke-width="18" stroke-linecap="round"/>
  <circle cx="360" cy="372" r="54" fill="#FFC94D"/>
  <path d="M340 344 L360 368 L380 344" fill="none" stroke="#FFFFFF" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>
  <line x1="360" y1="368" x2="360" y2="398" stroke="#FFFFFF" stroke-width="12" stroke-linecap="round"/>
  <line x1="344" y1="376" x2="376" y2="376" stroke="#FFFFFF" stroke-width="10" stroke-linecap="round"/>
  <line x1="344" y1="390" x2="376" y2="390" stroke="#FFFFFF" stroke-width="10" stroke-linecap="round"/>
`.trim()

// foreground：透明底 + 内容缩放到安全区（中心 66dp 圆内），0.72 为不裁切上限
const fgSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <g transform="translate(256,256) scale(0.72) translate(-273,-261)">${content}</g>
</svg>`

// legacy 方形：紫底圆角 + 内容（即 favicon 本体）
const legacySvg = readFileSync(ROOT + '/public/favicon.svg', 'utf8')

// legacy 圆形：圆形紫底 + 内容
const roundSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <circle cx="256" cy="256" r="256" fill="${bg}"/>
  ${content}
</svg>`

const densities = [
  { dir: 'mipmap-mdpi', fg: 108, icon: 48 },
  { dir: 'mipmap-hdpi', fg: 162, icon: 72 },
  { dir: 'mipmap-xhdpi', fg: 216, icon: 96 },
  { dir: 'mipmap-xxhdpi', fg: 324, icon: 144 },
  { dir: 'mipmap-xxxhdpi', fg: 432, icon: 192 },
]

const browser = await chromium.launch({ executablePath: CHROME })

async function render(svg, size, path) {
  const page = await browser.newPage({ viewport: { width: size, height: size } })
  const sized = svg.replace('<svg ', `<svg width="${size}" height="${size}" `)
  await page.setContent(`<body style="margin:0;padding:0;overflow:hidden">${sized}</body>`)
  await page.screenshot({ path, omitBackground: true })
  await page.close()
}

for (const d of densities) {
  await render(fgSvg, d.fg, `${RES}/${d.dir}/ic_launcher_foreground.png`)
  await render(legacySvg, d.icon, `${RES}/${d.dir}/ic_launcher.png`)
  await render(roundSvg, d.icon, `${RES}/${d.dir}/ic_launcher_round.png`)
  console.log(`${d.dir}: foreground ${d.fg}px, launcher/round ${d.icon}px`)
}

await browser.close()
console.log('android icons generated')
