<script setup>
import SsPanelCard from './SsPanelCard.vue'

/**
 * 左右数据栏：一整块连续面板（参照大屏参考稿），内部按区块用「标题 + 渐变分隔线」组织，
 * 不再拆成多张独立卡片。
 */
defineProps({
  side: { type: String, required: true },
  panels: { type: Array, default: () => [] },
  open: { type: Boolean, default: true },
})
</script>

<template>
  <aside
    class="ss-side"
    :class="[`ss-side--${side}`, { 'is-collapsed': !open }]"
    :aria-hidden="!open"
  >
    <div class="ss-column">
      <SsPanelCard v-for="panel in panels" :key="panel.title" :panel="panel" />
    </div>
  </aside>
</template>
