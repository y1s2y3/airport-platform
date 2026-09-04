<script setup>
/**
 * 竣工验收 — 本页直接展示填报表单
 * 右上角：驳回记录（有记录才显）/ 重新报审（已驳回才显）
 */
import { computed, defineAsyncComponent, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useQmProjectScope } from '../../composables/useCurrentProject'
import {
  approvalRecords,
  buildCompleteGate,
  FILE_CATEGORY,
  findTask,
  getAttachments,
  getCompleteRejectOpinion,
  getOrCreateCompleteDraft,
  listCompleteRejectRecords,
  ORG_LABEL,
  reDeclareCompleteAcceptance,
  resolveProjectName,
  TASK_STATUS,
  TASK_TYPE_LABEL,
} from '../../mock/qm.js'
import QmCompletePrereqPanel from './components/QmCompletePrereqPanel.vue'

/** 填报组件体积大，仅有任务时再加载 */
const QmTaskEdit = defineAsyncComponent(() => import('./components/QmTaskEdit.vue'))

const { isHqSelected, scopeProjectId, scopeProjectLabel } = useQmProjectScope()
const tick = ref(0)
const draftTaskId = ref('')

const rejectListVisible = ref(false)
const rejectDetailVisible = ref(false)
const detailTask = ref(null)

const gate = computed(() => {
  void tick.value
  return buildCompleteGate(isHqSelected.value ? '' : scopeProjectId.value)
})

const rejectRecords = computed(() => {
  void tick.value
  if (isHqSelected.value || !scopeProjectId.value) return []
  return listCompleteRejectRecords(scopeProjectId.value)
})

const currentTask = computed(() => {
  void tick.value
  if (!draftTaskId.value) return null
  return findTask(draftTaskId.value)
})

const isRejected = computed(() => Number(currentTask.value?.status) === 3)

const detailRejectRec = computed(() =>
  detailTask.value ? getCompleteRejectOpinion(detailTask.value.id) : null,
)

const detailAttachments = computed(() =>
  detailTask.value ? getAttachments('TASK', detailTask.value.id) : [],
)

const detailApprovalFlow = computed(() => {
  if (!detailTask.value) return []
  return approvalRecords
    .filter((r) => r.task_id === detailTask.value.id)
    .slice()
    .sort((a, b) => String(a.action_time || '').localeCompare(String(b.action_time || '')))
})

const ACTION_LABEL = { 1: '提交', 2: '通过', 3: '驳回', 4: '退回' }

function refreshDraft() {
  draftTaskId.value = ''
  if (isHqSelected.value || !scopeProjectId.value) {
    tick.value += 1
    return
  }
  const r = getOrCreateCompleteDraft(scopeProjectId.value)
  if (r.task) draftTaskId.value = r.task.id
  tick.value += 1
}

watch([scopeProjectId, isHqSelected], refreshDraft, { immediate: true })

watch(
  () => gate.value.canStart,
  (ok, prev) => {
    if (ok && !prev && !draftTaskId.value) refreshDraft()
  },
)

async function onReDeclare() {
  const task = currentTask.value
  if (!task || Number(task.status) !== 3) return
  try {
    await ElMessageBox.confirm(
      `将基于「${task.task_no}」复制表单新建报审单，原单保留为驳回记录。确认重新报审？`,
      '重新报审',
      { type: 'warning', confirmButtonText: '重新报审', cancelButtonText: '取消' },
    )
  } catch {
    return
  }
  const r = reDeclareCompleteAcceptance(task)
  if (!r.ok) return ElMessage.error(r.msg)
  draftTaskId.value = r.task.id
  tick.value += 1
  ElMessage.success(`已复制建新单 ${r.task.task_no}，请完善后提交报审`)
}

function openRejectList() {
  tick.value += 1
  rejectListVisible.value = true
}

function openRejectDetail(row) {
  detailTask.value = findTask(row.id) || row
  rejectDetailVisible.value = true
}

