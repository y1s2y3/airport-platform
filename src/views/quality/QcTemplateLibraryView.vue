<script setup>
import { ref, computed } from 'vue'
import { Search, Refresh, Plus } from '@element-plus/icons-vue'
import {
  qcTemplateList,
  disciplineOptions,
  riskLevelOptions,
  statusOptions,
  stageOptions,
} from '../../mock/qcTemplates'

const filters = ref({
  name: '',
  discipline: '',
  process: '',
  riskLevel: '',
  stage: '',
  status: '',
})

const currentPage = ref(1)
const pageSize = ref(10)

const filteredList = computed(() => {
  return qcTemplateList.filter((row) => {
    if (filters.value.name && !row.name.includes(filters.value.name)) return false
    if (filters.value.discipline && row.discipline !== filters.value.discipline) return false
    if (filters.value.riskLevel && row.riskLevel !== filters.value.riskLevel) return false
    if (filters.value.status && row.status !== filters.value.status) return false
    return true
  })
})

const pagedList = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return filteredList.value.slice(start, start + pageSize.value)
})

const enabledCount = computed(() => qcTemplateList.filter((r) => r.status === '已启用').length)

function riskTagClass(level) {
  if (level === '高') return 'ap-tag-high'
  if (level === '中') return 'ap-tag-medium'
  return 'ap-tag-low'
}

function statusTagClass(status) {
  if (status === '已启用') return 'ap-tag-enabled'
  if (status === '已禁用') return 'ap-tag-disabled'
  return 'ap-tag-draft'
}

function handleSearch() {
  currentPage.value = 1
}

function handleReset() {
  filters.value = { name: '', discipline: '', process: '', riskLevel: '', stage: '', status: '' }
  currentPage.value = 1
}
</script>

<template>
  <div class="qc-page page-card">
    <div class="page-header">
      <div class="page-breadcrumb">
        质量管理 / 基础数据配置 / 质量控制点模板库
      </div>
      <div class="page-heading">
        <h1 class="page-title">质量控制点模板库</h1>
        <div class="page-actions">
          <el-button class="ap-btn-primary" type="primary" :icon="Search" @click="handleSearch">查询</el-button>
          <el-button :icon="Refresh" @click="handleReset">重置</el-button>
          <el-button class="ap-btn-primary" type="primary" :icon="Plus">新增</el-button>
        </div>
      </div>
    </div>

    <div class="filter-grid">
          <div class="filter-item">
            <label>模板名称</label>
            <el-input v-model="filters.name" placeholder="请输入模板名称" clearable />
          </div>
          <div class="filter-item">
            <label>所属专业</label>
            <el-select v-model="filters.discipline" placeholder="请选择所属专业" clearable>
              <el-option v-for="opt in disciplineOptions" :key="opt" :label="opt" :value="opt" />
            </el-select>
          </div>
          <div class="filter-item">
            <label>关联标准工序</label>
            <el-select v-model="filters.process" placeholder="请选择标准工序" clearable>
              <el-option label="GC-002 钢结构焊接" value="gc002" />
              <el-option label="TJ-015 混凝土浇筑" value="tj015" />
            </el-select>
          </div>
          <div class="filter-item">
            <label>风险等级</label>
            <el-select v-model="filters.riskLevel" placeholder="请选择风险等级" clearable>
              <el-option v-for="opt in riskLevelOptions" :key="opt" :label="opt" :value="opt" />
            </el-select>
          </div>
          <div class="filter-item">
            <label>适用阶段</label>
            <el-select v-model="filters.stage" placeholder="请选择适用阶段" clearable>
              <el-option v-for="opt in stageOptions" :key="opt" :label="opt" :value="opt" />
            </el-select>
          </div>
          <div class="filter-item">
            <label>状态</label>
            <el-select v-model="filters.status" placeholder="请选择状态" clearable>
              <el-option v-for="opt in statusOptions" :key="opt" :label="opt" :value="opt" />
            </el-select>
          </div>
        </div>

        <el-table :data="pagedList" border stripe class="ap-table" style="width: 100%">
          <el-table-column type="index" label="序号" width="60" align="center" />
          <el-table-column prop="name" label="模板名称" min-width="200" show-overflow-tooltip />
          <el-table-column prop="process" label="关联标准工序" min-width="160" show-overflow-tooltip />
          <el-table-column prop="discipline" label="所属专业" width="110" />
          <el-table-column label="风险等级" width="90" align="center">
            <template #default="{ row }">
              <span class="ap-status-tag" :class="riskTagClass(row.riskLevel)">{{ row.riskLevel }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="pointCount" label="控制点数量" width="100" align="center" />
          <el-table-column prop="method" label="检测方法" min-width="160" show-overflow-tooltip />
          <el-table-column prop="frequency" label="检测频次" width="110" />
          <el-table-column prop="scope" label="适用范围" min-width="120" show-overflow-tooltip />
          <el-table-column prop="version" label="版本号" width="80" align="center" />
          <el-table-column label="状态" width="90" align="center">
            <template #default="{ row }">
              <span class="ap-status-tag" :class="statusTagClass(row.status)">{{ row.status }}</span>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="120" fixed="right" align="center">
            <template #default>
              <span class="ap-link">详情</span>
              <span class="ap-link">编辑</span>
            </template>
          </el-table-column>
        </el-table>

        <div class="table-footer">
          <div class="table-stats">
            <span>今日新增：2 条</span>
            <span>当前启用：{{ enabledCount }} 条</span>
          </div>
          <el-pagination
            v-model:current-page="currentPage"
            v-model:page-size="pageSize"
            :total="filteredList.length"
            :page-sizes="[10, 20, 50]"
            layout="total, prev, pager, next, sizes, jumper"
            background
          />
        </div>
  </div>
</template>

<style scoped>
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
}

.page-title {
  font-size: 20px;
}

.page-actions {
  display: flex;
  gap: 10px;
}

.filter-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px 24px;
  margin-bottom: 20px;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--ap-border);
}

.filter-item label {
  display: block;
  font-size: 13px;
  color: var(--ap-text-secondary);
  margin-bottom: 6px;
}

.filter-item .el-select {
  width: 100%;
}

.table-stats {
  font-size: 13px;
  color: var(--ap-text-secondary);
}

.table-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 16px;
}

:deep(.el-pagination.is-background .el-pager li.is-active) {
  background-color: var(--ap-primary);
  border-color: var(--ap-primary);
}
</style>
