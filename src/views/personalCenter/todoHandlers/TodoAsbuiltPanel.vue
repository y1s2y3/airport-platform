<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { Document, OfficeBuilding, CopyDocument } from '@element-plus/icons-vue'
import {
  getAsbuilt,
  STATUS_LABEL,
  NODE_LABEL,
  statusTagType,
  asbuiltReportFileTypeLabel,
} from '../../../mock/asbuilt.js'

const props = defineProps({
  todo: { type: Object, required: true },
})

const router = useRouter()

const acceptance = computed(() => {
  const id = props.todo?.asbuiltAcceptanceId || props.todo?.detail?.acceptanceId
  return id ? getAsbuilt(id) : null
})

const currentNodeLabel = computed(() => {
  const row = acceptance.value
  if (!row) {
    return (
      props.todo.detail?.currentNode ||
      (props.todo.asbuiltNode === 'hq_pm' || props.todo.asbuiltNode === 'pm'
        ? NODE_LABEL.hq_pm
        : NODE_LABEL.supervisor)
    )
  }
  if (row.status !== 'pending_approval') return NODE_LABEL.none
  return NODE_LABEL[row.current_node] || '—'
})

const nodeRows = computed(() => acceptance.value?.nodes || [])

const reportFiles = computed(() => {
  if (acceptance.value?.files?.length) return acceptance.value.files
  const names = String(props.todo.detail?.reportNames || '')
    .split(/[；;]/)
    .map((s) => s.trim())
    .filter(Boolean)
  return names.map((file_name, i) => ({ id: `todo-abf-${i}`, file_name }))
})

function fileSizeLabel(size) {
  if (!size) return '—'
  const kb = Math.max(1, Math.round(size / 1024))
  if (kb >= 1024) return `${(kb / 1024).toFixed(1)} MB`
  return `${kb} KB`
}

function openSource(id) {
  if (!id) return
  router.push(`/qm/asbuilt/detail?id=${id}`)
}
</script>

<template>
  <div class="asbuilt-todo-detail">
    <section class="form-section">
      <header class="section-head">
        <el-icon class="section-icon"><OfficeBuilding /></el-icon>
        <div class="section-head-main">
          <h2 class="section-title">基本信息</h2>
        </div>
      </header>
      <div class="section-body">
        <el-descriptions :column="2" border class="detail-desc">
          <el-descriptions-item label="验收单号">
            {{ acceptance?.biz_no || todo.detail?.bizNo || todo.asbuiltAcceptanceId || '—' }}
          </el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag
              v-if="acceptance?.status"
              size="small"
              :type="statusTagType(acceptance.status)"
            >
              {{ STATUS_LABEL[acceptance.status] }}
            </el-tag>
            <span v-else>—</span>
          </el-descriptions-item>
          <el-descriptions-item label="验收任务名称" :span="2">
            {{ acceptance?.title || todo.detail?.title || '—' }}
          </el-descriptions-item>
          <el-descriptions-item label="备注" :span="2">
            {{ acceptance?.remark || todo.detail?.remark || '—' }}
          </el-descriptions-item>
          <el-descriptions-item label="当前审批环节">{{ currentNodeLabel }}</el-descriptions-item>
          <el-descriptions-item label="提交人">
            {{ acceptance?.submitter_name || todo.applicant || '—' }}
          </el-descriptions-item>
          <el-descriptions-item label="提交时间">
            {{ acceptance?.submitted_at || todo.applyTime || '—' }}
          </el-descriptions-item>
          <el-descriptions-item
            v-if="acceptance?.copy_from_biz_no || todo.detail?.copyFromBizNo"
            label="源验收单号"
          >
            <el-button
              v-if="acceptance?.copy_from_id"
              link
              type="primary"
              @click="openSource(acceptance.copy_from_id)"
            >
              {{ acceptance.copy_from_biz_no }}
            </el-button>
            <span v-else>{{ todo.detail?.copyFromBizNo }}</span>
          </el-descriptions-item>
          <el-descriptions-item label="创建时间">
            {{ acceptance?.created_at || '—' }}
          </el-descriptions-item>
          <el-descriptions-item label="更新时间">
            {{ acceptance?.updated_at || '—' }}
          </el-descriptions-item>
        </el-descriptions>
      </div>
    </section>

    <section class="form-section">
      <header class="section-head">
        <el-icon class="section-icon"><CopyDocument /></el-icon>
        <div class="section-head-main">
          <div class="section-title-row">
            <h2 class="section-title">所选实体工程节点</h2>
            <el-tag size="small" effect="plain" type="info">{{ nodeRows.length }} 个</el-tag>
          </div>
        </div>
      </header>
      <div class="section-body">
        <div v-if="nodeRows.length" class="node-list">
          <div v-for="(n, idx) in nodeRows" :key="n.id || idx" class="node-card">
            <span class="node-badge">{{ idx + 1 }}</span>
            <div class="node-content">
              <div class="node-path">{{ n.wbs_node_path || '—' }}</div>
            </div>
          </div>
        </div>
        <div v-else class="empty-inline">
          {{ todo.detail?.nodePaths || '未选择节点' }}
        </div>
      </div>
    </section>

    <section class="form-section">
      <header class="section-head">
        <el-icon class="section-icon"><Document /></el-icon>
        <div class="section-head-main">
          <div class="section-title-row">
            <h2 class="section-title">实模一致性报告</h2>
            <el-tag size="small" effect="plain" type="info">{{ reportFiles.length }} 份</el-tag>
          </div>
        </div>
      </header>
      <div class="section-body">
        <div v-if="reportFiles.length" class="file-list">
          <div v-for="f in reportFiles" :key="f.id || f.file_name" class="file-card">
            <div class="file-icon" :class="{ 'is-word': asbuiltReportFileTypeLabel(f) === 'WORD' }">
              {{ asbuiltReportFileTypeLabel(f) }}
            </div>
            <div class="file-main">
              <div class="file-name" :title="f.file_name">{{ f.file_name }}</div>
              <div class="file-meta">
                <span>{{ fileSizeLabel(f.file_size) }}</span>
                <span class="dot">·</span>
                <span>{{ f.uploaded_at || '—' }}</span>
              </div>
            </div>
          </div>
        </div>
        <div v-else class="empty-inline">无报告附件</div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.asbuilt-todo-detail {
  display: flex;
  flex-direction: column;
  gap: 16px;
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

.node-card {
  align-items: center;
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

.file-icon.is-word {
  color: #2b5bb8;
  background: #ecf2ff;
  border-color: #d6e4ff;
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

.file-meta .dot {
  margin: 0 6px;
  color: #c0c4cc;
}

.empty-inline {
  padding: 20px 0;
  text-align: center;
  font-size: 13px;
  color: #909399;
}
</style>
