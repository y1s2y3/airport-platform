<script setup>
import { ref, computed, reactive, watch, onMounted, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Search } from '@element-plus/icons-vue'
import {
  ArrowLeft,
  ArrowRight,
  ArrowDown,
  VideoCamera,
  Phone,
  Camera,
  Mute,
  Microphone,
  VideoPause,
  FullScreen,
  UserFilled,
} from '@element-plus/icons-vue'
import ScreenshotMarkDialog from './ScreenshotMarkDialog.vue'
import VideoExpandOverlay from './VideoExpandOverlay.vue'
import {
  COMMAND_MEETING_DEVICES,
  COMMAND_MEETING_LIVE_RECORDS,
  videoPlaceholderColor,
  videoPlaceholderClass,
} from '../mock/data.js'

const emit = defineEmits(['back'])

const GRID_SIZE = 9
const PROJECT_SORT = ['p-000', 'p-001', 'p-002', 'p-004', 'hq']
/** 会议主持人（指挥部调度席）固定占首格 */
const MEETING_HOST_DEVICE_ID = 'dv-w1'

const joinedIds = ref(new Set(['dv-h1', 'dv-h2', 'dv-h4', 'dv-h5', 'dv-w1', 'dv-w2', 'dv-w4']))
const callingId = ref(null)
const callingAll = ref(false)
const searchKeyword = ref('')
const cellStates = reactive({})
const speakingIds = ref(new Set())
const markDialogVisible = ref(false)
const markTarget = ref(null)
const expandedDevice = ref(null)
const expandedProjectKeys = ref(new Set())
const meetingPage = ref(0)

const markCamera = computed(() => {
  if (!markTarget.value) return null
  return {
    ...markTarget.value,
    palette: 'cool',
    location: markTarget.value.projectShortName,
  }
})

const markProject = computed(() => {
  if (!markTarget.value) return null
  return {
    shortName: markTarget.value.projectShortName,
    name: markTarget.value.projectShortName,
  }
})

const expandSource = computed(() => {
  if (!expandedDevice.value) return null
  return { ...expandedDevice.value, palette: 'cool' }
})

const expandProject = computed(() => {
  if (!expandedDevice.value) return null
  return {
    shortName: expandedDevice.value.projectShortName,
    name: expandedDevice.value.projectShortName,
  }
})

const joinedDevices = computed(() => {
  const list = COMMAND_MEETING_DEVICES.filter((d) => joinedIds.value.has(d.id))
  return [...list].sort((a, b) => {
    if (a.id === MEETING_HOST_DEVICE_ID) return -1
    if (b.id === MEETING_HOST_DEVICE_ID) return 1
    const aSpeaking = isDeviceSpeaking(a.id)
    const bSpeaking = isDeviceSpeaking(b.id)
    if (aSpeaking && !bSpeaking) return -1
    if (!aSpeaking && bSpeaking) return 1
    const ai = COMMAND_MEETING_DEVICES.findIndex((d) => d.id === a.id)
    const bi = COMMAND_MEETING_DEVICES.findIndex((d) => d.id === b.id)
    return ai - bi
  })
})

const meetingTotalPages = computed(() =>
  Math.max(1, Math.ceil(joinedDevices.value.length / GRID_SIZE)),
)

const pagedJoinedDevices = computed(() => {
  const start = meetingPage.value * GRID_SIZE
  return joinedDevices.value.slice(start, start + GRID_SIZE)
})

const gridSlots = computed(() => {
  const pageItems = pagedJoinedDevices.value
  const slots = []
  for (let i = 0; i < GRID_SIZE; i += 1) {
    slots.push(pageItems[i] || null)
  }
  return slots
})

watch(meetingTotalPages, (total) => {
  if (meetingPage.value > total - 1) {
    meetingPage.value = Math.max(0, total - 1)
  }
})

function prevMeetingPage() {
  if (meetingPage.value > 0) meetingPage.value -= 1
}

