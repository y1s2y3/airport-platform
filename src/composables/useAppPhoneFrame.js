/**
 * 建管 APP 竖屏画布：1080 × 1920（1920×1080 竖屏）
 */
import { onMounted, onUnmounted, ref } from 'vue'

export const APP_PHONE_WIDTH = 1080
export const APP_PHONE_HEIGHT = 1920

export function useAppPhoneScale() {
  const scale = ref(1)

  function updateScale() {
    const pad = 32
    const sw = (window.innerWidth - pad) / APP_PHONE_WIDTH
    const sh = (window.innerHeight - pad) / APP_PHONE_HEIGHT
    scale.value = Math.min(1, sw, sh)
  }

  onMounted(() => {
    updateScale()
    window.addEventListener('resize', updateScale)
  })
  onUnmounted(() => {
    window.removeEventListener('resize', updateScale)
  })

  return { scale, APP_PHONE_WIDTH, APP_PHONE_HEIGHT, updateScale }
}
