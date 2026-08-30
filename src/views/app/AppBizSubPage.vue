<script setup>
/**
 * 业务二级页：统一顶栏 + 将 402 宽移动端页等比放大到 1080 画布
 */
import { computed, nextTick, onMounted, onUnmounted, onUpdated, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { APP_PHONE_WIDTH } from '../../composables/useAppPhoneFrame.js'

const props = defineProps({
  title: { type: String, default: '' },
  /** 是否对内嵌移动端页做 402→1080 缩放 */
  scaleMobile: { type: Boolean, default: true },
  /** 返回路径，默认业务功能 */
  backTo: { type: String, default: '/app/biz' },
  /** 返回 query */
  backQuery: { type: Object, default: null },
})

const MOBILE_DESIGN_W = 402
const zoom = APP_PHONE_WIDTH / MOBILE_DESIGN_W

const route = useRoute()
const router = useRouter()
const innerRef = ref(null)
const hostHeight = ref(0)
let resizeObserver = null

const titleText = computed(() => props.title || route.meta?.title || '详情')

function goBack() {
  if (props.backQuery) {
    router.push({ path: props.backTo, query: props.backQuery })
    return
  }
  router.push(props.backTo)
}

function measure() {
  if (!props.scaleMobile) {
    hostHeight.value = 0
    return
  }
  const el = innerRef.value
  if (!el) return
  const h = el.scrollHeight || el.offsetHeight || 0
  hostHeight.value = Math.ceil(h * zoom)
}

function bindObserver() {
  if (resizeObserver) {
    resizeObserver.disconnect()
    resizeObserver = null
  }
  const el = innerRef.value
  if (!el || typeof ResizeObserver === 'undefined') return
  resizeObserver = new ResizeObserver(() => measure())
  resizeObserver.observe(el)
}

onMounted(() => {
  nextTick(() => {
    measure()
    bindObserver()
    setTimeout(measure, 120)
    setTimeout(measure, 400)
  })
})
onUpdated(() => nextTick(measure))
onUnmounted(() => {
  if (resizeObserver) resizeObserver.disconnect()
})
watch(
  () => route.fullPath,
  () =>
    nextTick(() => {
      measure()
      bindObserver()
    }),
)
</script>

<template>
  <div class="sub-page">
    <header class="sub-header">
      <button type="button" class="back" @click="goBack">‹</button>
      <h1>{{ titleText }}</h1>
      <span class="spacer" />
    </header>
    <div
      v-if="scaleMobile"
      class="scale-host"
      :style="{ height: hostHeight ? `${hostHeight}px` : 'auto' }"
    >
      <div
        ref="innerRef"
        class="scale-inner hide-inner-header"
        :style="{
          width: `${MOBILE_DESIGN_W}px`,
          transform: `scale(${zoom})`,
        }"
      >
        <slot />
      </div>
    </div>
    <div v-else class="plain-host">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.sub-page {
  min-height: 100%;
  background: #f4f5f7;
  display: flex;
  flex-direction: column;
}
.sub-header {
  display: flex;
  align-items: center;
  padding: 24px 16px;
  background: #8f0045;
  color: #fff;
  flex-shrink: 0;
  position: sticky;
  top: 0;
  z-index: 30;
}
.back {
  width: 72px;
  border: none;
  background: transparent;
  color: #fff;
  font-size: 56px;
  line-height: 1;
  padding: 0;
  cursor: pointer;
  text-align: left;
}
.sub-header h1 {
  flex: 1;
  margin: 0;
  text-align: center;
  font-size: 36px;
  font-weight: 600;
}
.spacer {
  width: 72px;
}
.scale-host {
  position: relative;
  width: 100%;
  overflow: hidden;
  background: #f5f5f5;
}
.scale-inner {
  transform-origin: top left;
}
.plain-host {
  flex: 1;
  min-height: 0;
}
.hide-inner-header :deep(.m-header),
.hide-inner-header :deep(.mh),
.hide-inner-header :deep(.mobile-header) {
  display: none !important;
}
.hide-inner-header :deep(.mobile-page),
.hide-inner-header :deep(.mp),
.hide-inner-header :deep(.message-page) {
  max-width: none !important;
  width: 402px !important;
  margin: 0 !important;
  min-height: auto !important;
  box-shadow: none !important;
}
</style>
