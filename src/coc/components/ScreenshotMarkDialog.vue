<script setup>
import { ref, reactive, watch, nextTick, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { EditPen, Delete, VideoCamera } from '@element-plus/icons-vue'
import {
  loadVideoMonitorThumbImage,
  loadHandheldDeviceThumbImage,
  isVideoMonitorFeed,
  isHandheldDeviceFeed,
  HAZARD_REPORTERS,
  HAZARD_LEVELS,
  MOCK_NOTICE,
  buildProjects,
} from '../mock/data.js'
import { saveScreenshotRecord } from '../utils/videoStorage.js'
import { saveDispatchDocFromScreenshot } from '../utils/dispatchMeetingStorage.js'
import { buildExecutorOptions } from '../utils/executorDisplay.js'

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
const previewUrl = ref('')
const brushColor = ref('#f56c6c')
const brushSize = ref(4)

const executorOptions = computed(() => buildExecutorOptions())

const form = reactive({
  docType: 'notice',
  projectName: '',
  cameraName: '',
  cameraLocation: '',
  description: '',
  rectifier: '',
  hazardLevel: '一般',
  hazardDeadline: '',
  workType: '',
  workRequirement: '',
  executor: '',
  deadline: '',
  remark: '',
  matterDescription: '',
  penaltyReason: '',
  penaltyContent: '',
  unit: '',
})

const projectOptions = computed(() =>
  buildProjects().map((p) => p.shortName || p.name),
)

function defaultDeadline() {
  const d = new Date()
  d.setDate(d.getDate() + 7)
  return d.toISOString().slice(0, 10)
}

const MARK_POPPER_CLASS = 'screenshot-mark-popper'

const docTypeOptions = [
  { value: 'notice', label: '任务单' },
  { value: 'reminder', label: '提示函' },
  { value: 'penalty', label: '处罚单' },
  { value: 'safety', label: '安全隐患' },
  { value: 'quality', label: '质量隐患' },
]

function docTypeMeta(type) {
  const map = {
    notice: { submitText: '提交任务单', successText: '任务单已登记，待指挥部下发' },
    reminder: { submitText: '提交提示函', successText: '提示函已登记，待指挥部下发' },
    penalty: { submitText: '提交处罚单', successText: '处罚单已登记，待指挥部下发' },
    safety: { submitText: '提交安全隐患', successText: '安全隐患已登记' },
    quality: { submitText: '提交质量隐患', successText: '质量隐患已登记' },
  }
  return map[type] || map.notice
}

const currentDocMeta = computed(() => docTypeMeta(form.docType))

const formContextText = computed(() =>
  [form.projectName, form.cameraName, form.cameraLocation].filter(Boolean).join(' · ') || '—',
)

const brushColors = ['#f56c6c', '#e6a23c', '#409eff', '#67c23a', '#ffffff']

let drawing = false
let lastX = 0
let lastY = 0

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
  form.hazardLevel = '一般'
  form.hazardDeadline = defaultDeadline()
  form.workType = ''
  form.workRequirement = ''
  form.executor = ''
  form.deadline = defaultDeadline()
  form.remark = ''
  form.matterDescription = ''
  form.penaltyReason = ''
  form.penaltyContent = ''
  form.unit = ''
}

function switchDocType(type) {
  form.docType = type
}

function paintGradientBackground(ctx, w, h, online, palette) {
  let start = '#e8e8e8'
  let end = '#d0d0d0'
  if (online) {
    if (palette === 'cool') {
      start = 'hsl(200, 35%, 88%)'
      end = 'hsl(210, 40%, 78%)'
    } else {
      start = '#6b7280'
      end = '#374151'
    }
  }
  const grd = ctx.createLinearGradient(0, 0, w, h)
  grd.addColorStop(0, start)
  grd.addColorStop(1, end)
  ctx.fillStyle = grd
  ctx.fillRect(0, 0, w, h)
}

function paintMonitorOverlay(ctx, w, h) {
  const deviceType = props.camera?.type
  const palette = props.camera?.palette || 'warm'
  const online = props.camera?.online !== false

  if (isHandheldDeviceFeed(online, deviceType) || isVideoMonitorFeed(online, palette, deviceType)) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)'
    ctx.fillRect(0, 0, w, h)
    return
  }

  ctx.fillStyle = 'rgba(255,255,255,0.12)'
  ctx.font = 'bold 48px sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('监控画面', w / 2, h / 2 - 20)

  ctx.fillStyle = 'rgba(255,255,255,0.55)'
  ctx.font = '13px sans-serif'
  ctx.fillText(props.camera?.name || '', w / 2, h / 2 + 24)
}

