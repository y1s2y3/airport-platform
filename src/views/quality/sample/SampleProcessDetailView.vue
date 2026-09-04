<script setup>
import './sample-page.css'
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Box, Clock, Document, Picture } from '@element-plus/icons-vue'
import {
  ACTION_LABEL,
  APPROVAL_NODE_LABEL,
  actionTagType,
  getProcessDetail,
  NODE_LABEL,
  statusLabel,
  statusTagType,
} from '../../../mock/sample.js'
import PersonalCenterReadonlyHint from '../../../components/PersonalCenterReadonlyHint.vue'
import FileAttachmentPreview from '../../../components/basicData/FileAttachmentPreview.vue'

const route = useRoute()
const router = useRouter()
const id = computed(() => route.query.id || '')
const tick = ref(0)

const detail = computed(() => {
  void tick.value
  return id.value ? getProcessDetail(id.value) : null
})

const showReadonlyHint = computed(
  () =>
    detail.value &&
    (detail.value.status === 'pending' || detail.value.status === 'in_approval'),
)

function normalizeAttachUrl(url) {
  const raw = String(url || '').trim()
  if (!raw || raw === '#' || raw === 'about:blank') return ''
  return raw
}

function mediaFiles(d) {
  if (!d) return []
  if (Array.isArray(d.media_files) && d.media_files.length) {
    return d.media_files
      .map((m) => {
        const name = m?.name || ''
        if (!name) return null
        return { name, url: normalizeAttachUrl(m.url), kind: m.kind === 'video' ? 'video' : 'image' }
      })
      .filter(Boolean)
  }
  const photos = (d.photo_files || []).map((name) => ({
    name: typeof name === 'string' ? name : name?.name || '',
    url: '',
    kind: 'image',
  }))
  const videos = (d.video_files || []).map((name) => ({
    name: typeof name === 'string' ? name : name?.name || '',
    url: '',
    kind: 'video',
  }))
  return [...photos, ...videos].filter((f) => f.name)
}

function docFiles(d) {
  if (!d || !Array.isArray(d.doc_files)) return []
  return d.doc_files
    .map((item) => {
      if (typeof item === 'string') return { name: item, url: '' }
      const name = item?.name || ''
      if (!name) return null
      return { name, url: normalizeAttachUrl(item.url) }
    })
    .filter(Boolean)
}

function lastRecord(node) {
  const rows = (detail.value?.approvals || []).filter((r) => r.node_code === node)
  return rows[rows.length - 1] || null
}

/** 工序样板：施工提交 → 监理终审（无项目经理） */
const processSteps = computed(() => {
  const app = detail.value
  if (!app) return []
  const sup = lastRecord('supervisor')
  const isSupCurrent =
    (app.status === 'pending' || app.status === 'in_approval') &&
    app.current_node === 'supervisor'

  let supStatus = 'wait'
  let supDesc = '等待'
  if (sup?.action === 'agree') {
    supStatus = 'success'
    supDesc = sup.operate_time || '已同意'
  } else if (sup?.action === 'reject') {
    supStatus = 'error'
    supDesc = sup.operate_time || '已驳回'
  } else if (isSupCurrent) {
    supStatus = 'process'
    supDesc = '审批中'
  } else if (app.status === 'approved') {
    supStatus = 'success'
    supDesc = app.finish_time || '已办结'
  }

  return [
    { title: '施工提交', status: 'success', desc: app.submit_time || '已提交' },
    { title: '待监理审（终审）', status: supStatus, desc: supDesc },
  ]
})

