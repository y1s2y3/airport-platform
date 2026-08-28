<script setup>
import '../mat/mat-page.css'
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  Document,
  Link,
  OfficeBuilding,
  Clock,
  CopyDocument,
} from '@element-plus/icons-vue'
import {
  getAsbuilt,
  listAsbuiltApprovals,
  STATUS_LABEL,
  DATA_SOURCE_LABEL,
  APPROVAL_NODE_LABEL,
  ACTION_LABEL,
  statusTagType,
} from '../../../mock/asbuilt.js'
import PersonalCenterReadonlyHint from '../../../components/PersonalCenterReadonlyHint.vue'

const route = useRoute()
const router = useRouter()

const detail = computed(() => {
  const id = String(route.query.id || '')
  return id ? getAsbuilt(id) : null
})

const approvals = computed(() => {
  if (!detail.value) return []
  return listAsbuiltApprovals(detail.value.id)
})

const currentNodeLabel = computed(() => {
  const row = detail.value
  if (!row || row.status !== 'pending_approval') return '—'
  if (row.current_node === 'supervisor') return '待监理审批'
  if (row.current_node === 'hq_pm') return '待指挥部项目经理终审'
  return '—'
})

function fileSizeLabel(size) {
  const kb = Math.max(1, Math.round((size || 0) / 1024))
  if (kb >= 1024) return `${(kb / 1024).toFixed(1)} MB`
  return `${kb} KB`
}

function actionTagType(action) {
  if (action === 'approve') return 'success'
  if (action === 'reject') return 'danger'
  if (action === 'submit') return 'primary'
  return 'info'
}
</script>