function paintTimestamp(ctx, w, h) {
  const stamp = new Date().toLocaleString('zh-CN')
  ctx.textAlign = 'left'
  ctx.textBaseline = 'bottom'
  ctx.fillStyle = 'rgba(255,255,255,0.75)'
  ctx.font = '12px sans-serif'
  ctx.fillText(stamp, 12, h - 12)
}

async function paintBackground(ctx, w, h) {
  const online = props.camera?.online !== false
  const palette = props.camera?.palette || 'warm'
  const deviceType = props.camera?.type

  if (isHandheldDeviceFeed(online, deviceType)) {
    try {
      const img = await loadHandheldDeviceThumbImage()
      const scale = Math.max(w / img.width, h / img.height)
      const drawW = img.width * scale
      const drawH = img.height * scale
      ctx.drawImage(img, (w - drawW) / 2, (h - drawH) / 2, drawW, drawH)
    } catch {
      paintGradientBackground(ctx, w, h, online, palette)
    }
  } else if (isVideoMonitorFeed(online, palette, deviceType)) {
    try {
      const img = await loadVideoMonitorThumbImage()
      const scale = Math.max(w / img.width, h / img.height)
      const drawW = img.width * scale
      const drawH = img.height * scale
      ctx.drawImage(img, (w - drawW) / 2, (h - drawH) / 2, drawW, drawH)
    } catch {
      paintGradientBackground(ctx, w, h, online, palette)
    }
  } else {
    paintGradientBackground(ctx, w, h, online, palette)
  }

  paintMonitorOverlay(ctx, w, h)
  paintTimestamp(ctx, w, h)
}

async function setupCanvas() {
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
  await paintBackground(bgCtx, w, h)

  const drawCtx = drawCanvasRef.value.getContext('2d')
  drawCtx.clearRect(0, 0, w, h)
  drawCtx.lineCap = 'round'
  drawCtx.lineJoin = 'round'
}

function getDrawCtx() {
  return drawCanvasRef.value?.getContext('2d')
}

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

function handleSubmit() {
  if (form.docType === 'notice') {
    if (!form.projectName.trim()) {
      ElMessage.warning('请填写项目名称')
      return
    }
    if (!form.workType.trim()) {
      ElMessage.warning('请填写工作类型')
      return
    }
    if (!form.workRequirement.trim()) {
      ElMessage.warning('请填写工作要求')
      return
    }
    if (!form.executor?.trim()) {
      ElMessage.warning('请填写执行人')
      return
    }
    if (!form.deadline) {
      ElMessage.warning('请选择完成时限')
      return
    }
  } else if (form.docType === 'reminder') {
    if (!form.projectName.trim()) {
      ElMessage.warning('请填写项目名称')
      return
    }
    if (!form.matterDescription.trim()) {
      ElMessage.warning('请填写事项描述')
      return
    }
    if (!form.executor?.trim()) {
      ElMessage.warning('请填写指派人')
      return
    }
    if (!form.deadline) {
      ElMessage.warning('请选择完成时限')
      return
    }
  } else if (form.docType === 'penalty') {
    if (!form.projectName.trim()) {
      ElMessage.warning('请填写项目名称')
      return
    }
    if (!form.unit?.trim()) {
      ElMessage.warning('请填写责任单位')
      return
    }
    if (!form.penaltyReason.trim()) {
      ElMessage.warning('请填写事由')
      return
    }
    if (!form.penaltyContent.trim()) {
      ElMessage.warning('请填写内容')
      return
    }
  } else {
    if (!form.description.trim()) {
      ElMessage.warning('请填写隐患描述')
      return
    }
    if (!form.rectifier) {
      ElMessage.warning('请选择整改人')
      return
    }
    if (!form.hazardDeadline) {
      ElMessage.warning('请选择整改期限')
      return
    }
  }

  const payload = {
    ...form,
    description:
      form.docType === 'notice'
        ? form.workRequirement
        : form.docType === 'reminder'
          ? form.matterDescription
          : form.docType === 'penalty'
            ? form.penaltyContent
            : form.description,
    rectifier:
      form.docType === 'notice' || form.docType === 'reminder'
        ? form.executor
        : form.rectifier,
    assignee: form.docType === 'reminder' ? (form.executor || '项目经理') : '',
    executeDept: form.docType === 'notice' ? form.executor : '',
    snapshot: exportMergedImage(),
    cameraId: props.camera?.id,
    sourceType: props.sourceType,
    unit: form.docType === 'penalty' ? (form.unit?.trim() || '') : MOCK_NOTICE.unit,
  }
  saveScreenshotRecord(payload)
  if (form.docType === 'notice' || form.docType === 'penalty' || form.docType === 'reminder') {
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
    }
  },
)
</script>

