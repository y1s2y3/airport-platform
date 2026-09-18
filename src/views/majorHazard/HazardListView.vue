<script setup>
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowRight, Search, Refresh } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useCurrentProject } from '../../composables/useCurrentProject.js'
import {
  buildLedgerRows,
  ensureMajorHazardData,
  getLedgerEndDate,
  getLedgerStartDate,
  getLedgerStatus,
  getMajorHazardData,
  removeLedger,
} from '../../utils/majorHazardManualStorage.js'

const router = useRouter()
const { selectedProjectId, headerProjectLabel, isHqSelected } = useCurrentProject()
const projectId = computed(() => (isHqSelected.value ? '' : selectedProjectId.value))
const data = ref({ ledgers: [], identifications: [], controlPoints: [], wbsNodes: [] })
const dateRange = ref([])
const categoryId = ref('')
const keyword = ref('')
const page = ref(1)
const pageSize = ref(10)
const controlPointDialogVisible = ref(false)
const selectedLedger = ref(null)
const tableRef = ref(null)
const expandedSourceIds = ref([])

const allRows = computed(() => buildLedgerRows(data.value))
const categoryOptions = computed(() => {
  const map = new Map()
  allRows.value.forEach((row) => map.set(row.categoryId, row.categoryName))
  return [...map].map(([id, name]) => ({ id, name }))
})
const ledgerRows = computed(() => allRows.value.filter((row) => {
  const q = keyword.value.trim()
  if (categoryId.value && row.categoryId !== categoryId.value) return false
  if (q && ![row.name, row.categoryName, row.overview, row.subcontractor, partNames(row)].some((value) => String(value || '').includes(q))) return false
  if (dateRange.value?.length === 2) {
    const start = getLedgerStartDate(row) || row.source?.plannedStart || ''
    const end = getLedgerEndDate(row) || row.source?.plannedEnd || start
    if (start && start > dateRange.value[1]) return false
    if (end && end < dateRange.value[0]) return false
  }
  return true
}))
const pagedRows = computed(() => {
  const start = (page.value - 1) * pageSize.value
  return ledgerRows.value.slice(start, start + pageSize.value)
})
const selectedControlPointRows = computed(() => selectedLedger.value ? aggregateControlPointRows(selectedLedger.value) : [])

function load() {
  if (!projectId.value) {
    data.value = { ledgers: [], identifications: [], controlPoints: [], wbsNodes: [] }
    return
  }
  ensureMajorHazardData(projectId.value)
  data.value = getMajorHazardData(projectId.value)
}
function state(row) { return getLedgerStatus(row) }
function tagType(status) { return status === '完工' ? 'success' : status === '在施' ? 'primary' : 'info' }
function partStart(row) { return getLedgerStartDate(row) || '—' }
function partEnd(row) { return getLedgerEndDate(row) || '—' }
function plannedTime(row) { return `${row.source?.plannedStart || '—'} 至 ${row.source?.plannedEnd || '—'}` }
function constructionTime(row) { return `${partStart(row)} 至 ${partEnd(row)}` }
function partNames(row) { return (row.parts || []).map((part) => part.wbsPath || part.name).filter(Boolean).join('；') || '—' }
function partStatus(part) {
  if (part.process?.acceptance?.status === '已完成' && part.process?.acceptance?.result === '合格') return '完工'
  return part.startDate ? '在施' : '未开工'
}
function isPartExpanded(row) { return expandedSourceIds.value.includes(row.sourceId) }
function togglePartExpand(row) {
  const expanded = !isPartExpanded(row)
  expandedSourceIds.value = expanded
    ? [...expandedSourceIds.value, row.sourceId]
    : expandedSourceIds.value.filter((id) => id !== row.sourceId)
  tableRef.value?.toggleRowExpansion(row, expanded)
}
function partProgressPercent(part) {
  const node = part.process?.progress || {}
  const latest = [...(node.records || [])].reverse().find((record) => record.executionRate !== '' && record.executionRate !== undefined && record.executionRate !== null)
  const rawValue = latest?.executionRate ?? node.executionRate
  if (rawValue === '' || rawValue === undefined || rawValue === null) return node.status === '已完成' ? 100 : 0
  return Math.min(100, Math.max(0, Number(rawValue) || 0))
}
function progressText(row) {
  return (row.parts || []).length ? '平均进度' : '未开始'
}
function progressPercent(row) {
  const parts = row.parts || []
  if (!parts.length) return 0
  return Math.round(parts.reduce((sum, part) => sum + partProgressPercent(part), 0) / parts.length)
}
function aggregateControlPointRows(row) {
  const definitions = row.controlPoints || []
  return (row.parts || []).flatMap((part) => definitions.map((point) => {
    const latest = [...(part.process?.controlPoints?.records || [])].reverse().find((record) => record.controlPointId === point.id)
    const handlingStatus = latest?.displayStatus === 'green' || latest?.status === '已落实'
      ? '已落实'
      : latest?.displayStatus === 'red' || latest?.status === '需整改'
      ? '需整改'
      : '未确认'
    return {
      ...point,
      partId: part.id,
      partName: part.wbsPath || part.name || '—',
      handlingStatus,
    }
  }))
}
function implementedPointCount(row) {
  return aggregateControlPointRows(row).filter((point) => point.handlingStatus === '已落实').length
}
function totalPointCount(row) {
  return aggregateControlPointRows(row).length
}
function controlPointPercent(row) {
  const total = totalPointCount(row)
  return total ? Math.round(implementedPointCount(row) / total * 100) : 0
}
function openControlPoints(row) {
  selectedLedger.value = row
  controlPointDialogVisible.value = true
}
function openLedger(row, mode = 'edit') {
  router.push({
    name: 'MajorHazardListDetail',
    params: { sourceId: row.sourceId },
    query: mode === 'edit' ? {} : { mode },
  })
}
function deleteLedger(row) {
  if (state(row) !== '未开工') {
    ElMessage.warning('仅施工状态为“未开工”的危大工程可删除')
    return
  }
  ElMessageBox.confirm(`确定删除危大工程“${row.name}”？危大日历将同步删除。`, '删除确认', { type: 'warning' })
    .then(() => {
      removeLedger(projectId.value, row)
      load()
      ElMessage.success('删除成功')
    })
    .catch(() => {})
}
function search() { page.value = 1 }
function reset() {
  dateRange.value = []
  categoryId.value = ''
  keyword.value = ''
  page.value = 1
}