function nextMeetingPage() {
  if (meetingPage.value < meetingTotalPages.value - 1) meetingPage.value += 1
}

function cellColorIndex(slotIndex) {
  return meetingPage.value * GRID_SIZE + slotIndex
}

const pendingDevices = computed(() =>
  COMMAND_MEETING_DEVICES.filter((d) => !joinedIds.value.has(d.id)),
)

function projectSortIndex(projectId) {
  const idx = PROJECT_SORT.indexOf(projectId)
  return idx === -1 ? PROJECT_SORT.length : idx
}

function buildProjectGroups(devices) {
  const map = new Map()
  for (const device of devices) {
    const key = device.projectId || device.projectShortName
    if (!map.has(key)) {
      map.set(key, {
        key,
        name: device.projectShortName,
        projectId: device.projectId,
        devices: [],
      })
    }
    map.get(key).devices.push(device)
  }
  return [...map.values()].sort(
    (a, b) => projectSortIndex(a.projectId) - projectSortIndex(b.projectId),
  )
}

const projectGroups = computed(() =>
  buildProjectGroups(COMMAND_MEETING_DEVICES).map((group) => {
    const joinedCount = group.devices.filter((d) => joinedIds.value.has(d.id)).length
    const pending = group.devices.filter((d) => !joinedIds.value.has(d.id))
    return {
      ...group,
      joinedCount,
      pendingCount: pending.length,
      pendingOnline: pending.filter((d) => d.online),
    }
  }),
)

const filteredProjectGroups = computed(() => {
  const kw = searchKeyword.value.trim().toLowerCase()
  if (!kw) return projectGroups.value

  return projectGroups.value
    .map((group) => {
      const projectMatch = group.name.toLowerCase().includes(kw)
      const devices = group.devices.filter(
        (d) => projectMatch || d.name.toLowerCase().includes(kw),
      )
      if (!devices.length) return null
      const joinedCount = devices.filter((d) => joinedIds.value.has(d.id)).length
      const pending = devices.filter((d) => !joinedIds.value.has(d.id))
      return {
        ...group,
        devices,
        joinedCount,
        pendingCount: pending.length,
        pendingOnline: pending.filter((d) => d.online),
      }
    })
    .filter(Boolean)
})

function isMeetingHost(device) {
  return device?.id === MEETING_HOST_DEVICE_ID
}

function createCellState() {
  return {
    muted: false,
    videoOn: true,
  }
}

function isDeviceSpeaking(deviceId) {
  return speakingIds.value.has(deviceId) && !getCellState(deviceId).muted
}

function resolveSpeakerDeviceId(speaker) {
  if (!speaker) return null
  if (speaker === '指挥部调度席') return MEETING_HOST_DEVICE_ID
  const byOperator = COMMAND_MEETING_DEVICES.find((d) => d.operator === speaker)
  if (byOperator) return byOperator.id
  const byName = COMMAND_MEETING_DEVICES.find(
    (d) => d.name.includes(speaker) || speaker.includes(d.name.replace(/终端|对讲席|调度席/g, '')),
  )
  return byName?.id || null
}

function setActiveSpeaker(deviceId) {
  if (!deviceId || !joinedIds.value.has(deviceId)) return
  if (getCellState(deviceId).muted) return
  speakingIds.value = new Set([deviceId])
}

function initJoinedCellStates() {
  joinedIds.value.forEach((deviceId) => {
    if (!cellStates[deviceId]) {
      cellStates[deviceId] = createCellState()
    }
  })
}

let speakingDemoTimer = null
let speakingDemoIndex = 0

function startSpeakingDemo() {
  const speechRecords = COMMAND_MEETING_LIVE_RECORDS.filter(
    (item) => item.role === 'web' || item.role === 'handheld',
  )
  if (!speechRecords.length) return

  speakingDemoTimer = window.setInterval(() => {
    const record = speechRecords[speakingDemoIndex % speechRecords.length]
    speakingDemoIndex += 1
    const deviceId = resolveSpeakerDeviceId(record.speaker)
    setActiveSpeaker(deviceId)
  }, 3200)

  const initial = resolveSpeakerDeviceId(speechRecords[0]?.speaker)
  setActiveSpeaker(initial)
}

