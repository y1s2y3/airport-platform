<script setup>
import { computed } from 'vue'
import QmTaskApprove from '../../quality/components/QmTaskApprove.vue'
import TodoApprovalFlowSection from '../components/TodoApprovalFlowSection.vue'
import {
  findTask,
  getAttachments,
  getApprovalChain,
  getCurrentManualNode,
  getNextApprovalRole,
  getTaskMaterialLinks,
  getTaskSampleLinks,
  getTaskAsbuiltLinks,
  listNodeArchiveDocs,
  isArchiveDocFilled,
  FILL_STATUS,
  displayTaskLocationName,
  resolveApproverName,
  resolveProjectName,
  wbsNodes,
  TASK_STATUS,
  TASK_TYPE_LABEL,
  ELEC_ARCHIVE_STATUS,
  approvalRecords,
  taskRequiresPmApproval,
  usesManualApprovalFlow,
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

const statusLabel = computed(() => {
  if (!task.value) return props.todo?.detail?.currentNode || '待审批'
  return TASK_STATUS[task.value.status] || '待审批'
})

const isCompleteTask = computed(() => Number(task.value?.task_type) === 7)
const isSpecialTask = computed(() => Number(task.value?.task_type) === 6)

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

/** 审批节点链（标题 + 处理人） */
function resolveMidNodes(t) {
  if (Array.isArray(t.manual_approval_flow) && t.manual_approval_flow.length) {
    return [...t.manual_approval_flow]
      .sort((a, b) => Number(a.level) - Number(b.level))
      .map((n) => ({
        label: n.label || '审批',
        user: (n.approver_names && n.approver_names[0]) || '审批人',
      }))
  }
  if (t.supervisor_approver_name || t.pm_approver_name) {
    const nodes = [
      {
        label: '监理单位审批',
        user: t.supervisor_approver_name || '监理',
      },
    ]
    if (taskRequiresPmApproval(t.task_type)) {
      nodes.push({
        label: '项目经理审批',
        user: t.pm_approver_name || '项目经理',
      })
    }
    return nodes
  }
  return getApprovalChain(t).map((label) => ({ label, user: label }))
}

/**
 * 审批过程：结构/样式对齐品牌报审个人中心（TodoApprovalFlowSection）
 * 字段：title / time / user / remark / status(done|current|pending)
 */
const panelApprovalFlow = computed(() => {
  if (!task.value) return props.todo?.approvalFlow || []
  const t = task.value
  const status = Number(t.status)
  const midNodes = resolveMidNodes(t)
  const steps = []

  steps.push({
    title: '施工报验',
    time: t.submit_time || props.todo?.applyTime || '',
    user: props.todo?.applicant || '施工方',
    remark: '提交报验',
    status: status === 0 ? 'pending' : 'done',
  })

  const currentNode =
    status === 1
      ? usesManualApprovalFlow(t)
        ? getCurrentManualNode(t)
        : { label: getNextApprovalRole(t) || midNodes[0]?.label }
      : null
  const currentLabel = currentNode?.label || ''
  let seenCurrent = false

  for (const node of midNodes) {
    const rejectRec = [...records.value]
      .reverse()
      .find(
        (r) =>
          Number(r.action) === 3 &&
          (r.node_name === node.label || r.operator_role === node.label),
      )
    if (rejectRec) {
      steps.push({
        title: node.label,
        time: rejectRec.action_time || '',
        user: resolveApproverName(rejectRec.operator_id) || rejectRec.operator_role || node.user,
        remark: rejectRec.opinion || '已驳回',
        status: 'done',
      })
      continue
    }
    const passRec = [...records.value]
      .reverse()
      .find(
        (r) =>
          Number(r.action) === 2 &&
          (r.node_name === node.label || r.operator_role === node.label),
      )
    if (passRec) {
      steps.push({
        title: node.label,
        time: passRec.action_time || '',
        user: resolveApproverName(passRec.operator_id) || passRec.operator_role || node.user,
        remark: passRec.opinion || '已通过',
        status: 'done',
      })
      continue
    }
    if (status === 2) {
      steps.push({
        title: node.label,
        time: t.finish_time || '',
        user: node.user,
        remark: '已通过',
        status: 'done',
      })
      continue
    }
    if (status === 1 && currentLabel === node.label && !seenCurrent) {
      seenCurrent = true
      steps.push({
        title: node.label,
        time: '',
        user: node.user || '当前用户',
        remark: '待办理',
        status: 'current',
      })
      continue
    }
    steps.push({
      title: node.label,
      time: '',
      user: node.user || '—',
      remark: status === 3 ? '' : '待流转',
      status: 'pending',
    })
  }

  if (status === 2) {
    steps.push({
      title: '办结通过',
      time: t.finish_time || '',
      user: '系统',
      remark: TASK_TYPE_LABEL[t.task_type] || '验评办结',
      status: 'done',
    })
  } else if (status === 3) {
    steps.push({
      title: '办结',
      time: t.finish_time || '',
      user: '系统',
      remark: '未通过',
      status: 'done',
    })
  } else {
    steps.push({
      title: '办结通过',
      time: '',
      user: '—',
      remark: '',
      status: 'pending',
    })
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
          <el-descriptions-item label="验收任务名称">
            {{ task.task_name || '—' }}
          </el-descriptions-item>
          <el-descriptions-item label="验收节点">{{ nodeName }}</el-descriptions-item>
          <el-descriptions-item v-if="!isSpecialTask" :label="isCompleteTask ? '工程/部位' : '施工部位'">
            {{ displayTaskLocationName(task) || '—' }}
          </el-descriptions-item>
          <el-descriptions-item v-if="!isCompleteTask && !isSpecialTask" label="是否隐蔽工程">
            {{ Number(task.is_hidden_work) === 1 ? '是' : '否' }}
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
                <el-tag size="small" :type="isArchiveDocFilled(row) ? 'success' : 'warning'" effect="plain">
                  {{ isArchiveDocFilled(row) ? FILL_STATUS[1] : FILL_STATUS[0] }}
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
            <el-table-column prop="material_id" label="进场单号" width="110" show-overflow-tooltip />
            <el-table-column prop="source_label" label="类型" width="70">
              <template #default="{ row }">{{ row.source_label || '—' }}</template>
            </el-table-column>
            <el-table-column
              prop="material_name"
              label="名称"
              min-width="120"
              show-overflow-tooltip
            />
            <el-table-column label="规格型号" min-width="110" show-overflow-tooltip>
              <template #default="{ row }">{{ row.material_spec || '—' }}</template>
            </el-table-column>
            <el-table-column prop="brand_name" label="品牌" width="90" show-overflow-tooltip>
              <template #default="{ row }">{{ row.brand_name || '—' }}</template>
            </el-table-column>
            <el-table-column label="定样单号" width="100" show-overflow-tooltip>
              <template #default="{ row }">{{ row.sample_application_id || '—' }}</template>
            </el-table-column>
            <el-table-column prop="quantity_text" label="进场数量" width="90" show-overflow-tooltip>
              <template #default="{ row }">{{ row.quantity_text || '—' }}</template>
            </el-table-column>
            <el-table-column prop="supplier" label="供应商" min-width="90" show-overflow-tooltip />
            <el-table-column label="进场时间" width="150" show-overflow-tooltip>
              <template #default="{ row }">{{ row.submit_time || '—' }}</template>
            </el-table-column>
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
            <el-table-column prop="sample_category" label="类型" width="100" />
            <el-table-column prop="sample_name" label="名称" min-width="120" show-overflow-tooltip />
            <el-table-column prop="brand_name" label="品牌" width="100" show-overflow-tooltip>
              <template #default="{ row }">{{ row.brand_name || '—' }}</template>
            </el-table-column>
            <el-table-column label="定样日期" width="110">
              <template #default="{ row }">{{ row.sample_date || '—' }}</template>
            </el-table-column>
            <el-table-column prop="unit_name" label="单位工程" min-width="100" show-overflow-tooltip>
              <template #default="{ row }">{{ row.unit_name || '—' }}</template>
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
          </el-table>
        </section>
      </div>

      <!-- 审批操作：对齐品牌报审（通过/驳回 + 说明 + 提交） -->
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

      <!-- 审批过程：与品牌报审个人中心同一组件 -->
      <TodoApprovalFlowSection :approval-flow="panelApprovalFlow" />
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
</style>
