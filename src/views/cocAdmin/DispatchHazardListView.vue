<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { View } from '@element-plus/icons-vue'
import { useCurrentProject } from '../../composables/useCurrentProject.js'
import {
  getDispatchHazards,
  getDispatchHazardsByProject,
  DISPATCH_HAZARD_RECTIFY_STATUSES,
  resolveDispatchHazardPhotoSrc,
  resolveDispatchHazardPhotoName,
} from '../../utils/dispatchHazardStorage.js'

defineProps({
  title: { type: String, default: '调度隐患清单' },
  description: { type: String, default: '' },
})

const { isHqSelected, headerProjectLabel } = useCurrentProject()

const keyword = ref('')
const statusFilter = ref('')
const typeFilter = ref('')
const list = ref([])
const detailVisible = ref(false)
const current = ref(null)

const currentRectifyPhotoUrls = computed(() =>
  (current.value?.rectifyPhotos || []).map((photo, index) =>
    resolveDispatchHazardPhotoSrc(photo, index),
  ),
)

const readonly = computed(() => isHqSelected.value)
const scopeProjectName = computed(() => (isHqSelected.value ? '' : headerProjectLabel.value))

function load() {
  list.value = scopeProjectName.value
    ? getDispatchHazardsByProject(scopeProjectName.value)
    : getDispatchHazards()
}

const filtered = computed(() => {
  let rows = list.value
  if (statusFilter.value) {
    rows = rows.filter((row) => row.rectifyStatus === statusFilter.value)
  }
  if (typeFilter.value) {
    rows = rows.filter((row) => row.hazardType === typeFilter.value)
  }
  const q = keyword.value.trim()
  if (!q) return rows
  return rows.filter((row) =>
    [
      row.description,
      row.rectifier,
      row.hazardLevel,
      row.projectName,
      row.source,
      row.cameraName,
      row.cameraLocation,
      row.rectifyStatus,
      hazardTypeLabel(row.hazardType),
    ].some((f) => String(f || '').includes(q)),
  )
})

function hazardTypeLabel(type) {
  return type === 'quality' ? '质量' : '安全'
}

function hazardTypeTag(type) {
  return type === 'quality' ? 'success' : 'warning'
}

function rectifyStatusTag(status) {
  const map = {
    待整改: 'warning',
    待验收: '',
    已关闭: 'success',
  }
  return map[status] || 'info'
}

function sourceTypeLabel(type) {
  return { live: '实时', playback: '回放', meeting: '会议' }[type] || type || '—'
}

function openDetail(row) {
  current.value = row
  detailVisible.value = true
}

watch([isHqSelected, headerProjectLabel], () => load())

onMounted(load)
</script>