const approvalTimeline = computed(() => {
  const d = detail.value
  if (!d) return []
  const records = [...(d.approvals || [])].sort((a, b) =>
    String(a.operate_time).localeCompare(String(b.operate_time)),
  )
  const steps = []
  const submitRec = records.find((r) => r.action === 'submit' || r.node_code === 'applicant')
  if (submitRec) {
    steps.push({
      key: submitRec.record_id || 'submit',
      title: APPROVAL_NODE_LABEL.applicant || '施工提交',
      action: 'submit',
      actionLabel: ACTION_LABEL.submit || '提交',
      operator: submitRec.operator_name || d.applicant_name || '—',
      time: submitRec.operate_time || d.submit_time || '—',
      remark:
        submitRec.opinion ||
        (d.copy_from_application_id ? `从 ${d.copy_from_application_id} 复制新建` : '提交报审'),
      status: 'done',
    })
  } else {
    steps.push({
      key: 'submit',
      title: '施工提交',
      action: 'submit',
      actionLabel: '提交',
      operator: d.applicant_name || '—',
      time: d.submit_time || '—',
      remark: d.copy_from_application_id
        ? `从 ${d.copy_from_application_id} 复制新建`
        : '提交报审',
      status: 'done',
    })
  }
  for (const r of records) {
    if (r.action === 'submit' || r.node_code === 'applicant') continue
    steps.push({
      key: r.record_id || `${r.node_code}-${r.operate_time}`,
      title: APPROVAL_NODE_LABEL[r.node_code] || r.node_code || '节点',
      action: r.action,
      actionLabel: ACTION_LABEL[r.action] || r.action || '—',
      operator: r.operator_name || '—',
      time: r.operate_time || '—',
      remark: r.opinion || '',
      status: r.action === 'reject' ? 'rejected' : 'done',
    })
  }
  if (
    (d.status === 'pending' || d.status === 'in_approval') &&
    d.current_node === 'supervisor'
  ) {
    steps.push({
      key: 'pending-supervisor',
      title: APPROVAL_NODE_LABEL.supervisor || NODE_LABEL.supervisor,
      action: '',
      actionLabel: '待办理',
      operator: '监理',
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

function currentNodeText(app) {
  if (!app) return '—'
  if (app.current_node === 'none' || !app.current_node) {
    if (app.status === 'approved') return '已办结'
    if (app.status === 'rejected') return '已驳回'
    if (app.status === 'withdrawn') return '已撤回'
    return '—'
  }
  return NODE_LABEL[app.current_node] || app.current_node
}
</script>

<template>
  <div class="qm-page page-card sample-detail">
    <div class="page-header">
      <div class="page-breadcrumb">样板管理 / 关键工序样板报审 / 详情</div>
      <div class="title-row">
        <h1 class="page-title">工序样板详情</h1>
        <el-button @click="router.back()">返回</el-button>
      </div>
    </div>

    <el-empty v-if="!detail" description="单据不存在" />

    <template v-else>
      <PersonalCenterReadonlyHint v-if="showReadonlyHint" />

      <section class="form-section">
        <header class="section-head">
          <el-icon class="section-icon"><Box /></el-icon>
          <div class="section-head-main">
            <h2 class="section-title">关键工序样板信息</h2>
          </div>
        </header>
        <div class="section-body">
          <el-descriptions :column="2" border class="detail-desc">
            <el-descriptions-item label="报审编号">{{ detail.application_id }}</el-descriptions-item>
            <el-descriptions-item label="状态">
              <el-tag size="small" :type="statusTagType(detail.status)">{{
                statusLabel(detail.status)
              }}</el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="工序名称">{{ detail.process_name }}</el-descriptions-item>
            <el-descriptions-item label="当前节点">{{ currentNodeText(detail) }}</el-descriptions-item>
            <el-descriptions-item label="施工部位">{{ detail.use_part || '—' }}</el-descriptions-item>
            <el-descriptions-item label="项目">{{ detail.project_label }}</el-descriptions-item>
            <el-descriptions-item label="申请人">{{ detail.applicant_name }}</el-descriptions-item>
            <el-descriptions-item label="提交时间">{{ detail.submit_time || '—' }}</el-descriptions-item>
            <el-descriptions-item label="关键工序样板说明" :span="2">{{
              detail.briefing_content || '—'
            }}</el-descriptions-item>
            <el-descriptions-item v-if="detail.remark" label="备注" :span="2">
              {{ detail.remark }}
            </el-descriptions-item>
          </el-descriptions>
        </div>
      </section>

      <section class="form-section">
        <header class="section-head">
          <el-icon class="section-icon"><Document /></el-icon>
          <div class="section-head-main">
            <h2 class="section-title">影像与附件</h2>
          </div>
        </header>
        <div class="section-body">
          <div class="sub-block">
            <div class="sub-label">
              <el-icon><Picture /></el-icon>
              <span>现场影像资料</span>
            </div>
            <div v-if="mediaFiles(detail).length" class="attach-list">
              <FileAttachmentPreview
                v-for="(f, idx) in mediaFiles(detail)"
                :key="`media-${idx}-${f.name}`"
                :name="f.name"
                :url="f.url"
                size="md"
              />
            </div>
            <div v-else class="empty-line">暂无</div>
          </div>

          <div class="sub-block">
            <div class="sub-label">
              <el-icon><Document /></el-icon>
              <span>文件资料</span>
            </div>
            <div v-if="docFiles(detail).length" class="attach-list">
              <FileAttachmentPreview
                v-for="(f, idx) in docFiles(detail)"
                :key="`doc-${idx}-${f.name}`"
                :name="f.name"
                :url="f.url"
                size="md"
              />
            </div>
            <div v-else class="empty-line">暂无</div>
          </div>
        </div>
      </section>

      <section class="form-section">
        <header class="section-head">
          <el-icon class="section-icon"><Clock /></el-icon>
          <div class="section-head-main">
            <h2 class="section-title">审批流程</h2>
            <el-tag size="small" effect="plain" type="info">监理终审</el-tag>
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
.sample-detail {
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
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.section-icon {
  margin-top: 2px;
  font-size: 18px;
  color: var(--el-color-primary);
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

.detail-desc :deep(.el-descriptions__label) {
  width: 140px;
  color: #606266;
}

.sub-block + .sub-block {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px dashed #ebeef5;
}

.sub-label {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
  font-size: 13px;
  font-weight: 600;
  color: #303133;
}

.attach-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.empty-line {
  font-size: 13px;
  color: #c0c4cc;
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
