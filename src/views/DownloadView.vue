<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const APP_VERSION = 'v1.0.0'
const APP_NAME = '小账本'
const APK_URL = '/app-latest.apk'
const WEB_URL = window.location.origin

// Platform detection
type Platform = 'android' | 'ios' | 'desktop' | 'unknown'
const platform = ref<Platform>('unknown')
const isStandalone = ref(false)
const deferredPrompt = ref<any>(null)
const canInstallPWA = ref(false)
const installing = ref(false)
const installDone = ref(false)

onMounted(() => {
  isStandalone.value =
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as any).standalone === true

  const ua = navigator.userAgent.toLowerCase()
  if (/android/.test(ua)) {
    platform.value = 'android'
  } else if (/iphone|ipad|ipod/.test(ua)) {
    platform.value = 'ios'
  } else {
    platform.value = 'desktop'
  }

  // Listen for PWA install prompt
  window.addEventListener('beforeinstallprompt', (e: any) => {
    e.preventDefault()
    deferredPrompt.value = e
    canInstallPWA.value = true
  })
})

async function installPWA() {
  if (!deferredPrompt.value) return
  installing.value = true
  deferredPrompt.value.prompt()
  const { outcome } = await deferredPrompt.value.userChoice
  installing.value = false
  if (outcome === 'accepted') {
    installDone.value = true
    canInstallPWA.value = false
  }
  deferredPrompt.value = null
}

function downloadAPK() {
  const a = document.createElement('a')
  a.href = APK_URL
  a.download = 'xiaozhangben.apk'
  a.click()
}

function goBack() {
  router.back()
}
</script>

