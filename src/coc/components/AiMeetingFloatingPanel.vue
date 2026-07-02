<script setup>
import { computed } from 'vue'
import { VideoCamera } from '@element-plus/icons-vue'
import { useCommandMeetingControl } from '../composables/useCommandMeetingControl.js'
import { cocFeatureFlags } from '../config/featureFlags.js'

defineProps({
  embedded: { type: Boolean, default: false },
})

const {
  panelExpanded,
  meetingActive,
  transcriptLines,
  phase,
  statusText,
  isSpeechActive,
  screenRecording,
  recordingUrl,
  recordingLocalPath,
  recordingDurationText,
  togglePanel,
  startMeeting,
  endMeeting,
  stopRecording,
  showRecords,
} = useCommandMeetingControl()

const statusBarClass = computed(() => {
  if (phase.value === 'ended') return 'done'
  if (screenRecording.value || isSpeechActive.value) return 'active'
  return 'idle'
})

const recordBarText = computed(() => {
  if (screenRecording.value) return '会议录制中…'
  if (recordingUrl.value) return `录屏已完成 · ${recordingDurationText.value || ''}`
  if (meetingActive.value) return '录屏未启动'
  return '开始会议后自动录制浏览器页面'
})
</script>

<template>
  <div class="ai-meeting-float" :class="{ embedded }">
    <Transition name="meeting-float" mode="out-in">
      <button
        v-if="!panelExpanded"
        key="fab"
        type="button"
        class="ai-fab-btn"
        :class="{ recording: meetingActive || screenRecording }"
        title="会议管控"
        @click="togglePanel()"
      >
        <el-icon :size="20"><VideoCamera /></el-icon>
        <span class="fab-label">会议管控</span>
        <span v-if="meetingActive || screenRecording" class="fab-dot" />
      </button>

      <div v-else key="panel" class="panel-card meeting-panel">
        <div class="panel-title compact title-row">
          <span>会议管控</span>
          <button type="button" class="collapse-btn" title="收起" @click="togglePanel()">
            收起
          </button>
        </div>

        <div class="panel-body meeting-body">
          <div class="meeting-actions">
            <el-button
              type="primary"
              class="action-btn primary-btn"
              :disabled="meetingActive"
              @click="startMeeting()"
            >
              开始会议
            </el-button>
            <el-button
              type="danger"
              plain
              class="action-btn end-btn"
              :disabled="!meetingActive"
              @click="endMeeting()"
            >
              结束会议
            </el-button>
            <el-button
              v-if="cocFeatureFlags.meetingRecordsEntry"
              class="action-btn secondary-btn"
              @click="showRecords()"
            >
              会议记录
            </el-button>
          </div>

          <div class="screen-record-wrap">
            <div class="screen-record-bar" :class="{ active: screenRecording, done: recordingUrl && !screenRecording }">
              <span class="record-dot" />
              <span class="record-text">{{ recordBarText }}</span>
              <button
                v-if="screenRecording"
                type="button"
                class="stop-record-link"
                @click="stopRecording()"
              >
                停止录制
              </button>
            </div>
            <p v-if="recordingLocalPath" class="record-local-path">
              录屏无法保存至云端，已保存至本地：{{ recordingLocalPath }}
            </p>
          </div>

          <div v-if="cocFeatureFlags.meetingAiUi" class="ai-status-bar" :class="statusBarClass">
            <span v-if="screenRecording || isSpeechActive" class="pulse-dot" />
            <span class="status-text">{{ statusText }}</span>
          </div>

          <div v-if="cocFeatureFlags.meetingAiUi" class="dialogue-block">
            <div class="block-label">对话明细</div>
            <div class="dialogue-scroll">
              <div v-if="!transcriptLines.length" class="dialogue-empty">
                开始会议后将自动记录语音转写内容
              </div>
              <div
                v-for="(msg, idx) in transcriptLines"
                :key="`${msg.time}-${idx}`"
                class="dialogue-item"
                :class="msg.role"
              >
                <span class="dlg-time">{{ msg.time }}</span>
                <span class="dlg-speaker">{{ msg.speaker }}</span>
                <span class="dlg-content">{{ msg.content }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.ai-meeting-float {
  position: fixed;
  right: 16px;
  bottom: 24px;
  z-index: 100000;
  pointer-events: none;
}

.ai-meeting-float.embedded {
  position: static;
  right: auto;
  bottom: auto;
  z-index: auto;
  pointer-events: auto;
}

.ai-meeting-float > * {
  pointer-events: auto;
}

.meeting-float-enter-active,
.meeting-float-leave-active {
  transition:
    opacity 0.32s ease,
    transform 0.32s cubic-bezier(0.4, 0, 0.2, 1);
}

.meeting-float-enter-from {
  opacity: 0;
  transform: translateY(10px) scale(0.94);
}

.meeting-float-leave-to {
  opacity: 0;
  transform: translateY(16px) scale(0.9);
}

.meeting-float-enter-to,
.meeting-float-leave-from {
  opacity: 1;
  transform: translateY(0) scale(1);
}

.ai-fab-btn {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  width: 52px;
  height: 52px;
  padding: 0;
  border: 1px solid rgba(201, 123, 99, 0.35);
  border-radius: 12px;
  background: linear-gradient(180deg, #fff, #faf6f3);
  color: var(--coc-accent);
  cursor: pointer;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
}

.ai-fab-btn:hover {
  border-color: var(--coc-accent);
  box-shadow: 0 6px 20px rgba(201, 123, 99, 0.18);
}

.ai-fab-btn.recording {
  border-color: rgba(245, 108, 108, 0.45);
  color: #f56c6c;
}

.fab-label {
  font-size: calc(9px + var(--coc-font-boost));
  font-weight: 700;
  line-height: 1;
  transform: scale(0.92);
}

.fab-dot {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #f56c6c;
  animation: pulse 1.2s infinite;
}

.meeting-panel {
  width: 320px;
  height: calc((100vh - 120px) / 2);
  max-height: 380px;
  min-height: 260px;
  display: flex;
  flex-direction: column;
  box-shadow: 0 8px 28px rgba(0, 0, 0, 0.14);
}

.title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: calc(13px + var(--coc-font-boost));
  padding: 6px 12px;
  line-height: 1.2;
  flex-shrink: 0;
}

.collapse-btn {
  border: none;
  background: transparent;
  font-size: calc(11px + var(--coc-font-boost));
  font-weight: 600;
  color: var(--coc-text-secondary);
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 4px;
}

.collapse-btn:hover {
  color: var(--coc-accent);
  background: rgba(201, 123, 99, 0.08);
}

.meeting-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 0;
  flex: 1;
  padding: 8px 12px 12px !important;
}

