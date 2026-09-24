import { ref } from 'vue'
import { useExpenseStore } from '@/stores/expense'
import { api } from '@/services/api'

export function useDataManagement() {
  const store = useExpenseStore()
  const dataMsg = ref('')
  const dataMsgOk = ref(false)
  const restoring = ref(false)
  const restoringProgress = ref('')
  const restoreInput = ref<HTMLInputElement | null>(null)
  const clearing = ref(false)

  function showDataMsg(ok: boolean, msg: string) {
    dataMsgOk.value = ok
    dataMsg.value = msg
    setTimeout(() => { if (dataMsg.value === msg) dataMsg.value = '' }, 3000)
  }

  function downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  function exportCSV() {
    const rows = store.expenses
    if (!rows.length) { showDataMsg(false, '暂无可导出的数据'); return }
    const esc = (v: any) => '"' + String(v ?? '').replace(/"/g, '""') + '"'
    const header = ['日期', '分类', '描述', '金额', '类型', '标签', '创建时间'].join(',')
    const lines = rows.map(e =>
      [e.date, e.category, e.description, e.amount, e.isIncome ? '收入' : '支出',
        (e.tags || []).join('|'), e.createdAt].map(esc).join(',')
    )
    const blob = new Blob(['\uFEFF' + [header, ...lines].join('\r\n')], { type: 'text/csv;charset=utf-8' })
    downloadBlob(blob, `小账本明细_${new Date().toISOString().slice(0, 10)}.csv`)
    showDataMsg(true, `已导出 ${rows.length} 条记录`)
  }

  async function exportData() {
    try {
      const data = await api.exportData()
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      downloadBlob(blob, '小账本数据_' + new Date().toLocaleDateString() + '.json')
    } catch {
      alert('导出失败')
    }
  }

  async function onRestoreFile(e: Event) {
    const input = e.target as HTMLInputElement
    const file = input.files?.[0]
    input.value = ''
    if (!file) return
    let data: any
    try {
      data = JSON.parse(await file.text())
    } catch {
      showDataMsg(false, '文件不是有效的 JSON 格式')
      return
    }
    if (!Array.isArray(data.expenses)) {
      showDataMsg(false, '不是小账本的备份文件（缺少 expenses 字段）')
      return
    }
    const nExp = data.expenses.length
    const nBud = Array.isArray(data.budgets) ? data.budgets.length : 0
    if (!confirm(`将恢复 ${nExp} 条记录、${nBud} 条预算。\n相同日期与内容的记录会被覆盖合并，继续？`)) return

    restoring.value = true
    try {
      let done = 0
      for (const exp of data.expenses) {
        await api.addExpense(exp)
        done++
        restoringProgress.value = `恢复中 ${done}/${nExp}`
      }
      restoringProgress.value = ''
      for (const b of data.budgets || []) {
        await api.addBudget(b)
      }
      await store.retry()
      showDataMsg(true, `恢复完成：${nExp} 条记录、${nBud} 条预算`)
    } catch (err: any) {
      showDataMsg(false, '恢复失败：' + (err?.message || '未知错误'))
    } finally {
      restoring.value = false
    }
  }

  async function clearAllData() {
    if (!confirm('⚠️ 确定要清空全部记账记录吗？\n此操作不可恢复，建议先「备份数据」！')) return
    if (!confirm('再次确认：真的要清空所有记录吗？（预算和个人资料会保留）')) return
    clearing.value = true
    try {
      const res: any = await api.clearExpenses()
      await store.retry()
      showDataMsg(true, `已清空 ${res?.deleted ?? '全部'} 条记录`)
    } catch (err: any) {
      showDataMsg(false, '清空失败：' + (err?.message || '未知错误'))
    } finally {
      clearing.value = false
    }
  }

  return {
    dataMsg, dataMsgOk, restoring, restoringProgress, restoreInput, clearing,
    showDataMsg, exportCSV, exportData, onRestoreFile, clearAllData,
  }
}
