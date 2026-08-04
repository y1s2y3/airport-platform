<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import QmCompletePrereqPanel from './QmCompletePrereqPanel.vue'
import QmArchivePanel from './QmArchivePanel.vue'
import {
  addAttachment,
  approvalRecords,
  buildCompleteGate,
  checkArchiveBlock,
  createRectify,
  decideReinspect,
  ensureTaskItems,
  FILE_CATEGORY,
  findTask,
  getApprovalChain,
  getAttachments,
  getItemsByTaskId,
  getNextApprovalRole,
  getPassedApprovalRoles,
  getSpecialAcceptType,
  getArchiveInstance,
  getTaskMaterialLinks,
  getTaskSampleLinks,
  missingPhotoItems,
  missingSpecialRequiredDocs,
  removeAttachment,
  resolveProjectName,
  saveRectifyMeasure,
  saveTaskDraft,
  specialTypeLabel,
  submitInspect,
  submitReinspectRequest,
  TASK_STATUS,
  TASK_TYPE_LABEL,
  findRectify,
  rectificationOrders,
  taskMaterialLinks,
  taskSampleLinks,
  updateCompleteTaskMeta,
  wbsNodes,
} from '../../../mock/qm.js'

const props = defineProps({
  title: { type: String, default: '验评填报' },
  listPath: { type: String, required: true },
  approvePath: { type: String, required: true },
  /** 指定任务 ID（优先于路由 query） */
  taskId: { type: String, default: '' },
  /** 嵌入父页：去掉返回列表与外层重复标题 */
  embedded: { type: Boolean, default: false },
  /** 嵌入时由父页展示前置情况，本组件不再重复 */
  hidePrereq: { type: Boolean, default: false },
})

const route = useRoute()
const router = useRouter()
const task = ref(null)
const items = ref([])
const rectifyMeasure = ref('')
const rejectOpinion = ref('')
const activeTpl = ref('')
const formDataLocal = ref({})
/** 触发现场资料列表刷新 */
const siteAttTick = ref(0)
/** 触发③材料/定样关联区块刷新 */
const linkTick = ref(0)
/** 填报三步向导当前步（0 系统数据 / 1 档案 / 2 审批流程确认） */
const activeStep = ref(0)
let lastLoadedId = ''
/** 竣工表头：部位/备注 */
const completeMeta = reactive({
  location_name: '',
  remark: '',
})

function load() {
  const id = props.taskId || route.query.id
  if (id !== lastLoadedId) {
    lastLoadedId = id
    activeStep.value = 0
  }
  task.value = id ? findTask(id) : null
  if (!task.value) return
  ensureTaskItems(task.value)
  items.value = getItemsByTaskId(task.value.id).map((i) => ({ ...i }))
  formDataLocal.value = JSON.parse(JSON.stringify(task.value.form_data || {}))
  const tplIds = [...new Set(items.value.map((i) => i.form_template_id).filter(Boolean))]
  activeTpl.value = tplIds[0] || task.value.form_template_id || ''
  if (activeTpl.value && !formDataLocal.value[activeTpl.value]) {
    formDataLocal.value[activeTpl.value] = {}
  }
  const rectify = task.value.current_rectify_id
    ? findRectify(task.value.current_rectify_id)
    : rectificationOrders.find((r) => r.source_task_id === task.value.id && r.status !== 3)
  rectifyMeasure.value = rectify?.measure || ''
  completeMeta.location_name = task.value.location_name || ''
  completeMeta.remark = task.value.remark || ''
}

function formatFirstPass(flag) {
  if (flag == null || flag === '') return ''
  return Number(flag) === 1 ? '是' : '否'
}

watch(() => [props.taskId, route.query.id], load, { immediate: true })

watch(activeTpl, (id) => {
  if (!id) return
  if (!formDataLocal.value[id]) formDataLocal.value[id] = {}
})

function syncCompleteMeta() {
  if (!task.value || Number(task.value.task_type) !== 7) return { ok: true }
  return updateCompleteTaskMeta(task.value, {
    location_name: completeMeta.location_name,
    remark: completeMeta.remark,
  })
}

const nodeName = computed(() => {
  if (!task.value?.wbs_node_id) {
    return task.value?.special_type ? specialTypeLabel(task.value.special_type) : '—'
  }
  return wbsNodes.find((n) => n.id === task.value?.wbs_node_id)?.node_name || '—'
})

const records = computed(() =>
  task.value ? approvalRecords.filter((r) => r.task_id === task.value.id) : [],
)

/** 页头档案摘要（Q12 一任务一档案文档） */
const archiveBrief = computed(() => {
  if (!task.value) return '未登记'
  const inst = getArchiveInstance(task.value.id)
  return inst ? `已登记 ${inst.archive_doc_id}` : '未登记'
})

