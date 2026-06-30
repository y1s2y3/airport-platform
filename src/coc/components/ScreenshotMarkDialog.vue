<script setup>
import { ref, reactive, watch, nextTick, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { EditPen, Delete, Microphone, VideoCamera } from '@element-plus/icons-vue'
import { videoPlaceholderColor, HAZARD_REPORTERS, MOCK_NOTICE } from '../mock/data.js'
import { saveScreenshotRecord } from '../utils/videoStorage.js'
import { saveDispatchDocFromScreenshot } from '../utils/dispatchMeetingStorage.js'

const props = defineProps({
  visible: { type: Boolean, default: false },
  camera: { type: Object, default: null },
  project: { type: Object, default: null },
  sourceType: { type: String, default: 'live' },
})

const emit = defineEmits(['update:visible', 'submit'])

const bgCanvasRef = ref(null)
const drawCanvasRef = ref(null)
const showForm = ref(false)
const isListening = ref(false)
const previewUrl = ref('')
const brushColor = ref('#f56c6c')
const brushSize = ref(4)

const form = reactive({
  docType: 'notice',
  projectName: '',
  cameraName: '',
  cameraLocation: '',
  description: '',
  rectifier: '',
  amount: '',
})

const docTypeOptions = [
  { value: 'notice', label: '告知单' },
  { value: 'penalty', label: '处罚单' },
  { value: 'safety', label: '安全隐患' },
  { value: 'quality', label: '质量隐患' },
]

function docTypeMeta(type) {
  const map = {
    notice: {
      placeholder: '请描述发现的问题，将作为告知单正文',
      rectifierLabel: '整改人',
      submitText: '提交告知单',
      successText: '告知单已登记并下发',
    },
    penalty: {
      placeholder: '请描述违规问题，将作为处罚单正文',
      rectifierLabel: '处理人',
      submitText: '提交处罚单',
      successText: '处罚单已登记并下发',
    },
    safety: {
      placeholder: '请描述发现的安全隐患，将登记至问题截图台账',
      rectifierLabel: '整改人',
      submitText: '提交安全隐患',
      successText: '安全隐患已登记',
    },
    quality: {
      placeholder: '请描述发现的质量隐患，将登记至问题截图台账',
      rectifierLabel: '整改人',
      submitText: '提交质量隐患',
      successText: '质量隐患已登记',
    },
  }
  return map[type] || map.notice
}

const currentDocMeta = computed(() => docTypeMeta(form.docType))

const brushColors = ['#f56c6c', '#e6a23c', '#409eff', '#67c23a', '#ffffff']

let drawing = false
let lastX = 0
let lastY = 0
let recognition = null

function guessCameraLocation(name = '') {
  if (name.includes('塔吊')) return '塔吊作业区'
  if (name.includes('门')) return '出入口'
  if (name.includes('钢筋')) return '钢筋加工场'
  if (name.includes('通道')) return '车辆通道'
  if (name.includes('梯笼')) return '梯笼区域'
  if (name.includes('地磅')) return '地磅站'
  if (name.includes('会议室')) return '现场会议室'
  if (name.includes('讲评')) return '工人讲评区'
  return '施工现场'
}

function resetForm() {
  form.docType = 'notice'
  form.projectName = props.project?.shortName || props.project?.name || ''
  form.cameraName = props.camera?.name || ''
  form.cameraLocation = props.camera?.location || guessCameraLocation(props.camera?.name)
  form.description = ''
  form.rectifier = ''
  form.amount = ''
}

function switchDocType(type) {
  form.docType = type
}

function paintBackground(ctx, w, h) {
  const online = props.camera?.online !== false
  const base = videoPlaceholderColor(online, 0, props.camera?.palette || 'warm')
  const grd = ctx.createLinearGradient(0, 0, w, h)
  grd.addColorStop(0, base)
  grd.addColorStop(1, '#1a1a1a')
  ctx.fillStyle = grd
  ctx.fillRect(0, 0, w, h)

  ctx.fillStyle = 'rgba(255,255,255,0.12)'
  ctx.font = 'bold 48px sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('监控画面', w / 2, h / 2 - 20)

  ctx.fillStyle = 'rgba(255,255,255,0.55)'
  ctx.font = '13px sans-serif'
  ctx.fillText(props.camera?.name || '', w / 2, h / 2 + 24)

  const stamp = new Date().toLocaleString('zh-CN')
  ctx.textAlign = 'left'
  ctx.textBaseline = 'bottom'
  ctx.fillStyle = 'rgba(255,255,255,0.75)'
  ctx.font = '12px sans-serif'
  ctx.fillText(stamp, 12, h - 12)
}

function setupCanvas() {
  const wrap = bgCanvasRef.value?.parentElement
  if (!wrap || !bgCanvasRef.value || !drawCanvasRef.value) return

  const w = wrap.clientWidth
  const h = wrap.clientHeight
  const dpr = window.devicePixelRatio || 1

  ;[bgCanvasRef.value, drawCanvasRef.value].forEach((canvas) => {
    canvas.width = w * dpr
    canvas.height = h * dpr
    canvas.style.width = `${w}px`
    canvas.style.height = `${h}px`
    const ctx = canvas.getContext('2d')
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  })

  const bgCtx = bgCanvasRef.value.getContext('2d')
  paintBackground(bgCtx, w, h)

  const drawCtx = drawCanvasRef.value.getContext('2d')
  drawCtx.clearRect(0, 0, w, h)
  drawCtx.lineCap = 'round'
  drawCtx.lineJoin = 'round'
}

function getDrawCtx() {
  return drawCanvasRef.value?.getContext('2d')
}

/** 将视口坐标转为画布逻辑坐标（兼容 screen-canvas 缩放） */
function pointerPos(e) {
  const canvas = drawCanvasRef.value
  if (!canvas) return { x: 0, y: 0 }

  const rect = canvas.getBoundingClientRect()
  const clientX = e.touches ? e.touches[0].clientX : e.clientX
  const clientY = e.touches ? e.touches[0].clientY : e.clientY

  if (!rect.width || !rect.height) {
    return { x: 0, y: 0 }
  }

  const scaleX = canvas.clientWidth / rect.width
  const scaleY = canvas.clientHeight / rect.height

  return {
    x: (clientX - rect.left) * scaleX,
    y: (clientY - rect.top) * scaleY,
  }
}

function startDraw(e) {
  if (showForm.value) return
  e.preventDefault()
  drawing = true
  const { x, y } = pointerPos(e)
  lastX = x
  lastY = y
}

function moveDraw(e) {
  if (!drawing || showForm.value) return
  e.preventDefault()
  const ctx = getDrawCtx()
  if (!ctx) return
  const { x, y } = pointerPos(e)
  ctx.strokeStyle = brushColor.value
  ctx.lineWidth = brushSize.value
  ctx.beginPath()
  ctx.moveTo(lastX, lastY)
  ctx.lineTo(x, y)
  ctx.stroke()
  lastX = x
  lastY = y
}

function endDraw() {
  drawing = false
}

function clearMarks() {
  const canvas = drawCanvasRef.value
  const ctx = getDrawCtx()
  if (!canvas || !ctx) return
  ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight)
}

