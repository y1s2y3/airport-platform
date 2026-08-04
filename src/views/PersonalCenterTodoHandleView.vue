<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ArrowLeft } from '@element-plus/icons-vue'
import {
  findPersonalProcess,
  finishPersonalTodo,
  buildPenaltyApprovalFlow,
  PENALTY_TODO_STATUS,
} from '../mock/personalCenter.js'
import {
  getApplicationDetail,
  pmApprove,
  supervisorApprove,
} from '../mock/brand.js'
import { supervisorApproveSample, pmApproveSample } from '../mock/sample.js'
import { getEntryDetail, supervisorApproveEntry } from '../mock/mat.js'
import {
  getEntryDetail as getEqEntryDetail,
  supervisorApproveEntry as supervisorApproveEqEntry,
} from '../mock/eq.js'
import BrandCandidateAttachBlock from './quality/brand/BrandCandidateAttachBlock.vue'
import {
  submitPenaltyRecipientReport,
  submitPenaltyAppeal,
  acceptPenaltyRecord,
  rejectPenaltyAcceptance,
  resolvePenaltyAppeal,
  issueDispatchPenaltyRecord,
  getDispatchPenaltyRecords,
  PENALTY_STATUSES,
} from '../coc/utils/dispatchMeetingStorage.js'
import { userOptions, getUserLabel } from '../composables/useInspectionPlan.js'
import DispatchImageAttachments from '../coc/components/DispatchImageAttachments.vue'
import PenaltyDetailPanels from '../coc/components/PenaltyDetailPanels.vue'

const route = useRoute()
const router = useRouter()

const FROM_TABS = new Set(['todo', 'done', 'started', 'cc'])
const fromTab = computed(() => {
  const from = String(route.query.from || 'todo')
  return FROM_TABS.has(from) ? from : 'todo'
})
const isReadonly = computed(() => fromTab.value !== 'todo')
const pageTitle = computed(() => (isReadonly.value ? '详情' : '待办处理'))
const emptyText = computed(() =>
  isReadonly.value ? '记录不存在或已删除' : '待办不存在或已处理',
)

const todoId = computed(() => String(route.query.id || ''))
const todo = computed(() =>
  todoId.value ? findPersonalProcess(todoId.value, fromTab.value) : null,
)

const bizToPenaltyStatus = {
  [PENALTY_TODO_STATUS.PROCESSING]: PENALTY_STATUSES.PROCESSING,
  [PENALTY_TODO_STATUS.PENDING_ACCEPTANCE]: PENALTY_STATUSES.PENDING_ACCEPTANCE,
  [PENALTY_TODO_STATUS.APPEALING]: PENALTY_STATUSES.APPEALING,
}

const mergedPenalty = computed(() => {
  if (!todo.value || todo.value.type !== 'penalty') return null
  const base = { ...(todo.value.penalty || {}) }
  const live = getDispatchPenaltyRecords().find((item) => item.id === todo.value.penaltyId)
  const merged = live
    ? { ...base, ...live, id: live.id || base.id || todo.value.penaltyId }
    : { ...base, id: base.id || todo.value.penaltyId }
  if (!merged.status) {
    merged.status = bizToPenaltyStatus[todo.value.bizStatus] || PENALTY_STATUSES.PROCESSING
  }
  return merged
})

const approvalFlow = computed(() => {
  if (!todo.value) return []
  if (todo.value.type === 'penalty') return buildPenaltyApprovalFlow(todo.value)
  return todo.value.approvalFlow || []
})

const todoSourceLabel = computed(() => {
  if (!todo.value) return ''
  if (todo.value.sourceLabel) return todo.value.sourceLabel
  if (todo.value.category) return todo.value.category
  if (todo.value.type === 'penalty') return '处罚单'
  if (todo.value.type === 'brand') return '品牌报审'
  if (todo.value.type === 'sample') return '样板管理'
  if (todo.value.type === 'mat_entry') return '材料进场管理'
  if (todo.value.type === 'eq_entry') return '设备进场管理'
  if (todo.value.processName?.includes('品牌报审')) return '品牌报审'
  if (todo.value.processName?.includes('检验批') || todo.value.processName?.includes('验收')) {
    return '质量验评'
  }
  if (todo.value.processName?.includes('巡检') || todo.value.processName?.includes('隐患')) {
    return '安全巡检'
  }
  return '流程'
})

const processTab = ref('report')
const reportForm = reactive({
  penaltyClause: '',
  amount: '',
  reportResult: '',
  acceptor: '',
  attachments: [],
})
const appealForm = reactive({
  reason: '',
  attachments: [],
})
const acceptForm = reactive({
  decision: 'pass',
  remark: '',
})
const appealHandleForm = reactive({
  decision: 'pass',
  remark: '',
})
const commonForm = reactive({
  decision: 'pass',
  remark: '',
})
/** 品牌报审终审：入选备选 */
const brandSelectedCandidateId = ref('')

const brandLiveDetail = computed(() => {
  const appId = todo.value?.brandApplicationId
  if (!appId || todo.value?.type !== 'brand') return null
  return getApplicationDetail(appId)
})

