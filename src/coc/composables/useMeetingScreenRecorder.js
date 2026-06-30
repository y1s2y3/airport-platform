import { ref } from 'vue'

const screenRecording = ref(false)
const recordingUrl = ref(null)
const recordingFilename = ref('')
const recordingLocalPath = ref('')
const recordingError = ref('')
const recordingDurationText = ref('')

let mediaRecorder = null
let displayStream = null
let recordedChunks = []
let recordStartTime = 0

function formatFilenameStamp() {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
}

function pickMimeType() {
  const candidates = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm']
  return candidates.find((type) => MediaRecorder.isTypeSupported(type)) || 'video/webm'
}

function formatDuration(ms) {
  const totalSec = Math.max(0, Math.floor(ms / 1000))
  const min = Math.floor(totalSec / 60)
  const sec = totalSec % 60
  return `${min}分${String(sec).padStart(2, '0')}秒`
}

function buildLocalSavePath(filename) {
  return `Downloads/${filename}`
}

function saveRecordingLocally() {
  if (!recordingUrl.value || !recordingFilename.value) return false
  const anchor = document.createElement('a')
  anchor.href = recordingUrl.value
  anchor.download = recordingFilename.value
  anchor.click()
  recordingLocalPath.value = buildLocalSavePath(recordingFilename.value)
  return true
}

function cleanupStream() {
  if (displayStream) {
    displayStream.getTracks().forEach((track) => track.stop())
    displayStream = null
  }
}

function revokeRecordingUrl() {
  if (recordingUrl.value) {
    URL.revokeObjectURL(recordingUrl.value)
    recordingUrl.value = null
  }
}

export function useMeetingScreenRecorder() {
  async function startScreenRecord() {
    recordingError.value = ''
    recordingDurationText.value = ''
    recordingLocalPath.value = ''
    revokeRecordingUrl()
    recordingFilename.value = ''

    if (!navigator.mediaDevices?.getDisplayMedia) {
      recordingError.value = '当前浏览器不支持页面录屏'
      return false
    }

    try {
      displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: 'browser',
        },
        audio: true,
        preferCurrentTab: true,
        selfBrowserSurface: 'include',
        systemAudio: 'include',
      })

      const mimeType = pickMimeType()
      recordedChunks = []
      mediaRecorder = new MediaRecorder(displayStream, { mimeType })

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) recordedChunks.push(event.data)
      }

      const videoTrack = displayStream.getVideoTracks()[0]
      if (videoTrack) {
        videoTrack.onended = () => {
          if (screenRecording.value) stopScreenRecord()
        }
      }

      mediaRecorder.start(1000)
      recordStartTime = Date.now()
      screenRecording.value = true
      recordingFilename.value = `调度指挥会议录屏_${formatFilenameStamp()}.webm`
      return true
    } catch (err) {
      cleanupStream()
      mediaRecorder = null
      screenRecording.value = false
      recordingError.value =
        err?.name === 'NotAllowedError' ? '未授权页面录屏' : '页面录屏启动失败'
      return false
    }
  }

  async function stopScreenRecord() {
    if (!mediaRecorder || mediaRecorder.state === 'inactive') {
      screenRecording.value = false
      cleanupStream()
      return null
    }

    return new Promise((resolve) => {
      mediaRecorder.onstop = () => {
        const durationMs = recordStartTime ? Date.now() - recordStartTime : 0
        recordingDurationText.value = formatDuration(durationMs)
        const blob = new Blob(recordedChunks, { type: mediaRecorder.mimeType || 'video/webm' })
        revokeRecordingUrl()
        if (blob.size > 0) {
          recordingUrl.value = URL.createObjectURL(blob)
          saveRecordingLocally()
        }
        screenRecording.value = false
        cleanupStream()
        mediaRecorder = null
        recordedChunks = []
        resolve({
          url: recordingUrl.value,
          filename: recordingFilename.value,
          localPath: recordingLocalPath.value,
          durationText: recordingDurationText.value,
          size: blob.size,
        })
      }
      mediaRecorder.stop()
    })
  }

  function resetScreenRecord() {
    if (mediaRecorder?.state === 'recording') {
      mediaRecorder.stop()
    }
    cleanupStream()
    mediaRecorder = null
    recordedChunks = []
    screenRecording.value = false
    recordingError.value = ''
    recordingDurationText.value = ''
    recordingLocalPath.value = ''
    revokeRecordingUrl()
    recordingFilename.value = ''
  }

  return {
    screenRecording,
    recordingUrl,
    recordingFilename,
    recordingLocalPath,
    recordingError,
    recordingDurationText,
    startScreenRecord,
    stopScreenRecord,
    resetScreenRecord,
  }
}
