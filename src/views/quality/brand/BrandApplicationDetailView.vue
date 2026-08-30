<script setup>
import './brand-page.css'
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Document, Box, Clock, UserFilled } from '@element-plus/icons-vue'
import {
  getApplicationDetail,
  MATERIAL_TYPE,
  NODE_LABEL,
  statusLabel,
  statusTagType,
  formatBrandApproverSnapshot,
} from '../../../mock/brand.js'
import BrandCandidateAttachBlock from './BrandCandidateAttachBlock.vue'
import PersonalCenterReadonlyHint from '../../../components/PersonalCenterReadonlyHint.vue'

const route = useRoute()
const router = useRouter()
const detail = computed(() => getApplicationDetail(String(route.query.id || '')))
const fromLedger = computed(
  () => route.path.includes('/qm/brand/ledger') || route.query.from === 'ledger',
)

const ACTION_LABEL = { submit: '提交', agree: '同意', reject: '驳回' }
const APPROVAL_NODE_LABEL = {
  applicant: '施工提交',
  supervisor: '监理审批',
  pm: '项目经理终审',
}

function goBack() {
  if (fromLedger.value) router.push('/qm/brand/ledger')
  else router.push('/qm/brand/applications')
}

function actionTagType(action) {
  if (action === 'agree' || action === 'submit') return 'success'
  if (action === 'reject') return 'danger'
  return 'warning'
}

function lastRecord(node) {
  const rows = (detail.value?.approvals || []).filter((r) => r.node_code === node)
  return rows[rows.length - 1] || null
}

function currentNodeText(app) {
  if (!app) return '—'
  if (app.current_node === 'none' || !app.current_node) {
    if (app.status === 'approved') return '已办结'
    if (app.status === 'rejected' || app.status === 'withdrawn') return '已驳回'
    return '—'
  }
  return NODE_LABEL[app.current_node] || app.current_node
}

const processSteps = computed(() => {
  const app = detail.value?.app
  if (!app) return []
  const sup = lastRecord('supervisor')
  const pm = lastRecord('pm')

  function nodeStep(last, isCurrent) {
    if (last?.action === 'agree') return { status: 'success', desc: last.operate_time || '已同意' }
    if (last?.action === 'reject') return { status: 'error', desc: last.operate_time || '已驳回' }
    if (isCurrent) return { status: 'process', desc: '审批中' }
    return { status: 'wait', desc: '等待' }
  }

  return [
    { title: '施工提交', status: 'success', desc: app.submit_time || '已提交' },
    { title: '监理审批', ...nodeStep(sup, app.current_node === 'supervisor') },
    { title: '项目经理终审', ...nodeStep(pm, app.current_node === 'pm') },
  ]
})