/** 与新增报审对齐的备选列表（含备注、附件勾选槽位） */
const brandCandidates = computed(() => {
  if (brandLiveDetail.value?.candidates?.length) return brandLiveDetail.value.candidates
  return (todo.value?.brandCandidates || []).map((c) => ({
    ...c,
    remark: c.remark || '',
    attachSlots: c.attachSlots || [],
  }))
})

const brandSpecList = computed(() => {
  const specs = brandLiveDetail.value?.specs
  if (specs?.length) return specs.map((s) => s.spec_model).filter(Boolean)
  const text = todo.value?.detail?.specs || ''
  return text
    ? text
        .split(/[、,，]/)
        .map((s) => s.trim())
        .filter(Boolean)
    : []
})

const brandNodeLabel = computed(() => {
  if (todo.value?.brandNode === 'supervisor') return '待监理审'
  if (todo.value?.brandNode === 'pm') return '待项目经理审'
  return todo.value?.detail?.currentNode || ''
})

const matEntryDetail = computed(() => {
  const id = todo.value?.matEntryId
  if (!id || todo.value?.type !== 'mat_entry') return null
  return getEntryDetail(id)
})

const eqEntryDetail = computed(() => {
  const id = todo.value?.eqEntryId
  if (!id || todo.value?.type !== 'eq_entry') return null
  return getEqEntryDetail(id)
})

function resetForms() {
  processTab.value = 'report'
  Object.assign(reportForm, {
    penaltyClause: mergedPenalty.value?.penaltyClause || '',
    amount: mergedPenalty.value?.amount || '',
    reportResult: '',
    acceptor: mergedPenalty.value?.acceptor || '',
    attachments: [],
  })
  Object.assign(appealForm, { reason: '', attachments: [] })
  Object.assign(acceptForm, { decision: 'pass', remark: '' })
  Object.assign(appealHandleForm, { decision: 'pass', remark: '' })
  Object.assign(commonForm, { decision: 'pass', remark: '' })
  brandSelectedCandidateId.value = brandCandidates.value[0]?.candidate_id || ''
}

watch(
  todo,
  (row) => {
    if (row) resetForms()
  },
  { immediate: true },
)

function goBack() {
  const tab = fromTab.value
  router.push({ path: '/personal-center', query: tab === 'todo' ? {} : { tab } })
}

function flowType(status) {
  if (status === 'done') return 'success'
  if (status === 'current') return 'primary'
  return 'info'
}

function ensurePenaltyReadyForProcess(penaltyId) {
  if (!penaltyId) return
  const hit = getDispatchPenaltyRecords().find((item) => item.id === penaltyId)
  if (hit?.status === PENALTY_STATUSES.PENDING) {
    issueDispatchPenaltyRecord(penaltyId)
  }
}

function afterSubmit(handleLabel, message) {
  finishPersonalTodo(todoId.value, handleLabel)
  ElMessage.success(message)
  goBack()
}

function submitProcessReport() {
  if (!reportForm.penaltyClause.trim()) return ElMessage.warning('请填写条款')
  if (!reportForm.amount.trim()) return ElMessage.warning('请填写金额')
  if (!reportForm.reportResult.trim()) return ElMessage.warning('请填写上报结果')
  if (!reportForm.acceptor.trim()) return ElMessage.warning('请选择验收人')
  const row = todo.value
  if (!row) return
  if (row.penaltyId) {
    ensurePenaltyReadyForProcess(row.penaltyId)
    submitPenaltyRecipientReport(row.penaltyId, {
      penaltyClause: reportForm.penaltyClause.trim(),
      amount: reportForm.amount.trim(),
      reportResult: reportForm.reportResult.trim(),
      acceptor: reportForm.acceptor.trim(),
      reportAttachments: reportForm.attachments.map((item, index) => ({
        name: item.name?.startsWith('上报结果附件')
          ? item.name
          : `上报结果附件-${index + 1}${String(item.name || '').match(/\.[a-z0-9]+$/i)?.[0] || '.jpg'}`,
        url: item.url,
      })),
    })
  }
  afterSubmit('上报结果', '上报成功，状态更新为待验收')
}

function submitProcessAppeal() {
  if (!appealForm.reason.trim()) return ElMessage.warning('请填写申诉理由')
  const row = todo.value
  if (!row) return
  if (row.penaltyId) {
    ensurePenaltyReadyForProcess(row.penaltyId)
    submitPenaltyAppeal(row.penaltyId, {
      appealReason: appealForm.reason.trim(),
      appealAttachments: appealForm.attachments.map((item, index) => ({
        name: item.name?.startsWith('申诉附件')
          ? item.name
          : `申诉附件-${index + 1}${String(item.name || '').match(/\.[a-z0-9]+$/i)?.[0] || '.jpg'}`,
        url: item.url || '',
      })),
    })
  }
  afterSubmit('提交申诉', '申诉已提交，状态更新为申诉中')
}

