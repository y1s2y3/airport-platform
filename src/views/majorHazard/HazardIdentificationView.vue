<script setup>
import { computed, ref, watch } from 'vue'
import { Delete, Edit, Plus, Refresh, Upload } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useRouter } from 'vue-router'
import { useCurrentProject } from '../../composables/useCurrentProject.js'
import {
  ensureMajorHazardData,
  flattenCategories,
  getControlPointsForDescription,
  getIdentificationItems,
  getMajorHazardData,
  removeIdentification,
} from '../../utils/majorHazardManualStorage.js'

const router = useRouter()
const { selectedProjectId, headerProjectLabel, isHqSelected } = useCurrentProject()
const projectId = computed(() => (isHqSelected.value ? '' : selectedProjectId.value))
const data = ref({ controlPoints: [], identifications: [] })
const activeTab = ref('records')
const pointDialogVisible = ref(false)
const pointDialogRows = ref([])
const pointDialogName = ref('')
// 台账查询条件：危大工程类别 / 辨识时间范围 / 审批状态
const APPROVAL_STATUS_OPTIONS = ['草稿', '审批中', '已通过', '已驳回']
const filterCategory = ref('')
const filterStatus = ref('')
const filterDateRange = ref([])

const records = computed(() => (data.value.identifications || []).map((record) => ({
  ...record,
  identifiedCount: (record.items || []).filter((item) => item.conclusion === '√').length,
  superCount: (record.items || []).filter((item) => item.conclusion === '√' && item.isSuperMajor === '是').length,
})))
const categoryOptions = computed(() => {
  const fromDictionary = flattenCategories(data.value.categories || []).map((item) => item.name)
  const names = fromDictionary.length ? fromDictionary : (data.value.identifications || []).map((item) => item.categoryName)
  return [...new Set(names.filter(Boolean))]
})
const filteredRecords = computed(() => records.value.filter((row) => {
  if (filterCategory.value && row.categoryName !== filterCategory.value) return false
  if (filterStatus.value && row.approvalStatus !== filterStatus.value) return false
  const [start, end] = filterDateRange.value || []
  const date = String(row.identifiedAt || '').slice(0, 10)
  if (start && date && date < start) return false
  if (end && date && date > end) return false
  return true
}))
function resetFilters() {
  filterCategory.value = ''
  filterStatus.value = ''
  filterDateRange.value = []
}
const summaryRows = computed(() => getIdentificationItems(data.value).map((item) => ({ ...item, pointCount: pointsOf(item.id, item.categoryId).length })))

