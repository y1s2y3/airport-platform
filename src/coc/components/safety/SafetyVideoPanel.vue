<script setup>
import { ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { VideoCamera, ArrowLeft, ArrowRight, ZoomIn } from '@element-plus/icons-vue'
import ProjectListPanel from '../ProjectListPanel.vue'
import VideoExpandOverlay from '../VideoExpandOverlay.vue'
import HqVideoFilterToggle from '../hq/HqVideoFilterToggle.vue'
import { useCameraOrder } from '../../composables/useCameraOrder.js'
import { useDispatchOrder } from '../../composables/useDispatchOrder.js'
import { FOCUS_PROJECT_ID, HQ_SELECTION_ID, PERSONNEL_DISPATCH_DEVICES, getDispatchDeviceTypeLabel, formatDispatchOperatorLabel, getMonitorDispatchDevices, videoPlaceholderColor, videoPlaceholderClass } from '../../mock/data.js'
import { PANEL_TITLE_ICON_URL } from '../../config/panelTitleAssets.js'
import HqPanelTitleLine from '../hq/HqPanelTitleLine.vue'

const DISPATCH_PAGE_SIZE = 3
const MONITOR_PAGE_SIZE = 6

const props = defineProps({
  project: { type: Object, required: true },
  projects: { type: Array, default: () => [] },
  selectionId: { type: String, default: HQ_SELECTION_ID },
  statusFilters: { type: Array, default: () => ['在建'] },
  scene: { type: String, default: 'default', validator: (v) => ['default', 'personnel'].includes(v) },
  hqLayout: { type: Boolean, default: false },
  videoFilter: { type: String, default: undefined },
  cameraOrder: { type: Array, default: undefined },
})

const emit = defineEmits(['status-filter', 'project-change', 'open-dispatch', 'video-filter-change'])

const monitorPage = ref(0)
const dispatchPage = ref(0)
const expandedVideo = ref(null)
const internalVideoFilter = ref('all')
const monitorFocusProjectId = ref(FOCUS_PROJECT_ID)

const videoFilterMode = computed(() =>
  props.videoFilter !== undefined ? props.videoFilter : internalVideoFilter.value,
)

const activeMonitorProjectId = computed(() =>
  props.selectionId !== HQ_SELECTION_ID ? props.selectionId : monitorFocusProjectId.value,
)

watch(
  () => props.selectionId,
  (id) => {
    if (id !== HQ_SELECTION_ID) {
      monitorFocusProjectId.value = id
    }
  },
)

const activeMonitorProject = computed(() =>
  props.projects.find((p) => p.id === activeMonitorProjectId.value) || props.project,
)

const listProjectCameras = computed(() => activeMonitorProject.value?.cameras || [])

const isConnected = computed(() => listProjectCameras.value.length > 0)

const internalCameraOrder = useCameraOrder(listProjectCameras)
const cameraOrderRef = computed(() =>
  props.cameraOrder !== undefined ? props.cameraOrder : internalCameraOrder.cameraOrder.value,
)

function handleCameraReorder(payload) {
  internalCameraOrder.handleCameraReorder(payload)
}
const orderedCameras = computed(() => {
  const order = cameraOrderRef.value
  let list = [...listProjectCameras.value]
  if (order?.length) {
    const rank = new Map(order.map((id, i) => [id, i]))
    list.sort((a, b) => (rank.get(a.id) ?? 999) - (rank.get(b.id) ?? 999))
  }
  return list
})

const displayCameras = computed(() => {
  let list = orderedCameras.value
  if (videoFilterMode.value === 'key') list = list.filter((camera) => camera.key)
  return list
})

const monitorStats = computed(() => {
  const list = displayCameras.value
  const online = list.filter((c) => c.online).length
  return { total: list.length, online, offline: list.length - online }
})

const monitorTotalPages = computed(() =>
  Math.max(1, Math.ceil(displayCameras.value.length / MONITOR_PAGE_SIZE)),
)

const pagedCameras = computed(() => {
  const start = monitorPage.value * MONITOR_PAGE_SIZE
  return displayCameras.value.slice(start, start + MONITOR_PAGE_SIZE)
})

const dispatchDeviceList = computed(() => {
  if (props.scene === 'personnel') return PERSONNEL_DISPATCH_DEVICES
  const project = activeMonitorProject.value
  if (!project) return []
  return getMonitorDispatchDevices(project.id, project.shortName || project.name)
})

const { dispatchOrder, orderedDevices, handleDispatchReorder } = useDispatchOrder(dispatchDeviceList)

const dispatchTitle = computed(() =>
  props.scene === 'personnel' ? '人员核验对讲' : '巡检对讲设备',
)

const dispatchHint = computed(() =>
  props.scene === 'personnel'
    ? '点击进入人员远程核验对讲页，支持证件核查与在岗确认'
    : '点击进入项目调度页',
)

const dispatchStats = computed(() => {
  const list = orderedDevices.value
  const online = list.filter((d) => d.online).length
  return { total: list.length, online, offline: list.length - online }
})

const dispatchTotalPages = computed(() =>
  Math.max(1, Math.ceil(orderedDevices.value.length / DISPATCH_PAGE_SIZE)),
)

const pagedDispatch = computed(() => {
  const start = dispatchPage.value * DISPATCH_PAGE_SIZE
  return orderedDevices.value.slice(start, start + DISPATCH_PAGE_SIZE)
})

function onProjectChange(id) {
  monitorPage.value = 0
  dispatchPage.value = 0
  expandedVideo.value = null
  if (id === HQ_SELECTION_ID) {
    monitorFocusProjectId.value = FOCUS_PROJECT_ID
  }
  emit('project-change', id)
}

function handleMonitorFocusChange(projectId) {
  if (!projectId || projectId === monitorFocusProjectId.value) return
  monitorFocusProjectId.value = projectId
  monitorPage.value = 0
  dispatchPage.value = 0
}

function setVideoFilter(mode) {
  if (props.videoFilter !== undefined) {
    emit('video-filter-change', mode)
  } else {
    internalVideoFilter.value = mode
  }
  monitorPage.value = 0
}

function openCameraExpand(cam) {
  if (!cam.online) {
    ElMessage.warning('该摄像头离线，无法放大查看')
    return
  }
  expandedVideo.value = { ...cam, palette: 'warm' }
}

function onTreeCameraClick(camera) {
  openCameraExpand(camera)
}

function handleSetCameraKey(camera) {
  if (internalCameraOrder.setCameraAsKey(camera)) {
    ElMessage.success(`已将「${camera.name}」设为重点视频`)
  }
}

function handleUnsetCameraKey(camera) {
  if (internalCameraOrder.unsetCameraAsKey(camera)) {
    ElMessage.success(`已取消「${camera.name}」的重点标记`)
  }
}

function openDispatch(device) {
  expandedVideo.value = null
  emit('open-dispatch', device)
}
</script>

<template>
  <div class="safety-video-wrap" :class="{ 'is-hq-layout': hqLayout }">
    <div class="safety-video-modules">
      <ProjectListPanel
        :projects="projects"
        :selection-id="selectionId"
        :focus-project-id="activeMonitorProjectId"
        :status-filters="statusFilters"
        :video-filter="videoFilterMode"
        :camera-order="cameraOrderRef"
        :dispatch-order="dispatchOrder"
        :hq-layout="hqLayout"
        @status-filter="emit('status-filter', $event)"
        @camera-click="onTreeCameraClick"
        @monitor-focus-change="handleMonitorFocusChange"
        @camera-reorder="handleCameraReorder"
        @camera-set-key="handleSetCameraKey"
        @camera-unset-key="handleUnsetCameraKey"
        @dispatch-click="openDispatch"
        @dispatch-reorder="handleDispatchReorder"
        @back-to-hq="onProjectChange(HQ_SELECTION_ID)"
        @project-change="onProjectChange"
      />

      <div class="panel-card module-panel monitor-module">
        <div class="panel-title simple-title module-title-bar">
          <img
            class="hq-panel-title-icon"
            :src="PANEL_TITLE_ICON_URL"
            width="11"
            height="11"
            alt=""
            aria-hidden="true"
            draggable="false"
          />
          <div class="header-row header-row--monitor">
            <span class="module-title-text">视频监控</span>
            <HqVideoFilterToggle
              v-if="hqLayout"
              class="header-video-filter"
              :model-value="videoFilterMode"
              @update:model-value="setVideoFilter"
            />
            <div v-else class="video-filter-toggle header-video-filter">
              <button
                type="button"
                class="filter-btn"
                :class="{ active: videoFilterMode === 'all' }"
                @click="setVideoFilter('all')"
              >
                全部
              </button>
              <button
                type="button"
                class="filter-btn"
                :class="{ active: videoFilterMode === 'key' }"
                @click="setVideoFilter('key')"
              >
                重点视频
              </button>
            </div>
          </div>
          <HqPanelTitleLine />
          <div class="header-sub-row">
            <div class="title-stats">
              <span class="stat-item">总数 <b>{{ monitorStats.total }}</b></span>
              <span class="stat-item online">
                <i class="status-dot online" /> 在线 <b>{{ monitorStats.online }}</b>
              </span>
              <span class="stat-item offline">
                <i class="status-dot offline" /> 离线 <b>{{ monitorStats.offline }}</b>
              </span>
            </div>
            <div class="page-nav">
              <button
                type="button"
                class="arrow-btn"
                :disabled="monitorPage <= 0 || !isConnected"
                aria-label="上一页"
                @click="monitorPage--"
              >
                <el-icon><ArrowLeft /></el-icon>
              </button>
              <span class="page-info">{{ monitorPage + 1 }}/{{ monitorTotalPages }}</span>
              <button
                type="button"
                class="arrow-btn"
                :disabled="monitorPage >= monitorTotalPages - 1 || !isConnected"
                aria-label="下一页"
                @click="monitorPage++"
              >
                <el-icon><ArrowRight /></el-icon>
              </button>
            </div>
          </div>
        </div>
        <div class="panel-body module-body">
          <div class="video-hint">点击在线画面可放大查看，支持云台、截图等操作</div>
          <div class="video-grid grid-2x3">
            <template v-if="isConnected">
              <div
                v-for="(cam, idx) in pagedCameras"
                :key="cam.id"
                class="video-cell clickable"
                :class="{ offline: !cam.online, key: cam.key }"
                @click="openCameraExpand(cam)"
              >
                <div
                  class="video-placeholder"
                  :class="videoPlaceholderClass(cam.online)"
                  :style="{ background: videoPlaceholderColor(cam.online, idx) }"
                >
                  <el-icon :size="19" color="rgba(255,255,255,0.6)"><VideoCamera /></el-icon>
                  <span v-if="cam.online" class="expand-hint" :class="{ 'expand-hint--hq': hqLayout }">
                    <el-icon><ZoomIn /></el-icon> 放大
                  </span>
                  <span v-if="!cam.online" class="offline-mask">信号中断</span>
                </div>
                <div class="video-label">
                  <span v-if="cam.key" class="key-badge">重点</span>
                  <span class="cam-name">{{ cam.name }}</span>
                  <span class="cam-status" :class="cam.online ? 'online' : 'offline'">
                    {{ cam.online ? '在线' : '离线' }}
                  </span>
                </div>
              </div>
              <div v-for="n in Math.max(0, MONITOR_PAGE_SIZE - pagedCameras.length)" :key="'e-' + n" class="video-cell empty" />
            </template>
            <div v-else class="video-empty-hint">请选择已接入项目查看监控</div>
          </div>
        </div>
      </div>

      <div class="panel-card module-panel dispatch-module">
        <div class="panel-title simple-title module-title-bar">
          <img
            class="hq-panel-title-icon"
            :src="PANEL_TITLE_ICON_URL"
            width="11"
            height="11"
            alt=""
            aria-hidden="true"
            draggable="false"
          />
          <div class="header-row">
            <span class="module-title-text">{{ dispatchTitle }}</span>
          </div>
          <HqPanelTitleLine />
          <div class="header-sub-row header-sub-row--compact">
            <div class="title-stats title-stats--compact">
              <span class="stat-item">总数<b>{{ dispatchStats.total }}</b></span>
              <span class="stat-item online">
                <i class="status-dot online" />在线<b>{{ dispatchStats.online }}</b>
              </span>
              <span class="stat-item offline">
                <i class="status-dot offline" />离线<b>{{ dispatchStats.offline }}</b>
              </span>
            </div>
            <div class="page-nav">
              <button
                type="button"
                class="arrow-btn"
                :disabled="dispatchPage <= 0"
                aria-label="上一页"
                @click="dispatchPage--"
              >
                <el-icon><ArrowLeft /></el-icon>
              </button>
              <span class="page-info">{{ dispatchPage + 1 }}/{{ dispatchTotalPages }}</span>
              <button
                type="button"
                class="arrow-btn"
                :disabled="dispatchPage >= dispatchTotalPages - 1"
                aria-label="下一页"
                @click="dispatchPage++"
              >
                <el-icon><ArrowRight /></el-icon>
              </button>
            </div>
          </div>
        </div>
        <div class="panel-body module-body">
          <div class="dispatch-hint">{{ dispatchHint }}</div>
          <div class="dispatch-col">
            <div
              v-for="(dv, idx) in pagedDispatch"
              :key="dv.id"
              class="video-cell dispatch-cell clickable"
              :class="{ offline: !dv.online }"
              @click="openDispatch(dv)"
            >
              <div
                class="video-placeholder"
                :class="videoPlaceholderClass(dv.online, 'cool', dv.type)"
                :style="{ background: videoPlaceholderColor(dv.online, idx, 'cool', dv.type) }"
              >
                <el-icon v-if="dv.online && dv.type !== 'handheld'" :size="19" color="rgba(255,255,255,0.6)"><VideoCamera /></el-icon>
                <span v-if="!dv.online" class="offline-mask">离线</span>
              </div>
              <div class="video-label dispatch-label">
                <div class="label-top">
                  <span class="type-badge" :class="dv.type">{{ getDispatchDeviceTypeLabel(dv.type) }}</span>
                  <span class="cam-name" :title="dv.name">{{ dv.name }}</span>
                </div>
                <div class="label-bottom">
                  <span v-if="dv.operator" class="operator-tag" :title="formatDispatchOperatorLabel(dv)">
                    {{ formatDispatchOperatorLabel(dv) }}
                  </span>
                  <span class="cam-status" :class="dv.online ? 'online' : 'offline'">
                    {{ dv.online ? '在线' : '离线' }}
                  </span>
                </div>
              </div>
            </div>
            <div
              v-for="n in Math.max(0, DISPATCH_PAGE_SIZE - pagedDispatch.length)"
              :key="'de-' + n"
              class="video-cell empty"
            />
          </div>
        </div>
      </div>
    </div>

    <VideoExpandOverlay
      v-if="expandedVideo"
      :source="expandedVideo"
      :project="activeMonitorProject"
      @close="expandedVideo = null"
    />
  </div>
</template>

<style scoped>
.safety-video-wrap {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 0;
}

.safety-video-modules {
  display: grid;
  grid-template-columns: var(--coc-project-list-w) minmax(0, 2fr) minmax(0, 1fr);
  gap: 16px;
  width: 100%;
  height: 100%;
  min-height: 0;
}

.safety-video-wrap.is-hq-layout .safety-video-modules {
  gap: 12px;
}

.monitor-module {
  position: relative;
}

.module-panel {
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.simple-title {
  font-size: calc(18px + var(--coc-font-boost));
}

.title-stats--compact {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: 6px;
  font-size: calc(9px + var(--coc-font-boost));
  color: var(--coc-text-secondary);
  flex: 0 1 auto;
  min-width: 0;
  white-space: nowrap;
}

.title-stats--compact b {
  font-size: calc(10px + var(--coc-font-boost));
  color: var(--coc-text);
  margin-left: 2px;
  font-weight: 700;
}

.title-stats--compact .online b { color: var(--coc-success); }
.title-stats--compact .offline b { color: var(--coc-danger); }

.title-stats--compact .stat-item {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  white-space: nowrap;
  flex-shrink: 0;
}

.title-stats--compact .status-dot {
  width: 5px;
  height: 5px;
  flex-shrink: 0;
}

.header-row {
  display: flex;
  align-items: center;
  min-width: 0;
}

.header-row--monitor {
  justify-content: space-between;
  width: 100%;
  gap: 20px;
}

.header-video-filter {
  margin-left: auto;
  flex-shrink: 0;
}

.header-sub-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-width: 0;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  flex: 1;
}

.module-title-text {
  font-size: calc(16px + var(--coc-font-boost));
  font-weight: 600;
  color: var(--coc-text);
  white-space: nowrap;
  flex-shrink: 0;
}

.video-filter-toggle {
  display: inline-flex;
  border: 1px solid var(--coc-border);
  border-radius: 6px;
  overflow: hidden;
  flex-shrink: 0;
}

.filter-btn {
  padding: 3px 8px;
  border: none;
  background: #fff;
  font-size: calc(10px + var(--coc-font-boost));
  line-height: 1.2;
  color: var(--coc-text-secondary);
  cursor: pointer;
  transition: background 0.2s, color 0.2s;
  white-space: nowrap;
}

.filter-btn + .filter-btn {
  border-left: 1px solid var(--coc-border);
}

.filter-btn.active {
  background: linear-gradient(135deg, var(--coc-accent), var(--coc-gold));
  color: #fff;
  font-weight: 600;
}

.filter-btn:hover:not(.active) {
  background: rgba(201, 123, 99, 0.08);
  color: var(--coc-accent);
}

.title-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 12px;
  font-size: calc(11px + var(--coc-font-boost));
  color: var(--coc-text-secondary);
  flex: 1;
  min-width: 0;
}

