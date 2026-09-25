<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useExpenseStore } from '@/stores/expense'
import { useDesktop } from '@/composables/useDesktop'
import { useProfileSettings } from '@/composables/useProfileSettings'
import { useReminderSettings } from '@/composables/useReminderSettings'
import { useDataManagement } from '@/composables/useDataManagement'
import { useServerSettings } from '@/composables/useServerSettings'
import { useSecuritySettings } from '@/composables/useSecuritySettings'

const router = useRouter()
const store = useExpenseStore()
const { isDesktop } = useDesktop()
const version = 'v1.0.0'
const darkMode = ref(false)

const {
  userInfo, profile, editing, saving, saveMsg, editNickname, editingNickname, nicknameSaving,
  avatarUrl, avatarUploading, fileInput,
  loadProfile, startEditNickname, cancelEditNickname, saveNickname,
  triggerAvatarUpload, onAvatarChange, startEdit, saveProfile, cancelEdit,
} = useProfileSettings()

const {
  reminderSupported, reminderEnabled, reminderTime, reminderPermission, reminderMsg,
  initReminder, toggleReminder, changeReminderTime,
} = useReminderSettings()

const {
  dataMsg, dataMsgOk, restoring, restoringProgress, restoreInput, clearing,
  exportCSV, exportData, onRestoreFile, clearAllData,
} = useDataManagement()

const {
  serverUrl, editingServerUrl, tempServerUrl, serverTestMsg, serverTestStatus,
  startEditServerUrl, cancelEditServerUrl, saveServerUrl, testServerConnection,
} = useServerSettings()

const {
  securityEnabled, securityEditing, securitySaving, securityMsg, securityMsgOk,
  securityCurrentPassword, securityQuestions, securityQuestionOptions,
  loadSecurityQuestions, startEditSecurity, cancelEditSecurity, saveSecurityQuestions,
} = useSecuritySettings()

onMounted(async () => {
  await store.init()
  const savedDarkMode = localStorage.getItem('dark_mode')
  if (savedDarkMode === '1') {
    darkMode.value = true
    document.documentElement.classList.add('dark')
  }
  initReminder()
  await loadProfile()
  await loadSecurityQuestions()
})

function toggleDarkMode() {
  darkMode.value = !darkMode.value
  document.documentElement.classList.toggle('dark', darkMode.value)
  localStorage.setItem('dark_mode', darkMode.value ? '1' : '0')
}

function logout() {
  localStorage.removeItem('user_id')
  localStorage.removeItem('user_info')
  localStorage.removeItem('user_avatar')
  router.replace('/login')
}
</script>