/** 按验收类型的默认审批流程：施工报验 → 审批链 → 办结 */
const flowSteps = computed(() => {
  if (!task.value) return []
  const chain = getApprovalChain(task.value)
  const typeLabel = TASK_TYPE_LABEL[task.value.task_type] || '验评'
  return [
    { title: '施工报验', desc: '自检提交' },
    ...chain.map((role) => ({ title: role, desc: '审核签章' })),
    { title: '办结通过', desc: typeLabel },
  ]
})

const flowActive = computed(() => {
  if (!task.value) return 0
  const t = task.value
  const chain = getApprovalChain(t)
  const end = chain.length + 2
  if (Number(t.status) === 0) return 0
  if (Number(t.status) === 2) return end
  if (Number(t.status) === 1) {
    const next = getNextApprovalRole(t)
    const idx = next ? chain.indexOf(next) : chain.length
    return 1 + Math.max(0, idx)
  }
  // 不通过 / 整改 / 待复验：停在已通过节点之后
  const passed = getPassedApprovalRoles(t.id).length
  return Math.min(1 + passed, end - 1)
})

const flowProcessStatus = computed(() => {
  const s = Number(task.value?.status)
  if ([3, 4, 5].includes(s)) return 'error'
  if (s === 2) return 'success'
  return 'process'
})

const flowTip = computed(() => {
  if (!task.value) return ''
  const typeLabel = TASK_TYPE_LABEL[task.value.task_type] || '验评'
  const chain = getApprovalChain(task.value)
  const path = ['施工报验', ...chain, '办结通过'].join(' → ')
  const critical =
    task.value.task_type === 1 && task.value.owner_final_required === 1
      ? '（关键检验批含业主/总监终审）'
      : ''
  return `${typeLabel}默认流程${critical}：${path}`
})

const canEdit = computed(() => Number(task.value?.status) === 0)

/** 第 3 步：提交前核对清单（与 submitInspect 拦截口径一致，实时联动） */
const submitChecklist = computed(() => {
  void siteAttTick.value
  void linkTick.value
  if (!task.value) return []
  const t = task.value
  const inst = getArchiveInstance(t.id)
  const archiveBlock = checkArchiveBlock(t)
  const siteCount = getAttachments('TASK', t.id).filter((a) =>
    [1, 2, 3].includes(Number(a.file_category)),
  ).length
  const rows = [
    {
      label: '档案系统数据登记',
      ok: !archiveBlock.blocked,
      desc: inst
        ? `已登记（${inst.archive_doc_id}）`
        : archiveBlock.blocked
          ? '节点配置了需填报档案文件，请先在第 2 步完成登记'
          : '本节点未配置需填报档案文件，可直接提交',
    },
    {
      label: '工程影像 / 附件资料（默认必填）',
      ok: siteCount > 0,
      desc: siteCount > 0 ? `已上传 ${siteCount} 份` : '尚未上传现场影像或附件（第 1 步上传）',
    },
  ]
  if (Number(t.task_type) === 6 && specialRequiredDocs.value.length) {
    const miss = specialDocsMissing.value
    rows.push({
      label: '专项必传资料',
      ok: !miss.length,
      desc: miss.length ? `缺：${miss.map((d) => d.label).join('、')}` : '已全部上传',
    })
  }
  const missPhoto = missingPhotoItems(t.id)
  rows.push({
    label: '必拍影像检查项',
    ok: !missPhoto.length,
    desc: missPhoto.length ? `缺：${missPhoto.map((i) => i.item_name).join('、')}` : '无缺失',
  })
  return rows
})

const currentRectify = computed(() => {
  if (!task.value?.current_rectify_id) return null
  return findRectify(task.value.current_rectify_id)
})

/** 竣工填报页顶部：实体/专项完成情况 */
const completeGate = computed(() => {
  if (props.hidePrereq) return null
  if (!task.value || Number(task.value.task_type) !== 7) return null
  return buildCompleteGate(task.value.project_id)
})

const isCompleteTask = computed(() => Number(task.value?.task_type) === 7)

/** 任务级现场资料 */
const taskSiteAttachments = computed(() => {
  void siteAttTick.value
  if (!task.value) return []
  return getAttachments('TASK', task.value.id)
})

const siteMediaList = computed(() =>
  taskSiteAttachments.value.filter((a) => [1, 2].includes(Number(a.file_category))),
)

const siteMaterialList = computed(() =>
  taskSiteAttachments.value.filter((a) => ![1, 2].includes(Number(a.file_category)) && !a.doc_slot),
)

/** 专项类型必传资料 */
const specialTypeMeta = computed(() =>
  task.value?.special_type ? getSpecialAcceptType(task.value.special_type) : null,
)

const specialRequiredDocs = computed(() => specialTypeMeta.value?.requiredDocs || [])

