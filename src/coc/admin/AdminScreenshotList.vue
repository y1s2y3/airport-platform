<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getScreenshotRecords, removeScreenshotRecord } from '../utils/videoStorage.js'
import { resolveExecutorDisplay } from '../utils/executorDisplay.js'

const records = ref([])
const keyword = ref('')
const detailVisible = ref(false)
const current = ref(null)

const filtered = computed(() => {
  const q = keyword.value.trim()
  if (!q) return records.value
  return records.value.filter((item) =>
    [
      item.projectName,
      item.cameraName,
      item.cameraLocation,
      item.description,
      item.rectifier,
      item.workRequirement,
      item.executor,
      item.executeDept,
      item.matterDescription,
      item.remark,
      item.penaltyReason,
      item.penaltyContent,
      item.hazardLevel,
      item.hazardDeadline,
    ]
      .some((field) => String(field || '').includes(q)),
  )
})

function isNoticeRow(row) {
  return row.docType === 'notice'
}

function isReminderRow(row) {
  return row.docType === 'reminder'
}

function isPenaltyRow(row) {
  return row.docType === 'penalty'
}

function isHazardRow(row) {
  return row.docType === 'safety' || row.docType === 'quality'
}

function rowSummary(row) {
  if (isNoticeRow(row)) return row.workRequirement || row.description
  if (isReminderRow(row)) return row.matterDescription || row.description
  if (isPenaltyRow(row)) return row.penaltyReason || row.penaltyContent || row.description
  return row.description
}

function rowHandler(row) {
  if (isNoticeRow(row) || isReminderRow(row)) return row.executor || row.executeDept || row.rectifier
  if (isPenaltyRow(row)) return row.penaltyReason
  if (isHazardRow(row)) return row.hazardDeadline || row.rectifier
  return row.rectifier
}

function load() {
  records.value = getScreenshotRecords()
}

function openDetail(row) {
  current.value = row
  detailVisible.value = true
}

function handleDelete(row) {
  ElMessageBox.confirm('确定删除该问题截图记录？', '提示', { type: 'warning' })
    .then(() => {
      removeScreenshotRecord(row.id)
      load()
      ElMessage.success('已删除')
    })
    .catch(() => {})
}

function docTypeLabel(type) {
  return {
    notice: '任务单',
    reminder: '提示函',
    penalty: '处罚单',
    safety: '安全隐患',
    quality: '质量隐患',
  }[type] || type || '—'
}

function docTypeTagType(type) {
  if (type === 'penalty') return 'danger'
  if (type === 'reminder') return 'info'
  if (type === 'safety') return 'warning'
  if (type === 'quality') return 'success'
  return 'primary'
}

function sourceLabel(type) {
  return { live: '实时', playback: '回放', meeting: '会议' }[type] || type
}

onMounted(load)
</script>

