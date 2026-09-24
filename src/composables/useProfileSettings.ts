import { ref } from 'vue'
import { api } from '@/services/api'

export function useProfileSettings() {
  const userInfo = ref<{ id: string; username: string; nickname: string } | null>(null)
  const profile = ref({ bio: '', birthday: '', hobbies: '', dream: '' })
  const editing = ref(false)
  const saving = ref(false)
  const saveMsg = ref('')
  const editNickname = ref('')
  const editingNickname = ref(false)
  const nicknameSaving = ref(false)
  const avatarUrl = ref('')
  const avatarUploading = ref(false)
  const fileInput = ref<HTMLInputElement | null>(null)

  async function loadProfile() {
    const info = localStorage.getItem('user_info')
    if (info) {
      try {
        userInfo.value = JSON.parse(info)
      } catch {
        userInfo.value = { id: '', username: '', nickname: '' }
        localStorage.removeItem('user_info')
      }
      editNickname.value = userInfo.value?.nickname || ''
    }
    const savedAvatar = localStorage.getItem('user_avatar')
    if (savedAvatar) avatarUrl.value = savedAvatar
    try {
      const data: any = await api.getProfile()
      profile.value = data
      if (data.avatar) avatarUrl.value = data.avatar
    } catch { /* 获取服务端资料失败时保留本地资料 */ }
  }

  function startEditNickname() {
    editingNickname.value = true
    saveMsg.value = ''
  }

  function cancelEditNickname() {
    editingNickname.value = false
    editNickname.value = userInfo.value?.nickname || ''
  }

  async function saveNickname() {
    if (!editNickname.value.trim()) { saveMsg.value = '昵称不能为空'; return }
    nicknameSaving.value = true
    try {
      await api.updateProfile({ nickname: editNickname.value.trim() })
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

  function triggerAvatarUpload() {
    fileInput.value?.click()
  }

  async function onAvatarChange(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { saveMsg.value = '请选择图片文件'; return }
    if (file.size > 2 * 1024 * 1024) { saveMsg.value = '图片大小不能超过 2MB'; return }
    avatarUploading.value = true
    saveMsg.value = ''
    const reader = new FileReader()
    reader.onload = async (event) => {
      const base64 = event.target?.result as string
      avatarUrl.value = base64
      localStorage.setItem('user_avatar', base64)
      try {
        await api.updateProfile({ avatar: base64 })
        saveMsg.value = '头像更新成功!'
      } catch { /* 头像上传失败不阻断本地预览 */ }
      setTimeout(() => saveMsg.value = '', 2000)
      avatarUploading.value = false
    }
    reader.readAsDataURL(file)
  }

  function startEdit() {
    editing.value = true
    saveMsg.value = ''
  }

  async function saveProfile() {
    saving.value = true
    saveMsg.value = ''
    try {
      const res: any = await api.updateProfile(profile.value)
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
    api.getProfile().then((data: any) => { profile.value = data }).catch(() => {})
  }

  return {
    userInfo, profile, editing, saving, saveMsg, editNickname, editingNickname, nicknameSaving,
    avatarUrl, avatarUploading, fileInput,
    loadProfile, startEditNickname, cancelEditNickname, saveNickname,
    triggerAvatarUpload, onAvatarChange, startEdit, saveProfile, cancelEdit,
  }
}
