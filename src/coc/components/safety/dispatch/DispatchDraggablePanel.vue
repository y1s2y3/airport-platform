<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { Close } from '@element-plus/icons-vue'

const props = defineProps({
  title: { type: String, required: true },
  width: { type: Number, default: 680 },
  zIndex: { type: Number, default: 120000 },
})

const emit = defineEmits(['close'])

const x = ref(0)
const y = ref(0)
let dragging = false
let dragStart = null

function clampPosition() {
  const margin = 12
  const maxX = window.innerWidth - props.width - margin
  const maxY = window.innerHeight - 120
  x.value = Math.min(Math.max(margin, x.value), Math.max(margin, maxX))
  y.value = Math.min(Math.max(margin, y.value), Math.max(margin, maxY))
}

onMounted(() => {
  x.value = Math.max(24, (window.innerWidth - props.width) / 2)
  y.value = Math.max(48, (window.innerHeight - 560) / 2)
  clampPosition()
})

function onHeaderPointerDown(e) {
  if (e.button !== 0 || e.target.closest('.drag-panel-close')) return
  dragging = true
  dragStart = {
    px: e.clientX,
    py: e.clientY,
    ox: x.value,
    oy: y.value,
  }
  document.addEventListener('pointermove', onPointerMove)
  document.addEventListener('pointerup', onPointerUp)
  e.preventDefault()
}

function onPointerMove(e) {
  if (!dragging || !dragStart) return
  x.value = dragStart.ox + e.clientX - dragStart.px
  y.value = dragStart.oy + e.clientY - dragStart.py
}

function onPointerUp() {
  dragging = false
  dragStart = null
  document.removeEventListener('pointermove', onPointerMove)
  document.removeEventListener('pointerup', onPointerUp)
  clampPosition()
}

onUnmounted(onPointerUp)
</script>

<template>
  <Teleport to="body">
    <div class="drag-panel-backdrop" :style="{ zIndex }" @click.self="emit('close')">
      <div
        class="drag-panel"
        :style="{ left: `${x}px`, top: `${y}px`, width: `${width}px`, zIndex: zIndex + 1 }"
      >
        <div class="drag-panel-header" @pointerdown="onHeaderPointerDown">
          <span class="drag-panel-title">{{ title }}</span>
          <span class="drag-hint">拖动标题栏移动</span>
          <button type="button" class="drag-panel-close" title="关闭" @click="emit('close')">
            <el-icon :size="16"><Close /></el-icon>
          </button>
        </div>
        <div class="drag-panel-body">
          <slot />
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.drag-panel-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.28);
  display: flex;
  align-items: flex-start;
  justify-content: center;
}

.drag-panel {
  position: fixed;
  max-height: min(82vh, 720px);
  background: #fff;
  border-radius: 12px;
  border: 1px solid var(--coc-border);
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.18);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.drag-panel-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  border-bottom: 1px solid var(--coc-border);
  background: linear-gradient(180deg, #fff, #faf8f6);
  cursor: move;
  user-select: none;
  flex-shrink: 0;
}

.drag-panel-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--coc-text);
}

.drag-hint {
  font-size: 11px;
  color: var(--coc-text-muted);
  margin-left: auto;
}

.drag-panel-close {
  border: 1px solid var(--coc-border);
  background: #fff;
  border-radius: 6px;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--coc-text-secondary);
  flex-shrink: 0;
}

.drag-panel-close:hover {
  border-color: var(--coc-accent);
  color: var(--coc-accent);
}

.drag-panel-body {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 14px 16px 16px;
}
</style>
