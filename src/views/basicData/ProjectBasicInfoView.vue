<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { Search, Refresh, Plus } from '@element-plus/icons-vue'
import {
  projectList,
  formatConstructionPeriod,
  formatTotalInvestment,
  displayProjectManagerName,
} from '../../mock/projectBasicInfo'
import { useCurrentProject } from '../../composables/useCurrentProject'

const router = useRouter()
const { isHqSelected, laborProjectId, headerProjectLabel } = useCurrentProject()

const filters = ref({
  projectName: '',
})

const filteredList = computed(() => {
  return projectList.filter((row) => {
    if (!isHqSelected.value) {
      if (!laborProjectId.value || row.id !== laborProjectId.value) return false
    }
    if (!filters.value.projectName) return true
    const kw = filters.value.projectName.trim()
    return row.projectName.includes(kw) || row.shortName.includes(kw)
  })
})

const tableSummary = computed(() => {
  if (isHqSelected.value) return `全部项目 · 共 ${filteredList.value.length} 个`
  return `${headerProjectLabel.value} · 共 ${filteredList.value.length} 条`
})

const emptyText = computed(() =>
  isHqSelected.value
    ? '暂无项目信息，可点击「新增」维护'
    : '当前项目暂无项目信息，可点击「新增」维护',
)

function handleReset() {
  filters.value = { projectName: '' }
}

function openCreate() {
  router.push({ name: 'ProjectCreate' })
}

function openEdit(row) {
  router.push({
    name: 'ProjectPortrait',
    params: { id: row.id },
    query: { mode: 'edit' },
  })
}

function openViewPortrait(row) {
  router.push({ name: 'ProjectPortrait', params: { id: row.id } })
}

function formatPeriod(row) {
  return formatConstructionPeriod(row) || '—'
}
</script>

<template>
  <div class="project-info-page page-card">
    <div class="page-header">
      <div class="page-breadcrumb">基础数据管理 / 项目信息管理</div>
      <div class="page-heading">
        <div class="title-block">
          <h1 class="page-title">项目信息管理</h1>
        </div>
        <el-button class="ap-btn-primary" type="primary" :icon="Plus" @click="openCreate">
          新增
        </el-button>
      </div>
    </div>

    <div class="filter-bar">
      <div class="filter-row">
        <div class="filter-item">
          <label>项目名称</label>
          <el-input
            v-model="filters.projectName"
            placeholder="项目名称/简称"
            clearable
            style="width: 240px" aria-label="项目名称/简称"/>
        </div>
        <div class="filter-actions">
          <el-button class="ap-btn-primary" type="primary" :icon="Search">查询</el-button>
          <el-button :icon="Refresh" @click="handleReset">重置</el-button>
        </div>
      </div>
    </div>

    <div class="table-section">
      <div class="table-summary">{{ tableSummary }}</div>
      <el-table
        :data="filteredList"
        border
        stripe
        class="ap-table project-info-table"
        :empty-text="emptyText"
      >
        <el-table-column type="index" label="#" width="52" align="center" />
        <el-table-column prop="projectName" label="项目名称" min-width="280" show-overflow-tooltip />
        <el-table-column prop="shortName" label="项目简称" width="140" show-overflow-tooltip />
        <el-table-column prop="projectCode" label="国家统一编码" min-width="150" show-overflow-tooltip>
          <template #default="{ row }">
            {{ row.projectCode || '—' }}
          </template>
        </el-table-column>
        <el-table-column prop="status" label="项目状态" width="96" align="center" />
        <el-table-column label="项目总投资(万元)" width="148" align="right" header-align="center">
          <template #default="{ row }">
            {{ formatTotalInvestment(row.totalInvestment) }}
          </template>
        </el-table-column>
        <el-table-column label="建设期" min-width="210" show-overflow-tooltip>
          <template #default="{ row }">
            {{ formatPeriod(row) }}
          </template>
        </el-table-column>
        <el-table-column label="项目经理" width="110" align="center" show-overflow-tooltip>
          <template #default="{ row }">
            {{ displayProjectManagerName(row) || '—' }}
          </template>
        </el-table-column>
        <el-table-column label="是否隐藏" width="96" align="center">
          <template #default="{ row }">
            <el-switch v-model="row.hidden" />
          </template>
        </el-table-column>
        <el-table-column label="操作" width="168" fixed="right" align="center">
          <template #default="{ row }">
            <el-button link type="primary" @click="openViewPortrait(row)">查看项目画像</el-button>
            <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>

<style scoped>
.project-info-page {
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

.page-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.title-block {
  display: flex;
  align-items: center;
  gap: 12px;
}

.page-title {
  font-size: 20px;
  font-weight: 600;
  color: var(--ap-text);
}

.level-tag {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 999px;
  font-size: 12px;
  color: var(--ap-primary);
  background: var(--ap-primary-light);
  border: 1px solid rgba(143, 0, 69, 0.15);
}

.filter-bar {
  border: 1px solid var(--ap-border);
  border-radius: 8px;
  background: #fff;
  padding: 16px 20px;
  margin-bottom: 16px;
}

.filter-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 16px 24px;
}

.filter-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.filter-item label {
  font-size: 13px;
  color: var(--ap-text-secondary);
  white-space: nowrap;
}

.filter-actions {
  display: flex;
  gap: 8px;
}

.table-section {
  border: 1px solid var(--ap-border);
  border-radius: 8px;
  background: #fff;
  padding: 16px 20px 20px;
}

.table-summary {
  margin-bottom: 12px;
  font-size: 13px;
  color: var(--ap-text-secondary);
}
</style>
