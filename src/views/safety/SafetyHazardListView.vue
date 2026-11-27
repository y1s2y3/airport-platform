<script setup>
import InspectionLedgerExport from '../../components/InspectionLedgerExport.vue'
import { exportRectificationDetail, rectificationDetailColumns } from '../../utils/inspectionDetailExport'
import InspectionHazardLedgerFilters from '../../components/hazard/InspectionHazardLedgerFilters.vue'
import InspectionHazardLedgerTable from '../../components/hazard/InspectionHazardLedgerTable.vue'
import { isOverdue, useInspectionHazardLedger } from '../../composables/useInspectionHazardLedger'
import { useClientPagination } from '../../composables/useClientPagination'
import { confirmInspectionVoidDelete } from '../../composables/useInspectionVoidDelete'

import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { Search, View, ArrowLeft } from '@element-plus/icons-vue'
import { useLaborProjectScope, selectedProjectId } from '../../composables/useCurrentProject'
import { HQ_PROJECT_OPTION } from '../../config/projectOptions'
import { inspectionProjectTree } from '../../mock/inspectionDemoData'
import { listInspectionHazards } from '../../mock/inspectionHazardQuery'
import { getMobileRectification } from '../../composables/useMobileRectification'
import { canDeleteInspectionRectification } from '../../utils/inspectionWorkflowIdentity'

const router = useRouter()
const route = useRoute()
const { isHqSelected, treeProjectId, scopeProjectId, onTreeNodeClick: _treeClick } = useLaborProjectScope()
const fromHq = computed(() => route.query.from === 'hq')

// 项目树搜索与选中
const treeSearch = ref('')
const localProjectId = ref('')

function handleTreeNodeClick(data) {
  if (data.id === 'hq') {
    localProjectId.value = ''
    treeProjectId.value = data.id
  } else {
    localProjectId.value = data.id
    _treeClick(data)
  }
}

const treeDataWithCount = computed(() => {
  const root = inspectionProjectTree[0]
  const children = root.children
    .map(node => {
      const count = rectifyData.value.filter(d => d.project_id === node.id && d.status !== '已作废').length
      const label = treeSearch.value
        ? (node.label.includes(treeSearch.value) ? `${node.label}（${count}）` : '')
        : `${node.label}（${count}）`
      return { ...node, label, _visible: !treeSearch.value || node.label.includes(treeSearch.value) }
    })
    .filter(n => n._visible)
  return [{ ...root, label: treeSearch.value ? '搜索结果' : root.label, children }]
})

// 整改单状态：待整改 → 待验收 → 待复查（项目经理审批中）→ 已关闭
const rectifyData = computed(() => listInspectionHazards({ includeVoided: true }))

const scopedRows = computed(() => !isHqSelected.value && scopeProjectId.value
  ? rectifyData.value.filter(row => row.project_id === scopeProjectId.value)
  : rectifyData.value)
const ledger = useInspectionHazardLedger(scopedRows, scopeProjectId)
const { filteredData } = ledger

const hqProjectKeyword = ref('')
const hqProjectStats = computed(() => inspectionProjectTree[0].children.map(project => {
  const rows = rectifyData.value.filter(item => item.project_id === project.id && item.status !== '已作废')
  return {
    project_id: project.id,
    project_name: project.label,
    totalCount: rows.length,
    pendingCount: rows.filter(item => item.status === '待整改').length,
    reviewCount: rows.filter(item => ['待验收'].includes(item.status)).length,
    reviewedCount: rows.filter(item => item.status === '待复查').length,
    closedCount: rows.filter(item => item.status === '已关闭').length,
    overdueCount: rows.filter(item => isOverdue(item)).length,
  }
}))
const filteredHQProjects = computed(() => hqProjectStats.value.filter(item =>
  !hqProjectKeyword.value || item.project_name.includes(hqProjectKeyword.value),
).sort((a, b) => b.totalCount - a.totalCount || b.overdueCount - a.overdueCount))
const { page: hqPage, pageSize: hqPageSize, total: hqProjectTotal, rows: pagedHQProjects } = useClientPagination(filteredHQProjects)
const hqTotalStats = computed(() => ({
  totalCount: filteredHQProjects.value.reduce((sum, item) => sum + item.totalCount, 0),
  pendingCount: filteredHQProjects.value.reduce((sum, item) => sum + item.pendingCount, 0),
  reviewCount: filteredHQProjects.value.reduce((sum, item) => sum + item.reviewCount, 0),
  reviewedCount: filteredHQProjects.value.reduce((sum, item) => sum + item.reviewedCount, 0),
  closedCount: filteredHQProjects.value.reduce((sum, item) => sum + item.closedCount, 0),
  overdueCount: filteredHQProjects.value.reduce((sum, item) => sum + item.overdueCount, 0),
}))

