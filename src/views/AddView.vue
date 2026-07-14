<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useExpenseStore } from '@/stores/expense'
import { categories, defaultTags, generateId } from '@/utils/helpers'
import { categorize } from '@/services/ai'
import { classifyTop, submitCorrection, getTrainingStats } from '@/services/ai-classifier'
import type { Expense } from '@/db'
import dayjs from 'dayjs'

const store = useExpenseStore()
const router = useRouter()
const route = useRoute()

const amount = ref('')
const description = ref('')
const selectedCategory = ref('餐饮')
const selectedTags = ref<string[]>([])
const isIncome = ref(false)
const selectedDate = ref(dayjs().format('YYYY-MM-DD'))
const editId = ref<string | null>(null)

const isEditing = computed(() => !!editId.value)

onMounted(async () => {
  await store.init()
  if (route.params.id) {
    editId.value = route.params.id as string
    const expense = store.expenses.find(e => e.id === editId.value)
    if (expense) {
      amount.value = expense.amount.toString()
      description.value = expense.description || ''
      selectedCategory.value = expense.category
      selectedTags.value = [...expense.tags]
      isIncome.value = expense.isIncome
      selectedDate.value = expense.date
    }
  }
})

function onDescInput() {
  if (description.value) {
    // 使用 AI 分类引擎
    const suggested = classifyTop(description.value)
    if (suggested !== '其他') selectedCategory.value = suggested
    console.log(`[AI分类] "${description.value}" → ${suggested}`)
  }
}

// 用户纠正分类（反馈学习）
function onCategoryCorrect(category: string) {
  if (description.value) {
    submitCorrection(description.value, category)
    console.log(`[AI分类] 用户纠正: "${description.value}" → ${category}`)
  }
}

// 获取训练统计
const trainingInfo = computed(() => getTrainingStats())

async function save() {
  const num = parseFloat(amount.value)
  if (!num || num <= 0) return

  const expense: Expense = {
    id: editId.value || generateId(),
    amount: num,
    category: selectedCategory.value,
    description: description.value || undefined,
    date: selectedDate.value,
    tags: selectedTags.value,
    isIncome: isIncome.value,
    createdAt: dayjs().toISOString(),
  }

  if (isEditing.value) {
    await store.updateExpense(expense)
  } else {
    await store.addExpense(expense)
  }
  router.back()
}
</script>

<template>
  <div class="min-h-screen bg-background max-w-[480px] mx-auto px-5 pt-4">
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <button @click="router.back()" class="p-2 rounded-xl hover:bg-surface transition">
        <span class="material-icons-round text-txt-secondary">close</span>
      </button>
      <h1 class="text-lg font-semibold text-txt">{{ isEditing ? '编辑记录' : '记一笔' }}</h1>
      <div class="w-10"></div>
    </div>

    <!-- Amount Input -->
    <div class="bg-white rounded-3xl p-5 shadow-sm mb-6">
      <p class="text-sm text-txt-secondary text-center">{{ isIncome ? '收入金额' : '支出金额' }}</p>
      <div class="flex items-center justify-center mt-2">
        <span class="text-3xl font-bold" :class="isIncome ? 'text-income' : 'text-expense'">¥</span>
        <input
          v-model="amount"
          type="number"
          inputmode="decimal"
          placeholder="0.00"
          class="text-5xl font-bold text-center w-48 bg-transparent outline-none"
          :class="isIncome ? 'text-income' : 'text-expense'"
        />
      </div>
    </div>

    <!-- Income/Expense Toggle -->
    <div class="flex bg-surface rounded-xl p-1 mb-6">
      <button
        @click="isIncome = false"
        class="flex-1 py-3 rounded-lg text-sm font-semibold transition-all"
        :class="!isIncome ? 'bg-white text-expense shadow-sm' : 'text-txt-hint'"
      >
        <span class="material-icons-round text-base align-middle mr-1">arrow_downward</span>支出
      </button>
      <button
        @click="isIncome = true"
        class="flex-1 py-3 rounded-lg text-sm font-semibold transition-all"
        :class="isIncome ? 'bg-white text-income shadow-sm' : 'text-txt-hint'"
      >
        <span class="material-icons-round text-base align-middle mr-1">arrow_upward</span>收入
      </button>
    </div>

    <!-- Category Grid -->
    <div class="flex items-center justify-between mb-3">
      <p class="text-base font-semibold text-txt">选择分类</p>
      <span class="text-xs text-txt-hint">AI分类引擎 · {{ trainingInfo.totalSamples }}样本</span>
    </div>
    <div class="grid grid-cols-4 gap-2.5 mb-6">
      <button
        v-for="cat in categories"
        :key="cat.name"
        @click="selectedCategory = cat.name; onCategoryCorrect(cat.name)"
        class="flex flex-col items-center py-3 rounded-2xl transition-all duration-200"
        :class="selectedCategory === cat.name
          ? 'border-2 shadow-sm'
          : 'bg-white border-2 border-transparent'"
        :style="selectedCategory === cat.name
          ? { borderColor: cat.color, backgroundColor: cat.color + '15' }
          : {}"
      >
        <span class="material-icons-round text-2xl mb-1"
          :style="{ color: selectedCategory === cat.name ? cat.color : '#8B87B0' }"
        >{{ cat.icon }}</span>
        <span class="text-xs font-medium"
          :style="{ color: selectedCategory === cat.name ? cat.color : '#8B87B0' }"
        >{{ cat.name }}</span>
      </button>
    </div>

    <!-- Description -->
    <input
      v-model="description"
      @input="onDescInput"
      placeholder="添加备注... (输入内容会自动匹配分类)"
      class="w-full bg-white rounded-2xl px-4 py-3.5 text-sm outline-none mb-5 placeholder:text-txt-hint"
    />

    <!-- Tags -->
    <p class="text-base font-semibold text-txt mb-3">生活标签</p>
    <div class="flex flex-wrap gap-2 mb-5">
      <button
        v-for="tag in defaultTags"
        :key="tag.name"
        @click="selectedTags.includes(tag.name) ? selectedTags.splice(selectedTags.indexOf(tag.name), 1) : selectedTags.push(tag.name)"
        class="px-3.5 py-2 rounded-full text-xs font-medium transition-all border"
        :class="selectedTags.includes(tag.name)
          ? 'bg-primary/10 border-primary text-primary'
          : 'bg-white border-surface text-txt-secondary'"
      >
        {{ tag.emoji }} {{ tag.name }}
      </button>
    </div>

    <!-- Date -->
    <input
      v-model="selectedDate"
      type="date"
      class="w-full bg-white rounded-2xl px-4 py-3.5 text-sm outline-none mb-8 text-txt"
    />

    <!-- Save Button -->
    <button
      @click="save"
      class="w-full py-4 bg-gradient-to-r from-primary to-primary-light text-white text-lg font-semibold rounded-2xl shadow-lg shadow-primary/30 active:scale-95 transition-transform mb-4"
    >
      {{ isEditing ? '保存修改' : '记一笔' }}
    </button>

    <!-- 智能导入入口 -->
    <button
      @click="router.push('/import')"
      class="w-full flex items-center justify-center gap-2 py-3 bg-white text-primary text-sm font-medium rounded-2xl border border-primary/20 hover:bg-primary/5 transition active:scale-95"
    >
      <span class="material-icons-round text-lg">document_scanner</span>
      智能导入（图片/CSV/JSON）
      <span class="material-icons-round text-sm">chevron_right</span>
    </button>
  </div>
</template>