function formDataEntries(task) {
  const data = task?.form_data || {}
  const rows = []
  Object.values(data).forEach((bucket) => {
    if (!bucket || typeof bucket !== 'object') return
    Object.entries(bucket).forEach(([k, v]) => {
      rows.push({ key: k, value: v == null || v === '' ? '—' : String(v) })
    })
  })
  return rows
}
</script>

<template>
  <div class="qm-page page-card">
    <div class="page-header page-header--actions">
      <div class="page-header-main">
        <div class="page-breadcrumb">质量验评 / 竣工验收</div>
        <h1 class="page-title">竣工验收</h1>
        <p class="page-tip">
          当前：{{ isHqSelected ? '请切换到具体项目' : scopeProjectLabel }}
          · 实体工程验收与专项验收均全部完成后，可在本页直接填报
        </p>
      </div>
      <div v-if="!isHqSelected" class="page-header-actions">
        <el-button v-if="rejectRecords.length" @click="openRejectList">驳回记录</el-button>
        <el-button v-if="isRejected" type="primary" @click="onReDeclare">重新报审</el-button>
      </div>
    </div>

    <el-alert
      v-if="isHqSelected"
      type="warning"
      :closable="false"
      show-icon
      title="竣工验收仅项目级可用，请先在顶部切换到具体项目"
      class="mb"
    />

    <template v-else>
      <div class="section-title">前置完成情况</div>
      <QmCompletePrereqPanel :gate="gate" class="mb" />

      <el-alert
        v-if="isRejected"
        type="warning"
        :closable="false"
        show-icon
        class="mb"
        title="当前为已驳回存档单（只读）。可点击右上角「重新报审」复制表单新建报审。"
      />

      <QmTaskEdit
        v-if="draftTaskId"
        :key="draftTaskId"
        :task-id="draftTaskId"
        title="竣工填报/报验"
        list-path="/qm/inspect/complete-deep"
        embedded
        hide-prereq
      />
      <el-empty
        v-else
        description="实体工程与专项验收均全部完成后，本页将自动展开竣工填报表单"
        :image-size="72"
      />
    </template>

    <!-- 驳回记录列表 -->
    <el-dialog
      v-model="rejectListVisible"
      title="驳回记录"
      width="720px"
      destroy-on-close
      append-to-body
    >
      <el-table :data="rejectRecords" border size="small" empty-text="暂无驳回记录">
        <el-table-column prop="task_no" label="验收单号" width="130" />
        <el-table-column label="工程/部位" min-width="140" show-overflow-tooltip>
          <template #default="{ row }">{{ row.location_name || '—' }}</template>
        </el-table-column>
        <el-table-column label="申请时间" width="160">
          <template #default="{ row }">{{ row.submit_time || '—' }}</template>
        </el-table-column>
        <el-table-column label="驳回时间" width="160">
          <template #default="{ row }">
            {{ getCompleteRejectOpinion(row.id)?.action_time || row.finish_time || row.updated_at || '—' }}
          </template>
        </el-table-column>
        <el-table-column label="驳回意见" min-width="160" show-overflow-tooltip>
          <template #default="{ row }">
            {{ getCompleteRejectOpinion(row.id)?.opinion || row.remark || '—' }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="88" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openRejectDetail(row)">查看详情</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-dialog>

    <!-- 驳回记录详情 -->
    <el-dialog
      v-model="rejectDetailVisible"
      title="驳回记录详情"
      width="640px"
      destroy-on-close
      append-to-body
    >
      <template v-if="detailTask">
        <el-descriptions :column="2" border size="small" class="mb">
          <el-descriptions-item label="验评单号">{{ detailTask.task_no || '—' }}</el-descriptions-item>
          <el-descriptions-item label="验收类型">
            {{ TASK_TYPE_LABEL[detailTask.task_type] || '竣工验收' }}
          </el-descriptions-item>
          <el-descriptions-item label="状态">
            {{ TASK_STATUS[detailTask.status] || '已驳回' }}
          </el-descriptions-item>
          <el-descriptions-item label="项目名称">
            {{ resolveProjectName(detailTask.project_id) }}
          </el-descriptions-item>
          <el-descriptions-item label="施工单位">
            {{ ORG_LABEL[detailTask.contractor_org_id] || detailTask.contractor_org_id || '—' }}
          </el-descriptions-item>
          <el-descriptions-item label="工程/部位">
            {{ detailTask.location_name || '—' }}
          </el-descriptions-item>
          <el-descriptions-item label="申请人">{{ detailTask.applicant_id || '—' }}</el-descriptions-item>
          <el-descriptions-item label="申请时间">{{ detailTask.submit_time || '—' }}</el-descriptions-item>
          <el-descriptions-item label="驳回时间">
            {{ detailRejectRec?.action_time || detailTask.finish_time || '—' }}
          </el-descriptions-item>
          <el-descriptions-item label="驳回人">
            {{ detailRejectRec?.operator_role || detailTask.reviewer_id || '—' }}
          </el-descriptions-item>
          <el-descriptions-item label="驳回意见" :span="2">
            {{ detailRejectRec?.opinion || detailTask.remark || '—' }}
          </el-descriptions-item>
        </el-descriptions>

        <div class="section-title">表单数据</div>
        <el-descriptions
          v-if="formDataEntries(detailTask).length"
          :column="1"
          border
          size="small"
          class="mb"
        >
          <el-descriptions-item
            v-for="row in formDataEntries(detailTask)"
            :key="row.key"
            :label="row.key"
          >
            {{ row.value }}
          </el-descriptions-item>
        </el-descriptions>
        <el-empty v-else description="无表单数据" :image-size="48" class="mb" />

        <div class="section-title">附件资料</div>
        <el-table
          :data="detailAttachments"
          border
          size="small"
          empty-text="暂无附件"
          class="mb"
        >
          <el-table-column prop="file_name" label="文件名" min-width="160" show-overflow-tooltip />
          <el-table-column label="类别" width="110">
            <template #default="{ row }">{{ FILE_CATEGORY[row.file_category] || '—' }}</template>
          </el-table-column>
          <el-table-column prop="upload_time" label="上传时间" width="160" />
        </el-table>

        <div class="section-title">审批过程</div>
        <el-timeline v-if="detailApprovalFlow.length">
          <el-timeline-item
            v-for="r in detailApprovalFlow"
            :key="r.id"
            :timestamp="r.action_time || '—'"
            placement="top"
            :type="Number(r.action) === 3 ? 'danger' : Number(r.action) === 2 ? 'success' : 'primary'"
          >
            <div class="flow-line">
              <strong>{{ r.node_name || '—' }}</strong>
              · {{ ACTION_LABEL[r.action] || '操作' }}
              · {{ r.operator_role || r.operator_id || '—' }}
            </div>
            <div v-if="r.opinion" class="flow-opinion">意见：{{ r.opinion }}</div>
          </el-timeline-item>
        </el-timeline>
        <el-empty v-else description="暂无审批记录" :image-size="48" />
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.qm-page { display: flex; flex-direction: column; gap: 12px; }
.page-header--actions {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}
.page-header-main { flex: 1; min-width: 0; }
.page-header-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  flex-shrink: 0;
  padding-top: 4px;
}
.page-breadcrumb { font-size: 12px; color: #909399; }
.page-title { margin: 4px 0; font-size: 20px; }
.page-tip { margin: 0; font-size: 13px; color: #606266; }
.section-title {
  margin: 4px 0 8px;
  font-size: 15px;
  font-weight: 600;
  color: #303133;
}
.mb { margin-bottom: 12px; }
.flow-line { font-size: 13px; color: #303133; }
.flow-opinion { margin-top: 4px; font-size: 12px; color: #606266; }
</style>
