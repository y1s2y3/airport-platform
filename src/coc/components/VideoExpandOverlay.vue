<script setup>
import { ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import {
  VideoCamera,
  Close,
  ZoomIn,
  ZoomOut,
  Camera,
  VideoPlay,
  VideoPause,
} from '@element-plus/icons-vue'
import ScreenshotMarkDialog from './ScreenshotMarkDialog.vue'
import SpeakerVolumeIcon from './SpeakerVolumeIcon.vue'
import {
  videoPlaceholderColor,
  videoPlaceholderClass,
  formatMinutesToClock,
  resolveCameraVendor,
} from '../mock/data.js'

const SCRUB_MIN = 360
const SCRUB_MAX = 1320
const DEFAULT_PLAYBACK_DATE = '2026-06-16'

const props = defineProps({
  source: { type: Object, default: null },
  project: { type: Object, default: null },
  /** 面板内放大：不 Teleport 全屏，仅覆盖父级定位容器（关联视频监控） */
  contained: { type: Boolean, default: false },
})

const emit = defineEmits(['close', 'issue-submit'])

const viewMode = ref('live')
const zoomLevel = ref(1)
const muted = ref(true)
const streamMode = ref('main')
const markDialogVisible = ref(false)
const playbackDate = ref(DEFAULT_PLAYBACK_DATE)
const playbackMinutes = ref(570)

const deviceName = computed(() => props.source?.name || '')
const vendorLabel = computed(() => {
  const type = props.source?.type
  if (!props.source || type === 'handheld' || type === 'app' || type === 'web') return ''
  return resolveCameraVendor(props.source)
})
const isOnline = computed(() => props.source?.online !== false)
const isPtz = computed(() => props.source?.type === 'ptz')
const isKey = computed(() => !!props.source?.key)
const isPlayback = computed(() => viewMode.value === 'playback')
const canOperateVideo = computed(() => isOnline.value || isPlayback.value)

const playbackClock = computed(() => formatMinutesToClock(playbackMinutes.value))

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

const expandPalette = computed(() => props.source?.palette || 'warm')
const expandDeviceType = computed(() => props.source?.type)

const bgStyle = computed(() => {
  const palette = expandPalette.value
  const online = canOperateVideo.value
  const colorIndex = isPlayback.value ? Math.floor(playbackMinutes.value / 15) : 0
  return {
    background: videoPlaceholderColor(online, colorIndex, palette, expandDeviceType.value),
    transform: `scale(${zoomLevel.value})`,
  }
})

const canvasClass = computed(() =>
  videoPlaceholderClass(canOperateVideo.value, expandPalette.value, expandDeviceType.value),
)

const showFeedIcon = computed(() =>
  canOperateVideo.value && expandDeviceType.value !== 'handheld' && !canvasClass.value.includes('is-video-monitor'),
)

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

function enterPlayback() {
  if (!canOperateVideo.value && !isOnline.value) {
    ElMessage.warning('该摄像头离线，暂无录像可回放')
    return
  }
  viewMode.value = 'playback'
  playbackMinutes.value = 540
  ElMessage.info('已进入录像回放')
}

function exitPlayback() {
  viewMode.value = 'live'
}

function onScrubberInput(value) {
  playbackMinutes.value = value
}

function formatScrubTooltip(value) {
  return formatMinutesToClock(value)
}

watch(
  () => props.source,
  () => {
    viewMode.value = 'live'
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
          <span
            v-if="vendorLabel"
            class="vendor-badge"
            :class="vendorLabel === '海康' ? 'vendor-hikvision' : 'vendor-ezviz'"
          >
            {{ vendorLabel }}
          </span>
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

      <div class="expand-body">
        <div class="video-stage">
          <div class="video-viewport">
            <div class="video-canvas" :class="canvasClass" :style="bgStyle">
              <el-icon v-if="showFeedIcon" :size="45" color="rgba(255,255,255,0.45)">
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
                  <el-icon><SpeakerVolumeIcon :muted="muted" /></el-icon>
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
                  <el-icon><SpeakerVolumeIcon :muted="muted" /></el-icon>
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
  font-size: calc(13px + var(--coc-font-boost));
  gap: 8px;
}

.video-expand-overlay.is-contained .close-btn {
  padding: 6px 12px;
  font-size: calc(11px + var(--coc-font-boost));
}

.video-expand-overlay.is-contained .video-canvas :deep(.el-icon) {
  font-size: calc(28px + var(--coc-font-boost)) !important;
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
  font-size: calc(10px + var(--coc-font-boost));
}

.video-expand-overlay.is-contained .ctrl-btn-text {
  padding: 0 10px;
}

.video-expand-overlay.is-contained .ptz-grid {
  grid-template-columns: repeat(3, 28px);
  grid-template-rows: repeat(3, 28px);
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
  font-size: calc(16px + var(--coc-font-boost));
  font-weight: 700;
}

.key-badge {
  font-size: calc(11px + var(--coc-font-boost));
  background: var(--coc-accent);
  padding: 4px 10px;
  border-radius: 4px;
}

.vendor-badge {
  font-size: calc(11px + var(--coc-font-boost));
  padding: 4px 10px;
  border-radius: 4px;
  font-weight: 600;
  line-height: 1.2;
  flex-shrink: 0;
}

.vendor-badge.vendor-hikvision {
  color: #a7cfe9;
  background: rgba(0, 53, 108, 0.55);
  border: 1px solid rgba(64, 158, 255, 0.45);
}

.vendor-badge.vendor-ezviz {
  color: #5eeeff;
  background: rgba(64, 158, 255, 0.18);
  border: 1px solid rgba(94, 238, 255, 0.45);
}

.video-expand-overlay.is-contained .vendor-badge {
  font-size: calc(10px + var(--coc-font-boost));
  padding: 2px 8px;
}

.mode-badge.playback {
  font-size: calc(11px + var(--coc-font-boost));
  padding: 4px 12px;
  border-radius: 6px;
  font-weight: 600;
  color: #409eff;
  background: rgba(64, 158, 255, 0.18);
}

.online-tag {
  font-size: calc(11px + var(--coc-font-boost));
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
  font-size: calc(12px + var(--coc-font-boost));
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
  font-size: calc(17px + var(--coc-font-boost));
}

.playback-time-badge {
  position: absolute;
  top: 16px;
  left: 16px;
  padding: 6px 12px;
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.55);
  color: #fff;
  font-size: calc(13px + var(--coc-font-boost));
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
  font-size: calc(11px + var(--coc-font-boost));
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
  font-size: calc(11px + var(--coc-font-boost));
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
  font-size: calc(12px + var(--coc-font-boost));
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
  font-size: calc(10px + var(--coc-font-boost));
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
  font-size: calc(11px + var(--coc-font-boost));
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
  font-size: calc(13px + var(--coc-font-boost));
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
  font-size: calc(11px + var(--coc-font-boost));
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
  font-size: calc(10px + var(--coc-font-boost));
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
</style>
