<script setup>
import './mat-page.css'
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Download, Clock } from '@element-plus/icons-vue'
import {
  getEntryDetail,
  ENTRY_TYPE_LABEL,
  statusLabel,
  statusTagType,
  formatBatchNo,
  findMatSupervisorApprover,
  formatMatSupervisorApproverLabel,
} from '../../../mock/mat.js'
import { useMatArchiveExport } from '../../../composables/useMatArchiveExport.js'
import MatArchiveExportDialog from './components/MatArchiveExportDialog.vue'
import PersonalCenterReadonlyHint from '../../../components/PersonalCenterReadonlyHint.vue'

const route = useRoute()
const router = useRouter()

const detail = computed(() => {
  const id = String(route.query.id || '')
  return id ? getEntryDetail(id) : null
})

const showReadonlyHint = computed(
  () =>
    detail.value &&
    (detail.value.status === 'reviewing' || detail.value.status === 'pending_review'),
)

function supervisorApproverDisplay(row) {
  if (!row) return '—'
  const user = findMatSupervisorApprover(row.supervisor_approver_user_id)
  if (user) return formatMatSupervisorApproverLabel(user)
  if (row.supervisor_approver_name) {
    const post = row.supervisor_approver_post_label
    return post ? `${row.supervisor_approver_name}（${post}）` : row.supervisor_approver_name
  }
  return '—'
}

const canExportArchive = computed(() => detail.value?.status === 'approved')
const { dialogVisible, exportLoading, openExportDialog, confirmExport } = useMatArchiveExport()

function onExportArchive() {
  if (!detail.value || exportLoading.value) return
  openExportDialog(detail.value)
}

async function onConfirmExportArchive(selectedKeys) {
  await confirmExport(selectedKeys)
}

const lineItems = computed(() => {
  if (!detail.value) return []
  const header = detail.value
  if (header.entry_type === 'equipment') {
    const rows = header.line_items?.length
      ? header.line_items
      : [
          {
            equipment_name: header.equipment_name,
            material_spec: header.model || '',
            model: header.model || '',
            quantity: header.quantity,
            unit: header.unit,
            serial_no: header.serial_no || '',
            waybill_no: header.waybill_no || '',
            batch_no: header.batch_no || '',
            unpack_items: header.unpack_items || [],
          },
        ]
    return rows.map((row, idx) => ({
      ...row,
      equipment_name: row.equipment_name || row.material_name || '',
      model: row.model || row.material_spec || '',
      purpose: row.purpose || '',
      use_part: row.use_part || (idx === 0 ? header.use_part : '') || '',
      appearance_quality: row.appearance_quality || '',
      acceptance_result: row.acceptance_result || '',
      entry_date: row.entry_date || header.submit_time || '',
      cert_file: row.cert_file || (idx === 0 ? header.cert_file : '') || '',
      inspect_file: row.inspect_file || (idx === 0 ? header.inspect_file : '') || '',
      photo_file: row.photo_file || (idx === 0 ? header.photo_file : '') || '',
      other_file: row.other_file || (idx === 0 ? header.other_file : '') || '',
      inspect_result_checked: !!(
        row.inspect_result_checked ??
        (idx === 0 ? header.inspect_result_checked : false)
      ),
      inspect_result_file:
        row.inspect_result_file ||
        (idx === 0 && header.inspect_result_checked ? header.inspect_result_file : '') ||
        '',
      unpack_items:
        row.unpack_items?.length
          ? row.unpack_items
          : idx === 0 && header.unpack_items?.length
            ? header.unpack_items
            : [],
    }))
  }
  const rows = header.line_items?.length
    ? header.line_items
    : [
        {
          material_name: header.material_name,
          material_spec: header.material_spec || '',
          quantity: header.quantity,
          unit: header.unit,
          waybill_no: header.waybill_no || '',
          batch_no: header.batch_no || '',
        },
      ]
  return rows.map((row, idx) => ({
    ...row,
    purpose: row.purpose || '',
    use_part: row.use_part || (idx === 0 ? header.use_part : '') || '',
    appearance_quality: row.appearance_quality || '',
    acceptance_result: row.acceptance_result || '',
    entry_date: row.entry_date || header.submit_time || '',
    cert_file: row.cert_file || (idx === 0 ? header.cert_file : '') || '',
    inspect_file: row.inspect_file || (idx === 0 ? header.inspect_file : '') || '',
    photo_file: row.photo_file || (idx === 0 ? header.photo_file : '') || '',
    other_file: row.other_file || (idx === 0 ? header.other_file : '') || '',
    inspect_result_checked: !!(
      row.inspect_result_checked ??
      (idx === 0 ? header.inspect_result_checked : false)
    ),
    inspect_result_file:
      row.inspect_result_file ||
      (idx === 0 && header.inspect_result_checked ? header.inspect_result_file : '') ||
      '',
  }))
})