function stopSpeakingDemo() {
  if (speakingDemoTimer) {
    window.clearInterval(speakingDemoTimer)
    speakingDemoTimer = null
  }
}

onMounted(() => {
  initJoinedCellStates()
  startSpeakingDemo()
})

onUnmounted(() => {
  stopSpeakingDemo()
})

function getCellState(deviceId) {
  if (!cellStates[deviceId]) {
    cellStates[deviceId] = createCellState()
  }
  return cellStates[deviceId]
}

function isProjectExpanded(key) {
  return expandedProjectKeys.value.has(key)
}

function toggleProjectExpand(key) {
  const next = new Set(expandedProjectKeys.value)
  if (next.has(key)) next.delete(key)
  else next.add(key)
  expandedProjectKeys.value = next
}

function isJoined(device) {
  return joinedIds.value.has(device.id)
}

function isCalling(device) {
  return callingId.value === device.id
}

function isBusy() {
  return callingId.value != null || callingAll.value
}

function joinDevice(device) {
  joinedIds.value = new Set([...joinedIds.value, device.id])
  getCellState(device.id)
}

function callDevice(device) {
  if (isJoined(device)) return
  if (!device.online) {
    ElMessage.warning(`${device.name} 离线，无法呼叫`)
    return
  }
  if (isBusy()) return
  callingId.value = device.id
  ElMessage.info(`正在呼叫 ${device.name}…`)
  window.setTimeout(() => {
    joinDevice(device)
    callingId.value = null
    ElMessage.success(`${device.name} 已入会`)
  }, 1200)
}

function callTargets(targets, doneMessage) {
  if (!targets.length) {
    ElMessage.info('暂无未参会的在线设备')
    return
  }
  if (isBusy()) return
  callingAll.value = true
  ElMessage.info(`正在一键呼叫 ${targets.length} 台设备…`)
  let i = 0
  const tick = () => {
    if (i >= targets.length) {
      callingAll.value = false
      callingId.value = null
      ElMessage.success(doneMessage)
      return
    }
    const device = targets[i]
    callingId.value = device.id
    window.setTimeout(() => {
      joinDevice(device)
      callingId.value = null
      i += 1
      tick()
    }, 800)
  }
  tick()
}

function callAllPending() {
  callTargets(
    pendingDevices.value.filter((d) => d.online),
    '一键呼叫完成',
  )
}

function callProjectPending(group) {
  callTargets(group.pendingOnline, `${group.name} 一键呼叫完成`)
}

function toggleCellMute(deviceId) {
  const state = getCellState(deviceId)
  state.muted = !state.muted
  if (state.muted) {
    const next = new Set(speakingIds.value)
    next.delete(deviceId)
    speakingIds.value = next
  } else {
    setActiveSpeaker(deviceId)
  }
  ElMessage.info(state.muted ? '已静音' : '已开启声音')
}

function muteAllJoined() {
  if (!joinedDevices.value.length) {
    ElMessage.info('暂无已入会设备')
    return
  }
  joinedIds.value.forEach((deviceId) => {
    getCellState(deviceId).muted = true
  })
  speakingIds.value = new Set()
  ElMessage.success('已全员静音')
}

function unmuteAllJoined() {
  if (!joinedDevices.value.length) {
    ElMessage.info('暂无已入会设备')
    return
  }
  joinedIds.value.forEach((deviceId) => {
    getCellState(deviceId).muted = false
  })
  const preferredSpeaker = joinedIds.value.has(MEETING_HOST_DEVICE_ID)
    ? MEETING_HOST_DEVICE_ID
    : joinedDevices.value[0]?.id
  if (preferredSpeaker) {
    setActiveSpeaker(preferredSpeaker)
  }
  ElMessage.success('已取消全员静音')
}

