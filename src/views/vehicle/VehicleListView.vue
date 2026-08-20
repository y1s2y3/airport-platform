<script setup>
import { ref, computed, watch } from 'vue'
import { Search, Refresh, Plus, Download, Upload } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useVehicleProjectScope } from '../../composables/useCurrentProject'
import {
  projectTree,
  getProjectVehicles,
  getProjectGateOptions,
  formatVehicleGateLabels,
  vehicleTypeOptions,
  emptyVehicleForm,
} from '../../mock/vehicleManagement'

const { isHqSelected, treeProjectId, scopeProjectId, scopeProjectLabel, onTreeNodeClick } = useVehicleProjectScope()
const keyword = ref('')
const filters = ref({ vehicle_type: '', status: '' })
const list = ref([])
const formVisible = ref(false)
const formRef = ref(null)
const formData = ref(emptyVehicleForm())
const editingId = ref('')
const tableRef = ref(null)
const selectedRows = ref([])
const gateAuthVisible = ref(false)
const gateAuthMode = ref('single')
const gateAuthTargetIds = ref([])
const gateAuthSelectedIds = ref([])

const gateOptions = computed(() => getProjectGateOptions(scopeProjectId.value))

const gateAuthTitle = computed(() =>
  gateAuthMode.value === 'batch'
    ? `批量授权道闸（${gateAuthTargetIds.value.length} 辆）`
    : '授权道闸',
)

const gateAuthTargetPlates = computed(() =>
  list.value
    .filter((item) => gateAuthTargetIds.value.includes(item.id))
    .map((item) => item.plate_no)
    .join('、'),
)

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

const filteredList = computed(() => {
  const kw = keyword.value.trim()
  return list.value.filter((row) => {
    if (kw) {
      const hay = `${row.plate_no}${row.unit_name}${row.driver_name}${row.driver_phone}${row.permit_no}`
      if (!hay.includes(kw)) return false
    }
    if (filters.value.vehicle_type && row.vehicle_type !== filters.value.vehicle_type) return false
    if (filters.value.status && row.status !== filters.value.status) return false
    return true
  })
})

const formRules = {
  plate_no: [{ required: true, message: '请输入车牌号', trigger: 'blur' }],
  vehicle_type: [{ required: true, message: '请选择车辆类型', trigger: 'change' }],
  unit_name: [{ required: true, message: '请输入所属单位', trigger: 'blur' }],
  driver_name: [{ required: true, message: '请输入司机姓名', trigger: 'blur' }],
  driver_phone: [{ required: true, message: '请输入司机电话', trigger: 'blur' }],
}

function loadList() {
  list.value = getProjectVehicles(scopeProjectId.value).map((row) => ({ ...row }))
}

watch(scopeProjectId, () => {
  keyword.value = ''
  filters.value = { vehicle_type: '', status: '' }
  selectedRows.value = []
  loadList()
}, { immediate: true })

function handleSelectionChange(rows) {
  selectedRows.value = rows
}

function openGateAuth(row) {
  gateAuthMode.value = 'single'
  gateAuthTargetIds.value = [row.id]
  gateAuthSelectedIds.value = [...(row.authorized_gate_ids || [])]
  gateAuthVisible.value = true
}

function openSingleGateAuthFromSelection() {
  if (selectedRows.value.length !== 1) {
    ElMessage.warning('请勾选 1 辆车后再进行授权道闸')
    return
  }
  openGateAuth(selectedRows.value[0])
}

function openBatchGateAuth() {
  if (!selectedRows.value.length) {
    ElMessage.warning('请先选择要授权的车辆')
    return
  }
  gateAuthMode.value = 'batch'
  gateAuthTargetIds.value = selectedRows.value.map((item) => item.id)
  const firstIds = selectedRows.value[0]?.authorized_gate_ids || []
  const sameForAll = selectedRows.value.every((row) => {
    const ids = row.authorized_gate_ids || []
    return ids.length === firstIds.length && ids.every((id) => firstIds.includes(id))
  })
  gateAuthSelectedIds.value = sameForAll ? [...firstIds] : []
  gateAuthVisible.value = true
}

function submitGateAuth() {
  if (!gateAuthSelectedIds.value.length) {
    ElMessage.warning('请至少选择一个道闸')
    return
  }
  const ids = [...gateAuthSelectedIds.value]
  list.value = list.value.map((item) =>
    gateAuthTargetIds.value.includes(item.id)
      ? {
          ...item,
          authorized_gate_ids: [...ids],
          updated_at: new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-'),
        }
      : item,
  )
  gateAuthVisible.value = false
  selectedRows.value = []
  tableRef.value?.clearSelection()
  ElMessage.success(
    gateAuthMode.value === 'batch'
      ? `已为 ${gateAuthTargetIds.value.length} 辆车完成道闸授权`
      : '道闸授权已保存',
  )
}

