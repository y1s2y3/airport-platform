<script setup>
import { ref, computed, watch, inject } from 'vue'
import { ElMessage } from 'element-plus'
import {
  VideoCamera,
  ZoomIn,
  Camera,
  Mute,
  Microphone,
  Phone,
  ArrowLeft,
  ArrowRight,
} from '@element-plus/icons-vue'
import VideoExpandOverlay from '../../VideoExpandOverlay.vue'
import ScreenshotMarkDialog from '../../ScreenshotMarkDialog.vue'
import { getMonitorDispatchDevices, getDispatchDeviceTypeLabel, formatDispatchOperatorLabel, videoPlaceholderColor, videoPlaceholderClass } from '../../../mock/data.js'
import { sortCamerasByOrder } from '../../../utils/cameraOrder.js'
import DispatchHqPanelTitle from './DispatchHqPanelTitle.vue'

const dispatchHqUi = inject('dispatchHqUi', false)

const props = defineProps({
  device: { type: Object, required: true },
  videoProject: { type: Object, required: true },
  projectId: { type: String, default: '' },
  /** 从巡检对讲设备点击进入：单设备 1 宫格 */
  singleDeviceView: { type: Boolean, default: false },
  /** 单设备模式下工具栏切换设备 */
  enableDeviceSwitch: { type: Boolean, default: false },
  gridPlacement: { type: Boolean, default: false },
  monitorGrid: {
    type: String,
    default: '3x2',
    validator: (v) => ['3x2', '3x3', '3x4'].includes(v),
  },
  verticalStretch: { type: Boolean, default: false },
})

const DEVICE_GRID_PAGE_SIZE = 4

const slotCount = computed(() => {
  if (props.monitorGrid === '3x4') return 12
  if (props.monitorGrid === '3x3') return 9
  return 6
})

const DEMO_MONITOR_NAMES = [
  '东门-枪机-1',
  '4号塔吊球机',
  '基坑-枪机-2',
  '钢筋加工场',
  '车辆通道',
  '2号梯笼球机',
  '施工活跃区',
  '3号塔吊驾驶室',
  '1号门枪机',
  '现场会议室',
  '工人讲评区',
  '地磅站监控',
]

const monitorCameras = computed(() => {
  const start = monitorPage.value * monitorPageSize.value
  return allMonitorCameras.value.slice(start, start + monitorPageSize.value)
})

const emptySlotCount = computed(() => Math.max(0, monitorPageSize.value - monitorCameras.value.length))

const expandedCamera = ref(null)
const expandedDevice = ref(null)
const markDialogVisible = ref(false)
const deviceMuted = ref(true)
const deviceStream = ref('main')
const selectedDeviceId = ref(props.device.id)
const devicePage = ref(0)
const monitorPage = ref(0)

const monitorPageSize = computed(() => slotCount.value)

const allMonitorCameras = computed(() => {
  const list = props.videoProject?.cameras || []
  let source = list.length
    ? [...list]
    : DEMO_MONITOR_NAMES.map((name, i) => ({
        id: `demo-cam-${i}`,
        name,
        online: i % 4 !== 0,
      }))
  const minCount = monitorPageSize.value * 2
  let seq = 0
  while (source.length < minCount) {
    const name = DEMO_MONITOR_NAMES[seq % DEMO_MONITOR_NAMES.length]
    source.push({
      id: `demo-cam-extra-${seq}`,
      name: seq < DEMO_MONITOR_NAMES.length ? `${name}-辅` : `${name}-${seq + 1}`,
      online: seq % 4 !== 0,
    })
    seq += 1
  }
  return source
})

const monitorTotalPages = computed(() =>
  Math.max(1, Math.ceil(allMonitorCameras.value.length / monitorPageSize.value)),
)

const projectDevices = computed(() => {
  const list = getMonitorDispatchDevices(
    props.projectId || props.videoProject?.id,
    props.videoProject?.shortName || props.videoProject?.name || '',
  )
  return sortCamerasByOrder(list, [])
})

const handheldDevices = computed(() =>
  projectDevices.value.filter((item) => item.type === 'handheld'),
)

const activeDevice = computed(() => {
  if (props.singleDeviceView && props.enableDeviceSwitch) {
    return (
      projectDevices.value.find((item) => item.id === selectedDeviceId.value)
      || projectDevices.value.find((item) => item.id === props.device.id)
      || props.device
    )
  }
  if (props.singleDeviceView) return props.device
  return props.device
})

const singleGridDevices = computed(() => [activeDevice.value])

const deviceTotalPages = computed(() =>
  Math.max(1, Math.ceil(projectDevices.value.length / DEVICE_GRID_PAGE_SIZE)),
)

