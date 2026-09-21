import { ref, computed, onMounted, onUnmounted } from 'vue'

export type Platform = 'desktop' | 'mobile'

function detectPlatformNow(): Platform {
  if (typeof window === 'undefined') return 'mobile'
  const isTauri = !!(window as any).__TAURI__
  if (isTauri || window.innerWidth >= 900) return 'desktop'
  return 'mobile'
}

// Initialize immediately at module load time
const platform = ref<Platform>(detectPlatformNow())
const windowWidth = ref(typeof window !== 'undefined' ? window.innerWidth : 1024)

export function useDesktop() {
  let resizeHandler: (() => void) | null = null

  // Re-check on mount (handles edge cases)
  platform.value = detectPlatformNow()

  onMounted(() => {
    windowWidth.value = window.innerWidth
    resizeHandler = () => {
      windowWidth.value = window.innerWidth
      platform.value = detectPlatformNow()
    }
    window.addEventListener('resize', resizeHandler)
  })

  onUnmounted(() => {
    if (resizeHandler) {
      window.removeEventListener('resize', resizeHandler)
    }
  })

  return {
    platform: computed(() => platform.value),
    isDesktop: computed(() => platform.value === 'desktop'),
    isMobile: computed(() => platform.value === 'mobile'),
    windowWidth: computed(() => windowWidth.value),
  }
}
