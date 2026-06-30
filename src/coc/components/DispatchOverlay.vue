<script setup>
import { ref, watch, onUnmounted } from 'vue'
import {
  Close, Microphone, Document, Warning, VideoCamera,
} from '@element-plus/icons-vue'

const props = defineProps({
  visible: { type: Boolean, default: false },
  project: { type: Object, required: true },
  attendees: { type: Array, default: () => [] },
  transcriptionLines: { type: Array, required: true },
})

const emit = defineEmits(['close', 'generate-minutes', 'open-notice'])

const displayedText = ref('')
const currentLineIndex = ref(0)
const isTranscribing = ref(false)
const minutesReady = ref(false)
const minutesGenerating = ref(false)
const minutesContent = ref(null)
let timer = null

watch(() => props.visible, (val) => {
  if (val) {
    resetState()
    startTranscription()
  } else {
    stopTranscription()
  }
})

function resetState() {
  displayedText.value = ''
  currentLineIndex.value = 0
  isTranscribing.value = false
  minutesReady.value = false
  minutesGenerating.value = false
  minutesContent.value = null
}

function startTranscription() {
  isTranscribing.value = true
  typeNextLine()
}

function typeNextLine() {
  if (currentLineIndex.value >= props.transcriptionLines.length) {
    isTranscribing.value = false
    return
  }
  const line = props.transcriptionLines[currentLineIndex.value]
  let charIndex = 0
  const prefix = currentLineIndex.value > 0 ? '\n' : ''
  displayedText.value += prefix

  timer = setInterval(() => {
    if (charIndex < line.length) {
      displayedText.value += line[charIndex]
      charIndex++
    } else {
      clearInterval(timer)
      currentLineIndex.value++
      setTimeout(typeNextLine, 600)
    }
  }, 45)
}

function stopTranscription() {
  if (timer) clearInterval(timer)
}

async function handleGenerateMinutes() {
  minutesGenerating.value = true
  await new Promise((r) => setTimeout(r, 2200))
  minutesGenerating.value = false
  minutesReady.value = true
  minutesContent.value = {
    title: 'COC每日调度会议纪要',
    date: '2026年6月12日',
    attendees: props.attendees.map((a) => `${a.name}（${a.role}）`),
  }
  emit('generate-minutes')
}

onUnmounted(stopTranscription)
</script>

<template>
  <Teleport to="body">
    <Transition name="dispatch-fade">
      <div v-if="visible" class="dispatch-overlay">
        <div class="dispatch-header">
          <div class="dispatch-title">
            <el-icon :size="19" color="#c97b63"><Microphone /></el-icon>
            <div>
              <h2>远程调度 · {{ project.shortName || project.name }}</h2>
              <p>参会 {{ attendees.length }} 人 · 调度进行中</p>
            </div>
          </div>
          <div class="dispatch-actions">
            <el-button
              type="primary"
              size="large"
              :loading="minutesGenerating"
              :disabled="isTranscribing"
              @click="handleGenerateMinutes"
            >
              <el-icon><Document /></el-icon>
              生成会议纪要
            </el-button>
            <el-button
              type="warning"
              size="large"
              :disabled="!minutesReady"
              @click="emit('open-notice')"
            >
              <el-icon><Warning /></el-icon>
              开具告知单
            </el-button>
            <el-button size="large" @click="emit('close')">
              <el-icon><Close /></el-icon>
              结束调度 (ESC)
            </el-button>
          </div>
        </div>

        <div class="dispatch-body">
          <div class="main-video">
            <div class="video-placeholder">
              <el-icon :size="32" color="rgba(255,255,255,0.5)"><VideoCamera /></el-icon>
              <span>3号塔-球机-1 · 主画面</span>
            </div>
            <div class="sub-videos">
              <div v-for="n in 4" :key="n" class="sub-cell">
                <el-icon :size="16" color="rgba(255,255,255,0.4)"><VideoCamera /></el-icon>
              </div>
            </div>
          </div>

          <div class="side-panel">
            <div class="transcription-box">
              <div class="box-title">
                AI 实时转写
                <span v-if="isTranscribing" class="live-dot">识别中</span>
              </div>
              <div class="transcription-text">{{ displayedText }}<span v-if="isTranscribing" class="cursor">|</span></div>
            </div>

            <div v-if="minutesReady" class="minutes-box">
              <div class="box-title">会议纪要（已生成）</div>
              <div class="minutes-preview">
                <p><b>{{ minutesContent.title }}</b></p>
                <p>日期：{{ minutesContent.date }}</p>
                <p>参会人：{{ minutesContent.attendees.join('、') || '—' }}</p>
                <p class="fade-in">讨论要点：3号塔吊作业区警戒标识整改；今日危险作业旁站监督。</p>
              </div>
            </div>

            <div class="attendee-box">
              <div class="box-title">参会人员</div>
              <div v-for="a in attendees" :key="a.id" class="attendee-chip">
                {{ a.name }} · {{ a.role }}
              </div>
              <div v-if="!attendees.length" class="no-data">暂未登记参会人</div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.dispatch-overlay {
  position: fixed;
  inset: 0;
  z-index: 10000;
  background: #f5f7fa;
  display: flex;
  flex-direction: column;
}