function getGateLabelText(row) {
  const labels = formatVehicleGateLabels(row, scopeProjectId.value)
  return labels.length ? labels.join('、') : '未授权'
}

function handleReset() {
  keyword.value = ''
  filters.value = { vehicle_type: '', status: '' }
}

function openCreate() {
  editingId.value = ''
  formData.value = emptyVehicleForm()
  formVisible.value = true
}

function openEdit(row) {
  editingId.value = row.id
  formData.value = emptyVehicleForm(row)
  formVisible.value = true
}

async function handleSubmit() {
  await formRef.value.validate()
  const payload = {
    ...formData.value,
    project_id: scopeProjectId.value,
    updated_at: new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-'),
  }
  if (editingId.value) {
    const index = list.value.findIndex((item) => item.id === editingId.value)
    if (index !== -1) list.value[index] = { ...list.value[index], ...payload, id: editingId.value }
    ElMessage.success('车辆信息已更新')
  } else {
    const exists = list.value.some((item) => item.plate_no === payload.plate_no)
    if (exists) {
      ElMessage.warning('该车牌号已存在')
      return
    }
    list.value.unshift({
      ...payload,
      id: `${scopeProjectId.value}-veh-${Date.now()}`,
      authorized_gate_ids: [],
    })
    formVisible.value = false
    ElMessage.success('车辆已新增')
    openGateAuth(list.value[0])
    return
  }
  formVisible.value = false
}

async function handleDelete(row) {
  await ElMessageBox.confirm(`确认删除车辆「${row.plate_no}」？`, '提示', { type: 'warning' })
  list.value = list.value.filter((item) => item.id !== row.id)
  ElMessage.success('已删除')
}
</script>