const approvalTimeline = computed(() => {
  const d = detail.value
  if (!d) return []
  const steps = [
    {
      key: 'submit',
      title: '施工提交',
      action: 'submit',
      actionLabel: '提交',
      operator: d.app.applicant_name || '—',
      time: d.app.submit_time || '—',
      remark: d.app.copy_from_application_id
        ? `从 ${d.app.copy_from_application_id} 重新申报`
        : '提交报审',
      status: 'done',
    },
  ]
  for (const r of d.approvals || []) {
    steps.push({
      key: r.record_id,
      title: APPROVAL_NODE_LABEL[r.node_code] || r.node_code || '节点',
      action: r.action,
      actionLabel: ACTION_LABEL[r.action] || r.action,
      operator: r.operator_name || '—',
      time: r.operate_time || '—',
      remark: r.opinion || '',
      status: r.action === 'reject' ? 'rejected' : 'done',
    })
  }
  if (
    d.app.status === 'in_approval' &&
    (d.app.current_node === 'supervisor' || d.app.current_node === 'pm')
  ) {
    steps.push({
      key: `pending-${d.app.current_node}`,
      title: APPROVAL_NODE_LABEL[d.app.current_node] || NODE_LABEL[d.app.current_node],
      action: '',
      actionLabel: '待办理',
      operator: d.app.current_node === 'supervisor' ? '监理' : '项目经理',
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
</script>

<template>
  <div class="qm-page page-card brand-detail">
    <div class="page-header">
      <div class="page-breadcrumb">
        品牌报审 / {{ fromLedger ? '品牌报审台账' : '报审申请' }} / 报审详情
      </div>
      <div class="title-row">
        <h1 class="page-title">报审详情 {{ detail?.app?.application_id || '' }}</h1>
        <el-button @click="goBack">返回</el-button>
      </div>
    </div>

    <el-empty v-if="!detail" description="未找到报审单" />
    <template v-else>
      <PersonalCenterReadonlyHint
        v-if="detail.app.status === 'in_approval'"
      />
      <section class="form-section">
        <header class="section-head">
          <el-icon class="section-icon"><Box /></el-icon>
          <div class="section-head-main">
            <h2 class="section-title">材料/设备信息</h2>
          </div>
        </header>
        <div class="section-body">
          <el-descriptions :column="2" border>
            <el-descriptions-item label="报审编号">{{ detail.app.application_id }}</el-descriptions-item>
            <el-descriptions-item label="状态">
              <el-tag size="small" :type="statusTagType(detail.app.status)">
                {{ statusLabel(detail.app.status) }}
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="材料/设备名称">{{ detail.app.material_name }}</el-descriptions-item>
            <el-descriptions-item label="类型">
              {{ MATERIAL_TYPE[detail.app.material_type] }}
            </el-descriptions-item>
            <el-descriptions-item label="施工部位">{{ detail.app.use_part || '—' }}</el-descriptions-item>
            <el-descriptions-item label="当前节点">
              {{ currentNodeText(detail.app) }}
            </el-descriptions-item>
            <el-descriptions-item label="申请人">{{ detail.app.applicant_name }}</el-descriptions-item>
            <el-descriptions-item label="提交时间">{{ detail.app.submit_time }}</el-descriptions-item>
            <el-descriptions-item label="办结时间">{{ detail.app.finish_time || '—' }}</el-descriptions-item>
            <el-descriptions-item v-if="detail.app.copy_from_application_id" label="源报审单号">
              <el-button
                link
                type="primary"
                @click="router.push(`/qm/brand/applications/detail?id=${detail.app.copy_from_application_id}`)"
              >
                {{ detail.app.copy_from_application_id }}
              </el-button>
            </el-descriptions-item>
            <el-descriptions-item v-if="detail.app.remark" label="备注" :span="2">
              {{ detail.app.remark }}
            </el-descriptions-item>
          </el-descriptions>
        </div>
      </section>

      <section class="form-section">
        <header class="section-head">
          <el-icon class="section-icon"><Document /></el-icon>
          <div class="section-head-main">
            <h2 class="section-title">报审品牌</h2>
          </div>
        </header>
        <div class="section-body cand-list">
          <div
            v-for="(row, idx) in detail.candidates"
            :key="row.candidate_id"
            class="cand-card"
          >
            <div class="cand-card-head">
              <div class="cand-card-title">
                <span class="cand-badge">{{ idx + 1 }}</span>
                <el-tag v-if="idx === 0 || row.is_primary" size="small" type="success" effect="plain">
                  主选品牌
                </el-tag>
                <el-tag v-else size="small" type="info" effect="plain">备选品牌</el-tag>
              </div>
            </div>
            <div class="cand-fields">
              <div class="cand-field-row">
                <span class="cand-label">品牌名称</span>
                <span class="cand-value">{{ row.brand_name || '—' }}</span>
              </div>
              <div class="cand-field-row">
                <span class="cand-label">生产厂家</span>
                <span class="cand-value">{{ row.manufacturer || '—' }}</span>
              </div>
            </div>
            <BrandCandidateAttachBlock :candidate="row" :editable="false" />
          </div>
        </div>
      </section>

      <section class="form-section">
        <header class="section-head">
          <el-icon class="section-icon"><UserFilled /></el-icon>
          <div class="section-head-main">
            <h2 class="section-title">审批人配置</h2>
          </div>
        </header>
        <div class="section-body">
          <el-descriptions :column="2" border>
            <el-descriptions-item label="监理单位审批">
              {{ formatBrandApproverSnapshot(detail.app, 'supervisor') }}
            </el-descriptions-item>
            <el-descriptions-item label="项目经理审批">
              {{ formatBrandApproverSnapshot(detail.app, 'pm') }}
            </el-descriptions-item>
          </el-descriptions>
        </div>
      </section>

      <section class="form-section">
        <header class="section-head">
          <el-icon class="section-icon"><Clock /></el-icon>
          <div class="section-head-main">
            <div class="section-title-row">
              <h2 class="section-title">审批流程</h2>
              <el-tag size="small" effect="plain" type="info">施工提交 → 监理审批 → 项目经理终审</el-tag>
            </div>
          </div>
        </header>
        <div class="section-body">
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
                    v-else-if="step.action"
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
  </div>
</template>

<style scoped>
.brand-detail {
  gap: 16px;
}

.title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.title-row .page-title {
  margin: 0;
}

.form-section {
  background: #fff;
  border: 1px solid #ebeef5;
  border-radius: 10px;
  overflow: hidden;
  margin-bottom: 16px;
}

.section-head {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px 18px 12px;
  background: linear-gradient(180deg, #fafbfc 0%, #fff 100%);
  border-bottom: 1px solid #f0f2f5;
}

.section-head-main {
  flex: 1;
  min-width: 0;
}

.section-icon {
  margin-top: 2px;
  font-size: 18px;
  color: var(--el-color-primary);
}

.section-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.section-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #1f2329;
  line-height: 1.4;
}

.section-body {
  padding: 16px 18px 18px;
}

.cand-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.cand-card {
  padding: 14px 16px;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  background: #fafbfc;
}

.cand-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.cand-card-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.cand-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: var(--el-color-primary-light-9);
  color: var(--el-color-primary);
  font-size: 12px;
  font-weight: 600;
}

.cand-fields {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 12px;
  padding: 12px 14px;
  background: #fff;
  border: 1px solid #eef0f3;
  border-radius: 8px;
}

.cand-field-row {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  line-height: 1.5;
}

.cand-label {
  flex: 0 0 72px;
  font-size: 13px;
  color: #909399;
}

.cand-value {
  flex: 1;
  min-width: 0;
  font-size: 14px;
  color: #303133;
  word-break: break-all;
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

.flow-card.withdrawn {
  border-color: #e4e7ed;
  background: #f4f4f5;
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
