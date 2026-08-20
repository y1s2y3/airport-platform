<script setup>
import { ref, computed, watch } from 'vue'
import { Search, Refresh } from '@element-plus/icons-vue'
import { useVehicleProjectScope } from '../../composables/useCurrentProject'
import { projectTree, getProjectAccessRecords } from '../../mock/vehicleManagement'

const { isHqSelected, treeProjectId, scopeProjectId, scopeProjectLabel, onTreeNodeClick } = useVehicleProjectScope()
const keyword = ref('')
const filters = ref({ direction: '' })

const treeData = computed(() =>
  projectTree.map((group) => ({
    id: group.id,
    label: group.label,
    children: group.children?.map((item) => ({
      id: item.id,
      label: item.label.replace(/\(\d+\)$/, ''),
    })),
  })),
)

const allRecords = computed(() => getProjectAccessRecords(scopeProjectId.value))

const filteredRecords = computed(() => {
  const kw = keyword.value.trim()
  return allRecords.value.filter((row) => {
    if (kw) {
      const hay = `${row.plate_no}${row.gate_name}${row.vehicle_type || ''}`
      if (!hay.includes(kw)) return false
    }
    if (filters.value.direction && row.direction !== filters.value.direction) return false
    return true
  })
})

const stats = computed(() => {
  const list = allRecords.value
  return {
    total: list.length,
    in: list.filter((r) => r.direction === '进场').length,
    out: list.filter((r) => r.direction === '出场').length,
  }
})

watch(scopeProjectId, () => {
  keyword.value = ''
  filters.value = { direction: '' }
})

function handleReset() {
  keyword.value = ''
  filters.value = { direction: '' }
}
</script>

<template>
  <div class="vehicle-access-page page-card">
    <div class="page-header">
      <div class="page-breadcrumb">车辆管理 / 进出场记录</div>
      <div class="page-heading">
        <h1 class="page-title">进出场记录</h1>
      </div>
    </div>

    <div class="page-layout" :class="{ 'with-tree': isHqSelected }">
      <aside v-if="isHqSelected" class="project-tree-panel">
        <div class="panel-title">项目列表</div>
        <el-tree
          :data="treeData"
          node-key="id"
          highlight-current
          default-expand-all
          :current-node-key="treeProjectId"
          :expand-on-click-node="false"
          class="project-tree"
          @node-click="onTreeNodeClick"
        />
      </aside>

      <div class="content-panel page-panel">
        <div v-if="isHqSelected" class="panel-title">{{ scopeProjectLabel }}</div>

        <div class="panel-head">
          <div class="panel-stats">
            <span>记录 {{ stats.total }} 条</span>
            <span>进场 {{ stats.in }}</span>
            <span>出场 {{ stats.out }}</span>
          </div>
        </div>

        <div class="filter-bar">
          <el-input
            v-model="keyword"
            placeholder="车牌号 / 道闸 / 车辆类型"
            clearable
            :prefix-icon="Search"
            class="search-input" aria-label="车牌号 / 道闸 / 车辆类型"/>
          <el-select v-model="filters.direction" placeholder="方向" clearable style="width: 100px" aria-label="方向">
            <el-option label="进场" value="进场" />
            <el-option label="出场" value="出场" />
          </el-select>
          <el-button class="ap-btn-primary" type="primary" :icon="Search">查询</el-button>
          <el-button :icon="Refresh" @click="handleReset">重置</el-button>
        </div>

        <el-table :data="filteredRecords" border stripe class="ap-table access-table">
          <el-table-column type="index" label="序号" width="60" align="center" />
          <el-table-column prop="plate_no" label="车牌号" min-width="120" />
          <el-table-column prop="vehicle_type" label="车辆类型" min-width="120" />
          <el-table-column prop="direction" label="方向" width="80" align="center" />
          <el-table-column prop="gate_name" label="道闸" min-width="120" />
          <el-table-column prop="record_time" label="记录时间" min-width="160" />
        </el-table>
      </div>
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

.page-title {
  font-size: 20px;
  font-weight: 600;
  color: var(--ap-text);
}

.page-panel {
  border: 1px solid var(--ap-border);
  border-radius: 8px;
  background: #fff;
  padding: 16px;
}

.content-panel {
  min-width: 0;
}

.access-table {
  width: 100%;
}

.page-layout.with-tree {
  display: grid;
  grid-template-columns: 280px minmax(0, 1fr);
  gap: 16px;
  min-height: 520px;
}

.project-tree-panel {
  border: 1px solid var(--ap-border);
  border-radius: 8px;
  background: #fff;
  padding: 16px;
}

.panel-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--ap-text);
  margin-bottom: 12px;
}

.project-tree :deep(.el-tree-node__content) {
  height: 34px;
  border-radius: 4px;
}

.project-tree :deep(.el-tree-node.is-current > .el-tree-node__content) {
  background: var(--ap-primary-light);
  color: var(--ap-primary);
  font-weight: 600;
}

.panel-head {
  margin-bottom: 12px;
}

.panel-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 12px 20px;
  font-size: 13px;
  color: var(--ap-text-secondary);
}

.filter-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.search-input {
  width: 280px;
}
</style>
