<script setup>
import { ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import {
  VideoCamera,
  Close,
  ZoomIn,
  ZoomOut,
  Camera,
  Mute,
  Microphone,
  VideoPlay,
  VideoPause,
} from '@element-plus/icons-vue'
import ScreenshotMarkDialog from './ScreenshotMarkDialog.vue'
import {
  videoPlaceholderColor,
  getDispatchMeetingPlaybackNodes,
  getMeetingPlaybackDates,
  formatMinutesToClock,
} from '../mock/data.js'

const SCRUB_MIN = 360
const SCRUB_MAX = 1320

const props = defineProps({
  source: { type: Object, default: null },
  project: { type: Object, default: null },
  /** 面板内放大：不 Teleport 全屏，仅覆盖父级定位容器（关联视频监控） */
  contained: { type: Boolean, default: false },
})

const emit = defineEmits(['close', 'issue-submit'])

const PLAYBACK_DATES = getMeetingPlaybackDates()
const DEFAULT_PLAYBACK_DATE = PLAYBACK_DATES[0] || '2026-06-16'

const viewMode = ref('live')
const zoomLevel = ref(1)
const muted = ref(true)
const streamMode = ref('main')
const markDialogVisible = ref(false)
const playbackDate = ref(DEFAULT_PLAYBACK_DATE)
const playbackMinutes = ref(570)
const meetingMonth = ref(DEFAULT_PLAYBACK_DATE.slice(0, 7))
const activeMeetingId = ref(null)

const deviceName = computed(() => props.source?.name || '')
const isOnline = computed(() => props.source?.online !== false)
const isPtz = computed(() => props.source?.type === 'ptz')
const isKey = computed(() => !!props.source?.key)
const isPlayback = computed(() => viewMode.value === 'playback')
const canOperateVideo = computed(() => isOnline.value || isPlayback.value)

const playbackClock = computed(() => formatMinutesToClock(playbackMinutes.value))

const meetingNodesAll = computed(() => getDispatchMeetingPlaybackNodes())

const dateMeetingNodes = computed(() =>
  meetingNodesAll.value.filter((node) => node.date === playbackDate.value),
)

const monthMeetingNodes = computed(() =>
  meetingNodesAll.value.filter((node) => node.startTime.slice(0, 7) === meetingMonth.value),
)

const hourTicks = computed(() => {
  const ticks = []
  for (let h = 6; h <= 22; h += 1) {
    ticks.push({
      label: `${String(h).padStart(2, '0')}:00`,
      minutes: h * 60,
    })
  }
  return ticks
})

const playbackTimeLabel = computed(() => `${playbackDate.value} ${playbackClock.value}`)

const bgStyle = computed(() => {
  const palette = props.source?.palette || 'warm'
  const online = canOperateVideo.value
  const colorIndex = isPlayback.value ? Math.floor(playbackMinutes.value / 15) : 0
  return {
    background: videoPlaceholderColor(online, colorIndex, palette),
    transform: `scale(${zoomLevel.value})`,
  }
})

function close() {
  emit('close')
}

function handleZoom(delta) {
  zoomLevel.value = Math.min(2, Math.max(1, +(zoomLevel.value + delta).toFixed(1)))
}

function toggleMute() {
  muted.value = !muted.value
  ElMessage.info(muted.value ? '已静音' : '已开启声音')
}

function toggleStream() {
  if (isPlayback.value) return
  streamMode.value = streamMode.value === 'main' ? 'sub' : 'main'
  ElMessage.info(`已切换至${streamMode.value === 'main' ? '主' : '子'}码流`)
}

function snapshot() {
  if (!canOperateVideo.value) {
    ElMessage.warning('该摄像头离线，无法截屏')
    return
  }
  markDialogVisible.value = true
}

function handleIssueSubmit(payload) {
  emit('issue-submit', payload)
}

function ptzMove(dir) {
  ElMessage.info(`云台${dir}`)
}

function isMeetingActive(node) {
  if (activeMeetingId.value === node.id) return true
  if (node.date !== playbackDate.value) return false
  const end = node.minutesOfDay + node.durationMinutes
  return playbackMinutes.value >= node.minutesOfDay && playbackMinutes.value <= end
}

function syncActiveMeetingByTime() {
  const hit = dateMeetingNodes.value.find((node) => isMeetingActive(node))
  activeMeetingId.value = hit?.id ?? null
}

function enterPlayback() {
  if (!canOperateVideo.value && !isOnline.value) {
    ElMessage.warning('该摄像头离线，暂无录像可回放')
    return
  }
  viewMode.value = 'playback'
  meetingMonth.value = playbackDate.value.slice(0, 7)
  const firstOnDate = dateMeetingNodes.value[0]
  if (firstOnDate) {
    playbackMinutes.value = firstOnDate.minutesOfDay
    activeMeetingId.value = firstOnDate.id
  } else {
    playbackMinutes.value = 540
    activeMeetingId.value = null
  }
  ElMessage.info('已进入录像回放')
}

function exitPlayback() {
  viewMode.value = 'live'
  activeMeetingId.value = null
}

function selectMeetingNode(node) {
  playbackDate.value = node.date
  playbackMinutes.value = node.minutesOfDay
  meetingMonth.value = node.date.slice(0, 7)
  activeMeetingId.value = node.id
}

function onPlaybackDateChange() {
  const nodes = dateMeetingNodes.value
  if (nodes.length) {
    playbackMinutes.value = nodes[0].minutesOfDay
    activeMeetingId.value = nodes[0].id
  } else {
    activeMeetingId.value = null
  }
}

function onScrubberInput(value) {
  playbackMinutes.value = value
  syncActiveMeetingByTime()
}

function formatScrubTooltip(value) {
  return formatMinutesToClock(value)
}

watch(
  () => props.source,
  () => {
    viewMode.value = 'live'
    activeMeetingId.value = null
  },
)
</script>

<template>
  <Teleport to="#coc-overlay-root" :disabled="contained">
    <div v-if="source" class="video-expand-overlay" :class="{ 'is-contained': contained }">
      <div class="expand-header">
        <div class="expand-title">
          <el-icon :size="15"><VideoCamera /></el-icon>
          <span>{{ deviceName }}</span>
          <span v-if="isKey" class="key-badge">重点</span>
          <span v-if="isPlayback" class="mode-badge playback">回放</span>
          <span v-else class="online-tag" :class="isOnline ? 'online' : 'offline'">
            {{ isOnline ? '在线' : '离线' }}
          </span>
        </div>
        <button class="close-btn" @click="close">
          <el-icon :size="13"><Close /></el-icon>
          关闭
        </button>
      </div>

      <div class="expand-body" :class="{ 'has-playback-sidebar': isPlayback }">
        <div class="video-stage">
          <div class="video-viewport">
            <div class="video-canvas" :style="bgStyle">
              <el-icon v-if="canOperateVideo" :size="45" color="rgba(255,255,255,0.45)">
                <VideoCamera />
              </el-icon>
              <span v-else class="offline-hint">信号中断</span>

              <span v-if="isPlayback" class="playback-time-badge">{{ playbackTimeLabel }}</span>
            </div>
          </div>

          <div v-if="isPlayback" class="playback-scrubber">
            <div class="scrub-grid">
              <div class="scrub-date-wrap">
                <span class="scrub-date-label">回放日期</span>
                <el-date-picker
                  v-model="playbackDate"
                  type="date"
                  value-format="YYYY-MM-DD"
                  placeholder="选择日期"
                  size="small"
                  :clearable="false"
                  class="scrub-date-picker"
                />
              </div>
              <div class="scrub-track-wrap">
                <div class="scrub-head-inline">
                  <span class="scrub-label">时间轴</span>
                  <span class="scrub-current">{{ playbackClock }}</span>
                </div>
                <el-slider
                  :model-value="playbackMinutes"
                  :min="SCRUB_MIN"
                  :max="SCRUB_MAX"
                  :step="1"
                  :format-tooltip="formatScrubTooltip"
                  @input="onScrubberInput"
                />
                <div class="hour-scale">
                  <div class="hour-marks">
                    <span v-for="tick in hourTicks" :key="`mark-${tick.minutes}`" class="hour-mark" />
                  </div>
                  <div class="hour-labels">
                    <span v-for="tick in hourTicks" :key="`label-${tick.minutes}`" class="hour-label">
                      {{ tick.label }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="control-bar">
            <div class="control-group">
              <template v-if="!isPlayback">
                <button class="ctrl-btn" title="放大" @click="handleZoom(0.1)">
                  <el-icon><ZoomIn /></el-icon>
                </button>
                <button class="ctrl-btn" title="缩小" @click="handleZoom(-0.1)">
                  <el-icon><ZoomOut /></el-icon>
                </button>
                <button class="ctrl-btn" :title="muted ? '开启声音' : '静音'" @click="toggleMute">
                  <el-icon><component :is="muted ? Mute : Microphone" /></el-icon>
                </button>
                <button class="ctrl-btn" @click="toggleStream">
                  {{ streamMode === 'main' ? '主码流' : '子码流' }}
                </button>
              </template>
              <template v-else>
                <button class="ctrl-btn ctrl-btn-text" title="返回实时" @click="exitPlayback">
                  <el-icon><VideoPause /></el-icon>
                  返回实时
                </button>
                <button class="ctrl-btn" :title="muted ? '开启声音' : '静音'" @click="toggleMute">
                  <el-icon><component :is="muted ? Mute : Microphone" /></el-icon>
                </button>
              </template>

              <button class="ctrl-btn ctrl-btn-text" title="问题截图" @click="snapshot">
                <el-icon><Camera /></el-icon>
                问题截图
              </button>

              <button
                v-if="!isPlayback"
                class="ctrl-btn ctrl-btn-text playback-entry"
                title="录像回放"
                @click="enterPlayback"
              >
                <el-icon><VideoPlay /></el-icon>
                回放
              </button>
            </div>

            <div v-if="isPtz && !isPlayback" class="ptz-pad">
              <span class="ptz-label">云台</span>
              <div class="ptz-grid">
                <button class="ptz-btn" @click="ptzMove('上')">上</button>
                <button class="ptz-btn" @click="ptzMove('左')">左</button>
                <button class="ptz-btn center">●</button>
                <button class="ptz-btn" @click="ptzMove('右')">右</button>
                <button class="ptz-btn" @click="ptzMove('下')">下</button>
              </div>
            </div>
          </div>
        </div>

        <aside v-if="isPlayback" class="playback-sidebar">
          <div class="sidebar-head">调度会议录像</div>
          <div class="month-filter">
            <span class="filter-label">筛选月份</span>
            <el-date-picker
              v-model="meetingMonth"
              type="month"
              value-format="YYYY-MM"
              placeholder="选择月份"
              size="small"
              :clearable="false"
              class="month-picker"
            />
          </div>
          <div class="timeline-head">会议时间轴（近→远）</div>
          <div v-if="monthMeetingNodes.length" class="v-timeline">
            <button
              v-for="node in monthMeetingNodes"
              :key="node.id"
              type="button"
              class="timeline-node"
              :class="{ active: isMeetingActive(node) }"
              @click="selectMeetingNode(node)"
            >
              <span class="node-line" />
              <span class="node-dot" />
              <span class="node-content">
                <span class="node-time">{{ node.startTime.slice(0, 16) }}</span>
                <span class="node-title">{{ node.title }}</span>
                <span class="node-meta">{{ node.host }} · {{ node.duration }}</span>
              </span>
            </button>
          </div>
          <div v-else class="timeline-empty">所选月份暂无调度会议录像</div>
        </aside>
      </div>

      <ScreenshotMarkDialog
        v-model:visible="markDialogVisible"
        :camera="source"
        :project="project"
        :source-type="isPlayback ? 'playback' : 'live'"
        @submit="handleIssueSubmit"
      />
    </div>
  </Teleport>
</template>

<style scoped>
.video-expand-overlay {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  background: #1a1a1a;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-sizing: border-box;
}

.video-expand-overlay.is-contained {
  z-index: 20;
  border-radius: inherit;
}

.video-expand-overlay.is-contained .expand-header {
  padding: 8px 12px;
}

.video-expand-overlay.is-contained .expand-title {
  font-size: 13px;
  gap: 8px;
}

.video-expand-overlay.is-contained .close-btn {
  padding: 6px 12px;
  font-size: 11px;
}

.video-expand-overlay.is-contained .video-canvas :deep(.el-icon) {
  font-size: 28px !important;
}

.video-expand-overlay.is-contained .playback-scrubber {
  bottom: 56px;
  padding: 8px 12px 6px;
}

.video-expand-overlay.is-contained .scrub-grid {
  grid-template-columns: 130px minmax(0, 1fr);
  column-gap: 12px;
}

.video-expand-overlay.is-contained .control-bar {
  padding: 8px 12px;
  gap: 12px;
}

.video-expand-overlay.is-contained .ctrl-btn {
  min-width: 32px;
  height: 32px;
  padding: 0 8px;
  font-size: 10px;
}

.video-expand-overlay.is-contained .ctrl-btn-text {
  padding: 0 10px;
}

.video-expand-overlay.is-contained .ptz-grid {
  grid-template-columns: repeat(3, 28px);
  grid-template-rows: repeat(3, 28px);
}

.video-expand-overlay.is-contained .playback-sidebar {
  width: 220px;
  padding: 10px 8px;
}

.expand-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  background: rgba(0, 0, 0, 0.85);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  flex-shrink: 0;
}

.expand-title {
  display: flex;
  align-items: center;
  gap: 14px;
  color: #fff;
  font-size: 16px;
  font-weight: 700;
}

.key-badge {
  font-size: 11px;
  background: var(--coc-accent);
  padding: 4px 10px;
  border-radius: 4px;
}

.mode-badge.playback {
  font-size: 11px;
  padding: 4px 12px;
  border-radius: 6px;
  font-weight: 600;
  color: #409eff;
  background: rgba(64, 158, 255, 0.18);
}

.online-tag {
  font-size: 11px;
  padding: 4px 12px;
  border-radius: 6px;
  font-weight: 600;
}

.online-tag.online {
  color: #67c23a;
  background: rgba(103, 194, 58, 0.15);
}

.online-tag.offline {
  color: #f56c6c;
  background: rgba(245, 108, 108, 0.15);
}

.close-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  border: 1px solid rgba(255, 255, 255, 0.25);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
  font-size: 12px;
  cursor: pointer;
}