function exportMergedImage() {
  const bg = bgCanvasRef.value
  const draw = drawCanvasRef.value
  if (!bg || !draw) return null
  const merged = document.createElement('canvas')
  merged.width = bg.width
  merged.height = bg.height
  const ctx = merged.getContext('2d')
  ctx.drawImage(bg, 0, 0)
  ctx.drawImage(draw, 0, 0)
  return merged.toDataURL('image/png')
}

function handleClose() {
  stopVoice()
  showForm.value = false
  emit('update:visible', false)
}

function openForm() {
  previewUrl.value = exportMergedImage() || ''
  showForm.value = true
}

function backToMark() {
  showForm.value = false
}

function startVoice() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
  if (!SpeechRecognition) {
    ElMessage.warning('当前浏览器不支持语音输入，请手动填写问题描述')
    return
  }
  if (isListening.value) {
    stopVoice()
    return
  }
  recognition = new SpeechRecognition()
  recognition.lang = 'zh-CN'
  recognition.interimResults = false
  recognition.onresult = (event) => {
    const text = event.results[0][0].transcript
    form.description = form.description ? `${form.description}${text}` : text
  }
  recognition.onerror = () => {
    isListening.value = false
    ElMessage.warning('语音识别失败，请重试')
  }
  recognition.onend = () => {
    isListening.value = false
  }
  recognition.start()
  isListening.value = true
  ElMessage.info('请开始说话…')
}