<template>
  <div class="min-h-screen bg-background px-5 pt-4 pb-24">
    <!-- Header -->
    <div class="flex items-center gap-3 mb-8">
      <button @click="goBack" class="p-2 rounded-xl hover:bg-surface transition">
        <span class="material-icons-round text-txt-secondary">arrow_back</span>
      </button>
      <h1 class="text-xl font-bold text-txt">下载 App</h1>
    </div>

    <!-- Hero area -->
    <div class="text-center mb-8">
      <div class="w-20 h-20 mx-auto mb-4 rounded-3xl bg-gradient-to-br from-primary to-primary-light flex items-center justify-center shadow-lg shadow-primary/30">
        <span class="text-white text-4xl">💰</span>
      </div>
      <h2 class="text-2xl font-bold text-txt mb-2">{{ APP_NAME }}</h2>
      <p class="text-sm text-txt-secondary">温暖的生活记账 · {{ APP_VERSION }}</p>
    </div>

    <!-- Feature highlights -->
    <div class="bg-white rounded-2xl p-5 mb-6">
      <div class="space-y-4">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <span class="material-icons-round text-primary text-xl">edit_note</span>
          </div>
          <div>
            <p class="text-sm font-medium text-txt">快捷记账</p>
            <p class="text-xs text-txt-hint">3 秒完成一笔记录，支持拍照识别</p>
          </div>
        </div>
        <div class="mx-4 h-px bg-surface"></div>
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <span class="material-icons-round text-primary text-xl">bar_chart</span>
          </div>
          <div>
            <p class="text-sm font-medium text-txt">智能报表</p>
            <p class="text-xs text-txt-hint">可视化分析消费趋势与分类占比</p>
          </div>
        </div>
        <div class="mx-4 h-px bg-surface"></div>
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <span class="material-icons-round text-primary text-xl">sync</span>
          </div>
          <div>
            <p class="text-sm font-medium text-txt">云端同步</p>
            <p class="text-xs text-txt-hint">多设备数据无缝同步，永不丢失</p>
          </div>
        </div>
        <div class="mx-4 h-px bg-surface"></div>
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <span class="material-icons-round text-primary text-xl">account_balance_wallet</span>
          </div>
          <div>
            <p class="text-sm font-medium text-txt">预算管理</p>
            <p class="text-xs text-txt-hint">分类预算设置，超支实时提醒</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Download section: already installed -->
    <div v-if="isStandalone" class="bg-white rounded-2xl p-5 mb-6 text-center">
      <div class="w-14 h-14 mx-auto mb-3 rounded-full bg-green-50 flex items-center justify-center">
        <span class="material-icons-round text-green-500 text-3xl">check_circle</span>
      </div>
      <p class="text-sm font-medium text-txt mb-1">你已经安装了 {{ APP_NAME }}</p>
      <p class="text-xs text-txt-hint">无需重复安装，开始记账吧！</p>
    </div>

    <!-- Android: APK download -->
    <div v-if="platform === 'android' && !isStandalone" class="mb-6">
      <h3 class="text-sm font-semibold text-txt-secondary mb-3">Android 安装包</h3>
      <button
        @click="downloadAPK"
        class="w-full bg-gradient-to-r from-primary to-primary-light text-white rounded-2xl p-5 active:scale-[0.98] transition-transform shadow-lg shadow-primary/30"
      >
        <div class="flex items-center justify-center gap-3">
          <span class="material-icons-round text-2xl">android</span>
          <div class="text-left">
            <p class="text-base font-bold">下载 APK 安装包</p>
            <p class="text-xs text-white/80 mt-0.5">适用于 Android 5.0 及以上 · {{ APP_VERSION }}</p>
          </div>
        </div>
      </button>
      <p class="text-[11px] text-txt-hint text-center mt-3 leading-relaxed">
        下载后在通知栏点击安装，或前往「设置 → 安全」开启允许安装未知来源应用
      </p>
    </div>

    <!-- iOS: Web App hint -->
    <div v-if="platform === 'ios' && !isStandalone" class="mb-6">
      <h3 class="text-sm font-semibold text-txt-secondary mb-3">iPhone / iPad 安装</h3>
      <div class="bg-white rounded-2xl p-5">
        <p class="text-sm text-txt mb-4">iOS 暂不支持直接安装，请通过 Safari 添加到主屏幕：</p>
        <div class="space-y-3">
          <div class="flex items-start gap-3">
            <div class="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
              <span class="text-xs font-bold text-primary">1</span>
            </div>
            <p class="text-sm text-txt-secondary">在 Safari 中打开 <span class="font-medium text-txt">{{ WEB_URL }}</span></p>
          </div>
          <div class="flex items-start gap-3">
            <div class="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
              <span class="text-xs font-bold text-primary">2</span>
            </div>
            <p class="text-sm text-txt-secondary">点击底部「分享」按钮 <span class="material-icons-round text-sm align-middle">ios_share</span></p>
          </div>
          <div class="flex items-start gap-3">
            <div class="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
              <span class="text-xs font-bold text-primary">3</span>
            </div>
            <p class="text-sm text-txt-secondary">选择「添加到主屏幕」即可像 App 一样使用</p>
          </div>
        </div>
      </div>
    </div>

    <!-- PWA install button (desktop / when available) -->
    <div v-if="canInstallPWA && !isStandalone" class="mb-6">
      <h3 class="text-sm font-semibold text-txt-secondary mb-3">安装到桌面</h3>
      <button
        @click="installPWA"
        :disabled="installing"
        class="w-full bg-white rounded-2xl p-4 border border-primary/20 hover:border-primary/40 transition-all"
      >
        <div class="flex items-center justify-center gap-3">
          <span class="material-icons-round text-primary text-xl">{{ installing ? 'hourglass_empty' : 'install_desktop' }}</span>
          <div class="text-left">
            <p class="text-sm font-semibold text-txt">{{ installing ? '正在安装...' : '添加到桌面' }}</p>
            <p class="text-xs text-txt-hint">像原生应用一样使用小账本</p>
          </div>
        </div>
      </button>
      <p v-if="installDone" class="text-xs text-green-500 text-center mt-2">安装成功！可以在桌面找到小账本</p>
    </div>

    <!-- Desktop: also show direct APK download for testing -->
    <div v-if="platform === 'desktop' && !canInstallPWA && !isStandalone" class="mb-6">
      <h3 class="text-sm font-semibold text-txt-secondary mb-3">下载安装包</h3>
      <div class="bg-white rounded-2xl p-5">
        <button
          @click="downloadAPK"
          class="w-full bg-gradient-to-r from-primary to-primary-light text-white rounded-xl py-3 text-sm font-semibold active:scale-[0.98] transition-transform shadow-lg shadow-primary/30 flex items-center justify-center gap-2"
        >
          <span class="material-icons-round text-lg">android</span>
          下载 Android APK
        </button>
        <p class="text-[11px] text-txt-hint text-center mt-3">传输到 Android 手机后安装即可使用</p>
      </div>
    </div>

    <!-- Open in browser CTA -->
    <div v-if="!isStandalone" class="mb-6">
      <a
        :href="WEB_URL"
        class="block bg-white rounded-2xl p-4 border border-surface hover:border-primary/20 transition-all text-center"
      >
        <div class="flex items-center justify-center gap-2">
          <span class="material-icons-round text-primary text-lg">open_in_browser</span>
          <span class="text-sm font-medium text-txt">直接使用网页版</span>
        </div>
        <p class="text-xs text-txt-hint mt-1">无需安装，浏览器直接访问</p>
      </a>
    </div>
  </div>
</template>