<template>
  <div class="qm-page page-card asbuilt-detail">
    <div class="page-header">
      <div class="page-breadcrumb">施工质量管控 / 实模一致验收 / 详情</div>
      <div class="title-row">
        <h1 class="page-title">实模一致验收详情</h1>
        <div class="title-actions">
          <el-button
            v-if="detail?.status === 'draft'"
            type="primary"
            @click="router.push(`/qm/asbuilt/edit?id=${detail.id}`)"
          >
            编辑
          </el-button>
          <el-button
            v-if="detail?.status === 'rejected'"
            type="warning"
            @click="router.push(`/qm/asbuilt/edit?relatedRejectId=${detail.id}`)"
          >
            重新申报
          </el-button>
          <el-button @click="router.push('/qm/asbuilt/list')">返回列表</el-button>
        </div>
      </div>
      <PersonalCenterReadonlyHint
        v-if="detail?.status === 'pending_approval'"
        title="本页为只读查看；审批请在「个人中心 → 我的待办」中处理。提交后资料不可再编辑。"
      />
      <p v-else class="page-tip">审批请在个人中心待办办理；提交后资料只读。</p>
    </div>

    <el-empty v-if="!detail" description="未找到验收单" />

    <template v-else>
      <!-- 概览条 -->
      <div class="summary-bar">
        <div class="summary-main">
          <div class="summary-id-row">
            <span class="summary-biz">{{ detail.biz_no }}</span>
            <el-tag size="small" effect="light" :type="statusTagType(detail.status)">
              {{ STATUS_LABEL[detail.status] }}
            </el-tag>
            <el-tag size="small" effect="plain" type="info">
              {{ DATA_SOURCE_LABEL[detail.data_source] || detail.data_source }}
            </el-tag>
          </div>
          <h2 class="summary-title">{{ detail.title }}</h2>
          <div class="summary-meta">
            <span>当前环节：{{ currentNodeLabel }}</span>
            <span class="dot">·</span>
            <span>提交人：{{ detail.submitter_name || '—' }}</span>
            <span class="dot">·</span>
            <span>提交时间：{{ detail.submitted_at || '未提交' }}</span>
          </div>
        </div>
      </div>

      <!-- 基本信息 -->
      <section class="form-section">
        <header class="section-head">
          <el-icon class="section-icon"><OfficeBuilding /></el-icon>
          <div class="section-head-main">
            <h2 class="section-title">基本信息</h2>
          </div>
        </header>
        <div class="section-body">
          <el-descriptions :column="2" border class="detail-desc">
            <el-descriptions-item label="验收单号">{{ detail.biz_no }}</el-descriptions-item>
            <el-descriptions-item label="状态">
              <el-tag size="small" :type="statusTagType(detail.status)">
                {{ STATUS_LABEL[detail.status] }}
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="任务名称" :span="2">{{ detail.title }}</el-descriptions-item>
            <el-descriptions-item label="数据来源">
              {{ DATA_SOURCE_LABEL[detail.data_source] || detail.data_source }}
            </el-descriptions-item>
            <el-descriptions-item label="当前审批环节">{{ currentNodeLabel }}</el-descriptions-item>
            <el-descriptions-item label="提交人">{{ detail.submitter_name || '—' }}</el-descriptions-item>
            <el-descriptions-item label="提交时间">{{ detail.submitted_at || '—' }}</el-descriptions-item>
            <el-descriptions-item label="外部同步单号">{{ detail.external_ref || '—' }}</el-descriptions-item>
            <el-descriptions-item label="关联被驳回单">{{ detail.related_reject_id || '—' }}</el-descriptions-item>
            <el-descriptions-item label="创建时间">{{ detail.created_at }}</el-descriptions-item>
            <el-descriptions-item label="更新时间">{{ detail.updated_at }}</el-descriptions-item>
          </el-descriptions>
        </div>
      </section>

      <!-- 对比地址 -->
      <section class="form-section">
        <header class="section-head">
          <el-icon class="section-icon"><Link /></el-icon>
          <div class="section-head-main">
            <h2 class="section-title">实模一致性对比地址</h2>
          </div>
        </header>
        <div class="section-body">
          <a
            v-if="detail.compare_url"
            class="compare-link"
            :href="detail.compare_url"
            target="_blank"
            rel="noopener noreferrer"
          >
            <el-icon><Link /></el-icon>
            <span class="compare-url">{{ detail.compare_url }}</span>
            <span class="compare-action">打开</span>
          </a>
          <div v-else class="empty-inline">暂无对比地址</div>
        </div>
      </section>

      <!-- 工程节点 -->
      <section class="form-section">
        <header class="section-head">
          <el-icon class="section-icon"><CopyDocument /></el-icon>
          <div class="section-head-main">
            <div class="section-title-row">
              <h2 class="section-title">所选实体工程节点</h2>
              <el-tag size="small" effect="plain" type="info">
                {{ (detail.nodes || []).length }} 个
              </el-tag>
            </div>
          </div>
        </header>
        <div class="section-body">
          <div v-if="detail.nodes?.length" class="node-list">
            <div v-for="(n, idx) in detail.nodes" :key="n.id || idx" class="node-card">
              <span class="node-badge">{{ idx + 1 }}</span>
              <div class="node-content">
                <div class="node-path">{{ n.wbs_node_path || '—' }}</div>
                <div class="node-id">节点 ID：{{ n.wbs_node_id || '—' }}</div>
              </div>
            </div>
          </div>
          <div v-else class="empty-inline">未选择节点</div>
        </div>
      </section>

      <!-- 报告附件 -->
      <section class="form-section">
        <header class="section-head">
          <el-icon class="section-icon"><Document /></el-icon>
          <div class="section-head-main">
            <div class="section-title-row">
              <h2 class="section-title">实模一致性报告</h2>
              <el-tag size="small" effect="plain" type="info">
                {{ (detail.files || []).length }} 份
              </el-tag>
            </div>
          </div>
        </header>
        <div class="section-body">
          <div v-if="detail.files?.length" class="file-list">
            <div v-for="f in detail.files" :key="f.id" class="file-card">
              <div class="file-icon">PDF</div>
              <div class="file-main">
                <div class="file-name" :title="f.file_name">{{ f.file_name }}</div>
                <div class="file-meta">
                  <span>{{ fileSizeLabel(f.file_size) }}</span>
                  <span class="dot">·</span>
                  <span>{{ f.source === 'sync' ? '第三方同步' : '人工上传' }}</span>
                  <span class="dot">·</span>
                  <span>{{ f.uploaded_at || '—' }}</span>
                </div>
              </div>
            </div>
          </div>
          <div v-else class="empty-inline">无报告附件</div>
        </div>
      </section>

      <!-- 审批记录 -->
      <section class="form-section">
        <header class="section-head">
          <el-icon class="section-icon"><Clock /></el-icon>
          <div class="section-head-main">
            <h2 class="section-title">审批记录</h2>
          </div>
        </header>
        <div class="section-body">
          <el-timeline v-if="approvals.length" class="approval-timeline">
            <el-timeline-item
              v-for="r in approvals"
              :key="r.id || `${r.acted_at}-${r.actor_name}`"
              :timestamp="r.acted_at"
              placement="top"
              :type="actionTagType(r.action)"
            >
              <div class="tl-card">
                <div class="tl-head">
                  <span class="tl-actor">{{ r.actor_name || '—' }}</span>
                  <el-tag size="small" effect="plain" :type="actionTagType(r.action)">
                    {{ ACTION_LABEL[r.action] || r.action }}
                  </el-tag>
                  <span class="tl-node">
                    {{ APPROVAL_NODE_LABEL[r.node_code] || r.node_code }}
                  </span>
                </div>
                <div v-if="r.comment" class="tl-comment">{{ r.comment }}</div>
              </div>
            </el-timeline-item>
          </el-timeline>
          <div v-else class="empty-inline">暂无审批记录</div>
        </div>
      </section>
    </template>
  </div>