function stopVoice() {
  recognition?.stop()
  recognition = null
  isListening.value = false
}

function handleSubmit() {
  if (!form.description.trim()) {
    ElMessage.warning('请填写问题描述')
    return
  }
  if (!form.rectifier) {
    ElMessage.warning('请选择整改人')
    return
  }
  const payload = {
    ...form,
    snapshot: exportMergedImage(),
    cameraId: props.camera?.id,
    sourceType: props.sourceType,
    unit: MOCK_NOTICE.unit,
  }
  saveScreenshotRecord(payload)
  if (form.docType === 'notice' || form.docType === 'penalty') {
    saveDispatchDocFromScreenshot(form.docType, payload)
  }
  emit('submit', payload)
  ElMessage.success(currentDocMeta.value.successText)
  handleClose()
}

watch(
  () => props.visible,
  (open) => {
    if (open) {
      showForm.value = false
      resetForm()
      nextTick(() => setupCanvas())
    } else {
      stopVoice()
    }
  },
)
</script>

<template>
  <el-dialog
    :model-value="visible"
    :title="showForm ? '添加问题' : '截屏标记'"
    width="880px"
    top="6vh"
    destroy-on-close
    class="screenshot-mark-dialog"
    @update:model-value="emit('update:visible', $event)"
    @close="handleClose"
  >
    <div v-show="!showForm" class="mark-stage">
      <div class="canvas-wrap">
        <canvas ref="bgCanvasRef" class="canvas-layer bg-layer" />
        <canvas
          ref="drawCanvasRef"
          class="canvas-layer draw-layer"
          @mousedown="startDraw"
          @mousemove="moveDraw"
          @mouseup="endDraw"
          @mouseleave="endDraw"
          @touchstart.passive="startDraw"
          @touchmove.prevent="moveDraw"
          @touchend="endDraw"
        />
      </div>

      <div class="mark-toolbar">
        <div class="tool-group">
          <span class="tool-label"><el-icon><EditPen /></el-icon> 画笔</span>
          <button
            v-for="c in brushColors"
            :key="c"
            class="color-dot"
            :class="{ active: brushColor === c }"
            :style="{ background: c, borderColor: c === '#ffffff' ? '#dcdfe6' : c }"
            @click="brushColor = c"
          />
          <el-slider v-model="brushSize" :min="2" :max="12" :step="1" class="size-slider" />
        </div>
        <el-button :icon="Delete" @click="clearMarks">清除标记</el-button>
      </div>
    </div>

    <div v-show="showForm" class="issue-form">
      <div class="form-main">
        <div class="doc-type-bar">
          <span class="doc-type-label">登记类型</span>
          <div class="doc-tabs">
            <button
              v-for="opt in docTypeOptions"
              :key="opt.value"
              type="button"
              class="doc-tab-btn"
              :class="{
                active: form.docType === opt.value,
                notice: opt.value === 'notice',
                penalty: opt.value === 'penalty',
                safety: opt.value === 'safety',
                quality: opt.value === 'quality',
              }"
              @click="switchDocType(opt.value)"
            >
              {{ opt.label }}
            </button>
          </div>
        </div>

        <div class="form-body">
          <div class="form-preview">
            <div class="preview-label">标记截图</div>
            <div class="preview-thumb">
              <img v-if="previewUrl" :src="previewUrl" alt="截屏预览" class="preview-img" />
              <div v-else class="preview-placeholder">
                <el-icon :size="28" color="#909399"><VideoCamera /></el-icon>
                <span>暂无预览</span>
              </div>
            </div>
          </div>

          <el-form label-width="96px" size="default" class="issue-fields">
            <el-form-item label="项目名称">
              <el-input v-model="form.projectName" readonly />
            </el-form-item>
            <el-form-item label="摄像头名称">
              <el-input v-model="form.cameraName" readonly />
            </el-form-item>
            <el-form-item label="摄像头位置">
              <el-input v-model="form.cameraLocation" />
            </el-form-item>
            <el-form-item label="问题描述">
              <div class="desc-row">
                <el-input
                  v-model="form.description"
                  type="textarea"
                  :rows="4"
                  :placeholder="currentDocMeta.placeholder"
                />
                <el-button
                  class="voice-btn"
                  :type="isListening ? 'danger' : 'default'"
                  :icon="Microphone"
                  @click="startVoice"
                >
                  {{ isListening ? '停止' : '语音' }}
                </el-button>
              </div>
            </el-form-item>
            <el-form-item v-if="form.docType === 'penalty'" label="处罚金额">
              <el-input v-model="form.amount" placeholder="选填，如 5000元" />
            </el-form-item>
            <el-form-item :label="currentDocMeta.rectifierLabel">
              <el-select v-model="form.rectifier" placeholder="选择整改责任人" style="width: 100%">
                <el-option v-for="name in HAZARD_REPORTERS" :key="name" :label="name" :value="name" />
              </el-select>
            </el-form-item>
          </el-form>
        </div>
      </div>
    </div>

    <template #footer>
      <template v-if="!showForm">
        <el-button @click="handleClose">取消</el-button>
        <el-button type="primary" @click="openForm">添加问题</el-button>
      </template>
      <template v-else>
        <el-button @click="backToMark">返回标记</el-button>
        <el-button @click="handleClose">取消</el-button>
        <el-button type="primary" @click="handleSubmit">
          {{ currentDocMeta.submitText }}
        </el-button>
      </template>
    </template>
  </el-dialog>