function submitAcceptHandle() {
  if (!acceptForm.remark.trim()) return ElMessage.warning('请填写说明')
  const row = todo.value
  if (!row) return
  const remark = acceptForm.remark.trim()
  if (acceptForm.decision === 'pass') {
    if (row.penaltyId) acceptPenaltyRecord(row.penaltyId, '当前用户', remark)
    afterSubmit('验收通过', '验收通过，处罚单已关闭')
  } else {
    if (row.penaltyId) rejectPenaltyAcceptance(row.penaltyId, remark)
    afterSubmit('验收驳回', '已驳回，处罚单退回处理中')
  }
}

function submitAppealHandle() {
  if (!appealHandleForm.remark.trim()) return ElMessage.warning('请填写说明')
  const row = todo.value
  if (!row) return
  const remark = appealHandleForm.remark.trim()
  const approved = appealHandleForm.decision === 'pass'
  if (row.penaltyId) resolvePenaltyAppeal(row.penaltyId, approved, '当前用户', remark)
  afterSubmit(
    approved ? '申诉通过并关闭' : '申诉驳回',
    approved ? '申诉已通过，处罚单已关闭' : '申诉已驳回，状态恢复为处理中',
  )
}

function submitCommonHandle() {
  const approved = commonForm.decision === 'pass'
  const row = todo.value
  const needRemark =
    !approved ||
    (row?.type !== 'sample' &&
      row?.type !== 'brand' &&
      row?.type !== 'mat_entry' &&
      row?.type !== 'eq_entry')
  if (needRemark && !commonForm.remark.trim()) {
    return ElMessage.warning(approved ? '请填写说明' : '请填写退回意见')
  }
  if (row?.type === 'eq_entry' && row.eqEntryId) {
    const action = approved ? 'agree' : 'reject'
    const opinion = commonForm.remark.trim()
    const r = supervisorApproveEqEntry(row.eqEntryId, { action, opinion })
    if (!r.ok) return ElMessage.error(r.msg)
    return afterSubmit(
      approved ? '监理同意' : '监理退回',
      approved ? '设备进场审批通过' : '已退回施工单位',
    )
  }
  if (row?.type === 'mat_entry' && row.matEntryId) {
    const action = approved ? 'agree' : 'reject'
    const opinion = commonForm.remark.trim()
    const r = supervisorApproveEntry(row.matEntryId, { action, opinion })
    if (!r.ok) return ElMessage.error(r.msg)
    return afterSubmit(
      approved ? '监理同意' : '监理退回',
      approved ? '进场审批通过' : '已退回施工单位',
    )
  }
  if (row?.type === 'brand' && row.brandApplicationId) {
    const action = approved ? 'agree' : 'reject'
    const opinion = commonForm.remark.trim()
    if (row.brandNode === 'supervisor') {
      const r = supervisorApprove(row.brandApplicationId, { action, opinion })
      if (!r.ok) return ElMessage.error(r.msg)
      return afterSubmit(
        approved ? '监理同意' : '监理退回',
        approved
          ? '已同意，项目经理终审待办已生成（个人中心）'
          : '已退回施工单位',
      )
    }
    if (row.brandNode === 'pm') {
      if (approved && !brandSelectedCandidateId.value) {
        return ElMessage.warning('请选定恰好 1 个入选品牌')
      }
      const r = pmApprove(row.brandApplicationId, {
        action,
        opinion,
        selectedCandidateId: brandSelectedCandidateId.value,
      })
      if (!r.ok) return ElMessage.error(r.msg)
      return afterSubmit(
        approved ? '终审通过并入库' : '终审退回',
        approved ? '终审通过，已完成品牌入库' : '已退回施工单位',
      )
    }
  }
  if (row?.type === 'sample' && row.sampleApplicationId && row.sampleBizType) {
    const action = approved ? 'agree' : 'reject'
    const opinion = commonForm.remark.trim()
    if (row.sampleNode === 'supervisor') {
      const r = supervisorApproveSample(row.sampleBizType, row.sampleApplicationId, {
        action,
        opinion,
      })
      if (!r.ok) return ElMessage.error(r.msg)
      return afterSubmit(
        approved ? '监理同意' : '监理退回',
        approved ? '已同意，项目经理终审待办已生成' : '已退回施工单位',
      )
    }
    if (row.sampleNode === 'pm') {
      const r = pmApproveSample(row.sampleBizType, row.sampleApplicationId, { action, opinion })
      if (!r.ok) return ElMessage.error(r.msg)
      return afterSubmit(
        approved ? '终审通过' : '终审退回',
        approved
          ? row.sampleBizType === 'process'
            ? '终审通过，已生成二维码'
            : '终审通过，已入台账视图'
          : '已退回施工单位',
      )
    }
  }
  afterSubmit(approved ? '审批通过' : '审批驳回', approved ? '已审批通过' : '已驳回')
}
</script>

