import { ref } from 'vue'
import {
  getReminderConfig, setReminderConfig, requestPermission,
  getPermission, notificationSupported,
} from '@/utils/reminder'

export function useReminderSettings() {
  const reminderSupported = notificationSupported()
  const reminderEnabled = ref(false)
  const reminderTime = ref('21:00')
  const reminderPermission = ref<string>(getPermission() as string)
  const reminderMsg = ref('')

  function initReminder() {
    const cfg = getReminderConfig()
    reminderEnabled.value = cfg.enabled
    reminderTime.value = cfg.time
  }

  async function toggleReminder() {
    if (!reminderSupported) {
      reminderEnabled.value = false
      reminderMsg.value = '当前浏览器不支持通知'
      return
    }
    reminderEnabled.value = !reminderEnabled.value
    if (!reminderEnabled.value) {
      setReminderConfig(false, reminderTime.value)
      reminderMsg.value = ''
      return
    }
    const perm = await requestPermission()
    reminderPermission.value = perm
    if (perm !== 'granted') {
      reminderEnabled.value = false
      setReminderConfig(false, reminderTime.value)
      reminderMsg.value = perm === 'denied' ? '通知权限已被拒绝，请在浏览器设置中允许通知后重试' : '未获得通知权限，提醒无法生效'
      return
    }
    setReminderConfig(true, reminderTime.value)
    reminderMsg.value = `将在每天 ${reminderTime.value} 提醒你记账`
  }

  function changeReminderTime() {
    if (reminderEnabled.value) {
      setReminderConfig(true, reminderTime.value)
      reminderMsg.value = `将在每天 ${reminderTime.value} 提醒你记账`
    } else {
      setReminderConfig(false, reminderTime.value)
    }
  }

  return {
    reminderSupported, reminderEnabled, reminderTime, reminderPermission, reminderMsg,
    initReminder, toggleReminder, changeReminderTime,
  }
}