function toggleCellVideo(deviceId) {
  const state = getCellState(deviceId)
  state.videoOn = !state.videoOn
  ElMessage.info(state.videoOn ? '画面已开启' : '画面已关闭')
}

function openCellSnapshot(device) {
  if (!device.online) {
    ElMessage.warning('设备离线，无法截图')
    return
  }
  markTarget.value = device
  markDialogVisible.value = true
}

function openCellFullscreen(device) {
  expandedDevice.value = device
}
</script>

<template>
  <main class="command-meeting-layout">
    <div class="detail-topbar panel-card">
      <div class="topbar-row">
        <button class="back-btn" type="button" @click="emit('back')">
          <el-icon :size="16"><ArrowLeft /></el-icon>
          返回
        </button>
        <span class="detail-heading">领导讲话</span>
        <div class="topbar-actions">
          <span class="meeting-meta">已入会 {{ joinedDevices.length }} / {{ COMMAND_MEETING_DEVICES.length }}</span>
          <div class="meeting-mute-actions">
            <button
              type="button"
              class="meeting-action-btn"
              :disabled="!joinedDevices.length"
              @click="muteAllJoined"
            >
              <el-icon :size="14"><Mute /></el-icon>
              全员静音
            </button>
            <button
              type="button"
              class="meeting-action-btn primary"
              :disabled="!joinedDevices.length"
              @click="unmuteAllJoined"
            >
              <el-icon :size="14"><Microphone /></el-icon>
              取消静音
            </button>
          </div>
        </div>
      </div>
    </div>

    <section class="meeting-body">
      <div class="panel-card grid-panel">
        <div class="panel-title compact title-left title-with-page">
          <span class="panel-title-text">会议列表</span>
          <div class="page-nav">
            <button
              type="button"
              class="arrow-btn"
              :disabled="meetingPage <= 0 || !joinedDevices.length"
              aria-label="上一页"
              @click="prevMeetingPage"
            >
              <el-icon><ArrowLeft /></el-icon>
            </button>
            <span class="page-info">{{ meetingPage + 1 }}/{{ meetingTotalPages }}</span>
            <button
              type="button"
              class="arrow-btn"
              :disabled="meetingPage >= meetingTotalPages - 1 || !joinedDevices.length"
              aria-label="下一页"
              @click="nextMeetingPage"
            >
              <el-icon><ArrowRight /></el-icon>
            </button>
          </div>
        </div>
        <div class="panel-body grid-body">
          <div class="device-grid grid-3x3 grid-screen">
            <div
              v-for="(device, idx) in gridSlots"
              :key="device ? device.id : `empty-${idx}`"
              class="grid-cell"
              :class="{
                joined: device,
                empty: !device,
                'host-cell': device && isMeetingHost(device),
                speaking: device && isDeviceSpeaking(device.id),
              }"
            >
              <template v-if="device">
                <div
                  class="cell-video"
                  :class="videoPlaceholderClass(device.online, 'cool', device.type)"
                  :style="{
                    background: getCellState(device.id).videoOn
                      ? videoPlaceholderColor(device.online, cellColorIndex(idx), 'cool', device.type)
                      : '#2a2a2a',
                  }"
                >
                  <span v-if="isMeetingHost(device)" class="host-director-badge">
                    <el-icon :size="14"><UserFilled /></el-icon>
                    <span>主持人</span>
                  </span>
                  <el-icon
                    v-if="getCellState(device.id).videoOn && device.type !== 'handheld'"
                    :size="22"
                    color="rgba(255,255,255,0.55)"
                  >
                    <VideoCamera />
                  </el-icon>
                  <span v-else class="video-off-tip">画面已关闭</span>

                  <div class="cell-controls">
                    <button
                      type="button"
                      class="cell-ctrl-btn"
                      :class="{ active: !getCellState(device.id).videoOn }"
                      :title="getCellState(device.id).videoOn ? '关闭画面' : '开启画面'"
                      @click.stop="toggleCellVideo(device.id)"
                    >
                      <el-icon :size="13">
                        <component :is="getCellState(device.id).videoOn ? VideoCamera : VideoPause" />
                      </el-icon>
                    </button>
                    <button
                      type="button"
                      class="cell-ctrl-btn"
                      title="问题截图"
                      @click.stop="openCellSnapshot(device)"
                    >
                      <el-icon :size="13"><Camera /></el-icon>
                    </button>
                  </div>
                </div>
                <div class="cell-label">
                  <span class="cell-name" :title="device.name">{{ device.name }}</span>
                  <span class="cell-project">{{ isMeetingHost(device) ? '指挥部' : device.projectShortName }}</span>
                </div>
              </template>
            </div>
          </div>
        </div>
      </div>

      <aside class="side-column">
        <div class="panel-card side-panel device-list-panel">
          <div class="panel-title compact title-left title-with-action">
            <span class="panel-title-text">设备列表</span>
            <button
              type="button"
              class="call-all-btn"
              :disabled="isBusy()"
              @mousedown.stop
              @click.stop.prevent="callAllPending"
            >
              <el-icon><Phone /></el-icon>
              {{ callingAll ? '呼叫中…' : '一键呼叫' }}
            </button>
          </div>
          <div class="panel-body side-body scroll-body hq-scrollbar">
            <div class="tree-search">
              <el-input
                v-model="searchKeyword"
                placeholder="搜索项目名称 / 设备名称"
                clearable
                size="small"
              >
                <template #prefix>
                  <el-icon><Search /></el-icon>
                </template>
              </el-input>
            </div>

            <div v-if="filteredProjectGroups.length" class="device-tree-custom">
              <section
                v-for="group in filteredProjectGroups"
                :key="group.key"
                class="tree-group"
              >
                <header
                  class="tree-project-node"
                  :class="{ expanded: isProjectExpanded(group.key) }"
                >
                  <div
                    class="tree-project-main"
                    @click="toggleProjectExpand(group.key)"
                  >
                    <span class="tree-expand-icon">
                      <el-icon :size="12">
                        <ArrowDown v-if="isProjectExpanded(group.key)" />
                        <ArrowRight v-else />
                      </el-icon>
                    </span>
                    <span class="tree-project-name">{{ group.name }}</span>
                    <span class="tree-project-stats">
                      已参会 <b class="ok">{{ group.joinedCount }}</b>
                      · 未参会 <b class="warn">{{ group.pendingCount }}</b>
                    </span>
                  </div>
                  <button
                    v-if="group.pendingCount > 0"
                    type="button"
                    class="call-group-btn"
                    :disabled="isBusy()"
                    @mousedown.stop
                    @click.stop.prevent="callProjectPending(group)"
                  >
                    一键呼叫
                  </button>
                </header>
                <ul v-show="isProjectExpanded(group.key)" class="tree-device-list">
                  <li
                    v-for="device in group.devices"
                    :key="device.id"
                    class="tree-device-row"
                    :class="{ joined: isJoined(device) }"
                  >
                    <span class="tree-device-name" :title="device.name">{{ device.name }}</span>
                    <span class="status-tag" :class="device.online ? 'online' : 'offline'">
                      {{ device.online ? '在线' : '离线' }}
                    </span>
                    <span class="status-tag" :class="isJoined(device) ? 'joined' : 'absent'">
                      {{ isJoined(device) ? '已参会' : '未参会' }}
                    </span>
                    <div v-if="isJoined(device)" class="device-row-actions">
                      <button
                        type="button"
                        class="device-act-btn"
                        :class="{ active: getCellState(device.id).muted }"
                        :title="getCellState(device.id).muted ? '开启声音' : '静音'"
                        @click.stop="toggleCellMute(device.id)"
                      >
                        <el-icon :size="13">
                          <component :is="getCellState(device.id).muted ? Mute : Microphone" />
                        </el-icon>
                      </button>
                      <button
                        type="button"
                        class="device-act-btn"
                        title="全屏查看"
                        @click.stop="openCellFullscreen(device)"
                      >
                        <el-icon :size="13"><FullScreen /></el-icon>
                      </button>
                    </div>
                    <button
                      v-if="!isJoined(device)"
                      type="button"
                      class="call-btn"
                      :disabled="!device.online || isCalling(device) || callingAll"
                      @click.stop="callDevice(device)"
                    >
                      <el-icon><Phone /></el-icon>
                      {{ isCalling(device) ? '呼叫中' : '呼叫' }}
                    </button>
                  </li>
                </ul>
              </section>
            </div>
            <div v-else class="tree-empty">未找到匹配的设备</div>
          </div>
        </div>
      </aside>
    </section>

    <ScreenshotMarkDialog
      v-model:visible="markDialogVisible"
      :camera="markCamera"
      :project="markProject"
      source-type="meeting"
    />

    <VideoExpandOverlay
      v-if="expandSource"
      :source="expandSource"
      :project="expandProject"
      @close="expandedDevice = null"
    />
  </main>
