<script setup>
import { ref, reactive, computed } from 'vue'
import { ArrowLeft, Search, View } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { useRoute, useRouter } from 'vue-router'
import { selectedProjectId, useCurrentProject } from '../../composables/useCurrentProject'
import { HQ_PROJECT_OPTION, COC_PROJECT_OPTIONS } from '../../config/projectOptions'
import { machineTypeList } from '../../mock/machineTypes.js'

const router = useRouter()
const route = useRoute()
const { isHqSelected, headerProjectLabel } = useCurrentProject()
const scopeProjectId = computed(() =>
  isHqSelected.value ? '' : selectedProjectId.value,
)
const scopeProjectLabel = computed(() => headerProjectLabel.value)
const fromHq = computed(() => route.query.from === 'hq')
const hqProjectKeyword = ref('')

function goBackToHQ() {
  selectedProjectId.value = HQ_PROJECT_OPTION.id
  router.push('/machine-supervise/ledger')
}

const machineData = ref([
  { id:'mac-001', machineType:'塔吊', name:'塔吊QTZ160（#1）', spec:'QTZ160', attr:'大型设备', entryType:'租赁', supplier:'四川三益机械有限公司', supplierContact:'张工', supplierPhone:'139****5566', recordNo:'渝U-T00789', manufacturer:'中联重科', factoryNo:'1012T002318', prodDate:'2021-07-16', entryDate:'2023-03-05', exitDate:'', status:'在场', enabled:true, admin:'王工', address:'飞行区跑道延长工程-施工A区', project:'飞行区跑道延长工程', project_id:'p-000', installDate:'2023-03-10', installUnit:'重庆永鸿翔建筑机械有限公司', installPerson:'刘师傅', removeDate:'', removeUnit:'', removePerson:'' },
  { id:'mac-002', machineType:'塔吊', name:'塔吊QTZ160（#2）', spec:'WA6515-8', attr:'大型设备', entryType:'租赁', supplier:'四川三益机械有限公司', supplierContact:'张工', supplierPhone:'139****5566', recordNo:'渝U-T00790', manufacturer:'中联重科', factoryNo:'1012T002319', prodDate:'2023-02-10', entryDate:'2023-03-31', exitDate:'', status:'在场', enabled:true, admin:'王工', address:'飞行区跑道延长工程-施工B区', project:'飞行区跑道延长工程', project_id:'p-000', installDate:'2023-04-05', installUnit:'四川三益机械有限公司', installPerson:'陈师傅', removeDate:'', removeUnit:'', removePerson:'' },
  { id:'mac-003', machineType:'塔吊', name:'塔吊QTZ80（#7）', spec:'QTZ250', attr:'大型设备', entryType:'租赁', supplier:'四川三益机械有限公司', supplierContact:'张工', supplierPhone:'139****5566', recordNo:'渝U-T00791', manufacturer:'徐州建机', factoryNo:'XUG025P123', prodDate:'2020-03-30', entryDate:'2023-07-12', exitDate:'2024-07-16', status:'已退场', enabled:false, admin:'张工', address:'新货运站建设工程-堆场区', project:'新货运站建设工程', project_id:'p-003', installDate:'2023-07-18', installUnit:'四川三益机械有限公司', installPerson:'李师傅', removeDate:'2024-07-16', removeUnit:'四川三益机械有限公司', removePerson:'李师傅' },
  { id:'mac-004', machineType:'升降机', name:'升降机SC200（#2）', spec:'SC200/200', attr:'大型设备', entryType:'租赁', supplier:'重庆永鸿翔建筑机械有限公司', supplierContact:'张吉', supplierPhone:'19950234146', recordNo:'渝JB-S01946', manufacturer:'广州市特威工程机械有限公司', factoryNo:'220431782', prodDate:'2022-04-29', entryDate:'2024-02-02', exitDate:'', status:'在场', enabled:true, admin:'李工', address:'飞行区跑道延长工程-施工B区', project:'飞行区跑道延长工程', project_id:'p-000', installDate:'2024-02-02', installUnit:'重庆永鸿翔建筑机械有限公司', installPerson:'赵师傅', removeDate:'', removeUnit:'', removePerson:'' },
  { id:'mac-005', machineType:'升降机', name:'升降机SC200（#4）', spec:'SC200/200', attr:'大型设备', entryType:'租赁', supplier:'重庆永鸿翔建筑机械有限公司', supplierContact:'张吉', supplierPhone:'19950234146', recordNo:'渝JB-S01947', manufacturer:'广州市特威工程机械有限公司', factoryNo:'220431781', prodDate:'2022-04-26', entryDate:'2024-01-14', exitDate:'2024-11-22', status:'已退场', enabled:false, admin:'张工', address:'新货运站建设工程-基础区', project:'新货运站建设工程', project_id:'p-003', installDate:'2024-01-20', installUnit:'重庆永鸿翔建筑机械有限公司', installPerson:'王师傅', removeDate:'2024-11-22', removeUnit:'重庆永鸿翔建筑机械有限公司', removePerson:'王师傅' },
  { id:'mac-006', machineType:'桩基机械', name:'桩基钻孔机#5', spec:'ZJ-3000', attr:'大型设备', entryType:'租赁', supplier:'重庆永鸿翔建筑机械有限公司', supplierContact:'张吉', supplierPhone:'19950234146', recordNo:'渝JB-S01948', manufacturer:'广州市特威工程机械有限公司', factoryNo:'210828443', prodDate:'2021-08-16', entryDate:'2023-12-06', exitDate:'', status:'在场', enabled:true, admin:'王工', address:'飞行区跑道延长工程-跑道区', project:'飞行区跑道延长工程', project_id:'p-000', installDate:'2023-12-10', installUnit:'重庆永鸿翔建筑机械有限公司', installPerson:'周师傅', removeDate:'', removeUnit:'', removePerson:'' },
])

