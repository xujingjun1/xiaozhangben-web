<script setup lang="ts">
import { ref, watch } from 'vue'
import QRCode from 'qrcode'
import { useExpenseStore } from '@/stores/expense'
import { getCategoryInfo } from '@/utils/helpers'

const store = useExpenseStore()

const props = defineProps<{ visible: boolean }>()
const emit = defineEmits<{ (e: 'close'): void }>()

const W = 750
const H = 1340
const canvasRef = ref<HTMLCanvasElement | null>(null)
const imageUrl = ref('')
const canShare = ref(false)
const generating = ref(false)

const FONT = '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif'

watch(() => props.visible, async (v) => {
  if (v) {
    canShare.value = !!(navigator as any).canShare || !!navigator.share
    await nextFrame()
    await generate()
  }
})

function nextFrame() {
  return new Promise(r => requestAnimationFrame(() => setTimeout(r, 30)))
}

function fmt(amount: number): string {
  if (amount >= 10000) return (amount / 10000).toFixed(2) + '万'
  return amount.toFixed(2)
}

// 引流二维码：扫码打开应用。可通过 localStorage['app_share_url'] 自定义落地链接
function getShareUrl(): string {
  return localStorage.getItem('app_share_url') || (location.origin + '/#/login')
}

async function getQrImage(size: number): Promise<HTMLImageElement | null> {
  try {
    const dataUrl = await QRCode.toDataURL(getShareUrl(), {
      margin: 1,
      width: size * 2, // 2x 提升清晰度
      color: { dark: '#554BD8', light: '#FFFFFF' },
      errorCorrectionLevel: 'M',
    })
    return await new Promise(resolve => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = () => resolve(null)
      img.src = dataUrl
    })
  } catch {
    return null
  }
}