<template>
  <div class="vehicle-registry-page page-card">
    <div class="page-header">
      <div class="page-breadcrumb">车辆管理 / 车牌管理</div>
      <div class="page-heading">
        <h1 class="page-title">车牌管理</h1>
        <div class="page-actions">
          <el-button type="primary" class="ap-btn-primary" :icon="Plus" @click="openCreate">新增</el-button>
          <el-button @click="openSingleGateAuthFromSelection">新增授权道闸</el-button>
          <el-button @click="openBatchGateAuth">批量授权道闸</el-button>
          <el-button :icon="Upload">导入</el-button>
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

      <div class="content-panel page-panel">
        <div v-if="isHqSelected" class="panel-title">{{ scopeProjectLabel }}</div>

        <div class="filter-bar">
          <el-input
            v-model="keyword"
            placeholder="车牌号 / 单位 / 司机 / 准入证明"
            clearable
            :prefix-icon="Search"
            class="search-input" aria-label="车牌号 / 单位 / 司机 / 准入证明"/>
          <el-select v-model="filters.vehicle_type" placeholder="车辆类型" clearable style="width: 120px" aria-label="车辆类型">
            <el-option v-for="opt in vehicleTypeOptions" :key="opt" :label="opt" :value="opt" />
          </el-select>
          <el-select v-model="filters.status" placeholder="状态" clearable style="width: 110px" aria-label="状态">
            <el-option label="已准入" value="已准入" />
            <el-option label="已退场" value="已退场" />
          </el-select>
          <el-button class="ap-btn-primary" type="primary" :icon="Search">查询</el-button>
          <el-button :icon="Refresh" @click="handleReset">重置</el-button>
        </div>

        <div class="table-summary">
          共 {{ filteredList.length }} 辆
          <span v-if="selectedRows.length">，已选 {{ selectedRows.length }} 辆</span>
        </div>
        <el-table
          ref="tableRef"
          :data="filteredList"
          border
          stripe
          class="ap-table"
          @selection-change="handleSelectionChange"
        >
          <el-table-column type="selection" width="48" align="center" />
          <el-table-column type="index" label="序号" width="60" align="center" />
          <el-table-column prop="plate_no" label="车牌号" width="110" />
          <el-table-column prop="vehicle_type" label="车辆类型" width="110" />
          <el-table-column prop="unit_name" label="所属单位" min-width="150" show-overflow-tooltip />
          <el-table-column prop="driver_name" label="司机" width="90" />
          <el-table-column prop="driver_phone" label="联系电话" width="130" />
          <el-table-column prop="permit_no" label="准入证明" min-width="130" show-overflow-tooltip />
          <el-table-column prop="permit_valid_to" label="证件有效期" width="110" />
          <el-table-column label="授权道闸" min-width="160" show-overflow-tooltip>
            <template #default="{ row }">
              <span :class="{ 'gate-empty': !row.authorized_gate_ids?.length }">{{ getGateLabelText(row) }}</span>
            </template>
          </el-table-column>
          <el-table-column label="状态" width="90" align="center">
            <template #default="{ row }">
              <span class="ap-status-tag" :class="row.status === '已准入' ? 'ap-tag-enabled' : 'ap-tag-disabled'">
                {{ row.status }}
              </span>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="210" fixed="right" align="center">
            <template #default="{ row }">
              <el-button link type="primary" size="small" @click="openGateAuth(row)">授权道闸</el-button>
              <el-button link type="primary" size="small" @click="openEdit(row)">编辑</el-button>
              <el-button link type="danger" size="small" @click="handleDelete(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>

    <el-dialog
      v-model="formVisible"
      :title="editingId ? '编辑车辆' : '新增车辆'"
      width="560px"
      destroy-on-close
    >
      <el-form ref="formRef" :model="formData" :rules="formRules" label-width="100px">
        <el-form-item label="车牌号" prop="plate_no">
          <el-input v-model="formData.plate_no" placeholder="请输入车牌号" aria-label="请输入车牌号"/>
        </el-form-item>
        <el-form-item label="车辆类型" prop="vehicle_type">
          <el-select v-model="formData.vehicle_type" style="width: 100%">
            <el-option v-for="opt in vehicleTypeOptions" :key="opt" :label="opt" :value="opt" />
          </el-select>
        </el-form-item>
        <el-form-item label="所属单位" prop="unit_name">
          <el-input v-model="formData.unit_name" placeholder="参建单位名称" aria-label="参建单位名称"/>
        </el-form-item>
        <el-form-item label="司机姓名" prop="driver_name">
          <el-input v-model="formData.driver_name" />
        </el-form-item>
        <el-form-item label="司机电话" prop="driver_phone">
          <el-input v-model="formData.driver_phone" />
        </el-form-item>
        <el-form-item label="准入证明">
          <el-input v-model="formData.permit_no" placeholder="准入证明编号" aria-label="准入证明编号"/>
        </el-form-item>
        <el-form-item label="证件有效期">
          <el-input v-model="formData.permit_valid_to" placeholder="YYYY-MM-DD" aria-label="YYYY-MM-DD"/>
        </el-form-item>
        <el-form-item label="状态">
          <el-radio-group v-model="formData.status">
            <el-radio value="已准入">已准入</el-radio>
            <el-radio value="已退场">已退场</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="formVisible = false">取消</el-button>
        <el-button type="primary" class="ap-btn-primary" @click="handleSubmit">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="gateAuthVisible" :title="gateAuthTitle" width="520px" destroy-on-close>
      <div v-if="gateAuthTargetPlates" class="gate-auth-tip">
        车牌号：{{ gateAuthTargetPlates }}
      </div>
      <el-empty v-if="!gateOptions.length" description="当前项目暂无道闸设备，请先在设备管理中维护道闸车牌识别设备" />
      <el-checkbox-group v-else v-model="gateAuthSelectedIds" class="gate-auth-list">
        <label v-for="gate in gateOptions" :key="gate.id" class="gate-auth-item">
          <el-checkbox :label="gate.id">
            <span class="gate-auth-name">{{ gate.label }}</span>
            <span class="gate-auth-meta">{{ gate.location }} · {{ gate.online ? '在线' : '离线' }}</span>
          </el-checkbox>
        </label>
      </el-checkbox-group>
      <template #footer>
        <el-button @click="gateAuthVisible = false">取消</el-button>
        <el-button type="primary" class="ap-btn-primary" :disabled="!gateOptions.length" @click="submitGateAuth">
          保存授权
        </el-button>
      </template>
    </el-dialog>
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
  font-weight: 600;
  color: var(--ap-text);
}

.page-actions {
  display: flex;
  gap: 8px;
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

.filter-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.search-input {
  width: 280px;
}

.table-summary {
  margin-bottom: 8px;
  font-size: 13px;
  color: var(--ap-text-secondary);
}

.gate-empty {
  color: var(--ap-text-muted);
}

.gate-auth-tip {
  margin-bottom: 12px;
  padding: 10px 12px;
  border-radius: 6px;
  background: #fafafa;
  font-size: 13px;
  color: var(--ap-text-secondary);
}

.gate-auth-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
}

.gate-auth-item {
  display: block;
  padding: 10px 12px;
  border: 1px solid var(--ap-border);
  border-radius: 8px;
}

.gate-auth-item :deep(.el-checkbox) {
  align-items: flex-start;
  height: auto;
  white-space: normal;
}

.gate-auth-name {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: var(--ap-text);
}

.gate-auth-meta {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  color: var(--ap-text-muted);
}
</style>
