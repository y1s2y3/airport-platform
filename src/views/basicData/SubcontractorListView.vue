<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { Search, Refresh } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import {
  subcontractorList,
  subcontractorStatusOptions,
  creditLevelOptions,
  entryStatusTagClass,
  creditLevelTagClass,
} from '../../mock/subcontractorManagement'

const router = useRouter()

const filters = ref({
  name: '',
  projectName: '',
  entryStatus: '',
  creditLevel: '',
})

const syncing = ref(false)

const filteredList = computed(() => {
  return subcontractorList.filter((row) => {
    if (filters.value.name) {
      const kw = filters.value.name.trim()
      if (!row.name.includes(kw) && !row.shortName.includes(kw)) return false
    }
    if (filters.value.projectName && !row.projectName.includes(filters.value.projectName.trim())) {
      return false
    }
    if (filters.value.entryStatus && row.entryStatus !== filters.value.entryStatus) return false
    if (filters.value.creditLevel && row.creditLevel !== filters.value.creditLevel) return false
    return true
  })
})

const stats = computed(() => ({
  total: subcontractorList.length,
  onSite: subcontractorList.filter((r) => r.entryStatus === '在场').length,
  exiting: subcontractorList.filter((r) => r.entryStatus === '退场中').length,
  avgScore: Math.round(
    subcontractorList.reduce((sum, r) => sum + r.creditScore, 0) / subcontractorList.length,
  ),
}))

function handleReset() {
  filters.value = { name: '', projectName: '', entryStatus: '', creditLevel: '' }
}

async function handleSync() {
  syncing.value = true
  await new Promise((resolve) => setTimeout(resolve, 800))
  syncing.value = false
  ElMessage.success('已同步一期供应商库基础信息')
}

function openDetail(row) {
  router.push({ name: 'SubcontractorDetail', params: { id: row.id } })
}
</script>

<template>
  <div class="sub-page page-card">
    <div class="page-header">
      <div class="page-breadcrumb">基础数据管理 / 项目管理 / 分包单位管理</div>
      <div class="page-heading">
        <div class="title-block">
          <h1 class="page-title">分包单位管理</h1>
          <span class="level-tag">指挥部层级</span>
        </div>
        <div class="page-actions">
          <el-button :icon="Refresh" :loading="syncing" @click="handleSync">同步一期供应商库</el-button>
        </div>
      </div>
    </div>

    <div class="stats-row">
      <div class="stat-card">
        <span class="stat-label">分包单位总数</span>
        <span class="stat-value">{{ stats.total }}</span>
      </div>
      <div class="stat-card">
        <span class="stat-label">在场单位</span>
        <span class="stat-value">{{ stats.onSite }}</span>
      </div>
      <div class="stat-card">
        <span class="stat-label">退场中</span>
        <span class="stat-value">{{ stats.exiting }}</span>
      </div>
      <div class="stat-card">
        <span class="stat-label">平均信用分</span>
        <span class="stat-value">{{ stats.avgScore }}</span>
      </div>
    </div>

    <div class="filter-bar">
      <div class="filter-row">
        <div class="filter-item">
          <label>分包单位</label>
          <el-input v-model="filters.name" placeholder="单位名称/简称" clearable style="width: 180px" />
        </div>
        <div class="filter-item">
          <label>所属项目</label>
          <el-input v-model="filters.projectName" placeholder="项目名称" clearable style="width: 200px" />
        </div>
        <div class="filter-item">
          <label>进场状态</label>
          <el-select v-model="filters.entryStatus" placeholder="全部" clearable style="width: 120px">
            <el-option v-for="opt in subcontractorStatusOptions" :key="opt" :label="opt" :value="opt" />
          </el-select>
        </div>
        <div class="filter-item">
          <label>信用等级</label>
          <el-select v-model="filters.creditLevel" placeholder="全部" clearable style="width: 100px">
            <el-option v-for="opt in creditLevelOptions" :key="opt" :label="opt" :value="opt" />
          </el-select>
        </div>
        <div class="filter-actions">
          <el-button class="ap-btn-primary" type="primary" :icon="Search">查询</el-button>
          <el-button :icon="Refresh" @click="handleReset">重置</el-button>
        </div>
      </div>
    </div>

    <div class="table-section">
      <div class="table-summary">共 {{ filteredList.length }} 家分包单位</div>
      <el-table :data="filteredList" border stripe class="ap-table">
        <el-table-column type="index" label="序号" width="60" align="center" />
        <el-table-column prop="shortName" label="单位简称" width="100" show-overflow-tooltip />
        <el-table-column prop="name" label="分包单位名称" min-width="200" show-overflow-tooltip />
        <el-table-column prop="projectName" label="所属项目" min-width="180" show-overflow-tooltip />
        <el-table-column prop="contractScope" label="合同范围" min-width="180" show-overflow-tooltip />
        <el-table-column label="进场状态" width="90" align="center">
          <template #default="{ row }">
            <span class="ap-status-tag" :class="entryStatusTagClass(row.entryStatus)">{{ row.entryStatus }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="violationCount" label="违规单" width="80" align="center" />
        <el-table-column prop="rectificationCount" label="整改单" width="80" align="center" />
        <el-table-column label="进度完成率" width="110" align="center">
          <template #default="{ row }">{{ row.progressRate }}%</template>
        </el-table-column>
        <el-table-column label="信用评分" width="100" align="center">
          <template #default="{ row }">
            <span>{{ row.creditScore }}</span>
            <span class="ap-status-tag credit-tag" :class="creditLevelTagClass(row.creditLevel)">{{ row.creditLevel }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="syncTime" label="最近同步" width="150" />
        <el-table-column label="操作" width="100" fixed="right" align="center">
          <template #default="{ row }">
            <el-button link type="primary" @click="openDetail(row)">查看详情</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>

<style scoped>
.sub-page {
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

.stats-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 16px;
}

.stat-card {
  border: 1px solid var(--ap-border);
  border-radius: 8px;
  background: #fff;
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.stat-label {
  font-size: 13px;
  color: var(--ap-text-muted);
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: var(--ap-primary);
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

.credit-tag {
  margin-left: 4px;
  padding: 0 6px;
  font-size: 11px;
}
</style>