const treeData = computed(() => inspectionProjectTree)

const exportRows = computed(() => {
  const visibleProjects = new Set(filteredHQProjects.value.map(row => row.project_id))
  return isHqSelected.value ? rectifyData.value.filter(row => visibleProjects.has(row.project_id)) : filteredData.value
})

function viewDetail(row) { router.push(`/safety-inspection/hazard/${row.id}`) }
function canDelete(row) {
  return row.status === '已作废' && canDeleteInspectionRectification(getMobileRectification(row.id))
}

function viewProjectDetail(row) {
  router.push({ path:'/safety-inspection/hazard', query:{ from:'hq' } }).then(() => {
    selectedProjectId.value = row.project_id
  })
}
function goBackToHQ() {
  selectedProjectId.value = HQ_PROJECT_OPTION.id
  router.push('/safety-inspection/hazard')
}
</script>

<template>
  <div class="hazard-page">
    <div class="page-head">
      <h3 class="page-title">隐患清单</h3>
      <div class="page-actions">
        <span class="total-count">共 {{ exportRows.length }} 条</span>
        <InspectionLedgerExport name="隐患清单台账" :rows="exportRows" :columns="rectificationDetailColumns" :to-detail="exportRectificationDetail" font-family="宋体" />
      </div>
    </div>

    <template v-if="isHqSelected">
      <div class="hq-dashboard">
        <div class="stat-cards">
          <div class="stat-card"><div class="sc-value">{{ hqTotalStats.totalCount }}</div><div class="sc-label">隐患总数</div></div>
          <div class="stat-card"><div class="sc-value text-warn">{{ hqTotalStats.pendingCount }}</div><div class="sc-label">待整改</div></div>
          <div class="stat-card"><div class="sc-value text-info">{{ hqTotalStats.reviewCount }}</div><div class="sc-label">待验收</div></div>
          <div class="stat-card"><div class="sc-value text-reviewed">{{ hqTotalStats.reviewedCount }}</div><div class="sc-label">待复查</div></div>
          <div class="stat-card"><div class="sc-value text-success">{{ hqTotalStats.closedCount }}</div><div class="sc-label">已关闭</div></div>
          <div class="stat-card"><div class="sc-value text-danger">{{ hqTotalStats.overdueCount }}</div><div class="sc-label">逾期隐患</div></div>
        </div>
        <div class="hq-filter-bar">
          <el-input v-model="hqProjectKeyword" placeholder="搜索项目名称..." clearable style="width:240px" :prefix-icon="Search" />
        </div>
        <el-table :data="pagedHQProjects" row-key="project_id" border stripe style="width:100%;margin-top:12px" class="hq-table">
          <el-table-column type="index" :index="index => (hqPage - 1) * hqPageSize + index + 1" label="序号" width="55" align="center" />
          <el-table-column prop="project_name" label="项目名称" min-width="180" />
          <el-table-column prop="totalCount" label="隐患数量" align="center" />
          <el-table-column prop="pendingCount" label="待整改数量" align="center" />
          <el-table-column prop="reviewCount" label="待验收数量" align="center" />
          <el-table-column prop="reviewedCount" label="待复查数量" align="center" />
          <el-table-column prop="closedCount" label="已关闭数量" align="center" />
          <el-table-column label="逾期数量" align="center">
            <template #default="{ row }"><span :class="{ 'overdue-count': row.overdueCount > 0 }">{{ row.overdueCount }}</span></template>
          </el-table-column>
          <el-table-column label="操作" width="110" align="center">
            <template #default="{ row }"><el-button link type="primary" :icon="View" @click="viewProjectDetail(row)">查看详情</el-button></template>
          </el-table-column>
        </el-table>
        <el-pagination
          v-model:current-page="hqPage"
          v-model:page-size="hqPageSize"
          :total="hqProjectTotal"
          :page-sizes="[10, 20, 50]"
          layout="total, sizes, prev, pager, next"
          class="ledger-pagination"
        />
      </div>
    </template>

    <template v-else>
      <div v-if="fromHq" class="back-bar">
        <el-button link type="primary" :icon="ArrowLeft" @click="goBackToHQ">返回</el-button>
        <span>当前项目隐患台账</span>
      </div>
      <div class="page-panel">
        <InspectionHazardLedgerFilters :ledger="ledger" />
        <InspectionHazardLedgerTable :rows="filteredData" @view="viewDetail">
          <template #actions="{ row }">
            <el-button v-if="canDelete(row)" link type="danger" size="small" @click="confirmInspectionVoidDelete(row)">删除</el-button>
          </template>
        </InspectionHazardLedgerTable>
      </div>
    </template>
  </div>
