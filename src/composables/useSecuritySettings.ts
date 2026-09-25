import { ref } from 'vue'
import { api } from '@/services/api'

export const securityQuestionOptions = [
  '你的小学名称是什么？',
  '你最喜欢的食物是什么？',
  '你母亲的名字是什么？',
  '你第一份工作是什么？',
  '你最喜欢的城市是哪里？',
  '你的第一只宠物叫什么？',
]

export function useSecuritySettings() {
  const securityEnabled = ref(false)
  const securityEditing = ref(false)
  const securitySaving = ref(false)
  const securityMsg = ref('')
  const securityMsgOk = ref(false)
  const securityCurrentPassword = ref('')
  const securityQuestions = ref<{ question: string; answer: string }[]>([
    { question: securityQuestionOptions[0], answer: '' },
    { question: securityQuestionOptions[1], answer: '' },
  ])

  // ---- 恢复码 ----
  const recoveryHasCode = ref(false)
  const recoveryCode = ref('')          // 明文，仅生成成功后短暂展示
  const recoveryGenerating = ref(false)
  const recoveryMsg = ref('')
  const recoveryMsgOk = ref(false)

  function getUsername(): string {
    try {
      return JSON.parse(localStorage.getItem('user_info') || '{}').username || ''
    } catch {
      return ''
    }
  }

  async function loadSecurityQuestions() {
    const username = getUsername()
    if (!username) return
    try {
      const res: any = await api.getSecurityQuestions(username)
      const questions = Array.isArray(res?.questions) ? res.questions : []
      securityEnabled.value = questions.length > 0
      securityQuestions.value = questions.length
        ? questions.map((q: string) => ({ question: q, answer: '' }))
        : [
            { question: securityQuestionOptions[0], answer: '' },
            { question: securityQuestionOptions[1], answer: '' },
          ]
    } catch {
      securityEnabled.value = false
      securityQuestions.value = [
        { question: securityQuestionOptions[0], answer: '' },
        { question: securityQuestionOptions[1], answer: '' },
      ]
    }
  }

  function startEditSecurity() {
    securityEditing.value = true
    securityMsg.value = ''
    securityCurrentPassword.value = ''
  }

  function cancelEditSecurity() {
    securityEditing.value = false
    securityMsg.value = ''
    securityCurrentPassword.value = ''
    loadSecurityQuestions()
  }

  async function saveSecurityQuestions() {
    const normalized = securityQuestions.value.map(q => ({
      question: String(q.question || '').trim(),
      answer: String(q.answer || '').trim(),
    }))
    if (normalized.length < 2 || normalized.some(q => !q.question || !q.answer)) {
      securityMsgOk.value = false
      securityMsg.value = '请完整填写 2 个密保问题和答案'
      return
    }
    if (new Set(normalized.map(q => q.question)).size !== normalized.length) {
      securityMsgOk.value = false
      securityMsg.value = '密保问题不能重复'
      return
    }
    if (!securityCurrentPassword.value) {
      securityMsgOk.value = false
      securityMsg.value = '请输入当前密码以确认'
      return
    }
    securitySaving.value = true
    securityMsg.value = ''
    try {
      await api.setSecurityQuestions(securityCurrentPassword.value, normalized)
      securityMsgOk.value = true
      securityMsg.value = '密保问题已保存'
      securityEditing.value = false
      securityCurrentPassword.value = ''
      await loadSecurityQuestions()
      setTimeout(() => { securityMsg.value = '' }, 3000)
    } catch (e: any) {
      securityMsgOk.value = false
      securityMsg.value = e?.message || '保存失败，请重试'
    } finally {
      securitySaving.value = false
    }
  }

  // 查询当前账号是否已生成恢复码（不返回明文）
  async function loadRecoveryStatus() {
    try {
      const res: any = await api.getRecoveryCodeStatus()
      recoveryHasCode.value = !!res?.hasCode
    } catch {
      recoveryHasCode.value = false
    }
  }

  // 生成/重新生成恢复码。明文只出现一次，不做持久化
  async function generateRecovery() {
    recoveryGenerating.value = true
    recoveryMsg.value = ''
    try {
      const res: any = await api.generateRecoveryCode()
      recoveryCode.value = res?.code || ''
      recoveryHasCode.value = true
      recoveryMsgOk.value = true
      recoveryMsg.value = '恢复码已生成，请立即保存'
    } catch (e: any) {
      recoveryMsgOk.value = false
      recoveryMsg.value = e?.message || '生成失败，请重试'
    } finally {
      recoveryGenerating.value = false
    }
  }

  function clearRecoveryCode() {
    recoveryCode.value = ''
    recoveryMsg.value = ''
  }

  async function copyRecoveryCode() {
    if (!recoveryCode.value) return
    try {
      await navigator.clipboard.writeText(recoveryCode.value)
      recoveryMsgOk.value = true
      recoveryMsg.value = '已复制到剪贴板'
    } catch {
      recoveryMsgOk.value = false
      recoveryMsg.value = '复制失败，请手动抄写保存'
    }
  }

  return {
    securityEnabled, securityEditing, securitySaving, securityMsg, securityMsgOk,
    securityCurrentPassword, securityQuestions, securityQuestionOptions,
    loadSecurityQuestions, startEditSecurity, cancelEditSecurity, saveSecurityQuestions,
    recoveryHasCode, recoveryCode, recoveryGenerating, recoveryMsg, recoveryMsgOk,
    loadRecoveryStatus, generateRecovery, clearRecoveryCode, copyRecoveryCode,
  }
}
