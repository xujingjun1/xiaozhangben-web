import { createServer } from 'vite'
import assert from 'node:assert/strict'
import dayjs from 'dayjs'
import { createPinia, setActivePinia } from 'pinia'

const tests = []
function test(name, fn) {
  tests.push({ name, fn })
}

function createLocalStorageMock() {
  const data = new Map()
  return {
    getItem: (k) => (data.has(String(k)) ? data.get(String(k)) : null),
    setItem: (k, v) => { data.set(String(k), String(v)) },
    removeItem: (k) => { data.delete(String(k)) },
    _data: data,
  }
}

async function run() {
  const localStorageMock = createLocalStorageMock()
  globalThis.localStorage = localStorageMock

  const vite = await createServer({
    server: { middlewareMode: true },
    appType: 'custom',
    logLevel: 'error',
  })

  let pass = 0
  let fail = 0

  const originalConsoleLog = console.log
  try {
    const helpers = await vite.ssrLoadModule('/src/utils/helpers.ts')
    const ai = await vite.ssrLoadModule('/src/services/ai-classifier.ts')
    const reminder = await vite.ssrLoadModule('/src/utils/reminder.ts')
    const { useExpenseStore } = await vite.ssrLoadModule('/src/stores/expense.ts')
    const parsers = await vite.ssrLoadModule('/src/utils/importParsers.ts')

    // ============ helpers ============
    test('formatMoney: 整数直接显示', () => {
      assert.equal(helpers.formatMoney(100), '¥100')
      assert.equal(helpers.formatMoney(0), '¥0')
      assert.equal(helpers.formatMoney(-50), '¥-50')
    })
    test('formatMoney: 非整数保留两位', () => {
      assert.equal(helpers.formatMoney(100.5), '¥100.50')
      assert.equal(helpers.formatMoney(123456), '¥123456.00')
    })
    test('formatMoneyCompact: 万/k/普通档位', () => {
      assert.equal(helpers.formatMoneyCompact(12000), '¥1.2万')
      assert.equal(helpers.formatMoneyCompact(5000), '¥5.0k')
      assert.equal(helpers.formatMoneyCompact(999), '¥999')
    })
    test('formatDate / getWeekdayName / getCategoryInfo 边界', () => {
      assert.equal(helpers.formatDate('2026-09-24'), '2026-09-24')
      assert.ok(helpers.getWeekdayName('2026-09-24').startsWith('周'))
      assert.equal(helpers.getCategoryInfo('不存在的分类').name, '其他')
      assert.equal(helpers.getCategoryInfo('餐饮').color, '#FF6B6B')
    })
    test('generateId: 非空且不重复', () => {
      const a = helpers.generateId()
      const b = helpers.generateId()
      assert.ok(a && b && a !== b)
    })
    test('getGreeting: 返回非空文案', () => {
      assert.ok(helpers.getGreeting().length > 0)
    })

    // ============ ai-classifier ============
    test('classifyTop: 常见商户精确匹配', () => {
      assert.equal(ai.classifyTop('星巴克'), '餐饮')
      assert.equal(ai.classifyTop('滴滴打车'), '交通')
      assert.equal(ai.classifyTop('淘宝买衣服'), '购物')
      assert.equal(ai.classifyTop('酒店住宿'), '住宿')
      assert.equal(ai.classifyTop('猫粮'), '宠物')
    })
    test('classifyTop: 空文本/空白文本边界返回其他', () => {
      assert.equal(ai.classifyTop(''), '其他')
      assert.equal(ai.classifyTop('   '), '其他')
    })
    test('classifyTop: 无匹配文本返回其他', () => {
      assert.equal(ai.classifyTop('zzzzz'), '其他')
    })
    test('classify: 空文本所有分类得分为 0 且返回全部 10 类', () => {
      const scores = ai.classify('')
      assert.equal(scores.length, 10)
      assert.ok(scores.every(s => s.score === 0))
    })
    test('classify: 返回按分数降序排列', () => {
      const scores = ai.classify('星巴克')
      for (let i = 1; i < scores.length; i++) {
        assert.ok(scores[i - 1].score >= scores[i].score)
      }
      assert.equal(scores[0].category, '餐饮')
    })
    test('submitCorrection: 用户反馈写入 localStorage', () => {
      ai.submitCorrection('测试描述', '交通')
      assert.equal(localStorageMock.getItem('category_feedback').includes('测试描述|交通'), true)
    })
    test('getTrainingStats: 样本量与分类数', () => {
      const stats = ai.getTrainingStats()
      assert.ok(stats.totalSamples > 100)
      assert.equal(stats.categories, 10)
    })

    // ============ reminder ============
    test('reminder: 默认配置为关闭且时间为 21:00', () => {
      assert.deepEqual(reminder.getReminderConfig(), { enabled: false, time: '21:00' })
    })
    test('reminder: setReminderConfig 持久化开关与时间', () => {
      reminder.setReminderConfig(true, '08:05')
      assert.equal(localStorageMock.getItem('reminder_enabled'), '1')
      assert.equal(localStorageMock.getItem('reminder_time'), '08:05')
      reminder.setReminderConfig(false, '21:00')
      assert.equal(localStorageMock.getItem('reminder_enabled'), null)
      assert.equal(localStorageMock.getItem('reminder_time'), '21:00')
    })
    test('reminder: Node 环境不支持 Notification 时安全降级', async () => {
      assert.equal(reminder.notificationSupported(), false)
      assert.equal(reminder.getPermission(), 'unsupported')
      assert.equal(await reminder.requestPermission(), 'unsupported')
    })
    test('reminder: 启动/停止轮询不抛异常', () => {
      reminder.startReminderLoop()
      reminder.startReminderLoop() // 幂等
      reminder.stopReminderLoop()
      reminder.stopReminderLoop()
      assert.ok(true)
    })

    // ============ importParsers ============
    test('parseAmount: 清洗货币符号/千分位并返回数值', () => {
      assert.equal(parsers.parseAmount('¥12.34'), 12.34)
      assert.equal(parsers.parseAmount('1,234.50'), 1234.5)
      assert.equal(parsers.parseAmount('abc'), 0)
      assert.equal(parsers.parseAmount('-25.00'), 25)
    })
    test('parseDate: 标准日期/非法日期边界', () => {
      assert.equal(parsers.parseDate('2026-09-24'), '2026-09-24')
      assert.equal(parsers.parseDate('2026/9/24'), '2026-09-24')
      assert.notEqual(parsers.parseDate('2026-02-31'), '2026-02-31')
      assert.equal(parsers.parseDate('今天'), dayjs().format('YYYY-MM-DD'))
      assert.equal(parsers.parseDate('昨天'), dayjs().subtract(1, 'day').format('YYYY-MM-DD'))
    })
    test('parseCSV: 解析标准表头并跳过收入行', () => {
      const csv = ['交易时间,交易类型,交易金额,商品说明', '2026-09-24,支出,25.50,午餐', '2026-09-24,收入,100,工资'].join(String.fromCharCode(10))
      const rows = parsers.parseCSV(csv)
      assert.equal(rows.length, 1)
      assert.equal(rows[0].amount, 25.5)
      assert.equal(rows[0].date, '2026-09-24')
      assert.equal(rows[0].description, '午餐')
    })
    test('parseJSONData: 过滤金额为 0 的记录并映射字段', () => {
      const rows = parsers.parseJSONData([
        { amount: '12.30', category: '餐饮', description: '早餐', date: '2026-09-24' },
        { amount: 0, description: '无效' },
      ])
      assert.equal(rows.length, 1)
      assert.equal(rows[0].amount, 12.3)
      assert.equal(rows[0].category, '餐饮')
      assert.equal(rows[0].date, '2026-09-24')
    })
    test('parseOCRText: 从账单文本中提取金额与日期', () => {
      const rows = parsers.parseOCRText('星巴克 25.00 2026-09-24')
      assert.equal(rows.length, 1)
      assert.equal(rows[0].amount, 25)
      assert.equal(rows[0].date, '2026-09-24')
      assert.ok(rows[0].description.includes('星巴克'))
    })

    // ============ expense store ============
    test('store: 当月/今日/分类/预算统计计算正确', () => {
      setActivePinia(createPinia())
      const store = useExpenseStore()
      const now = dayjs()
      store.selectedYear = now.year()
      store.selectedMonth = now.month() + 1
      const today = now.format('YYYY-MM-DD')
      const t1 = now.toISOString()
      const t2 = now.subtract(1, 'minute').toISOString()
      store.expenses = [
        { id: 'e1', amount: 100, category: '餐饮', description: '午餐', date: today, tags: [], isIncome: false, createdAt: t1 },
        { id: 'e2', amount: 50, category: '交通', date: today, tags: [], isIncome: false, createdAt: t2 },
        { id: 'e3', amount: 1000, category: '工资', date: today, tags: [], isIncome: true, createdAt: now.subtract(2, 'minute').toISOString() },
      ]
      assert.equal(store.todayExpenses.length, 3)
      assert.equal(store.todayExpenses[0].id, 'e1') // createdAt 降序
      assert.equal(store.todayTotal, 150)
      assert.equal(store.monthTotal, 150)
      assert.equal(store.monthIncome, 1000)
      assert.deepEqual(store.categoryTotals, { '餐饮': 100, '交通': 50 })

      store.budgets = [
        { id: 'b1', category: '餐饮', amount: 200, month: store.selectedMonth, year: store.selectedYear },
        { id: 'b2', category: '交通', amount: 20, month: store.selectedMonth, year: store.selectedYear },
      ]
      assert.equal(store.totalBudget, 220)
      assert.equal(store.totalSpent, 150)
      assert.equal(store.budgetStatus.find(b => b.category === '餐饮').pct, 50)
      assert.equal(store.budgetStatus.find(b => b.category === '交通').level, 'exceeded')
      assert.equal(store.overBudgets.length, 1)
      assert.equal(store.warningBudgets.length, 0)
    })
    test('store: init 去重，重复调用不会重复请求', async () => {
      setActivePinia(createPinia())
      const store = useExpenseStore()
      const originalFetch = globalThis.fetch
      let calls = 0
      globalThis.fetch = async () => {
        calls++
        return new Response(JSON.stringify([]), { status: 200, headers: { 'content-type': 'application/json' } })
      }
      try {
        await store.init()
        await store.init()
        assert.equal(calls, 2) // 支出 + 预算各一次
        await store.retry()
        assert.equal(calls, 4) // retry 强制刷新
      } finally {
        globalThis.fetch = originalFetch
      }
    })
    test('store: loadExpenses 错误路径清空数据并记录错误', async () => {
      setActivePinia(createPinia())
      const store = useExpenseStore()
      store.expenses = [{ id: 'x', amount: 1, category: '餐饮', date: dayjs().format('YYYY-MM-DD'), tags: [], isIncome: false, createdAt: dayjs().toISOString() }]
      const originalFetch = globalThis.fetch
      globalThis.fetch = async () => { const e = new Error('网络连接失败'); throw e }
      try {
        await store.loadExpenses()
      } finally {
        globalThis.fetch = originalFetch
      }
      assert.equal(store.loadError, '网络连接失败')
      assert.equal(store.expenses.length, 0)
    })

    // ============ run all ============
    const silentTests = new Set([
      'classifyTop: 常见商户精确匹配',
      'classifyTop: 空文本/空白文本边界返回其他',
      'classifyTop: 无匹配文本返回其他',
      'classify: 空文本所有分类得分为 0 且返回全部 10 类',
      'classify: 返回按分数降序排列',
      'submitCorrection: 用户反馈写入 localStorage',
      'getTrainingStats: 样本量与分类数',
    ])
    for (const t of tests) {
      const prevLog = console.log
      if (silentTests.has(t.name)) console.log = () => {}
      try {
        await t.fn()
        pass++
      } catch (err) {
        fail++
        console.log(`FAIL | ${t.name}`)
        console.log(`       ${err?.message || err}`)
      } finally {
        console.log = prevLog
      }
      console.log(`PASS | ${t.name}`)
    }
  } finally {
    console.log = originalConsoleLog
    await vite.close()
  }

  console.log(`\n单元测试: ${pass} 通过 / ${fail} 失败`)
  if (fail > 0) process.exitCode = 1
}

run().catch((err) => {
  console.error('测试运行失败:', err)
  process.exitCode = 1
})
