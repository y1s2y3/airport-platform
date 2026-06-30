<script setup>
import { ref, computed, watch } from 'vue'
import { Search, Refresh, Download } from '@element-plus/icons-vue'
import {
  projectTree,
  getProjectPersonnel,
  getDefaultProjectId,
  getProjectLabel,
  workTypeOptions,
  entryStatusOptions,
  onSiteStatusOptions,
  entryStatusTagClass,
  onSiteStatusTagClass,
} from '../../mock/laborRealName'
import {
  REALNAME_ENTRY_STATUS,
  REALNAME_ENTRY_LABEL,
} from '../../constants/laborPersonStatus'

const selectedProjectId = ref(getDefaultProjectId())
const treeRef = ref(null)
const keyword = ref('')
const filters = ref({ workType: '', entryStatus: '', onSiteStatus: '', subcontractor: '' })

const treeData = computed(() =>
  projectTree.map((group) => ({
    id: group.id,
    label: group.label,
    children: group.children?.map((item) => ({
      id: item.id,
      label: `${item.label}(${item.count})`,
      rawLabel: item.label,
      count: item.count,
    })),
  })),
)

const selectedProjectLabel = computed(() => getProjectLabel(selectedProjectId.value))

const allPersonnel = computed(() => getProjectPersonnel(selectedProjectId.value))

const filteredPersonnel = computed(() => {
  const kw = keyword.value.trim()
  return allPersonnel.value.filter((row) => {
    if (kw) {
      const hay = `${row.name}${row.idCard}${row.phone}${row.team}${row.subcontractor}`
      if (!hay.includes(kw)) return false
    }
    if (filters.value.workType && row.workType !== filters.value.workType) return false
    if (filters.value.entryStatus && row.entryStatus !== filters.value.entryStatus) return false
    if (filters.value.onSiteStatus && row.onSiteStatus !== filters.value.onSiteStatus) return false
    if (filters.value.subcontractor && !row.subcontractor.includes(filters.value.subcontractor.trim())) {
      return false
    }
    return true
  })
})

const stats = computed(() => ({
  total: allPersonnel.value.length,
  entered: allPersonnel.value.filter((r) => r.entryStatus === REALNAME_ENTRY_STATUS.ENTERED).length,
  exited: allPersonnel.value.filter((r) => r.entryStatus === REALNAME_ENTRY_STATUS.EXITED).length,
  onSite: allPersonnel.value.filter((r) => r.onSiteStatus === '在场').length,
  special: allPersonnel.value.filter((r) => r.isSpecial && r.entryStatus === REALNAME_ENTRY_STATUS.ENTERED).length,
}))

watch(selectedProjectId, () => {
  keyword.value = ''
  filters.value = { workType: '', entryStatus: '', onSiteStatus: '', subcontractor: '' }
})

function handleNodeClick(data) {
  if (data.id === 'hq') return
  selectedProjectId.value = data.id
}

function handleReset() {
  keyword.value = ''
  filters.value = { workType: '', entryStatus: '', onSiteStatus: '', subcontractor: '' }
}
</script>