.title-stats b {
  font-size: calc(12px + var(--coc-font-boost));
  color: var(--coc-text);
  margin-left: 3px;
}

.title-stats .online b { color: var(--coc-success); }
.title-stats .offline b { color: var(--coc-danger); }

.page-nav {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.arrow-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  padding: 0;
  border: 1px solid var(--coc-border);
  border-radius: 50%;
  background: #fff;
  color: var(--coc-text-secondary);
  cursor: pointer;
  transition: border-color 0.2s, color 0.2s, background 0.2s;
}

.arrow-btn:hover:not(:disabled) {
  border-color: var(--coc-accent);
  color: var(--coc-accent);
  background: rgba(201, 123, 99, 0.06);
}

.arrow-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.arrow-btn .el-icon {
  font-size: calc(14px + var(--coc-font-boost));
}

.page-info {
  font-size: calc(11px + var(--coc-font-boost));
  font-weight: 600;
  min-width: 28px;
  text-align: center;
  color: var(--coc-text-secondary);
}

.module-body {
  padding: 10px 14px 14px !important;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 0;
}

.video-grid.grid-2x3 {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  grid-template-rows: repeat(3, 1fr);
  gap: 12px;
  min-height: 0;
}

.dispatch-col {
  flex: 1;
  display: grid;
  grid-template-rows: repeat(3, 1fr);
  gap: 12px;
  min-height: 0;
}