.meeting-actions {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}

.action-btn {
  flex: 1;
  height: 30px !important;
  padding: 0 4px !important;
  font-size: calc(11px + var(--coc-font-boost)) !important;
  font-weight: 600;
}

.primary-btn {
  border: none !important;
  background: linear-gradient(135deg, var(--coc-accent), var(--coc-gold)) !important;
}

.secondary-btn {
  color: var(--coc-accent) !important;
  border-color: rgba(201, 123, 99, 0.45) !important;
}

.screen-record-wrap {
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex-shrink: 0;
}

.screen-record-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  padding: 8px 10px;
  border-radius: 8px;
  font-size: calc(11px + var(--coc-font-boost));
  font-weight: 600;
  color: var(--coc-text-secondary);
  background: #faf8f6;
  border: 1px solid var(--coc-border);
}

.screen-record-bar.active {
  color: #f56c6c;
  background: rgba(245, 108, 108, 0.08);
  border-color: rgba(245, 108, 108, 0.3);
}

.screen-record-bar.done {
  color: #67c23a;
  background: rgba(103, 194, 58, 0.08);
  border-color: rgba(103, 194, 58, 0.25);
}

.record-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #dcdfe6;
  flex-shrink: 0;
}

.screen-record-bar.active .record-dot {
  background: #f56c6c;
  animation: pulse 1.2s infinite;
}

.screen-record-bar.done .record-dot {
  background: #67c23a;
}

.record-text {
  flex: 1;
  min-width: 0;
}

.stop-record-link {
  flex-shrink: 0;
  border: 1px solid rgba(245, 108, 108, 0.45);
  background: #fff;
  color: #f56c6c;
  font-size: calc(10px + var(--coc-font-boost));
  font-weight: 600;
  cursor: pointer;
  padding: 2px 8px;
  border-radius: 4px;
  line-height: 1.4;
}

.stop-record-link:hover {
  background: #fef0f0;
  border-color: #f56c6c;
}

.record-local-path {
  margin: 0;
  padding: 0 2px;
  font-size: calc(10px + var(--coc-font-boost));
  line-height: 1.45;
  color: var(--coc-text-secondary);
  word-break: break-all;
}

.ai-status-bar {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 10px;
  border-radius: 8px;
  font-size: calc(11px + var(--coc-font-boost));
  font-weight: 600;
  background: #faf8f6;
  color: var(--coc-text-secondary);
  border: 1px solid var(--coc-border);
}

.ai-status-bar.active {
  background: linear-gradient(90deg, rgba(64, 158, 255, 0.18), rgba(64, 158, 255, 0.06));
  color: #409eff;
  border-color: rgba(64, 158, 255, 0.35);
}

.ai-status-bar.done {
  background: rgba(103, 194, 58, 0.1);
  color: #67c23a;
  border-color: rgba(103, 194, 58, 0.3);
}

.status-text {
  flex: 1;
  min-width: 0;
  line-height: 1.4;
}

.pulse-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #409eff;
  flex-shrink: 0;
  animation: pulse 1.2s infinite;
}

@keyframes pulse {
  50% {
    opacity: 0.35;
    transform: scale(0.85);
  }
}

.block-label {
  font-size: calc(11px + var(--coc-font-boost));
  font-weight: 600;
  color: var(--coc-text-secondary);
  margin-bottom: 4px;
  flex-shrink: 0;
}

.dialogue-block {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.dialogue-scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.dialogue-empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: calc(11px + var(--coc-font-boost));
  color: var(--coc-text-muted);
  text-align: center;
  padding: 12px;
}

.dialogue-item {
  display: grid;
  grid-template-columns: 44px 72px 1fr;
  gap: 6px;
  padding: 6px 8px;
  border-radius: 6px;
  font-size: calc(11px + var(--coc-font-boost));
  background: #faf8f6;
  border: 1px solid var(--coc-border);
}

.dialogue-item.ai,
.dialogue-item.speech {
  background: rgba(64, 158, 255, 0.06);
  border-color: rgba(64, 158, 255, 0.25);
}

.dlg-time {
  color: var(--coc-text-muted);
}

.dlg-speaker {
  font-weight: 700;
  color: var(--coc-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dlg-content {
  color: var(--coc-text-secondary);
  line-height: 1.45;
}
</style>
