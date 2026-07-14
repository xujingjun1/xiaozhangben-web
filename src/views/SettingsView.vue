<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '@/services/api'

const router = useRouter()
const version = 'v1.0.0'
const userInfo = ref<{ id: string; username: string; nickname: string } | null>(null)

// 资料编辑
const profile = ref({ bio: '', birthday: '', hobbies: '', dream: '' })
const editing = ref(false)
const saving = ref(false)
const saveMsg = ref('')

// 深色模式
const darkMode = ref(false)

function toggleDarkMode() {
  darkMode.value = !darkMode.value
  document.documentElement.classList.toggle('dark', darkMode.value)
  localStorage.setItem('dark_mode', darkMode.value ? '1' : '0')
}

// 昵称编辑
const editNickname = ref('')
const editingNickname = ref(false)
const nicknameSaving = ref(false)

// 头像编辑
const avatarUrl = ref('')
const avatarUploading = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)

onMounted(async () => {
  const info = localStorage.getItem('user_info')
  if (info) {
    userInfo.value = JSON.parse(info)
    editNickname.value = userInfo.value?.nickname || ''
  }
  // 加载深色模式设置
  const savedDarkMode = localStorage.getItem('dark_mode')
  if (savedDarkMode === '1') {
    darkMode.value = true
    document.documentElement.classList.add('dark')
  }
  // 加载头像
  const savedAvatar = localStorage.getItem('user_avatar')
  if (savedAvatar) avatarUrl.value = savedAvatar
  try {
    const data = await api.getProfile()
    profile.value = data
    if (data.avatar) avatarUrl.value = data.avatar
  } catch {}
})

// 昵称编辑
function startEditNickname() {
  editingNickname.value = true
  saveMsg.value = ''
}

function cancelEditNickname() {
  editingNickname.value = false
  editNickname.value = userInfo.value?.nickname || ''
}

async function saveNickname() {
  if (!editNickname.value.trim()) {
    saveMsg.value = '昵称不能为空'
    return
  }
  nicknameSaving.value = true
  try {
    const res = await api.updateProfile({ nickname: editNickname.value.trim() })
    if (userInfo.value) {
      userInfo.value.nickname = editNickname.value.trim()
      localStorage.setItem('user_info', JSON.stringify(userInfo.value))
    }
    saveMsg.value = '昵称修改成功!'
    editingNickname.value = false
    setTimeout(() => saveMsg.value = '', 2000)
  } catch (e: any) {
    saveMsg.value = '修改失败: ' + e.message
  } finally {
    nicknameSaving.value = false
  }
}

// 头像编辑
function triggerAvatarUpload() {
  fileInput.value?.click()
}

async function onAvatarChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  if (!file.type.startsWith('image/')) {
    saveMsg.value = '请选择图片文件'
    return
  }
  if (file.size > 2 * 1024 * 1024) {
    saveMsg.value = '图片大小不能超过 2MB'
    return
  }
  
  avatarUploading.value = true
  saveMsg.value = ''
  
  try {
    // 读取文件为 base64
    const reader = new FileReader()
    reader.onload = async (event) => {
      const base64 = event.target?.result as string
      avatarUrl.value = base64
      localStorage.setItem('user_avatar', base64)
      
      try {
        await api.updateProfile({ avatar: base64 })
        saveMsg.value = '头像更新成功!'
      } catch {}
      
      setTimeout(() => saveMsg.value = '', 2000)
      avatarUploading.value = false
    }
    reader.readAsDataURL(file)
  } catch {
    avatarUploading.value = false
    saveMsg.value = '头像上传失败'
  }
}

function startEdit() {
  editing.value = true
  saveMsg.value = ''
}

async function saveProfile() {
  saving.value = true
  saveMsg.value = ''
  try {
    const res = await api.updateProfile(profile.value)
    profile.value = res.profile
    saveMsg.value = '保存成功!'
    editing.value = false
    setTimeout(() => saveMsg.value = '', 2000)
  } catch (e: any) {
    saveMsg.value = '保存失败: ' + e.message
  } finally {
    saving.value = false
  }
}

