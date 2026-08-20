<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { Camera, FullScreen, Search } from '@element-plus/icons-vue'
import { useCurrentProject } from '../../composables/useCurrentProject'
import {
  getProjectVideoDevices,
  getPreviewAreaGroups,
  VIDEO_DEVICE_CHANGE_EVENT,
  ensureVideoDeviceLedgerSeed,
} from '../../coc/utils/videoDeviceLedgerStorage.js'

defineProps({
  title: { type: String, default: '视频预览' },
  description: { type: String, default: '' },
})

const { selectedProjectId, headerProjectLabel } = useCurrentProject()
const devices = ref([])
const keyword = ref('')
const statusFilter = ref('全部')
const gridSize = ref(4)
const activeSlot = ref(0)
const slots = ref(Array.from({ length: 9 }, () => null))
const expandedAreas = ref([])

const gridOptions = [
  { size: 1, label: '1屏', cols: 1 },
  { size: 4, label: '4屏', cols: 2 },
  { size: 9, label: '9屏', cols: 3 },
]

const areaGroups = computed(() => {
  let list = devices.value
  if (statusFilter.value === '在线') list = list.filter((d) => d.deviceStatus === '在线')
  if (statusFilter.value === '离线') list = list.filter((d) => d.deviceStatus === '离线')
  const q = keyword.value.trim()
  if (q) {
    list = list.filter((d) =>
      [d.deviceName, d.deviceId, d.area, d.deviceType].some((f) => String(f || '').includes(q)),
    )
  }
  return getPreviewAreaGroups(list)
})

const visibleSlots = computed(() => slots.value.slice(0, gridSize.value))

const gridCols = computed(() => gridOptions.find((g) => g.size === gridSize.value)?.cols || 2)

function load() {
  ensureVideoDeviceLedgerSeed()
  devices.value = getProjectVideoDevices(selectedProjectId.value)
  expandedAreas.value = getPreviewAreaGroups(devices.value).map((g) => g.name)
}

function setGrid(size) {
  gridSize.value = size
  if (activeSlot.value >= size) activeSlot.value = 0
}

function assignDevice(device) {
  const next = [...slots.value]
  next[activeSlot.value] = device
  slots.value = next
  if (activeSlot.value < gridSize.value - 1) activeSlot.value += 1
}

function clearSlot(index) {
  const next = [...slots.value]
  next[index] = null
  slots.value = next
}

watch(selectedProjectId, () => {
  keyword.value = ''
  slots.value = Array.from({ length: 9 }, () => null)
  activeSlot.value = 0
  load()
})

watch(areaGroups, (groups) => {
  if (!expandedAreas.value.length) {
    expandedAreas.value = groups.map((g) => g.name)
  }
})

onMounted(() => {
  load()
  window.addEventListener(VIDEO_DEVICE_CHANGE_EVENT, load)
})

onUnmounted(() => {
  window.removeEventListener(VIDEO_DEVICE_CHANGE_EVENT, load)
})
</script>