.close-btn:hover {
  background: rgba(201, 123, 99, 0.35);
  border-color: var(--coc-accent);
}

.expand-body {
  flex: 1;
  min-height: 0;
  display: flex;
  padding: 0;
}

.expand-body.has-playback-sidebar {
  gap: 0;
}

.video-stage {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  min-width: 0;
  position: relative;
}

.video-viewport {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  background: #000;
  display: flex;
  align-items: stretch;
  justify-content: stretch;
}

.video-canvas {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  transition: transform 0.2s, background 0.35s;
}

.offline-hint {
  color: rgba(255, 255, 255, 0.7);
  font-size: 17px;
}

.playback-time-badge {
  position: absolute;
  top: 16px;
  left: 16px;
  padding: 6px 12px;
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.55);
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.playback-scrubber {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 78px;
  padding: 12px 20px 10px;
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.82));
  z-index: 2;
}

.scrub-grid {
  display: grid;
  grid-template-columns: 158px minmax(0, 1fr);
  column-gap: 18px;
  align-items: center;
}

.scrub-date-wrap {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.scrub-date-label {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.55);
  white-space: nowrap;
}

.scrub-date-picker {
  width: 100%;
}

.scrub-date-wrap :deep(.el-date-editor) {
  width: 100%;
}

.scrub-date-wrap :deep(.el-input__wrapper) {
  box-sizing: border-box;
}