watch(projectId, load, { immediate: true })
</script>

<template>
  <div class="ledger-page page-card">
    <template v-if="projectId">
      <div class="page-header">
        <div class="page-breadcrumb">施工现场管理 / 危大工程管理 / 危大清单</div>
        <div class="header-row">
          <div><h1 class="page-title">危大工程台账</h1><p class="page-scope">集中查看项目危大工程、施工部位、进度及安全管控状态</p></div>
          <div class="project-chip"><span>当前项目</span><strong>{{ headerProjectLabel }}</strong></div>
        </div>
      </div>

      <div class="filter-bar">
        <div class="filter-item"><label>施工时间</label><el-date-picker v-model="dateRange" type="daterange" value-format="YYYY-MM-DD" start-placeholder="开始日期" end-placeholder="结束日期" range-separator="至" class="date-filter" /></div>
        <div class="filter-item"><label>危大工程类别</label><el-select v-model="categoryId" clearable placeholder="全部类别" class="category-filter"><el-option v-for="item in categoryOptions" :key="item.id" :label="item.name" :value="item.id" /></el-select></div>
        <div class="filter-item keyword-item"><label>危大工程</label><el-input v-model="keyword" clearable placeholder="输入工程名称、类别描述或施工部位" class="keyword-filter" @keyup.enter="search" /></div>
        <div class="filter-actions"><el-button type="primary" :icon="Search" @click="search">查询</el-button><el-button :icon="Refresh" @click="reset">重置</el-button></div>
      </div>

      <section class="ledger-panel">
        <div class="panel-head">
          <div><h2>危大工程台账</h2><p>共 {{ ledgerRows.length }} 条数据，当前展示 {{ pagedRows.length }} 条</p></div>
          <div class="legend"><span><i class="dot ongoing-dot"></i>在施</span><span><i class="dot pending-dot"></i>未开工</span><span><i class="dot completed-dot"></i>完工</span></div>
        </div>
      <el-table ref="tableRef" :data="pagedRows" row-key="sourceId" border class="ledger-table" empty-text="暂无审批通过的危大工程辨识数据">
        <el-table-column type="expand" width="1" class-name="expand-hidden-cell">
          <template #default="{ row }">
            <div class="part-expand-wrap">
              <div v-if="row.parts?.length" class="part-detail-head"><span>施工部位明细</span><small>共 {{ row.parts.length }} 个施工部位</small></div>
              <el-table v-if="row.parts?.length" :data="row.parts" border class="part-expand-table">
                <el-table-column type="index" label="序号" width="56" />
                <el-table-column label="施工部位" min-width="260" show-overflow-tooltip>
                  <template #default="{ row: part }">{{ part.wbsPath || part.name || '—' }}</template>
                </el-table-column>
                <el-table-column label="安全管控责任人" width="150">
                  <template #default="{ row: part }">{{ part.safetyResponsible || '—' }}</template>
                </el-table-column>
                <el-table-column label="开工时间" width="120">
                  <template #default="{ row: part }">{{ part.startDate || '—' }}</template>
                </el-table-column>
                <el-table-column label="计划完工时间" width="140">
                  <template #default="{ row: part }">{{ part.plannedEndDate || '—' }}</template>
                </el-table-column>
                <el-table-column label="施工进度" width="120">
                  <template #default="{ row: part }"><div class="part-progress"><span>{{ partProgressPercent(part) }}%</span><el-progress :percentage="partProgressPercent(part)" :show-text="false" :stroke-width="5" /></div></template>
                </el-table-column>
                <el-table-column label="管控要点" width="105">
                  <template #default="{ row: part }">{{ aggregateControlPointRows(row).filter((item) => item.partId === part.id && item.handlingStatus === '已落实').length }}/{{ aggregateControlPointRows(row).filter((item) => item.partId === part.id).length }}</template>
                </el-table-column>
                <el-table-column label="施工情况" width="110">
                  <template #default="{ row: part }">
                    <el-tag size="small" :type="tagType(partStatus(part))">{{ partStatus(part) }}</el-tag>
                  </template>
                </el-table-column>
              </el-table>
              <el-empty v-else :image-size="60" description="该危大工程暂无施工部位" />
            </div>
          </template>
        </el-table-column>
        <el-table-column label="危大工程类别" width="155">
          <template #default="{ row }">
            <div class="category-cell"><div class="hazard-main-text" :title="row.categoryName">{{ row.categoryName || '—' }}</div><el-tag v-if="row.isSuperMajor === '是'" size="small" type="danger" effect="plain">超危</el-tag></div>
            <div class="hazard-sub-text two-line" :title="row.description">{{ row.description || '—' }}</div>
          </template>
        </el-table-column>
        <el-table-column label="危大工程名称" width="170">
          <template #default="{ row }">
            <div class="hazard-main-text" :title="row.name">{{ row.name || '—' }}</div>
            <div class="hazard-sub-text">{{ row.source?.identifiedBy || row.identifiedBy || '—' }}识别于：{{ row.source?.identifiedAt || row.identifiedAt || '—' }}</div>
          </template>
        </el-table-column>
        <el-table-column label="施工部位" width="195">
          <template #default="{ row }">
            <div class="part-cell">
              <button v-if="row.parts?.length" type="button" class="part-expand-toggle" :class="{ expanded: isPartExpanded(row) }" :title="isPartExpanded(row) ? '收起施工部位' : '展开施工部位'" @click.stop="togglePartExpand(row)"><el-icon><ArrowRight /></el-icon></button>
              <div class="part-info"><span class="part-cell-names" :title="partNames(row)">{{ partNames(row) }}</span><small>{{ row.parts?.length || 0 }} 个施工部位</small></div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="计划时间" width="105"><template #default="{ row }"><div class="time-cell"><span>{{ row.source?.plannedStart || '—' }}</span><small>至</small><span>{{ row.source?.plannedEnd || '—' }}</span></div></template></el-table-column>
        <el-table-column label="施工时间" width="105"><template #default="{ row }"><div class="time-cell"><span>{{ partStart(row) }}</span><small>至</small><span>{{ partEnd(row) }}</span></div></template></el-table-column>
        <el-table-column prop="subcontractor" label="分包单位" width="135"><template #default="{ row }"><div class="unit-cell"><span>{{ row.subcontractor || '—' }}</span><small>责任人：{{ row.responsible || '—' }}</small></div></template></el-table-column>
        <el-table-column label="施工进度" width="105"><template #default="{ row }"><div class="progress-cell"><div><span>{{ progressText(row) }}</span><b>{{ progressPercent(row) }}%</b></div><el-progress :percentage="progressPercent(row)" :show-text="false" :stroke-width="6" /></div></template></el-table-column>
        <el-table-column label="安全状态" width="100"><template #default="{ row }"><button class="control-rate" type="button" @click="openControlPoints(row)"><strong>{{ implementedPointCount(row) }}/{{ totalPointCount(row) }}</strong><small>管控要点</small></button></template></el-table-column>
        <el-table-column label="施工情况" width="78"><template #default="{ row }"><el-tag size="small" :type="tagType(state(row))">{{ state(row) }}</el-tag></template></el-table-column>
        <el-table-column label="操作" width="125">
          <template #default="{ row }">
            <div class="row-actions"><el-button link type="primary" @click="openLedger(row, 'view')">查看</el-button><el-button v-if="state(row) !== '完工'" link type="primary" @click="openLedger(row)">编辑</el-button><el-button class="control-action" link type="primary" @click="openLedger(row, 'control')">过程管控</el-button><el-button v-if="state(row) === '未开工'" link type="danger" @click="deleteLedger(row)">删除</el-button></div>
          </template>
        </el-table-column>
      </el-table>
      <div class="pagination-row">
        <el-pagination v-model:current-page="page" v-model:page-size="pageSize" :total="ledgerRows.length" :page-sizes="[10, 20, 50]" layout="total, sizes, prev, pager, next, jumper" />
      </div>
      </section>

      <el-dialog v-model="controlPointDialogVisible" :title="`${selectedLedger?.name || '危大工程'}—管控要点`" width="1080px" destroy-on-close>
        <el-table :data="selectedControlPointRows" border stripe max-height="480" empty-text="暂无管控要点">
          <el-table-column type="index" label="序号" width="58" />
          <el-table-column prop="partName" label="施工部位" min-width="220" show-overflow-tooltip />
          <el-table-column prop="content" label="管控内容" min-width="330" />
          <el-table-column label="显示状态（红）" width="150"><template #default="{ row }"><el-tag type="danger">{{ row.redStatusText || '未落实' }}</el-tag></template></el-table-column>
          <el-table-column label="显示状态（绿）" width="150"><template #default="{ row }"><el-tag type="success">{{ row.greenStatusText || '已落实' }}</el-tag></template></el-table-column>
          <el-table-column label="落实状态" width="110"><template #default="{ row }"><el-tag size="small" :type="row.handlingStatus === '已落实' ? 'success' : row.handlingStatus === '需整改' ? 'danger' : 'info'">{{ row.handlingStatus || '未确认' }}</el-tag></template></el-table-column>
        </el-table>
        <template #footer><el-button type="primary" @click="controlPointDialogVisible = false">关闭</el-button></template>
      </el-dialog>
    </template>
    <el-empty v-else description="危大清单仅支持项目级使用，请切换至具体项目。" />
  </div>