<template>
  <div class="realname-page page-card">
    <div class="page-header">
      <div class="page-breadcrumb">劳务管理 / 人员实名制</div>
      <div class="page-heading">
        <h1 class="page-title">人员实名制</h1>
        <div class="page-actions">
          <el-button :icon="Download">导出</el-button>
        </div>
      </div>
      <p class="page-tip">
        入退场：入职登记「已入场」、离职办理「已退场」；在场：当日已打上班卡且未打下班卡。
      </p>
    </div>

    <div class="realname-layout">
      <aside class="project-tree-panel">
        <div class="panel-title">项目列表</div>
        <el-tree
          ref="treeRef"
          :data="treeData"
          node-key="id"
          highlight-current
          default-expand-all
          :current-node-key="selectedProjectId"
          :expand-on-click-node="false"
          class="project-tree"
          @node-click="handleNodeClick"
        />
      </aside>

      <section class="personnel-panel">
        <div class="panel-head">
          <div>
            <div class="panel-title">{{ selectedProjectLabel || '请选择项目' }}</div>
            <div class="panel-stats">
              <span>登记 {{ stats.total }} 人</span>
              <span>已入场 {{ stats.entered }}</span>
              <span>已退场 {{ stats.exited }}</span>
              <span>在场 {{ stats.onSite }}</span>
              <span>特种作业 {{ stats.special }}</span>
            </div>
          </div>
        </div>

        <div class="filter-bar">
          <el-input
            v-model="keyword"
            placeholder="姓名 / 身份证 / 手机号 / 班组 / 分包单位"
            clearable
            :prefix-icon="Search"
            class="search-input"
          />
          <el-select v-model="filters.workType" placeholder="工种" clearable style="width: 110px">
            <el-option v-for="opt in workTypeOptions" :key="opt" :label="opt" :value="opt" />
          </el-select>
          <el-select v-model="filters.entryStatus" :placeholder="REALNAME_ENTRY_LABEL" clearable style="width: 100px">
            <el-option v-for="opt in entryStatusOptions" :key="opt" :label="opt" :value="opt" />
          </el-select>
          <el-select v-model="filters.onSiteStatus" placeholder="在场状态" clearable style="width: 110px">
            <el-option v-for="opt in onSiteStatusOptions" :key="opt" :label="opt" :value="opt" />
          </el-select>
          <el-input v-model="filters.subcontractor" placeholder="分包单位" clearable style="width: 140px" />
          <el-button class="ap-btn-primary" type="primary" :icon="Search">查询</el-button>
          <el-button :icon="Refresh" @click="handleReset">重置</el-button>
        </div>

        <el-table :data="filteredPersonnel" border stripe class="ap-table">
          <el-table-column type="index" label="序号" width="60" align="center" />
          <el-table-column prop="name" label="姓名" width="90" />
          <el-table-column prop="idCard" label="身份证号" min-width="170" />
          <el-table-column prop="gender" label="性别" width="60" align="center" />
          <el-table-column prop="age" label="年龄" width="60" align="center" />
          <el-table-column prop="workType" label="工种" width="90" />
          <el-table-column prop="team" label="班组" min-width="110" show-overflow-tooltip />
          <el-table-column prop="subcontractor" label="分包单位" min-width="120" show-overflow-tooltip />
          <el-table-column prop="phone" label="联系电话" width="130" />
          <el-table-column prop="entryDate" label="进场日期" width="110" />
          <el-table-column :label="REALNAME_ENTRY_LABEL" width="90" align="center">
            <template #default="{ row }">
              <span class="ap-status-tag" :class="entryStatusTagClass(row.entryStatus)">{{ row.entryStatus }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="clockIn" label="上班打卡" width="95" align="center">
            <template #default="{ row }">{{ row.clockIn || '—' }}</template>
          </el-table-column>
          <el-table-column prop="clockOut" label="下班打卡" width="95" align="center">
            <template #default="{ row }">{{ row.clockOut || '—' }}</template>
          </el-table-column>
          <el-table-column label="在场状态" width="90" align="center">
            <template #default="{ row }">
              <span
                v-if="row.onSiteStatus !== '—'"
                class="ap-status-tag"
                :class="onSiteStatusTagClass(row.onSiteStatus)"
              >{{ row.onSiteStatus }}</span>
              <span v-else>—</span>
            </template>
          </el-table-column>
          <el-table-column label="特种作业" width="90" align="center">
            <template #default="{ row }">{{ row.isSpecial ? '是' : '否' }}</template>
          </el-table-column>
          <el-table-column prop="certNo" label="证书编号" min-width="150" show-overflow-tooltip />
          <el-table-column prop="safetyTraining" label="安全教育" width="90" align="center" />
          <el-table-column prop="accessStatus" label="通行状态" width="90" align="center" />
        </el-table>
      </section>
    </div>
  </div>
</template>

<style scoped>
.realname-page {
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
}

.page-title {
  font-size: 20px;
  font-weight: 600;
  color: var(--ap-text);
}

.page-tip {
  margin-top: 8px;
  font-size: 12px;
  color: var(--ap-text-muted);
  line-height: 1.5;
}

.realname-layout {
  display: grid;
  grid-template-columns: 280px minmax(0, 1fr);
  gap: 16px;
  min-height: 560px;
}

.project-tree-panel,
.personnel-panel {
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

.panel-head {
  margin-bottom: 12px;
}

.panel-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 12px 20px;
  margin-top: 6px;
  font-size: 13px;
  color: var(--ap-text-secondary);
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