.video-cell {
  position: relative;
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid var(--coc-border);
  background: #f5f5f5;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.video-cell.clickable {
  cursor: pointer;
  transition: box-shadow 0.2s, border-color 0.2s;
}

.video-cell.clickable:hover {
  border-color: var(--coc-accent);
  box-shadow: 0 4px 16px rgba(201, 123, 99, 0.2);
}

.video-cell.offline { opacity: 0.85; }

.video-cell.key {
  border-color: var(--coc-accent);
}

.video-placeholder {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  min-height: 0;
}

.offline-mask {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.35);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: calc(12px + var(--coc-font-boost));
}

.video-hint,
.dispatch-hint {
  font-size: calc(11px + var(--coc-font-boost));
  color: var(--coc-text-muted);
  flex-shrink: 0;
  line-height: 1.4;
}

.expand-hint {
  position: absolute;
  bottom: 10px;
  right: 10px;
  display: flex;
  align-items: center;
  gap: 4px;
  background: rgba(0, 0, 0, 0.55);
  color: #fff;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: calc(10px + var(--coc-font-boost));
  opacity: 0;
  transition: opacity 0.2s;
}

.video-cell.clickable:hover .expand-hint {
  opacity: 1;
}

.expand-hint--hq {
  opacity: 0.88;
}