.dispatch-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24px 48px;
  background: #fff;
  border-bottom: 2px solid #e4e7ed;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
}

.dispatch-title {
  display: flex;
  align-items: center;
  gap: 20px;
}

.dispatch-title h2 {
  font-size: 17px;
  color: #303133;
}

.dispatch-title p {
  font-size: 13px;
  color: #909399;
  margin-top: 4px;
}

.dispatch-actions {
  display: flex;
  gap: 16px;
}

.dispatch-actions .el-button {
  font-size: 13px;
  padding: 14px 28px;
  height: auto;
}

.dispatch-body {
  flex: 1;
  display: flex;
  gap: 24px;
  padding: 24px 48px;
  min-height: 0;
}

.main-video {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
}

.video-placeholder {
  flex: 1;
  background: linear-gradient(135deg, #d4a574 0%, #c97b63 50%, #a85d48 100%);
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  color: rgba(255, 255, 255, 0.85);
  font-size: 15px;
}

.sub-videos {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  height: 160px;
}

.sub-cell {
  background: linear-gradient(135deg, #e8d5c4, #d4b896);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.side-panel {
  width: 520px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
  overflow-y: auto;
}

.transcription-box,
.minutes-box,
.attendee-box {
  background: #fff;
  border-radius: 12px;
  border: 1px solid #e4e7ed;
  padding: 20px;
}

.box-title {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.live-dot {
  font-size: 11px;
  color: #c97b63;
  font-weight: 400;
}

.live-dot::before {
  content: '';
  display: inline-block;
  width: 10px;
  height: 10px;
  background: #c97b63;
  border-radius: 50%;
  margin-right: 6px;
  animation: pulse 1s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}

.transcription-text {
  font-size: 13px;
  line-height: 1.7;
  color: #606266;
  min-height: 200px;
  max-height: 320px;
  overflow-y: auto;
  white-space: pre-wrap;
}

.cursor {
  animation: blink 0.8s infinite;
  color: #c97b63;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

.minutes-preview {
  font-size: 13px;
  line-height: 1.8;
  color: #606266;
}

.fade-in {
  animation: fadeIn 0.8s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

.attendee-chip {
  display: inline-block;
  background: rgba(201, 123, 99, 0.1);
  color: #c97b63;
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 12px;
  margin: 4px;
}

.no-data {
  color: #c0c4cc;
  font-size: 13px;
}

.dispatch-fade-enter-active,
.dispatch-fade-leave-active {
  transition: opacity 0.3s;
}

.dispatch-fade-enter-from,
.dispatch-fade-leave-to {
  opacity: 0;
}
</style>