const filterForm = reactive({ keyword: '', machineType: '', entryType: '', status: '' })
const detailVisible = ref(false)
const currentMachine = ref(null)
const detailTab = ref('basic')

const typeOptions = computed(() => machineTypeList.map((t) => t.name))

const hqProjectRows = computed(() => {
  return COC_PROJECT_OPTIONS.map((node) => {
    const list = machineData.value.filter((d) => d.project_id === node.id)
    return {
      project_id: node.id,
      project_name: node.label,
      totalCount: list.length,
      inFieldCount: list.filter(d => d.status === '在场').length,
      exitCount: list.filter(d => d.status === '已退场').length,
      enabledCount: list.filter(d => d.enabled).length,
      largeCount: list.filter(d => d.attr === '大型设备').length,
    }
  }).filter(row => !hqProjectKeyword.value || row.project_name.includes(hqProjectKeyword.value))
})

const hqTotalStats = computed(() => {
  const list = hqProjectRows.value
  return {
    totalCount: list.reduce((sum, row) => sum + row.totalCount, 0),
    inFieldCount: list.reduce((sum, row) => sum + row.inFieldCount, 0),
    enabledCount: list.reduce((sum, row) => sum + row.enabledCount, 0),
    exitCount: list.reduce((sum, row) => sum + row.exitCount, 0),
  }
})

const filteredData = computed(() => {
  let list = machineData.value
  if (!isHqSelected.value) list = list.filter(d => d.project_id === scopeProjectId.value)
  return list.filter(d => {
    if (filterForm.machineType && d.machineType !== filterForm.machineType) return false
    if (filterForm.entryType && d.entryType !== filterForm.entryType) return false
    if (filterForm.status && d.status !== filterForm.status) return false
    if (filterForm.keyword) {
      const kw = filterForm.keyword
      if (!d.name.includes(kw) && !d.supplier.includes(kw) && !d.spec.includes(kw)) return false
    }
    return true
  })
})

function handleReset() { Object.keys(filterForm).forEach(k => filterForm[k] = '') }
function viewDetail(row) { router.push(`/machine-supervise/ledger/${row.id}`) }
function viewProjectLedger(row) {
  router.push({ path: '/machine-supervise/ledger', query: { from: 'hq' } }).then(() => {
    selectedProjectId.value = row.project_id
  })
}

const personOptions = ['王工', '李工', '张工', '赵工', '陈工', '刘工']

/** 列表勾选（仅在场设备可勾选） */
const tableRef = ref(null)
const selectedRows = ref([])
function onSelectionChange(rows) {
  selectedRows.value = rows
}
function selectableRow(row) {
  return row.status === '在场'
}
function clearTableSelection() {
  selectedRows.value = []
  tableRef.value?.clearSelection?.()
}

/** 退场弹窗：单条 / 批量 */
const exitVisible = ref(false)
const exitDate = ref('')
const exitTargets = ref([])
const exitTitle = computed(() =>
  exitTargets.value.length > 1 ? `批量退场（${exitTargets.value.length} 台）` : '设备退场',
)