.label-left {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  min-width: 0;
  flex: 1;
}

.type-badge {
  font-size: calc(10px + var(--coc-font-boost));
  padding: 2px 8px;
  border-radius: 4px;
  flex-shrink: 0;
  font-weight: 600;
}

.type-badge.handheld {
  background: rgba(201, 123, 99, 0.15);
  color: var(--coc-accent);
}

.type-badge.app,
.type-badge.web {
  background: rgba(103, 194, 58, 0.12);
  color: #67c23a;
}

.video-label {
  padding: 5px 12px;
  background: rgba(255, 255, 255, 0.95);
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.dispatch-label {
  flex-direction: column;
  align-items: stretch;
  gap: 4px;
  padding: 6px 8px;
}

.label-top {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  min-width: 0;
}

.label-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  min-width: 0;
}

.cam-name {
  font-size: calc(11px + var(--coc-font-boost));
  font-weight: 600;
  line-height: 1.35;
  flex: 1;
  min-width: 0;
  white-space: normal;
  word-break: break-all;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.monitor-module .video-label .cam-name {
  white-space: nowrap;
  word-break: normal;
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  -webkit-line-clamp: unset;
  -webkit-box-orient: unset;
}

.key-badge {
  font-size: calc(10px + var(--coc-font-boost));
  padding: 1px 6px;
  border-radius: 4px;
  background: rgba(201, 123, 99, 0.15);
  color: var(--coc-accent);
  font-weight: 600;
  flex-shrink: 0;
}

.dispatch-label .cam-name {
  -webkit-line-clamp: 2;
}

.cam-status {
  font-size: calc(11px + var(--coc-font-boost));
  flex-shrink: 0;
  font-weight: 600;
}

.cam-status.online { color: var(--coc-success); }
.cam-status.offline { color: var(--coc-danger); }

.operator-tag {
  font-size: calc(10px + var(--coc-font-boost));
  color: var(--coc-text-muted);
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.video-cell.empty {
  background: #fafafa;
  border-style: dashed;
  cursor: default;
}

.video-empty-hint {
  grid-column: 1 / -1;
  grid-row: 1 / -1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--coc-text-muted);
  font-size: calc(13px + var(--coc-font-boost));
}
</style>