</template>

<style scoped>
.mark-stage {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.canvas-wrap {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 9;
  background: #000;
  border-radius: 8px;
  overflow: hidden;
}

.canvas-layer {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.draw-layer {
  cursor: crosshair;
  touch-action: none;
}

.mark-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.tool-group {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.tool-label {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: var(--coc-text-secondary);
}

.color-dot {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: 2px solid transparent;
  cursor: pointer;
  padding: 0;
}

.color-dot.active {
  box-shadow: 0 0 0 2px #fff, 0 0 0 4px var(--coc-accent);
}

.size-slider {
  width: 120px;
  margin-left: 8px;
}

.issue-form {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.form-main {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.doc-type-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding-bottom: 14px;
  border-bottom: 1px solid var(--coc-border);
}

.doc-type-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--coc-text-secondary);
  flex-shrink: 0;
}

.doc-tabs {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.doc-tab-btn {
  border: 1px solid var(--coc-border);
  border-radius: 6px;
  background: #faf8f6;
  font-size: 13px;
  padding: 6px 16px;
  cursor: pointer;
  font-weight: 500;
  color: var(--coc-text-secondary);
}

.doc-tab-btn.active.notice {
  border-color: #409eff;
  background: rgba(64, 158, 255, 0.1);
  color: #409eff;
  font-weight: 600;
}

.doc-tab-btn.active.penalty {
  border-color: #f56c6c;
  background: rgba(245, 108, 108, 0.1);
  color: #f56c6c;
  font-weight: 600;
}

.doc-tab-btn.active.safety {
  border-color: #e6a23c;
  background: rgba(230, 162, 60, 0.1);
  color: #e6a23c;
  font-weight: 600;
}

.doc-tab-btn.active.quality {
  border-color: #67c23a;
  background: rgba(103, 194, 58, 0.1);
  color: #67c23a;
  font-weight: 600;
}

.form-body {
  display: grid;
  grid-template-columns: 200px 1fr;
  gap: 20px;
  align-items: start;
}

.form-preview {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.preview-label {
  font-size: 13px;
  color: var(--coc-text-secondary);
  font-weight: 600;
}

.preview-thumb {
  aspect-ratio: 16 / 9;
  background: #1a1a1a;
  border-radius: 8px;
  border: 1px solid var(--coc-border);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.preview-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.preview-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  color: var(--coc-text-muted);
  font-size: 12px;
  text-align: center;
  padding: 8px;
}

.hidden-canvas {
  display: none;
}

.issue-fields {
  min-width: 0;
}

.desc-row {
  display: flex;
  gap: 10px;
  width: 100%;
  align-items: flex-start;
}

.desc-row .el-textarea {
  flex: 1;
}

.voice-btn {
  flex-shrink: 0;
  height: 40px;
}
</style>

<style>
.screenshot-mark-dialog .el-dialog__body {
  padding-top: 12px;
}
</style>