async function generate() {
  const canvas = canvasRef.value
  if (!canvas) return
  generating.value = true
  try {
    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, W, H)

    // ===== 背景渐变 (品牌紫 #6C63FF) =====
    const bg = ctx.createLinearGradient(0, 0, 0, H)
    bg.addColorStop(0, '#7C74FF')
    bg.addColorStop(0.45, '#6C63FF')
    bg.addColorStop(1, '#554BD8')
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, W, H)

    // 顶部装饰圆
    ctx.globalAlpha = 0.08
    ctx.fillStyle = '#FFFFFF'
    ctx.beginPath(); ctx.arc(660, 90, 190, 0, Math.PI * 2); ctx.fill()
    ctx.beginPath(); ctx.arc(60, 260, 120, 0, Math.PI * 2); ctx.fill()
    ctx.globalAlpha = 1

    // ===== 品牌区 =====
    ctx.textAlign = 'center'
    ctx.fillStyle = 'rgba(255,255,255,0.95)'
    ctx.font = `600 40px ${FONT}`
    ctx.fillText('小账本', W / 2, 100)
    ctx.fillStyle = 'rgba(255,255,255,0.55)'
    ctx.font = `400 22px ${FONT}`
    ctx.fillText('温暖的生活记账', W / 2, 136)

    // ===== 月份标题 =====
    ctx.fillStyle = '#FFFFFF'
    ctx.font = `700 64px ${FONT}`
    ctx.fillText(`${store.selectedYear}年${store.selectedMonth}月账单`, W / 2, 250)

    // ===== 总览卡片 =====
    const cardX = 60, cardY = 300, cardW = W - 120, cardH = 320
    roundRect(ctx, cardX, cardY, cardW, cardH, 36)
    ctx.fillStyle = 'rgba(255,255,255,0.14)'
    ctx.fill()

    // 第一行: 总支出大字
    ctx.textAlign = 'center'
    ctx.fillStyle = 'rgba(255,255,255,0.6)'
    ctx.font = `400 26px ${FONT}`
    ctx.fillText('总支出', W / 2, cardY + 56)
    ctx.fillStyle = '#FFD3D3'
    ctx.font = `700 72px ${FONT}`
    ctx.fillText('¥' + fmt(store.monthTotal), W / 2, cardY + 140)

    // 分隔线
    ctx.strokeStyle = 'rgba(255,255,255,0.18)'
    ctx.lineWidth = 2
    ctx.beginPath(); ctx.moveTo(cardX + 40, cardY + 182); ctx.lineTo(cardX + cardW - 40, cardY + 182); ctx.stroke()

    // 第二行: 结余 / 总收入 两栏小字
    const rows = [
      { label: '结余', value: fmt(store.monthIncome - store.monthTotal), color: '#D7F5E3' },
      { label: '总收入', value: fmt(store.monthIncome), color: '#D3E5FF' },
    ]
    rows.forEach((c, i) => {
      const cx = cardX + cardW * (0.28 + i * 0.44)
      ctx.fillStyle = 'rgba(255,255,255,0.6)'
      ctx.font = `400 24px ${FONT}`
      ctx.fillText(c.label, cx, cardY + 222)
      ctx.fillStyle = c.color
      ctx.font = `700 42px ${FONT}`
      ctx.fillText(c.value, cx, cardY + 276)
    })

    // 第三行: 笔数统计
    const recordCount = store.monthExpenses.length
    const activeDays = Object.keys(store.dailyTotals).length
    ctx.fillStyle = 'rgba(255,255,255,0.55)'
    ctx.font = `400 22px ${FONT}`
    ctx.fillText(`本月记账 ${recordCount} 笔 · 坚持 ${activeDays} 天`, W / 2, cardY + 316)

    // ===== 分类排行 (Top 4) =====
    const entries = Object.entries(store.categoryTotals).sort((a, b) => b[1] - a[1]).slice(0, 4)
    if (entries.length) {
      ctx.textAlign = 'left'
      ctx.fillStyle = 'rgba(255,255,255,0.9)'
      ctx.font = `600 32px ${FONT}`
      ctx.fillText('消费构成', 84, 680)

      const listY = 720
      const rowH = 96
      const maxVal = entries[0][1]
      entries.forEach(([name, amount], i) => {
        const y = listY + i * rowH
        const info = getCategoryInfo(name)
        const percent = store.monthTotal > 0 ? Math.round((amount / store.monthTotal) * 100) : 0

        // 图标底色块
        roundRect(ctx, 84, y, 64, 64, 18)
        ctx.fillStyle = 'rgba(255,255,255,0.16)'
        ctx.fill()
        // 用分类名首字代替图标 (canvas 无 material icons)
        ctx.textAlign = 'center'
        ctx.fillStyle = '#FFFFFF'
        ctx.font = `600 30px ${FONT}`
        ctx.fillText(name.slice(0, 1), 116, y + 43)

        // 分类名 + 百分比
        ctx.textAlign = 'left'
        ctx.fillStyle = '#FFFFFF'
        ctx.font = `600 30px ${FONT}`
        ctx.fillText(name, 172, y + 30)
        ctx.fillStyle = 'rgba(255,255,255,0.55)'
        ctx.font = `400 24px ${FONT}`
        ctx.fillText(`${percent}%`, 172, y + 62)

        // 金额
        ctx.textAlign = 'right'
        ctx.fillStyle = '#FFFFFF'
        ctx.font = `700 32px ${FONT}`
        ctx.fillText('¥' + fmt(amount), W - 84, y + 46)

        // 进度条
        const barX = 84, barW = W - 168, barY = y + 76, barH = 12
        roundRect(ctx, barX, barY, barW, barH, 6)
        ctx.fillStyle = 'rgba(255,255,255,0.15)'
        ctx.fill()
        const w = maxVal > 0 ? (amount / maxVal) * barW : 0
        if (w > 0) {
          roundRect(ctx, barX, barY, w, barH, 6)
          ctx.fillStyle = info.color
          ctx.fill()
        }
      })
    }

    // ===== 底部：引流二维码 =====
    const qrSize = 132
    const qrImg = await getQrImage(qrSize)
    if (qrImg) {
      // 白色圆角卡片托底
      roundRect(ctx, 84, 1130, qrSize + 28, qrSize + 28, 20)
      ctx.fillStyle = '#FFFFFF'
      ctx.fill()
      ctx.drawImage(qrImg, 98, 1144, qrSize, qrSize)
    } else {
      // 二维码生成失败时退化为纯文字
      ctx.textAlign = 'center'
      ctx.fillStyle = 'rgba(255,255,255,0.85)'
      ctx.font = `500 30px ${FONT}`
      ctx.fillText('记录生活的每一笔温暖', W / 2, H - 90)
    }

    // 右侧文案
    ctx.textAlign = 'left'
    ctx.fillStyle = 'rgba(255,255,255,0.95)'
    ctx.font = `600 36px ${FONT}`
    ctx.fillText('记录生活的每一笔温暖', 286, 1178)
    ctx.fillStyle = 'rgba(255,255,255,0.65)'
    ctx.font = `400 24px ${FONT}`
    ctx.fillText('扫码和我一起记账', 286, 1222)
    ctx.fillStyle = 'rgba(255,255,255,0.45)'
    ctx.font = `400 22px ${FONT}`
    ctx.fillText('来自小账本 · 无广告 · 数据自主', 286, 1262)

    // 生成图片
    imageUrl.value = canvas.toDataURL('image/png')
  } finally {
    generating.value = false
  }
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