<template>
  <div class="handle-page page-card" :class="{ 'is-brand': todo?.type === 'brand' }">
    <div class="page-header">
      <div class="title-row">
        <el-button :icon="ArrowLeft" @click="goBack">返回</el-button>
        <div class="title-meta">
          <div class="title-line">
            <h1 class="page-title">{{ pageTitle }}</h1>
            <el-tag
              v-if="todoSourceLabel"
              size="small"
              type="danger"
              effect="plain"
              class="source-tag"
            >
              {{ todoSourceLabel }}
            </el-tag>
            <el-tag v-if="isReadonly" size="small" type="info" effect="plain">只读</el-tag>
          </div>
          <p v-if="todo?.processName" class="page-sub">{{ todo.processName }}</p>
        </div>
      </div>
    </div>

    <el-empty v-if="!todo" :description="emptyText" :image-size="80">
      <el-button type="primary" @click="goBack">返回</el-button>
    </el-empty>

    <template v-else>
      <!-- 品牌报审：分区展示 -->
      <template v-if="todo.type === 'brand'">
        <section class="block block--panel">
          <div class="block-head">
            <div class="block-title">报审信息</div>
            <el-tag v-if="brandNodeLabel" size="small" type="warning" effect="light">
              {{ brandNodeLabel }}
            </el-tag>
          </div>
          <el-descriptions :column="2" border size="small" class="desc-panel">
            <el-descriptions-item label="报审编号">
              {{ todo.detail?.applicationId || '—' }}
            </el-descriptions-item>
            <el-descriptions-item label="项目">
              {{ todo.detail?.project || todo.projectName || '—' }}
            </el-descriptions-item>
            <el-descriptions-item label="材料/设备">
              {{ todo.detail?.materialName || '—' }}
            </el-descriptions-item>
            <el-descriptions-item label="材料类型">
              {{ todo.detail?.materialType || '—' }}
            </el-descriptions-item>
            <el-descriptions-item label="使用部位">
              {{ todo.detail?.usePart || '—' }}
            </el-descriptions-item>
            <el-descriptions-item label="申请人">
              {{ todo.applicant || '—' }}
              <span v-if="todo.dept" class="meta-sep">· {{ todo.dept }}</span>
            </el-descriptions-item>
            <el-descriptions-item label="申请时间">
              {{ todo.applyTime || '—' }}
            </el-descriptions-item>
            <el-descriptions-item label="材料规格" :span="2">
              <div v-if="brandSpecList.length" class="spec-tags">
                <el-tag
                  v-for="(spec, i) in brandSpecList"
                  :key="`${spec}-${i}`"
                  size="small"
                  effect="plain"
                  type="info"
                >
                  {{ spec }}
                </el-tag>
              </div>
              <span v-else class="muted">—</span>
            </el-descriptions-item>
          </el-descriptions>
        </section>

        <section class="block block--panel">
          <div class="block-head">
            <div class="block-title">备选品牌</div>
            <el-tag size="small" type="info" effect="plain">共 {{ brandCandidates.length }} 条</el-tag>
          </div>
          <div class="brand-cand-list">
            <div
              v-for="(c, idx) in brandCandidates"
              :key="c.candidate_id || idx"
              class="brand-cand-card"
            >
              <div class="brand-cand-card-head">
                <div class="brand-cand-card-title">
                  <span class="cand-badge">{{ idx + 1 }}</span>
                  <span class="cand-name">{{ c.brand_name || '—' }}</span>
                  <el-tag v-if="c.brand_lib_id" size="small" type="success" effect="light">库选入</el-tag>
                  <el-tag v-else size="small" type="info" effect="plain">手填</el-tag>
                </div>
              </div>
              <div class="cand-mfr">生产厂家：{{ c.manufacturer || '—' }}</div>
              <BrandCandidateAttachBlock :candidate="c" :editable="false" />
            </div>
          </div>
        </section>
      </template>

      <!-- 样板管理 -->
      <template v-else-if="todo.type === 'sample'">
        <section class="block block--panel">
          <div class="block-head">
            <div class="block-title">样板报审信息</div>
            <el-tag size="small" type="warning" effect="light">
              {{ todo.detail?.currentNode || (todo.sampleNode === 'pm' ? '待项目经理审' : '待监理审') }}
            </el-tag>
          </div>
          <el-descriptions :column="2" border size="small" class="desc-panel">
            <el-descriptions-item label="报审编号">
              {{ todo.detail?.applicationId || todo.sampleApplicationId || '—' }}
            </el-descriptions-item>
            <el-descriptions-item label="类型">
              {{ todo.detail?.bizType || '—' }}
            </el-descriptions-item>
            <el-descriptions-item label="名称">
              {{ todo.detail?.title || '—' }}
            </el-descriptions-item>
            <el-descriptions-item label="使用部位">
              {{ todo.detail?.usePart || '—' }}
            </el-descriptions-item>
            <el-descriptions-item label="项目">
              {{ todo.detail?.project || '—' }}
            </el-descriptions-item>
            <el-descriptions-item label="申请人">
              {{ todo.applicant || '—' }}
            </el-descriptions-item>
            <el-descriptions-item label="比选/交底" :span="2">
              {{ todo.detail?.briefing || '—' }}
            </el-descriptions-item>
          </el-descriptions>
        </section>
      </template>

      <!-- 材料进场 -->
      <template v-else-if="todo.type === 'mat_entry'">
        <section class="block block--panel">
          <div class="block-head">
            <div class="block-title">进场报验信息</div>
            <el-tag size="small" type="warning" effect="light">待监理审</el-tag>
          </div>
          <el-descriptions :column="2" border size="small" class="desc-panel">
            <el-descriptions-item label="进场单号">
              {{ matEntryDetail?.entry_id || todo.detail?.entryId || todo.matEntryId || '—' }}
            </el-descriptions-item>
            <el-descriptions-item label="项目">
              {{ matEntryDetail?.project_label || todo.detail?.project || '—' }}
            </el-descriptions-item>
            <el-descriptions-item label="材料名称">
              {{ matEntryDetail?.material_name || todo.detail?.materialName || '—' }}
            </el-descriptions-item>
            <el-descriptions-item label="品牌">
              {{ matEntryDetail?.brand_name || todo.detail?.brandName || '—' }}
            </el-descriptions-item>
            <el-descriptions-item label="定样单号">
              {{ matEntryDetail?.sample_id || todo.detail?.sampleId || '—' }}
            </el-descriptions-item>
            <el-descriptions-item label="数量">
              <template v-if="matEntryDetail">
                {{ matEntryDetail.quantity }}{{ matEntryDetail.unit }}
              </template>
              <template v-else>{{ todo.detail?.quantity || '—' }}</template>
            </el-descriptions-item>
            <el-descriptions-item label="供应商">
              {{ matEntryDetail?.supplier || '—' }}
            </el-descriptions-item>
            <el-descriptions-item label="品牌一致">
              <el-tag
                v-if="matEntryDetail"
                size="small"
                :type="matEntryDetail.brand_match ? 'success' : 'danger'"
              >
                {{ matEntryDetail.brand_match ? '一致' : '不一致' }}
              </el-tag>
              <span v-else>—</span>
            </el-descriptions-item>
            <el-descriptions-item label="合格证">{{ matEntryDetail?.cert_file || '—' }}</el-descriptions-item>
            <el-descriptions-item label="质检报告">{{ matEntryDetail?.inspect_file || '—' }}</el-descriptions-item>
            <el-descriptions-item label="现场照片">{{ matEntryDetail?.photo_file || '—' }}</el-descriptions-item>
            <el-descriptions-item label="送检结果">
              {{
                matEntryDetail?.inspect_result_checked
                  ? matEntryDetail.inspect_result_file || '已勾选'
                  : '未勾选'
              }}
            </el-descriptions-item>
          </el-descriptions>
        </section>
      </template>

      <!-- 设备进场 -->
      <template v-else-if="todo.type === 'eq_entry'">
        <section class="block block--panel">
          <div class="block-head">
            <div class="block-title">设备进场报验信息</div>
            <el-tag size="small" type="warning" effect="light">待监理审</el-tag>
          </div>
          <el-descriptions :column="2" border size="small" class="desc-panel">
            <el-descriptions-item label="进场单号">
              {{ eqEntryDetail?.entry_id || todo.detail?.entryId || todo.eqEntryId || '—' }}
            </el-descriptions-item>
            <el-descriptions-item label="项目">
              {{ eqEntryDetail?.project_label || todo.detail?.project || '—' }}
            </el-descriptions-item>
            <el-descriptions-item label="设备名称">
              {{ eqEntryDetail?.equipment_name || todo.detail?.equipmentName || '—' }}
            </el-descriptions-item>
            <el-descriptions-item label="品牌">
              {{ eqEntryDetail?.brand_name || todo.detail?.brandName || '—' }}
            </el-descriptions-item>
            <el-descriptions-item label="定样单号">
              {{ eqEntryDetail?.sample_id || todo.detail?.sampleId || '—' }}
            </el-descriptions-item>
            <el-descriptions-item label="数量">
              <template v-if="eqEntryDetail">
                {{ eqEntryDetail.quantity }}{{ eqEntryDetail.unit }}
              </template>
              <template v-else>{{ todo.detail?.quantity || '—' }}</template>
            </el-descriptions-item>
            <el-descriptions-item label="型号">{{ eqEntryDetail?.model || '—' }}</el-descriptions-item>
            <el-descriptions-item label="供应商">{{ eqEntryDetail?.supplier || '—' }}</el-descriptions-item>
            <el-descriptions-item label="合格证">{{ eqEntryDetail?.cert_file || '—' }}</el-descriptions-item>
            <el-descriptions-item label="质检报告">{{ eqEntryDetail?.inspect_file || '—' }}</el-descriptions-item>
            <el-descriptions-item label="现场照片">{{ eqEntryDetail?.photo_file || '—' }}</el-descriptions-item>
            <el-descriptions-item label="送检结果">
              {{
                eqEntryDetail?.inspect_result_checked
                  ? eqEntryDetail.inspect_result_file || '已勾选'
                  : '未勾选'
              }}
            </el-descriptions-item>
          </el-descriptions>
          <div v-if="eqEntryDetail?.unpack_items?.length" style="margin-top: 12px">
            <div class="block-title" style="margin-bottom: 8px; font-size: 14px">开箱清单</div>
            <el-table :data="eqEntryDetail.unpack_items" size="small" border stripe>
              <el-table-column prop="label" label="检查项" min-width="120" />
              <el-table-column label="齐全" width="80">
                <template #default="{ row }">{{ row.ok ? '是' : '否' }}</template>
              </el-table-column>
              <el-table-column prop="remark" label="备注" min-width="120">
                <template #default="{ row }">{{ row.remark || '—' }}</template>
              </el-table-column>
            </el-table>
          </div>
        </section>
      </template>

      <!-- 其他类型：详情信息 -->
      <section v-else class="block block--panel">
        <div class="block-head">
          <div class="block-title">详情信息</div>
        </div>
        <template v-if="todo.type === 'penalty' && mergedPenalty">
          <PenaltyDetailPanels :record="mergedPenalty" />
        </template>
        <template v-else>
          <el-descriptions :column="2" border size="small" class="desc-panel">
            <el-descriptions-item label="流程名称" :span="2">{{ todo.processName }}</el-descriptions-item>
            <el-descriptions-item label="申请人">{{ todo.applicant || '—' }}</el-descriptions-item>
            <el-descriptions-item label="申请部门">{{ todo.dept || '—' }}</el-descriptions-item>
            <el-descriptions-item label="申请时间">{{ todo.applyTime || '—' }}</el-descriptions-item>
            <el-descriptions-item v-if="todo.handleTime" label="处理时间">{{ todo.handleTime }}</el-descriptions-item>
            <el-descriptions-item v-if="todo.status" label="处理状态">{{ todo.status }}</el-descriptions-item>
            <el-descriptions-item v-if="todo.endTime" label="结束时间">{{ todo.endTime || '—' }}</el-descriptions-item>
            <el-descriptions-item v-if="todo.category" label="流程类别">{{ todo.category }}</el-descriptions-item>
            <el-descriptions-item v-if="todo.projectName" label="项目名称">{{ todo.projectName }}</el-descriptions-item>
            <el-descriptions-item v-if="todo.readStatus" label="阅读状态">{{ todo.readStatus }}</el-descriptions-item>
            <el-descriptions-item v-if="todo.detail?.project" label="项目">{{ todo.detail.project }}</el-descriptions-item>
            <el-descriptions-item v-if="todo.detail?.applicationId" label="报审编号">
              {{ todo.detail.applicationId }}
            </el-descriptions-item>
            <el-descriptions-item v-if="todo.detail?.materialName" label="材料/设备">
              {{ todo.detail.materialName }}
            </el-descriptions-item>
            <el-descriptions-item v-if="todo.detail?.materialType" label="材料类型">
              {{ todo.detail.materialType }}
            </el-descriptions-item>
            <el-descriptions-item v-if="todo.detail?.specs" label="规格型号" :span="2">
              {{ todo.detail.specs }}
            </el-descriptions-item>
            <el-descriptions-item v-if="todo.detail?.brands" label="备选品牌" :span="2">
              {{ todo.detail.brands }}
            </el-descriptions-item>
            <el-descriptions-item v-if="todo.detail?.currentNode" label="当前节点">
              {{ todo.detail.currentNode }}
            </el-descriptions-item>
            <el-descriptions-item v-if="todo.detail?.usePart" label="使用部位">
              {{ todo.detail.usePart }}
            </el-descriptions-item>
            <el-descriptions-item v-if="todo.detail?.nodeName" label="节点">{{ todo.detail.nodeName }}</el-descriptions-item>
            <el-descriptions-item v-if="todo.detail?.planName" label="计划" :span="2">{{ todo.detail.planName }}</el-descriptions-item>
            <el-descriptions-item v-if="todo.detail?.specialty" label="专业">{{ todo.detail.specialty }}</el-descriptions-item>
            <el-descriptions-item v-if="todo.detail?.summary" label="说明" :span="2">{{ todo.detail.summary }}</el-descriptions-item>
          </el-descriptions>
        </template>
      </section>

      <!-- 审批操作：仅待办处理展示 -->
      <section v-if="!isReadonly" class="block block--panel block--action">
        <div class="block-head">
          <div class="block-title">审批操作</div>
        </div>

        <template v-if="todo.type === 'penalty' && todo.bizStatus === PENALTY_TODO_STATUS.PROCESSING">
          <el-tabs v-model="processTab">
            <el-tab-pane label="上报结果" name="report">
              <el-form label-width="110px" class="op-form">
                <el-form-item label="条款" required>
                  <el-input v-model="reportForm.penaltyClause" placeholder="请输入处罚条款" />
                </el-form-item>
                <el-form-item label="金额" required>
                  <el-input v-model="reportForm.amount" placeholder="如 5000 元" />
                </el-form-item>
                <el-form-item label="上报结果" required>
                  <el-input
                    v-model="reportForm.reportResult"
                    type="textarea"
                    :rows="4"
                    placeholder="请说明整改及处理情况"
                  />
                </el-form-item>
                <el-form-item label="验收人" required>
                  <el-select
                    v-model="reportForm.acceptor"
                    filterable
                    clearable
                    placeholder="请选择验收人"
                    style="width: 100%"
                  >
                    <el-option
                      v-for="u in userOptions"
                      :key="u.id"
                      :label="getUserLabel(u.id)"
                      :value="getUserLabel(u.id)"
                    />
                  </el-select>
                </el-form-item>
                <el-form-item label="上报结果附件">
                  <DispatchImageAttachments
                    v-model="reportForm.attachments"
                    name-prefix="上报结果附件"
                  />
                </el-form-item>
              </el-form>
            </el-tab-pane>
            <el-tab-pane label="申诉" name="appeal">
              <el-form label-width="110px" class="op-form">
                <el-form-item label="申诉理由" required>
                  <el-input
                    v-model="appealForm.reason"
                    type="textarea"
                    :rows="4"
                    placeholder="请说明申诉理由"
                  />
                </el-form-item>
                <el-form-item label="申诉附件">
                  <DispatchImageAttachments
                    v-model="appealForm.attachments"
                    name-prefix="申诉附件"
                  />
                </el-form-item>
              </el-form>
            </el-tab-pane>
          </el-tabs>
          <div class="op-actions">
            <el-button @click="goBack">取消</el-button>
            <el-button v-if="processTab === 'report'" type="primary" @click="submitProcessReport">
              提交上报
            </el-button>
            <el-button v-else type="primary" @click="submitProcessAppeal">提交申诉</el-button>
          </div>
        </template>

        <template v-else-if="todo.type === 'penalty' && todo.bizStatus === PENALTY_TODO_STATUS.PENDING_ACCEPTANCE">
          <el-form label-width="96px" class="op-form">
            <el-form-item label="处理意见" required>
              <el-radio-group v-model="acceptForm.decision">
                <el-radio value="pass">验收通过</el-radio>
                <el-radio value="reject">驳回</el-radio>
              </el-radio-group>
            </el-form-item>
            <el-form-item label="说明" required>
              <el-input v-model="acceptForm.remark" type="textarea" :rows="4" placeholder="请填写验收说明" />
            </el-form-item>
          </el-form>
          <div class="op-actions">
            <el-button @click="goBack">取消</el-button>
            <el-button type="primary" @click="submitAcceptHandle">提交</el-button>
          </div>
        </template>

        <template v-else-if="todo.type === 'penalty' && todo.bizStatus === PENALTY_TODO_STATUS.APPEALING">
          <el-form label-width="120px" class="op-form">
            <el-form-item label="处理意见" required>
              <el-radio-group v-model="appealHandleForm.decision">
                <el-radio value="pass">通过并关闭处罚单</el-radio>
                <el-radio value="reject">驳回</el-radio>
              </el-radio-group>
            </el-form-item>
            <el-form-item label="说明" required>
              <el-input
                v-model="appealHandleForm.remark"
                type="textarea"
                :rows="4"
                placeholder="请填写处理说明"
              />
            </el-form-item>
          </el-form>
          <div class="op-actions">
            <el-button @click="goBack">取消</el-button>
            <el-button type="primary" @click="submitAppealHandle">提交</el-button>
          </div>
        </template>

        <template v-else>
          <el-form label-width="96px" class="op-form">
            <el-form-item label="处理意见" required>
              <el-radio-group v-model="commonForm.decision">
                <el-radio value="pass">通过</el-radio>
                <el-radio value="reject">驳回</el-radio>
              </el-radio-group>
            </el-form-item>
            <el-form-item
              v-if="todo.type === 'brand' && todo.brandNode === 'pm' && commonForm.decision === 'pass'"
              label="入选品牌"
              required
            >
              <el-radio-group v-model="brandSelectedCandidateId" class="brand-pick-group">
                <div
                  v-for="c in brandCandidates"
                  :key="c.candidate_id"
                  class="brand-pick-card"
                  :class="{ 'is-active': brandSelectedCandidateId === c.candidate_id }"
                  @click="brandSelectedCandidateId = c.candidate_id"
                >
                  <el-radio :value="c.candidate_id" class="brand-pick-radio">
                    <span class="brand-pick-main">{{ c.brand_name }}</span>
                    <span class="brand-pick-mfr">{{ c.manufacturer }}</span>
                    <span v-if="c.remark" class="brand-pick-remark">备注：{{ c.remark }}</span>
                  </el-radio>
                </div>
              </el-radio-group>
            </el-form-item>
            <el-form-item
              label="说明"
              :required="
                !(
                  todo.type === 'sample' ||
                  todo.type === 'brand' ||
                  todo.type === 'mat_entry' ||
                  todo.type === 'eq_entry'
                ) ||
                commonForm.decision === 'reject'
              "
            >
              <el-input
                v-model="commonForm.remark"
                type="textarea"
                :rows="3"
                :placeholder="
                  commonForm.decision === 'reject' &&
                  (todo.type === 'brand' ||
                    todo.type === 'sample' ||
                    todo.type === 'mat_entry' ||
                    todo.type === 'eq_entry')
                    ? '退回意见必填'
                    : todo.type === 'brand' ||
                        todo.type === 'sample' ||
                        todo.type === 'mat_entry' ||
                        todo.type === 'eq_entry'
                      ? '审批意见选填'
                      : '请填写审批说明'
                "
              />
            </el-form-item>
          </el-form>
          <div class="op-actions">
            <el-button @click="goBack">取消</el-button>
            <el-button type="primary" @click="submitCommonHandle">提交</el-button>
          </div>
        </template>
      </section>

      <!-- 审批过程 -->
      <section class="block block--panel">
        <div class="block-head">
          <div class="block-title">审批过程</div>
        </div>
        <el-timeline class="flow-timeline">
          <el-timeline-item
            v-for="(step, index) in approvalFlow"
            :key="`${step.title}-${index}`"
            :type="flowType(step.status)"
            :hollow="step.status === 'pending'"
            :timestamp="step.time || '待进行'"
            placement="top"
          >
            <div class="flow-card" :class="step.status">
              <div class="flow-title">
                {{ step.title }}
                <el-tag v-if="step.status === 'current'" size="small" type="warning">当前</el-tag>
              </div>
              <div class="flow-meta">处理人：{{ step.user || '—' }}</div>
              <div v-if="step.remark" class="flow-remark">{{ step.remark }}</div>
            </div>
          </el-timeline-item>
        </el-timeline>
      </section>
    </template>
  </div>