</template>

<style scoped>
.command-meeting-layout {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  padding: 8px 28px 20px;
  gap: 7px;
}

.detail-topbar {
  flex-shrink: 0;
  padding: 8px 24px;
}

.topbar-row {
  display: flex;
  align-items: center;
  gap: 16px;
  width: 100%;
}

.back-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 1px solid var(--coc-border);
  background: #fff;
  border-radius: 8px;
  padding: 8px 14px;
  font-size: calc(13px + var(--coc-font-boost));
  cursor: pointer;
  color: var(--coc-text-secondary);
}

.back-btn:hover {
  border-color: var(--coc-accent);
  color: var(--coc-accent);
}

.detail-heading {
  font-size: calc(18px + var(--coc-font-boost));
  font-weight: 700;
  color: var(--coc-text);
}

.topbar-actions {
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.meeting-meta {
  font-size: calc(13px + var(--coc-font-boost));
  color: var(--coc-text-secondary);
}

.meeting-mute-actions {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.meeting-action-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border: 1px solid var(--coc-border);
  background: #fff;
  color: var(--coc-text-secondary);
  border-radius: 6px;
  padding: 6px 12px;
  font-size: calc(12px + var(--coc-font-boost));
  font-weight: 600;
  cursor: pointer;
  transition: border-color 0.2s, color 0.2s, background 0.2s;
}

.meeting-action-btn.primary {
  border-color: var(--coc-accent);
  background: rgba(201, 123, 99, 0.1);
  color: var(--coc-accent);
}

.meeting-action-btn:hover:not(:disabled) {
  border-color: var(--coc-accent);
  color: var(--coc-accent);
  background: rgba(201, 123, 99, 0.08);
}

.meeting-action-btn.primary:hover:not(:disabled) {
  background: rgba(201, 123, 99, 0.16);
}

.meeting-action-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.meeting-body {
  flex: 1;
  min-height: 0;
  display: grid;
  /* 会议列表宽度 +20% */
  grid-template-columns: minmax(0, 1.2fr) minmax(0, 0.67fr);
  gap: 16px;
}

.grid-panel,
.side-panel {
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.panel-title.compact {
  font-size: calc(16px + var(--coc-font-boost));
  flex-shrink: 0;
}

.title-with-action {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 10px;
}

.title-with-action .call-all-btn {
  margin-left: auto;
  pointer-events: auto;
}

.panel-title-text {
  flex-shrink: 0;
}

.title-with-page {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 10px;
}

.title-with-page .page-nav {
  margin-left: auto;
}

.page-nav {
  display: inline-flex;
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

.device-list-panel .panel-title {
  position: relative;
  z-index: 1;
}

.call-all-btn,
.call-group-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border: 1px solid var(--coc-accent);
  background: linear-gradient(135deg, var(--coc-accent), var(--coc-gold));
  color: #fff;
  border-radius: 6px;
  padding: 5px 12px;
  font-size: calc(11px + var(--coc-font-boost));
  font-weight: 600;
  cursor: pointer;
  flex-shrink: 0;
  position: relative;
  z-index: 2;
}

.call-group-btn {
  padding: 3px 8px;
  font-size: calc(10px + var(--coc-font-boost));
  margin-left: auto;
  pointer-events: auto;
  z-index: 3;
}

.tree-project-main {
  display: flex;
  align-items: center;
  flex: 1;
  min-width: 0;
  gap: 6px;
  cursor: pointer;
  user-select: none;
}

.call-all-btn:hover:not(:disabled),
.call-group-btn:hover:not(:disabled) {
  opacity: 0.92;
}

.call-all-btn:disabled,
.call-group-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.grid-body {
  padding: 12px !important;
  min-height: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
}

/* 九宫格：一整块大画面，内部用分割线分格 */
.device-grid {
  flex: 1;
  min-height: 0;
  display: grid;
  gap: 0;
  overflow: hidden;
  border: 1px solid var(--coc-border);
  border-radius: 10px;
  background: #1f2329;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.04);
}

.grid-3x3 {
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: repeat(3, 1fr);
}

.grid-cell {
  border: none;
  border-radius: 0;
  overflow: hidden;
  background: #2a2a2a;
  display: flex;
  flex-direction: column;
  min-height: 0;
  /* 内部分割线：右、下 */
  box-shadow:
    inset -1px 0 0 rgba(255, 255, 255, 0.14),
    inset 0 -1px 0 rgba(255, 255, 255, 0.14);
}

.grid-cell:nth-child(3n) {
  box-shadow: inset 0 -1px 0 rgba(255, 255, 255, 0.14);
}

.grid-cell:nth-child(n + 7) {
  box-shadow: inset -1px 0 0 rgba(255, 255, 255, 0.14);
}

.grid-cell:nth-child(3n):nth-child(n + 7) {
  box-shadow: none;
}

.grid-cell.empty {
  background: rgba(0, 0, 0, 0.28);
}

.grid-cell.joined {
  background: #2a2a2a;
}

/* 主持人 / 发言态：内描边，不破坏整屏分割线 */
.grid-cell.host-cell .cell-video {
  box-shadow: inset 0 0 0 2px rgba(201, 123, 99, 0.9);
}

.grid-cell.speaking:not(.host-cell) .cell-video {
  box-shadow: inset 0 0 0 2px rgba(64, 158, 255, 0.9);
}

.host-director-badge {
  position: absolute;
  top: 8px;
  left: 8px;
  z-index: 2;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  border-radius: 4px;
  background: linear-gradient(135deg, var(--coc-accent), var(--coc-gold));
  color: #fff;
  font-size: calc(10px + var(--coc-font-boost));
  font-weight: 700;
  line-height: 1;
}

.cell-video {
  flex: 1;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 0;
}

.video-off-tip {
  font-size: calc(11px + var(--coc-font-boost));
  color: rgba(255, 255, 255, 0.65);
}

.rec-badge {
  position: absolute;
  top: 8px;
  right: 8px;
  background: #f56c6c;
  color: #fff;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: calc(10px + var(--coc-font-boost));
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.02em;
}

.cell-controls {
  position: absolute;
  left: 6px;
  bottom: 6px;
  display: flex;
  align-items: center;
  gap: 4px;
  z-index: 2;
}

.cell-ctrl-btn {
  width: 24px;
  height: 24px;
  padding: 0;
  border: none;
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.55);
  color: #fff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.cell-ctrl-btn:hover,
.cell-ctrl-btn.active {
  background: rgba(201, 123, 99, 0.85);
}

.rec-icon-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #fff;
  opacity: 0.85;
}

.rec-icon-dot.on {
  background: #ff4d4f;
  animation: recBlink 1s infinite;
}

@keyframes recBlink {
  50% { opacity: 0.45; }
}

.cell-label {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  padding: 6px 8px;
  background: rgba(20, 22, 26, 0.92);
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  flex-shrink: 0;
}

.cell-name {
  font-size: calc(11px + var(--coc-font-boost));
  font-weight: 600;
  color: rgba(255, 255, 255, 0.92);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 55%;
}

.cell-project {
  font-size: calc(10px + var(--coc-font-boost));
  font-weight: 600;
  color: rgba(201, 123, 99, 0.95);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex-shrink: 0;
}

.side-column {
  display: flex;
  flex-direction: column;
  min-height: 0;
  min-width: 0;
}

.device-list-panel {
  flex: 1;
  min-height: 0;
}

.side-body {
  padding: 10px 12px 12px !important;
  min-height: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
}

.scroll-body {
  overflow-y: auto;
}

.tree-search {
  flex-shrink: 0;
  margin-bottom: 10px;
}

.tree-empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: calc(12px + var(--coc-font-boost));
  color: var(--coc-text-muted);
}