<template>
  <el-dialog
    :model-value="visible"
    :title="showForm ? '添加问题' : '截屏标记'"
    width="920px"
    top="5vh"
    destroy-on-close
    append-to-body
    class="screenshot-mark-dialog"
    modal-class="screenshot-mark-modal"
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
                reminder: opt.value === 'reminder',
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
          <aside class="form-preview">
            <div class="preview-label">标记截图</div>
            <div class="preview-thumb">
              <img v-if="previewUrl" :src="previewUrl" alt="截屏预览" class="preview-img" />
              <div v-else class="preview-placeholder">
                <el-icon :size="28" color="#909399"><VideoCamera /></el-icon>
                <span>暂无预览</span>
              </div>
            </div>
          </aside>

          <section class="form-fields-panel">
            <div class="form-context">{{ formContextText }}</div>

            <el-form label-width="88px" size="default" class="issue-fields">
              <template v-if="form.docType === 'notice'">
                <el-form-item label="项目名称" required>
                  <el-select
                    v-model="form.projectName"
                    filterable
                    allow-create
                    default-first-option
                    :popper-class="MARK_POPPER_CLASS"
                    placeholder="选择或输入项目名称"
                    style="width: 100%"
                  >
                    <el-option v-for="item in projectOptions" :key="item" :label="item" :value="item" />
                  </el-select>
                </el-form-item>
                <el-form-item label="工作类型" required>
                  <el-input v-model="form.workType" placeholder="如：安全检查、质量复检" />
                </el-form-item>
                <el-form-item label="工作要求" required>
                  <el-input
                    v-model="form.workRequirement"
                    type="textarea"
                    :rows="4"
                    placeholder="请描述工作要求，将作为任务单正文"
                  />
                </el-form-item>
                <el-form-item label="执行人" required>
                  <el-select
                    v-model="form.executor"
                    filterable
                    allow-create
                    default-first-option
                    :popper-class="MARK_POPPER_CLASS"
                    placeholder="选择或输入执行人"
                    style="width: 100%"
                  >
                    <el-option
                      v-for="item in executorOptions"
                      :key="item.value"
                      :label="item.value"
                      :value="item.value"
                    />
                  </el-select>
                </el-form-item>
                <el-form-item label="完成时限" required>
                  <el-date-picker
                    v-model="form.deadline"
                    type="date"
                    value-format="YYYY-MM-DD"
                    :popper-class="MARK_POPPER_CLASS"
                    placeholder="选择完成时限"
                    style="width: 100%"
                  />
                </el-form-item>
                <el-form-item label="备注">
                  <el-input v-model="form.remark" type="textarea" :rows="2" placeholder="选填" />
                </el-form-item>
              </template>

              <template v-else-if="form.docType === 'reminder'">
                <el-form-item label="项目名称" required>
                  <el-select
                    v-model="form.projectName"
                    filterable
                    allow-create
                    default-first-option
                    :popper-class="MARK_POPPER_CLASS"
                    placeholder="选择或输入项目名称"
                    style="width: 100%"
                  >
                    <el-option v-for="item in projectOptions" :key="item" :label="item" :value="item" />
                  </el-select>
                </el-form-item>
                <el-form-item label="事项描述" required>
                  <el-input
                    v-model="form.matterDescription"
                    type="textarea"
                    :rows="4"
                    placeholder="请描述提示事项，将作为提示函正文"
                  />
                </el-form-item>
                <el-form-item label="指派人" required>
                  <el-select
                    v-model="form.executor"
                    filterable
                    allow-create
                    default-first-option
                    :popper-class="MARK_POPPER_CLASS"
                    placeholder="默认：项目经理"
                    style="width: 100%"
                  >
                    <el-option
                      v-for="item in executorOptions"
                      :key="item.value"
                      :label="item.value"
                      :value="item.value"
                    />
                  </el-select>
                </el-form-item>
                <el-form-item label="完成时限" required>
                  <el-date-picker
                    v-model="form.deadline"
                    type="date"
                    value-format="YYYY-MM-DD"
                    :popper-class="MARK_POPPER_CLASS"
                    placeholder="选择完成时限"
                    style="width: 100%"
                  />
                </el-form-item>
              </template>

              <template v-else-if="form.docType === 'penalty'">
                <el-form-item label="项目名称" required>
                  <el-select
                    v-model="form.projectName"
                    filterable
                    allow-create
                    default-first-option
                    :popper-class="MARK_POPPER_CLASS"
                    placeholder="选择或输入项目名称"
                    style="width: 100%"
                  >
                    <el-option v-for="item in projectOptions" :key="item" :label="item" :value="item" />
                  </el-select>
                </el-form-item>
                <el-form-item label="责任单位" required>
                  <el-input v-model="form.unit" placeholder="如：中建三局（施工总承包）" />
                </el-form-item>
                <el-form-item label="事由" required>
                  <el-input v-model="form.penaltyReason" placeholder="如：塔吊作业区警戒标识不足" />
                </el-form-item>
                <el-form-item label="内容" required>
                  <el-input
                    v-model="form.penaltyContent"
                    type="textarea"
                    :rows="4"
                    placeholder="请描述处罚内容，将作为处罚单正文"
                  />
                </el-form-item>
              </template>

              <template v-else>
                <el-form-item label="隐患描述" required>
                  <el-input
                    v-model="form.description"
                    type="textarea"
                    :rows="4"
                    :placeholder="form.docType === 'safety' ? '请描述发现的安全隐患' : '请描述发现的质量隐患'"
                  />
                </el-form-item>
                <el-form-item label="等级" required>
                  <el-radio-group v-model="form.hazardLevel">
                    <el-radio v-for="item in HAZARD_LEVELS" :key="item" :value="item">{{ item }}</el-radio>
                  </el-radio-group>
                </el-form-item>
                <el-form-item label="整改人" required>
                  <el-select
                    v-model="form.rectifier"
                    :popper-class="MARK_POPPER_CLASS"
                    placeholder="选择整改人"
                    style="width: 100%"
                  >
                    <el-option v-for="name in HAZARD_REPORTERS" :key="name" :label="name" :value="name" />
                  </el-select>
                </el-form-item>
                <el-form-item label="整改期限" required>
                  <el-date-picker
                    v-model="form.hazardDeadline"
                    type="date"
                    value-format="YYYY-MM-DD"
                    :popper-class="MARK_POPPER_CLASS"
                    placeholder="选择整改期限"
                    style="width: 100%"
                  />
                </el-form-item>
              </template>
            </el-form>
          </section>
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
  font-size: calc(13px + var(--coc-font-boost));
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
  font-size: calc(13px + var(--coc-font-boost));
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
  font-size: calc(13px + var(--coc-font-boost));
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