</template>

<style scoped>
.ledger-page{min-height:100%;padding:20px 22px 34px;border:0;border-radius:0;background:#f5f7fa}
.page-header{margin-bottom:18px}
.page-breadcrumb{margin:0 0 11px;color:#98a2b3;font-size:13px}
.header-row{display:flex;align-items:flex-end;justify-content:space-between;gap:20px}
.page-title{margin:0 0 7px;color:#172033;font-size:23px;font-weight:650;letter-spacing:.2px}
.page-scope{margin:0;color:#667085;font-size:13px}
.project-chip{display:flex;align-items:center;gap:10px;padding:9px 13px;border:1px solid #e5e9f0;border-radius:7px;background:#fff;color:#98a2b3;font-size:12px}
.project-chip strong{color:#344054;font-size:13px;font-weight:600}
.filter-bar{display:flex;align-items:flex-end;gap:14px;margin-bottom:15px;padding:15px 17px;border:1px solid #e5e9f0;border-radius:9px;background:#fff;box-shadow:0 2px 7px rgba(31,41,55,.025)}
.filter-item{display:flex;flex:0 0 auto;flex-direction:column;gap:7px}.filter-item label{color:#667085;font-size:12px;font-weight:500}.keyword-item{flex:1;min-width:240px}.filter-actions{display:flex;gap:8px;padding-bottom:1px}.filter-actions :deep(.el-button+.el-button){margin-left:0}
.date-filter{width:270px}.category-filter{width:190px}.keyword-filter{width:100%}
.ledger-panel{padding:18px 20px 16px;border:1px solid #e5e9f0;border-radius:10px;background:#fff;box-shadow:0 2px 8px rgba(31,41,55,.025)}
.panel-head{display:flex;align-items:center;justify-content:space-between;gap:18px;margin-bottom:14px}
.panel-head h2{margin:0 0 5px;color:#273142;font-size:16px;font-weight:650}.panel-head p{margin:0;color:#98a2b3;font-size:12px}
.legend{display:flex;align-items:center;gap:16px;color:#667085;font-size:12px}.legend span{display:flex;align-items:center;gap:6px}.dot{width:7px;height:7px;border-radius:50%}.ongoing-dot{background:#2563eb}.pending-dot{background:#94a3b8}.completed-dot{background:#16a34a}
.ledger-table{overflow:hidden;border-radius:7px}
.ledger-table :deep(.el-table__header th){height:46px;background:#f1f3f6!important;color:#475467;font-size:13px;font-weight:600}
.ledger-table :deep(.el-table__row td){padding-top:12px;padding-bottom:12px}.ledger-table :deep(.el-table__row:hover>td){background:#faf7f9!important}
.category-cell{display:flex;align-items:center;gap:7px;min-width:0}.hazard-main-text{overflow:hidden;color:#273142;font-weight:600;text-overflow:ellipsis;white-space:nowrap}
.hazard-sub-text{overflow:hidden;margin-top:5px;color:#98a2b3;font-size:12px;line-height:1.5;text-overflow:ellipsis;white-space:nowrap}.hazard-sub-text.two-line{display:-webkit-box;white-space:normal;-webkit-box-orient:vertical;-webkit-line-clamp:2}
.part-cell{display:flex;align-items:center;gap:10px;width:100%}.part-info{min-width:0;flex:1}.part-cell-names{display:block;overflow:hidden;color:#475467;text-overflow:ellipsis;white-space:nowrap}.part-info small{display:block;margin-top:5px;color:#98a2b3;font-size:11px}
.part-expand-toggle{display:inline-flex;align-items:center;justify-content:center;flex:0 0 24px;width:24px;height:24px;padding:0;border:1px solid #d9dee7;border-radius:5px;background:#fff;color:#667085;cursor:pointer;transition:.2s ease}
.part-expand-toggle:hover{border-color:var(--ap-primary,#8f0045);color:var(--ap-primary,#8f0045);background:#faf2f6}.part-expand-toggle .el-icon{transition:transform .2s ease}.part-expand-toggle.expanded .el-icon{transform:rotate(90deg)}
.time-cell{display:flex;align-items:flex-start;flex-direction:column;gap:2px;color:#475467;font-size:12px;line-height:1.35;white-space:nowrap}.time-cell small{color:#b0b7c3;font-size:10px}
.unit-cell span{display:-webkit-box;overflow:hidden;color:#475467;line-height:1.45;-webkit-box-orient:vertical;-webkit-line-clamp:2}.unit-cell small{display:block;margin-top:6px;color:#98a2b3;font-size:11px}
.progress-cell>div{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:7px;color:#667085;font-size:12px}.progress-cell b{color:#344054;font-size:12px}.progress-cell :deep(.el-progress-bar__outer){background:#edf0f4}
.part-progress{display:flex;align-items:center;gap:8px}.part-progress>span{width:34px;color:#475467;font-size:12px}.part-progress :deep(.el-progress){flex:1}
.control-rate{display:block;width:100%;padding:0;border:0;background:transparent;text-align:left;cursor:pointer}.control-rate strong{display:block;margin-bottom:3px;color:var(--ap-primary,#8f0045);font-size:16px}.control-rate small{display:block;margin-bottom:7px;color:#98a2b3;font-size:11px}.control-rate:hover strong{text-decoration:underline}
.row-actions{display:flex;align-items:center;flex-wrap:wrap;gap:2px 10px}.row-actions :deep(.el-button+.el-button){margin-left:0}.control-action{font-weight:600}
.pagination-row{display:flex;justify-content:flex-end;margin-top:17px}.part-expand-wrap{padding:15px 18px 18px;background:#f7f9fc}.part-detail-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;color:#344054}.part-detail-head span{font-size:13px;font-weight:600}.part-detail-head small{color:#98a2b3;font-size:12px}.part-expand-table{width:100%;overflow:hidden;border-radius:6px;background:#fff}
.ledger-table :deep(.expand-hidden-cell){padding:0!important;border-right:0}.ledger-table :deep(.expand-hidden-cell .cell){width:0;padding:0;overflow:hidden}.ledger-table :deep(.expand-hidden-cell .el-table__expand-icon){display:none}
@media(max-width:1280px){.filter-bar{align-items:stretch;flex-wrap:wrap}.filter-actions{align-items:flex-end}.keyword-item{min-width:320px}}
@media(max-width:850px){.ledger-page{padding-right:14px;padding-left:14px}.header-row{align-items:flex-start;flex-direction:column}.project-chip{width:100%;box-sizing:border-box}.filter-item,.keyword-item{width:100%;min-width:0}.date-filter,.category-filter,.keyword-filter{width:100%}.filter-actions{width:100%}.panel-head{align-items:flex-start;flex-direction:column}.legend{flex-wrap:wrap}}
</style>
