import { ref, computed, onMounted, onUnmounted } from 'vue'
import { api } from '@/services/api'
import { parseOCRText } from '@/utils/importParsers'
import type { ParsedExpense } from '@/utils/importParsers'

export function useImageOcr() {
  const baiduApiKey = ref(localStorage.getItem('baidu_api_key') || '')
  const baiduSecretKey = ref(localStorage.getItem('baidu_secret_key') || '')
  const showBaiduConfig = ref(false)
  const tempApiKey = ref('')
  const tempSecretKey = ref('')
  const ocrEngine = ref<'baidu' | 'local'>((localStorage.getItem('ocr_engine') as 'baidu' | 'local') || 'baidu')
  const serverOcrConfigured = ref(localStorage.getItem('ocr_server_configured') === 'true')
  const ocrConfigured = computed(() =>
    Boolean((baiduApiKey.value && baiduSecretKey.value) || serverOcrConfigured.value)
  )
  const ocrStatusText = computed(() => {
    if (baiduApiKey.value && baiduSecretKey.value) return '百度 OCR 已配置（使用本地密钥）'
    if (serverOcrConfigured.value) return '服务端已配置 OCR 密钥，可直接识别'
    return '未配置百度密钥，将自动使用本地识别（较慢）'
  })
  const testingKeys = ref(false)
  const keyTestStatus = ref<'' | 'ok' | 'fail'>('')
  const keyTestMsg = ref('')
  const ocrProgress = ref(0)
  const ocrError = ref('')
  const ocrRunning = ref(false)

  const localOcrReady = ref(false)
  const localOcrLoading = ref(false)
  const localOcrProgress = ref(0)
  let localWorkerPromise: Promise<any> | null = null

  async function loadServerOcrConfig() {
    try {
      const data: any = await api.getOcrConfig()
      serverOcrConfigured.value = !!data.configured
      if (data.configured) localStorage.setItem('ocr_server_configured', 'true')
      else localStorage.removeItem('ocr_server_configured')
    } catch (e) {
      console.log('[OCR] 无法获取服务端 OCR 配置:', e)
    }
  }

  onMounted(loadServerOcrConfig)

  function setOcrEngine(engine: 'baidu' | 'local') {
    ocrEngine.value = engine
    localStorage.setItem('ocr_engine', engine)
  }

  function openBaiduConfig() {
    tempApiKey.value = baiduApiKey.value
    tempSecretKey.value = baiduSecretKey.value
    keyTestStatus.value = ''
    keyTestMsg.value = ''
    showBaiduConfig.value = true
  }

  function saveBaiduConfig() {
    if (!tempApiKey.value || !tempSecretKey.value) return
    localStorage.setItem('baidu_api_key', tempApiKey.value)
    localStorage.setItem('baidu_secret_key', tempSecretKey.value)
    baiduApiKey.value = tempApiKey.value
    baiduSecretKey.value = tempSecretKey.value
    keyTestStatus.value = ''
    keyTestMsg.value = ''
    showBaiduConfig.value = false
  }

  async function testBaiduKeys() {
    if (!tempApiKey.value || !tempSecretKey.value || testingKeys.value) return
    testingKeys.value = true
    keyTestStatus.value = ''
    keyTestMsg.value = ''
    try {
      await api.verifyOcrKeys(tempApiKey.value, tempSecretKey.value)
      keyTestStatus.value = 'ok'
      keyTestMsg.value = '密钥验证成功，可以保存使用'
    } catch (e: any) {
      keyTestStatus.value = 'fail'
      keyTestMsg.value = e?.message || '密钥验证失败，请检查 Key 是否正确'
    } finally {
      testingKeys.value = false
    }
  }

  async function getLocalWorker(): Promise<any> {
    if (localWorkerPromise) return localWorkerPromise
    localOcrLoading.value = true
    localOcrProgress.value = 0
    localWorkerPromise = (async () => {
      const { createWorker } = await import('tesseract.js')
      const worker = await createWorker('chi_sim+eng', 1, {
        logger: (m: any) => {
          const pct = Math.round((m.progress || 0) * 100)
          localOcrProgress.value = pct
          if (m.status === 'recognizing text') ocrProgress.value = pct
        },
      })
      localOcrReady.value = true
      localOcrLoading.value = false
      return worker
    })().catch((err) => {
      localWorkerPromise = null
      localOcrReady.value = false
      localOcrLoading.value = false
      throw err
    })
    return localWorkerPromise
  }

  async function preloadLocalOCR() {
    if (localOcrReady.value || localOcrLoading.value) return
    ocrError.value = ''
    try {
      await getLocalWorker()
    } catch (err: any) {
      ocrError.value = '本地语言包下载失败：' + (err?.message || '请检查网络后重试')
    }
  }

  async function runOCR(imageSrc: string): Promise<ParsedExpense[]> {
    ocrRunning.value = true
    ocrProgress.value = 0
    ocrError.value = ''
    try {
      if (ocrEngine.value === 'baidu' && ((baiduApiKey.value && baiduSecretKey.value) || serverOcrConfigured.value)) {
        const base64Data = imageSrc.includes(',') ? imageSrc.split(',')[1] : imageSrc
        const data: any = await api.ocrBaidu({
          image: base64Data,
          apiKey: baiduApiKey.value || '',
          secretKey: baiduSecretKey.value || '',
          type: 'accurate',
        })
        ocrProgress.value = 100
        return parseOCRText(data.text || '')
      }
      const worker = await getLocalWorker()
      const result = await worker.recognize(imageSrc)
      return parseOCRText(result.data.text || '')
    } catch (err: any) {
      ocrError.value = '识别失败：' + (err?.message || '请稍后重试')
      return []
    } finally {
      ocrRunning.value = false
    }
  }

  onUnmounted(() => {
    localWorkerPromise?.then(w => w.terminate()).catch(() => {})
    localWorkerPromise = null
  })

  return {
    baiduApiKey, baiduSecretKey, showBaiduConfig, tempApiKey, tempSecretKey,
    ocrEngine, ocrConfigured, ocrStatusText, testingKeys, keyTestStatus, keyTestMsg,
    ocrProgress, ocrError, ocrRunning, localOcrReady, localOcrLoading, localOcrProgress,
    setOcrEngine, openBaiduConfig, saveBaiduConfig, testBaiduKeys, preloadLocalOCR, runOCR,
  }
}
