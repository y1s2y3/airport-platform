<script setup>
import { ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { VideoCamera, ZoomIn, Camera, Mute, Microphone, Phone } from '@element-plus/icons-vue'
import VideoExpandOverlay from '../../VideoExpandOverlay.vue'
import { DISPATCH_DEVICES, videoPlaceholderColor } from '../../../mock/data.js'

const props = defineProps({
  device: { type: Object, required: true },
  videoProject: { type: Object, required: true },
  /** 项目调度二级页：手持巡检画面工具栏切换设备 */
  enableDeviceSwitch: { type: Boolean, default: false },
  /** 嵌入演练页网格时，与手持/监控列对齐 */
  gridPlacement: { type: Boolean, default: false },
  /** 关联监控网格：3x2（默认）| 3x3 | 3x4 */
  monitorGrid: {
    type: String,
    default: '3x2',
    validator: (v) => ['3x2', '3x3', '3x4'].includes(v),
  },
  /** 纵向拉伸填满上级区域（COC 调度指挥对讲页） */
  verticalStretch: { type: Boolean, default: false },
})

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
  const list = props.videoProject?.cameras || []
  const source = list.length
    ? list
    : DEMO_MONITOR_NAMES.map((name, i) => ({
        id: `demo-cam-${i}`,
        name,
        online: i % 4 !== 0,
      }))
  return source.slice(0, slotCount.value)
})

const emptySlotCount = computed(() => Math.max(0, slotCount.value - monitorCameras.value.length))

const expandedCamera = ref(null)
const deviceMuted = ref(true)
const deviceStream = ref('main')
const selectedDeviceId = ref(props.device.id)

const handheldDevices = computed(() =>
  DISPATCH_DEVICES.filter((item) => item.type === 'handheld'),
)

const activeDevice = computed(() => {
  if (!props.enableDeviceSwitch) return props.device
  return handheldDevices.value.find((item) => item.id === selectedDeviceId.value) || props.device
})

watch(
  () => props.device.id,
  (id) => {
    selectedDeviceId.value = id
  },
)

function handleDeviceSwitch(id) {
  const target = handheldDevices.value.find((item) => item.id === id)
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

function toggleDeviceMute() {
  deviceMuted.value = !deviceMuted.value
  ElMessage.info(deviceMuted.value ? '已静音' : '已开启声音')
}

function toggleDeviceStream() {
  deviceStream.value = deviceStream.value === 'main' ? 'sub' : 'main'
  ElMessage.info(`已切换至${deviceStream.value === 'main' ? '主' : '子'}码流`)
}

function deviceSnapshot() {
  ElMessage.success('巡检画面截图已保存')
}

function deviceCall() {
  if (!activeDevice.value.online) {
    ElMessage.warning(`${activeDevice.value.name} 离线，无法呼叫`)
    return
  }
  ElMessage.info(`正在呼叫 ${activeDevice.value.name}…`)
}
</script>

<template>
  <div
    class="panel-card detail-panel device-panel"
    :class="{ 'area-device': gridPlacement, 'stretch-panel': verticalStretch }"
  >
    <div class="panel-title compact">
      {{ activeDevice.type === 'handheld' ? '手持巡检实时画面' : 'Web端对讲画面' }}
    </div>
    <div class="panel-body device-body">
      <div
        class="main-video"
        :class="{ offline: !activeDevice.online }"
        :style="{ background: videoPlaceholderColor(activeDevice.online, 0, 'cool') }"
      >
        <el-icon v-if="activeDevice.online" :size="29" color="rgba(255,255,255,0.5)"><VideoCamera /></el-icon>
        <span v-if="activeDevice.online" class="demo-badge">演示画面</span>
        <span v-if="!activeDevice.online" class="offline-tip">设备离线</span>
      </div>
      <div class="device-controls">
        <div class="device-controls-left">
          <button class="ctrl-btn" title="截图" @click="deviceSnapshot"><el-icon><Camera /></el-icon></button>
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
  </div>

  <div
    class="panel-card detail-panel monitor-panel"
    :class="{ 'area-monitor': gridPlacement, 'stretch-panel': verticalStretch }"
  >
    <div class="panel-title compact">关联视频监控</div>
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
          <div class="mini-placeholder" :style="{ background: videoPlaceholderColor(cam.online, idx) }">
            <el-icon v-if="cam.online" :size="monitorGrid === '3x2' ? 15 : 13" color="rgba(255,255,255,0.55)"><VideoCamera /></el-icon>
            <span v-if="cam.online" class="demo-badge mini">演示</span>
            <span v-if="cam.online" class="expand-hint"><el-icon><ZoomIn /></el-icon></span>
            <span v-if="!cam.online" class="offline-mask">离线</span>
          </div>
          <div class="mini-label">{{ cam.name }}</div>
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
</template>

<style scoped>
@import './dispatch-video-panels.css';
</style>

<style>
.dispatch-device-switch-popper .el-select-dropdown__item {
  font-size: 13px;
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
