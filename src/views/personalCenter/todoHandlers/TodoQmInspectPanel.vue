<script setup>
import { computed } from 'vue'
import QmTaskApprove from '../../quality/components/QmTaskApprove.vue'
import {
  findTask,
  getAttachments,
  getItemsByTaskId,
  getTaskMaterialLinks,
  getTaskSampleLinks,
  getTaskAsbuiltLinks,
  listNodeArchiveDocs,
  resolveProjectName,
  specialTypeLabel,
  wbsNodes,
  FILE_CATEGORY,
  TASK_STATUS,
  TASK_TYPE_LABEL,
  ORG_LABEL,
  ELEC_ARCHIVE_STATUS,
  ITEM_CATEGORY,
  JUDGE_RESULT,
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

const items = computed(() => (task.value ? getItemsByTaskId(task.value.id) : []))

const records = computed(() =>
  task.value ? approvalRecords.filter((r) => r.task_id === task.value.id) : [],
)

const signs = computed(() =>
  task.value ? signatureRecords.filter((s) => s.task_id === task.value.id) : [],
)

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
      <!-- 任务信息（对齐填报） -->
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
          <el-descriptions-item label="施工部位">
            {{ task.location_name || '—' }}
          </el-descriptions-item>
          <el-descriptions-item v-if="task.task_type === 6" label="专项类型">
            {{ specialTypeLabel(task.special_type) }}
          </el-descriptions-item>
          <el-descriptions-item v-else-if="!isCompleteTask" label="是否隐蔽工程">
            {{ Number(task.is_hidden_work) === 1 ? '是' : '否' }}
          </el-descriptions-item>
          <el-descriptions-item v-if="!isCompleteTask" label="业主终审">
            {{ Number(task.owner_final_required) === 1 ? '需要' : '否' }}
          </el-descriptions-item>
          <el-descriptions-item label="一次通过">
            {{ formatFirstPass(task.first_pass_flag) }}
          </el-descriptions-item>
          <el-descriptions-item label="申请人">{{ todo.applicant || '—' }}</el-descriptions-item>
          <el-descriptions-item label="申请时间">{{ todo.applyTime || '—' }}</el-descriptions-item>
        </el-descriptions>
      </section>

      <!-- 工程影像（对齐填报） -->
      <section class="block block--panel">
        <div class="block-head">
          <div class="block-title">工程影像</div>
          <el-tag size="small" type="info" effect="plain">共 {{ siteMediaList.length }} 份</el-tag>
        </div>
        <el-table :data="siteMediaList" border size="small" empty-text="暂无工程影像">
          <el-table-column label="类型" width="88">
            <template #default="{ row }">
              <el-tag
                size="small"
                :type="isVideoExt(row.file_ext) || row.file_category === 2 ? 'warning' : 'success'"
              >
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
        </el-table>
      </section>

      <!-- 附件资料 -->
      <section class="block block--panel">
        <div class="block-head">
          <div class="block-title">附件资料</div>
          <el-tag size="small" type="info" effect="plain">共 {{ siteMaterialList.length }} 份</el-tag>
        </div>
        <el-table :data="siteMaterialList" border size="small" empty-text="暂无附件资料">
          <el-table-column label="格式" width="80">
            <template #default="{ row }">
              <el-tag size="small" type="info">
                {{ String(row.file_ext || '').toUpperCase() || 'FILE' }}
              </el-tag>
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
        </el-table>
      </section>

      <!-- 材料设备 -->
      <section class="block block--panel">
        <div class="block-head">
          <div class="block-title">材料设备</div>
          <el-tag size="small" type="info" effect="plain">共 {{ materialLinks.length }} 条</el-tag>
        </div>
        <el-table :data="materialLinks" border size="small" empty-text="暂无关联材料设备">
          <el-table-column prop="source_label" label="类型" width="70">
            <template #default="{ row }">{{ row.source_label || '—' }}</template>
          </el-table-column>
          <el-table-column
            prop="material_name"
            label="材料设备名称"
            min-width="160"
            show-overflow-tooltip
          />
          <el-table-column prop="use_part" label="施工部位" min-width="120" show-overflow-tooltip>
            <template #default="{ row }">{{ row.use_part || '—' }}</template>
          </el-table-column>
          <el-table-column prop="batch_no" label="批次/编号" width="130" show-overflow-tooltip />
          <el-table-column prop="supplier" label="供应商" min-width="110" show-overflow-tooltip />
        </el-table>
      </section>

      <!-- 定版定样 -->
      <section class="block block--panel">
        <div class="block-head">
          <div class="block-title">定版定样关联</div>
          <el-tag size="small" type="info" effect="plain">共 {{ sampleLinks.length }} 条</el-tag>
        </div>
        <el-table :data="sampleLinks" border size="small" empty-text="暂无关联定版定样">
          <el-table-column prop="sample_name" label="定样名称" min-width="160" show-overflow-tooltip />
          <el-table-column prop="sample_category" label="类别" width="110" />
          <el-table-column prop="use_part" label="施工部位" min-width="120" show-overflow-tooltip>
            <template #default="{ row }">{{ row.use_part || '—' }}</template>
          </el-table-column>
          <el-table-column prop="link_time" label="关联时间" width="160" />
        </el-table>
      </section>

      <!-- 实模对比报告 -->
      <section class="block block--panel">
        <div class="block-head">
          <div class="block-title">实模对比报告</div>
          <el-tag size="small" type="info" effect="plain">共 {{ asbuiltLinks.length }} 条</el-tag>
        </div>
        <el-table :data="asbuiltLinks" border size="small" empty-text="暂未关联实模一致验收">
          <el-table-column prop="biz_no" label="验收单号" width="130" />
          <el-table-column prop="title" label="任务名称" min-width="140" show-overflow-tooltip />
          <el-table-column
            prop="report_names"
            label="报告附件"
            min-width="160"
            show-overflow-tooltip
          />
          <el-table-column label="对比地址" min-width="120">
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

      <!-- 电子档案 -->
      <section class="block block--panel">
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
          <el-table-column prop="doc_name" label="文档名称" min-width="200" />
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

      <!-- 检查项核查（审批依据） -->
      <section class="block block--panel">
        <div class="block-head">
          <div class="block-title">检查项核查</div>
          <el-tag size="small" type="info" effect="plain">共 {{ items.length }} 项</el-tag>
        </div>
        <el-table :data="items" border size="small" empty-text="暂无检查项">
          <el-table-column prop="seq_no" label="序号" width="60" />
          <el-table-column label="类别" width="70">
            <template #default="{ row }">{{ ITEM_CATEGORY[row.item_category] }}</template>
          </el-table-column>
          <el-table-column prop="item_name" label="检查项" min-width="160" />
          <el-table-column prop="measured_value" label="实测值" min-width="120" />
          <el-table-column label="判定" width="90">
            <template #default="{ row }">{{ JUDGE_RESULT[row.judge_result] }}</template>
          </el-table-column>
        </el-table>
        <p class="hint-text">主控/观感不合格禁止通过；仅一般不合格可走方案B（须填意见）。</p>
      </section>

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

      <!-- 审批轨迹 -->
      <section class="block block--panel">
        <div class="block-head">
          <div class="block-title">审批轨迹</div>
        </div>
        <el-timeline v-if="records.length" class="flow-timeline">
          <el-timeline-item v-for="r in records" :key="r.id" :timestamp="r.action_time">
            {{ r.operator_role }} · {{ { 1: '提交', 2: '通过', 3: '不通过' }[r.action] || '办理' }}
            <span v-if="r.opinion"> — {{ r.opinion }}</span>
          </el-timeline-item>
        </el-timeline>
        <el-empty v-else description="暂无审批记录" :image-size="48" />
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

.hint-text {
  margin: 10px 0 0;
  font-size: 12px;
  color: #909399;
  line-height: 1.5;
}
</style>