</template>

<style scoped>
.handle-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-height: 100%;
  background: #fff;
  padding: 16px 20px 28px;
}

.handle-page.is-brand {
  padding-bottom: 24px;
  max-width: 980px;
}

.page-header {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
}

.title-row {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  width: 100%;
}

.title-meta {
  flex: 1;
  min-width: 0;
}

.title-line {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.page-title {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #1f2329;
}

.source-tag {
  flex-shrink: 0;
}

.page-sub {
  margin: 4px 0 0;
  font-size: 13px;
  color: #909399;
  line-height: 1.5;
}

.block {
  border: 1px solid #ebeef5;
  border-radius: 10px;
  padding: 14px 16px 16px;
  background: #fafbfc;
}

.block--panel {
  background: #fff;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.02);
}

.block-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 14px;
  padding-bottom: 10px;
  border-bottom: 1px solid #f0f2f5;
}

.block-title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: #1f2329;
}

.desc-panel :deep(.el-descriptions__label) {
  width: 96px;
  color: #909399;
}

.meta-sep {
  color: #909399;
}

.spec-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.muted {
  font-size: 13px;
  color: #c0c4cc;
}

.brand-cand-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.brand-cand-card {
  padding: 14px;
  border: 1px solid #e4e7ed;
  border-radius: 10px;
  background: #fff;
}

