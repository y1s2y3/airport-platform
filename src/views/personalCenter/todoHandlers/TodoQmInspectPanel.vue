<script setup>
import { computed } from 'vue'
import { Clock } from '@element-plus/icons-vue'
import QmTaskApprove from '../../quality/components/QmTaskApprove.vue'
import {
  findTask,
  getAttachments,
  getApprovalChain,
  getCurrentManualNode,
  getTaskMaterialLinks,
  getTaskSampleLinks,
  getTaskAsbuiltLinks,
  listNodeArchiveDocs,
  resolveApproverName,
  resolveProjectName,
  specialTypeLabel,
  wbsNodes,
  FILE_CATEGORY,
  TASK_STATUS,
  TASK_TYPE_LABEL,
  ORG_LABEL,
  ELEC_ARCHIVE_STATUS,
  approvalRecords,
  signatureRecords,
} from '../../../mock/qm.js'
import '../styles/todoHandleBlocks.css'

const props = defineProps({
  todo: { type: Object, required: true },
  isReadonly: { type: Boolean, default: false },
  onBack: { type: Function, default: null },
})

const taskId = computed(() => props.todo?.qmTaskId || '')
const approvePath = computed(() => props.todo?.approvePath || '/qm/inspect/batch/approve')
const editPath = computed(() => approvePath.value.replace(/\/approve$/, '/edit'))
const listPath = computed(() => {
  const path = approvePath.value
  if (path.includes('/special/')) return '/qm/inspect/special-deep'
  if (path.includes('/complete/')) return '/qm/inspect/complete-deep'
  return '/qm/inspect/form-fill-deep'
})

const task = computed(() => (taskId.value ? findTask(taskId.value) : null))

const nodeName = computed(() => {
  if (!task.value?.wbs_node_id) return props.todo?.detail?.nodeName || '—'
  return wbsNodes.find((n) => n.id === task.value.wbs_node_id)?.node_name || '—'
})

const projectName = computed(() => {
  if (task.value?.project_id) return resolveProjectName(task.value.project_id)
  return props.todo?.detail?.project || '—'
})

const contractorName = computed(() => {
  const orgId = task.value?.contractor_org_id || 'org-sg-01'
  return ORG_LABEL[orgId] || orgId || '—'
})

const statusLabel = computed(() => {
  if (!task.value) return props.todo?.detail?.currentNode || '待审批'
  return TASK_STATUS[task.value.status] || '待审批'
})

const isCompleteTask = computed(() => Number(task.value?.task_type) === 7)
const isSpecialTask = computed(() => Number(task.value?.task_type) === 6)

function formatFirstPass(flag) {
  if (flag == null || flag === '') return '—'
  return Number(flag) === 1 ? '是' : '否'
}

const siteAttachments = computed(() => {
  if (!task.value) return []
  return getAttachments('TASK', task.value.id)
})

const siteMediaList = computed(() =>
  siteAttachments.value.filter((a) => [1, 2].includes(Number(a.file_category))),
)

const siteMaterialList = computed(() =>
  siteAttachments.value.filter((a) => ![1, 2].includes(Number(a.file_category)) && !a.doc_slot),
)

const materialLinks = computed(() =>
  task.value ? getTaskMaterialLinks(task.value.id) : [],
)

const sampleLinks = computed(() => (task.value ? getTaskSampleLinks(task.value.id) : []))

const asbuiltLinks = computed(() => (task.value ? getTaskAsbuiltLinks(task.value.id) : []))

const elecArchiveDocs = computed(() => {
  if (!task.value?.wbs_node_id || Number(task.value.need_archive) !== 1) return []
  return listNodeArchiveDocs(task.value.wbs_node_id)
})

const records = computed(() =>
  task.value ? approvalRecords.filter((r) => r.task_id === task.value.id) : [],
)

const signs = computed(() =>
  task.value ? signatureRecords.filter((s) => s.task_id === task.value.id) : [],
)

const QM_APPROVAL_ACTION_LABEL = { 1: '提交', 2: '通过', 3: '不通过' }

function qmApprovalActionTagType(action) {
  const a = Number(action)
  if (a === 1 || a === 2) return 'success'
  if (a === 3) return 'danger'
  return 'warning'
}

function qmTimelineType(status) {
  if (status === 'done') return 'success'
  if (status === 'rejected') return 'danger'
  if (status === 'current') return 'warning'
  return 'info'
}