.scrub-track-wrap {
  min-width: 0;
}

.rec-badge {
  position: absolute;
  bottom: 16px;
  left: 16px;
  background: #f56c6c;
  color: #fff;
  padding: 4px 12px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 700;
  animation: blink 1.2s infinite;
}

@keyframes blink {
  50% { opacity: 0.5; }
}

.scrub-head-inline {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 2px;
}

.scrub-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
}

.scrub-label,
.scrub-current {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.85);
}

.scrub-current {
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.hour-scale {
  margin-top: 2px;
  padding: 0 10px;
}

.hour-marks {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  height: 8px;
  margin-bottom: 2px;
}

.hour-mark {
  width: 1px;
  height: 6px;
  background: rgba(255, 255, 255, 0.35);
  flex-shrink: 0;
}

.hour-labels {
  display: flex;
  justify-content: space-between;
}

.hour-label {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.5);
  font-variant-numeric: tabular-nums;
  flex-shrink: 0;
  transform: translateX(-50%);
}

.hour-labels .hour-label:first-child {
  transform: none;
}

.hour-labels .hour-label:last-child {
  transform: translateX(-100%);
}

.playback-scrubber :deep(.el-slider) {
  padding: 0 10px;
}

.playback-scrubber :deep(.el-slider__runway) {
  background: rgba(255, 255, 255, 0.15);
}

