<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '@/services/api'

const router = useRouter()
const mode = ref<'login' | 'register' | 'reset'>('login')

// 登录
const loginUsername = ref('')
const loginPassword = ref('')

// 注册
const regUsername = ref('')
const regPassword = ref('')
const regConfirm = ref('')

// 重置密码
const resetUsername = ref('')
const resetNewPassword = ref('')
const resetConfirm = ref('')
const resetSuccess = ref(false)

const loading = ref(false)
const errorMsg = ref('')

async function handleLogin() {
  if (!loginUsername.value || !loginPassword.value) return
  loading.value = true
  errorMsg.value = ''
  try {
    const res = await api.login(loginUsername.value, loginPassword.value)
    localStorage.setItem('user_id', res.user.id)
    localStorage.setItem('user_info', JSON.stringify(res.user))
    router.replace('/')
  } catch (e: any) {
    errorMsg.value = e.message === 'Failed to fetch' ? '网络连接失败，请检查网络' : e.message
  } finally {
    loading.value = false
  }
}

async function handleRegister() {
  if (!regUsername.value || !regPassword.value || !regConfirm.value) return
  if (regPassword.value !== regConfirm.value) {
    errorMsg.value = '两次输入的密码不一致'
    return
  }
  if (regPassword.value.length < 6) {
    errorMsg.value = '密码至少6位'
    return
  }
  loading.value = true
  errorMsg.value = ''
  try {
    const res = await api.register(regUsername.value, regPassword.value)
    localStorage.setItem('user_id', res.user.id)
    localStorage.setItem('user_info', JSON.stringify(res.user))
    router.replace('/')
  } catch (e: any) {
    errorMsg.value = e.message === 'Failed to fetch' ? '网络连接失败，请检查网络' : e.message
  } finally {
    loading.value = false
  }
}

async function handleResetPassword() {
  if (!resetUsername.value || !resetNewPassword.value || !resetConfirm.value) return
  if (resetNewPassword.value !== resetConfirm.value) {
    errorMsg.value = '两次输入的密码不一致'
    return
  }
  if (resetNewPassword.value.length < 6) {
    errorMsg.value = '密码至少6位'
    return
  }
  loading.value = true
  errorMsg.value = ''
  try {
    await api.resetPassword(resetUsername.value, resetNewPassword.value)
    resetSuccess.value = true
    errorMsg.value = ''
  } catch (e: any) {
    errorMsg.value = e.message === 'Failed to fetch' ? '网络连接失败，请检查网络' : e.message
  } finally {
    loading.value = false
  }
}

