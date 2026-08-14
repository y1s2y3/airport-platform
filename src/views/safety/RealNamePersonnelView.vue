<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Search, Refresh, Download } from '@element-plus/icons-vue'
import { useLaborProjectScope, selectedProjectId } from '../../composables/useCurrentProject'
import {
  projectTree,
  getProjectPersonnel,
  getRealNameStats,
  workTypeOptions,
  personnelCategoryOptions,
  entryStatusOptions,
  entryStatusTagClass,
  isSafetyEducationComplete,
  maskPhone,
  logPhoneView,
} from '../../mock/laborRealName'
import { REALNAME_ENTRY_LABEL } from '../../constants/laborPersonStatus'

const route = useRoute()
const router = useRouter()
const { isHqSelected, treeProjectId, scopeProjectId, scopeProjectLabel, onTreeNodeClick } = useLaborProjectScope()
const keyword = ref('')
const filters = ref({ work_type: '', personnel_category: '', entry_status: '', unit_name: '' })
const visiblePhoneIds = ref(new Set())

/** 预警「去处理」跳转：自动带入姓名关键词，并切到对应项目 */
function applyRouteFilters() {
  const kw = String(route.query.keyword || route.query.name || '').trim()
  if (kw) keyword.value = kw
  const pid = String(route.query.projectId || '').trim()
  if (!pid) return
  if (isHqSelected.value) {
    treeProjectId.value = pid
  } else {
    selectedProjectId.value = pid
  }
}

onMounted(applyRouteFilters)
watch(() => [route.query.keyword, route.query.name, route.query.projectId], applyRouteFilters)

const allPersonnel = computed(() => getProjectPersonnel(scopeProjectId.value))

const treeData = computed(() =>
  projectTree.map((group) => ({
    id: group.id,
    label: group.label,
    children: group.children?.map((item) => ({
      id: item.id,
      label: `${item.label.replace(/\(\d+\)$/, '')}(${item.count})`,
    })),
  })),
)

const filteredPersonnel = computed(() => {
  const kw = keyword.value.trim()
  return allPersonnel.value.filter((row) => {
    if (kw) {
      const hay = `${row.basic.personnel_no}${row.basic.name}${row.basic.phone}${row.basic.id_number}${row.unit.unit_name}${row.unit.work_type}`
      if (!hay.includes(kw)) return false
    }
    if (filters.value.work_type && row.unit.work_type !== filters.value.work_type) return false
    if (filters.value.personnel_category && row.unit.personnel_category !== filters.value.personnel_category) {
      return false
    }
    if (filters.value.entry_status && row.entry_status !== filters.value.entry_status) return false
    if (filters.value.unit_name && !row.unit.unit_name.includes(filters.value.unit_name.trim())) {
      return false
    }
    return true
  })
})

const stats = computed(() => getRealNameStats(scopeProjectId.value))
watch(scopeProjectId, () => {
  // 从预警「去处理」带 keyword 跳入时，保留姓名筛选，避免切项目时被清空
  const routeKw = String(route.query.keyword || route.query.name || '').trim()
  keyword.value = routeKw || ''
  filters.value = { work_type: '', personnel_category: '', entry_status: '', unit_name: '' }
  visiblePhoneIds.value = new Set()
})

function handleReset() {
  keyword.value = ''
  filters.value = { work_type: '', personnel_category: '', entry_status: '', unit_name: '' }
}

function goDetail(row) {
  router.push({ name: 'RealNamePersonnelDetail', params: { id: row.id } })
}

function viewPhone(row) {
  visiblePhoneIds.value = new Set([...visiblePhoneIds.value, row.id])
  logPhoneView({
    personnel_id: row.id,
    personnel_no: row.basic.personnel_no,
    name: row.basic.name,
    scene: '列表',
  })
}

function isPhoneVisible(id) {
  return visiblePhoneIds.value.has(id)
}
</script>