<template>
  <div class="panel-card admin-page">
    <div class="panel-title simple-title">
      <span>问题截图</span>
      <el-input
        v-model="keyword"
        placeholder="搜索项目、摄像头、工作要求、问题描述…"
        clearable
        class="search-input"
      />
    </div>
    <div class="panel-body page-body">
      <p class="page-desc">保存视频监控中提交的问题截图及关联字段，数据来自前台截屏登记。</p>
      <el-table :data="filtered" stripe border empty-text="暂无问题截图记录">
        <el-table-column type="index" label="序号" width="60" />
        <el-table-column label="截图" width="96">
          <template #default="{ row }">
            <div class="thumb-cell">
              <img v-if="row.snapshot" :src="row.snapshot" alt="截图" class="thumb-img" />
              <span v-else class="thumb-empty">无图</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="登记类型" width="96">
          <template #default="{ row }">
            <el-tag :type="docTypeTagType(row.docType)" size="small">
              {{ docTypeLabel(row.docType) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="projectName" label="项目名称" min-width="120" show-overflow-tooltip />
        <el-table-column prop="cameraName" label="摄像头" min-width="110" show-overflow-tooltip />
        <el-table-column prop="cameraLocation" label="位置" min-width="100" show-overflow-tooltip />
        <el-table-column label="工作/问题" min-width="180" show-overflow-tooltip>
          <template #default="{ row }">{{ rowSummary(row) || '—' }}</template>
        </el-table-column>
        <el-table-column label="执行/整改" width="112" show-overflow-tooltip>
          <template #default="{ row }">{{ rowHandler(row) || '—' }}</template>
        </el-table-column>
        <el-table-column label="来源" width="72">
          <template #default="{ row }">{{ sourceLabel(row.sourceType) }}</template>
        </el-table-column>
        <el-table-column prop="createdAt" label="登记时间" width="168" />
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openDetail(row)">详情</el-button>
            <el-button link type="danger" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <el-dialog v-model="detailVisible" title="问题截图详情" width="720px">
      <div v-if="current" class="detail-grid">
        <div class="detail-preview">
          <img v-if="current.snapshot" :src="current.snapshot" alt="截图" class="detail-img" />
          <div v-else class="detail-empty">暂无截图预览</div>
        </div>
        <el-descriptions :column="1" border size="small">
          <el-descriptions-item label="登记类型">{{ docTypeLabel(current.docType) }}</el-descriptions-item>
          <el-descriptions-item label="项目名称">{{ current.projectName }}</el-descriptions-item>
          <el-descriptions-item label="摄像头名称">{{ current.cameraName }}</el-descriptions-item>
          <el-descriptions-item label="摄像头位置">{{ current.cameraLocation }}</el-descriptions-item>
          <template v-if="isNoticeRow(current)">
            <el-descriptions-item label="工作类型">{{ current.workType || '—' }}</el-descriptions-item>
            <el-descriptions-item label="工作要求">{{ current.workRequirement || current.description || '—' }}</el-descriptions-item>
            <el-descriptions-item label="执行人">
              {{ resolveExecutorDisplay(current.executor || current.executeDept || current.rectifier) }}
            </el-descriptions-item>
            <el-descriptions-item label="完成时限">{{ current.deadline || '—' }}</el-descriptions-item>
            <el-descriptions-item label="备注">{{ current.remark || '—' }}</el-descriptions-item>
          </template>
          <template v-else-if="isReminderRow(current)">
            <el-descriptions-item label="事项描述">{{ current.matterDescription || current.description || '—' }}</el-descriptions-item>
            <el-descriptions-item label="指派人">
              {{ resolveExecutorDisplay(current.assignee || current.executor || current.rectifier) }}
            </el-descriptions-item>
            <el-descriptions-item label="完成时限">{{ current.deadline || '—' }}</el-descriptions-item>
          </template>
          <template v-else-if="isPenaltyRow(current)">
            <el-descriptions-item label="事由">{{ current.penaltyReason || '—' }}</el-descriptions-item>
            <el-descriptions-item label="内容">{{ current.penaltyContent || current.description || '—' }}</el-descriptions-item>
            <el-descriptions-item label="指派人">
              {{ resolveExecutorDisplay(current.assignee || current.executor || current.rectifier) }}
            </el-descriptions-item>
            <el-descriptions-item label="完成时限">{{ current.deadline || '—' }}</el-descriptions-item>
          </template>
          <template v-else-if="isHazardRow(current)">
            <el-descriptions-item label="隐患描述">{{ current.description || '—' }}</el-descriptions-item>
            <el-descriptions-item label="等级">{{ current.hazardLevel || '—' }}</el-descriptions-item>
            <el-descriptions-item label="整改人">{{ current.rectifier || '—' }}</el-descriptions-item>
            <el-descriptions-item label="整改期限">{{ current.hazardDeadline || '—' }}</el-descriptions-item>
          </template>
          <el-descriptions-item label="来源">{{ sourceLabel(current.sourceType) }}</el-descriptions-item>
          <el-descriptions-item label="登记时间">{{ current.createdAt }}</el-descriptions-item>
        </el-descriptions>
      </div>
    </el-dialog>
  </div>
</template>

<style scoped>
.admin-page {
  min-height: calc(100vh - 112px);
}

.simple-title {
  display: flex;
  align-items: center;
  gap: 16px;
  font-size: 17px;
}

.search-input {
  width: 280px;
}

.page-body {
  padding: 20px 24px !important;
}

.page-desc {
  margin: 0 0 16px;
  font-size: 13px;
  color: var(--coc-text-secondary);
  line-height: 1.6;
}

.thumb-cell {
  width: 72px;
  height: 44px;
  border-radius: 4px;
  overflow: hidden;
  background: #1a1a1a;
  display: flex;
  align-items: center;
  justify-content: center;
}

.thumb-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.thumb-empty {
  font-size: 11px;
  color: #909399;
}

.detail-grid {
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 16px;
  align-items: start;
}

.detail-preview {
  aspect-ratio: 16 / 9;
  background: #1a1a1a;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid var(--coc-border);
}

.detail-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
}

.detail-empty {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #909399;
  font-size: 13px;
}
</style>
