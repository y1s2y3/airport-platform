import { ref, onUnmounted } from 'vue'
import { getAliyunNlsConfig } from '../utils/aliyunNlsConfig.js'

const TARGET_SAMPLE_RATE = 16000

function genId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID().replace(/-/g, '')
  }
  return Array.from({ length: 32 }, () =>
    Math.floor(Math.random() * 16).toString(16),
  ).join('')
}

function floatTo16BitPCM(input) {
  const buffer = new ArrayBuffer(input.length * 2)
  const view = new DataView(buffer)
  for (let i = 0; i < input.length; i += 1) {
    const sample = Math.max(-1, Math.min(1, input[i]))
    view.setInt16(i * 2, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true)
  }
  return buffer
}

function downsampleBuffer(buffer, sampleRate, outRate) {
  if (outRate === sampleRate) return buffer
  const ratio = sampleRate / outRate
  const newLength = Math.round(buffer.length / ratio)
  const result = new Float32Array(newLength)
  let offsetResult = 0
  let offsetBuffer = 0
  while (offsetResult < newLength) {
    const nextOffsetBuffer = Math.round((offsetResult + 1) * ratio)
    let accum = 0
    let count = 0
    for (let i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i += 1) {
      accum += buffer[i]
      count += 1
    }
    result[offsetResult] = count ? accum / count : 0
    offsetResult += 1
    offsetBuffer = nextOffsetBuffer
  }
  return result
}

/**
 * 阿里云智能语音交互 · 实时语音识别（WebSocket + 麦克风 PCM）
 * @param {{ onSentence?: (text: string, payload: object) => void, onInterim?: (text: string) => void, onStarted?: () => void, onError?: (message: string) => void }} hooks
 */
export function useAliyunSpeechRecognizer(hooks = {}) {
  const status = ref('idle')
  const errorMessage = ref('')
  const interimResult = ref('')

  let ws = null
  let taskId = null
  let appKey = ''
  let audioContext = null
  let mediaStream = null
  let processor = null
  let canSendAudio = false
  let inputSampleRate = TARGET_SAMPLE_RATE

  function buildHeader(name) {
    return {
      appkey: appKey,
      message_id: genId(),
      task_id: taskId,
      namespace: 'SpeechTranscriber',
      name,
    }
  }

  function handleServerMessage(raw) {
    let msg
    try {
      msg = JSON.parse(raw)
    } catch {
      return
    }

    const { header, payload } = msg
    const name = header?.name
    const code = header?.status

    if (code && code !== 20000000) {
      const message = header?.status_message || `语音识别错误 ${code}`
      status.value = 'error'
      errorMessage.value = message
      hooks.onError?.(message)
      return
    }

    switch (name) {
      case 'TranscriptionStarted':
        canSendAudio = true
        status.value = 'listening'
        hooks.onStarted?.()
        break
      case 'TranscriptionResultChanged':
        interimResult.value = payload?.result || ''
        hooks.onInterim?.(interimResult.value)
        break
      case 'SentenceEnd': {
        interimResult.value = ''
        const text = payload?.result?.trim()
        if (text) hooks.onSentence?.(text, payload)
        break
      }
      case 'TranscriptionCompleted':
        canSendAudio = false
        status.value = 'idle'
        break
      default:
        break
    }
  }

  function sendStartTranscription() {
    ws.send(
      JSON.stringify({
        header: buildHeader('StartTranscription'),
        payload: {
          format: 'PCM',
          sample_rate: TARGET_SAMPLE_RATE,
          enable_intermediate_result: true,
          enable_punctuation_prediction: true,
          enable_inverse_text_normalization: true,
          max_sentence_silence: 800,
        },
      }),
    )
  }

  function sendStopTranscription() {
    if (!ws || ws.readyState !== WebSocket.OPEN || !taskId) return
    ws.send(JSON.stringify({ header: buildHeader('StopTranscription') }))
  }

  async function startMicrophone() {
    mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
      },
      video: false,
    })

    const AudioCtx = window.AudioContext || window.webkitAudioContext
    audioContext = new AudioCtx()
    inputSampleRate = audioContext.sampleRate

    const source = audioContext.createMediaStreamSource(mediaStream)
    processor = audioContext.createScriptProcessor(4096, 1, 1)

    processor.onaudioprocess = (event) => {
      if (!canSendAudio || !ws || ws.readyState !== WebSocket.OPEN) return
      let samples = event.inputBuffer.getChannelData(0)
      if (inputSampleRate !== TARGET_SAMPLE_RATE) {
        samples = downsampleBuffer(samples, inputSampleRate, TARGET_SAMPLE_RATE)
      }
      ws.send(floatTo16BitPCM(samples))
    }

    const silentGain = audioContext.createGain()
    silentGain.gain.value = 0
    source.connect(processor)
    processor.connect(silentGain)
    silentGain.connect(audioContext.destination)
  }

  function cleanupAudio() {
    processor?.disconnect()
    processor = null
    mediaStream?.getTracks().forEach((track) => track.stop())
    mediaStream = null
    if (audioContext) {
      audioContext.close().catch(() => {})
      audioContext = null
    }
  }

  function cleanupSocket() {
    if (ws) {
      ws.onopen = null
      ws.onmessage = null
      ws.onerror = null
      ws.onclose = null
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close()
      }
      ws = null
    }
  }

  async function start() {
    const config = getAliyunNlsConfig()
    if (!config.appKey || !config.token) {
      status.value = 'error'
      errorMessage.value = '未配置阿里云语音凭证（VITE_ALIYUN_NLS_APPKEY / VITE_ALIYUN_NLS_TOKEN）'
      return false
    }

    if (status.value === 'listening' || status.value === 'connecting') {
      return true
    }

    appKey = config.appKey
    taskId = genId()
    canSendAudio = false
    errorMessage.value = ''
    status.value = 'connecting'

    try {
      await new Promise((resolve, reject) => {
        const url = `${config.gatewayUrl}?token=${encodeURIComponent(config.token)}`
        ws = new WebSocket(url)
        const timeout = window.setTimeout(() => reject(new Error('连接阿里云语音服务超时')), 12000)

        ws.onopen = () => {
          window.clearTimeout(timeout)
          resolve()
        }
        ws.onerror = () => {
          window.clearTimeout(timeout)
          reject(new Error('WebSocket 连接失败'))
        }
      })

      ws.onmessage = (event) => {
        if (typeof event.data === 'string') {
          handleServerMessage(event.data)
        }
      }

      ws.onclose = () => {
        canSendAudio = false
        if (status.value !== 'stopping') {
          status.value = 'idle'
        }
      }

      ws.onerror = () => {
        status.value = 'error'
        errorMessage.value = '语音识别连接异常'
        hooks.onError?.(errorMessage.value)
      }

      sendStartTranscription()
      await startMicrophone()
      return true
    } catch (err) {
      status.value = 'error'
      errorMessage.value = err?.message || '启动语音识别失败'
      hooks.onError?.(errorMessage.value)
      await stop()
      return false
    }
  }

  async function stop() {
    const prev = status.value
    status.value = 'stopping'
    canSendAudio = false
    interimResult.value = ''

    sendStopTranscription()
    cleanupAudio()
    cleanupSocket()
    taskId = null
    status.value = prev === 'error' ? 'error' : 'idle'
  }

  onUnmounted(() => {
    stop()
  })

  return {
    status,
    errorMessage,
    interimResult,
    start,
    stop,
  }
}
