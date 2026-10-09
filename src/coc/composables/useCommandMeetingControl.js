import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { useMeetingAiSession } from './useMeetingAiSession.js'
import { saveDispatchMeetingRecord, buildSummaryMinutes } from '../utils/dispatchMeetingStorage.js'
import {
  endDutyMeetingSession,
  snapshotDutyMeetingRecord,
  startDutyMeetingSession,
} from '../utils/dutyMeetingAttendanceStorage.js'
import { todayYmd } from '../mock/dutyScreenData.js'
import { cocFeatureFlags } from '../config/featureFlags.js'

const commandMeetingScreen = ref(null)

function formatNow() {
  return new Date().toLocaleString('zh-CN', { hour12: false })
}

export function useCommandMeetingControl() {
  const session = useMeetingAiSession()

  /**
   * 开始会议：冻结项目值班人员参会状态（会议进行中不随考勤变化）
   * @param {Array} projects 当前项目列表
   */
  async function startMeeting(projects = []) {
    startDutyMeetingSession({ projects, date: todayYmd() })
    session.panelExpanded.value = true
    await session.startSession()
  }

  /**
   * 结束会议：先按值班人员参会状态落会议记录，再清除标注（恢复按考勤更新）
   * @param {Array} projects 当前项目列表（用于按当日值班人员生成台账）
   */
  async function endMeeting(projects = []) {
    const endedAt = formatNow()
    const dutyRecord = snapshotDutyMeetingRecord({
      projects,
      date: todayYmd(),
      meetingTime: session.meetingStartedAt.value || endedAt,
      endedAt,
    })
    endDutyMeetingSession(todayYmd())
    const recording = await session.endSession()
    const startedAt = session.meetingStartedAt.value
    const transcript = [...session.transcriptLines.value]
    const base = {
      title: '调度指挥会议',
      startTime: startedAt || formatNow(),
      duration: recording?.durationText || session.meetingDurationText.value || '—',
      host: '指挥部调度席',
      joinedCount: dutyRecord?.attendeeTotal ?? 0,
      pendingCount: dutyRecord?.absenteeTotal ?? 0,
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
    if (!cocFeatureFlags.meetingRecordsEntry) return
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