const isInApproval = computed(() => {
  const s = detail.value?.status
  return s === 'reviewing' || s === 'pending_review'
})

const lastSupervisorRecord = computed(() => {
  const rows = (detail.value?.approvals || []).filter(
    (r) => !r.node || r.node === 'supervisor',
  )
  return rows[rows.length - 1] || null
})

/** 顶部步骤条：施工提交 → 监理审批（对齐品牌报审展示） */
const processSteps = computed(() => {
  const d = detail.value
  if (!d) return []
  const last = lastSupervisorRecord.value

  function supervisorStep() {
    if (last?.action === 'agree') return { status: 'success', desc: last.time || '已同意' }
    if (last?.action === 'reject') return { status: 'error', desc: last.time || '已退回' }
    if (isInApproval.value) return { status: 'process', desc: '审批中' }
    return { status: 'wait', desc: '等待' }
  }

  return [
    { title: '施工提交', status: 'success', desc: d.submit_time || '已提交' },
    { title: '监理审批', ...supervisorStep() },
  ]
})

const ACTION_LABEL = { submit: '提交', agree: '同意', reject: '退回' }

/** 时间线：提交 + 已办审批 + 当前待办（对齐品牌报审） */
const approvalTimeline = computed(() => {
  const d = detail.value
  if (!d) return []
  const steps = [
    {
      key: 'submit',
      title: '施工提交',
      action: 'submit',
      actionLabel: ACTION_LABEL.submit,
      operator: d.applicant_name || '—',
      time: d.submit_time || '—',
      remark: '提交进场报审',
      status: 'done',
    },
  ]
  for (const r of d.approvals || []) {
    steps.push({
      key: r.approval_id,
      title: '监理审批',
      action: r.action,
      actionLabel: ACTION_LABEL[r.action] || r.action,
      operator: r.operator || '—',
      time: r.time || '—',
      remark: r.opinion || '',
      status: r.action === 'reject' ? 'rejected' : 'done',
    })
  }
  if (isInApproval.value) {
    steps.push({
      key: 'pending-supervisor',
      title: '监理审批',
      action: '',
      actionLabel: '待办理',
      operator: supervisorApproverDisplay(d),
      time: '',
      remark: '等待审批（个人中心待办）',
      status: 'current',
    })
  }
  return steps
})

function timelineType(status) {
  if (status === 'done') return 'success'
  if (status === 'rejected') return 'danger'
  if (status === 'current') return 'warning'
  return 'info'
}

function actionTagType(action) {
  if (action === 'agree' || action === 'submit') return 'success'
  if (action === 'reject') return 'danger'
  return 'warning'
}
</script>