const specialDocStatus = computed(() => {
  void siteAttTick.value
  if (!task.value) return []
  const atts = getAttachments('TASK', task.value.id)
  return specialRequiredDocs.value.map((doc) => {
    const file = atts.find((a) => a.doc_slot === doc.slot)
    return { ...doc, file: file || null, uploaded: !!file }
  })
})

const specialDocsMissing = computed(() =>
  task.value ? missingSpecialRequiredDocs(task.value, getAttachments('TASK', task.value.id)) : [],
)

function onAddSpecialDoc(doc) {
  if (!task.value || !doc?.slot) return
  const existing = getAttachments('TASK', task.value.id).find((a) => a.doc_slot === doc.slot)
  if (existing) {
    removeAttachment(existing.id)
  }
  const r = addAttachment({
    biz_type: 'TASK',
    biz_id: task.value.id,
    task_id: task.value.id,
    file_category: 10,
    doc_slot: doc.slot,
    file_name: `${doc.label}.pdf`,
    file_ext: 'pdf',
    file_size: 520_000,
    mime_type: 'application/pdf',
  })
  if (!r.ok) return ElMessage.error(r.msg)
  siteAttTick.value += 1
  ElMessage.success(`已上传「${doc.label}」`)
}

function formatFileSize(size) {
  const n = Number(size) || 0
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / 1024 / 1024).toFixed(1)} MB`
}

function isVideoExt(ext) {
  return ['mp4', 'mov', 'avi', 'wmv', 'webm'].includes(String(ext || '').toLowerCase())
}

function onAddSiteMedia(kind) {
  if (!task.value) return
  const isVideo = kind === 'video'
  const seq = siteMediaList.value.length + 1
  const file_ext = isVideo ? 'mp4' : 'jpg'
  const r = addAttachment({
    biz_type: 'TASK',
    biz_id: task.value.id,
    task_id: task.value.id,
    file_category: isVideo ? 2 : 1,
    file_name: isVideo ? `现场短视频-${seq}.${file_ext}` : `工程影像-${seq}.${file_ext}`,
    file_ext,
    file_size: isVideo ? 5_200_000 : 320_000,
    mime_type: isVideo ? 'video/mp4' : 'image/jpeg',
    shoot_time: new Date().toISOString().slice(0, 19).replace('T', ' '),
    shoot_location: task.value.location_name || '',
  })
  if (!r.ok) return ElMessage.error(r.msg)
  siteAttTick.value += 1
  ElMessage.success(isVideo ? '已上传现场短视频' : '已上传工程影像')
}

function onAddSiteMaterial() {
  if (!task.value) return
  const seq = siteMaterialList.value.length + 1
  const samples = [
    { name: `材料合格证-${seq}.pdf`, ext: 'pdf', mime: 'application/pdf', size: 480_000 },
    { name: `进场报验单-${seq}.docx`, ext: 'docx', mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', size: 96_000 },
    { name: `检测报告-${seq}.xlsx`, ext: 'xlsx', mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', size: 128_000 },
  ]
  const sample = samples[(seq - 1) % samples.length]
  const r = addAttachment({
    biz_type: 'TASK',
    biz_id: task.value.id,
    task_id: task.value.id,
    file_category: 3,
    file_name: sample.name,
    file_ext: sample.ext,
    file_size: sample.size,
    mime_type: sample.mime,
  })
  if (!r.ok) return ElMessage.error(r.msg)
  siteAttTick.value += 1
  ElMessage.success('已上传材料附件')
}

function onRemoveSiteAtt(row) {
  const r = removeAttachment(row.id)
  if (!r.ok) return ElMessage.error(r.msg)
  siteAttTick.value += 1
  ElMessage.success('已删除')
}

/** ③材料/定版定样关联（可选区块） */
const materialLinks = computed(() => {
  void linkTick.value
  return task.value ? getTaskMaterialLinks(task.value.id) : []
})
const sampleLinks = computed(() => {
  void linkTick.value
  return task.value ? getTaskSampleLinks(task.value.id) : []
})

const MATERIAL_POOL = [
  { material_id: 'mat-001', material_name: 'HRB400E 螺纹钢 Φ25', batch_no: 'PC-20260801-01', supplier: '某钢铁集团' },
  { material_id: 'mat-003', material_name: '商品混凝土 C40', batch_no: 'PC-20260801-02', supplier: '某拌合站' },
  { material_id: 'mat-004', material_name: 'SBS 防水卷材 4mm', batch_no: 'PC-20260801-03', supplier: '某防水材料厂' },
]
const SAMPLE_POOL = [
  { sample_id: 'spl-003', sample_name: '砌体样板段封样', sample_category: '工艺样板' },
  { sample_id: 'spl-004', sample_name: '机电管线综合排布定版', sample_category: '定版' },
]

function onLinkMaterial() {
  if (!task.value) return
  const linked = new Set(materialLinks.value.map((l) => l.material_id))
  const candidate = MATERIAL_POOL.find((m) => !linked.has(m.material_id)) || MATERIAL_POOL[0]
  taskMaterialLinks.push({
    id: `tml-${Date.now()}`,
    task_id: task.value.id,
    ...candidate,
    link_time: new Date().toISOString().slice(0, 19).replace('T', ' '),
  })
  linkTick.value += 1
  ElMessage.success(`已关联材料「${candidate.material_name}」`)
}

function onUnlinkMaterial(row) {
  const idx = taskMaterialLinks.findIndex((l) => l.id === row.id)
  if (idx >= 0) taskMaterialLinks.splice(idx, 1)
  linkTick.value += 1
  ElMessage.success('已解除关联')
}

function onLinkSample() {
  if (!task.value) return
  const linked = new Set(sampleLinks.value.map((l) => l.sample_id))
  const candidate = SAMPLE_POOL.find((s) => !linked.has(s.sample_id)) || SAMPLE_POOL[0]
  taskSampleLinks.push({
    id: `tsl-${Date.now()}`,
    task_id: task.value.id,
    ...candidate,
    link_time: new Date().toISOString().slice(0, 19).replace('T', ' '),
  })
  linkTick.value += 1
  ElMessage.success(`已关联定样「${candidate.sample_name}」`)
}

function onUnlinkSample(row) {
  const idx = taskSampleLinks.findIndex((l) => l.id === row.id)
  if (idx >= 0) taskSampleLinks.splice(idx, 1)
  linkTick.value += 1
  ElMessage.success('已解除关联')
}

/** 保存草稿（§5.1：is_draft=1，不计正式任务；与档案登记互不影响 C1） */
function onSaveDraft() {
  const meta = syncCompleteMeta()
  if (!meta.ok) return ElMessage.error(meta.msg)
  const r = saveTaskDraft(task.value, {
    remark: task.value.remark,
    form_data: formDataLocal.value,
  })
  if (!r.ok) return ElMessage.error(r.msg)
  ElMessage.success('草稿已保存（不计正式任务，可先行登记档案或继续填报）')
}

function onSubmit() {
  const meta = syncCompleteMeta()
  if (!meta.ok) return ElMessage.error(meta.msg)
  task.value.form_data = JSON.parse(JSON.stringify(formDataLocal.value))
  const r = submitInspect(task.value)
  if (!r.ok) return ElMessage.error(r.msg)
  ElMessage.success('已提交报验，进入验评中')
  if (props.embedded) {
    load()
    return
  }
  router.push(`${props.approvePath}?id=${task.value.id}`)
}

/** D4：整改=审批驳回的结果；谁提交的验收流程谁来整改 */
function onIssueRectify() {
  if (!rejectOpinion.value.trim()) return ElMessage.warning('请填写问题描述')
  const r = createRectify(task.value, rejectOpinion.value)
  if (!r.ok) return ElMessage.error(r.msg)
  ElMessage.success(`已生成整改单 ${r.order.order_no}（驳回结果，由任务提交人整改）`)
  load()
}

function onSaveMeasure() {
  const order = currentRectify.value
  if (!order) return ElMessage.warning('无整改单')
  const r = saveRectifyMeasure(order, rectifyMeasure.value)
  if (!r.ok) return ElMessage.error(r.msg)
  ElMessage.success('整改措施已保存')
}

function onAddRectifyPhoto() {
  const order = currentRectify.value
  if (!order) return
  const r = addAttachment({
    biz_type: 'RECTIFY',
    biz_id: order.id,
    task_id: task.value.id,
    file_name: '整改后影像.jpg',
    file_category: 8,
    file_ext: 'jpg',
  })
  if (!r.ok) return ElMessage.error(r.msg)
  ElMessage.success('已上传整改后影像')
}

function onSubmitReinspect() {
  const r = submitReinspectRequest(task.value)
  if (!r.ok) return ElMessage.error(r.msg)
  ElMessage.success('已提交复验，等待监理判定')
  load()
}

function onReinspectPass() {
  const r = decideReinspect(task.value, { pass: true, opinion: '复验通过' })
  if (!r.ok) return ElMessage.error(r.msg)
  ElMessage.success('复验通过，整改已销号')
  load()
}

function onReinspectFail() {
  const r = decideReinspect(task.value, { pass: false, opinion: '复验仍不合格' })
  if (!r.ok) return ElMessage.error(r.msg)
  ElMessage.warning('复验不通过，继续整改')
  load()
}
</script>

<template>
  <div v-if="!task" :class="embedded ? 'qm-embed' : 'qm-page page-card'">
    <el-empty description="未找到验评任务">
      <el-button v-if="!embedded" type="primary" @click="router.push(listPath)">返回列表</el-button>
    </el-empty>
  </div>
  <div v-else :class="embedded ? 'qm-embed' : 'qm-page page-card'">
    <div v-if="!embedded" class="page-header">
      <div class="page-header-main">
        <div class="page-breadcrumb">质量验评 / {{ title }}</div>
        <h1 class="page-title">{{ task.task_no }} · {{ TASK_TYPE_LABEL[task.task_type] }}</h1>
        <p class="page-tip">
          {{ resolveProjectName(task.project_id) }} · {{ nodeName }} ·
          {{ TASK_STATUS[task.status] }}
          <el-tag v-if="task.is_draft === 1" size="small" type="info" effect="plain">草稿</el-tag>
          · 档案：{{ archiveBrief }}
        </p>
      </div>
      <el-button @click="router.push(listPath)">返回列表</el-button>
    </div>
    <div v-else class="embed-status">
      <el-tag size="small" type="info">{{ task.task_no }}</el-tag>
      <el-tag size="small" :type="Number(task.status) === 0 ? 'warning' : 'success'">
        {{ TASK_STATUS[task.status] }}
      </el-tag>
      <el-tag v-if="task.is_draft === 1" size="small" type="info" effect="plain">草稿</el-tag>
      <span class="embed-status-tip">档案：{{ archiveBrief }}</span>
    </div>

    <template v-if="completeGate">
      <div class="section-title">前置完成情况</div>
      <QmCompletePrereqPanel :gate="completeGate" compact class="mb" />
    </template>

    <!-- 填报三步向导（可编辑状态）：①系统数据 → ②档案系统 → ③审批流程确认提交 -->
    <el-steps
      v-if="canEdit"
      :active="activeStep"
      align-center
      finish-status="success"
      class="mb wizard-steps"
    >
      <el-step title="填报系统数据" description="基本信息 · 影像附件 · 材料定样" />
      <el-step title="档案系统填报" description="按档案系统页面填写表格" />
      <el-step title="审批流程 · 确认提交" description="核对审批链与提交条件" />
    </el-steps>

    <!-- 第 1 步：本系统数据（非编辑状态平铺展示） -->
    <template v-if="!canEdit || activeStep === 0">
    <!-- ① 基本信息（竣工：表头字段整合进表单） -->
    <template v-if="isCompleteTask">
      <div class="section-title">① 基本信息 · 竣工验收填报</div>
      <el-form v-if="canEdit" label-width="110px" class="complete-meta-form mb">
        <el-form-item label="工程/部位" required>
          <el-input
            v-model="completeMeta.location_name"
            placeholder="如：T2航站楼扩建工程竣工验收"
            style="max-width: 520px"
          />
        </el-form-item>
        <el-form-item label="备注">
          <el-input
            v-model="completeMeta.remark"
            type="textarea"
            :rows="2"
            placeholder="选填"
            style="max-width: 520px"
          />
        </el-form-item>
        <el-form-item label="一次通过">
          <span>{{ formatFirstPass(task.first_pass_flag) || '—' }}</span>
        </el-form-item>
      </el-form>
      <el-descriptions v-else :column="2" border size="small" class="mb">
        <el-descriptions-item label="工程/部位">{{ task.location_name }}</el-descriptions-item>
        <el-descriptions-item label="备注" :span="2">{{ task.remark || '—' }}</el-descriptions-item>
        <el-descriptions-item label="一次通过">{{ formatFirstPass(task.first_pass_flag) }}</el-descriptions-item>
      </el-descriptions>
    </template>

    <template v-else>
      <div class="section-title">① 基本信息</div>
      <el-descriptions :column="3" border size="small" class="mb">
        <el-descriptions-item label="任务名称">{{ task.task_name || '—' }}</el-descriptions-item>
        <el-descriptions-item v-if="task.task_type === 6" label="专项类型">
          {{ specialTypeLabel(task.special_type) }}
        </el-descriptions-item>
        <el-descriptions-item label="节点">{{ nodeName }}</el-descriptions-item>
        <el-descriptions-item label="部位">{{ task.location_name }}</el-descriptions-item>
        <el-descriptions-item v-if="task.task_type !== 6" label="隐蔽工程">
          {{ task.is_hidden_work === 1 ? '是' : '否' }}
        </el-descriptions-item>
        <el-descriptions-item label="业主终审">{{ task.owner_final_required === 1 ? '需要' : '否' }}</el-descriptions-item>
        <el-descriptions-item label="一次通过">{{ formatFirstPass(task.first_pass_flag) }}</el-descriptions-item>
      </el-descriptions>
    </template>

    <template v-if="task.task_type === 6 && specialRequiredDocs.length">
      <div class="section-title">专项必传资料</div>
      <el-alert
        v-if="canEdit && specialDocsMissing.length"
        type="warning"
        :closable="false"
        show-icon
        class="mb"
        :title="`提交报验前须上传：${specialDocsMissing.map((d) => d.label).join('、')}`"
      />
      <el-table :data="specialDocStatus" border size="small" class="mb">
        <el-table-column label="资料名称" min-width="220">
          <template #default="{ row }">
            <span>{{ row.label }}</span>
            <el-tag size="small" type="danger" effect="plain" class="req-tag">必传</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.uploaded ? 'success' : 'info'" size="small">
              {{ row.uploaded ? '已上传' : '未上传' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="文件" min-width="180">
          <template #default="{ row }">{{ row.file?.file_name || '—' }}</template>
        </el-table-column>
        <el-table-column label="上传时间" width="160">
          <template #default="{ row }">{{ row.file?.upload_time || '—' }}</template>
        </el-table-column>
        <el-table-column v-if="canEdit" label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="onAddSpecialDoc(row)">
              {{ row.uploaded ? '重新上传' : '上传' }}
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </template>

    <div class="section-title">
      ② 工程影像 / 附件资料
      <el-tag size="small" type="danger" effect="plain" class="req-tag">默认必填</el-tag>
    </div>
    <el-alert
      v-if="canEdit && !taskSiteAttachments.filter((a) => [1, 2, 3].includes(Number(a.file_category))).length"
      type="warning"
      :closable="false"
      show-icon
      class="mb"
      title="提交报验前须至少上传一份现场影像或附件（默认必填，可在节点配置中调整）"
    />
    <div class="site-materials mb">
      <div class="site-block">
        <div class="site-block-head">
          <div>
            <div class="site-block-title">工程影像</div>
            <div class="site-block-tip">支持图片、视频（现场照片 / 现场短视频）</div>
          </div>
          <div v-if="canEdit" class="filter-bar">
            <el-button size="small" @click="onAddSiteMedia('image')">上传图片</el-button>
            <el-button size="small" @click="onAddSiteMedia('video')">上传视频</el-button>
          </div>
        </div>
        <el-table :data="siteMediaList" border size="small" empty-text="暂无工程影像">
          <el-table-column label="类型" width="88">
            <template #default="{ row }">
              <el-tag size="small" :type="isVideoExt(row.file_ext) || row.file_category === 2 ? 'warning' : 'success'">
                {{ isVideoExt(row.file_ext) || row.file_category === 2 ? '视频' : '图片' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="file_name" label="文件名" min-width="200" show-overflow-tooltip />
          <el-table-column label="类别" width="120">
            <template #default="{ row }">{{ FILE_CATEGORY[row.file_category] || '—' }}</template>
          </el-table-column>
          <el-table-column label="大小" width="90">
            <template #default="{ row }">{{ formatFileSize(row.file_size) }}</template>
          </el-table-column>
          <el-table-column prop="upload_time" label="上传时间" width="160" />
          <el-table-column v-if="canEdit" label="操作" width="80" fixed="right">
            <template #default="{ row }">
              <el-button link type="danger" @click="onRemoveSiteAtt(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <div class="site-block">
        <div class="site-block-head">
          <div>
            <div class="site-block-title">材料附件</div>
            <div class="site-block-tip">支持 PDF / Word / Excel 等文件</div>
          </div>
          <div v-if="canEdit" class="filter-bar">
            <el-button size="small" @click="onAddSiteMaterial">上传附件</el-button>
          </div>
        </div>
        <el-table :data="siteMaterialList" border size="small" empty-text="暂无材料附件">
          <el-table-column label="格式" width="80">
            <template #default="{ row }">
              <el-tag size="small" type="info">{{ String(row.file_ext || '').toUpperCase() || 'FILE' }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="file_name" label="文件名" min-width="220" show-overflow-tooltip />
          <el-table-column label="类别" width="140">
            <template #default="{ row }">{{ FILE_CATEGORY[row.file_category] || '—' }}</template>
          </el-table-column>
          <el-table-column label="大小" width="90">
            <template #default="{ row }">{{ formatFileSize(row.file_size) }}</template>
          </el-table-column>
          <el-table-column prop="upload_time" label="上传时间" width="160" />
          <el-table-column v-if="canEdit" label="操作" width="80" fixed="right">
            <template #default="{ row }">
              <el-button link type="danger" @click="onRemoveSiteAtt(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>

    <!-- ③ 材料 / 定版定样关联（可选区块） -->
    <div class="section-title">
      ③ 材料 / 定版定样关联
      <el-tag size="small" type="info" effect="plain" class="req-tag">可选</el-tag>
    </div>
    <div class="site-materials mb">
      <div class="site-block">
        <div class="site-block-head">
          <div>
            <div class="site-block-title">关联材料</div>
            <div class="site-block-tip">从材料管理 / 进场报验选择（演示为模拟关联）</div>
          </div>
          <div v-if="canEdit" class="filter-bar">
            <el-button size="small" @click="onLinkMaterial">关联材料</el-button>
          </div>
        </div>
        <el-table :data="materialLinks" border size="small" empty-text="暂无关联材料">
          <el-table-column prop="material_name" label="材料名称" min-width="170" show-overflow-tooltip />
          <el-table-column prop="batch_no" label="进场批次" width="140" />
          <el-table-column prop="supplier" label="供应商" min-width="120" show-overflow-tooltip />
          <el-table-column v-if="canEdit" label="操作" width="80" fixed="right">
            <template #default="{ row }">
              <el-button link type="danger" @click="onUnlinkMaterial(row)">解除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <div class="site-block">
        <div class="site-block-head">
          <div>
            <div class="site-block-title">关联定版定样</div>
            <div class="site-block-tip">从样品管理选择定版 / 封样记录（演示为模拟关联）</div>
          </div>
          <div v-if="canEdit" class="filter-bar">
            <el-button size="small" @click="onLinkSample">关联定样</el-button>
          </div>
        </div>
        <el-table :data="sampleLinks" border size="small" empty-text="暂无关联定版定样">
          <el-table-column prop="sample_name" label="定样名称" min-width="180" show-overflow-tooltip />
          <el-table-column prop="sample_category" label="类别" width="110" />
          <el-table-column prop="link_time" label="关联时间" width="160" />
          <el-table-column v-if="canEdit" label="操作" width="80" fixed="right">
            <template #default="{ row }">
              <el-button link type="danger" @click="onUnlinkSample(row)">解除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>

    </template>

    <!-- 第 2 步：档案系统填报（按档案系统页面展示；C1 用户主动登记；C2 节点级拦截） -->
    <template v-if="!canEdit || activeStep === 1">
      <div class="section-title">
        ④ 档案系统填报
        <el-tag v-if="canEdit" size="small" type="warning" effect="plain" class="req-tag">
          档案系统页面
        </el-tag>
      </div>
      <QmArchivePanel :task="task" class="mb" @changed="load" />
    </template>

    <!-- 第 3 步：审批流程 · 确认提交 -->
    <template v-if="canEdit && activeStep === 2">
      <div class="section-title">提交前核对</div>
      <el-table :data="submitChecklist" border size="small" class="mb">
        <el-table-column prop="label" label="核对项" min-width="200" />
        <el-table-column label="状态" width="90">
          <template #default="{ row }">
            <el-tag :type="row.ok ? 'success' : 'danger'" size="small">
              {{ row.ok ? '通过' : '未满足' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="desc" label="说明" min-width="260" show-overflow-tooltip />
      </el-table>

      <div class="section-title">审批流程</div>
      <p class="flow-tip">{{ flowTip }}</p>
      <div class="flow-box mb">
        <el-steps :active="0" process-status="process" finish-status="success" align-center>
          <el-step
            v-for="(step, idx) in flowSteps"
            :key="`confirm-${step.title}-${idx}`"
            :title="step.title"
            :description="step.desc"
          />
        </el-steps>
      </div>
      <el-alert
        type="info"
        :closable="false"
        show-icon
        class="mb"
        title="确认无误后点击下方「提交报验」：提交后任务进入审批流程，审批链以档案系统登记时快照为准"
      />
    </template>

    <!-- 向导操作条 -->
    <div v-if="canEdit" class="filter-bar mb self-check-actions">
      <el-button v-if="activeStep > 0" @click="activeStep -= 1">上一步</el-button>
      <el-button @click="onSaveDraft">保存草稿</el-button>
      <el-button v-if="activeStep < 2" type="primary" @click="activeStep += 1">下一步</el-button>
      <el-button v-else type="primary" @click="onSubmit">提交报验</el-button>
    </div>

    <template v-if="task.status === 3">
      <div class="section-title">整改（审批驳回结果）</div>
      <el-alert
        type="info"
        :closable="false"
        show-icon
        class="mb"
        title="整改为审批驳回的结果，不存在单独下发动作；谁提交的验收流程，谁来整改问题"
      />
      <el-input v-model="rejectOpinion" type="textarea" :rows="3" placeholder="问题描述（默认取驳回意见）" class="mb" />
      <el-button type="warning" @click="onIssueRectify">生成整改单</el-button>
    </template>

    <template v-if="task.status === 4 && currentRectify">
      <div class="section-title">整改执行 · {{ currentRectify.order_no }}</div>
      <el-descriptions :column="3" border size="small" class="mb">
        <el-descriptions-item label="问题描述" :span="3">{{ currentRectify.problem_desc }}</el-descriptions-item>
        <el-descriptions-item label="整改期限">{{ currentRectify.deadline || '—' }}</el-descriptions-item>
        <el-descriptions-item label="状态变更时间">{{ currentRectify.status_changed_at || '—' }}</el-descriptions-item>
        <el-descriptions-item label="复验轮次">{{ currentRectify.round_count ?? 0 }}</el-descriptions-item>
        <el-descriptions-item label="关联档案文档状态" :span="3">
          <el-tag size="small" type="warning" effect="plain">{{ currentRectify.archive_doc_status || '—' }}</el-tag>
        </el-descriptions-item>
      </el-descriptions>
      <el-input v-model="rectifyMeasure" type="textarea" :rows="3" placeholder="整改措施 measure" class="mb" />
      <div class="filter-bar">
        <el-button @click="onSaveMeasure">保存措施</el-button>
        <el-button @click="onAddRectifyPhoto">上传整改后影像</el-button>
        <el-button type="primary" @click="onSubmitReinspect">提交复验</el-button>
      </div>
    </template>

    <template v-if="task.status === 5">
      <div class="section-title">复验判定</div>
      <div class="filter-bar">
        <el-button type="success" @click="onReinspectPass">复验通过</el-button>
        <el-button type="danger" @click="onReinspectFail">复验不通过</el-button>
        <el-button type="primary" @click="router.push(`${approvePath}?id=${task.id}`)">去审批页</el-button>
      </div>
    </template>

    <template v-if="task.status === 1">
      <el-button type="primary" class="mb" @click="router.push(`${approvePath}?id=${task.id}`)">
        进入审批
      </el-button>
    </template>

    <template v-if="!canEdit">
    <el-divider class="approve-divider" />
    <div class="section-title">审批轨迹</div>
    <p class="flow-tip">{{ flowTip }}</p>
    <div class="flow-box mb">
      <el-steps
        :active="flowActive"
        :process-status="flowProcessStatus"
        finish-status="success"
        align-center
      >
        <el-step
          v-for="(step, idx) in flowSteps"
          :key="`${step.title}-${idx}`"
          :title="step.title"
          :description="step.desc"
        />
      </el-steps>
    </div>
    <div class="section-sub">办理记录</div>
    <el-timeline v-if="records.length">
      <el-timeline-item v-for="r in records" :key="r.id" :timestamp="r.action_time">
        {{ r.operator_role }} · {{ { 1: '提交', 2: '通过', 3: '不通过' }[r.action] }}
        <span v-if="r.opinion"> — {{ r.opinion }}</span>
      </el-timeline-item>
    </el-timeline>
    <el-empty v-else description="尚未提交报验，以下为按验收类型预设的默认审批流程" :image-size="56" />
    </template>
  </div>
</template>

<style scoped>
.qm-page { display: flex; flex-direction: column; gap: 12px; }
.qm-embed { display: flex; flex-direction: column; gap: 12px; }
.embed-status {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}
.embed-status-tip { font-size: 12px; color: #909399; }
.complete-meta-form {
  border: 1px solid #ebeef5;
  border-radius: 8px;
  padding: 12px 16px 4px;
  background: #fff;
}
.opt-sub { float: right; color: #909399; font-size: 12px; margin-left: 12px; }
.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}
.page-header-main { min-width: 0; flex: 1; }
.page-breadcrumb { font-size: 12px; color: #909399; }
.page-title { margin: 4px 0; font-size: 20px; }
.page-tip { margin: 0; font-size: 13px; color: #606266; }
.section-title { font-weight: 600; margin-top: 8px; }
.section-sub {
  font-size: 13px;
  font-weight: 600;
  color: #606266;
  margin: 4px 0 8px;
}
.flow-tip {
  margin: 0 0 10px;
  font-size: 12px;
  color: #909399;
  line-height: 1.5;
}
.flow-box {
  border: 1px solid #ebeef5;
  border-radius: 6px;
  background: #fafafa;
  padding: 16px 12px 8px;
}
.wizard-steps { padding: 4px 0 8px; }
.filter-bar { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.self-check-actions { margin-top: 4px; }
.approve-divider { margin: 8px 0 4px; }
.mb { margin-bottom: 12px; }
.site-materials {
  display: flex;
  flex-direction: row;
  align-items: stretch;
  gap: 12px;
}
.site-block {
  flex: 1;
  min-width: 0;
  border: 1px solid #ebeef5;
  border-radius: 6px;
  background: #fff;
  padding: 10px 12px 12px;
}
.site-block-head {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 8px;
  align-items: center;
  margin-bottom: 8px;
}
.site-block-title {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
}
.site-block-tip {
  margin-top: 2px;
  font-size: 12px;
  color: #909399;
}
.req-tag { margin-left: 8px; }
</style>
