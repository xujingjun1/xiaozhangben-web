<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const rating = ref(0)
const submitted = ref(false)
const hoverRating = ref(0)
const submitting = ref(false)

function setRating(value: number) {
  rating.value = value
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

async function submitRating() {
  if (rating.value === 0 || submitting.value) return
  submitting.value = true
  
  try {
    const userId = localStorage.getItem('user_id')
    const res = await fetch(`${API_URL}/ratings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Id': userId || '',
      },
      body: JSON.stringify({ rating: rating.value }),
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
      <h1 class="text-xl font-bold text-txt">给我们评分</h1>
    </div>

    <!-- 评分卡片 -->
    <div v-if="!submitted" class="bg-white rounded-2xl p-6 text-center">
      <!-- 图标 -->
      <div class="w-20 h-20 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
        <span class="material-icons-round text-primary text-4xl">favorite</span>
      </div>
      
      <h2 class="text-lg font-semibold text-txt mb-2">喜欢小账本吗？</h2>
      <p class="text-sm text-txt-secondary mb-6">您的评分是我们前进的动力</p>
      
      <!-- 星星评分 -->
      <div class="flex justify-center gap-3 mb-6">
        <button
          v-for="i in 5"
          :key="i"
          @click="setRating(i)"
          @mouseenter="hoverRating = i"
          @mouseleave="hoverRating = 0"
          class="transition-transform duration-200"
          :class="i <= (hoverRating || rating) ? 'scale-110' : 'scale-100'"
        >
          <span
            class="material-icons-round text-4xl"
            :class="i <= (hoverRating || rating) ? 'text-yellow-400' : 'text-gray-300'"
          >{{ i <= (hoverRating || rating) ? 'star' : 'star_border' }}</span>
        </button>
      </div>
      
      <!-- 评分文字 -->
      <p class="text-sm text-txt-secondary mb-6">
        {{ rating === 0 ? '点击星星评分' : 
           rating <= 2 ? '很抱歉让您失望了，我们会努力改进' :
           rating <= 4 ? '感谢您的支持，我们会继续努力' :
           '太棒了！感谢您的认可' }}
      </p>
      
      <!-- 提交按钮 -->
      <button
        @click="submitRating"
        :disabled="rating === 0"
        class="w-full py-3 rounded-xl text-sm font-medium transition-all active:scale-95"
        :class="rating === 0 ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-gradient-to-r from-primary to-primary-light text-white shadow-lg shadow-primary/30'"
      >
        提交评分
      </button>
    </div>

    <!-- 感谢页面 -->
    <div v-else class="bg-white rounded-2xl p-6 text-center">
      <div class="w-20 h-20 mx-auto mb-4 rounded-full bg-green-50 flex items-center justify-center">
        <span class="material-icons-round text-green-500 text-4xl">check_circle</span>
      </div>
      <h2 class="text-lg font-semibold text-txt mb-2">感谢您的评分！</h2>
      <p class="text-sm text-txt-secondary mb-6">您的反馈对我们非常重要</p>
      <button
        @click="goBack"
        class="w-full py-3 rounded-xl text-sm font-medium bg-gradient-to-r from-primary to-primary-light text-white shadow-lg shadow-primary/30 active:scale-95 transition-transform"
      >
        返回
      </button>
    </div>
  </div>
</template>