.playback-scrubber :deep(.el-slider__bar) {
  background: var(--coc-accent);
}

.playback-scrubber :deep(.el-slider__button) {
  border-color: var(--coc-accent);
}

.control-bar {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding: 14px 20px;
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.82));
  z-index: 3;
}

.control-group {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.ctrl-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 44px;
  height: 44px;
  padding: 0 14px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
  font-size: 11px;
  cursor: pointer;
}

.ctrl-btn:hover,
.ctrl-btn.active {
  background: var(--coc-accent);
  border-color: var(--coc-accent);
}

.ctrl-btn:disabled {
  cursor: default;
  opacity: 0.85;
}

.ctrl-btn-text {
  gap: 6px;
  padding: 0 16px;
}

.playback-entry {
  border-color: rgba(64, 158, 255, 0.45);
}

.playback-entry:hover {
  background: rgba(64, 158, 255, 0.85);
  border-color: rgba(64, 158, 255, 0.85);
}

.ctrl-btn-icon {
  min-width: 44px;
  padding: 0;
}

.stop-record-btn {
  width: 30px;
  min-width: 30px;
  height: 30px;
  padding: 0;
  border-radius: 50%;
  border-color: rgba(245, 108, 108, 0.65);
  background: rgba(245, 108, 108, 0.25);
}