<template>
  <div class="realname-page page-card">
    <div class="page-header">
      <div class="page-breadcrumb">人员实名制管理 / 人员实名制</div>
      <div class="page-heading">
        <h1 class="page-title">人员实名制</h1>
        <div class="header-actions">
          <el-button :icon="Download">导出</el-button>
        </div>
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

      <div class="personnel-panel page-panel">
        <div v-if="isHqSelected" class="panel-title">{{ scopeProjectLabel }}</div>
        <div class="panel-head">
          <div class="panel-stats">
            <span>登记 {{ stats.total }} 人</span>
            <span>在岗 {{ stats.entered }}</span>
            <span>离场 {{ stats.exited }}</span>
            <span>管理人员 {{ stats.manage }}</span>
            <span>特种作业 {{ stats.special }}</span>
          </div>
        </div>

        <div class="filter-bar">
          <el-input
            v-model="keyword"
            placeholder="编号 / 姓名 / 手机 / 证件号 / 参建单位"
            clearable
            :prefix-icon="Search"
            class="search-input"
          />
          <el-select v-model="filters.work_type" placeholder="工种/职务" clearable style="width: 110px">
            <el-option v-for="opt in workTypeOptions" :key="opt" :label="opt" :value="opt" />
          </el-select>
          <el-select v-model="filters.personnel_category" placeholder="工人类型" clearable style="width: 120px">
            <el-option v-for="opt in personnelCategoryOptions" :key="opt" :label="opt" :value="opt" />
          </el-select>
          <el-select v-model="filters.entry_status" :placeholder="REALNAME_ENTRY_LABEL" clearable style="width: 100px">
            <el-option v-for="opt in entryStatusOptions" :key="opt" :label="opt" :value="opt" />
          </el-select>
          <el-input v-model="filters.unit_name" placeholder="参建单位" clearable style="width: 160px" />
          <el-button class="ap-btn-primary" type="primary" :icon="Search">查询</el-button>
          <el-button :icon="Refresh" @click="handleReset">重置</el-button>
        </div>

        <el-table :data="filteredPersonnel" border stripe class="ap-table">
          <el-table-column type="index" label="序号" width="60" align="center" />
          <el-table-column prop="basic.personnel_no" label="人员编号" width="130" show-overflow-tooltip />
          <el-table-column label="照片" width="70" align="center">
            <template #default="{ row }">
              <el-avatar :size="36" class="list-avatar">{{ row.basic.name.slice(0, 1) }}</el-avatar>
            </template>
          </el-table-column>
          <el-table-column prop="basic.name" label="姓名" width="90" />
          <el-table-column label="手机号码" width="170">
            <template #default="{ row }">
              <div class="phone-cell">
                <span>{{ isPhoneVisible(row.id) ? row.basic.phone : maskPhone(row.basic.phone) }}</span>
                <el-button
                  v-if="!isPhoneVisible(row.id)"
                  link
                  type="primary"
                  size="small"
                  @click="viewPhone(row)"
                >
                  查看
                </el-button>
              </div>
            </template>
          </el-table-column>
          <el-table-column prop="unit.personnel_category" label="工人类型" width="110" />
          <el-table-column prop="unit.work_type" label="工种/职务" width="100" />
          <el-table-column prop="unit.unit_name" label="参建单位名称" min-width="180" show-overflow-tooltip />
          <el-table-column prop="unit.cert_valid_to" label="特种资质有效期" width="130" align="center">
            <template #default="{ row }">{{ row.unit.cert_valid_to || '—' }}</template>
          </el-table-column>
          <el-table-column :label="REALNAME_ENTRY_LABEL" width="90" align="center">
            <template #default="{ row }">
              <span class="ap-status-tag" :class="entryStatusTagClass(row.entry_status)">{{ row.entry_status }}</span>
            </template>
          </el-table-column>
          <el-table-column label="三级教育" width="110" align="center">
            <template #default="{ row }">
              <span
                class="ap-status-tag"
                :class="isSafetyEducationComplete(row.safety_education) ? 'ap-tag-enabled' : 'ap-tag-high'"
              >
                {{ isSafetyEducationComplete(row.safety_education) ? '已完成' : '未完成' }}
              </span>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="90" fixed="right" align="center">
            <template #default="{ row }">
              <el-button link type="primary" size="small" @click="goDetail(row)">详情</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>
  </div>
</template>

<style scoped>
.realname-page { padding: 20px 24px 24px; }
.page-header { margin-bottom: 16px; }
.page-breadcrumb { font-size: 13px; color: var(--ap-text-muted); margin-bottom: 8px; }
.page-heading { display: flex; align-items: center; justify-content: space-between; }
.page-title { font-size: 20px; font-weight: 600; color: var(--ap-text); }
.page-panel { border: 1px solid var(--ap-border); border-radius: 8px; background: #fff; padding: 16px; }
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
.panel-title { font-size: 15px; font-weight: 600; color: var(--ap-text); margin-bottom: 12px; }
.project-tree :deep(.el-tree-node__content) { height: 34px; border-radius: 4px; }
.project-tree :deep(.el-tree-node.is-current > .el-tree-node__content) {
  background: var(--ap-primary-light);
  color: var(--ap-primary);
  font-weight: 600;
}
.panel-head { margin-bottom: 12px; }
.panel-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 12px 20px;
  font-size: 13px;
  color: var(--ap-text-secondary);
}
.filter-bar { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; }
.search-input { width: 300px; }
.list-avatar { background: var(--ap-primary-light); color: var(--ap-primary); font-size: 14px; }
.phone-cell { display: flex; align-items: center; gap: 6px; }
</style>
