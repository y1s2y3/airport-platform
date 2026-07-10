<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { Close } from '@element-plus/icons-vue'

const props = defineProps({
  title: { type: String, required: true },
  width: { type: Number, default: 680 },
  zIndex: { type: Number, default: 120000 },
  /** center：居中；right：默认居右，可自由拖动 */
  placement: {
    type: String,
    default: 'center',
    validator: (v) => ['center', 'right'].includes(v),
  },
})

const emit = defineEmits(['close'])

const PANEL_HEIGHT_CAP = 1440

const x = ref(0)
const y = ref(0)
const panelWidth = ref(props.width)
const panelMaxHeight = ref('min(94vh, 1440px)')
let dragging = false
let dragStart = null

const isRight = computed(() => props.placement === 'right')

function updatePanelMaxHeight() {
  const margin = 12
  const available = window.innerHeight - y.value - margin
  const cap = Math.min(PANEL_HEIGHT_CAP, window.innerHeight - margin * 2)
  panelMaxHeight.value = `${Math.max(480, Math.min(available, cap))}px`
}

function applyRightPlacement() {
  const margin = 12
  panelWidth.value = Math.min(props.width, window.innerWidth - margin * 2)
  x.value = window.innerWidth - panelWidth.value - margin
  y.value = margin
  updatePanelMaxHeight()
}

function applyCenterPlacement() {
  panelWidth.value = props.width
  panelMaxHeight.value = 'min(94vh, 1440px)'
  x.value = Math.max(24, (window.innerWidth - panelWidth.value) / 2)
  y.value = Math.max(48, (window.innerHeight - 960) / 2)
  updatePanelMaxHeight()
}

function clampPosition() {
  const margin = 12
  const maxX = window.innerWidth - panelWidth.value - margin
  x.value = Math.min(Math.max(margin, x.value), Math.max(margin, maxX))

  const maxY = window.innerHeight - 80
  y.value = Math.min(Math.max(margin, y.value), Math.max(margin, maxY))
  updatePanelMaxHeight()
}

function initPlacement() {
  if (isRight.value) applyRightPlacement()
  else applyCenterPlacement()
  clampPosition()
}

function onResize() {
  panelWidth.value = Math.min(props.width, window.innerWidth - 24)
  clampPosition()
}

onMounted(() => {
  initPlacement()
  window.addEventListener('resize', onResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', onResize)
  onPointerUp()
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
</script>

<template>
  <Teleport to="body">
    <div
      class="drag-panel-backdrop"
      :class="{ 'placement-right': isRight }"
      :style="{ zIndex }"
      @click.self="!isRight && emit('close')"
    >
      <div
        class="drag-panel"
        :class="{ 'placement-right': isRight }"
        :style="{
          left: `${x}px`,
          top: `${y}px`,
          width: `${panelWidth}px`,
          maxHeight: panelMaxHeight,
          zIndex: zIndex + 1,
        }"
      >
        <div class="drag-panel-header" @pointerdown="onHeaderPointerDown">
          <span class="drag-panel-title">
            <span class="drag-panel-title-mark" aria-hidden="true" />
            {{ title }}
          </span>
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

.drag-panel-backdrop.placement-right {
  background: transparent;
  pointer-events: none;
  justify-content: flex-end;
}

.drag-panel {
  position: fixed;
  max-height: min(94vh, 1440px);
  background: var(--coc-drag-panel-bg);
  border-radius: 12px;
  border: 1px solid var(--coc-drag-panel-border);
  box-shadow: var(--coc-drag-panel-shadow);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  color: var(--coc-text);
  backdrop-filter: blur(9px);
  -webkit-backdrop-filter: blur(9px);
}

.drag-panel.placement-right {
  pointer-events: auto;
}

.drag-panel-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  border-bottom: 1px solid var(--coc-drag-panel-header-border);
  background: var(--coc-drag-panel-header-bg);
  cursor: move;
  user-select: none;
  flex-shrink: 0;
}

.drag-panel-title {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: calc(15px + var(--coc-font-boost));
  font-weight: 700;
  color: var(--coc-drag-panel-title-color);
}

.drag-hint {
  font-size: calc(11px + var(--coc-font-boost));
  color: var(--coc-drag-panel-hint-color);
  margin-left: auto;
}

.drag-panel-close {
  border: 1px solid var(--coc-drag-panel-close-border);
  background: var(--coc-drag-panel-close-bg);
  border-radius: 6px;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--coc-drag-panel-close-color);
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
  background: var(--coc-drag-panel-body-bg, transparent);
}
</style>

<style>
@import './dispatch-more-dialog.css';

.drag-panel-title-mark {
  display: none;
}

.coc-hq-shell .drag-panel-title-mark {
  display: inline-block;
}
</style>