function load() {
  if (!projectId.value) { data.value = { controlPoints: [], identifications: [] }; return }
  ensureMajorHazardData(projectId.value)
  data.value = getMajorHazardData(projectId.value)
}
function openForm(row) {
  router.push(row ? `/major-hazard/identification/${row.id}` : '/major-hazard/identification/create')
}
function remove(row) {
  ElMessageBox.confirm('确定删除该危大工程辨识记录？', '删除确认', { type: 'warning' })
    .then(() => { removeIdentification(projectId.value, row.id); load(); ElMessage.success('删除成功') })
    .catch(() => {})
}
function pointsOf(descriptionId, categoryId) { return getControlPointsForDescription(data.value, { id: descriptionId, categoryId }) }
function openPointDialog(row) {
  pointDialogName.value = row.description || '类别描述'
  pointDialogRows.value = pointsOf(row.id, row.categoryId)
  pointDialogVisible.value = true
}
function tagType(status) { return status === '已通过' ? 'success' : status === '已驳回' ? 'danger' : status === '审批中' ? 'warning' : 'info' }
function exportSummary() {
  const header = ['工程类别', '类别描述', '是否超危', '辨识结论', '管控要点数量', '计划施工起止时间', '审批状态']
  const lines = summaryRows.value.map((item) => [item.categoryName, item.description, item.isSuperMajor, item.conclusion, item.pointCount, `${item.plannedStart || ''} 至 ${item.plannedEnd || ''}`, item.approvalStatus].map((value) => `"${String(value || '').replaceAll('"', '""')}"`).join(','))
  const blob = new Blob([`\uFEFF${header.join(',')}\n${lines.join('\n')}`], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = '危大工程清单汇总.csv'; anchor.click(); URL.revokeObjectURL(url)
}

watch(projectId, load, { immediate: true })
</script>

<template>
  <div class="identification-page page-card">
    <template v-if="projectId">
      <div class="page-header"><div class="page-breadcrumb">施工现场管理 / 危大工程管理 / 危大辨识</div><h1 class="page-title">危大辨识</h1><p class="page-scope">当前项目：{{ headerProjectLabel }}</p><p class="page-tip">对危大字典中的类别描述逐项辨识。提交后由个人中心办理审批；审批通过且结论为“√”的数据自动同步至危大清单和危大工程日历。</p></div>
      <el-tabs v-model="activeTab">
        <el-tab-pane label="危大工程清单辨识记录" name="records">
          <div class="toolbar"><span class="toolbar-tip">新增、查看和编辑均在独立页面完成；已驳回记录可重新编辑。</span><el-button type="primary" :icon="Plus" @click="openForm()">新增</el-button></div>
          <div class="filter-bar">
            <div class="filter-item"><label>危大工程类别</label><el-select v-model="filterCategory" clearable filterable placeholder="全部类别" style="width:220px"><el-option v-for="name in categoryOptions" :key="name" :label="name" :value="name" /></el-select></div>
            <div class="filter-item"><label>辨识时间</label><el-date-picker v-model="filterDateRange" type="daterange" value-format="YYYY-MM-DD" start-placeholder="开始日期" end-placeholder="结束日期" range-separator="至" style="width:260px" /></div>
            <div class="filter-item"><label>审批状态</label><el-select v-model="filterStatus" clearable placeholder="全部状态" style="width:160px"><el-option v-for="status in APPROVAL_STATUS_OPTIONS" :key="status" :label="status" :value="status" /></el-select></div>
            <el-button :icon="Refresh" @click="resetFilters">重置</el-button>
            <span class="filter-count">共 {{ filteredRecords.length }} 条</span>
          </div>
          <el-table :data="filteredRecords" border stripe empty-text="暂无危大工程清单辨识记录">
            <el-table-column type="index" label="序号" width="56" /><el-table-column prop="categoryName" label="危大工程类别" min-width="180" /><el-table-column prop="identifiedCount" label="已辨识危大工程数量" width="160" /><el-table-column prop="superCount" label="已辨识超危工程数量" width="160" /><el-table-column prop="identifiedBy" label="辨识人" width="120" /><el-table-column prop="identifiedAt" label="辨识时间" width="120" /><el-table-column label="审批状态" width="110"><template #default="{ row }"><el-tag size="small" :type="tagType(row.approvalStatus)">{{ row.approvalStatus }}</el-tag></template></el-table-column>
            <el-table-column label="操作" width="160" fixed="right"><template #default="{ row }"><el-button link type="primary" @click="openForm(row)">查看</el-button><el-button v-if="['草稿','已驳回'].includes(row.approvalStatus)" link type="primary" :icon="Edit" @click="openForm(row)">编辑</el-button><el-button v-if="['草稿','已驳回'].includes(row.approvalStatus)" link type="danger" :icon="Delete" @click="remove(row)">删除</el-button></template></el-table-column>
          </el-table>
        </el-tab-pane>
        <el-tab-pane label="危大工程清单汇总" name="summary">
          <div class="toolbar"><span class="toolbar-tip">汇总全部已辨识的危大工程明细；审批通过且结论为“√”的数据纳入危大清单。</span><el-button :icon="Upload" @click="exportSummary">导出</el-button></div>
          <el-table :data="summaryRows" border stripe empty-text="暂无已辨识危大工程"><el-table-column type="index" label="序号" width="56" /><el-table-column prop="categoryName" label="工程类别" width="150" /><el-table-column prop="description" label="类别描述" min-width="290" show-overflow-tooltip /><el-table-column prop="isSuperMajor" label="是否超危" width="100" /><el-table-column label="辨识结论" width="100"><template #default="{ row }"><el-tag type="success" size="small">{{ row.conclusion }}</el-tag></template></el-table-column><el-table-column label="管控要点" width="100" align="center"><template #default="{ row }"><el-button link type="primary" @click="openPointDialog(row)">{{ row.pointCount }}</el-button></template></el-table-column><el-table-column label="计划施工起止时间" label-class-name="plan-date-header" width="205"><template #default="{ row }"><span class="plan-date-text">{{ row.plannedStart }} 至 {{ row.plannedEnd }}</span></template></el-table-column><el-table-column prop="approvalStatus" label="审批状态" width="105"><template #default="{ row }"><el-tag size="small" :type="tagType(row.approvalStatus)">{{ row.approvalStatus }}</el-tag></template></el-table-column></el-table>
        </el-tab-pane>
      </el-tabs>
      <el-dialog v-model="pointDialogVisible" :title="`${pointDialogName} · 管控要点`" width="980px" destroy-on-close>
        <el-table :data="pointDialogRows" border stripe size="small" empty-text="暂无管控要点">
          <el-table-column type="index" label="序号" width="56" />
          <el-table-column prop="content" label="管控内容" min-width="360" />
          <el-table-column label="显示状态（红）" width="150"><template #default="{ row }"><el-tag type="danger">{{ row.redStatusText || '未落实' }}</el-tag></template></el-table-column>
          <el-table-column label="显示状态（绿）" width="150"><template #default="{ row }"><el-tag type="success">{{ row.greenStatusText || '已落实' }}</el-tag></template></el-table-column>
        </el-table>
        <template #footer><el-button type="primary" @click="pointDialogVisible = false">关闭</el-button></template>
      </el-dialog>
    </template>
    <el-empty v-else description="危大辨识仅支持项目级使用，请切换至具体项目。" />
  </div>
</template>

<style scoped>
.identification-page{padding:20px 24px 32px}.page-header{margin-bottom:16px}.page-breadcrumb,.page-scope,.page-tip{font-size:13px;color:var(--ap-text-muted);margin:0 0 7px}.page-title{font-size:20px;font-weight:600;margin:0 0 7px}.page-tip{color:var(--ap-text-secondary)}.toolbar{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:2px 0 14px}.toolbar-tip{color:var(--ap-text-muted);font-size:13px}.plan-date-text{white-space:nowrap}.plan-date-header :deep(.cell){white-space:nowrap}.point-line{margin:0 0 8px;line-height:1.55;font-size:13px}
.filter-bar{display:flex;flex-wrap:wrap;align-items:center;gap:14px;margin:0 0 14px;padding:12px 16px;border:1px solid #e6eaf0;border-radius:8px;background:#fafbfc}
.filter-item{display:flex;align-items:center;gap:8px}
.filter-item > label{font-size:13px;color:var(--ap-text-secondary);white-space:nowrap}
.filter-count{margin-left:auto;font-size:13px;color:var(--ap-text-muted)}
</style>