function todayStr() {
  const d = new Date()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

function openExit(row) {
  if (row.status !== '在场') {
    ElMessage.warning('该设备已退场')
    return
  }
  exitTargets.value = [row]
  exitDate.value = todayStr()
  exitVisible.value = true
}

function openBatchExit() {
  const list = selectedRows.value.filter((r) => r.status === '在场')
  if (!list.length) {
    ElMessage.warning('请先勾选在场设备')
    return
  }
  exitTargets.value = list
  exitDate.value = todayStr()
  exitVisible.value = true
}

function confirmExit() {
  if (!exitDate.value) {
    ElMessage.warning('请选择退场时间')
    return
  }
  const ids = new Set(exitTargets.value.map((r) => r.id))
  let count = 0
  machineData.value.forEach((item) => {
    if (!ids.has(item.id) || item.status !== '在场') return
    item.exitDate = exitDate.value
    item.removeDate = exitDate.value
    item.status = '已退场'
    item.enabled = false
    count += 1
  })
  exitVisible.value = false
  clearTableSelection()
  ElMessage.success(count > 1 ? `已为 ${count} 台设备登记退场` : '退场登记成功')
}

// 编辑弹窗
const editVisible = ref(false)
const editRow = ref(null)
const editForm = reactive({
  name: '', spec: '', machineType: '', attr: '', entryType: '',
  supplier: '', supplierContact: '', supplierPhone: '', recordNo: '',
  manufacturer: '', factoryNo: '', prodDate: '', entryDate: '', exitDate: '',
  admin: '', address: '', status: ''
})

function openEdit(row) {
  editRow.value = row
  Object.keys(editForm).forEach(k => { editForm[k] = row[k] || '' })
  editVisible.value = true
}

function saveEdit() {
  const item = machineData.value.find(d => d.id === editRow.value.id)
  if (item) Object.assign(item, { ...editForm })
  ElMessage.success('设备信息已更新')
  editVisible.value = false
}

function toggleEnabled(row) {
  const item = machineData.value.find(d => d.id === row.id)
  if (item) { item.enabled = !item.enabled; ElMessage.success(item.enabled ? '已启用' : '已停用') }
}
</script>

<template>
  <div class="page">
    <div class="page-head">
      <h3 class="page-title">{{ isHqSelected ? '机械设备台账' : '登记进场设备' }}</h3>
      <span class="total-count">{{ isHqSelected ? `共 ${hqTotalStats.totalCount} 台` : `共 ${filteredData.length} 条` }}</span>
    </div>

    <template v-if="isHqSelected">
      <div class="hq-dashboard">
        <div class="stat-cards">
          <div class="stat-card"><div class="sc-value">{{ hqTotalStats.totalCount }}</div><div class="sc-label">设备总数</div></div>
          <div class="stat-card"><div class="sc-value">{{ hqTotalStats.inFieldCount }}</div><div class="sc-label">在场设备</div></div>
          <div class="stat-card"><div class="sc-value text-theme-red">{{ hqTotalStats.enabledCount }}</div><div class="sc-label">启用设备</div></div>
          <div class="stat-card"><div class="sc-value">{{ hqTotalStats.exitCount }}</div><div class="sc-label">已退场设备</div></div>
        </div>
        <div class="hq-filter-bar">
          <el-input v-model="hqProjectKeyword" placeholder="搜索项目名称..." clearable style="width:220px" :prefix-icon="Search" />
        </div>
        <el-table :data="hqProjectRows" border stripe class="ap-table" style="width:100%;margin-top:12px">
          <el-table-column type="index" label="序号" width="55" align="center" />
          <el-table-column prop="project_name" label="项目名称" min-width="180" />
          <el-table-column prop="totalCount" label="设备数量" align="center" />
          <el-table-column prop="inFieldCount" label="在场设备" align="center" />
          <el-table-column prop="exitCount" label="已退场设备" align="center" />
          <el-table-column prop="enabledCount" label="启用设备" align="center" />
          <el-table-column prop="largeCount" label="大型设备" align="center" />
          <el-table-column label="操作" width="110" align="center">
            <template #default="{ row }">
              <el-button link type="primary" size="small" :icon="View" @click="viewProjectLedger(row)">查看详情</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </template>

    <template v-else>
      <div v-if="fromHq" class="back-bar">
        <el-button link type="primary" :icon="ArrowLeft" @click="goBackToHQ" style="font-size:14px">返回</el-button>
        <span class="back-project-name">{{ scopeProjectLabel || selectedProjectId }}</span>
      </div>
      <div class="page-panel">
        <div style="margin-bottom:12px;display:flex;gap:10px;align-items:center">
          <el-button type="primary" @click="router.push('/machine-supervise/ledger/entry')">设备进场</el-button>
          <el-button type="warning" :disabled="!selectedRows.length" @click="openBatchExit">
            批量退场{{ selectedRows.length ? `（${selectedRows.length}）` : '' }}
          </el-button>
        </div>
        <div class="filter-bar">
          <el-select v-model="filterForm.machineType" placeholder="机械类型" clearable style="width:110px">
            <el-option v-for="t in typeOptions" :key="t" :label="t" :value="t" />
          </el-select>
          <el-select v-model="filterForm.entryType" placeholder="进场类型" clearable style="width:110px">
            <el-option label="租赁" value="租赁" /><el-option label="自有" value="自有" />
          </el-select>
          <el-select v-model="filterForm.status" placeholder="设备状态" clearable style="width:110px">
            <el-option label="已退场" value="已退场" /><el-option label="在场" value="在场" />
          </el-select>
          <el-input v-model="filterForm.keyword" placeholder="搜索设备名称/供应商..." clearable style="width:260px" :prefix-icon="Search" />
          <el-button @click="handleReset">重置</el-button>
        </div>

        <el-table
          ref="tableRef"
          :data="filteredData"
          stripe
          border
          style="width:100%"
          class="data-table"
          row-key="id"
          @selection-change="onSelectionChange"
        >
          <el-table-column type="selection" width="48" align="center" :selectable="selectableRow" />
          <el-table-column type="index" label="序号" width="50" align="center" />
          <el-table-column prop="machineType" label="机械类型" min-width="100" align="center" />
          <el-table-column prop="name" label="机械设备名称" min-width="160" show-overflow-tooltip />
          <el-table-column prop="spec" label="规格型号" min-width="110" />
          <el-table-column prop="attr" label="机械属性" min-width="100" align="center" />
          <el-table-column prop="entryType" label="进场类型" min-width="90" align="center" />
          <el-table-column prop="supplier" label="设备供应商" min-width="140" show-overflow-tooltip />
          <el-table-column prop="manufacturer" label="生产厂商" min-width="140" show-overflow-tooltip />
          <el-table-column prop="prodDate" label="生产日期" width="110" align="center" />
          <el-table-column prop="factoryNo" label="出厂编号" min-width="120" />
          <el-table-column prop="entryDate" label="进场日期" width="110" align="center" />
          <el-table-column prop="exitDate" label="退场日期" width="110" align="center">
            <template #default="{ row }">{{ row.exitDate || '—' }}</template>
          </el-table-column>
          <el-table-column label="设备状态" width="90" align="center" class-name="no-ellipsis-cell">
            <template #default="{ row }">
              <el-tag :type="row.status === '在场' ? 'success' : 'info'" size="small" effect="plain" style="white-space:nowrap">{{ row.status }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="启停状态" width="90" align="center">
            <template #default="{ row }">
              <el-tag :type="row.enabled ? 'success' : 'danger'" size="small" effect="plain">{{ row.enabled ? '启用' : '停用' }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" min-width="180" align="center" fixed="right">
            <template #default="{ row }">
              <div style="display:flex;gap:4px;justify-content:center;flex-wrap:wrap">
                <el-button v-if="row.status === '在场'" link type="warning" size="small" @click="openExit(row)">退场</el-button>
                <el-button link type="primary" size="small" @click="openEdit(row)">编辑</el-button>
                <el-button link type="primary" size="small" @click="viewDetail(row)">详情</el-button>
              </div>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </template>

    <!-- 退场登记弹窗 -->
    <el-dialog v-model="exitVisible" :title="exitTitle" width="480px" :close-on-click-modal="false" destroy-on-close>
      <el-form label-width="100px">
        <el-form-item label="退场设备">
          <div class="exit-device-list">
            <div v-for="item in exitTargets" :key="item.id" class="exit-device-item">
              {{ item.name }}
              <span class="exit-device-meta">{{ item.machineType }} · {{ item.spec }}</span>
            </div>
          </div>
        </el-form-item>
        <el-form-item label="退场时间" required>
          <el-date-picker
            v-model="exitDate"
            type="date"
            placeholder="请选择退场时间"
            value-format="YYYY-MM-DD"
            style="width: 100%"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="exitVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmExit">确认退场</el-button>
      </template>
    </el-dialog>

    <!-- 编辑弹窗（匹配设备编辑页面.png字段） -->
    <el-dialog v-model="editVisible" title="编辑机械设备" width="600px" :close-on-click-modal="false">
      <el-form :model="editForm" label-width="110px">
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="机械类型" required>
              <el-select v-model="editForm.machineType" style="width:100%" placeholder="请选择">
                <el-option v-for="t in typeOptions" :key="t" :label="t" :value="t" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="机械设备名称" required><el-input v-model="editForm.name" /></el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="规格型号" required><el-input v-model="editForm.spec" /></el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="机械属性" required><el-input v-model="editForm.attr" /></el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="进场类型" required>
              <el-select v-model="editForm.entryType" style="width:100%">
                <el-option label="租赁" value="租赁" /><el-option label="自有" value="自有" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="设备管理员"><el-select v-model="editForm.admin" placeholder="请选择" style="width:100%"><el-option v-for="p in personOptions" :key="p" :label="p" :value="p" /></el-select></el-form-item>
          </el-col>
        </el-row>
        <el-divider style="margin:12px 0" />
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="供应商联系人"><el-select v-model="editForm.supplierContact" placeholder="请选择" style="width:100%"><el-option v-for="p in personOptions" :key="p" :label="p" :value="p" /></el-select></el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="供应商联系人电话"><el-input v-model="editForm.supplierPhone" /></el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="备案编号"><el-input v-model="editForm.recordNo" /></el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="设备供应商"><el-input v-model="editForm.supplier" /></el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="生产厂商"><el-input v-model="editForm.manufacturer" /></el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="出厂编号"><el-input v-model="editForm.factoryNo" /></el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="生产日期"><el-date-picker v-model="editForm.prodDate" type="date" placeholder="选择日期" style="width:100%" value-format="YYYY-MM-DD" /></el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="进场日期" required><el-date-picker v-model="editForm.entryDate" type="date" placeholder="选择日期" style="width:100%" value-format="YYYY-MM-DD" /></el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="退场日期"><el-date-picker v-model="editForm.exitDate" type="date" placeholder="选择日期" style="width:100%" value-format="YYYY-MM-DD" /></el-form-item>
          </el-col>
          <el-col :span="12" />
        </el-row>
      </el-form>
      <template #footer>
        <el-button @click="editVisible = false">取消</el-button>
        <el-button type="primary" @click="saveEdit">保存</el-button>
      </template>
    </el-dialog>

  </div>
</template>

<style scoped>
.page { padding:0; }
.page-head { display:flex; align-items:center; justify-content:space-between; margin-bottom:16px; }
.page-title { font-size:18px; font-weight:600; color:#1f2329; margin:0; }
.total-count { font-size:12px; color:#999; }
.filter-bar { display:flex; gap:12px; margin-bottom:16px; flex-wrap:wrap; align-items:center; }
.data-table { font-size:13px; }
.page-panel { flex:1; min-width:0; }
:deep(.no-ellipsis-cell .cell) { overflow: visible; text-overflow: clip; white-space: nowrap; }
.back-bar { display:flex; align-items:center; gap:8px; margin-bottom:12px; padding:8px 12px; background:#f5f7fa; border-radius:6px; }
.back-project-name { font-size:14px; font-weight:600; color:#1f2329; }
.hq-dashboard { background:#f5f7fa; border-radius:10px; padding:20px; }
.hq-filter-bar { margin-top:12px; }
.stat-cards { display:flex; gap:16px; margin-bottom:16px; }
.stat-card { flex:1; background:#fff; border-radius:8px; padding:16px 20px; box-shadow:0 1px 4px rgba(0,0,0,0.06); text-align:center; }
.sc-value { font-size:24px; font-weight:700; color:#1f2329; }
.sc-value.text-theme-red { color:#8F0045; }
.sc-label { font-size:12px; color:#999; margin-top:4px; }
.ap-table { font-size:13px; width:100%; }
.exit-device-list {
  width: 100%;
  max-height: 160px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.exit-device-item {
  font-size: 13px;
  color: #1f2329;
  line-height: 1.4;
}
.exit-device-meta {
  margin-left: 8px;
  color: #909399;
  font-size: 12px;
}

/* 详情样式 */
.detail-section { margin-bottom:20px; }
.section-title { font-size:14px; font-weight:600; color:#1f2329; margin-bottom:10px; padding-bottom:6px; border-bottom:1px solid #eee; }
.detail-grid { display:grid; grid-template-columns:1fr 1fr; gap:8px 16px; }
.dg-item { display:flex; font-size:13px; padding:4px 0; }
.dl { width:110px; color:#666; flex-shrink:0; }
.dv { color:#1f2329; }

.el-form-item__label::before {
  content: '' !important;
}
.el-form-item.is-required .el-form-item__label::after {
  content: '*';
  color: #e74c3c;
  margin-left: 4px;
  font-weight: bold;
}

.el-table { width:100% !important; }
.el-table__header-wrapper table, .el-table__body-wrapper table { table-layout:fixed; width:100% !important; }
</style>
