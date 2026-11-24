<script setup>
import DispatchHazardDetailDialog from '../../components/hazard/DispatchHazardDetailDialog.vue'
import { samplingReturnLocation, restoreSupervisorTaskContext } from '../../utils/hazardSamplingTaskNavigation.js'
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { View } from '@element-plus/icons-vue'
import { useCurrentProject } from '../../composables/useCurrentProject.js'
import { matchesHazardIssueProject } from '../../utils/hazardIssueSummary.js'
import { DISPATCH_HAZARD_TYPE_OPTIONS, getDispatchHazardTypeLabel as hazardTypeLabel } from '../../config/dispatchHazardTypes.js'
import {
  getDispatchHazards,
  DISPATCH_HAZARD_RECTIFY_STATUSES,
} from '../../utils/dispatchHazardStorage.js'

defineProps({
  title: { type: String, default: '调度隐患清单' },
  description: { type: String, default: '' },
})

const { isHqSelected, headerProjectLabel, selectedProjectId } = useCurrentProject()
const route = useRoute()
if (route.query.from === 'sampling-task' && route.query.viewer !== 'hq') restoreSupervisorTaskContext(String(route.query.samplingTask || ''))
const router = useRouter()

const keyword = ref('')
const registrantFilter = ref('')
const statusFilter = ref('')
const typeFilter = ref('')
const list = ref([])
const detailVisible = ref(false)
const current = ref(null)

const readonly = computed(() => isHqSelected.value)
const scopeProjectName = computed(() => (isHqSelected.value ? '' : headerProjectLabel.value))

function load() {
  list.value = scopeProjectName.value
    ? getDispatchHazards().filter(row => row.projectName === scopeProjectName.value || matchesHazardIssueProject('dispatch', row, selectedProjectId.value))
    : getDispatchHazards()
  const focused = list.value.find((row) => row.id === route.query.hazardId)
  if (focused) openDetail(focused)
}

const registrantOptions = computed(() => [...new Set(list.value.map((row) => row.registrant).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'zh-CN')))

const filtered = computed(() => {
  let rows = list.value
  if (statusFilter.value) {
    rows = rows.filter((row) => row.rectifyStatus === statusFilter.value)
  }
  if (registrantFilter.value) {
    rows = rows.filter((row) => row.registrant === registrantFilter.value)
  }
  if (typeFilter.value) {
    rows = rows.filter((row) => row.hazardType === typeFilter.value)
  }
  const q = keyword.value.trim()
  if (!q) return rows
  return rows.filter((row) =>
    [
      row.description,
      row.registrant,
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

function hazardTypeTag(type) {
  return { safety: 'warning', quality: 'success', other: 'info' }[type] || 'info'
}

function rectifyStatusTag(status) {
  const map = {
    待整改: 'warning',
    待验收: '',
    已关闭: 'success',
  }
  return map[status] || 'info'
}

function openDetail(row) {
  current.value = row
  detailVisible.value = true
}

watch([isHqSelected, headerProjectLabel], () => load())
watch(() => route.query.hazardId, () => {
  if (!route.query.hazardId) detailVisible.value = false
  load()
})

onMounted(load)
</script>

<template>
  <div class="dispatch-hazard-page page-card">
    <div v-if="['summary','sampling-task'].includes(route.query.from)" class="hazard-source-back"><el-button link type="primary" @click="router.push(samplingReturnLocation(route.query))">{{ route.query.from === 'sampling-task' ? '返回任务' : '返回汇总' }}</el-button></div>
    <div class="page-head">
      <div>
        <h2 class="page-title">{{ title }}</h2>
        <p class="page-desc">
          {{
            description ||
            '汇集 COC 调度大屏「问题截图」登记的隐患，整改与验收请在个人中心待办处理。'
          }}
        </p>
      </div>
      <div class="page-head-actions">
        <el-tag v-if="readonly" size="small" type="info">指挥部 · 只读查看全部项目</el-tag>
        <el-tag v-else size="small" type="success">项目层级 · {{ scopeProjectName || '当前项目' }}</el-tag>
      </div>
    </div>

    <div class="tab-toolbar">
      <el-select v-model="registrantFilter" placeholder="登记人" clearable filterable class="status-filter" aria-label="登记人">
        <el-option v-for="name in registrantOptions" :key="name" :label="name" :value="name" />
      </el-select>
      <el-select v-model="typeFilter" placeholder="隐患类型" clearable class="status-filter" aria-label="隐患类型">
        <el-option v-for="item in DISPATCH_HAZARD_TYPE_OPTIONS" :key="item.value" :label="item.label" :value="item.value" />
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
      <el-table-column prop="hazardLevel" label="隐患等级" width="150" align="center" />
      <el-table-column label="整改状态" width="96" align="center">
        <template #default="{ row }">
          <el-tag :type="rectifyStatusTag(row.rectifyStatus)" size="small">
            {{ row.rectifyStatus || '待整改' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="currentNode" label="当前流程节点" min-width="140" align="center">
        <template #default="{ row }">{{ row.currentNode || '--' }}</template>
      </el-table-column>
      <el-table-column prop="rectifier" label="整改人" width="88" show-overflow-tooltip />
      <el-table-column prop="hazardCategory" label="隐患类别" min-width="110" align="center">
        <template #default="{ row }">{{ row.hazardCategory || '--' }}</template>
      </el-table-column>
      <el-table-column prop="reviewer" label="复查人" min-width="130" show-overflow-tooltip />
      <el-table-column prop="hazardDeadline" label="整改期限" width="112" />
      <el-table-column prop="cameraName" label="摄像头" min-width="110" show-overflow-tooltip />
      <el-table-column prop="source" label="来源" width="96" />
      <el-table-column prop="registrant" label="登记人" min-width="130" show-overflow-tooltip />
      <el-table-column prop="uploadTime" label="登记时间" width="148" />
      <el-table-column label="操作" width="88" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" :icon="View" @click="openDetail(row)">详情</el-button>
        </template>
      </el-table-column>
    </el-table>

    <DispatchHazardDetailDialog v-model="detailVisible" :record="current" />
  </div>
</template>

<style scoped>
.hazard-source-back { display:flex; justify-content:flex-start; margin-bottom:14px; }
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

.page-head-actions { display: flex; align-items: center; gap: 10px; }

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

</style>