</template>

<style scoped>
/* 表格右侧不再保留滚动条占位列（避免出现空白列） */
:deep(.el-table__cell.gutter),
:deep(.el-table colgroup col:last-child) {
  display: none !important;
  width: 0 !important;
}

.hazard-page { padding:0; }
.page-head { display:flex; align-items:center; justify-content:space-between; margin-bottom:16px; }
.page-actions { display:flex; align-items:center; gap:12px; }
.page-title { font-size:18px; font-weight:600; color:#1f2329; margin:0; }
.total-count { font-size:12px; color:#999; }
.el-table { font-size:13px; }
.hq-dashboard { background:#f5f7fa; border-radius:10px; padding:20px; }
.stat-cards { display:flex; gap:14px; margin-bottom:16px; }
.stat-card { flex:1; background:#fff; border-radius:8px; padding:16px 20px; box-shadow:0 1px 4px rgba(0,0,0,.06); text-align:center; }
.sc-value { font-size:26px; font-weight:700; color:#1f2329; }
.sc-label { margin-top:4px; font-size:12px; color:#999; }
.text-warn { color:#f5a623; }
.text-info { color:#4285f4; }
.text-reviewed { color:#8f0045; }
.text-success { color:#34a853; }
.text-danger { color:#e53935; }
.overdue-count { color:#e53935; font-weight:600; }
.hq-filter-bar { display:flex; justify-content:flex-end; }
.ledger-pagination { justify-content:flex-end; margin-top:16px; }
.back-bar { display:flex; align-items:center; gap:10px; margin-bottom:12px; padding:8px 12px; background:#f5f7fa; border-radius:6px; font-size:14px; font-weight:600; }

/* 左树右表布局 */
.page-layout { display:flex; gap:0; width:100%; }
.page-panel { flex:1; min-width:0; }
.project-tree-panel { width:220px; flex-shrink:0; margin-right:20px; }
.panel-title { font-size:13px; font-weight:600; color:#1f2329; margin-bottom:10px; padding-left:8px; border-left:3px solid #8f0045; }
.project-tree { font-size:13px; }
.project-tree :deep(.el-tree-node__content) { height:36px; }
.project-tree :deep(.el-tree-node.is-current > .el-tree-node__content) { background:#fceef4; color:#8f0045; font-weight:600; }
</style>
