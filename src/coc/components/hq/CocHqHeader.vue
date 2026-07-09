<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { Close } from '@element-plus/icons-vue'
import HqNavTabsLeft from './HqNavTabsLeft.vue'
import HqNavTabsRight from './HqNavTabsRight.vue'
import headerBg from '../../assets/hq/header/header-bg.png'
import weatherIcon from '../../assets/hq/header/weather-icon.svg?url'

const now = ref(new Date())
let timer = null

function pad(n) {
  return String(n).padStart(2, '0')
}

const clockText = ref('')
const dateText = ref('')
const weekdayText = ref('')

const WEEKDAYS = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']

function tick() {
  now.value = new Date()
  clockText.value = `${pad(now.value.getHours())}:${pad(now.value.getMinutes())}:${pad(now.value.getSeconds())}`
  dateText.value = `${now.value.getFullYear()}-${pad(now.value.getMonth() + 1)}-${pad(now.value.getDate())}`
  weekdayText.value = WEEKDAYS[now.value.getDay()]
}

function handleCloseScreen() {
  if (window.opener && !window.opener.closed) {
    window.close()
    return
  }
  window.close()
  window.setTimeout(() => {
    if (!window.closed) {
      window.location.hash = '#/workbench'
    }
  }, 120)
}

function onKeydown(e) {
  if (e.key === 'Escape') handleCloseScreen()
}

onMounted(() => {
  tick()
  timer = window.setInterval(tick, 1000)
  window.addEventListener('keydown', onKeydown)
})

onUnmounted(() => {
  if (timer) window.clearInterval(timer)
  window.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <header class="hq-header">
    <img
      class="hq-header__bg"
      :src="headerBg"
      alt=""
      aria-hidden="true"
      draggable="false"
    />
    <h1 class="hq-header__title">智慧工程建设管控一体化平台</h1>

    <div class="hq-header__overlay">
      <nav class="hq-header__nav hq-header__nav--left" aria-label="主导航">
        <HqNavTabsLeft />
      </nav>

      <div class="hq-header__right">
        <nav class="hq-header__nav hq-header__nav--right" aria-label="副导航">
          <HqNavTabsRight />
        </nav>

        <div class="hq-header__status">
          <div class="hq-header__clock">
            <span class="hq-header__time">{{ clockText }}</span>
            <div class="hq-header__date">
              <span>{{ dateText }}</span>
              <span>{{ weekdayText }}</span>
            </div>
          </div>
          <span class="hq-header__divider" aria-hidden="true" />
          <div class="hq-header__weather">
            <img
              class="hq-header__weather-icon"
              :src="weatherIcon"
              width="36"
              height="36"
              alt=""
              aria-hidden="true"
              draggable="false"
            />
            <span class="hq-header__weather-temp">32℃</span>
          </div>
          <button type="button" class="hq-header__close" title="关闭" @click="handleCloseScreen">
            <el-icon :size="16"><Close /></el-icon>
          </button>
        </div>
      </div>
    </div>
  </header>
</template>

<style scoped>
.hq-header {
  position: relative;
  flex-shrink: 0;
  align-self: stretch;
  width: 100%;
  max-width: 100%;
  height: var(--coc-header-h);
  min-height: var(--coc-header-h);
  overflow: visible;
  z-index: 10;
}

.hq-header__bg {
  position: absolute;
  inset: 0;
  display: block;
  width: 100%;
  height: 100%;
  object-fit: fill;
  object-position: center top;
  pointer-events: none;
  user-select: none;
  z-index: 0;
}

.hq-header__title {
  position: absolute;
  left: 0;
  right: 0;
  top: -2px;
  width: 100%;
  margin: 0;
  height: 67px;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  box-sizing: border-box;
  padding: 6px 12px 0 4px;
  font-size: calc(30px + var(--coc-font-boost));
  font-weight: 700;
  color: #fff;
  letter-spacing: 1.2px;
  white-space: nowrap;
  text-shadow: 0 3px 4px rgba(25, 56, 72, 0.67);
  z-index: 2;
  pointer-events: none;
}

.hq-header__overlay {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: 1fr 1fr;
  align-items: flex-end;
  height: 100%;
  padding: 0 calc(20px + var(--coc-hq-edge-inset, 0px)) var(--coc-hq-header-bottom-gap, 22px)
    calc(20px + var(--coc-hq-edge-inset, 0px));
  box-sizing: border-box;
}

.hq-header__nav {
  display: flex;
  align-items: center;
  gap: 12px;
}

.hq-header__nav--left {
  grid-column: 1;
  justify-self: center;
  transform: translateX(-160px);
  padding-left: 0;
  gap: 0;
}

.hq-header__right {
  grid-column: 2;
  justify-self: end;
  display: flex;
  align-items: center;
  gap: 16px;
  min-width: 0;
}

.hq-header__nav--right {
  padding-right: 0;
  gap: 0;
}

.hq-header__status {
  display: flex;
  align-items: center;
  gap: 12px;
}

.hq-header__clock {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #fff;
}

.hq-header__time {
  font-size: calc(24px + var(--coc-font-boost));
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  line-height: 1;
}

.hq-header__date {
  display: flex;
  flex-direction: column;
  font-size: calc(10px + var(--coc-font-boost));
  line-height: 1.35;
  opacity: 0.9;
}

.hq-header__divider {
  width: 1px;
  height: 22px;
  background: rgba(255, 255, 255, 0.25);
}

.hq-header__weather {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #fff;
}

.hq-header__weather-icon {
  display: block;
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  user-select: none;
  pointer-events: none;
}

.hq-header__weather-temp {
  font-size: calc(22px + var(--coc-font-boost));
  font-weight: 600;
  line-height: 1;
}

.hq-header__close {
  margin: 0;
  padding: 4px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: rgba(255, 255, 255, 0.72);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.hq-header__close:hover {
  color: #5eeeff;
  background: rgba(94, 238, 255, 0.12);
}
</style>
