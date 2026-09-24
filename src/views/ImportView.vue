<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '@/services/api'
import { categories } from '@/utils/helpers'
import { useImageOcr } from '@/composables/useImageOcr'
import { parseCSV, parseJSONData } from '@/utils/importParsers'
import type { ParsedExpense, ImportMode } from '@/utils/importParsers'

const router = useRouter()

const {
  ocrEngine, ocrConfigured, ocrStatusText, ocrProgress, ocrError, ocrRunning,
  localOcrReady, localOcrLoading, localOcrProgress,
  showBaiduConfig, tempApiKey, tempSecretKey, testingKeys, keyTestStatus, keyTestMsg,
  setOcrEngine, openBaiduConfig, saveBaiduConfig, testBaiduKeys, preloadLocalOCR, runOCR,
} = useImageOcr()

// --- State ---
const activeMode = ref<ImportMode>('image')
const expenses = ref<ParsedExpense[]>([])
const uploading = ref(false)
const importing = ref(false)
const importResult = ref<{ success: number; fail: number } | null>(null)
const dragOver = ref(false)
const imagePreview = ref('')
const fileName = ref('')

// --- File Upload Handlers ---
async function handleImageUpload(file: File) {
  if (!file.type.startsWith('image/')) {
    console.error(`[导入-图片] 不支持的文件类型: ${file.type}`)
    return
  }
  uploading.value = true
  fileName.value = file.name
  expenses.value = []
  const reader = new FileReader()
  reader.onload = async (e) => {
    imagePreview.value = e.target?.result as string
    uploading.value = false
    expenses.value = await runOCR(imagePreview.value)
  }
  reader.readAsDataURL(file)
}

function handleCSVUpload(file: File) {
  if (!file.name.endsWith('.csv') && !file.type.includes('csv') && !file.type.includes('text')) return
  uploading.value = true
  fileName.value = file.name
  expenses.value = []
  imagePreview.value = ''
  const reader = new FileReader()
  reader.onload = (e) => {
    expenses.value = parseCSV(e.target?.result as string)
    uploading.value = false
  }
  reader.readAsText(file, 'utf-8')
}

function handleJSONUpload(file: File) {
  uploading.value = true
  fileName.value = file.name
  expenses.value = []
  imagePreview.value = ''
  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target?.result as string)
      expenses.value = parseJSONData(data)
    } catch (err) {
      console.error('JSON parse failed:', err)
    }
    uploading.value = false
  }
  reader.readAsText(file, 'utf-8')
}

// --- File Input Handlers ---
function onFileInput(e: Event, mode: ImportMode) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  if (mode === 'image') handleImageUpload(file)
  else if (mode === 'csv') handleCSVUpload(file)
  else if (mode === 'json') handleJSONUpload(file)
  input.value = ''
}

// Drag & Drop
function onDrop(e: DragEvent) {
  dragOver.value = false
  const file = e.dataTransfer?.files?.[0]
  if (!file) return
  if (activeMode.value === 'image') handleImageUpload(file)
  else if (activeMode.value === 'csv') handleCSVUpload(file)
  else if (activeMode.value === 'json') handleJSONUpload(file)
}

function onDragOver(e: DragEvent) {
  e.preventDefault()
  dragOver.value = true
}

function onDragLeave() {
  dragOver.value = false
}

// --- Expense Editing & Verification ---
function removeExpense(id: string) {
  expenses.value = expenses.value.filter(e => e.id !== id)
}

function toggleEdit(item: ParsedExpense) {
  item.editing = !item.editing
}

function verifyItem(item: ParsedExpense) {
  item.verified = true
  item.editing = false
}

function unverifyItem(item: ParsedExpense) {
  item.verified = false
}

function verifyAll() {
  expenses.value.forEach(e => { e.verified = true })
}

function unverifyAll() {
  expenses.value.forEach(e => { e.verified = false })
}

const verifiedCount = computed(() => expenses.value.filter(e => e.verified).length)
const unverifiedCount = computed(() => expenses.value.length - verifiedCount.value)