.stop-record-btn:hover {
  background: #f56c6c;
  border-color: #f56c6c;
}

.stop-icon {
  display: block;
  width: 9px;
  height: 9px;
  background: #fff;
  border-radius: 1px;
}

.record-time {
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  min-width: 48px;
  letter-spacing: 0.5px;
}

.ptz-pad {
  display: flex;
  align-items: center;
  gap: 12px;
}

.ptz-label {
  color: rgba(255, 255, 255, 0.7);
  font-size: 11px;
}

.ptz-grid {
  display: grid;
  grid-template-columns: repeat(3, 36px);
  grid-template-rows: repeat(3, 36px);
  gap: 4px;
}

.ptz-btn {
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
  font-size: 10px;
  cursor: pointer;
}

.ptz-btn:nth-child(1) { grid-column: 2; grid-row: 1; }
.ptz-btn:nth-child(2) { grid-column: 1; grid-row: 2; }
.ptz-btn:nth-child(3) { grid-column: 2; grid-row: 2; }
.ptz-btn:nth-child(4) { grid-column: 3; grid-row: 2; }
.ptz-btn:nth-child(5) { grid-column: 2; grid-row: 3; }

.ptz-btn.center {
  cursor: default;
  opacity: 0.4;
}

.ptz-btn:not(.center):hover {
  background: var(--coc-accent);
}

.playback-sidebar {
  width: 300px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  min-height: 0;
  background: rgba(0, 0, 0, 0.88);
  border-left: 1px solid rgba(255, 255, 255, 0.1);
  padding: 16px 14px;
}

.sidebar-head {
  font-size: 15px;
  font-weight: 700;
  color: #fff;
  margin-bottom: 14px;
}

.month-filter {
  margin-bottom: 14px;
}

.filter-label {
  display: block;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.55);
  margin-bottom: 6px;
}

.month-picker {
  width: 100%;
}

.timeline-head {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.65);
  margin-bottom: 10px;
}

.v-timeline {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0;
  padding-left: 8px;
}

.timeline-node {
  display: flex;
  align-items: stretch;
  gap: 10px;
  position: relative;
  border: none;
  background: transparent;
  text-align: left;
  cursor: pointer;
  padding: 10px 8px 10px 0;
  color: inherit;
}

.timeline-node:hover .node-content {
  background: rgba(255, 255, 255, 0.06);
}

.timeline-node.active .node-dot {
  background: var(--coc-accent);
  box-shadow: 0 0 0 4px rgba(201, 123, 99, 0.25);
}

.timeline-node.active .node-content {
  border-color: rgba(201, 123, 99, 0.55);
  background: rgba(201, 123, 99, 0.12);
}

.node-line {
  position: absolute;
  left: 11px;
  top: 22px;
  bottom: -10px;
  width: 2px;
  background: rgba(255, 255, 255, 0.12);
}

.timeline-node:last-child .node-line {
  display: none;
}

.node-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.35);
  flex-shrink: 0;
  margin-top: 4px;
  z-index: 1;
  transition: background 0.2s, box-shadow 0.2s;
}

.node-content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition: background 0.2s, border-color 0.2s;
}

.node-time {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.55);
  font-variant-numeric: tabular-nums;
}

.node-title {
  font-size: 13px;
  font-weight: 600;
  color: #fff;
  line-height: 1.35;
}

.node-meta {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.45);
}

.timeline-empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.45);
  text-align: center;
  padding: 16px;
}
</style>
