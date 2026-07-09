import { ref, computed, watch } from 'vue'
import { useAliyunSpeechRecognizer } from './useAliyunSpeechRecognizer.js'
import { isAliyunNlsConfigured } from '../utils/aliyunNlsConfig.js'
import { useMeetingScreenRecorder } from './useMeetingScreenRecorder.js'
import { MOCK_TRANSCRIPTION_LINES } from '../mock/data.js'

const panelExpanded = ref(false)
const signInPanelExpanded = ref(false)
const meetingActive = ref(false)
const transcriptLines = ref([])
const phase = ref('idle')
const interimText = ref('')
const meetingStartedAt = ref('')
const meetingDurationText = ref('')

let demoTimer = null
let demoIndex = 0
let autoCollapsePending = false

const screenRecorder = useMeetingScreenRecorder()

function formatTimeNow() {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function formatDateTimeNow() {
  return new Date().toLocaleString('zh-CN', { hour12: false })
}

function computeDuration(startStr) {
  if (!startStr) return '—'
  const start = new Date(startStr.replace(/-/g, '/'))
  const ms = Math.max(0, Date.now() - start.getTime())
  const min = Math.floor(ms / 60000)
  const sec = Math.floor((ms % 60000) / 1000)
  return `${min}分${String(sec).padStart(2, '0')}秒`
}

function buildMinutesFromTranscript(lines) {
  const speeches = lines.filter((l) => l.role === 'speech')
  if (!speeches.length) return '本次会议暂无语音转写记录。'
  return speeches.map((l, i) => `${i + 1}. [${l.time}] ${l.content}`).join('\n')
}

function pushLine(speaker, content, role = 'speech') {
  transcriptLines.value.push({
    time: formatTimeNow(),
    speaker,
    role,
    content,
  })
}

function clearDemoTimer() {
  if (demoTimer) {
    clearInterval(demoTimer)
    demoTimer = null
  }
}

function startDemoFeed() {
  clearDemoTimer()
  demoIndex = 0
  demoTimer = window.setInterval(() => {
    if (!meetingActive.value || demoIndex >= MOCK_TRANSCRIPTION_LINES.length) {
      clearDemoTimer()
      return
    }
    pushLine('实时转写', MOCK_TRANSCRIPTION_LINES[demoIndex], 'speech')
    demoIndex += 1
  }, 4500)
}

const speechEnabled = isAliyunNlsConfigured()

const speech = useAliyunSpeechRecognizer({
  onSentence(text) {
    pushLine('实时转写', text, 'speech')
  },
  onInterim(text) {
    interimText.value = text
  },
  onStarted() {
    pushLine('系统', '阿里云实时语音识别已连接，正在采集麦克风…', 'ai')
  },
  onError(message) {
    pushLine('系统', `语音识别异常：${message}`, 'ai')
  },
})

export function useMeetingAiSession() {
  function isAiMeetingReady() {
    if (!meetingActive.value) return false
    if (speechEnabled) {
      return speech.status.value === 'listening'
    }
    return Boolean(demoTimer)
  }

  function tryAutoCollapsePanel() {
    if (!autoCollapsePending || !meetingActive.value) return
    if (screenRecorder.screenRecording.value && isAiMeetingReady()) {
      autoCollapsePending = false
      window.setTimeout(() => {
        if (meetingActive.value) {
          panelExpanded.value = false
        }
      }, 480)
    }
  }

  watch(
    () => [screenRecorder.screenRecording.value, speech.status.value, meetingActive.value],
    tryAutoCollapsePanel,
  )

  const statusText = computed(() => {
    if (screenRecorder.screenRecording.value) return 'AI智能识别中，会议结束后将生成会议纪要。'
    if (interimText.value) return `识别中：${interimText.value}`
    if (speech.status.value === 'connecting') return '正在连接语音识别…'
    if (speech.status.value === 'listening') return 'AI智能识别中，会议结束后将生成会议纪要。'
    if (phase.value === 'ended') return '会议已结束'
    if (screenRecorder.recordingError.value && meetingActive.value) {
      return screenRecorder.recordingError.value
    }
    if (meetingActive.value && !speechEnabled) return 'AI智能识别中，会议结束后将生成会议纪要。'
    if (meetingActive.value) return 'AI智能识别中，会议结束后将生成会议纪要。'
    return '等待开始会议'
  })

  const isSpeechActive = computed(
    () =>
      meetingActive.value &&
      (speech.status.value === 'listening' || speech.status.value === 'connecting' || !speechEnabled),
  )

  async function startSession() {
    meetingActive.value = true
    phase.value = 'recording'
    transcriptLines.value = []
    interimText.value = ''
    meetingStartedAt.value = formatDateTimeNow()
    meetingDurationText.value = ''
    screenRecorder.resetScreenRecord()
    autoCollapsePending = true

    pushLine('系统', '调度指挥会议已开始，AI 实时转写中…', 'ai')

    const recordOk = await screenRecorder.startScreenRecord()
    if (recordOk) {
      pushLine('系统', '浏览器页面录屏已启动', 'ai')
    } else if (screenRecorder.recordingError.value) {
      pushLine('系统', `录屏未启动：${screenRecorder.recordingError.value}`, 'ai')
    }

    if (speechEnabled) {
      await speech.start()
    } else {
      pushLine('系统', '未配置语音凭证，当前为演示转写数据', 'ai')
      startDemoFeed()
    }

    tryAutoCollapsePanel()
  }

  async function endSession() {
    meetingActive.value = false
    phase.value = 'ended'
    autoCollapsePending = false
    interimText.value = ''

    clearDemoTimer()

    const recording = await screenRecorder.stopScreenRecord()
    if (recording?.url) {
      meetingDurationText.value = recording.durationText
      pushLine('系统', `页面录屏已结束，时长 ${recording.durationText}`, 'ai')
      if (recording.localPath) {
        pushLine('系统', `录屏无法保存至云端，已保存至本地：${recording.localPath}`, 'ai')
      }
    } else if (screenRecorder.recordingUrl.value) {
      meetingDurationText.value =
        screenRecorder.recordingDurationText.value || computeDuration(meetingStartedAt.value)
    } else {
      meetingDurationText.value = computeDuration(meetingStartedAt.value)
    }

    await speech.stop()
    pushLine('系统', '会议已结束。', 'ai')

    return recording || (screenRecorder.recordingUrl.value
      ? {
          url: screenRecorder.recordingUrl.value,
          filename: screenRecorder.recordingFilename.value,
          localPath: screenRecorder.recordingLocalPath.value,
          durationText: screenRecorder.recordingDurationText.value,
        }
      : null)
  }

  async function stopRecording() {
    if (!screenRecorder.screenRecording.value) return null
    const recording = await screenRecorder.stopScreenRecord()
    if (recording?.url) {
      pushLine('系统', `页面录屏已手动停止，时长 ${recording.durationText}`, 'ai')
      if (recording.localPath) {
        pushLine('系统', `录屏无法保存至云端，已保存至本地：${recording.localPath}`, 'ai')
      }
    } else {
      pushLine('系统', '页面录屏已手动停止', 'ai')
    }
    return recording
  }

  function getMeetingMinutes() {
    return buildMinutesFromTranscript(transcriptLines.value)
  }

  function togglePanel() {
    panelExpanded.value = !panelExpanded.value
  }

  function resetSession() {
    clearDemoTimer()
    autoCollapsePending = false
    speech.stop()
    screenRecorder.resetScreenRecord()
    meetingActive.value = false
    phase.value = 'idle'
    transcriptLines.value = []
    interimText.value = ''
    meetingStartedAt.value = ''
    meetingDurationText.value = ''
  }

  return {
    panelExpanded,
    meetingActive,
    transcriptLines,
    phase,
    statusText,
    isSpeechActive,
    isRecording: isSpeechActive,
    meetingStartedAt,
    meetingDurationText,
    speechEnabled,
    speechStatus: speech.status,
    screenRecording: screenRecorder.screenRecording,
    recordingUrl: screenRecorder.recordingUrl,
    recordingFilename: screenRecorder.recordingFilename,
    recordingLocalPath: screenRecorder.recordingLocalPath,
    recordingError: screenRecorder.recordingError,
    recordingDurationText: screenRecorder.recordingDurationText,
    startSession,
    endSession,
    stopRecording,
    getMeetingMinutes,
    togglePanel,
    resetSession,
  }
}

/** 收起会议签到、会议管控浮层 */
export function collapseCocFloatingPanels() {
  panelExpanded.value = false
  signInPanelExpanded.value = false
}

export function useSignInFloatingPanel() {
  return {
    panelExpanded: signInPanelExpanded,
    togglePanel: (force) => {
      signInPanelExpanded.value = typeof force === 'boolean' ? force : !signInPanelExpanded.value
    },
  }
}