// --- Import ---
async function importAll() {
  const toImport = expenses.value.filter(e => e.verified)
  if (toImport.length === 0) return

  importing.value = true
  importResult.value = null

  let success = 0
  let fail = 0

  for (const item of toImport) {
    const desc = item.notes ? `${item.description} [备注:${item.notes}]` : item.description
    try {
      await api.addExpense({
        amount: item.amount,
        category: item.category,
        description: desc,
        date: item.date,
        tags: item.tags,
      })
      success++
    } catch (err: any) {
      fail++
      console.error(`[导入-失败] ${item.description}: ${err?.message || err}`)
    }
  }

  importResult.value = { success, fail }
  importing.value = false

  if (success > 0) {
    expenses.value = expenses.value.filter(e => !e.verified)
    setTimeout(() => { router.push('/') }, 1500)
  }
}

const totalAmount = computed(() => expenses.value.reduce((s, e) => s + e.amount, 0))

const modes: { key: ImportMode; label: string; icon: string }[] = [
  { key: 'image', label: '图片识别', icon: 'photo_camera' },
  { key: 'csv', label: 'CSV导入', icon: 'table_chart' },
  { key: 'json', label: 'JSON导入', icon: 'code' },
]
</script>

<template>
  <div class="min-h-screen bg-background max-w-[480px] mx-auto px-5 pt-4 pb-28">
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <button @click="router.push('/settings')" class="p-2 rounded-xl hover:bg-surface transition">
        <span class="material-icons-round text-txt-secondary">arrow_back</span>
      </button>
      <h1 class="text-lg font-semibold text-txt">智能导入</h1>
      <div class="w-10"></div>
    </div>

    <!-- Mode Tabs -->
    <div class="flex bg-surface rounded-xl p-1 mb-6">
      <button
        v-for="m in modes"
        :key="m.key"
        @click="activeMode = m.key"
        class="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-lg text-sm font-medium transition-all"
        :class="activeMode === m.key
          ? 'bg-white text-primary shadow-sm'
          : 'text-txt-secondary'"
      >
        <span class="material-icons-round text-base">{{ m.icon }}</span>
        {{ m.label }}
      </button>
    </div>

    <!-- Upload Area -->
    <div
      @drop.prevent="onDrop"
      @dragover="onDragOver"
      @dragleave="onDragLeave"
      class="bg-white rounded-2xl p-6 mb-6 transition-all duration-200"
      :class="dragOver ? 'ring-2 ring-primary ring-offset-2 shadow-lg' : 'shadow-sm'"
    >
      <!-- Image Mode -->
      <template v-if="activeMode === 'image'">
        <!-- OCR 模式选择：两种模式给用户使用 -->
        <div class="flex items-center gap-2 mb-3">
          <span class="material-icons-round text-sm text-primary">tune</span>
          <span class="text-xs text-txt-secondary font-medium">选择识别模式</span>
        </div>
        <div class="grid grid-cols-2 gap-2.5 mb-4">
          <button
            @click="setOcrEngine('baidu')"
            class="text-left p-3 rounded-2xl border-2 transition-all"
            :class="ocrEngine === 'baidu' ? 'border-primary bg-primary/5 shadow-sm' : 'border-transparent bg-surface'"
          >
            <div class="flex items-center gap-1.5 mb-1">
              <span class="material-icons-round text-lg" :class="ocrEngine === 'baidu' ? 'text-primary' : 'text-txt-hint'">cloud</span>
              <span class="text-sm font-semibold" :class="ocrEngine === 'baidu' ? 'text-primary' : 'text-txt'">百度云 OCR</span>
            </div>
            <p class="text-[11px] text-txt-hint leading-snug">识别更准更快，需配置密钥</p>
          </button>
          <button
            @click="setOcrEngine('local')"
            class="text-left p-3 rounded-2xl border-2 transition-all"
            :class="ocrEngine === 'local' ? 'border-primary bg-primary/5 shadow-sm' : 'border-transparent bg-surface'"
          >
            <div class="flex items-center gap-1.5 mb-1">
              <span class="material-icons-round text-lg" :class="ocrEngine === 'local' ? 'text-primary' : 'text-txt-hint'">smartphone</span>
              <span class="text-sm font-semibold" :class="ocrEngine === 'local' ? 'text-primary' : 'text-txt'">本地 OCR</span>
            </div>
            <p class="text-[11px] text-txt-hint leading-snug">无需密钥，免费，速度较慢</p>
          </button>
        </div>
        <!-- 百度 OCR 密钥状态 -->
        <div v-if="ocrEngine === 'baidu'" class="mb-4 p-3 bg-surface rounded-xl">
          <div class="flex items-start justify-between gap-2">
            <div class="flex items-start gap-2 min-w-0">
              <span class="material-icons-round text-sm mt-0.5 shrink-0" :class="ocrConfigured ? 'text-green-500' : 'text-orange-500'">
                {{ ocrConfigured ? 'check_circle' : 'warning' }}
              </span>
              <div class="min-w-0">
                <p class="text-xs" :class="ocrConfigured ? 'text-txt-secondary' : 'text-orange-600'">
                  {{ ocrStatusText }}
                </p>
                <p v-if="!ocrConfigured" class="text-[11px] text-orange-600/80 mt-1 leading-relaxed">
                  需要先在
                  <a href="https://console.bce.baidu.com/ai/#/ai/ocr/app/list" target="_blank" rel="noopener"
                    class="underline font-medium">百度智能云控制台</a>
                  注册账号并创建“文字识别”应用，再复制 API Key 和 Secret Key。
                </p>
              </div>
            </div>
            <button @click="openBaiduConfig" class="shrink-0 text-xs text-primary font-medium px-3 py-1 bg-primary/10 rounded-lg hover:bg-primary/20 transition">
              {{ ocrConfigured ? '修改' : '去配置' }}
            </button>
          </div>
        </div>

        <!-- 本地 OCR 状态 -->
        <div v-if="ocrEngine === 'local'" class="mb-4 p-3 bg-surface rounded-xl">
          <div class="flex items-start gap-2">
            <span class="material-icons-round text-sm mt-0.5 shrink-0" :class="localOcrReady ? 'text-green-500' : 'text-primary'">
              {{ localOcrReady ? 'check_circle' : 'downloading' }}
            </span>
            <div class="flex-1 min-w-0">
              <p class="text-xs text-txt-secondary leading-relaxed">
                {{ localOcrReady ? '本地引擎已就绪，图片不会上传，离线也可识别' : '首次使用需下载中文语言包（约几 MB），请保持网络畅通' }}
              </p>
              <div v-if="localOcrLoading" class="mt-2">
                <div class="w-full h-1.5 bg-white rounded-full overflow-hidden">
                  <div class="h-full bg-primary rounded-full transition-all duration-300" :style="{ width: localOcrProgress + '%' }"></div>
                </div>
                <p class="text-[10px] text-txt-hint mt-1">语言包下载中 {{ localOcrProgress }}%</p>
              </div>
            </div>
            <button
              v-if="!localOcrReady && !localOcrLoading"
              @click="preloadLocalOCR"
              class="shrink-0 text-xs text-primary font-medium px-3 py-1 bg-primary/10 rounded-lg hover:bg-primary/20 transition"
            >预加载</button>
          </div>
        </div>

        <p v-if="ocrError" class="mb-4 p-3 rounded-xl bg-error/5 border border-error/20 text-xs text-error break-all">
          {{ ocrError }}
        </p>

        <div v-if="!imagePreview && !ocrRunning" class="flex flex-col items-center py-4">
          <span class="material-icons-round text-5xl text-primary/40 mb-3">receipt_long</span>
          <p class="text-sm text-txt-secondary mb-1">上传账单截图或收据照片</p>
          <p class="text-xs text-txt-hint mb-4">支持 JPG、PNG 格式</p>
          <div class="flex gap-3 mb-3">
            <label class="px-5 py-2.5 bg-primary/10 text-primary rounded-xl text-sm font-medium cursor-pointer hover:bg-primary/20 transition active:scale-95">
              <span class="material-icons-round text-base align-middle mr-1">photo_library</span>相册选择
              <input type="file" accept="image/*" class="hidden" @change="e => onFileInput(e, 'image')" />
            </label>
            <label class="px-5 py-2.5 bg-gradient-to-r from-primary to-primary-light text-white rounded-xl text-sm font-medium cursor-pointer hover:shadow-lg transition active:scale-95 shadow-md shadow-primary/20">
              <span class="material-icons-round text-base align-middle mr-1">photo_camera</span>拍照识别
              <input type="file" accept="image/*" capture="environment" class="hidden" @change="e => onFileInput(e, 'image')" />
            </label>
          </div>
        </div>
        <div v-else-if="ocrRunning" class="text-center py-6">
          <span class="material-icons-round text-5xl text-primary animate-pulse mb-3">document_scanner</span>
          <p class="text-sm text-txt font-medium mb-2">正在识别文字...</p>
          <div class="w-full bg-surface rounded-full h-2 mb-2">
            <div class="bg-gradient-to-r from-primary to-primary-light h-2 rounded-full transition-all duration-300"
              :style="{ width: ocrProgress + '%' }"></div>
          </div>
          <p class="text-xs text-txt-hint">{{ ocrProgress }}%</p>
        </div>
        <div v-else class="space-y-3">
          <img :src="imagePreview" class="w-full rounded-xl max-h-48 object-contain bg-surface" />
          <div class="flex gap-2">
            <label class="flex-1 py-2.5 bg-surface text-txt-secondary rounded-xl text-sm font-medium cursor-pointer hover:bg-surface/80 transition text-center active:scale-95">
              <span class="material-icons-round text-base align-middle mr-1">photo_library</span>相册
              <input type="file" accept="image/*" class="hidden" @change="e => onFileInput(e, 'image')" />
            </label>
            <label class="flex-1 py-2.5 bg-primary/10 text-primary rounded-xl text-sm font-medium cursor-pointer hover:bg-primary/20 transition text-center active:scale-95">
              <span class="material-icons-round text-base align-middle mr-1">photo_camera</span>拍照
              <input type="file" accept="image/*" capture="environment" class="hidden" @change="e => onFileInput(e, 'image')" />
            </label>
          </div>
        </div>
      </template>

      <!-- CSV Mode -->
      <template v-if="activeMode === 'csv'">
        <div class="flex flex-col items-center py-4">
          <span class="material-icons-round text-5xl text-green-400/60 mb-3">upload_file</span>
          <p class="text-sm text-txt-secondary mb-1">上传微信/支付宝账单 CSV</p>
          <p class="text-xs text-txt-hint mb-4">自动识别常见格式的列头</p>
          <label class="px-5 py-2.5 bg-green-500/10 text-green-600 rounded-xl text-sm font-medium cursor-pointer hover:bg-green-500/20 transition active:scale-95">
            <span class="material-icons-round text-base align-middle mr-1">upload</span>选择 CSV 文件
            <input type="file" accept=".csv,text/csv" class="hidden" @change="e => onFileInput(e, 'csv')" />
          </label>
          <p v-if="fileName && activeMode === 'csv'" class="text-xs text-txt-hint mt-2">
            <span class="material-icons-round text-sm align-middle mr-1">description</span>{{ fileName }}
          </p>
        </div>
      </template>

      <!-- JSON Mode -->
      <template v-if="activeMode === 'json'">
        <div class="flex flex-col items-center py-4">
          <span class="material-icons-round text-5xl text-purple-400/60 mb-3">data_object</span>
          <p class="text-sm text-txt-secondary mb-1">上传 JSON 数据文件</p>
          <p class="text-xs text-txt-hint mb-4">格式: [{ amount, category, description, date }]</p>
          <label class="px-5 py-2.5 bg-purple-500/10 text-purple-600 rounded-xl text-sm font-medium cursor-pointer hover:bg-purple-500/20 transition active:scale-95">
            <span class="material-icons-round text-base align-middle mr-1">upload</span>选择 JSON 文件
            <input type="file" accept=".json,application/json" class="hidden" @change="e => onFileInput(e, 'json')" />
          </label>
          <p v-if="fileName && activeMode === 'json'" class="text-xs text-txt-hint mt-2">
            <span class="material-icons-round text-sm align-middle mr-1">description</span>{{ fileName }}
          </p>
        </div>
      </template>

      <!-- Drag hint -->
      <p class="text-center text-xs text-txt-hint mt-3">
        <span class="material-icons-round text-sm align-middle">drag_indicator</span>
        也可以直接拖拽文件到此区域
      </p>
    </div>

    <!-- Uploading indicator -->
    <div v-if="uploading && !ocrRunning" class="text-center py-4">
      <span class="material-icons-round text-3xl text-primary animate-spin">sync</span>
      <p class="text-sm text-txt-secondary mt-2">正在读取文件...</p>
    </div>

    <!-- Preview List -->
    <template v-if="expenses.length > 0">
      <div class="flex items-center justify-between mb-3">
        <h2 class="text-base font-semibold text-txt">识别结果</h2>
        <span class="text-sm text-txt-hint">{{ expenses.length }} 笔 · 合计 ¥{{ totalAmount.toFixed(2) }}</span>
      </div>

      <!-- 校验工具栏 -->
      <div class="bg-white rounded-2xl p-4 mb-4 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="flex items-center gap-1.5">
            <span class="w-2.5 h-2.5 rounded-full bg-green-500"></span>
            <span class="text-xs text-txt-secondary">已校验 {{ verifiedCount }}</span>
          </div>
          <div class="flex items-center gap-1.5">
            <span class="w-2.5 h-2.5 rounded-full bg-orange-400"></span>
            <span class="text-xs text-txt-secondary">待校验 {{ unverifiedCount }}</span>
          </div>
        </div>
        <div class="flex gap-2">
          <button
            v-if="unverifiedCount > 0"
            @click="verifyAll"
            class="px-3 py-1.5 text-xs font-medium bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition active:scale-95"
          >全部通过</button>
          <button
            v-if="verifiedCount > 0"
            @click="unverifyAll"
            class="px-3 py-1.5 text-xs font-medium bg-surface text-txt-secondary rounded-lg hover:bg-surface/80 transition active:scale-95"
          >重置</button>
        </div>
      </div>

      <div class="space-y-3 mb-6">
        <div
          v-for="item in expenses"
          :key="item.id"
          class="bg-white rounded-2xl shadow-sm overflow-hidden transition-all duration-200"
        >
          <!-- View mode -->
          <div v-if="!item.editing" class="flex items-center px-4 py-3.5 gap-3">
            <div class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 relative"
              :style="{ backgroundColor: (categories.find(c => c.name === item.category)?.color || '#B8B5D0') + '18' }">
              <span class="material-icons-round text-lg"
                :style="{ color: categories.find(c => c.name === item.category)?.color || '#B8B5D0' }">
                {{ categories.find(c => c.name === item.category)?.icon || 'more_horiz' }}
              </span>
              <span v-if="item.verified" class="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                <span class="material-icons-round text-white" style="font-size: 10px;">check</span>
              </span>
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-1.5">
                <p class="text-sm font-medium text-txt truncate">{{ item.description }}</p>
                <span v-if="item.verified" class="text-[10px] text-green-500 font-medium shrink-0">已校验</span>
                <span v-else class="text-[10px] text-orange-400 font-medium shrink-0">待校验</span>
              </div>
              <div class="flex items-center gap-2 mt-0.5">
                <span class="text-xs text-txt-hint">{{ item.category }}</span>
                <span class="text-xs text-txt-hint">·</span>
                <span class="text-xs text-txt-hint">{{ item.date }}</span>
              </div>
              <p v-if="item.notes" class="text-xs text-primary mt-0.5 truncate">备注: {{ item.notes }}</p>
            </div>
            <p class="text-base font-semibold text-expense shrink-0">-¥{{ item.amount.toFixed(2) }}</p>
            <div class="flex items-center gap-1 shrink-0">
              <button v-if="!item.verified" @click="verifyItem(item)" class="p-1.5 rounded-lg bg-green-50 hover:bg-green-100 transition" title="校验通过">
                <span class="material-icons-round text-sm text-green-500">check</span>
              </button>
              <button v-else @click="unverifyItem(item)" class="p-1.5 rounded-lg bg-orange-50 hover:bg-orange-100 transition" title="取消校验">
                <span class="material-icons-round text-sm text-orange-400">undo</span>
              </button>
              <button @click="toggleEdit(item)" class="p-1.5 rounded-lg hover:bg-surface transition">
                <span class="material-icons-round text-sm text-txt-hint">edit</span>
              </button>
              <button @click="removeExpense(item.id)" class="p-1.5 rounded-lg hover:bg-red-50 transition">
                <span class="material-icons-round text-sm text-error">close</span>
              </button>
            </div>
          </div>

          <!-- Edit mode -->
          <div v-else class="p-4 space-y-3">
            <div class="flex items-center gap-2">
              <label class="text-xs text-txt-secondary w-12 shrink-0">金额</label>
              <input
                v-model.number="item.amount"
                type="number"
                step="0.01"
                class="flex-1 bg-surface rounded-lg px-3 py-2 text-sm text-txt outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div class="flex items-center gap-2">
              <label class="text-xs text-txt-secondary w-12 shrink-0">说明</label>
              <input
                v-model="item.description"
                class="flex-1 bg-surface rounded-lg px-3 py-2 text-sm text-txt outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div class="flex items-center gap-2">
              <label class="text-xs text-txt-secondary w-12 shrink-0">日期</label>
              <input
                v-model="item.date"
                type="date"
                class="flex-1 bg-surface rounded-lg px-3 py-2 text-sm text-txt outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div class="flex items-center gap-2">
              <label class="text-xs text-txt-secondary w-12 shrink-0">分类</label>
              <select
                v-model="item.category"
                class="flex-1 bg-surface rounded-lg px-3 py-2 text-sm text-txt outline-none focus:ring-1 focus:ring-primary"
              >
                <option v-for="cat in categories" :key="cat.name" :value="cat.name">{{ cat.name }}</option>
              </select>
            </div>
            <div class="flex items-center gap-2">
              <label class="text-xs text-txt-secondary w-12 shrink-0">备注</label>
              <input
                v-model="item.notes"
                placeholder="添加备注..."
                class="flex-1 bg-surface rounded-lg px-3 py-2 text-sm text-txt outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div class="flex gap-2 pt-1">
              <button @click="verifyItem(item)"
                class="flex-1 py-2 rounded-xl text-sm font-medium bg-gradient-to-r from-primary to-primary-light text-white active:scale-95 transition shadow-sm shadow-primary/20">
                <span class="material-icons-round text-sm align-middle mr-1">check</span>确认校验
              </button>
              <button @click="removeExpense(item.id)"
                class="py-2 px-4 rounded-xl text-sm font-medium bg-red-50 text-error active:scale-95 transition">
                删除
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Import Button -->
      <div v-if="unverifiedCount > 0" class="bg-orange-50 rounded-2xl p-4 mb-4 flex items-center gap-3">
        <span class="material-icons-round text-orange-400">info</span>
        <p class="text-sm text-orange-600">还有 <strong>{{ unverifiedCount }}</strong> 笔记录待校验，校验后才能导入</p>
      </div>
      <button
        @click="importAll"
        :disabled="importing || verifiedCount === 0"
        class="w-full py-4 text-white text-lg font-semibold rounded-2xl shadow-lg active:scale-95 transition-all disabled:opacity-50 disabled:active:scale-100"
        :class="verifiedCount > 0 ? 'bg-gradient-to-r from-primary to-primary-light shadow-primary/30' : 'bg-gray-300'"
      >
        <span v-if="importing" class="material-icons-round text-xl align-middle mr-2 animate-spin">sync</span>
        <span v-else class="material-icons-round text-xl align-middle mr-2">file_download</span>
        {{ importing ? '导入中...' : verifiedCount > 0 ? `确认导入 (${verifiedCount} 笔已校验)` : '请先校验记录' }}
      </button>
    </template>

    <!-- Empty state -->
    <div v-if="!uploading && !ocrRunning && expenses.length === 0" class="text-center py-12">
      <span class="material-icons-round text-5xl text-txt-hint/30 mb-3">cloud_upload</span>
      <p class="text-sm text-txt-hint">请上传文件以开始导入</p>
    </div>

    <!-- Import Result -->
    <div
      v-if="importResult"
      class="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-6"
    >
      <div class="bg-white rounded-2xl p-6 w-full max-w-sm text-center">
        <span
          class="material-icons-round text-5xl mb-3"
          :class="importResult.fail === 0 ? 'text-green-500' : 'text-primary'"
        >
          {{ importResult.fail === 0 ? 'check_circle' : 'info' }}
        </span>
        <h3 class="text-lg font-semibold text-txt mb-2">导入完成</h3>
        <div class="space-y-1 mb-4">
          <p class="text-sm text-green-500">成功导入 {{ importResult.success }} 笔记录</p>
          <p v-if="importResult.fail > 0" class="text-sm text-error">失败 {{ importResult.fail }} 笔</p>
        </div>
        <p class="text-xs text-txt-hint mb-4">即将跳转到首页...</p>
        <button
          @click="router.push('/')"
          class="w-full py-3 bg-gradient-to-r from-primary to-primary-light text-white rounded-xl font-medium active:scale-95 transition"
        >
          返回首页
        </button>
      </div>
    </div>
  </div>

  <!-- 百度 OCR 密钥配置弹窗 -->
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="showBaiduConfig" class="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-6">
        <div class="bg-white rounded-2xl w-full max-w-sm p-6 shadow-xl">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-bold text-txt">百度 OCR 配置</h3>
            <button @click="showBaiduConfig = false" class="w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface transition">
              <span class="material-icons-round text-txt-hint">close</span>
            </button>
          </div>
          <div class="bg-blue-50 rounded-xl p-3 mb-4">
            <p class="text-xs text-blue-700 font-medium mb-1.5">如何获取百度 OCR 密钥：</p>
            <ol class="text-xs text-blue-700 leading-relaxed list-decimal list-inside space-y-1">
              <li>
                注册/登录
                <a href="https://console.bce.baidu.com/ai/#/ai/ocr/app/list" target="_blank" rel="noopener"
                  class="underline font-medium">百度智能云</a>；
              </li>
              <li>进入“文字识别 OCR”控制台，创建一个应用；</li>
              <li>在应用列表中复制 <span class="font-mono">API Key</span> 和 <span class="font-mono">Secret Key</span>。</li>
            </ol>
            <p class="text-[11px] text-blue-600/80 leading-relaxed mt-2">
              通用文字识别每月有免费额度；不想配置密钥也可以直接使用上方的“本地”识别引擎，无需 Key，但速度较慢。
            </p>
          </div>
          <div class="space-y-3 mb-4">
            <div>
              <label class="text-xs text-txt-secondary font-medium mb-1 block">API Key</label>
              <input v-model="tempApiKey" placeholder="请输入 API Key"
                class="w-full bg-surface rounded-xl px-4 py-3 text-sm font-mono outline-none focus:ring-2 focus:ring-primary/30 transition" />
            </div>
            <div>
              <label class="text-xs text-txt-secondary font-medium mb-1 block">Secret Key</label>
              <input v-model="tempSecretKey" type="password" placeholder="请输入 Secret Key"
                class="w-full bg-surface rounded-xl px-4 py-3 text-sm font-mono outline-none focus:ring-2 focus:ring-primary/30 transition" />
            </div>
          </div>
          <p v-if="keyTestStatus === 'ok'" class="text-xs text-green-600 mb-3">{{ keyTestMsg }}</p>
          <p v-else-if="keyTestStatus === 'fail'" class="text-xs text-error mb-3">{{ keyTestMsg }}</p>
          <div class="flex gap-2">
            <button @click="testBaiduKeys"
              :disabled="!tempApiKey || !tempSecretKey || testingKeys"
              class="flex-1 py-3 rounded-xl font-medium transition-all active:scale-95 border"
              :class="(tempApiKey && tempSecretKey) ? 'border-primary text-primary hover:bg-primary/5' : 'border-gray-200 text-gray-400 cursor-not-allowed'">
              {{ testingKeys ? '测试中...' : '测试连接' }}
            </button>
            <button @click="saveBaiduConfig"
              :disabled="!tempApiKey || !tempSecretKey"
              class="flex-1 py-3 rounded-xl font-medium text-white transition-all active:scale-95"
              :class="(tempApiKey && tempSecretKey) ? 'bg-gradient-to-r from-primary to-primary-light' : 'bg-gray-300 cursor-not-allowed'">
              保存配置
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
