<script setup lang="ts">
import { formatDateShort, formatMoney, getCategoryInfo } from '@/utils/helpers'
import type { Expense } from '@/db'

const props = defineProps<{ expense: Expense }>()
const emit = defineEmits<{ delete: []; click: [] }>()

const info = getCategoryInfo(props.expense.category)
</script>

<template>
  <div
    @click="emit('click')"
    class="bg-white rounded-2xl p-3.5 flex items-center gap-3 shadow-sm active:scale-[0.98] transition-transform cursor-pointer"
  >
    <div class="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
      :style="{ backgroundColor: info.color + '18' }">
      <span class="material-icons-round text-xl" :style="{ color: info.color }">{{ info.icon }}</span>
    </div>

    <div class="flex-1 min-w-0">
      <p class="text-[15px] font-medium text-txt truncate">{{ expense.description || expense.category }}</p>
      <div class="flex items-center gap-1.5 mt-1">
        <span class="text-[10px] px-1.5 py-0.5 rounded font-medium"
          :style="{ backgroundColor: info.color + '12', color: info.color }">{{ expense.category }}</span>
        <span v-for="tag in expense.tags.slice(0, 2)" :key="tag"
          class="text-[10px] px-1.5 py-0.5 rounded bg-surface text-txt-secondary">{{ tag }}</span>
      </div>
    </div>

    <div class="text-right flex-shrink-0">
      <p class="text-base font-bold" :class="expense.isIncome ? 'text-income' : 'text-expense'">
        {{ expense.isIncome ? '+' : '-' }}{{ formatMoney(expense.amount) }}
      </p>
      <p class="text-[10px] text-txt-hint mt-0.5">
        {{ expense.date?.slice(5) || '' }}
      </p>
    </div>
  </div>
</template>
