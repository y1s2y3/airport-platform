<script setup>
import { useAppPhoneScale, APP_PHONE_WIDTH, APP_PHONE_HEIGHT } from '../../composables/useAppPhoneFrame.js'

defineProps({
  /** 底部预留（底栏高度），登录页为 0 */
  bottomPad: { type: Number, default: 0 },
})

const { scale } = useAppPhoneScale()
</script>

<template>
  <div class="app-shell-outer">
    <div
      class="phone-scaler"
      :style="{
        width: `${APP_PHONE_WIDTH * scale}px`,
        height: `${APP_PHONE_HEIGHT * scale}px`,
      }"
    >
      <div
        class="phone-frame"
        :style="{
          width: `${APP_PHONE_WIDTH}px`,
          height: `${APP_PHONE_HEIGHT}px`,
          paddingBottom: bottomPad ? `${bottomPad}px` : '0',
          transform: `scale(${scale})`,
        }"
      >
        <slot />
      </div>
    </div>
  </div>
</template>

<style scoped>
.app-shell-outer {
  min-height: 100vh;
  background: #1a1a1a;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: auto;
  font-family: 'PingFang SC', -apple-system, sans-serif;
}
.phone-scaler {
  position: relative;
  flex-shrink: 0;
}
.phone-frame {
  position: absolute;
  left: 0;
  top: 0;
  background: #f4f5f7;
  box-sizing: border-box;
  transform-origin: top left;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
</style>
