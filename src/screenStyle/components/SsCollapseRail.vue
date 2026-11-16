<script setup>
/**
 * 数据栏一键收起 / 展开把手
 *
 * 展开态贴在数据栏内侧边缘（左栏右侧、右栏左侧）；收起态滑到屏幕左右边缘。
 * 点击任一把手，两侧数据栏 + 研判条 + 切页一起收起，底部换成模型工具条。
 */
defineProps({
  side: { type: String, required: true },
  collapsed: { type: Boolean, default: false },
})

defineEmits(['toggle'])
</script>

<template>
  <button
    type="button"
    class="ss-rail"
    :class="[`ss-rail--${side}`, { 'is-collapsed': collapsed }]"
    :title="collapsed ? '展开数据栏' : '收起数据栏'"
    :aria-label="collapsed ? '展开数据栏' : '收起数据栏'"
    :aria-expanded="!collapsed"
    @click="$emit('toggle')"
  >
    <svg class="ss-rail-arrow" viewBox="0 0 10 18" aria-hidden="true">
      <path d="M7 2 L2 9 L7 16" />
    </svg>
    <span class="ss-rail-text">{{ collapsed ? '数据栏' : '收起' }}</span>
  </button>
</template>