async function saveImage() {
  if (!imageUrl.value) return
  const a = document.createElement('a')
  a.href = imageUrl.value
  a.download = `小账本-${store.selectedYear}年${store.selectedMonth}月账单.png`
  document.body.appendChild(a)
  a.click()
  a.remove()
}

async function shareImage() {
  if (!imageUrl.value) return
  try {
    const blob = await (await fetch(imageUrl.value)).blob()
    const file = new File([blob], `小账本月账单.png`, { type: 'image/png' })
    if ((navigator as any).canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: '我的月度账单', text: `小账本 ${store.selectedYear}年${store.selectedMonth}月账单` })
    } else {
      await saveImage()
    }
  } catch {
    // 用户取消分享，忽略
  }
}

function close() {
  imageUrl.value = ''
  emit('close')
}
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="visible" class="fixed inset-0 z-[210] flex flex-col items-center justify-center" @click.self="close">
        <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="close"></div>
        <div class="relative flex flex-col items-center max-h-[92vh] w-full px-4">
          <h3 class="text-lg font-bold text-white mb-3 drop-shadow">我的月度账单</h3>

          <div class="relative rounded-2xl overflow-hidden shadow-2xl">
            <canvas ref="canvasRef" :width="W" :height="H" class="block w-[280px] h-[500px] bg-primary/30"></canvas>
            <div v-if="generating" class="absolute inset-0 flex items-center justify-center bg-black/30">
              <span class="text-white text-sm">生成中...</span>
            </div>
          </div>

          <div class="flex items-center gap-3 mt-4">
            <button v-if="canShare" @click="shareImage"
              class="px-6 py-3 rounded-2xl font-semibold text-white bg-gradient-to-r from-primary to-primary-light shadow-lg shadow-primary/40 active:scale-95 transition">
              分享
            </button>
            <button @click="saveImage"
              class="px-6 py-3 rounded-2xl font-semibold text-primary bg-white shadow-lg active:scale-95 transition">
              保存图片
            </button>
            <button @click="close"
              class="w-12 h-12 rounded-2xl flex items-center justify-center text-white/80 bg-white/15 active:scale-95 transition">
              <span class="material-icons-round">close</span>
            </button>
          </div>

          <p class="text-white/50 text-xs mt-3">图片已去除个人明细，仅展示汇总数据</p>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
