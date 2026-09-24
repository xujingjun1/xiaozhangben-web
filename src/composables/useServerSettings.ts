import { ref } from 'vue'
import { getApiUrl, setApiUrl, resetApiUrl } from '@/services/api'

export function useServerSettings() {
  const serverUrl = ref(getApiUrl())
  const editingServerUrl = ref(false)
  const tempServerUrl = ref('')
  const serverTestMsg = ref('')
  const serverTestStatus = ref<'ok' | 'fail' | ''>('')

  function startEditServerUrl() {
    tempServerUrl.value = serverUrl.value
    editingServerUrl.value = true
    serverTestMsg.value = ''
    serverTestStatus.value = ''
  }

  function cancelEditServerUrl() {
    editingServerUrl.value = false
    serverTestMsg.value = ''
  }

  function saveServerUrl() {
    const url = tempServerUrl.value.trim().replace(/\/+$/, '')
    if (!url) { resetApiUrl(); serverUrl.value = getApiUrl(); editingServerUrl.value = false; return }
    setApiUrl(url)
    serverUrl.value = url
    editingServerUrl.value = false
    serverTestMsg.value = '服务器地址已更新，刷新后生效'
    serverTestStatus.value = 'ok'
    setTimeout(() => serverTestMsg.value = '', 3000)
  }

  async function testServerConnection() {
    const url = (tempServerUrl.value || serverUrl.value).trim().replace(/\/+$/, '')
    if (!url) return
    serverTestMsg.value = '正在测试连接...'
    serverTestStatus.value = ''
    try {
      const res = await fetch(url + '/health', { method: 'GET', signal: AbortSignal.timeout(5000) })
      if (res.ok) {
        serverTestMsg.value = '连接成功!'
        serverTestStatus.value = 'ok'
      } else {
        serverTestMsg.value = '服务器返回错误 ' + res.status
        serverTestStatus.value = 'fail'
      }
    } catch {
      serverTestMsg.value = '无法连接到服务器'
      serverTestStatus.value = 'fail'
    }
  }

  return {
    serverUrl, editingServerUrl, tempServerUrl, serverTestMsg, serverTestStatus,
    startEditServerUrl, cancelEditServerUrl, saveServerUrl, testServerConnection,
  }
}
