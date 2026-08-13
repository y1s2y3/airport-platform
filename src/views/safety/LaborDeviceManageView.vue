<script setup>
import { ref, computed, watch } from 'vue'
import { Search, Refresh, Plus } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useLaborProjectScope } from '../../composables/useCurrentProject'
import {
  projectTree,
  getProjectLaborDevices,
  laborDeviceTypeOptions,
  emptyLaborDeviceForm,
} from '../../mock/laborDeviceManage'

const { isHqSelected, treeProjectId, scopeProjectId, scopeProjectLabel, onTreeNodeClick } = useLaborProjectScope()
const keyword = ref('')
const filters = ref({ deviceType: '', online: '' })
const list = ref([])
const formVisible = ref(false)
const formRef = ref(null)
const formData = ref(emptyLaborDeviceForm())
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
      const hay = `${row.name}${row.deviceNo}${row.location}${row.bindPersonnel}`
      if (!hay.includes(kw)) return false
    }
    if (filters.value.deviceType && row.deviceType !== filters.value.deviceType) return false
    if (filters.value.online === 'online' && !row.online) return false
    if (filters.value.online === 'offline' && row.online) return false
    return true
  })
})

const stats = computed(() => ({
  total: list.value.length,
  online: list.value.filter((item) => item.online).length,
  attendance: list.value.filter((item) => item.deviceType === '考勤机设备').length,
  gps: list.value.filter((item) => item.deviceType === 'GPS定位设备').length,
}))

const formRules = {
  name: [{ required: true, message: '请输入设备名称', trigger: 'blur' }],
  deviceType: [{ required: true, message: '请选择设备类型', trigger: 'change' }],
  deviceNo: [{ required: true, message: '请输入设备编号', trigger: 'blur' }],
  location: [{ required: true, message: '请输入安装位置', trigger: 'blur' }],
}

function loadList() {
  list.value = getProjectLaborDevices(scopeProjectId.value).map((row) => ({ ...row }))
}

watch(scopeProjectId, () => {
  keyword.value = ''
  filters.value = { deviceType: '', online: '' }
  loadList()
}, { immediate: true })

function handleReset() {
  keyword.value = ''
  filters.value = { deviceType: '', online: '' }
}

function openCreate() {
  editingId.value = ''
  formData.value = emptyLaborDeviceForm()
  formVisible.value = true
}

function openEdit(row) {
  editingId.value = row.id
  formData.value = emptyLaborDeviceForm(row)
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
  <div class="device-page page-card">
    <div class="page-header">
      <div class="page-breadcrumb">人员实名制管理 / 设备管理</div>
      <div class="page-heading">
        <h1 class="page-title">设备管理</h1>
        <el-button type="primary" class="ap-btn-primary" :icon="Plus" @click="openCreate">新增设备</el-button>
      </div>
      <p v-if="!isHqSelected" class="page-scope">当前项目：{{ scopeProjectLabel }}</p>
      <p class="page-tip">管理考勤机设备、GPS 定位设备，维护设备编号、安装位置、在线状态及绑定关系。</p>
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

      <section class="content-panel">
        <div class="panel-head">
          <div v-if="isHqSelected" class="panel-title">{{ scopeProjectLabel || '请选择项目' }}</div>
          <div class="panel-stats">
            <span>设备 {{ stats.total }} 台</span>
            <span>在线 {{ stats.online }} 台</span>
            <span>考勤机 {{ stats.attendance }} 台</span>
            <span>GPS {{ stats.gps }} 台</span>
          </div>
        </div>

        <div class="filter-bar">
          <el-input v-model="keyword" placeholder="设备名称/编号/位置" clearable style="width: 200px" />
          <el-select v-model="filters.deviceType" placeholder="设备类型" clearable style="width: 140px">
            <el-option v-for="opt in laborDeviceTypeOptions" :key="opt" :label="opt" :value="opt" />
          </el-select>
          <el-select v-model="filters.online" placeholder="在线状态" clearable style="width: 120px">
            <el-option label="在线" value="online" />
            <el-option label="离线" value="offline" />
          </el-select>
          <el-button class="ap-btn-primary" type="primary" :icon="Search">查询</el-button>
          <el-button :icon="Refresh" @click="handleReset">重置</el-button>
        </div>

        <el-table :data="filteredList" border stripe class="ap-table">
          <el-table-column type="index" label="序号" width="60" align="center" />
          <el-table-column prop="name" label="设备名称" min-width="120" />
          <el-table-column prop="deviceType" label="设备类型" width="120" />
          <el-table-column prop="deviceNo" label="设备编号" width="150" />
          <el-table-column prop="location" label="安装位置" min-width="120" />
          <el-table-column prop="bindPersonnel" label="绑定人员编号" min-width="150" show-overflow-tooltip />
          <el-table-column label="在线状态" width="100" align="center">
            <template #default="{ row }">
              <span class="ap-status-tag" :class="row.online ? 'ap-tag-enabled' : 'ap-tag-disabled'">
                {{ row.online ? '在线' : '离线' }}
              </span>
            </template>
          </el-table-column>
          <el-table-column prop="updated_at" label="更新时间" width="170" />
          <el-table-column label="操作" width="140" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
              <el-button link type="danger" @click="handleDelete(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </section>
    </div>

    <el-dialog v-model="formVisible" :title="editingId ? '编辑设备' : '新增设备'" width="520px" destroy-on-close>
      <el-form ref="formRef" :model="formData" :rules="formRules" label-width="110px">
        <el-form-item label="设备名称" prop="name">
          <el-input v-model="formData.name" placeholder="请输入设备名称" />
        </el-form-item>
        <el-form-item label="设备类型" prop="deviceType">
          <el-select v-model="formData.deviceType" placeholder="请选择" style="width: 100%">
            <el-option v-for="opt in laborDeviceTypeOptions" :key="opt" :label="opt" :value="opt" />
          </el-select>
        </el-form-item>
        <el-form-item label="设备编号" prop="deviceNo">
          <el-input v-model="formData.deviceNo" placeholder="请输入设备编号" />
        </el-form-item>
        <el-form-item label="安装位置" prop="location">
          <el-input v-model="formData.location" placeholder="请输入安装位置" />
        </el-form-item>
        <el-form-item label="绑定人员编号">
          <el-input v-model="formData.bindPersonnel" placeholder="GPS 设备可绑定人员编号，考勤机可留空" />
        </el-form-item>
        <el-form-item label="在线状态">
          <el-switch v-model="formData.online" inline-prompt active-text="在线" inactive-text="离线" />
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
.device-page { padding: 20px 24px 32px; }
.page-breadcrumb { font-size: 13px; color: var(--ap-text-muted); margin-bottom: 4px; }
.page-heading { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 8px; }
.page-title { font-size: 20px; font-weight: 600; margin: 0; }
.page-scope, .page-tip { font-size: 13px; color: var(--ap-text-secondary); margin: 0 0 8px; }
.page-layout.with-tree { display: grid; grid-template-columns: 240px 1fr; gap: 16px; }
.project-tree-panel, .content-panel { border: 1px solid var(--ap-border); border-radius: 8px; background: #fff; padding: 16px; }
.panel-title { font-size: 14px; font-weight: 600; margin-bottom: 8px; }
.panel-head { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 8px; margin-bottom: 12px; }
.panel-stats { display: flex; flex-wrap: wrap; gap: 12px; font-size: 13px; color: var(--ap-text-secondary); }
.filter-bar { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 12px; }
</style>