<template>
  <div class="preview-page">
    <div class="preview-layout">
      <aside class="list-panel">
        <div class="grid-switch">
          <button
            v-for="opt in gridOptions"
            :key="opt.size"
            type="button"
            class="grid-btn"
            :class="{ active: gridSize === opt.size }"
            :title="opt.label"
            @click="setGrid(opt.size)"
          >
            <span
              class="grid-icon"
              :style="{
                gridTemplateColumns: `repeat(${opt.cols}, 1fr)`,
                gridTemplateRows: `repeat(${opt.cols}, 1fr)`,
              }"
            >
              <i v-for="n in opt.size" :key="n" />
            </span>
          </button>
        </div>

        <div class="list-head">
          <span class="list-title">视频列表</span>
          <span class="list-link">查看收藏</span>
        </div>

        <div class="list-filters">
          <el-input
            v-model="keyword"
            placeholder="关键字搜索"
            clearable
            :prefix-icon="Search"
            class="kw-input" aria-label="关键字搜索"/>
          <el-select v-model="statusFilter" class="status-select">
            <el-option label="全部" value="全部" />
            <el-option label="在线" value="在线" />
            <el-option label="离线" value="离线" />
          </el-select>
        </div>

        <div class="project-tip">{{ headerProjectLabel }}</div>

        <el-collapse v-model="expandedAreas" class="area-collapse">
          <el-collapse-item v-for="group in areaGroups" :key="group.name" :name="group.name">
            <template #title>
              <span class="area-title">{{ group.name }} ({{ group.online }}/{{ group.total }})</span>
            </template>
            <button
              v-for="device in group.devices"
              :key="device.id"
              type="button"
              class="device-item"
              :class="{ online: device.deviceStatus === '在线' }"
              @click="assignDevice(device)"
            >
              <span class="dot" />
              <span class="name" :title="device.deviceName">{{ device.deviceName }}</span>
              <span class="type">{{ device.deviceType }}</span>
            </button>
          </el-collapse-item>
        </el-collapse>
        <div v-if="!areaGroups.length" class="list-empty">暂无设备</div>
      </aside>

      <section class="player-panel">
        <div
          class="player-grid"
          :style="{ gridTemplateColumns: `repeat(${gridCols}, 1fr)` }"
        >
          <div
            v-for="(slot, index) in visibleSlots"
            :key="index"
            class="player-cell"
            :class="{ active: activeSlot === index }"
            @click="activeSlot = index"
            @dblclick="clearSlot(index)"
          >
            <template v-if="slot">
              <div class="feed-mock">
                <span class="feed-name">{{ slot.deviceName }}</span>
                <span class="feed-status" :class="slot.deviceStatus === '在线' ? 'on' : 'off'">
                  {{ slot.deviceStatus }}
                </span>
              </div>
            </template>
            <span v-else class="cell-index">{{ index + 1 }}</span>
          </div>
        </div>
        <div class="player-toolbar">
          <el-icon :size="18"><Camera /></el-icon>
          <el-icon :size="18" class="fullscreen"><FullScreen /></el-icon>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.preview-page {
  height: calc(100vh - 160px);
  min-height: 560px;
  background: #fff;
  border: 1px solid var(--ap-border, #e4e7ed);
  border-radius: 8px;
  overflow: hidden;
}

.preview-layout {
  display: grid;
  grid-template-columns: 280px minmax(0, 1fr);
  height: 100%;
}

.list-panel {
  border-right: 1px solid #ebeef5;
  padding: 12px;
  overflow: auto;
  background: #fafbfc;
}

.grid-switch {
  display: flex;
  gap: 6px;
  margin-bottom: 12px;
}

.grid-btn {
  width: 36px;
  height: 28px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  background: #fff;
  cursor: pointer;
  display: grid;
  place-items: center;
  padding: 0;
}

.grid-btn.active {
  border-color: #409eff;
  background: #ecf5ff;
}

.grid-icon {
  width: 16px;
  height: 16px;
  display: grid;
  gap: 1px;
}

.grid-icon i {
  background: #909399;
  border-radius: 1px;
}

.grid-btn.active .grid-icon i {
  background: #409eff;
}

.list-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.list-title {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
}

.list-link {
  font-size: 12px;
  color: #409eff;
  cursor: pointer;
}

.list-filters {
  display: flex;
  gap: 8px;
  margin-bottom: 10px;
}

.kw-input {
  flex: 1;
}

.status-select {
  width: 88px;
}

.project-tip {
  font-size: 12px;
  color: #909399;
  margin-bottom: 8px;
}

.area-collapse {
  border: none;
  --el-collapse-header-height: 36px;
}

.area-collapse :deep(.el-collapse-item__header) {
  background: transparent;
  border: none;
  font-size: 13px;
}

.area-collapse :deep(.el-collapse-item__wrap) {
  border: none;
  background: transparent;
}

.area-collapse :deep(.el-collapse-item__content) {
  padding-bottom: 6px;
}

.area-title {
  color: #303133;
  font-weight: 500;
}

.device-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
  border: none;
  background: transparent;
  padding: 6px 4px 6px 8px;
  cursor: pointer;
  border-radius: 4px;
  text-align: left;
}

.device-item:hover {
  background: #ecf5ff;
}

.dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #c0c4cc;
  flex-shrink: 0;
}

.device-item.online .dot {
  background: #67c23a;
}

.name {
  flex: 1;
  min-width: 0;
  font-size: 12px;
  color: #606266;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.type {
  font-size: 11px;
  color: #909399;
}

.list-empty {
  padding: 24px 0;
  text-align: center;
  font-size: 13px;
  color: #909399;
}

.player-panel {
  display: flex;
  flex-direction: column;
  min-width: 0;
  background: #1a1a1a;
}

.player-grid {
  flex: 1;
  display: grid;
  gap: 2px;
  padding: 2px;
  min-height: 0;
}

.player-cell {
  position: relative;
  background: #000;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  min-height: 120px;
  overflow: hidden;
}

.player-cell.active {
  outline: 2px solid #409eff;
  outline-offset: -2px;
  z-index: 1;
}

.cell-index {
  font-size: 48px;
  font-weight: 300;
  color: rgba(255, 255, 255, 0.55);
  user-select: none;
}

.feed-mock {
  width: 100%;
  height: 100%;
  background:
    linear-gradient(135deg, rgba(64, 158, 255, 0.18), rgba(0, 0, 0, 0.2)),
    repeating-linear-gradient(
      0deg,
      transparent,
      transparent 2px,
      rgba(255, 255, 255, 0.02) 2px,
      rgba(255, 255, 255, 0.02) 4px
    );
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  padding: 10px 12px;
  box-sizing: border-box;
}

.feed-name {
  font-size: 12px;
  color: #fff;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.6);
}

.feed-status {
  margin-top: 4px;
  font-size: 11px;
}

.feed-status.on {
  color: #67c23a;
}

.feed-status.off {
  color: #f56c6c;
}

.player-toolbar {
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 14px;
  background: #2b2b2b;
  color: #c0c4cc;
}

.fullscreen {
  cursor: pointer;
}
</style>