function switchMode(m: 'login' | 'register' | 'reset') {
  mode.value = m
  errorMsg.value = ''
  resetSuccess.value = false
}
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-[#667EEA] to-[#764BA2] flex flex-col items-center justify-center px-8">
    <!-- Logo -->
    <div class="mb-10 text-center">
      <div class="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-3xl flex items-center justify-center mx-auto mb-4">
        <span class="text-4xl">💰</span>
      </div>
      <h1 class="text-3xl font-bold text-white">小账本</h1>
      <p class="text-white/60 text-sm mt-2">记录生活的每一笔温暖</p>
    </div>

    <!-- Login -->
    <div v-if="mode === 'login'" class="w-full max-w-sm">
      <div class="bg-white rounded-3xl p-6 shadow-xl">
        <h2 class="text-xl font-bold text-txt text-center mb-6">账号登录</h2>

        <input
          v-model="loginUsername"
          placeholder="请输入昵称"
          class="w-full bg-surface rounded-2xl px-4 py-3.5 text-sm font-medium outline-none focus:ring-2 focus:ring-primary/30 transition mb-4"
        />

        <input
          v-model="loginPassword"
          type="password"
          placeholder="请输入密码"
          class="w-full bg-surface rounded-2xl px-4 py-3.5 text-sm font-medium outline-none focus:ring-2 focus:ring-primary/30 transition mb-4"
          @keyup.enter="handleLogin"
        />

        <p v-if="errorMsg" class="text-error text-xs text-center mb-3">{{ errorMsg }}</p>

        <button
          @click="handleLogin"
          :disabled="!loginUsername || !loginPassword || loading"
          class="w-full py-4 rounded-2xl font-semibold text-white transition-all active:scale-95"
          :class="(loginUsername && loginPassword) ? 'bg-gradient-to-r from-primary to-primary-light shadow-lg shadow-primary/30' : 'bg-gray-300 cursor-not-allowed'"
        >
          {{ loading ? '登录中...' : '登录' }}
        </button>

        <!-- 忘记密码 -->
        <p class="text-center mt-3">
          <button @click="switchMode('reset')" class="text-xs text-primary/70 hover:text-primary transition">忘记密码？</button>
        </p>
      </div>

      <p class="text-white/60 text-sm text-center mt-5">
        还没有账号？
        <button @click="switchMode('register')" class="text-white font-semibold underline">立即注册</button>
      </p>
    </div>

    <!-- Register -->
    <div v-else-if="mode === 'register'" class="w-full max-w-sm">
      <div class="bg-white rounded-3xl p-6 shadow-xl">
        <h2 class="text-xl font-bold text-txt text-center mb-6">注册账号</h2>

        <input
          v-model="regUsername"
          placeholder="请输入昵称"
          class="w-full bg-surface rounded-2xl px-4 py-3.5 text-sm font-medium outline-none focus:ring-2 focus:ring-primary/30 transition mb-4"
        />

        <input
          v-model="regPassword"
          type="password"
          placeholder="请输入密码（至少6位）"
          class="w-full bg-surface rounded-2xl px-4 py-3.5 text-sm font-medium outline-none focus:ring-2 focus:ring-primary/30 transition mb-4"
        />

        <input
          v-model="regConfirm"
          type="password"
          placeholder="请再次确认密码"
          class="w-full bg-surface rounded-2xl px-4 py-3.5 text-sm font-medium outline-none focus:ring-2 focus:ring-primary/30 transition mb-4"
          @keyup.enter="handleRegister"
        />

        <p v-if="errorMsg" class="text-error text-xs text-center mb-3">{{ errorMsg }}</p>

        <button
          @click="handleRegister"
          :disabled="!regUsername || !regPassword || !regConfirm || loading"
          class="w-full py-4 rounded-2xl font-semibold text-white transition-all active:scale-95"
          :class="(regUsername && regPassword && regConfirm) ? 'bg-gradient-to-r from-primary to-primary-light shadow-lg shadow-primary/30' : 'bg-gray-300 cursor-not-allowed'"
        >
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

        <!-- 重置成功 -->
        <div v-if="resetSuccess" class="text-center py-4">
          <div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span class="material-icons-round text-4xl text-green-500">check_circle</span>
          </div>
          <p class="text-lg font-semibold text-txt mb-2">密码重置成功！</p>
          <p class="text-sm text-txt-secondary mb-6">请使用新密码登录</p>
          <button
            @click="switchMode('login')"
            class="w-full py-4 rounded-2xl font-semibold text-white bg-gradient-to-r from-primary to-primary-light shadow-lg shadow-primary/30 active:scale-95 transition-all"
          >返回登录</button>
        </div>

        <!-- 重置表单 -->
        <template v-else>
          <input
            v-model="resetUsername"
            placeholder="请输入昵称"
            class="w-full bg-surface rounded-2xl px-4 py-3.5 text-sm font-medium outline-none focus:ring-2 focus:ring-primary/30 transition mb-4"
          />

          <input
            v-model="resetNewPassword"
            type="password"
            placeholder="请输入新密码（至少6位）"
            class="w-full bg-surface rounded-2xl px-4 py-3.5 text-sm font-medium outline-none focus:ring-2 focus:ring-primary/30 transition mb-4"
          />

          <input
            v-model="resetConfirm"
            type="password"
            placeholder="请再次确认新密码"
            class="w-full bg-surface rounded-2xl px-4 py-3.5 text-sm font-medium outline-none focus:ring-2 focus:ring-primary/30 transition mb-4"
            @keyup.enter="handleResetPassword"
          />

          <p v-if="errorMsg" class="text-error text-xs text-center mb-3">{{ errorMsg }}</p>

          <button
            @click="handleResetPassword"
            :disabled="!resetUsername || !resetNewPassword || !resetConfirm || loading"
            class="w-full py-4 rounded-2xl font-semibold text-white transition-all active:scale-95"
            :class="(resetUsername && resetNewPassword && resetConfirm) ? 'bg-gradient-to-r from-primary to-primary-light shadow-lg shadow-primary/30' : 'bg-gray-300 cursor-not-allowed'"
          >
            {{ loading ? '重置中...' : '重置密码' }}
          </button>
        </template>
      </div>

      <p class="text-white/60 text-sm text-center mt-5">
        <button @click="switchMode('login')" class="text-white font-semibold underline">返回登录</button>
      </p>
    </div>
  </div>
</template>
