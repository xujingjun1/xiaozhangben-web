<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '@/services/api'

const router = useRouter()
const mode = ref<'login' | 'register' | 'reset'>('login')

const loginUsername = ref('')
const loginPassword = ref('')
const regUsername = ref('')
const regPassword = ref('')
const regConfirm = ref('')
const resetUsername = ref('')
const resetNewPassword = ref('')
const resetConfirm = ref('')
const resetSuccess = ref(false)
const resetQuestions = ref<string[]>([])
const resetAnswers = ref<string[]>([])
const resetStep = ref<'username' | 'questions' | 'code'>('username')
const resetCode = ref('')
// 重置成功后自动换发的新恢复码
const newRecoveryCode = ref('')
const loading = ref(false)
const errorMsg = ref('')

// === Platform & Install ===
type Platform = 'android' | 'ios' | 'desktop'
const platform = ref<Platform>('desktop')
const isStandalone = ref(false)
const canInstallPWA = ref(false)
const deferredPrompt = ref<any>(null)
const installDone = ref(false)
const installing = ref(false)

onMounted(() => {
  isStandalone.value =
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as any).standalone === true

  const ua = navigator.userAgent.toLowerCase()
  if (/android/.test(ua)) platform.value = 'android'
  else if (/iphone|ipad|ipod/.test(ua)) platform.value = 'ios'
  else platform.value = 'desktop'

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

// === Auth ===
async function handleLogin() {
  if (!loginUsername.value || !loginPassword.value) return
  loading.value = true; errorMsg.value = ''
  try {
    const res = await api.login(loginUsername.value, loginPassword.value)
    localStorage.setItem('user_id', res.user.id)
    localStorage.setItem('user_info', JSON.stringify(res.user))
    router.replace('/')
  } catch (e: any) {
    errorMsg.value = e.message === 'Failed to fetch' ? '网络连接失败，请检查网络' : e.message
  } finally { loading.value = false }
}

async function handleRegister() {
  if (!regUsername.value || !regPassword.value || !regConfirm.value) return
  if (regPassword.value !== regConfirm.value) { errorMsg.value = '两次输入的密码不一致'; return }
  if (regPassword.value.length < 6) { errorMsg.value = '密码至少6位'; return }
  loading.value = true; errorMsg.value = ''
  try {
    const res = await api.register(regUsername.value, regPassword.value)
    localStorage.setItem('user_id', res.user.id)
    localStorage.setItem('user_info', JSON.stringify(res.user))
    router.replace('/')
  } catch (e: any) {
    errorMsg.value = e.message === 'Failed to fetch' ? '网络连接失败，请检查网络' : e.message
  } finally { loading.value = false }
}

async function fetchSecurityQuestions() {
  const username = resetUsername.value.trim()
  if (!username) { errorMsg.value = '请输入昵称'; return }
  loading.value = true; errorMsg.value = ''
  try {
    const res: any = await api.getSecurityQuestions(username)
    const questions = Array.isArray(res?.questions) ? res.questions : []
    if (!questions.length) {
      // 账号没设密保 —— 不再堵死，引导改用恢复码
      errorMsg.value = '该账号未设置密保问题，可改用密码恢复码重置'
      resetStep.value = 'code'
      return
    }
    resetQuestions.value = questions
    resetAnswers.value = questions.map(() => '')
    resetStep.value = 'questions'
  } catch (e: any) {
    // 接口以 404 表示「未设置」，此时同样落到恢复码流程
    if (e?.message && /未设置密保问题/.test(e.message)) {
      errorMsg.value = '该账号未设置密保问题，可改用密码恢复码重置'
      resetStep.value = 'code'
    } else {
      errorMsg.value = e?.message === 'Failed to fetch' ? '网络连接失败，请检查网络' : (e?.message || '获取密保问题失败')
    }
  } finally { loading.value = false }
}

function backToResetUsername() {
  resetStep.value = 'username'
  resetQuestions.value = []
  resetAnswers.value = []
  resetCode.value = ''
  errorMsg.value = ''
}

// 用恢复码重置密码（忘记密码且未设密保时的兜底路径）
async function handleResetByCode() {
  const username = resetUsername.value.trim()
  if (!username) { errorMsg.value = '请输入昵称'; return }
  if (!resetCode.value.trim()) { errorMsg.value = '请输入密码恢复码'; return }
  if (!resetNewPassword.value || !resetConfirm.value) { errorMsg.value = '请填写新密码'; return }
  if (resetNewPassword.value !== resetConfirm.value) { errorMsg.value = '两次输入的密码不一致'; return }
  if (resetNewPassword.value.length < 6) { errorMsg.value = '密码至少6位'; return }
  loading.value = true; errorMsg.value = ''
  try {
    const res: any = await api.resetPasswordByCode(username, resetNewPassword.value, resetCode.value.trim())
    newRecoveryCode.value = res?.newRecoveryCode || ''
    resetSuccess.value = true; errorMsg.value = ''
  } catch (e: any) {
    errorMsg.value = e?.message === 'Failed to fetch' ? '网络连接失败，请检查网络' : (e?.message || '重置失败，请重试')
  } finally { loading.value = false }
}

async function handleResetPassword() {
  if (!resetNewPassword.value || !resetConfirm.value) return
  if (resetAnswers.value.some(a => !a.trim())) { errorMsg.value = '请填写所有密保答案'; return }
  if (resetNewPassword.value !== resetConfirm.value) { errorMsg.value = '两次输入的密码不一致'; return }
  if (resetNewPassword.value.length < 6) { errorMsg.value = '密码至少6位'; return }
  loading.value = true; errorMsg.value = ''
  try {
    const answers = resetQuestions.value.map((q, i) => ({ question: q, answer: resetAnswers.value[i] }))
    await api.resetPassword(resetUsername.value.trim(), resetNewPassword.value, answers)
    resetSuccess.value = true; errorMsg.value = ''
  } catch (e: any) {
    errorMsg.value = e?.message === 'Failed to fetch' ? '网络连接失败，请检查网络' : (e?.message || '重置失败，请重试')
  } finally { loading.value = false }
}

function switchMode(m: 'login' | 'register' | 'reset') {
  mode.value = m; errorMsg.value = ''; resetSuccess.value = false
  resetStep.value = 'username'; resetQuestions.value = []; resetAnswers.value = []
  resetUsername.value = ''; resetNewPassword.value = ''; resetConfirm.value = ''
  resetCode.value = ''; newRecoveryCode.value = ''
}
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-[#667EEA] to-[#764BA2] flex flex-col items-center justify-center px-8">
    <!-- Logo -->
    <div class="mb-10 text-center">
      <div class="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-3xl flex items-center justify-center mx-auto mb-4">
        <span class="text-4xl">&#x1f4b0;</span>
      </div>
      <h1 class="text-3xl font-bold text-white">小账本</h1>
      <p class="text-white/60 text-sm mt-2">记录生活的每一笔温暖</p>
    </div>

    <!-- Login -->
    <div v-if="mode === 'login'" class="w-full max-w-sm">
      <div class="bg-white rounded-3xl p-6 shadow-xl">
        <h2 class="text-xl font-bold text-txt text-center mb-6">账号登录</h2>
        <input v-model="loginUsername" placeholder="请输入昵称"
          class="w-full bg-surface rounded-2xl px-4 py-3.5 text-sm font-medium outline-none focus:ring-2 focus:ring-primary/30 transition mb-4" />
        <input v-model="loginPassword" type="password" placeholder="请输入密码"
          class="w-full bg-surface rounded-2xl px-4 py-3.5 text-sm font-medium outline-none focus:ring-2 focus:ring-primary/30 transition mb-4"
          @keyup.enter="handleLogin" />
        <p v-if="errorMsg" class="text-error text-xs text-center mb-3">{{ errorMsg }}</p>
        <button @click="handleLogin" :disabled="!loginUsername || !loginPassword || loading"
          class="w-full py-4 rounded-2xl font-semibold text-white transition-all active:scale-95"
          :class="(loginUsername && loginPassword) ? 'bg-gradient-to-r from-primary to-primary-light shadow-lg shadow-primary/30' : 'bg-gray-300 cursor-not-allowed'">
          {{ loading ? '登录中...' : '登录' }}
        </button>
        <p class="text-center mt-3">
          <button @click="switchMode('reset')" class="text-xs text-primary/70 hover:text-primary transition">忘记密码？</button>
        </p>
      </div>
      <p class="text-white/60 text-sm text-center mt-5">
        还没有账号？
        <button @click="switchMode('register')" class="text-white font-semibold underline">立即注册</button>
      </p>

      <!-- Download / Install -->
      <div v-if="!isStandalone" class="mt-6 w-full max-w-sm">
        <!-- Already installable via PWA -->
        <button v-if="canInstallPWA && !installDone" @click="installPWA"
          class="w-full py-3.5 bg-white/15 backdrop-blur-sm border border-white/25 rounded-2xl text-white text-sm font-medium flex items-center justify-center gap-2 active:scale-95 transition-all">
          <span class="material-icons-round text-lg">install_mobile</span>
          {{ installing ? '安装中...' : '安装到桌面，像 App 一样使用' }}
        </button>
        <!-- Install done -->
        <div v-else-if="installDone" class="text-center py-3 text-white/80 text-sm">
          <span class="material-icons-round text-base align-middle mr-1">check_circle</span> 安装成功！请在桌面打开
        </div>
        <!-- Android: APK download for any browser -->
        <a v-else-if="platform === 'android'" href="/app-latest.apk"
          class="block w-full py-3.5 bg-white/15 backdrop-blur-sm border border-white/25 rounded-2xl text-white text-sm font-medium text-center active:scale-95 transition-all">
          <span class="material-icons-round text-lg align-middle mr-1">android</span>
          下载 App 安装包
        </a>
        <!-- iOS: Safari guide -->
        <div v-else-if="platform === 'ios'" class="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-4 text-white text-sm">
          <p class="text-center font-medium mb-3">
            <span class="material-icons-round text-lg align-middle mr-1">ios_share</span>
            添加到主屏幕，像 App 一样使用
          </p>
          <div class="space-y-2 text-white/70 text-xs">
            <p>1. 点击 Safari 底部 <span class="material-icons-round text-sm align-middle">ios_share</span> 分享按钮</p>
            <p>2. 选择「添加到主屏幕」</p>
          </div>
        </div>
        <!-- Desktop: APK download -->
        <a v-else href="/app-latest.apk"
          class="block w-full py-3.5 bg-white/15 backdrop-blur-sm border border-white/25 rounded-2xl text-white text-sm font-medium text-center active:scale-95 transition-all">
          <span class="material-icons-round text-lg align-middle mr-1">get_app</span>
          下载 Android 安装包
        </a>
      </div>
    </div>

    <!-- Register -->
    <div v-else-if="mode === 'register'" class="w-full max-w-sm">
      <div class="bg-white rounded-3xl p-6 shadow-xl">
        <h2 class="text-xl font-bold text-txt text-center mb-6">注册账号</h2>
        <input v-model="regUsername" placeholder="请输入昵称"
          class="w-full bg-surface rounded-2xl px-4 py-3.5 text-sm font-medium outline-none focus:ring-2 focus:ring-primary/30 transition mb-4" />
        <input v-model="regPassword" type="password" placeholder="请输入密码（至少6位）"
          class="w-full bg-surface rounded-2xl px-4 py-3.5 text-sm font-medium outline-none focus:ring-2 focus:ring-primary/30 transition mb-4" />
        <input v-model="regConfirm" type="password" placeholder="请再次确认密码"
          class="w-full bg-surface rounded-2xl px-4 py-3.5 text-sm font-medium outline-none focus:ring-2 focus:ring-primary/30 transition mb-4"
          @keyup.enter="handleRegister" />
        <p v-if="errorMsg" class="text-error text-xs text-center mb-3">{{ errorMsg }}</p>
        <button @click="handleRegister" :disabled="!regUsername || !regPassword || !regConfirm || loading"
          class="w-full py-4 rounded-2xl font-semibold text-white transition-all active:scale-95"
          :class="(regUsername && regPassword && regConfirm) ? 'bg-gradient-to-r from-primary to-primary-light shadow-lg shadow-primary/30' : 'bg-gray-300 cursor-not-allowed'">
          {{ loading ? '注册中...' : '注册' }}
        </button>
      </div>
      <p class="text-white/60 text-sm text-center mt-5">
        已有账号？
        <button @click="switchMode('login')" class="text-white font-semibold underline">返回登录</button>
      </p>
    </div>

    <!-- Reset Password -->
    <div v-else class="w-full max-w-sm">
      <div class="bg-white rounded-3xl p-6 shadow-xl">
        <h2 class="text-xl font-bold text-txt text-center mb-2">找回密码</h2>
        <p class="text-xs text-txt-hint text-center mb-6">输入昵称和新密码即可重置</p>
        <div v-if="resetSuccess" class="text-center py-4">
          <div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span class="material-icons-round text-4xl text-green-500">check_circle</span>
          </div>
          <p class="text-lg font-semibold text-txt mb-2">密码重置成功！</p>
          <!-- 用恢复码重置时，后端已换发新码，务必让用户保存 -->
          <template v-if="newRecoveryCode">
            <p class="text-xs text-txt-hint mb-2">旧的恢复码已失效，新的恢复码请立即保存：</p>
            <div class="bg-surface rounded-2xl px-4 py-3 mb-3">
              <p class="text-base font-bold tracking-[0.18em] text-txt select-all break-all font-mono">{{ newRecoveryCode }}</p>
            </div>
            <p class="text-xs text-error mb-4">此码不会再显示第二次，请先截图保存</p>
          </template>
          <p class="text-sm text-txt-secondary mb-6">请使用新密码登录</p>
          <button @click="switchMode('login')" class="w-full py-4 rounded-2xl font-semibold text-white bg-gradient-to-r from-primary to-primary-light shadow-lg shadow-primary/30 active:scale-95 transition-all">返回登录</button>
        </div>
        <template v-else>
          <template v-if="resetStep === 'username'">
            <p class="text-xs text-txt-hint text-center mb-4">输入昵称，通过密保问题或密码恢复码重置</p>
            <input v-model="resetUsername" placeholder="请输入昵称"
              class="w-full bg-surface rounded-2xl px-4 py-3.5 text-sm font-medium outline-none focus:ring-2 focus:ring-primary/30 transition mb-4"
              @keyup.enter="fetchSecurityQuestions" />
            <p v-if="errorMsg" class="text-error text-xs text-center mb-3">{{ errorMsg }}</p>
            <button @click="fetchSecurityQuestions" :disabled="!resetUsername || loading"
              class="w-full py-4 rounded-2xl font-semibold text-white transition-all active:scale-95"
              :class="resetUsername ? 'bg-gradient-to-r from-primary to-primary-light shadow-lg shadow-primary/30' : 'bg-gray-300 cursor-not-allowed'">
              {{ loading ? '查询中...' : '下一步：获取密保问题' }}
            </button>
          </template>
          <template v-else-if="resetStep === 'questions'">
            <p class="text-xs text-txt-hint text-center mb-4">请回答密保问题并设置新密码</p>
            <div v-for="(q, i) in resetQuestions" :key="q" class="mb-4">
              <label class="block text-xs text-txt-secondary mb-1.5">{{ q }}</label>
              <input v-model="resetAnswers[i]" placeholder="请输入答案"
                class="w-full bg-surface rounded-2xl px-4 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-primary/30 transition" />
            </div>
            <input v-model="resetNewPassword" type="password" placeholder="请输入新密码（至少6位）"
              class="w-full bg-surface rounded-2xl px-4 py-3.5 text-sm font-medium outline-none focus:ring-2 focus:ring-primary/30 transition mb-4" />
            <input v-model="resetConfirm" type="password" placeholder="请再次确认新密码"
              class="w-full bg-surface rounded-2xl px-4 py-3.5 text-sm font-medium outline-none focus:ring-2 focus:ring-primary/30 transition mb-4"
              @keyup.enter="handleResetPassword" />
            <p v-if="errorMsg" class="text-error text-xs text-center mb-3">{{ errorMsg }}</p>
            <button @click="handleResetPassword"
              :disabled="!resetNewPassword || !resetConfirm || !resetAnswers.every(a => a.trim()) || loading"
              class="w-full py-4 rounded-2xl font-semibold text-white transition-all active:scale-95"
              :class="(resetNewPassword && resetConfirm && resetAnswers.every(a => a.trim())) ? 'bg-gradient-to-r from-primary to-primary-light shadow-lg shadow-primary/30' : 'bg-gray-300 cursor-not-allowed'">
              {{ loading ? '重置中...' : '重置密码' }}
            </button>
            <button @click="backToResetUsername" class="w-full mt-3 text-xs text-txt-hint hover:text-primary transition">返回上一步</button>
          </template>

          <!-- 恢复码分支：忘记密码且未设密保时的兜底 -->
          <template v-else>
            <p class="text-xs text-txt-hint text-center mb-4">该账号未设置密保问题，可用密码恢复码重置</p>
            <input v-model="resetCode" placeholder="请输入恢复码，如 AB3D-EFGH-K7M2"
              class="w-full bg-surface rounded-2xl px-4 py-3.5 text-sm font-medium outline-none focus:ring-2 focus:ring-primary/30 transition mb-4 tracking-wider"
              autocomplete="off" />
            <input v-model="resetNewPassword" type="password" placeholder="请输入新密码（至少6位）"
              class="w-full bg-surface rounded-2xl px-4 py-3.5 text-sm font-medium outline-none focus:ring-2 focus:ring-primary/30 transition mb-4" />
            <input v-model="resetConfirm" type="password" placeholder="请再次确认新密码"
              class="w-full bg-surface rounded-2xl px-4 py-3.5 text-sm font-medium outline-none focus:ring-2 focus:ring-primary/30 transition mb-4"
              @keyup.enter="handleResetByCode" />
            <p v-if="errorMsg" class="text-error text-xs text-center mb-3">{{ errorMsg }}</p>
            <button @click="handleResetByCode"
              :disabled="!resetCode.trim() || !resetNewPassword || !resetConfirm || loading"
              class="w-full py-4 rounded-2xl font-semibold text-white transition-all active:scale-95"
              :class="(resetCode.trim() && resetNewPassword && resetConfirm) ? 'bg-gradient-to-r from-primary to-primary-light shadow-lg shadow-primary/30' : 'bg-gray-300 cursor-not-allowed'">
              {{ loading ? '重置中...' : '用恢复码重置密码' }}
            </button>
            <p class="text-xs text-txt-hint text-center mt-3">恢复码在「我的 - 账号安全」中生成</p>
            <button @click="backToResetUsername" class="w-full mt-3 text-xs text-txt-hint hover:text-primary transition">返回上一步</button>
          </template>
        </template>
      </div>
      <p class="text-white/60 text-sm text-center mt-5">
        <button @click="switchMode('login')" class="text-white font-semibold underline">返回登录</button>
      </p>
    </div>
  </div>
</template>