/** 审批过程步骤条（对齐填报/详情 · 品牌报审样式） */
const approvalProcessSteps = computed(() => {
  if (!task.value) return []
  const t = task.value
  const status = Number(t.status)
  const recs = records.value
  const typeLabel = TASK_TYPE_LABEL[t.task_type] || '验评'

  let midNodes = []
  if (Array.isArray(t.manual_approval_flow) && t.manual_approval_flow.length) {
    midNodes = [...t.manual_approval_flow]
      .sort((a, b) => Number(a.level) - Number(b.level))
      .map((n) => {
        const who = (n.approver_names && n.approver_names[0]) || ''
        return {
          label: n.label || '审批',
          title: who ? `${n.label}（${who}）` : n.label || '审批',
        }
      })
  } else if (t.supervisor_approver_name || t.pm_approver_name) {
    midNodes = [
      {
        label: '监理单位审批',
        title: t.supervisor_approver_name
          ? `监理单位审批（${t.supervisor_approver_name}）`
          : '监理单位审批',
      },
      {
        label: '项目经理审批',
        title: t.pm_approver_name ? `项目经理审批（${t.pm_approver_name}）` : '项目经理审批',
      },
    ]
  } else {
    midNodes = getApprovalChain(t).map((label) => ({ label, title: label }))
  }

  const currentNode = status === 1 ? getCurrentManualNode(t) : null
  const currentLabel = currentNode?.label || ''

  function midStep(node) {
    const rejectRec = [...recs]
      .reverse()
      .find(
        (r) =>
          Number(r.action) === 3 &&
          (r.node_name === node.label || r.operator_role === node.label),
      )
    if (rejectRec) {
      return { status: 'error', desc: rejectRec.action_time || '已驳回' }
    }
    const passRec = [...recs]
      .reverse()
      .find(
        (r) =>
          Number(r.action) === 2 &&
          (r.node_name === node.label || r.operator_role === node.label),
      )
    if (passRec) {
      return { status: 'success', desc: passRec.action_time || '已通过' }
    }
    if (status === 2) {
      return { status: 'success', desc: '已通过' }
    }
    if (status === 1 && currentLabel === node.label) {
      return { status: 'process', desc: '审批中' }
    }
    return { status: 'wait', desc: '等待' }
  }

  return [
    {
      title: '施工报验',
      ...(status === 0
        ? { status: 'wait', desc: '待提交' }
        : { status: 'success', desc: t.submit_time || '已提交' }),
    },
    ...midNodes.map((n) => ({ title: n.title, ...midStep(n) })),
    {
      title: '办结通过',
      ...(status === 2
        ? { status: 'success', desc: t.finish_time || typeLabel }
        : status === 3
          ? { status: 'error', desc: '未通过' }
          : { status: 'wait', desc: '等待' }),
    },
  ]
})

const approvalTimeline = computed(() => {
  if (!task.value) return []
  const t = task.value
  const steps = []
  for (const r of records.value) {
    const action = Number(r.action)
    const who = resolveApproverName(r.operator_id) || r.operator_role || '—'
    steps.push({
      key: r.id,
      title: r.node_name || r.operator_role || '节点',
      action,
      actionLabel: QM_APPROVAL_ACTION_LABEL[action] || '办理',
      operator: who,
      time: r.action_time || '—',
      remark: r.opinion || '',
      status: action === 3 ? 'rejected' : 'done',
    })
  }
  if (Number(t.status) === 1) {
    const node = getCurrentManualNode(t)
    if (node) {
      const who = (node.approver_names && node.approver_names[0]) || '审批人'
      steps.push({
        key: `pending-${node.level || node.label}`,
        title: node.label || '待审批',
        action: '',
        actionLabel: '待办理',
        operator: who,
        time: '',
        remark: '等待审批（个人中心待办）',
        status: 'current',
      })
    }
  }
  return steps
})

