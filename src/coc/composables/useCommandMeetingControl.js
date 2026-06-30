import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { useMeetingAiSession } from './useMeetingAiSession.js'
import { saveDispatchMeetingRecord, buildSummaryMinutes } from '../utils/dispatchMeetingStorage.js'

const commandMeetingScreen = ref(null)

function formatNow() {
  return new Date().toLocaleString('zh-CN', { hour12: false })
}

export function useCommandMeetingControl() {
  const session = useMeetingAiSession()

  async function startMeeting() {
    session.panelExpanded.value = true
    await session.startSession()
  }

  async function endMeeting() {
    const recording = await session.endSession()
    const startedAt = session.meetingStartedAt.value
    const transcript = [...session.transcriptLines.value]
    const base = {
      title: '调度指挥会议',
      startTime: startedAt || formatNow(),
      duration: recording?.durationText || session.meetingDurationText.value || '—',
      host: '指挥部调度席',
      joinedCount: 6,
      pendingCount: 4,
      transcript,
      recordingFilename: recording?.filename || session.recordingFilename.value || '',
      recordingLocalPath: recording?.localPath || session.recordingLocalPath.value || '',
      hasRecording: Boolean(recording?.url || session.recordingUrl.value),
    }

    saveDispatchMeetingRecord({
      ...base,
      summary: '',
      minutes: buildSummaryMinutes(base, transcript),
    })

    ElMessage.success('会议已结束')
    if (recording?.localPath || session.recordingLocalPath.value) {
      ElMessage.info(`录屏无法保存至云端，已保存至本地：${recording?.localPath || session.recordingLocalPath.value}`)
    }
  }

  function showRecords() {
    commandMeetingScreen.value = 'records'
    session.panelExpanded.value = true
  }

  async function stopRecording() {
    if (!session.screenRecording.value) return
    const recording = await session.stopRecording()
    if (recording?.url) {
      ElMessage.success(`录屏已停止，时长 ${recording.durationText}`)
      if (recording.localPath) {
        ElMessage.info(`录屏无法保存至云端，已保存至本地：${recording.localPath}`)
      }
    } else {
      ElMessage.info('录屏已停止')
    }
  }

  return {
    commandMeetingScreen,
    startMeeting,
    endMeeting,
    stopRecording,
    showRecords,
    ...session,
  }
}