.doc-tab-btn.active.reminder {
  border-color: #909399;
  background: rgba(144, 147, 153, 0.12);
  color: #606266;
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
  grid-template-columns: 220px minmax(0, 1fr);
  gap: 20px;
  align-items: start;
}

.form-preview {
  display: flex;
  flex-direction: column;
  gap: 8px;
  position: sticky;
  top: 0;
}

.preview-label {
  font-size: calc(13px + var(--coc-font-boost));
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
  font-size: calc(12px + var(--coc-font-boost));
  text-align: center;
  padding: 8px;
}

.form-fields-panel {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.form-context {
  padding: 8px 12px;
  border-radius: 8px;
  background: #faf8f6;
  font-size: calc(12px + var(--coc-font-boost));
  color: var(--coc-text-secondary);
  line-height: 1.5;
}

.issue-fields :deep(.el-form-item) {
  margin-bottom: 16px;
}

.issue-fields :deep(.el-form-item:last-child) {
  margin-bottom: 0;
}

.issue-fields :deep(.el-textarea__inner),
.issue-fields :deep(.el-input__wrapper),
.issue-fields :deep(.el-select),
.issue-fields :deep(.el-date-editor) {
  width: 100%;
}
</style>

<style>
.screenshot-mark-dialog .el-dialog__body {
  padding-top: 12px;
  max-height: calc(100vh - 180px);
  overflow: auto;
}
</style>