.device-tree-custom {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.tree-group {
  border: 1px solid var(--coc-border);
  border-radius: 8px;
  overflow: hidden;
  background: #fff;
}

.tree-project-node {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  background: #faf8f6;
  border-bottom: 1px solid var(--coc-border);
}

.tree-project-node:not(.expanded) {
  border-bottom: none;
}

.tree-expand-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  flex-shrink: 0;
  color: var(--coc-text-secondary);
}

.tree-project-name {
  font-size: calc(13px + var(--coc-font-boost));
  font-weight: 700;
  color: var(--coc-text);
  text-align: left;
}

.tree-project-stats {
  font-size: calc(11px + var(--coc-font-boost));
  color: var(--coc-text-secondary);
  white-space: nowrap;
}

.tree-project-stats b.ok {
  color: var(--coc-success);
}

.tree-project-stats b.warn {
  color: #e6a23c;
}

.tree-device-list {
  list-style: none;
  margin: 0;
  padding: 6px 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.tree-device-row {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  border-radius: 6px;
  background: #faf8f6;
  border: 1px solid var(--coc-border);
}

.tree-device-row.joined {
  border-color: rgba(103, 194, 58, 0.35);
  background: rgba(103, 194, 58, 0.05);
}

.tree-device-name {
  flex: 1;
  min-width: 0;
  font-size: calc(12px + var(--coc-font-boost));
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.status-tag {
  font-size: calc(10px + var(--coc-font-boost));
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 4px;
  white-space: nowrap;
  flex-shrink: 0;
}

.status-tag.online {
  color: var(--coc-success);
  background: rgba(103, 194, 58, 0.12);
}

.status-tag.offline {
  color: var(--coc-danger);
  background: rgba(245, 108, 108, 0.12);
}

.status-tag.joined {
  color: #409eff;
  background: rgba(64, 158, 255, 0.12);
}

.status-tag.absent {
  color: #e6a23c;
  background: rgba(230, 162, 60, 0.12);
}

.call-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border: 1px solid var(--coc-accent);
  background: #fff;
  color: var(--coc-accent);
  border-radius: 6px;
  padding: 4px 8px;
  font-size: calc(10px + var(--coc-font-boost));
  cursor: pointer;
  flex-shrink: 0;
}

.call-btn:hover:not(:disabled) {
  background: rgba(201, 123, 99, 0.1);
}

.call-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.device-row-actions {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
  margin-left: 2px;
}

.device-act-btn {
  width: 26px;
  height: 26px;
  padding: 0;
  border: 1px solid var(--coc-border);
  border-radius: 6px;
  background: #fff;
  color: var(--coc-text-secondary);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: border-color 0.15s, color 0.15s, background 0.15s;
}

.device-act-btn:hover,
.device-act-btn.active {
  border-color: var(--coc-accent);
  color: var(--coc-accent);
  background: rgba(201, 123, 99, 0.1);
}
</style>