const pagedProjectDevices = computed(() => {
  const start = devicePage.value * DEVICE_GRID_PAGE_SIZE
  return projectDevices.value.slice(start, start + DEVICE_GRID_PAGE_SIZE)
})

const displayDevices = computed(() =>
  props.singleDeviceView ? singleGridDevices.value : pagedProjectDevices.value,
)

const deviceGridClass = computed(() => {
  const count = displayDevices.value.length
  if (count <= 1) return 'grid-1x1'
  if (count === 2) return 'grid-2x1'
  return 'grid-2x2'
})

const devicePanelTitle = computed(() => {
  if (props.singleDeviceView) {
    return activeDevice.value.type === 'handheld' ? '手持巡检实时画面' : 'App端对讲画面'
  }
  return '巡检对讲设备'
})

const snapshotCamera = computed(() => ({
  ...activeDevice.value,
  palette: 'cool',
  location: props.videoProject?.shortName || props.videoProject?.name || '',
}))

watch(
  () => props.device.id,
  (id) => {
    selectedDeviceId.value = id
  },
)

watch(
  () => [props.projectId, props.singleDeviceView, props.videoProject?.id],
  () => {
    devicePage.value = 0
    monitorPage.value = 0
  },
)

watch(deviceTotalPages, (total) => {
  if (devicePage.value > total - 1) {
    devicePage.value = Math.max(0, total - 1)
  }
})

watch(monitorTotalPages, (total) => {
  if (monitorPage.value > total - 1) {
    monitorPage.value = Math.max(0, total - 1)
  }
})

function handleDeviceSwitch(id) {
  const target = projectDevices.value.find((item) => item.id === id)
  if (!target) return
  if (!target.online) {
    ElMessage.warning(`${target.name} 当前离线`)
    return
  }
  ElMessage.info(`已切换至 ${target.name}`)
}

function getHandheldDevice(id) {
  return handheldDevices.value.find((item) => item.id === id) || null
}

function openCameraExpand(cam) {
  if (!cam.online) {
    ElMessage.warning('该摄像头离线，无法放大查看')
    return
  }
  expandedCamera.value = { ...cam, palette: 'warm' }
}

function openDeviceExpand(device, idx = 0) {
  if (!device?.online) {
    ElMessage.warning('设备离线，无法放大查看')
    return
  }
  expandedDevice.value = { ...device, palette: 'cool', colorIndex: idx }
}

function toggleDeviceMute() {
  deviceMuted.value = !deviceMuted.value
  ElMessage.info(deviceMuted.value ? '已静音' : '已开启声音')
}

function toggleDeviceStream() {
  deviceStream.value = deviceStream.value === 'main' ? 'sub' : 'main'
  ElMessage.info(`已切换至${deviceStream.value === 'main' ? '主' : '子'}码流`)
}

function openIssueSnapshot() {
  if (!activeDevice.value.online) {
    ElMessage.warning('设备离线，无法截图')
    return
  }
  markDialogVisible.value = true
}

function deviceCall() {
  if (!activeDevice.value.online) {
    ElMessage.warning(`${activeDevice.value.name} 离线，无法呼叫`)
    return
  }
  ElMessage.info(`正在呼叫 ${activeDevice.value.name}…`)
}

function prevDevicePage() {
  if (devicePage.value > 0) devicePage.value -= 1
}

function nextDevicePage() {
  if (devicePage.value < deviceTotalPages.value - 1) devicePage.value += 1
}

function prevMonitorPage() {
  if (monitorPage.value > 0) monitorPage.value -= 1
}

function nextMonitorPage() {
  if (monitorPage.value < monitorTotalPages.value - 1) monitorPage.value += 1
}
</script>