<template>
  <div class="qm-page page-card">
    <div class="page-header">
      <div class="page-breadcrumb">材料设备进场 / 进场详情</div>
      <div class="title-row">
        <h1 class="page-title">进场详情 {{ detail?.entry_id || '' }}</h1>
        <el-tag v-if="detail?.exited" type="warning" effect="plain">已退场</el-tag>
        <el-button
          v-if="canExportArchive"
          type="primary"
          :icon="Download"
          :loading="exportLoading"
          @click="onExportArchive"
        >
          导出归档文件
        </el-button>
        <el-button @click="router.back()">返回</el-button>
      </div>
    </div>

    <el-empty v-if="!detail" description="未找到进场单" />

    <template v-else>
      <PersonalCenterReadonlyHint v-if="showReadonlyHint" />
      <h3 class="section-title">品牌与定样</h3>
      <el-descriptions :column="2" border class="mb info-desc">
        <el-descriptions-item label="进场单号">{{ detail.entry_id }}</el-descriptions-item>
        <el-descriptions-item label="进场类型">
          {{ ENTRY_TYPE_LABEL[detail.entry_type] || '材料' }}
        </el-descriptions-item>
        <el-descriptions-item label="审批状态">
          <el-tag size="small" :type="statusTagType(detail.status)">
            {{ statusLabel(detail.status) }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item v-if="detail.copy_from_entry_id" label="复制来源">
          {{ detail.copy_from_entry_id }}
        </el-descriptions-item>
        <el-descriptions-item v-else-if="detail.related_reject_id" label="关联驳回原单">
          {{ detail.related_reject_id }}
        </el-descriptions-item>
        <el-descriptions-item label="项目">{{ detail.project_label }}</el-descriptions-item>
        <el-descriptions-item label="品牌">{{ detail.brand_name }}</el-descriptions-item>
        <el-descriptions-item label="生产厂家">{{ detail.manufacturer || '—' }}</el-descriptions-item>
        <el-descriptions-item label="供应商">{{ detail.supplier || '—' }}</el-descriptions-item>
        <el-descriptions-item label="关联定样">{{
          detail.sample_application_id || detail.sample_id || '—'
        }}</el-descriptions-item>
        <el-descriptions-item label="申请人">{{ detail.applicant_name }}</el-descriptions-item>
        <el-descriptions-item label="监理审批人">
          {{ supervisorApproverDisplay(detail) }}
        </el-descriptions-item>
        <el-descriptions-item label="提交时间">{{ detail.submit_time }}</el-descriptions-item>
        <el-descriptions-item label="办结时间">{{ detail.finish_time || '—' }}</el-descriptions-item>
        <el-descriptions-item
          v-if="detail.status === 'approved' && detail.entry_type === 'material'"
          label="退场状态"
        >
          <el-tag size="small" :type="detail.exited ? 'warning' : 'info'" effect="plain">
            {{ detail.exited ? '已退场' : '未退场' }}
          </el-tag>
        </el-descriptions-item>
      </el-descriptions>

      <template v-if="detail.entry_type !== 'equipment'">
        <h3 class="section-title">材料进场明细</h3>
        <div v-for="(row, idx) in lineItems" :key="`${row.material_name}-${idx}`" class="line-card mb">
          <div class="line-card-title">材料 {{ idx + 1 }}</div>
          <el-descriptions :column="2" border class="info-desc">
            <el-descriptions-item label="材料名称">{{ row.material_name || '—' }}</el-descriptions-item>
            <el-descriptions-item label="规格型号">{{ row.material_spec || '—' }}</el-descriptions-item>
            <el-descriptions-item label="数量">
              <template v-if="row.quantity != null && row.quantity !== ''">
                {{ row.quantity }}{{ row.unit || '' }}
              </template>
              <template v-else>—</template>
            </el-descriptions-item>
            <el-descriptions-item label="用途">{{ row.purpose || '—' }}</el-descriptions-item>
            <el-descriptions-item label="施工部位">{{ row.use_part || '—' }}</el-descriptions-item>
            <el-descriptions-item label="运单号">{{ row.waybill_no || '—' }}</el-descriptions-item>
            <el-descriptions-item label="批次号">{{ formatBatchNo(row.batch_no) }}</el-descriptions-item>
            <el-descriptions-item label="外观质量">{{ row.appearance_quality || '—' }}</el-descriptions-item>
            <el-descriptions-item label="验收结论">{{ row.acceptance_result || '—' }}</el-descriptions-item>
            <el-descriptions-item label="进场日期">{{ row.entry_date || '—' }}</el-descriptions-item>
            <el-descriptions-item label="合格证">{{ row.cert_file || '—' }}</el-descriptions-item>
            <el-descriptions-item label="质量证明文件">{{ row.inspect_file || '—' }}</el-descriptions-item>
            <el-descriptions-item label="现场照片">{{ row.photo_file || '—' }}</el-descriptions-item>
            <el-descriptions-item label="其他">{{ row.other_file || '—' }}</el-descriptions-item>
            <el-descriptions-item label="已完成送检">
              {{ row.inspect_result_checked ? '是' : '否' }}
            </el-descriptions-item>
            <el-descriptions-item label="送检附件">
              {{
                row.inspect_result_checked
                  ? row.inspect_result_file || '未上传'
                  : '—'
              }}
            </el-descriptions-item>
          </el-descriptions>
        </div>
      </template>

      <template v-if="detail.entry_type === 'equipment'">
        <h3 class="section-title">设备进场明细</h3>
        <div
          v-for="(row, idx) in lineItems"
          :key="`${row.equipment_name}-${idx}`"
          class="line-card mb"
        >
          <div class="line-card-title">设备 {{ idx + 1 }}</div>
          <el-descriptions :column="2" border class="info-desc">
            <el-descriptions-item label="设备名称">{{ row.equipment_name || '—' }}</el-descriptions-item>
            <el-descriptions-item label="规格型号">{{ row.model || '—' }}</el-descriptions-item>
            <el-descriptions-item label="数量">
              <template v-if="row.quantity != null && row.quantity !== ''">
                {{ row.quantity }}{{ row.unit || '' }}
              </template>
              <template v-else>—</template>
            </el-descriptions-item>
            <el-descriptions-item label="序列号">{{ row.serial_no || '—' }}</el-descriptions-item>
            <el-descriptions-item label="用途">{{ row.purpose || '—' }}</el-descriptions-item>
            <el-descriptions-item label="施工部位">{{ row.use_part || '—' }}</el-descriptions-item>
            <el-descriptions-item label="运单号">{{ row.waybill_no || '—' }}</el-descriptions-item>
            <el-descriptions-item label="批次号">{{ formatBatchNo(row.batch_no) }}</el-descriptions-item>
            <el-descriptions-item label="外观质量">{{ row.appearance_quality || '—' }}</el-descriptions-item>
            <el-descriptions-item label="验收结论">{{ row.acceptance_result || '—' }}</el-descriptions-item>
            <el-descriptions-item label="进场日期">{{ row.entry_date || '—' }}</el-descriptions-item>
            <el-descriptions-item label="合格证">{{ row.cert_file || '—' }}</el-descriptions-item>
            <el-descriptions-item label="质量证明文件">{{ row.inspect_file || '—' }}</el-descriptions-item>
            <el-descriptions-item label="现场照片">{{ row.photo_file || '—' }}</el-descriptions-item>
            <el-descriptions-item label="其他">{{ row.other_file || '—' }}</el-descriptions-item>
            <el-descriptions-item label="已完成送检">
              {{ row.inspect_result_checked ? '是' : '否' }}
            </el-descriptions-item>
            <el-descriptions-item label="送检附件">
              {{
                row.inspect_result_checked
                  ? row.inspect_result_file || '未上传'
                  : '—'
              }}
            </el-descriptions-item>
          </el-descriptions>
          <h4 class="sub-title">开箱清单</h4>
          <el-row v-if="row.unpack_items?.length" :gutter="16" class="unpack-grid">
            <el-col v-for="unpackRow in row.unpack_items" :key="unpackRow.key || unpackRow.label" :span="6">
              <div class="unpack-card">
                <div class="unpack-card-head">
                  <span class="unpack-label">{{ unpackRow.label }}</span>
                  <el-tag size="small" :type="unpackRow.ok ? 'success' : 'danger'">
                    {{ unpackRow.ok ? '合格' : '不合格' }}
                  </el-tag>
                </div>
                <div class="unpack-remark">{{ unpackRow.remark || '无备注' }}</div>
              </div>
            </el-col>
          </el-row>
          <el-empty v-else description="无开箱记录" :image-size="48" class="mb" />
        </div>
      </template>

      <el-card
        v-if="detail.status === 'approved' && detail.entry_type !== 'equipment'"
        shadow="never"
        class="mb"
        :class="{ 'exit-card': detail.exited }"
      >
        <template #header>
          <div class="title-row">
            <span class="exit-card-title">退场信息</span>
            <el-tag v-if="detail.exited" size="small" type="warning">已登记退场</el-tag>
          </div>
        </template>
        <el-empty
          v-if="!detail.exited || !detail.exit"
          description="尚未登记退场"
          :image-size="56"
        />
        <el-descriptions v-else :column="2" border class="info-desc">
          <el-descriptions-item label="退场单号">{{ detail.exit.exit_id }}</el-descriptions-item>
          <el-descriptions-item label="登记人">{{ detail.exit.operator || '—' }}</el-descriptions-item>
          <el-descriptions-item label="退场数量">
            {{ detail.exit.exit_qty }}{{ detail.unit }}
            <span class="muted">（进场 {{ detail.quantity }}{{ detail.unit }}）</span>
          </el-descriptions-item>
          <el-descriptions-item label="登记时间">{{ detail.exit.exit_time }}</el-descriptions-item>
          <el-descriptions-item label="退场原因" :span="2">{{ detail.exit.reason }}</el-descriptions-item>
          <el-descriptions-item label="退场照片" :span="2">
            {{ detail.exit.photo_file || '未上传' }}
          </el-descriptions-item>
        </el-descriptions>
      </el-card>

      <section class="flow-section">
        <header class="flow-section-head">
          <el-icon class="flow-section-icon"><Clock /></el-icon>
          <h3 class="section-title flow-section-title">审批过程</h3>
        </header>
        <div class="flow-section-body">
          <el-steps class="process-steps" align-center>
            <el-step
              v-for="s in processSteps"
              :key="s.title"
              :title="s.title"
              :description="s.desc"
              :status="s.status"
            />
          </el-steps>

          <el-timeline v-if="approvalTimeline.length" class="approval-timeline">
            <el-timeline-item
              v-for="step in approvalTimeline"
              :key="step.key"
              :type="timelineType(step.status)"
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
                    :type="actionTagType(step.action)"
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

    <MatArchiveExportDialog
      v-model="dialogVisible"
      :loading="exportLoading"
      @confirm="onConfirmExportArchive"
    />
  </div>
</template>

<style scoped>
/* 字号对齐品牌报审详情：分区标题 16px，描述列表默认 14px（非 size=small） */
.section-title {
  margin: 0 0 12px;
  font-size: 16px;
  font-weight: 600;
  color: #1f2329;
  line-height: 1.4;
}

.sub-title {
  margin: 12px 0 8px;
  font-size: 14px;
  font-weight: 600;
  color: #606266;
}

.exit-card-title {
  font-size: 16px;
  font-weight: 600;
  color: #1f2329;
}

.exit-card :deep(.el-card__header) {
  background: #fdf6ec;
}

.muted {
  margin-left: 6px;
  color: #909399;
  font-size: 13px;
}

.line-card {
  padding: 14px 16px;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  background: #fafbfc;
}

.line-card-title {
  margin-bottom: 12px;
  font-size: 14px;
  font-weight: 600;
  color: #303133;
}

.info-desc :deep(.el-descriptions__label) {
  color: #909399;
  font-size: 14px;
}

.info-desc :deep(.el-descriptions__content) {
  font-size: 14px;
  color: #303133;
}

.unpack-grid {
  margin-bottom: 8px;
}

.unpack-card {
  margin-bottom: 12px;
  padding: 10px 12px;
  border: 1px solid #ebeef5;
  border-radius: 6px;
  background: #fff;
}

.unpack-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.unpack-label {
  font-size: 14px;
  font-weight: 600;
  color: #606266;
}

.unpack-remark {
  margin-top: 6px;
  font-size: 13px;
  color: #909399;
}

.mb {
  margin-bottom: 16px;
}

.flow-section {
  background: #fff;
  border: 1px solid #ebeef5;
  border-radius: 10px;
  overflow: hidden;
  margin-bottom: 16px;
}

.flow-section-head {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 18px 12px;
  background: linear-gradient(180deg, #fafbfc 0%, #fff 100%);
  border-bottom: 1px solid #f0f2f5;
}

.flow-section-icon {
  font-size: 18px;
  color: var(--el-color-primary);
}

.flow-section-title {
  margin: 0;
}

.flow-section-body {
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
