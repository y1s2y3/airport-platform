<script setup>
/**
 * 指挥部 · 智慧工地监管 · 人员/车辆轨迹系统列表
 * 仅展示已填写系统地址的项目（含停用）；操作「跳转」打开外链。
 */
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Search, Refresh } from '@element-plus/icons-vue'
import { listConfiguredPersonnelTrackSystems } from '../../mock/laborPersonnelTrack'
import { listConfiguredVehicleTrackSystems } from '../../mock/vehicleManagement'
import { openTrackExternalByUrl } from '../../utils/trackExternalJump'

const props = defineProps({
  /** labor | vehicle；也可由路由 meta.trackKind 指定 */
  kind: { type: String, default: '' },
})

const route = useRoute()
const keyword = ref('')
const refreshTick = ref(0)

const trackKind = computed(() => {
  const k = props.kind || route.meta.trackKind || 'labor'
  return k === 'vehicle' ? 'vehicle' : 'labor'
})

const parentBreadcrumb = computed(() =>
  trackKind.value === 'vehicle' ? '车辆管理' : '人员实名制管理',
)

const pageTitle = computed(() =>
  trackKind.value === 'vehicle' ? '车辆轨迹系统' : '人员轨迹系统',
)

const rows = computed(() => {
  void refreshTick.value
  return trackKind.value === 'vehicle'
    ? listConfiguredVehicleTrackSystems()
    : listConfiguredPersonnelTrackSystems()
})

const filtered = computed(() => {
  const kw = keyword.value.trim()
  if (!kw) return rows.value
  return rows.value.filter((r) =>
    `${r.project_name}${r.url}${r.system_name}${r.project_id}`.includes(kw),
  )
})

function reset() {
  keyword.value = ''
}

function handleSearch() {
  ElMessage.success(`已按条件查询，共 ${filtered.value.length} 个项目`)
}

function handleRefresh() {
  refreshTick.value += 1
  ElMessage.success('列表已刷新')
}

function handleJump(row) {
  openTrackExternalByUrl(row?.url, row?.system_name || pageTitle.value)
}
</script>

<template>
  <div class="track-sys-page page-card">
    <div class="page-header">
      <div class="page-breadcrumb">{{ parentBreadcrumb }} / {{ pageTitle }}</div>
      <h1 class="page-title">{{ pageTitle }}</h1>
    </div>

    <div class="toolbar">
      <el-input
        v-model="keyword"
        clearable
        placeholder="搜索项目名称 / 系统名称 / 系统地址"
        class="kw-input"
        @keyup.enter="handleSearch"
      />
      <el-button type="primary" :icon="Search" @click="handleSearch">查询</el-button>
      <el-button :icon="Refresh" @click="reset">重置</el-button>
      <el-button @click="handleRefresh">刷新</el-button>
    </div>

    <el-table :data="filtered" stripe border class="sys-table" empty-text="暂无已配置系统地址的项目">
      <el-table-column prop="project_name" label="项目名称" min-width="200" show-overflow-tooltip />
      <el-table-column prop="system_name" label="系统名称" min-width="180" show-overflow-tooltip>
        <template #default="{ row }">
          {{ row.system_name || '—' }}
        </template>
      </el-table-column>
      <el-table-column prop="url" label="系统地址" min-width="280" show-overflow-tooltip />
      <el-table-column label="启用状态" width="110" align="center">
        <template #default="{ row }">
          <el-tag :type="row.enabled ? 'success' : 'info'" size="small" effect="plain">
            {{ row.enabled ? '启用' : '停用' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="updated_at" label="更新时间" width="180" align="center">
        <template #default="{ row }">
          {{ row.updated_at || '—' }}
        </template>
      </el-table-column>
      <el-table-column label="操作" width="100" align="center" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="handleJump(row)">跳转</el-button>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<style scoped>
.track-sys-page {
  padding: 20px 24px 24px;
}
.page-header {
  margin-bottom: 16px;
}
.page-breadcrumb {
  font-size: 13px;
  color: var(--ap-text-muted);
  margin-bottom: 8px;
}
.page-title {
  font-size: 20px;
  font-weight: 600;
  margin: 0 0 8px;
}
.toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
  align-items: center;
}
.kw-input {
  width: 280px;
}
.sys-table {
  width: 100%;
}
</style>
