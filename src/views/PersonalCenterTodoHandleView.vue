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
  submitPenaltyRecipientReport,
  submitPenaltyAppeal,
  acceptPenaltyRecord,
  rejectPenaltyAcceptance,
  resolvePenaltyAppeal,
  issueDispatchPenaltyRecord,
  getDispatchPenaltyRecords,
  PENALTY_STATUSES,
} from '../coc/utils/dispatchMeetingStorage.js'
import { formatRedBlackPeriod } from '../coc/utils/redBlackBoardStorage.js'
import { resolveExecutorDisplay } from '../coc/utils/executorDisplay.js'
import { userOptions, getUserLabel } from '../composables/useInspectionPlan.js'
import DispatchImageAttachments from '../coc/components/DispatchImageAttachments.vue'

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

function displayValue(value) {
  return value?.trim?.() ? value : '—'
}

function penaltyStatusTagType(status) {
  if (status === PENALTY_STATUSES.CLOSED) return 'info'
  if (status === PENALTY_STATUSES.PROCESSING) return 'warning'
  if (status === PENALTY_STATUSES.PENDING) return 'warning'
  if (status === PENALTY_STATUSES.APPEALING) return 'warning'
  if (status === PENALTY_STATUSES.PENDING_ACCEPTANCE) return 'success'
  return 'info'
}

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
      reportAttachments: reportForm.attachments.map((item) => ({
        name: item.name,
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
      appealAttachments: appealForm.attachments.map((item) => ({
        name: item.name,
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
  if (!commonForm.remark.trim()) return ElMessage.warning('请填写说明')
  const approved = commonForm.decision === 'pass'
  afterSubmit(approved ? '审批通过' : '审批驳回', approved ? '已审批通过' : '已驳回')
}
</script>

<template>
  <div class="handle-page page-card">
    <div class="page-header">
      <div class="title-row">
        <el-button :icon="ArrowLeft" @click="goBack">返回</el-button>
        <h1 class="page-title">{{ pageTitle }}</h1>
        <el-tag v-if="todoSourceLabel" size="small" type="danger" effect="plain" class="source-tag">
          {{ todoSourceLabel }}
        </el-tag>
      </div>
    </div>

    <el-empty v-if="!todo" :description="emptyText" :image-size="80">
      <el-button type="primary" @click="goBack">返回</el-button>
    </el-empty>

    <template v-else>
      <!-- 详情信息：对齐后台处罚单详情 -->
      <section class="block">
        <div class="block-title">详情信息</div>
        <template v-if="todo.type === 'penalty' && mergedPenalty">
          <el-descriptions :column="2" border size="small">
            <el-descriptions-item label="编号">{{ mergedPenalty.id || '—' }}</el-descriptions-item>
            <el-descriptions-item label="状态">
              <el-tag :type="penaltyStatusTagType(mergedPenalty.status)" size="small">
                {{ mergedPenalty.status }}
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="项目名称">{{ mergedPenalty.project || '—' }}</el-descriptions-item>
            <el-descriptions-item label="责任单位">{{ mergedPenalty.unit || '—' }}</el-descriptions-item>
            <el-descriptions-item label="事由" :span="2">{{ mergedPenalty.penaltyReason || '—' }}</el-descriptions-item>
            <el-descriptions-item label="内容" :span="2">{{ mergedPenalty.penaltyContent || '—' }}</el-descriptions-item>
            <el-descriptions-item label="指派人">
              {{ resolveExecutorDisplay(mergedPenalty.assignee || mergedPenalty.executor) }}
            </el-descriptions-item>
            <el-descriptions-item label="完成时限">{{ mergedPenalty.deadline || '—' }}</el-descriptions-item>
            <el-descriptions-item label="附件" :span="2">
              <DispatchImageAttachments :model-value="mergedPenalty.attachments || []" readonly />
            </el-descriptions-item>
            <el-descriptions-item label="条款" :span="2">{{ displayValue(mergedPenalty.penaltyClause) }}</el-descriptions-item>
            <el-descriptions-item label="金额">{{ displayValue(mergedPenalty.amount) }}</el-descriptions-item>
            <el-descriptions-item label="下发时间">{{ mergedPenalty.issueTime || '—' }}</el-descriptions-item>
            <el-descriptions-item v-if="mergedPenalty.reportResult" label="上报结果" :span="2">
              {{ mergedPenalty.reportResult }}
            </el-descriptions-item>
            <el-descriptions-item v-if="mergedPenalty.acceptor" label="验收人">
              {{ mergedPenalty.acceptor }}
            </el-descriptions-item>
            <el-descriptions-item v-if="mergedPenalty.reportAttachments?.length" label="上报附件" :span="2">
              <div class="report-detail-images">
                <a
                  v-for="(file, index) in mergedPenalty.reportAttachments"
                  :key="`${file.name}-${index}`"
                  class="report-detail-item"
                  :href="file.url"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <img :src="file.url" :alt="file.name" class="report-detail-thumb" />
                  <span :title="file.name">{{ file.name }}</span>
                </a>
              </div>
            </el-descriptions-item>
            <el-descriptions-item v-if="mergedPenalty.reportTime" label="上报时间">
              {{ mergedPenalty.reportTime }}
            </el-descriptions-item>
            <el-descriptions-item v-if="mergedPenalty.acceptedTime" label="验收时间">
              {{ mergedPenalty.acceptedTime }}
            </el-descriptions-item>
            <el-descriptions-item v-if="mergedPenalty.closedTime" label="关闭时间">
              {{ mergedPenalty.closedTime }}
            </el-descriptions-item>
            <el-descriptions-item v-if="mergedPenalty.blackBoardSynced" label="黑榜期数" :span="2">
              {{ formatRedBlackPeriod(mergedPenalty.blackBoardMonth) }}
            </el-descriptions-item>
          </el-descriptions>
          <div v-if="mergedPenalty.snapshot" class="content-block">
            <div class="block-label">关联图片</div>
            <img :src="mergedPenalty.snapshot" alt="关联图片" class="snapshot-img" />
          </div>
          <div
            v-if="mergedPenalty.status === PENALTY_STATUSES.APPEALING || mergedPenalty.appealReason"
            class="content-block appeal-block"
          >
            <div class="block-label">申诉信息</div>
            <el-descriptions :column="1" border size="small">
              <el-descriptions-item label="申诉时间">{{ mergedPenalty.appealTime || '—' }}</el-descriptions-item>
              <el-descriptions-item label="申诉理由">{{ mergedPenalty.appealReason || '—' }}</el-descriptions-item>
              <el-descriptions-item v-if="mergedPenalty.appealResolution" label="申诉结论">
                {{ mergedPenalty.appealResolution }}
              </el-descriptions-item>
              <el-descriptions-item label="附件">
                <DispatchImageAttachments
                  :model-value="mergedPenalty.appealAttachments || []"
                  readonly
                />
              </el-descriptions-item>
            </el-descriptions>
          </div>
        </template>
        <template v-else>
          <el-descriptions :column="2" border size="small">
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
            <el-descriptions-item v-if="todo.detail?.nodeName" label="节点">{{ todo.detail.nodeName }}</el-descriptions-item>
            <el-descriptions-item v-if="todo.detail?.planName" label="计划" :span="2">{{ todo.detail.planName }}</el-descriptions-item>
            <el-descriptions-item v-if="todo.detail?.specialty" label="专业">{{ todo.detail.specialty }}</el-descriptions-item>
            <el-descriptions-item v-if="todo.detail?.summary" label="说明" :span="2">{{ todo.detail.summary }}</el-descriptions-item>
          </el-descriptions>
        </template>
      </section>

      <!-- 审批操作：仅待办处理展示 -->
      <section v-if="!isReadonly" class="block">
        <div class="block-title">审批操作</div>

        <template v-if="todo.type === 'penalty' && todo.bizStatus === PENALTY_TODO_STATUS.PROCESSING">
          <el-tabs v-model="processTab">
            <el-tab-pane label="上报结果" name="report">
              <el-form label-width="96px" class="op-form">
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
                <el-form-item label="附件">
                  <DispatchImageAttachments v-model="reportForm.attachments" />
                </el-form-item>
              </el-form>
            </el-tab-pane>
            <el-tab-pane label="申诉" name="appeal">
              <el-form label-width="96px" class="op-form">
                <el-form-item label="申诉理由" required>
                  <el-input
                    v-model="appealForm.reason"
                    type="textarea"
                    :rows="4"
                    placeholder="请说明申诉理由"
                  />
                </el-form-item>
                <el-form-item label="附件">
                  <DispatchImageAttachments v-model="appealForm.attachments" />
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
            <el-form-item label="说明" required>
              <el-input v-model="commonForm.remark" type="textarea" :rows="4" placeholder="请填写审批说明" />
            </el-form-item>
          </el-form>
          <div class="op-actions">
            <el-button @click="goBack">取消</el-button>
            <el-button type="primary" @click="submitCommonHandle">提交</el-button>
          </div>
        </template>
      </section>

      <!-- 审批过程 -->
      <section class="block">
        <div class="block-title">审批过程</div>
        <el-timeline>
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

.page-header {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
}

.title-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.page-title {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
}

.source-tag {
  flex-shrink: 0;
}

.page-sub {
  margin: 0;
  font-size: 13px;
  color: #606266;
}

.block {
  border: 1px solid #ebeef5;
  border-radius: 8px;
  padding: 14px 16px 16px;
  background: #fafbfc;
}

.block-title {
  font-size: 15px;
  font-weight: 600;
  margin-bottom: 12px;
  color: #303133;
}

.flow-card {
  padding: 8px 10px;
  border-radius: 6px;
  background: #fff;
  border: 1px solid #ebeef5;
}

.flow-card.current {
  border-color: #f5dab1;
  background: #fdf6ec;
}

.flow-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  font-size: 14px;
}

.flow-meta,
.flow-remark {
  margin-top: 4px;
  font-size: 12px;
  color: #606266;
}

.op-form {
  max-width: 720px;
  background: #fff;
  padding: 12px 12px 0;
  border-radius: 6px;
}

.op-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #ebeef5;
}

.content-block {
  margin-top: 14px;
}

.block-label {
  font-size: 13px;
  font-weight: 600;
  color: #606266;
  margin-bottom: 8px;
}

.snapshot-img {
  max-width: 100%;
  max-height: 280px;
  border-radius: 6px;
  border: 1px solid #ebeef5;
  object-fit: contain;
  background: #fff;
}

.appeal-block {
  padding-top: 4px;
}

.report-detail-images {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.report-detail-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: 88px;
  text-decoration: none;
  color: #606266;
  font-size: 12px;
}

.report-detail-thumb {
  width: 88px;
  height: 66px;
  object-fit: cover;
  border-radius: 4px;
  border: 1px solid #ebeef5;
  background: #f5f7fa;
}

.report-detail-item span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
