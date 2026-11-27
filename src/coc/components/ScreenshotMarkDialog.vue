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
  MOCK_NOTICE,
  buildProjects,
} from '../mock/data.js'
import { saveScreenshotRecord } from '../utils/videoStorage.js'
import {
  saveDispatchDocFromScreenshot,
  issueDispatchNoticeRecord,
  issueDispatchReminderRecord,
  issueDispatchPenaltyRecord,
} from '../utils/dispatchMeetingStorage.js'
import { buildExecutorOptions } from '../utils/executorDisplay.js'
import { taskWorkTypeOptions } from '../config/screenshotTaskOrderFields.js'
import { TASK_EXECUTION_MODES, TASK_EXECUTION_MODE_OPTIONS } from '../utils/dispatchTaskWorkflow.js'
import { getHazardLevels, getHazardCategoryOptions } from '../../config/inspectionManagement.js'
import { listInspectionPersonCandidates, getProjectRectifierLabel, getProjectReviewerLabel, getInspectionCopyDefaults } from '../../composables/useInspectionPersonConfig.js'
import InspectionPersonMultiSelect from '../../components/InspectionPersonMultiSelect.vue'
import { DISPATCH_HAZARD_TYPE_OPTIONS, getDispatchHazardTypeLabel } from '../../config/dispatchHazardTypes.js'

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
  hazardType: '',
  hazardLevel: '',
  hazardCategory: '',
  rectifyRequirement: '',
  reviewer: '',
  issueCcPersons: [],
  completionCcPersons: [],
  hazardDeadline: '',
  workType: '',
  workRequirement: '',
  executor: '',
  executors: [],
  executionMode: TASK_EXECUTION_MODES.SINGLE,
  assignees: [],
  deadline: '',
  remark: '',
  matterDescription: '',
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
  { value: 'hazard', label: '隐患' },
]

const isDispatchDoc = computed(() => form.docType !== 'hazard')
const currentProjectName = computed(() => (props.project?.shortName || props.project?.name || '').trim())
const registrationProjectName = computed(() => isDispatchDoc.value ? form.projectName : currentProjectName.value)
const hazardTypeLabel = computed(() => getDispatchHazardTypeLabel(form.hazardType))
const hazardLevelOptions = computed(() => hazardTypeLabel.value ? getHazardLevels(hazardTypeLabel.value) : [])
const hazardCategoryOptions = computed(() => hazardTypeLabel.value ? getHazardCategoryOptions(hazardTypeLabel.value) : [])
const inspectorOptions = listInspectionPersonCandidates().map((person) => `${person.name}（${person.role}）`)
/** 与巡检新增隐患一致：整改人 / 复查人 / 抄送默认取巡检人员配置。 */
function applyInspectionDefaults() {
  const category = hazardTypeLabel.value || '安全'
  const project = currentProjectName.value
  const copyDefaults = getInspectionCopyDefaults(project, category)
  form.rectifier = form.rectifier || getProjectRectifierLabel(project, category)
  form.reviewer = form.reviewer || getProjectReviewerLabel(project, category)
  if (!form.issueCcPersons.length) form.issueCcPersons = [...(copyDefaults.issueCcPersons || [])]
  if (!form.completionCcPersons.length) form.completionCcPersons = [...(copyDefaults.completionCcPersons || [])]
}
watch(currentProjectName, () => {
  if (props.visible && hazardTypeLabel.value) onHazardTypeChange()
})

/** 切换隐患类型时，按当前项目和类型重新带入人员配置。 */
function onHazardTypeChange() {
  form.hazardCategory = ''
  form.hazardLevel = ''
  form.rectifier = ''
  form.reviewer = ''
  form.issueCcPersons = []
  form.completionCcPersons = []
  applyInspectionDefaults()
}