<template>
  <div
    class="panel-card detail-panel device-panel"
    :class="{ 'area-device': gridPlacement, 'stretch-panel': verticalStretch, 'dispatch-hq-video-panel': dispatchHqUi }"
  >
    <DispatchHqPanelTitle v-if="dispatchHqUi" :title="devicePanelTitle">
      <template v-if="!singleDeviceView && deviceTotalPages > 1" #actions>
        <div class="page-nav">
          <button
            type="button"
            class="arrow-btn"
            :disabled="devicePage <= 0"
            aria-label="上一页"
            @click="prevDevicePage"
          >
            <el-icon><ArrowLeft /></el-icon>
          </button>
          <span class="page-info">{{ devicePage + 1 }}/{{ deviceTotalPages }}</span>
          <button
            type="button"
            class="arrow-btn"
            :disabled="devicePage >= deviceTotalPages - 1"
            aria-label="下一页"
            @click="nextDevicePage"
          >
            <el-icon><ArrowRight /></el-icon>
          </button>
        </div>
      </template>
    </DispatchHqPanelTitle>
    <div v-else class="panel-title compact title-left title-with-page">
      <span class="panel-title-text">{{ devicePanelTitle }}</span>
      <div v-if="!singleDeviceView && deviceTotalPages > 1" class="page-nav">
        <button
          type="button"
          class="arrow-btn"
          :disabled="devicePage <= 0"
          aria-label="上一页"
          @click="prevDevicePage"
        >
          <el-icon><ArrowLeft /></el-icon>
        </button>
        <span class="page-info">{{ devicePage + 1 }}/{{ deviceTotalPages }}</span>
        <button
          type="button"
          class="arrow-btn"
          :disabled="devicePage >= deviceTotalPages - 1"
          aria-label="下一页"
          @click="nextDevicePage"
        >
          <el-icon><ArrowRight /></el-icon>
        </button>
      </div>
    </div>
    <div class="panel-body device-body">
      <div class="device-live-grid" :class="deviceGridClass">
        <div
          v-for="(dev, idx) in displayDevices"
          :key="dev.id"
          class="device-live-cell clickable"
          :class="{ offline: !dev.online }"
          @click="openDeviceExpand(dev, idx)"
        >
          <div
            class="device-live-placeholder"
            :class="videoPlaceholderClass(dev.online, 'cool', dev.type)"
            :style="{ background: videoPlaceholderColor(dev.online, idx, 'cool', dev.type) }"
          >
            <el-icon v-if="dev.online && dev.type !== 'handheld'" :size="29" color="rgba(255,255,255,0.5)"><VideoCamera /></el-icon>
            <span v-if="dev.online && dev.type !== 'handheld' && !dispatchHqUi" class="demo-badge">演示画面</span>
            <span v-if="dev.online && !dispatchHqUi" class="expand-hint"><el-icon><ZoomIn /></el-icon></span>
            <span v-if="!dev.online" class="offline-tip">设备离线</span>
            <div v-if="dispatchHqUi" class="device-live-label device-live-label--overlay">
              <span class="type-badge" :class="dev.type">{{ getDispatchDeviceTypeLabel(dev.type) }}</span>
              <div class="device-live-info">
                <span class="device-live-name" :title="dev.name">{{ dev.name }}</span>
                <span v-if="dev.operator" class="device-live-operator" :title="formatDispatchOperatorLabel(dev)">
                  {{ formatDispatchOperatorLabel(dev) }}
                </span>
              </div>
            </div>
          </div>
          <div v-if="!dispatchHqUi" class="device-live-label">
            <span class="type-badge" :class="dev.type">{{ getDispatchDeviceTypeLabel(dev.type) }}</span>
            <div class="device-live-info">
              <span class="device-live-name" :title="dev.name">{{ dev.name }}</span>
              <span v-if="dev.operator" class="device-live-operator" :title="formatDispatchOperatorLabel(dev)">
                {{ formatDispatchOperatorLabel(dev) }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div v-if="singleDeviceView" class="device-controls">
        <div class="device-controls-left">
          <button class="ctrl-btn ctrl-btn-text" title="问题截图" @click="openIssueSnapshot">
            <el-icon><Camera /></el-icon>
            问题截图
          </button>
          <button class="ctrl-btn" :title="deviceMuted ? '开启声音' : '静音'" @click="toggleDeviceMute">
            <el-icon><component :is="deviceMuted ? Mute : Microphone" /></el-icon>
          </button>
          <button class="ctrl-btn" @click="toggleDeviceStream">
            {{ deviceStream === 'main' ? '主码流' : '子码流' }}
          </button>
          <button class="ctrl-btn ctrl-btn-call" title="呼叫" @click="deviceCall">
            <el-icon><Phone /></el-icon>
            呼叫
          </button>
        </div>
        <div v-if="enableDeviceSwitch && handheldDevices.length" class="device-switch-form">
          <el-select
            v-model="selectedDeviceId"
            class="device-switch-select"
            placeholder="切换设备"
            filterable
            popper-class="dispatch-device-switch-popper"
            @change="handleDeviceSwitch"
          >
            <template #label="{ label, value }">
              <span class="device-selected-label">
                <span class="device-selected-name">{{ label }}</span>
                <i
                  class="status-dot"
                  :class="getHandheldDevice(value)?.online ? 'online' : 'offline'"
                />
              </span>
            </template>
            <el-option
              v-for="dev in handheldDevices"
              :key="dev.id"
              :label="dev.name"
              :value="dev.id"
            >
              <span class="device-option">
                <span class="device-option-name">{{ dev.name }}</span>
                <i class="status-dot" :class="dev.online ? 'online' : 'offline'" />
              </span>
            </el-option>
          </el-select>
        </div>
      </div>
    </div>
    <VideoExpandOverlay
      v-if="expandedDevice"
      contained
      :source="expandedDevice"
      :project="videoProject"
      @close="expandedDevice = null"
    />
  </div>

  <div
    class="panel-card detail-panel monitor-panel"
    :class="{ 'area-monitor': gridPlacement, 'stretch-panel': verticalStretch, 'dispatch-hq-video-panel': dispatchHqUi }"
  >
    <DispatchHqPanelTitle v-if="dispatchHqUi" title="关联视频监控">
      <template v-if="monitorTotalPages > 1" #actions>
        <div class="page-nav">
          <button
            type="button"
            class="arrow-btn"
            :disabled="monitorPage <= 0"
            aria-label="上一页"
            @click="prevMonitorPage"
          >
            <el-icon><ArrowLeft /></el-icon>
          </button>
          <span class="page-info">{{ monitorPage + 1 }}/{{ monitorTotalPages }}</span>
          <button
            type="button"
            class="arrow-btn"
            :disabled="monitorPage >= monitorTotalPages - 1"
            aria-label="下一页"
            @click="nextMonitorPage"
          >
            <el-icon><ArrowRight /></el-icon>
          </button>
        </div>
      </template>
    </DispatchHqPanelTitle>
    <div v-else class="panel-title compact title-left title-with-page">
      <span class="panel-title-text">关联视频监控</span>
      <div v-if="monitorTotalPages > 1" class="page-nav">
        <button
          type="button"
          class="arrow-btn"
          :disabled="monitorPage <= 0"
          aria-label="上一页"
          @click="prevMonitorPage"
        >
          <el-icon><ArrowLeft /></el-icon>
        </button>
        <span class="page-info">{{ monitorPage + 1 }}/{{ monitorTotalPages }}</span>
        <button
          type="button"
          class="arrow-btn"
          :disabled="monitorPage >= monitorTotalPages - 1"
          aria-label="下一页"
          @click="nextMonitorPage"
        >
          <el-icon><ArrowRight /></el-icon>
        </button>
      </div>
    </div>
    <div class="panel-body monitor-wrap">
      <div
        class="monitor-grid"
        :class="{
          'grid-3x4': monitorGrid === '3x4',
          'grid-3x3': monitorGrid === '3x3',
          'grid-3x2': monitorGrid === '3x2',
        }"
      >
        <div
          v-for="(cam, idx) in monitorCameras"
          :key="cam.id"
          class="mini-cell clickable"
          :class="{ offline: !cam.online }"
          @click="openCameraExpand(cam)"
        >
          <div
            class="mini-placeholder"
            :class="videoPlaceholderClass(cam.online)"
            :style="{ background: videoPlaceholderColor(cam.online, idx) }"
          >
            <el-icon v-if="cam.online" :size="monitorGrid === '3x2' ? 15 : 13" color="rgba(255,255,255,0.55)"><VideoCamera /></el-icon>
            <span v-if="cam.online" class="demo-badge mini">演示</span>
            <span v-if="cam.online && !dispatchHqUi" class="expand-hint"><el-icon><ZoomIn /></el-icon></span>
            <span v-if="!cam.online" class="offline-mask">离线</span>
            <div v-if="dispatchHqUi" class="mini-label mini-label--overlay">{{ cam.name }}</div>
          </div>
          <div v-if="!dispatchHqUi" class="mini-label">{{ cam.name }}</div>
        </div>
        <div v-for="n in emptySlotCount" :key="'e' + n" class="mini-cell empty" />
      </div>
    </div>
    <VideoExpandOverlay
      v-if="expandedCamera"
      contained
      :source="expandedCamera"
      :project="videoProject"
      @close="expandedCamera = null"
    />
  </div>

  <ScreenshotMarkDialog
    v-model:visible="markDialogVisible"
    :camera="snapshotCamera"
    :project="videoProject"
    source-type="live"
  />
</template>

<style scoped>
@import './dispatch-video-panels.css';
</style>

<style>
.dispatch-device-switch-popper .el-select-dropdown__item {
  font-size: calc(13px + var(--coc-font-boost));
  padding-right: 12px;
}

.dispatch-device-switch-popper .device-option,
.device-switch-select .device-selected-label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  max-width: 100%;
  min-width: 0;
}

.dispatch-device-switch-popper .device-option {
  justify-content: space-between;
  width: 100%;
}

.dispatch-device-switch-popper .device-option-name,
.device-switch-select .device-selected-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dispatch-device-switch-popper .status-dot,
.device-switch-select .status-dot {
  flex-shrink: 0;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  display: inline-block;
}

.dispatch-device-switch-popper .status-dot.online,
.device-switch-select .status-dot.online {
  background: var(--coc-success, #67c23a);
}

.dispatch-device-switch-popper .status-dot.offline,
.device-switch-select .status-dot.offline {
  background: var(--coc-danger, #f56c6c);
}
</style>