.brand-cand-card-head {
  margin-bottom: 6px;
}

.brand-cand-card-title {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.cand-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 6px;
  background: var(--el-color-primary);
  color: #fff;
  font-size: 12px;
  font-weight: 600;
}

.cand-name {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
}

.cand-mfr {
  margin-bottom: 8px;
  font-size: 13px;
  color: #606266;
}

.brand-pick-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}

.brand-pick-card {
  display: block;
  margin: 0;
  padding: 10px 12px;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  background: #fafafa;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}

.brand-pick-card:hover {
  border-color: #c6e2ff;
  background: #f5faff;
}

.brand-pick-card.is-active {
  border-color: var(--el-color-primary);
  background: #ecf5ff;
}

.brand-pick-radio {
  width: 100%;
  height: auto;
  margin-right: 0;
  align-items: flex-start;
  white-space: normal;
}

.brand-pick-radio :deep(.el-radio__label) {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding-left: 8px;
  line-height: 1.4;
}

.brand-pick-main {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
}

.brand-pick-mfr {
  font-size: 12px;
  color: #606266;
}

.brand-pick-remark {
  font-size: 12px;
  color: #909399;
}

.flow-timeline {
  padding-left: 4px;
}

.flow-card {
  padding: 10px 12px;
  border-radius: 8px;
  background: #fff;
  border: 1px solid #ebeef5;
}

.flow-card.current {
  border-color: #f5dab1;
  background: #fdf6ec;
}

.flow-card.done {
  border-color: #e1f3d8;
  background: #f0f9eb;
}

.flow-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  font-size: 14px;
  color: #303133;
}

.flow-meta,
.flow-remark {
  margin-top: 4px;
  font-size: 12px;
  color: #606266;
}

.op-form {
  max-width: 720px;
  background: #fafbfc;
  padding: 14px 14px 0;
  border-radius: 8px;
  border: 1px solid #f0f2f5;
}

.op-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #ebeef5;
}

.block--action .op-actions {
  position: sticky;
  bottom: 0;
  margin: 12px -16px -16px;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.96);
  border-top: 1px solid #ebeef5;
  border-radius: 0 0 10px 10px;
  backdrop-filter: blur(6px);
}
</style>