<template>
  <div :class="isDesktop ? 'desktop-view' : 'px-5 pt-4 pb-24'">
    <h1 class="text-2xl font-bold text-txt mb-6">我的</h1>

    <div :class="isDesktop ? 'desktop-grid' : ''">
      <!-- Left column: user card + profile -->
      <div>
        <!-- User Card -->
        <div class="bg-white rounded-2xl p-5 mb-6">
          <div class="flex items-center gap-4">
            <div class="relative" @click="triggerAvatarUpload">
              <div v-if="avatarUrl" class="w-16 h-16 rounded-2xl overflow-hidden cursor-pointer hover:opacity-80 transition">
                <img :src="avatarUrl" class="w-full h-full object-cover" alt="头像" />
              </div>
              <div v-else class="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary-light flex items-center justify-center cursor-pointer hover:opacity-80 transition">
                <span class="text-white text-2xl font-bold">{{ userInfo?.nickname?.slice(0, 1) || '账' }}</span>
              </div>
              <div class="absolute -bottom-1 -right-1 w-6 h-6 bg-primary rounded-full flex items-center justify-center shadow-md cursor-pointer">
                <span class="material-icons-round text-white text-sm">photo_camera</span>
              </div>
              <div v-if="avatarUploading" class="absolute inset-0 bg-black/40 rounded-2xl flex items-center justify-center">
                <span class="material-icons-round text-white text-xl animate-spin">refresh</span>
              </div>
            </div>
            <input ref="fileInput" type="file" accept="image/*" class="hidden" @change="onAvatarChange" />

            <div class="flex-1">
              <p class="text-xs text-txt-hint mb-1">昵称</p>
              <div v-if="editingNickname" class="flex items-center gap-2">
                <input v-model="editNickname" placeholder="输入新昵称"
                  class="flex-1 text-lg font-semibold text-txt bg-transparent outline-none border-b-2 border-primary pb-1"
                  @keyup.enter="saveNickname" />
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

        <!-- Bio -->
        <div v-if="profile.bio && !editing" class="bg-white/60 rounded-2xl px-5 py-3 mb-6 text-center">
          <p class="text-sm text-txt-secondary italic">「{{ profile.bio }}」</p>
        </div>

        <!-- Profile Section -->
        <div class="flex items-center justify-between mb-3">
          <h2 class="text-base font-semibold text-txt">个人资料</h2>
          <button v-if="!editing" @click="startEdit" class="text-sm text-primary font-medium">编辑</button>
        </div>
        <div class="bg-white rounded-2xl mb-6">
          <div class="flex items-center gap-3 px-4 py-4">
            <div class="w-9 h-9 rounded-xl bg-surface flex items-center justify-center shrink-0"><span class="text-lg">✍️</span></div>
            <div class="flex-1 min-w-0">
              <p class="text-xs text-txt-secondary mb-1">个性签名</p>
              <input v-if="editing" v-model="profile.bio" placeholder="写一句介绍自己..." class="w-full text-sm text-txt bg-transparent outline-none border-b border-surface pb-1" />
              <p v-else class="text-sm text-txt truncate">{{ profile.bio || '未设置' }}</p>
            </div>
          </div>
          <div class="mx-4 h-px bg-surface"></div>
          <div class="flex items-center gap-3 px-4 py-4">
            <div class="w-9 h-9 rounded-xl bg-surface flex items-center justify-center shrink-0"><span class="text-lg">🎂</span></div>
            <div class="flex-1 min-w-0">
              <p class="text-xs text-txt-secondary mb-1">生日</p>
              <input v-if="editing" v-model="profile.birthday" type="date" class="w-full text-sm text-txt bg-transparent outline-none border-b border-surface pb-1" />
              <p v-else class="text-sm text-txt">{{ profile.birthday || '未设置' }}</p>
            </div>
          </div>
          <div class="mx-4 h-px bg-surface"></div>
          <div class="flex items-center gap-3 px-4 py-4">
            <div class="w-9 h-9 rounded-xl bg-surface flex items-center justify-center shrink-0"><span class="text-lg">🎯</span></div>
            <div class="flex-1 min-w-0">
              <p class="text-xs text-txt-secondary mb-1">兴趣爱好</p>
              <input v-if="editing" v-model="profile.hobbies" placeholder="如：阅读、旅行、摄影..." class="w-full text-sm text-txt bg-transparent outline-none border-b border-surface pb-1" />
              <p v-else class="text-sm text-txt truncate">{{ profile.hobbies || '未设置' }}</p>
            </div>
          </div>
          <div class="mx-4 h-px bg-surface"></div>
          <div class="flex items-center gap-3 px-4 py-4">
            <div class="w-9 h-9 rounded-xl bg-surface flex items-center justify-center shrink-0"><span class="text-lg">🌟</span></div>
            <div class="flex-1 min-w-0">
              <p class="text-xs text-txt-secondary mb-1">理想</p>
              <input v-if="editing" v-model="profile.dream" placeholder="你的梦想是什么..." class="w-full text-sm text-txt bg-transparent outline-none border-b border-surface pb-1" />
              <p v-else class="text-sm text-txt truncate">{{ profile.dream || '未设置' }}</p>
            </div>
          </div>
          <div v-if="editing" class="px-4 pb-4 flex gap-3">
            <button @click="cancelEdit" class="flex-1 py-3 rounded-xl text-sm font-medium bg-surface text-txt-secondary">取消</button>
            <button @click="saveProfile" :disabled="saving" class="flex-1 py-3 rounded-xl text-sm font-medium text-white transition-all active:scale-95" :class="saving ? 'bg-gray-300' : 'bg-gradient-to-r from-primary to-primary-light shadow-lg shadow-primary/30'">{{ saving ? '保存中...' : '保存' }}</button>
          </div>
        </div>
        <p v-if="saveMsg" class="text-center text-xs mb-4" :class="saveMsg.includes('成功') ? 'text-green-500' : 'text-error'">{{ saveMsg }}</p>
      </div>

      <!-- Right column: dark mode, data mgmt, about -->
      <div>
                <!-- Server Sync -->
        <h2 class="text-base font-semibold text-txt mb-3">数据同步</h2>
        <div class="bg-white rounded-2xl mb-6">
          <div class="px-4 py-4">
            <div class="flex items-center gap-3 mb-3">
              <div class="w-9 h-9 rounded-xl bg-surface flex items-center justify-center">
                <span class="material-icons-round text-primary text-lg">cloud</span>
              </div>
              <div class="flex-1">
                <p class="text-sm font-medium text-txt">服务器地址</p>
                <p class="text-xs text-txt-hint">电脑端和手机端填同一地址即可同步</p>
              </div>
            </div>
            <div v-if="!editingServerUrl">
              <div class="bg-surface rounded-xl px-3 py-2 flex items-center gap-2">
                <span class="material-icons-round text-sm text-green-500">check_circle</span>
                <span class="flex-1 text-xs font-mono text-txt-secondary truncate">{{ serverUrl }}</span>
                <button @click="startEditServerUrl" class="text-xs text-primary font-medium px-2 py-1 hover:bg-white rounded transition">修改</button>
              </div>
            </div>
            <div v-else class="space-y-2">
              <input v-model="tempServerUrl" placeholder="如 http://192.168.1.100:3001/api"
                class="w-full bg-surface rounded-xl px-3 py-2.5 text-sm font-mono outline-none focus:ring-2 focus:ring-primary/30 transition" />
              <div class="flex gap-2">
                <button @click="saveServerUrl" class="flex-1 py-2 rounded-xl text-xs font-medium bg-primary text-white active:scale-95 transition">保存</button>
                <button @click="testServerConnection" class="flex-1 py-2 rounded-xl text-xs font-medium bg-surface text-txt-secondary hover:bg-surface/80 transition">测试连接</button>
                <button @click="cancelEditServerUrl" class="py-2 px-3 rounded-xl text-xs font-medium bg-surface text-txt-hint transition">取消</button>
              </div>
            </div>
            <p v-if="serverTestMsg" class="text-xs mt-2" :class="serverTestStatus === 'ok' ? 'text-green-500' : serverTestStatus === 'fail' ? 'text-error' : 'text-txt-secondary'">{{ serverTestMsg }}</p>
          </div>
          <div class="mx-4 h-px bg-surface"></div>
          <div class="px-4 py-3">
            <p class="text-[11px] text-txt-hint leading-relaxed">电脑和手机都填同一个服务器地址，登录同一账号，数据就会自动同步。可部署到云服务器或局域网内的电脑上。</p>
          </div>
        </div>

        <!-- 账号安全：密保问题 -->
        <h2 class="text-base font-semibold text-txt mb-3">账号安全</h2>
        <div class="bg-white rounded-2xl mb-6">
          <div class="px-4 py-4">
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 rounded-xl bg-surface flex items-center justify-center">
                <span class="material-icons-round text-primary text-lg">shield</span>
              </div>
              <div class="flex-1">
                <p class="text-sm font-medium text-txt">密保问题</p>
                <p class="text-xs text-txt-hint">{{ securityEnabled ? '已设置，可用于找回密码' : '未设置时忘记密码将无法找回' }}</p>
              </div>
              <button v-if="!securityEditing" @click="startEditSecurity" class="text-xs text-primary font-medium px-2 py-1 hover:bg-surface rounded transition">
                {{ securityEnabled ? '修改' : '设置' }}
              </button>
            </div>
          </div>
          <template v-if="securityEditing">
            <div class="mx-4 h-px bg-surface"></div>
            <div class="px-4 py-3 space-y-3">
              <div v-for="(q, i) in securityQuestions" :key="i">
                <select v-model="q.question"
                  class="w-full bg-surface rounded-xl px-3 py-2.5 text-sm outline-none mb-2">
                  <option v-for="opt in securityQuestionOptions" :key="opt" :value="opt">{{ opt }}</option>
                </select>
                <input v-model="q.answer" placeholder="请输入答案"
                  class="w-full bg-surface rounded-xl px-3 py-2.5 text-sm outline-none" />
              </div>
              <input v-model="securityCurrentPassword" type="password" placeholder="请输入当前密码以确认"
                class="w-full bg-surface rounded-xl px-3 py-2.5 text-sm outline-none" />
              <p v-if="securityMsg" class="text-xs" :class="securityMsgOk ? 'text-green-500' : 'text-error'">{{ securityMsg }}</p>
              <div class="flex gap-2">
                <button @click="cancelEditSecurity" class="flex-1 py-2.5 rounded-xl text-xs font-medium bg-surface text-txt-secondary">取消</button>
                <button @click="saveSecurityQuestions" :disabled="securitySaving"
                  class="flex-1 py-2.5 rounded-xl text-xs font-medium text-white transition active:scale-95"
                  :class="securitySaving ? 'bg-gray-300' : 'bg-primary'">
                  {{ securitySaving ? '保存中...' : '保存密保问题' }}
                </button>
              </div>
            </div>
          </template>
          <template v-else>
            <div v-if="securityEnabled" class="px-4 pb-3 space-y-1">
              <p v-for="q in securityQuestions" :key="q.question" class="text-xs text-txt-secondary truncate">· {{ q.question }}</p>
            </div>
            <p v-else class="px-4 pb-3 text-xs text-txt-hint">建议设置 2 个密保问题，忘记密码时用来验证身份。</p>
            <p v-if="securityMsg" class="px-4 pb-3 text-xs" :class="securityMsgOk ? 'text-green-500' : 'text-error'">{{ securityMsg }}</p>
          </template>
        </div>

        <!-- Dark Mode -->
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
          <button @click="toggleDarkMode" class="relative w-12 h-6 rounded-full transition-colors duration-300" :class="darkMode ? 'bg-primary' : 'bg-gray-300'">
            <span class="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-300" :class="darkMode ? 'translate-x-6' : 'translate-x-0'"></span>
          </button>
        </div>

        <!-- 记账提醒 -->
        <div class="bg-white rounded-2xl mb-6">
          <div class="px-4 py-4 flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 rounded-xl bg-surface flex items-center justify-center">
                <span class="material-icons-round text-primary text-lg">alarm</span>
              </div>
              <div>
                <p class="text-sm font-medium text-txt">每日记账提醒</p>
                <p class="text-xs text-txt-hint">{{ reminderSupported ? '到点弹通知，养成记账习惯' : '当前浏览器不支持通知' }}</p>
              </div>
            </div>
            <button @click="toggleReminder"
              :disabled="!reminderSupported"
              class="relative w-12 h-6 rounded-full transition-colors duration-300 shrink-0"
              :class="reminderEnabled ? 'bg-primary' : 'bg-gray-300'">
              <span class="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-300" :class="reminderEnabled ? 'translate-x-6' : 'translate-x-0'"></span>
            </button>
          </div>
          <template v-if="reminderSupported">
            <div class="mx-4 h-px bg-surface"></div>
            <div class="px-4 py-3 flex items-center gap-3">
              <span class="text-xs text-txt-secondary">提醒时间</span>
              <input v-model="reminderTime" type="time" @change="changeReminderTime"
                class="bg-surface rounded-xl px-3 py-1.5 text-sm text-txt outline-none focus:ring-2 focus:ring-primary/30 transition" />
              <span v-if="reminderPermission !== 'granted'" class="text-[11px] text-amber-500 ml-auto">
                {{ reminderPermission === 'denied' ? '通知权限被拒绝' : '未授权通知' }}
              </span>
              <span v-else class="material-icons-round text-green-500 text-sm ml-auto">check_circle</span>
            </div>
          </template>
          <p v-if="reminderMsg" class="px-4 pb-3 text-xs" :class="reminderMsg.includes('拒绝') || reminderMsg.includes('不支持') ? 'text-amber-500' : 'text-green-500'">{{ reminderMsg }}</p>
        </div>

        <!-- Data Management -->
        <h2 class="text-base font-semibold text-txt mb-3">数据管理</h2>
        <div class="bg-white rounded-2xl mb-2">
          <input ref="restoreInput" type="file" accept="application/json,.json" class="hidden" @change="onRestoreFile" />
          <button @click="exportData" class="w-full flex items-center gap-3 px-4 py-4 hover:bg-surface/50 transition rounded-2xl">
            <div class="w-9 h-9 rounded-xl bg-surface flex items-center justify-center">
              <span class="material-icons-round text-primary text-lg">cloud_download</span>
            </div>
            <span class="flex-1 text-sm font-medium text-txt">备份数据（JSON）</span>
            <span class="material-icons-round text-txt-hint">chevron_right</span>
          </button>
          <div class="mx-4 h-px bg-surface"></div>
          <button @click="exportCSV" class="w-full flex items-center gap-3 px-4 py-4 hover:bg-surface/50 transition rounded-2xl">
            <div class="w-9 h-9 rounded-xl bg-surface flex items-center justify-center">
              <span class="material-icons-round text-primary text-lg">table_view</span>
            </div>
            <span class="flex-1 text-sm font-medium text-txt">导出明细（CSV）</span>
            <span class="text-xs text-txt-hint">Excel 可打开</span>
            <span class="material-icons-round text-txt-hint">chevron_right</span>
          </button>
          <div class="mx-4 h-px bg-surface"></div>
          <button @click="restoreInput?.click()" :disabled="restoring"
            class="w-full flex items-center gap-3 px-4 py-4 hover:bg-surface/50 transition rounded-2xl disabled:opacity-50">
            <div class="w-9 h-9 rounded-xl bg-surface flex items-center justify-center">
              <span class="material-icons-round text-primary text-lg">restore</span>
            </div>
            <span class="flex-1 text-sm font-medium text-txt">{{ restoring ? (restoringProgress || '恢复中...') : '从备份恢复' }}</span>
            <span v-if="!restoring" class="material-icons-round text-txt-hint">chevron_right</span>
          </button>
          <div class="mx-4 h-px bg-surface"></div>
          <button @click="clearAllData" :disabled="clearing"
            class="w-full flex items-center gap-3 px-4 py-4 hover:bg-error/5 transition rounded-2xl disabled:opacity-50">
            <div class="w-9 h-9 rounded-xl bg-surface flex items-center justify-center">
              <span class="material-icons-round text-error text-lg">delete_forever</span>
            </div>
            <span class="flex-1 text-sm font-medium text-error">{{ clearing ? '清空中...' : '清空账本记录' }}</span>
            <span v-if="!clearing" class="material-icons-round text-txt-hint">chevron_right</span>
          </button>
        </div>
        <p v-if="dataMsg" class="text-center text-xs mb-4" :class="dataMsgOk ? 'text-green-500' : 'text-error'">{{ dataMsg }}</p>

        <!-- 退出登录 -->
        <div class="bg-white rounded-2xl mb-6">
          <button @click="logout" class="w-full flex items-center gap-3 px-4 py-4 hover:bg-error/5 transition rounded-2xl">
            <div class="w-9 h-9 rounded-xl bg-surface flex items-center justify-center">
              <span class="material-icons-round text-error text-lg">logout</span>
            </div>
            <span class="flex-1 text-sm font-medium text-error">退出登录</span>
            <span class="material-icons-round text-txt-hint">chevron_right</span>
          </button>
        </div>

        <!-- About -->
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
          <div class="mx-4 h-px bg-surface"></div>
          <router-link to="/download" class="flex items-center gap-3 px-4 py-4 cursor-pointer hover:bg-surface/50 transition">
            <div class="w-9 h-9 rounded-xl bg-surface flex items-center justify-center">
              <span class="material-icons-round text-primary text-lg">get_app</span>
            </div>
            <span class="flex-1 text-sm text-txt">下载 App</span>
            <span class="material-icons-round text-txt-hint">chevron_right</span>
          </router-link>
        </div>
      </div>
    </div>
  </div>
</template>