function formatFileSize(size) {
  const n = Number(size) || 0
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / 1024 / 1024).toFixed(1)} MB`
}

function isVideoExt(ext) {
  return ['mp4', 'mov', 'avi', 'wmv', 'webm'].includes(String(ext || '').toLowerCase())
}

function handleFinished() {
  props.onBack?.()
}

function handleBack() {
  props.onBack?.()
}
</script>

<template>
  <div class="qm-todo">
    <el-empty v-if="!task" description="未找到关联验评任务" :image-size="64">
      <el-button type="primary" @click="handleBack">返回</el-button>
    </el-empty>

    <template v-else>
      <!-- 任务信息（字段对齐填报/详情） -->
      <section class="block block--panel">
        <div class="block-head">
          <div class="block-title">
            {{ isCompleteTask ? '基本信息 · 竣工验收' : '任务信息' }}
          </div>
          <el-tag size="small" type="warning" effect="light">{{ statusLabel }}</el-tag>
        </div>
        <el-descriptions :column="2" border size="small" class="desc-panel">
          <el-descriptions-item label="验评单号">
            {{ task.task_no || todo.detail?.taskNo || '—' }}
          </el-descriptions-item>
          <el-descriptions-item label="验收类型">
            {{ TASK_TYPE_LABEL[task.task_type] || todo.bizType || '—' }}
          </el-descriptions-item>
          <el-descriptions-item label="项目名称">{{ projectName }}</el-descriptions-item>
          <el-descriptions-item label="施工单位">{{ contractorName }}</el-descriptions-item>
          <el-descriptions-item label="验收任务名称">
            {{ task.task_name || '—' }}
          </el-descriptions-item>
          <el-descriptions-item label="验收节点">{{ nodeName }}</el-descriptions-item>
          <el-descriptions-item v-if="isSpecialTask" label="专项类型">
            {{ specialTypeLabel(task.special_type) }}
          </el-descriptions-item>
          <el-descriptions-item v-if="!isSpecialTask" :label="isCompleteTask ? '工程/部位' : '施工部位'">
            {{ task.location_name || '—' }}
          </el-descriptions-item>
          <el-descriptions-item v-if="!isCompleteTask && !isSpecialTask" label="是否隐蔽工程">
            {{ Number(task.is_hidden_work) === 1 ? '是' : '否' }}
          </el-descriptions-item>
          <el-descriptions-item v-if="isCompleteTask" label="一次通过">
            {{ formatFirstPass(task.first_pass_flag) }}
          </el-descriptions-item>
          <el-descriptions-item label="申请人">{{ todo.applicant || '—' }}</el-descriptions-item>
          <el-descriptions-item label="申请时间">{{ todo.applyTime || '—' }}</el-descriptions-item>
        </el-descriptions>
      </section>

      <!-- 第一行：工程影像 | 附件资料 -->
      <div class="site-materials">
        <section class="block block--panel site-block">
          <div class="block-head">
            <div class="block-title">工程影像</div>
            <el-tag size="small" type="info" effect="plain">共 {{ siteMediaList.length }} 份</el-tag>
          </div>
          <el-table :data="siteMediaList" border size="small" empty-text="暂无工程影像">
            <el-table-column label="类型" width="72">
              <template #default="{ row }">
                <el-tag
                  size="small"
                  :type="isVideoExt(row.file_ext) || row.file_category === 2 ? 'warning' : 'success'"
                >
                  {{ isVideoExt(row.file_ext) || row.file_category === 2 ? '视频' : '图片' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="file_name" label="文件名" min-width="120" show-overflow-tooltip />
            <el-table-column label="类别" width="100">
              <template #default="{ row }">{{ FILE_CATEGORY[row.file_category] || '—' }}</template>
            </el-table-column>
            <el-table-column label="大小" width="80">
              <template #default="{ row }">{{ formatFileSize(row.file_size) }}</template>
            </el-table-column>
            <el-table-column prop="upload_time" label="上传时间" width="150" />
          </el-table>
        </section>

        <section class="block block--panel site-block">
          <div class="block-head">
            <div class="block-title">附件资料</div>
            <el-tag size="small" type="info" effect="plain">共 {{ siteMaterialList.length }} 份</el-tag>
          </div>
          <el-table :data="siteMaterialList" border size="small" empty-text="暂无附件资料">
            <el-table-column label="格式" width="72">
              <template #default="{ row }">
                <el-tag size="small" type="info">
                  {{ String(row.file_ext || '').toUpperCase() || 'FILE' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="file_name" label="文件名" min-width="120" show-overflow-tooltip />
            <el-table-column label="类别" width="100">
              <template #default="{ row }">{{ FILE_CATEGORY[row.file_category] || '—' }}</template>
            </el-table-column>
            <el-table-column label="大小" width="80">
              <template #default="{ row }">{{ formatFileSize(row.file_size) }}</template>
            </el-table-column>
            <el-table-column prop="upload_time" label="上传时间" width="150" />
          </el-table>
        </section>
      </div>

      <!-- 第二行：电子档案文件 | 材料设备 -->
      <div class="site-materials">
        <section class="block block--panel site-block">
          <div class="block-head">
            <div class="block-title">电子档案文件</div>
            <el-tag size="small" type="success" effect="plain">
              {{ ELEC_ARCHIVE_STATUS[task.elec_archive_status] || '自动带入·只读' }}
            </el-tag>
          </div>
          <el-table
            v-if="Number(task.need_archive) === 1"
            :data="elecArchiveDocs"
            border
            size="small"
            empty-text="暂无档案文档"
          >
            <el-table-column prop="doc_name" label="文档名称" min-width="140" show-overflow-tooltip />
            <el-table-column label="状态" width="100">
              <template #default="{ row }">
                <el-tag size="small" :type="row.filled ? 'success' : 'warning'" effect="plain">
                  {{ row.filled ? '已填报' : '需填报' }}
                </el-tag>
              </template>
            </el-table-column>
          </el-table>
          <el-empty v-else description="本单无需电子档案归档" :image-size="48" />
        </section>

        <section class="block block--panel site-block">
          <div class="block-head">
            <div class="block-title">材料设备</div>
            <el-tag size="small" type="info" effect="plain">共 {{ materialLinks.length }} 条</el-tag>
          </div>
          <el-table :data="materialLinks" border size="small" empty-text="暂无关联材料设备">
            <el-table-column prop="source_label" label="类型" width="70">
              <template #default="{ row }">{{ row.source_label || '—' }}</template>
            </el-table-column>
            <el-table-column prop="material_id" label="进场单号" width="110" show-overflow-tooltip />
            <el-table-column
              prop="material_name"
              label="名称"
              min-width="120"
              show-overflow-tooltip
            />
            <el-table-column prop="use_part" label="施工部位" min-width="100" show-overflow-tooltip>
              <template #default="{ row }">{{ row.use_part || '—' }}</template>
            </el-table-column>
            <el-table-column prop="brand_name" label="品牌" width="100" show-overflow-tooltip>
              <template #default="{ row }">{{ row.brand_name || '—' }}</template>
            </el-table-column>
            <el-table-column prop="quantity_text" label="规格及数量" width="110" show-overflow-tooltip>
              <template #default="{ row }">{{ row.quantity_text || '—' }}</template>
            </el-table-column>
            <el-table-column prop="supplier" label="供应商" min-width="90" show-overflow-tooltip />
          </el-table>
        </section>
      </div>

      <!-- 第三行：定版定样 | 实模对比报告 -->
      <div class="site-materials">
        <section class="block block--panel site-block">
          <div class="block-head">
            <div class="block-title">定版定样</div>
            <el-tag size="small" type="info" effect="plain">共 {{ sampleLinks.length }} 条</el-tag>
          </div>
          <el-table :data="sampleLinks" border size="small" empty-text="暂无关联定版定样">
            <el-table-column prop="sample_id" label="报审编号" width="120" show-overflow-tooltip />
            <el-table-column prop="sample_name" label="名称" min-width="120" show-overflow-tooltip />
            <el-table-column prop="sample_category" label="类型" width="100" />
            <el-table-column prop="brand_name" label="品牌" width="100" show-overflow-tooltip>
              <template #default="{ row }">{{ row.brand_name || '—' }}</template>
            </el-table-column>
            <el-table-column prop="use_part" label="使用部位" min-width="100" show-overflow-tooltip>
              <template #default="{ row }">{{ row.use_part || '—' }}</template>
            </el-table-column>
          </el-table>
        </section>

        <section class="block block--panel site-block">
          <div class="block-head">
            <div class="block-title">实模对比报告</div>
            <el-tag size="small" type="info" effect="plain">共 {{ asbuiltLinks.length }} 条</el-tag>
          </div>
          <el-table :data="asbuiltLinks" border size="small" empty-text="暂未关联实模一致验收">
            <el-table-column prop="biz_no" label="验收单号" width="120" />
            <el-table-column prop="title" label="任务名称" min-width="110" show-overflow-tooltip />
            <el-table-column prop="node_paths" label="所选节点" min-width="120" show-overflow-tooltip>
              <template #default="{ row }">{{ row.node_paths || '—' }}</template>
            </el-table-column>
            <el-table-column
              prop="report_names"
              label="报告附件"
              min-width="120"
              show-overflow-tooltip
            />
            <el-table-column label="对比地址" min-width="90">
              <template #default="{ row }">
                <el-button
                  v-if="row.compare_url"
                  link
                  type="primary"
                  tag="a"
                  :href="row.compare_url"
                  target="_blank"
                  rel="noopener"
                >
                  打开
                </el-button>
                <span v-else>—</span>
              </template>
            </el-table-column>
          </el-table>
        </section>
      </div>

      <!-- 审批操作：复用 QmTaskApprove 逻辑，仅操作区 -->
      <QmTaskApprove
        v-if="!isReadonly"
        actions-only
        embedded
        title="质量验评审批"
        :task-id="taskId"
        :todo-id="todo?.id || ''"
        :readonly="isReadonly"
        :list-path="listPath"
        :edit-path="editPath"
        @back="handleBack"
        @finished="handleFinished"
      />

      <!-- 签章记录 -->
      <section class="block block--panel">
        <div class="block-head">
          <div class="block-title">签章记录</div>
        </div>
        <el-table :data="signs" border size="small" empty-text="暂无签章">
          <el-table-column prop="signer_role" label="签章角色" width="140" />
          <el-table-column prop="ca_cert_id" label="CA证书标识" min-width="160" />
          <el-table-column prop="sign_time" label="签章时间" width="180" />
        </el-table>
      </section>

      <!-- 审批过程（样式对齐品牌报审 / 验评详情） -->
      <section class="approve-flow-section">
        <header class="approve-flow-head">
          <el-icon class="approve-flow-icon"><Clock /></el-icon>
          <h3 class="approve-flow-title">审批过程</h3>
        </header>
        <div class="approve-flow-body">
          <el-steps class="process-steps" align-center>
            <el-step
              v-for="(s, idx) in approvalProcessSteps"
              :key="`proc-${s.title}-${idx}`"
              :title="s.title"
              :description="s.desc"
              :status="s.status"
            />
          </el-steps>

          <el-timeline v-if="approvalTimeline.length" class="approval-timeline">
            <el-timeline-item
              v-for="step in approvalTimeline"
              :key="step.key"
              :type="qmTimelineType(step.status)"
              :hollow="step.status === 'current'"
              :timestamp="step.time || '进行中'"
              placement="top"
            >
              <div class="flow-card" :class="step.status">
                <div class="flow-title">
                  <span>{{ step.title }}</span>
                  <el-tag v-if="step.status === 'current'" size="small" type="warning">当前</el-tag>
                  <el-tag
                    v-else-if="step.actionLabel"
                    size="small"
                    :type="qmApprovalActionTagType(step.action)"
                    effect="light"
                  >
                    {{ step.actionLabel }}
                  </el-tag>
                </div>
                <div class="flow-meta">处理人：{{ step.operator }}</div>
                <div v-if="step.remark" class="flow-remark">意见：{{ step.remark }}</div>
              </div>
            </el-timeline-item>
          </el-timeline>
          <el-empty v-else description="暂无审批记录" :image-size="60" />
        </div>
      </section>
    </template>
  </div>
</template>

<style scoped>
.qm-todo {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.site-materials {
  display: flex;
  flex-direction: row;
  align-items: stretch;
  gap: 12px;
}

.site-block {
  flex: 1;
  min-width: 0;
  margin: 0;
}

.approve-flow-section {
  background: #fff;
  border: 1px solid #ebeef5;
  border-radius: 10px;
  overflow: hidden;
}

.approve-flow-head {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 18px 12px;
  background: linear-gradient(180deg, #fafbfc 0%, #fff 100%);
  border-bottom: 1px solid #f0f2f5;
}

.approve-flow-icon {
  font-size: 18px;
  color: var(--el-color-primary);
}

.approve-flow-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #1f2329;
  line-height: 1.4;
}

.approve-flow-body {
  padding: 16px 18px 18px;
}

.process-steps {
  margin: 4px 0 20px;
}

.approval-timeline {
  padding: 4px 8px 0;
}

.flow-card {
  padding: 10px 12px;
  border-radius: 8px;
  background: #fff;
  border: 1px solid #ebeef5;
}

.flow-card.done {
  border-color: #e1f3d8;
  background: #f0f9eb;
}

.flow-card.rejected {
  border-color: #fde2e2;
  background: #fef0f0;
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
  color: #303133;
}

.flow-meta,
.flow-remark {
  margin-top: 4px;
  font-size: 12px;
  color: #606266;
  line-height: 1.5;
}
</style>