<template>
  <div class="dispatch-hazard-page page-card">
    <div class="page-head">
      <div>
        <h2 class="page-title">{{ title }}</h2>
        <p class="page-desc">
          {{
            description ||
            '汇集 COC 调度大屏「问题截图」登记的安全隐患与质量隐患；整改与验收请在个人中心待办处理。'
          }}
        </p>
      </div>
      <el-tag v-if="readonly" size="small" type="info">指挥部 · 只读查看全部项目</el-tag>
      <el-tag v-else size="small" type="success">项目层级 · {{ scopeProjectName || '当前项目' }}</el-tag>
    </div>

    <div class="tab-toolbar">
      <el-select v-model="typeFilter" placeholder="隐患类型" clearable class="status-filter" aria-label="隐患类型">
        <el-option label="安全" value="safety" />
        <el-option label="质量" value="quality" />
      </el-select>
      <el-select v-model="statusFilter" placeholder="整改状态" clearable class="status-filter" aria-label="整改状态">
        <el-option
          v-for="item in DISPATCH_HAZARD_RECTIFY_STATUSES"
          :key="item"
          :label="item"
          :value="item"
        />
      </el-select>
      <el-input
        v-model="keyword"
        placeholder="搜索隐患描述、整改人、项目、摄像头…"
        clearable
        class="search-input" aria-label="搜索隐患描述、整改人、项目、摄像头…"/>
    </div>

    <el-table :data="filtered" stripe border empty-text="暂无调度隐患记录" class="ap-table">
      <el-table-column type="index" label="序号" width="56" />
      <el-table-column
        v-if="readonly"
        prop="projectName"
        label="项目名称"
        min-width="120"
        show-overflow-tooltip
      />
      <el-table-column label="类型" width="72" align="center">
        <template #default="{ row }">
          <el-tag :type="hazardTypeTag(row.hazardType)" size="small">
            {{ hazardTypeLabel(row.hazardType) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="description" label="隐患描述" min-width="180" show-overflow-tooltip />
      <el-table-column prop="hazardLevel" label="等级" width="72" align="center" />
      <el-table-column label="整改状态" width="96" align="center">
        <template #default="{ row }">
          <el-tag :type="rectifyStatusTag(row.rectifyStatus)" size="small">
            {{ row.rectifyStatus || '待整改' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="rectifier" label="整改人" width="88" show-overflow-tooltip />
      <el-table-column prop="hazardDeadline" label="整改期限" width="112" />
      <el-table-column prop="cameraName" label="摄像头" min-width="110" show-overflow-tooltip />
      <el-table-column prop="source" label="来源" width="96" />
      <el-table-column prop="uploadTime" label="登记时间" width="148" />
      <el-table-column label="操作" width="88" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" :icon="View" @click="openDetail(row)">详情</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="detailVisible" title="调度隐患详情" width="720px" destroy-on-close>
      <template v-if="current">
        <el-descriptions :column="2" border size="small">
          <el-descriptions-item label="项目名称">{{ current.projectName || '—' }}</el-descriptions-item>
          <el-descriptions-item label="隐患类型">{{ hazardTypeLabel(current.hazardType) }}</el-descriptions-item>
          <el-descriptions-item label="隐患描述" :span="2">{{ current.description || '—' }}</el-descriptions-item>
          <el-descriptions-item label="隐患等级">{{ current.hazardLevel || '—' }}</el-descriptions-item>
          <el-descriptions-item label="整改状态">{{ current.rectifyStatus || '待整改' }}</el-descriptions-item>
          <el-descriptions-item label="整改人">{{ current.rectifier || '—' }}</el-descriptions-item>
          <el-descriptions-item label="整改期限">{{ current.hazardDeadline || '—' }}</el-descriptions-item>
          <el-descriptions-item label="摄像头">{{ current.cameraName || '—' }}</el-descriptions-item>
          <el-descriptions-item label="监控点位">{{ current.cameraLocation || '—' }}</el-descriptions-item>
          <el-descriptions-item label="截图方式">{{ sourceTypeLabel(current.sourceType) }}</el-descriptions-item>
          <el-descriptions-item label="登记来源">{{ current.source || '问题截图' }}</el-descriptions-item>
          <el-descriptions-item label="登记时间" :span="2">{{ current.uploadTime || '—' }}</el-descriptions-item>
          <el-descriptions-item :label="`${hazardTypeLabel(current.hazardType)}隐患截图`" :span="2">
            <div class="detail-snapshot-thumb">
              <el-image
                v-if="current.snapshot"
                :src="current.snapshot"
                :preview-src-list="[current.snapshot]"
                fit="cover"
                class="detail-photo-thumb"
                alt="隐患截图"
              />
              <div v-else class="detail-snapshot-empty">暂无截图</div>
            </div>
          </el-descriptions-item>
          <el-descriptions-item v-if="current.rectifyStatus !== '待整改'" label="整改说明" :span="2">
            {{ current.rectifyRemark || '—' }}
          </el-descriptions-item>
          <el-descriptions-item v-if="current.rectifyStatus !== '待整改'" label="整改照片" :span="2">
            <div v-if="current.rectifyPhotos?.length" class="detail-photo-thumbs">
              <el-image
                v-for="(photo, index) in current.rectifyPhotos"
                :key="`${resolveDispatchHazardPhotoName(photo, index)}-${index}`"
                :src="resolveDispatchHazardPhotoSrc(photo, index)"
                :preview-src-list="currentRectifyPhotoUrls"
                :initial-index="index"
                fit="cover"
                class="detail-photo-thumb"
                :alt="resolveDispatchHazardPhotoName(photo, index)"
              />
            </div>
            <span v-else>—</span>
          </el-descriptions-item>
        </el-descriptions>

        <div v-if="current.statusLogs?.length" class="status-logs">
          <h4>操作留痕</h4>
          <el-timeline>
            <el-timeline-item
              v-for="(log, index) in current.statusLogs"
              :key="`${log.time}-${log.action}-${index}`"
              :timestamp="log.time"
              placement="top"
            >
              <div class="log-title">
                {{ log.action }}：{{ log.fromStatus || '—' }} → {{ log.toStatus }}
              </div>
              <div class="log-meta">{{ log.operator }}（{{ log.operatorRole }}）</div>
              <div v-if="log.remark" class="log-remark">备注：{{ log.remark }}</div>
            </el-timeline-item>
          </el-timeline>
        </div>
        <p class="detail-tip">整改提交与验收请前往「个人中心 · 我的待办」办理。</p>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.dispatch-hazard-page {
  padding: 16px 20px 20px;
  min-height: calc(100vh - 120px);
}

.page-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
  flex-wrap: wrap;
}

.page-title {
  margin: 0 0 6px;
  font-size: 18px;
  font-weight: 600;
  color: var(--ap-text);
}

.page-desc {
  margin: 0;
  font-size: 13px;
  color: var(--ap-text-secondary);
  line-height: 1.5;
  max-width: 720px;
}

.tab-toolbar {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  margin-bottom: 14px;
  flex-wrap: wrap;
}

.status-filter {
  width: 120px;
}

.search-input {
  width: 280px;
}

.detail-photo-thumbs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.detail-photo-thumb {
  width: 120px;
  height: 68px;
  border-radius: 4px;
  overflow: hidden;
  border: 1px solid var(--ap-border, #e4e7ed);
  cursor: pointer;
}

.detail-snapshot-thumb {
  display: flex;
}

.detail-snapshot-empty {
  width: 120px;
  height: 68px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  color: #a3a6ad;
  background: #f5f7fa;
  border-radius: 4px;
  border: 1px solid var(--ap-border, #e4e7ed);
}

.status-logs {
  margin-top: 20px;
}

.status-logs h4 {
  margin: 0 0 12px;
  font-size: 14px;
  font-weight: 600;
  color: #303133;
}

.log-title {
  font-weight: 600;
  color: #303133;
}

.log-meta,
.log-remark {
  margin-top: 4px;
  font-size: 13px;
  color: #606266;
  line-height: 1.6;
}

.detail-tip {
  margin: 16px 0 0;
  font-size: 13px;
  color: #909399;
  line-height: 1.6;
}
</style>
