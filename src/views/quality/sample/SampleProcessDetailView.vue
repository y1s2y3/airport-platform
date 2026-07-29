<script setup>
import './sample-page.css'
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import {
  ACTION_LABEL,
  APPROVAL_NODE_LABEL,
  actionTagType,
  getProcessDetail,
  NODE_LABEL,
  STATUS_LABEL,
  statusTagType,
  supervisorApproveSample,
  pmApproveSample,
} from '../../../mock/sample.js'
import { canApproveSampleNode, sampleDemoRoleLabel } from '../../../utils/sampleDemoRole.js'
import SampleDemoRoleBar from './SampleDemoRoleBar.vue'

const route = useRoute()
const router = useRouter()
const id = computed(() => route.query.id || '')
const isApproveMode = computed(() => route.path.includes('/approve'))
const tick = ref(0)
const opinion = ref('')

const detail = computed(() => {
  void tick.value
  return id.value ? getProcessDetail(id.value) : null
})

const canApprove = computed(() => {
  const d = detail.value
  if (!isApproveMode.value || !d || d.status !== 'in_approval') return false
  if (d.current_node !== 'supervisor' && d.current_node !== 'pm') return false
  return canApproveSampleNode(d.current_node)
})

/** 审批轨迹：历史记录（中文）+ 审批中当前节点 */
const approvalTimeline = computed(() => {
  const d = detail.value
  if (!d) return []
  const rows = [...(d.approvals || [])].sort((a, b) =>
    String(a.operate_time).localeCompare(String(b.operate_time)),
  )
  const steps = rows.map((r) => ({
    key: r.record_id,
    title: APPROVAL_NODE_LABEL[r.node_code] || r.node_code || '节点',
    action: r.action,
    actionLabel: ACTION_LABEL[r.action] || r.action || '—',
    operator: r.operator_name || '—',
    time: r.operate_time || '—',
    remark: r.opinion || '',
    status: r.action === 'reject' ? 'rejected' : 'done',
  }))
  if (d.status === 'in_approval' && (d.current_node === 'supervisor' || d.current_node === 'pm')) {
    steps.push({
      key: `pending-${d.current_node}`,
      title: APPROVAL_NODE_LABEL[d.current_node] || NODE_LABEL[d.current_node],
      action: '',
      actionLabel: '待办理',
      operator: d.current_node === 'supervisor' ? '监理' : '项目经理',
      time: '',
      remark: '等待审批',
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

function doApprove(action) {
  const d = detail.value
  if (!d) return
  const node = d.current_node
  if (!canApproveSampleNode(node)) {
    return ElMessage.warning(`当前 Demo 角色为「${sampleDemoRoleLabel.value}」，无法办理本节点`)
  }
  const fn = node === 'supervisor' ? supervisorApproveSample : pmApproveSample
  const r = fn('process', d.application_id, { action, opinion: opinion.value })
  if (!r.ok) return ElMessage.error(r.msg)
  tick.value += 1
  opinion.value = ''
  ElMessage.success(
    action === 'agree'
      ? node === 'pm'
        ? '已通过并生成二维码'
        : '已同意，流转项目经理'
      : '已退回',
  )
  if (action === 'reject' || (action === 'agree' && node === 'pm')) {
    router.push('/qm/sample/process/approve')
  }
}
</script>

<template>
  <div class="qm-page page-card">
    <div class="page-header">
      <div class="page-breadcrumb">
        样板管理 / {{ isApproveMode ? '关键工序样板审批' : '关键工序样板报审' }} / 详情
      </div>
      <h1 class="page-title">工序样板详情 {{ id }}</h1>
    </div>

    <SampleDemoRoleBar />

    <el-empty v-if="!detail" description="单据不存在" />

    <template v-else>
      <el-descriptions :column="2" border>
        <el-descriptions-item label="报审编号">{{ detail.application_id }}</el-descriptions-item>
        <el-descriptions-item label="项目">{{ detail.project_label }}</el-descriptions-item>
        <el-descriptions-item label="工序名称">{{ detail.process_name }}</el-descriptions-item>
        <el-descriptions-item label="使用部位">{{ detail.use_part }}</el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag size="small" :type="statusTagType(detail.status)">{{
            STATUS_LABEL[detail.status]
          }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="当前节点">{{
          NODE_LABEL[detail.current_node] || '—'
        }}</el-descriptions-item>
        <el-descriptions-item label="申请人">{{ detail.applicant_name }}</el-descriptions-item>
        <el-descriptions-item label="提交时间">{{ detail.submit_time }}</el-descriptions-item>
        <el-descriptions-item label="技术交底" :span="2">{{
          detail.briefing_content || '—'
        }}</el-descriptions-item>
        <el-descriptions-item label="现场照片" :span="2">
          {{ detail.photo_files?.length ? detail.photo_files.join('、') : '—' }}
        </el-descriptions-item>
        <el-descriptions-item label="现场视频" :span="2">
          {{ detail.video_files?.length ? detail.video_files.join('、') : '—' }}
        </el-descriptions-item>
        <el-descriptions-item label="二维码" :span="2">
          <template v-if="detail.qr_code">
            {{ detail.qr_code }}
            <el-button
              link
              type="primary"
              @click="router.push(`/qm/sample/process/qr?id=${detail.application_id}`)"
            >
              打开内容
            </el-button>
          </template>
          <span v-else>—</span>
        </el-descriptions-item>
      </el-descriptions>

      <el-card shadow="never" class="approval-card">
        <template #header>
          <div class="approval-head">
            <span class="approval-title">审批记录</span>
            <el-tag size="small" effect="plain" type="info">监理 → 项目经理</el-tag>
          </div>
        </template>

        <el-empty v-if="!approvalTimeline.length" description="暂无审批记录" :image-size="64" />

        <el-timeline v-else class="approval-timeline">
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
      </el-card>

      <div v-if="canApprove" class="approve-box">
        <div class="page-tip" style="margin-bottom: 8px">
          当前节点：{{ NODE_LABEL[detail.current_node] }}
        </div>
        <el-input
          v-model="opinion"
          type="textarea"
          :rows="2"
          placeholder="审批意见（退回必填）"
        />
        <div class="form-actions">
          <el-button type="danger" @click="doApprove('reject')">退回</el-button>
          <el-button type="primary" @click="doApprove('agree')">同意</el-button>
        </div>
      </div>

      <div class="form-actions">
        <el-button @click="router.back()">返回</el-button>
      </div>
    </template>
  </div>
</template>

<style scoped>
.approval-card {
  margin-top: 4px;
}

.approval-head {
  display: flex;
  align-items: center;
  gap: 10px;
}

.approval-title {
  font-size: 15px;
  font-weight: 600;
  color: #1f2329;
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
