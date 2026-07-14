<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

// 常见问题
const faqList = [
  { question: '如何添加记账记录？', answer: '点击底部的"+"按钮，输入金额、选择分类、添加备注，即可完成记账。' },
  { question: '如何修改或删除记录？', answer: '在首页点击要修改的记录，进入编辑页面，可以修改或删除。' },
  { question: '数据会丢失吗？', answer: '数据存储在本地数据库中，清除浏览器数据可能导致丢失。建议定期使用"导出数据"功能备份。' },
  { question: '如何导出数据？', answer: '进入"我的" → "数据管理" → "导出数据"，即可将所有记录导出为JSON文件。' },
  { question: '深色模式在哪里？', answer: '进入"我的"页面，找到"深色模式"开关，点击即可切换。' },
]

const expandedFaq = ref<number | null>(null)

function toggleFaq(index: number) {
  expandedFaq.value = expandedFaq.value === index ? null : index
}

// 反馈表单
const feedbackType = ref('建议')
const feedbackContent = ref('')
const feedbackContact = ref('')
const submitted = ref(false)
const submitting = ref(false)

const feedbackTypes = ['建议', '问题反馈', '功能需求', '其他']

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

async function submitFeedback() {
  if (!feedbackContent.value.trim()) return
  submitting.value = true
  
  try {
    const userId = localStorage.getItem('user_id')
    const res = await fetch(`${API_URL}/feedbacks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Id': userId || '',
      },
      body: JSON.stringify({
        type: feedbackType.value,
        content: feedbackContent.value,
        contact: feedbackContact.value,
      }),
    })
    
    if (res.ok) {
      submitted.value = true
    } else {
      alert('提交失败，请重试')
    }
  } catch (e) {
    alert('网络错误，请重试')
  } finally {
    submitting.value = false
  }
}

function goBack() {
  router.back()
}
</script>

<template>
  <div class="px-5 pt-4 pb-24 min-h-screen bg-background">
    <!-- Header -->
    <div class="flex items-center gap-3 mb-6">
      <button @click="goBack" class="p-2 rounded-xl hover:bg-surface transition">
        <span class="material-icons-round text-txt-secondary">arrow_back</span>
      </button>
      <h1 class="text-xl font-bold text-txt">帮助与反馈</h1>
    </div>

    <!-- 常见问题 -->
    <h2 class="text-sm font-semibold text-txt-secondary mb-3">常见问题</h2>
    <div class="bg-white rounded-2xl mb-6 divide-y divide-surface">
      <div
        v-for="(faq, index) in faqList"
        :key="index"
        class="cursor-pointer"
        @click="toggleFaq(index)"
      >
        <div class="flex items-center justify-between px-4 py-4">
          <span class="text-sm text-txt flex-1 pr-2">{{ faq.question }}</span>
          <span
            class="material-icons-round text-txt-hint transition-transform duration-200"
            :class="expandedFaq === index ? 'rotate-180' : ''"
          >expand_more</span>
        </div>
        <div
          v-if="expandedFaq === index"
          class="px-4 pb-4"
        >
          <p class="text-sm text-txt-secondary leading-relaxed">{{ faq.answer }}</p>
        </div>
      </div>
    </div>

    <!-- 意见反馈 -->
    <div v-if="!submitted">
      <h2 class="text-sm font-semibold text-txt-secondary mb-3">意见反馈</h2>
      <div class="bg-white rounded-2xl p-4">
        <!-- 反馈类型 -->
        <div class="mb-4">
          <p class="text-xs text-txt-secondary mb-2">反馈类型</p>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="type in feedbackTypes"
              :key="type"
              @click="feedbackType = type"
              class="px-3 py-1.5 rounded-full text-xs font-medium transition-all"
              :class="feedbackType === type ? 'bg-primary text-white' : 'bg-surface text-txt-secondary'"
            >
              {{ type }}
            </button>
          </div>
        </div>

        <!-- 反馈内容 -->
        <div class="mb-4">
          <p class="text-xs text-txt-secondary mb-2">反馈内容</p>
          <textarea
            v-model="feedbackContent"
            placeholder="请详细描述您的问题或建议..."
            rows="4"
            class="w-full px-3 py-2 bg-surface rounded-xl text-sm text-txt placeholder-txt-hint outline-none resize-none"
          ></textarea>
        </div>

        <!-- 联系方式 -->
        <div class="mb-4">
          <p class="text-xs text-txt-secondary mb-2">联系方式（选填）</p>
          <input
            v-model="feedbackContact"
            type="text"
            placeholder="邮箱或手机号，方便我们联系您"
            class="w-full px-3 py-2 bg-surface rounded-xl text-sm text-txt placeholder-txt-hint outline-none"
          />
        </div>

        <!-- 提交按钮 -->
        <button
          @click="submitFeedback"
          :disabled="!feedbackContent.trim() || submitting"
          class="w-full py-3 rounded-xl text-sm font-medium transition-all active:scale-95"
          :class="!feedbackContent.trim() || submitting ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-gradient-to-r from-primary to-primary-light text-white shadow-lg shadow-primary/30'"
        >
          {{ submitting ? '提交中...' : '提交反馈' }}
        </button>
      </div>
    </div>

    <!-- 提交成功 -->
    <div v-else class="bg-white rounded-2xl p-6 text-center">
      <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-green-50 flex items-center justify-center">
        <span class="material-icons-round text-green-500 text-3xl">check_circle</span>
      </div>
      <h2 class="text-lg font-semibold text-txt mb-2">反馈已收到</h2>
      <p class="text-sm text-txt-secondary mb-6">感谢您的反馈，我们会认真考虑每一条建议</p>
      <button
        @click="goBack"
        class="w-full py-3 rounded-xl text-sm font-medium bg-gradient-to-r from-primary to-primary-light text-white shadow-lg shadow-primary/30 active:scale-95 transition-transform"
      >
        返回
      </button>
    </div>
  </div>
</template>
