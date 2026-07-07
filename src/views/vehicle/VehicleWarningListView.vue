<script setup>
import { ref, computed, watch } from 'vue'
import { Search, Refresh } from '@element-plus/icons-vue'
import { useLaborProjectScope } from '../../composables/useCurrentProject'
import { vehicleWarningMenuItem } from '../../config/vehicleMenu.js'
import {
  projectTree,
  getProjectVehicleWarnings,
  getVehicleWarningStats,
  vehicleWarningStatusOptions,
  vehicleWarningStatusTagClass,
} from '../../mock/vehicleManagement'

const { isHqSelected, treeProjectId, scopeProjectId, scopeProjectLabel, onTreeNodeClick } = useLaborProjectScope()
const keyword = ref('')
const filters = ref({ status: '', source: '' })

const treeData = computed(() =>
  projectTree.map((group) => ({
    id: group.id,
    label: group.label,
    children: group.children?.map((item) => {
      const pending = getVehicleWarningStats(item.id).pending
      return {
        id: item.id,
        label: `${item.label.replace(/\(\d+\)$/, '')}(${pending})`,
      }
    }),
  })),
)

const allWarnings = computed(() => getProjectVehicleWarnings(scopeProjectId.value))

const filteredWarnings = computed(() => {
  const kw = keyword.value.trim()
  return allWarnings.value.filter((row) => {
    if (filters.value.status && row.status !== filters.value.status) return false
    if (filters.value.source && row.source !== filters.value.source) return false
    if (kw) {
      const hay = `${row.warningNo}${row.plateNo}${row.warningType}${row.relatedInfo}${row.source}`
      if (!hay.includes(kw)) return false
    }
    return true
  })
})

const stats = computed(() => getVehicleWarningStats(scopeProjectId.value))

watch(scopeProjectId, () => {
  keyword.value = ''
  filters.value = { status: '', source: '' }
})

function handleReset() {
  keyword.value = ''
  filters.value = { status: '', source: '' }
}
</script>

<template>
  <div class="vehicle-warning-page page-card">
    <div class="page-header">
      <div class="page-breadcrumb">车辆管理 / 预警清单</div>
      <h1 class="page-title">预警清单</h1>
      <p v-if="!isHqSelected" class="page-scope">当前项目：{{ scopeProjectLabel }}</p>
      <p class="page-tip">{{ vehicleWarningMenuItem.description }}</p>
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

      <main class="warning-main page-panel">
        <div v-if="isHqSelected" class="panel-title">{{ scopeProjectLabel }}</div>

        <div class="stats-row">
          <span>预警 {{ stats.total }} 条</span>
          <span>待处置 {{ stats.pending }}</span>
          <span>处置中 {{ stats.processing }}</span>
          <span>已关闭 {{ stats.closed }}</span>
          <span>车辆监管 {{ stats.vehicle }}</span>
          <span>轨迹监管 {{ stats.track }}</span>
        </div>

        <div class="filter-bar">
          <el-input
            v-model="keyword"
            placeholder="预警编号 / 车牌 / 类型 / 关联信息"
            clearable
            :prefix-icon="Search"
            class="search-input"
          />
          <el-select v-model="filters.source" placeholder="来源" clearable style="width: 120px">
            <el-option label="车辆监管" value="车辆监管" />
            <el-option label="轨迹监管" value="轨迹监管" />
          </el-select>
          <el-select v-model="filters.status" placeholder="状态" clearable style="width: 110px">
            <el-option v-for="opt in vehicleWarningStatusOptions" :key="opt" :label="opt" :value="opt" />
          </el-select>
          <el-button class="ap-btn-primary" type="primary" :icon="Search">查询</el-button>
          <el-button :icon="Refresh" @click="handleReset">重置</el-button>
        </div>

        <el-table :data="filteredWarnings" border stripe class="ap-table" empty-text="暂无车辆预警">
          <el-table-column type="index" label="序号" width="60" align="center" />
          <el-table-column prop="warningNo" label="预警编号" width="130" show-overflow-tooltip />
          <el-table-column prop="plateNo" label="车牌号" width="110" />
          <el-table-column prop="warningType" label="预警类型" min-width="120" />
          <el-table-column prop="source" label="来源" width="90" align="center" />
          <el-table-column prop="relatedInfo" label="关联信息" min-width="120" show-overflow-tooltip />
          <el-table-column label="状态" width="90" align="center">
            <template #default="{ row }">
              <span class="ap-status-tag" :class="vehicleWarningStatusTagClass(row.status)">
                {{ row.status }}
              </span>
            </template>
          </el-table-column>
          <el-table-column prop="triggeredAt" label="触发时间" width="160" />
        </el-table>
      </main>
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
  margin: 0 0 8px;
}

.page-scope {
  margin: 0 0 8px;
  font-size: 14px;
  font-weight: 600;
  color: var(--ap-text);
}

.page-tip {
  margin: 0;
  font-size: 12px;
  color: var(--ap-text-muted);
  line-height: 1.5;
}

.page-panel {
  border: 1px solid var(--ap-border);
  border-radius: 8px;
  background: #fff;
  padding: 16px;
}

.page-layout.with-tree {
  display: grid;
  grid-template-columns: 280px minmax(0, 1fr);
  gap: 16px;
  min-height: 560px;
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

.stats-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12px 20px;
  margin-bottom: 12px;
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
