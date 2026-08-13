<script setup>
import { ref, computed, watch } from 'vue'
import { Search, Refresh, Plus } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useVehicleProjectScope } from '../../composables/useCurrentProject'
import { getVehicleMenuItem } from '../../config/vehicleMenu.js'
import {
  projectTree,
  getProjectVehicleDevices,
  vehicleDeviceTypeOptions,
  emptyVehicleDeviceForm,
} from '../../mock/vehicleManagement'

const menuItem = getVehicleMenuItem('vehicle-device')
const { isHqSelected, treeProjectId, scopeProjectId, scopeProjectLabel, onTreeNodeClick } = useVehicleProjectScope()
const keyword = ref('')
const filters = ref({ device_type: '', online: '' })
const list = ref([])
const formVisible = ref(false)
const formRef = ref(null)
const formData = ref(emptyVehicleDeviceForm())
const editingId = ref('')

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
      const hay = `${row.name}${row.device_no}${row.location}${row.bind_plate_no}`
      if (!hay.includes(kw)) return false
    }
    if (filters.value.device_type && row.device_type !== filters.value.device_type) return false
    if (filters.value.online === 'online' && !row.online) return false
    if (filters.value.online === 'offline' && row.online) return false
    return true
  })
})

const stats = computed(() => ({
  total: list.value.length,
  online: list.value.filter((item) => item.online).length,
  gate: list.value.filter((item) => item.device_type === '道闸车牌识别设备').length,
}))

const formRules = {
  name: [{ required: true, message: '请输入设备名称', trigger: 'blur' }],
  device_type: [{ required: true, message: '请选择设备类型', trigger: 'change' }],
  device_no: [{ required: true, message: '请输入设备编号', trigger: 'blur' }],
  location: [{ required: true, message: '请输入安装位置', trigger: 'blur' }],
}

function loadList() {
  list.value = getProjectVehicleDevices(scopeProjectId.value).map((row) => ({ ...row }))
}

watch(scopeProjectId, () => {
  keyword.value = ''
  filters.value = { device_type: '', online: '' }
  loadList()
}, { immediate: true })

function handleReset() {
  keyword.value = ''
  filters.value = { device_type: '', online: '' }
}

function openCreate() {
  editingId.value = ''
  formData.value = emptyVehicleDeviceForm()
  formVisible.value = true
}

function openEdit(row) {
  editingId.value = row.id
  formData.value = emptyVehicleDeviceForm(row)
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
    ElMessage.success('设备信息已更新')
  } else {
    list.value.unshift({
      ...payload,
      id: `${scopeProjectId.value}-dev-${Date.now()}`,
    })
    ElMessage.success('设备已新增')
  }
  formVisible.value = false
}

async function handleDelete(row) {
  await ElMessageBox.confirm(`确认删除设备「${row.name}」？`, '提示', { type: 'warning' })
  list.value = list.value.filter((item) => item.id !== row.id)
  ElMessage.success('已删除')
}
</script>

<template>
  <div class="vehicle-device-page page-card">
    <div class="page-header">
      <div class="page-breadcrumb">车辆管理 / 设备管理</div>
      <div class="page-heading">
        <h1 class="page-title">设备管理</h1>
        <el-button type="primary" class="ap-btn-primary" :icon="Plus" @click="openCreate">新增设备</el-button>
      </div>
      <p v-if="!isHqSelected" class="page-scope">当前项目：{{ scopeProjectLabel }}</p>
      <p class="page-tip">{{ menuItem?.description }}</p>
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
            <span>设备 {{ stats.total }} 台</span>
            <span>在线 {{ stats.online }}</span>
            <span>道闸识别 {{ stats.gate }}</span>
          </div>
        </div>

        <div class="filter-bar">
          <el-input
            v-model="keyword"
            placeholder="设备名称 / 编号 / 位置 / 绑定车牌"
            clearable
            :prefix-icon="Search"
            class="search-input"
          />
          <el-select v-model="filters.device_type" placeholder="设备类型" clearable style="width: 150px">
            <el-option v-for="opt in vehicleDeviceTypeOptions" :key="opt" :label="opt" :value="opt" />
          </el-select>
          <el-select v-model="filters.online" placeholder="在线状态" clearable style="width: 110px">
            <el-option label="在线" value="online" />
            <el-option label="离线" value="offline" />
          </el-select>
          <el-button class="ap-btn-primary" type="primary" :icon="Search">查询</el-button>
          <el-button :icon="Refresh" @click="handleReset">重置</el-button>
        </div>

        <el-table :data="filteredList" border stripe class="ap-table">
          <el-table-column type="index" label="序号" width="60" align="center" />
          <el-table-column prop="name" label="设备名称" min-width="140" show-overflow-tooltip />
          <el-table-column prop="device_type" label="设备类型" min-width="140" />
          <el-table-column prop="device_no" label="设备编号" width="130" show-overflow-tooltip />
          <el-table-column prop="location" label="安装位置" min-width="120" show-overflow-tooltip />
          <el-table-column prop="bind_plate_no" label="绑定车牌" width="110" />
          <el-table-column label="在线状态" width="90" align="center">
            <template #default="{ row }">
              <span class="ap-status-tag" :class="row.online ? 'ap-tag-enabled' : 'ap-tag-disabled'">
                {{ row.online ? '在线' : '离线' }}
              </span>
            </template>
          </el-table-column>
          <el-table-column prop="updated_at" label="更新时间" width="160" />
          <el-table-column label="操作" width="130" fixed="right" align="center">
            <template #default="{ row }">
              <el-button link type="primary" size="small" @click="openEdit(row)">编辑</el-button>
              <el-button link type="danger" size="small" @click="handleDelete(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>

    <el-dialog
      v-model="formVisible"
      :title="editingId ? '编辑设备' : '新增设备'"
      width="520px"
      destroy-on-close
    >
      <el-form ref="formRef" :model="formData" :rules="formRules" label-width="100px">
        <el-form-item label="设备名称" prop="name">
          <el-input v-model="formData.name" />
        </el-form-item>
        <el-form-item label="设备类型" prop="device_type">
          <el-select v-model="formData.device_type" style="width: 100%">
            <el-option v-for="opt in vehicleDeviceTypeOptions" :key="opt" :label="opt" :value="opt" />
          </el-select>
        </el-form-item>
        <el-form-item label="设备编号" prop="device_no">
          <el-input v-model="formData.device_no" />
        </el-form-item>
        <el-form-item label="安装位置" prop="location">
          <el-input v-model="formData.location" />
        </el-form-item>
        <el-form-item label="绑定车牌">
          <el-input v-model="formData.bind_plate_no" placeholder="选填" />
        </el-form-item>
        <el-form-item label="在线状态">
          <el-switch v-model="formData.online" active-text="在线" inactive-text="离线" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="formVisible = false">取消</el-button>
        <el-button type="primary" class="ap-btn-primary" @click="handleSubmit">保存</el-button>
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

.page-scope {
  margin: 4px 0 8px;
  font-size: 14px;
  font-weight: 600;
  color: var(--ap-text);
}

.page-tip {
  margin-top: 0;
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