</template>

<style scoped>
.asbuilt-detail {
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

.title-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.summary-bar {
  display: flex;
  align-items: stretch;
  gap: 16px;
  padding: 18px 20px;
  border-radius: 12px;
  border: 1px solid #e8ecf1;
  background: linear-gradient(135deg, #f8fafc 0%, #fff 55%, #f5f8fb 100%);
  box-shadow: 0 1px 2px rgba(31, 35, 41, 0.04);
}

.summary-main {
  flex: 1;
  min-width: 0;
}

.summary-id-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 8px;
}

.summary-biz {
  font-size: 13px;
  font-weight: 600;
  color: var(--el-color-primary, #8f0045);
  letter-spacing: 0.02em;
}

.summary-title {
  margin: 0 0 8px;
  font-size: 18px;
  font-weight: 600;
  line-height: 1.4;
  color: #1f2329;
}

.summary-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 0;
  font-size: 13px;
  color: #606266;
  line-height: 1.5;
}

.summary-meta .dot,
.file-meta .dot {
  margin: 0 6px;
  color: #c0c4cc;
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
}

.section-icon {
  margin-top: 2px;
  font-size: 18px;
  color: var(--el-color-primary, #8f0045);
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

.detail-desc :deep(.el-descriptions__label) {
  width: 120px;
  color: #909399;
  background: #fafbfc;
}

.compare-link {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px;
  border-radius: 8px;
  border: 1px dashed #d4dae3;
  background: #f7f9fc;
  color: var(--el-color-primary, #8f0045);
  text-decoration: none;
  transition: border-color 0.15s, background 0.15s;
}

.compare-link:hover {
  border-color: var(--el-color-primary-light-5, #c45a8a);
  background: #fff5f8;
}

.compare-url {
  flex: 1;
  min-width: 0;
  font-size: 13px;
  word-break: break-all;
  line-height: 1.5;
}

.compare-action {
  flex-shrink: 0;
  font-size: 12px;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 999px;
  background: var(--el-color-primary-light-9, #fde8f0);
  color: var(--el-color-primary, #8f0045);
}

.node-list,
.file-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.node-card,
.file-card {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 14px;
  border: 1px solid #eef0f3;
  border-radius: 8px;
  background: #fafbfc;
}

.node-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  flex-shrink: 0;
  border-radius: 50%;
  background: var(--el-color-primary-light-9, #fde8f0);
  color: var(--el-color-primary, #8f0045);
  font-size: 12px;
  font-weight: 600;
}

.node-content {
  flex: 1;
  min-width: 0;
}

.node-path {
  font-size: 14px;
  font-weight: 500;
  color: #303133;
  line-height: 1.5;
  word-break: break-all;
}

.node-id {
  margin-top: 4px;
  font-size: 12px;
  color: #909399;
}

.file-icon {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: #c45656;
  background: #fef0f0;
  border: 1px solid #fde2e2;
}

.file-main {
  flex: 1;
  min-width: 0;
}

.file-name {
  font-size: 14px;
  font-weight: 500;
  color: #303133;
  line-height: 1.4;
  word-break: break-all;
}

.file-meta {
  margin-top: 4px;
  font-size: 12px;
  color: #909399;
  line-height: 1.5;
}

.approval-timeline {
  padding-left: 4px;
}

.tl-card {
  padding: 10px 12px;
  border-radius: 8px;
  background: #fafbfc;
  border: 1px solid #eef0f3;
}

.tl-head {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.tl-actor {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
}

.tl-node {
  font-size: 12px;
  color: #909399;
}

.tl-comment {
  margin-top: 8px;
  font-size: 13px;
  color: #606266;
  line-height: 1.5;
  padding: 8px 10px;
  border-radius: 6px;
  background: #fff;
  border: 1px solid #f0f2f5;
}

.empty-inline {
  padding: 20px 0;
  text-align: center;
  font-size: 13px;
  color: #909399;
}
</style>