function cancelEdit() {
  editing.value = false
  api.getProfile().then(data => { profile.value = data }).catch(() => {})
}

async function exportData() {
  try {
    const data = await api.exportData()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `小账本数据_${new Date().toLocaleDateString()}.json`
    a.click()
    URL.revokeObjectURL(url)
  } catch {
    alert('导出失败')
  }
}

function logout() {
  localStorage.removeItem('user_id')
  localStorage.removeItem('user_info')
  localStorage.removeItem('user_avatar')
  router.replace('/login')
}
</script>

<template>
  <div class="px-5 pt-4 pb-24">
    <h1 class="text-2xl font-bold text-txt mb-6">我的</h1>

    <!-- 用户卡片 -->
    <div class="bg-white rounded-2xl p-5 mb-6">
      <div class="flex items-center gap-4">
        <!-- 头像 -->
        <div class="relative" @click="triggerAvatarUpload">
          <div v-if="avatarUrl" class="w-16 h-16 rounded-2xl overflow-hidden cursor-pointer hover:opacity-80 transition">
            <img :src="avatarUrl" class="w-full h-full object-cover" alt="头像" />
          </div>
          <div v-else class="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary-light flex items-center justify-center cursor-pointer hover:opacity-80 transition">
            <span class="text-white text-2xl font-bold">{{ userInfo?.nickname?.slice(0, 1) || '账' }}</span>
          </div>
          <!-- 相机图标 -->
          <div class="absolute -bottom-1 -right-1 w-6 h-6 bg-primary rounded-full flex items-center justify-center shadow-md cursor-pointer">
            <span class="material-icons-round text-white text-sm">photo_camera</span>
          </div>
          <!-- 上传中遮罩 -->
          <div v-if="avatarUploading" class="absolute inset-0 bg-black/40 rounded-2xl flex items-center justify-center">
            <span class="material-icons-round text-white text-xl animate-spin">refresh</span>
          </div>
        </div>
        <input ref="fileInput" type="file" accept="image/*" class="hidden" @change="onAvatarChange" />
        
        <!-- 昵称 -->
        <div class="flex-1">
          <p class="text-xs text-txt-hint mb-1">昵称</p>
          <div v-if="editingNickname" class="flex items-center gap-2">
            <input
              v-model="editNickname"
              placeholder="输入新昵称"
              class="flex-1 text-lg font-semibold text-txt bg-transparent outline-none border-b-2 border-primary pb-1"
              @keyup.enter="saveNickname"
            />
            <button @click="saveNickname" :disabled="nicknameSaving" class="p-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition">
              <span class="material-icons-round text-lg">{{ nicknameSaving ? 'hourglass_empty' : 'check' }}</span>
            </button>
            <button @click="cancelEditNickname" class="p-1.5 rounded-lg bg-gray-100 text-txt-hint hover:bg-gray-200 transition">
              <span class="material-icons-round text-lg">close</span>
            </button>
          </div>
          <div v-else class="flex items-center gap-2">
            <p class="text-lg font-semibold text-txt">{{ userInfo?.nickname || '用户' }}</p>
            <button @click="startEditNickname" class="p-1 rounded-lg hover:bg-surface transition">
              <span class="material-icons-round text-sm text-txt-hint">edit</span>
            </button>
          </div>
          <p class="text-xs text-txt-secondary">{{ userInfo?.username || '' }}</p>
        </div>
      </div>
    </div>

    <!-- 个性签名 -->
    <div v-if="profile.bio && !editing" class="bg-white/60 rounded-2xl px-5 py-3 mb-6 text-center">
      <p class="text-sm text-txt-secondary italic">「{{ profile.bio }}」</p>
    </div>

    <!-- 个人资料 -->
    <div class="flex items-center justify-between mb-3">
      <h2 class="text-base font-semibold text-txt">个人资料</h2>
      <button v-if="!editing" @click="startEdit" class="text-sm text-primary font-medium">编辑</button>
    </div>
    <div class="bg-white rounded-2xl mb-6">
      <!-- 个性签名 -->
      <div class="flex items-center gap-3 px-4 py-4">
        <div class="w-9 h-9 rounded-xl bg-surface flex items-center justify-center shrink-0">
          <span class="text-lg">✍️</span>
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-xs text-txt-secondary mb-1">个性签名</p>
          <input
            v-if="editing"
            v-model="profile.bio"
            placeholder="写一句介绍自己..."
            class="w-full text-sm text-txt bg-transparent outline-none border-b border-surface pb-1"
          />
          <p v-else class="text-sm text-txt truncate">{{ profile.bio || '未设置' }}</p>
        </div>
      </div>
      <div class="mx-4 h-px bg-surface"></div>

      <!-- 生日 -->
      <div class="flex items-center gap-3 px-4 py-4">
        <div class="w-9 h-9 rounded-xl bg-surface flex items-center justify-center shrink-0">
          <span class="text-lg">🎂</span>
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-xs text-txt-secondary mb-1">生日</p>
          <input
            v-if="editing"
            v-model="profile.birthday"
            type="date"
            class="w-full text-sm text-txt bg-transparent outline-none border-b border-surface pb-1"
          />
          <p v-else class="text-sm text-txt">{{ profile.birthday || '未设置' }}</p>
        </div>
      </div>
      <div class="mx-4 h-px bg-surface"></div>

      <!-- 兴趣爱好 -->
      <div class="flex items-center gap-3 px-4 py-4">
        <div class="w-9 h-9 rounded-xl bg-surface flex items-center justify-center shrink-0">
          <span class="text-lg">🎯</span>
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-xs text-txt-secondary mb-1">兴趣爱好</p>
          <input
            v-if="editing"
            v-model="profile.hobbies"
            placeholder="如：阅读、旅行、摄影..."
            class="w-full text-sm text-txt bg-transparent outline-none border-b border-surface pb-1"
          />
          <p v-else class="text-sm text-txt truncate">{{ profile.hobbies || '未设置' }}</p>
        </div>
      </div>
      <div class="mx-4 h-px bg-surface"></div>

      <!-- 理想 -->
      <div class="flex items-center gap-3 px-4 py-4">
        <div class="w-9 h-9 rounded-xl bg-surface flex items-center justify-center shrink-0">
          <span class="text-lg">🌟</span>
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-xs text-txt-secondary mb-1">理想</p>
          <input
            v-if="editing"
            v-model="profile.dream"
            placeholder="你的梦想是什么..."
            class="w-full text-sm text-txt bg-transparent outline-none border-b border-surface pb-1"
          />
          <p v-else class="text-sm text-txt truncate">{{ profile.dream || '未设置' }}</p>
        </div>
      </div>

      <!-- 编辑按钮 -->
      <div v-if="editing" class="px-4 pb-4 flex gap-3">
        <button
          @click="cancelEdit"
          class="flex-1 py-3 rounded-xl text-sm font-medium bg-surface text-txt-secondary"
        >取消</button>
        <button
          @click="saveProfile"
          :disabled="saving"
          class="flex-1 py-3 rounded-xl text-sm font-medium text-white transition-all active:scale-95"
          :class="saving ? 'bg-gray-300' : 'bg-gradient-to-r from-primary to-primary-light shadow-lg shadow-primary/30'"
        >{{ saving ? '保存中...' : '保存' }}</button>
      </div>
    </div>

    <p v-if="saveMsg" class="text-center text-xs mb-4"
       :class="saveMsg.includes('成功') ? 'text-green-500' : 'text-error'">{{ saveMsg }}</p>

    <!-- 深色模式 -->
    <div class="bg-white dark:bg-[#1a1a2e] rounded-2xl p-4 mb-6 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="w-9 h-9 rounded-xl bg-surface dark:bg-white/10 flex items-center justify-center">
          <span class="material-icons-round text-primary text-lg">dark_mode</span>
        </div>
        <div>
          <p class="text-sm font-medium text-txt dark:text-white">深色模式</p>
          <p class="text-xs text-txt-hint dark:text-gray-400">切换深色/浅色主题</p>
        </div>
      </div>
      <button
        @click="toggleDarkMode"
        class="relative w-12 h-6 rounded-full transition-colors duration-300"
        :class="darkMode ? 'bg-primary' : 'bg-gray-300'"
      >
        <span
          class="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-300"
          :class="darkMode ? 'translate-x-6' : 'translate-x-0'"
        ></span>
      </button>
    </div>

    <!-- 数据管理 -->
    <h2 class="text-base font-semibold text-txt mb-3">数据管理</h2>
    <div class="bg-white rounded-2xl mb-6">
      <button @click="exportData" class="w-full flex items-center gap-3 px-4 py-4 hover:bg-surface/50 transition rounded-2xl">
        <div class="w-9 h-9 rounded-xl bg-surface flex items-center justify-center">
          <span class="material-icons-round text-primary text-lg">download</span>
        </div>
        <span class="flex-1 text-sm font-medium text-txt">导出数据</span>
        <span class="material-icons-round text-txt-hint">chevron_right</span>
      </button>
      <div class="mx-4 h-px bg-surface"></div>
      <button @click="logout" class="w-full flex items-center gap-3 px-4 py-4 hover:bg-surface/50 transition rounded-2xl">
        <div class="w-9 h-9 rounded-xl bg-surface flex items-center justify-center">
          <span class="material-icons-round text-error text-lg">logout</span>
        </div>
        <span class="flex-1 text-sm font-medium text-error">退出登录</span>
        <span class="material-icons-round text-txt-hint">chevron_right</span>
      </button>
    </div>

    <!-- 关于 -->
    <h2 class="text-base font-semibold text-txt mb-3">关于</h2>
    <div class="bg-white rounded-2xl mb-6">
      <div class="flex items-center gap-3 px-4 py-4">
        <div class="w-9 h-9 rounded-xl bg-surface flex items-center justify-center">
          <span class="material-icons-round text-primary text-lg">info</span>
        </div>
        <span class="flex-1 text-sm text-txt">版本信息</span>
        <span class="text-sm text-txt-hint">{{ version }}</span>
      </div>
      <div class="mx-4 h-px bg-surface"></div>
      <router-link to="/rating" class="flex items-center gap-3 px-4 py-4 cursor-pointer hover:bg-surface/50 transition">
        <div class="w-9 h-9 rounded-xl bg-surface flex items-center justify-center">
          <span class="material-icons-round text-primary text-lg">star</span>
        </div>
        <span class="flex-1 text-sm text-txt">给我们评分</span>
        <span class="material-icons-round text-txt-hint">chevron_right</span>
      </router-link>
      <div class="mx-4 h-px bg-surface"></div>
      <router-link to="/privacy" class="flex items-center gap-3 px-4 py-4 cursor-pointer hover:bg-surface/50 transition">
        <div class="w-9 h-9 rounded-xl bg-surface flex items-center justify-center">
          <span class="material-icons-round text-primary text-lg">privacy_tip</span>
        </div>
        <span class="flex-1 text-sm text-txt">隐私政策</span>
        <span class="material-icons-round text-txt-hint">chevron_right</span>
      </router-link>
      <div class="mx-4 h-px bg-surface"></div>
      <router-link to="/help" class="flex items-center gap-3 px-4 py-4 cursor-pointer hover:bg-surface/50 transition">
        <div class="w-9 h-9 rounded-xl bg-surface flex items-center justify-center">
          <span class="material-icons-round text-primary text-lg">help</span>
        </div>
        <span class="flex-1 text-sm text-txt">帮助与反馈</span>
        <span class="material-icons-round text-txt-hint">chevron_right</span>
      </router-link>
    </div>
  </div>
</template>