const formContextText = computed(() =>
  [registrationProjectName.value, form.cameraName, form.cameraLocation].filter(Boolean).join(' · ') || '--',
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
  form.projectName = currentProjectName.value
  form.cameraName = props.camera?.name || ''
  form.cameraLocation = props.camera?.location || guessCameraLocation(props.camera?.name)
  form.description = ''
  form.rectifier = ''
  form.hazardType = ''
  form.hazardLevel = ''
  form.hazardCategory = ''
  form.rectifyRequirement = ''
  form.reviewer = ''
  form.issueCcPersons = []
  form.completionCcPersons = []
  form.hazardDeadline = defaultDeadline()
  form.workType = ''
  form.workRequirement = ''
  form.executor = ''
  form.executors = []
  form.executionMode = TASK_EXECUTION_MODES.SINGLE
  form.assignees = []
  form.deadline = defaultDeadline()
  form.remark = ''
  form.matterDescription = ''
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
  return merged.toDataURL('image/jpeg', 0.85)
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

function handleSubmit(issueNow = false) {
  if (form.docType === 'notice') {
    if (!form.projectName.trim()) {
      ElMessage.warning('请填写项目名称')
      return
    }
    if (!form.workType.trim()) {
      ElMessage.warning('请选择工作类型')
      return
    }
    if (!form.workRequirement.trim()) {
      ElMessage.warning('请填写工作要求')
      return
    }
    if (!form.executors?.length) {
      ElMessage.warning('请填写执行人')
      return
    }
    if (!TASK_EXECUTION_MODE_OPTIONS.includes(form.executionMode)) {
      ElMessage.warning('请选择执行模式')
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
    if (!form.assignees?.length) {
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
    if (!form.workType.trim()) {
      ElMessage.warning('请选择类型')
      return
    }
    if (!form.penaltyContent.trim()) {
      ElMessage.warning('请填写处罚内容')
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
  } else {
    if (!currentProjectName.value) {
      ElMessage.warning('未获取到当前调度项目，请重新打开问题截图')
      return
    }
    if (!hazardTypeLabel.value) {
      ElMessage.warning('请选择隐患类型')
      return
    }
    if (!form.description.trim()) {
      ElMessage.warning('请填写隐患描述')
      return
    }
    if (!hazardLevelOptions.value.includes(form.hazardLevel)) {
      ElMessage.warning('请选择对应的隐患等级')
      return
    }
    if (!form.hazardCategory) {
      ElMessage.warning('请选择隐患类别')
      return
    }
    if (!String(form.rectifyRequirement || '').trim()) {
      ElMessage.warning('请填写整改要求')
      return
    }
    if (!form.rectifier.trim()) {
      ElMessage.warning('请至少选择一位整改人')
      return
    }
    if (!form.reviewer.trim()) {
      ElMessage.warning('请至少选择一位复查人')
      return
    }
    if (!form.hazardDeadline) {
      ElMessage.warning('请选择整改期限')
      return
    }
  }

  const noticeExecutors = form.docType === 'notice' ? form.executors.filter(Boolean) : []
  const noticeExecutorsText = noticeExecutors.join('、')
  const reminderAssignees = form.docType === 'reminder' ? form.assignees.filter(Boolean) : []
  const reminderAssigneesText = reminderAssignees.join('、')
  const payload = {
    ...form,
    docType: isDispatchDoc.value ? form.docType : form.hazardType,
    projectName: registrationProjectName.value,
    hazardLevel: isDispatchDoc.value ? '' : form.hazardLevel,
    hazardCategory: isDispatchDoc.value ? '' : form.hazardCategory,
    rectifyRequirement: isDispatchDoc.value ? '' : String(form.rectifyRequirement || '').trim(),
    reviewer: isDispatchDoc.value ? '' : form.reviewer,
    issueCcPersons: isDispatchDoc.value ? '' : (form.issueCcPersons || []).join('、'),
    completionCcPersons: isDispatchDoc.value ? '' : (form.completionCcPersons || []).join('、'),
    executors: noticeExecutors,
    executor:
      form.docType === 'notice'
        ? noticeExecutorsText
        : form.docType === 'reminder'
          ? reminderAssigneesText
          : form.executor,
    executionMode: form.executionMode,
    assignees: reminderAssignees,
    description:
      form.docType === 'notice'
        ? form.workRequirement
        : form.docType === 'reminder'
          ? form.matterDescription
          : form.docType === 'penalty'
            ? form.penaltyContent
            : form.description,
    rectifier:
      form.docType === 'notice'
        ? noticeExecutorsText
        : form.docType === 'reminder'
          ? reminderAssigneesText
          : form.docType === 'penalty'
            ? form.executor
            : form.rectifier,
    assignee:
      form.docType === 'reminder'
        ? (reminderAssigneesText || '项目经理')
        : form.docType === 'penalty'
          ? (form.executor || '项目经理')
          : '',
    executeDept: form.docType === 'notice' ? noticeExecutorsText : '',
    snapshot: previewUrl.value,
    cameraId: props.camera?.id,
    sourceType: props.sourceType,
    unit: form.docType === 'penalty' ? (form.unit?.trim() || '') : MOCK_NOTICE.unit,
    penaltyReason: form.docType === 'penalty' ? form.workType : '',
  }
  try {
    saveScreenshotRecord(payload)
  } catch (error) {
    if (error?.name !== 'QuotaExceededError') throw error
    ElMessage.error('浏览器存储空间不足，问题截图未保存')
    return
  }
  if (isDispatchDoc.value) {
    const record = saveDispatchDocFromScreenshot(form.docType, payload)
    if (issueNow && record?.id) {
      if (form.docType === 'notice') issueDispatchNoticeRecord(record.id)
      else if (form.docType === 'reminder') issueDispatchReminderRecord(record.id)
      else issueDispatchPenaltyRecord(record.id)
    }
    const docLabel = { notice: '任务单', reminder: '提示函', penalty: '处罚单' }[form.docType] || '单据'
    ElMessage.success(issueNow
      ? `${docLabel}已保存并直接下发（编号 ${record?.id || '--'}）`
      : `${docLabel}已保存（编号 ${record?.id || '--'}），可在后台点击下发操作`)
  } else {
    ElMessage.success(`${hazardTypeLabel.value}隐患已登记`)
  }
  emit('submit', payload)
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
              :class="[opt.value, { active: form.docType === opt.value }]"
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

            <el-form label-width="132px" size="default" class="issue-fields">
              <template v-if="form.docType === 'notice'">
                <el-form-item label="项目名称" required>
                  <el-select
                    v-model="form.projectName"
                    filterable
                    allow-create
                    default-first-option
                    :popper-class="MARK_POPPER_CLASS"
                    placeholder="选择或输入项目名称"
                    style="width: 100%" aria-label="选择或输入项目名称">
                    <el-option v-for="item in projectOptions" :key="item" :label="item" :value="item" />
                  </el-select>
                </el-form-item>
                <el-form-item label="工作类型" required>
                  <el-select
                    v-model="form.workType"
                    filterable
                    :popper-class="MARK_POPPER_CLASS"
                    placeholder="请选择工作类型（取自工作类型配置）"
                    style="width: 100%" aria-label="选择工作类型">
                    <el-option v-for="item in taskWorkTypeOptions" :key="item.value" :label="item.label" :value="item.value" />
                  </el-select>
                </el-form-item>
                <el-form-item label="工作要求" required>
                  <el-input
                    v-model="form.workRequirement"
                    type="textarea"
                    :rows="4"
                    placeholder="请描述工作要求，将作为任务单正文" aria-label="请描述工作要求，将作为任务单正文"/>
                </el-form-item>
                <el-form-item label="执行人" required>
                  <el-select
                    v-model="form.executors"
                    multiple
                    filterable
                    allow-create
                    default-first-option
                    :popper-class="MARK_POPPER_CLASS"
                    placeholder="选择或输入执行人（可多选）"
                    style="width: 100%" aria-label="选择或输入执行人">
                    <el-option
                      v-for="item in executorOptions"
                      :key="item.value"
                      :label="item.value"
                      :value="item.value"
                    />
                  </el-select>
                </el-form-item>
                <el-form-item label="执行模式" required>
                  <div class="execution-mode-picker execution-mode-picker--dark" role="radiogroup" aria-label="执行模式">
                    <button
                      v-for="mode in TASK_EXECUTION_MODE_OPTIONS"
                      :key="mode"
                      type="button"
                      class="execution-mode-option"
                      :class="{ active: form.executionMode === mode }"
                      role="radio"
                      :aria-checked="form.executionMode === mode"
                      @click="form.executionMode = mode"
                    >
                      <span class="mode-indicator" aria-hidden="true"></span>
                      <span class="mode-text">
                        <span class="mode-title">{{ mode }}</span>
                        <span class="mode-desc">{{ mode === '单人执行' ? '任一执行人办结即关闭' : '全部执行人办结才关闭' }}</span>
                      </span>
                    </button>
                  </div>
                </el-form-item>
                <el-form-item label="完成时限" required>
                  <el-date-picker
                    v-model="form.deadline"
                    type="date"
                    value-format="YYYY-MM-DD"
                    :popper-class="MARK_POPPER_CLASS"
                    placeholder="选择完成时限"
                    style="width: 100%" aria-label="选择完成时限"/>
                </el-form-item>
                <el-form-item label="备注">
                  <el-input v-model="form.remark" type="textarea" :rows="2" placeholder="选填" aria-label="选填"/>
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
                    style="width: 100%" aria-label="选择或输入项目名称">
                    <el-option v-for="item in projectOptions" :key="item" :label="item" :value="item" />
                  </el-select>
                </el-form-item>
                <el-form-item label="事项描述" required>
                  <el-input
                    v-model="form.matterDescription"
                    type="textarea"
                    :rows="4"
                    placeholder="请描述提示事项，将作为提示函正文" aria-label="请描述提示事项，将作为提示函正文"/>
                </el-form-item>
                <el-form-item label="指派人" required>
                  <el-select
                    v-model="form.assignees"
                    multiple
                    filterable
                    allow-create
                    default-first-option
                    :popper-class="MARK_POPPER_CLASS"
                    placeholder="默认：项目经理（可多选）"
                    style="width: 100%" aria-label="默认：项目经理">
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
                    style="width: 100%" aria-label="选择完成时限"/>
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
                    style="width: 100%" aria-label="选择或输入项目名称">
                    <el-option v-for="item in projectOptions" :key="item" :label="item" :value="item" />
                  </el-select>
                </el-form-item>
                <el-form-item label="类型" required>
                  <el-select
                    v-model="form.workType"
                    filterable
                    :popper-class="MARK_POPPER_CLASS"
                    placeholder="请选择类型（取自工作类型配置）"
                    style="width: 100%" aria-label="选择类型">
                    <el-option v-for="item in taskWorkTypeOptions" :key="item.value" :label="item.label" :value="item.value" />
                  </el-select>
                </el-form-item>
                <el-form-item label="处罚内容" required>
                  <el-input
                    v-model="form.penaltyContent"
                    type="textarea"
                    :rows="4"
                    placeholder="请描述处罚内容，将作为处罚单正文" aria-label="请描述处罚内容，将作为处罚单正文"/>
                </el-form-item>
                <el-form-item label="指派人" required>
                  <el-select
                    v-model="form.executor"
                    filterable
                    allow-create
                    default-first-option
                    :popper-class="MARK_POPPER_CLASS"
                    placeholder="选择或输入指派人"
                    style="width: 100%" aria-label="选择或输入指派人">
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
                    style="width: 100%" aria-label="选择完成时限"/>
                </el-form-item>
              </template>

              <template v-else>
                <el-form-item label="项目名称" required>
                  <el-input :model-value="currentProjectName" readonly aria-label="项目名称" />
                </el-form-item>
                <el-form-item label="隐患类型" required>
                  <el-select
                    v-model="form.hazardType"
                    :popper-class="MARK_POPPER_CLASS"
                    placeholder="请选择隐患类型"
                    aria-label="隐患类型"
                    @change="onHazardTypeChange"
                  >
                    <el-option v-for="item in DISPATCH_HAZARD_TYPE_OPTIONS" :key="item.value" :label="item.label" :value="item.value" />
                  </el-select>
                </el-form-item>
                <el-form-item label="隐患类别" required>
                  <el-select
                    v-model="form.hazardCategory"
                    :disabled="!hazardTypeLabel"
                    filterable
                    :popper-class="MARK_POPPER_CLASS"
                    :placeholder="hazardTypeLabel ? '请选择隐患类别' : '请先选择隐患类型'"
                    aria-label="隐患类别"
                  >
                    <el-option v-for="item in hazardCategoryOptions" :key="item.value" :label="item.label" :value="item.value" />
                  </el-select>
                </el-form-item>
                <el-form-item label="隐患描述" required>
                  <el-input
                    v-model="form.description"
                    type="textarea"
                    :rows="4"
                    placeholder="请输入隐患描述"
                    aria-label="隐患描述"
                  />
                </el-form-item>
                <el-form-item label="整改要求" required>
                  <el-input
                    v-model="form.rectifyRequirement"
                    type="textarea"
                    :rows="3"
                    placeholder="请填写整改要求"
                    aria-label="整改要求"
                  />
                </el-form-item>
                <el-form-item label="隐患等级" required>
                  <el-select
                    v-model="form.hazardLevel"
                    :disabled="!hazardTypeLabel"
                    :popper-class="MARK_POPPER_CLASS"
                    :placeholder="hazardTypeLabel ? '请选择隐患等级' : '请先选择隐患类型'"
                    aria-label="隐患等级"
                  >
                    <el-option v-for="item in hazardLevelOptions" :key="item" :label="item" :value="item" />
                  </el-select>
                </el-form-item>
                <el-form-item label="整改人" required>
                  <InspectionPersonMultiSelect
                    v-model="form.rectifier"
                    :options="inspectorOptions"
                    :popper-class="MARK_POPPER_CLASS"
                    collapse-tags
                    collapse-tags-tooltip
                    placeholder="请选择整改人（可多选）"
                    aria-label="选择整改人"
                  />
                </el-form-item>
                <el-form-item label="复查人" required>
                  <InspectionPersonMultiSelect
                    v-model="form.reviewer"
                    :options="inspectorOptions"
                    :popper-class="MARK_POPPER_CLASS"
                    collapse-tags
                    collapse-tags-tooltip
                    placeholder="请选择复查人（可多选）"
                    aria-label="选择复查人"
                  />
                </el-form-item>
                <el-form-item label="下发整改单抄送">
                  <el-select v-model="form.issueCcPersons" multiple filterable collapse-tags collapse-tags-tooltip :popper-class="MARK_POPPER_CLASS" placeholder="可不选，多人" style="width: 100%" aria-label="下发整改单抄送">
                    <el-option v-for="name in inspectorOptions" :key="name" :label="name" :value="name" />
                  </el-select>
                </el-form-item>
                <el-form-item label="整改单完成抄送">
                  <el-select v-model="form.completionCcPersons" multiple filterable collapse-tags collapse-tags-tooltip :popper-class="MARK_POPPER_CLASS" placeholder="可不选，多人" style="width: 100%" aria-label="整改单完成抄送">
                    <el-option v-for="name in inspectorOptions" :key="name" :label="name" :value="name" />
                  </el-select>
                </el-form-item>
                <el-form-item label="整改期限" required>
                  <el-date-picker
                    v-model="form.hazardDeadline"
                    type="date"
                    value-format="YYYY-MM-DD"
                    :popper-class="MARK_POPPER_CLASS"
                    placeholder="选择整改期限"
                    style="width: 100%" aria-label="选择整改期限"/>
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
        <template v-if="isDispatchDoc">
          <el-button @click="handleSubmit(false)">保存到后台</el-button>
          <el-button type="primary" @click="handleSubmit(true)">直接下发</el-button>
        </template>
        <el-button v-else type="primary" @click="handleSubmit(false)">提交隐患</el-button>
      </template>
    </template>
  </el-dialog>
</template>

<style scoped>
/* 表单标签（如「下发整改单抄送」「整改单完成抄送」）不允许换行，避免竖排 */
.issue-fields :deep(.el-form-item__label) {
  white-space: nowrap;
  line-height: 1.4;
}
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
  gap: 18px;
  padding: 2px 2px 4px;
}

.form-main {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.doc-type-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 2px 2px 16px;
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

.doc-tab-btn.active.hazard {
  border-color: #e6a23c;
  background: rgba(230, 162, 60, 0.1);
  color: #e6a23c;
  font-weight: 600;
}

.form-body {
  display: grid;
  grid-template-columns: 236px minmax(0, 1fr);
  gap: 20px;
  align-items: start;
}

.form-preview {
  display: flex;
  flex-direction: column;
  gap: 10px;
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
  gap: 14px;
}

.form-context {
  padding: 10px 14px;
  border-radius: 8px;
  background: #faf8f6;
  font-size: calc(12px + var(--coc-font-boost));
  color: var(--coc-text-secondary);
  line-height: 1.5;
}

.issue-fields :deep(.el-form-item) {
  margin-bottom: 18px;
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

.work-type-tags {
  display: inline-flex;
  gap: 8px;
  --work-type-color: var(--coc-accent, var(--ap-primary, var(--el-color-primary)));
}

.work-type-tags :deep(.el-radio-button__inner) {
  height: 32px;
  padding: 0 16px;
  border-radius: 999px !important;
  border: 1px solid var(--coc-border, var(--el-border-color, #dcdfe6)) !important;
  background: transparent;
  box-shadow: none;
  color: var(--coc-text-secondary, var(--ap-text-secondary, #606266));
  font-weight: 500;
  transition: color 0.2s ease, border-color 0.2s ease;
}

.work-type-tags :deep(.el-radio-button:first-child .el-radio-button__inner),
.work-type-tags :deep(.el-radio-button:last-child .el-radio-button__inner) {
  border-radius: 999px !important;
}

.work-type-tags :deep(.el-radio-button__inner:hover) {
  color: var(--work-type-color);
  border-color: var(--work-type-color) !important;
}

.work-type-tags :deep(.el-radio-button__original-radio:checked + .el-radio-button__inner) {
  background: transparent;
  border-color: var(--work-type-color) !important;
  color: var(--work-type-color);
  box-shadow: none;
  font-weight: 600;
}

/* 执行模式单选卡片（深色弹窗内） */
.execution-mode-picker {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  width: 100%;
}

.execution-mode-option {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  min-width: 0;
  padding: 8px 10px;
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.04);
  text-align: left;
  cursor: pointer;
  font-family: inherit;
  transition: border-color 0.18s ease, background 0.18s ease, box-shadow 0.18s ease;
}

.execution-mode-option:hover {
  border-color: #7db3ff;
  background: rgba(125, 179, 255, 0.1);
}

.execution-mode-option.active {
  border-color: #7db3ff;
  background: rgba(125, 179, 255, 0.14);
  box-shadow: 0 0 0 1px rgba(125, 179, 255, 0.3) inset;
}

.mode-indicator {
  position: relative;
  flex-shrink: 0;
  width: 12px;
  height: 12px;
  margin-top: 3px;
  border: 2px solid rgba(255, 255, 255, 0.35);
  border-radius: 50%;
  transition: border-color 0.18s ease;
}

.execution-mode-option.active .mode-indicator {
  border-color: #7db3ff;
}

.execution-mode-option.active .mode-indicator::after {
  content: '';
  position: absolute;
  inset: 2px;
  border-radius: 50%;
  background: #7db3ff;
}

.mode-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.mode-title {
  font-size: 13px;
  font-weight: 600;
  color: #eaf2ff;
  line-height: 1.4;
}

.mode-desc {
  font-size: 12px;
  color: rgba(234, 242, 255, 0.62);
  line-height: 1.35;
}
</style>

<style>
.screenshot-mark-dialog .el-dialog__body {
  padding-top: 12px;
  max-height: calc(100vh - 180px);
  overflow: auto;
}

.screenshot-mark-dialog .el-dialog__footer {
  padding: 14px 20px 18px;
}
</style>
