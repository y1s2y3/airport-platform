<script setup>
import { ref, computed, watch } from 'vue'
import { Search, Plus } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useLaborProjectScope } from '../../composables/useCurrentProject'
import { projectTree, getAllDevices, emptyDeviceForm, saveDevice, removeDevice, getDeviceStats } from '../../mock/majorHazard'

const { isHqSelected, treeProjectId, scopeProjectId, scopeProjectLabel, onTreeNodeClick } = useLaborProjectScope()
const isReadOnly = computed(() => isHqSelected.value)

const keyword = ref('')
const filterStatus = ref('')
const filterDeviceType = ref('')
const list = ref([])
const formVisible = ref(false)
const isEdit = ref(false)
const form = ref(emptyDeviceForm())
const editingId = ref('')

const devTypeOptions = ['深基坑监测设备', '地铁铁路安全监管监测设备', '高支模监测设备']

const treeData = computed(() =>
  projectTree.map((g) => ({ id: g.id, label: g.label, children: g.children?.map((c) => ({ id: c.id, label: c.label.replace(/\(\d+\)$/, '') })) }))
)

const stats = computed(() => {
  const all = list.value
  return {
    total: all.length,
    online: all.filter(d => d.online).length,
    offline: all.filter(d => !d.online).length,
  }
})

const filteredList = computed(() => {
  let l = list.value
  const kw = keyword.value.trim()
  if (kw) l = l.filter(d => `${d.name}${d.deviceNo}${d.regionName}${d.deviceType}`.includes(kw))
  if (filterStatus.value === 'online') l = l.filter(d => d.online)
  if (filterStatus.value === 'offline') l = l.filter(d => !d.online)
  if (filterDeviceType.value) l = l.filter(d => d.deviceType === filterDeviceType.value)
  return l
})

function load() {
  list.value = getAllDevices(scopeProjectId.value)
}

watch(scopeProjectId, () => { keyword.value = ''; filterStatus.value = ''; filterDeviceType.value = ''; load() }, { immediate: true })

function openAdd() {
  isEdit.value = false; editingId.value = ''
  form.value = emptyDeviceForm()
  formVisible.value = true
}

function openEdit(row) {
  isEdit.value = true; editingId.value = row.id
  form.value = emptyDeviceForm(row)
  formVisible.value = true
}

function saveForm() {
  if (!form.value.name) { ElMessage.warning('请输入设备名称'); return }
  if (!form.value.deviceNo) { ElMessage.warning('请输入设备SN'); return }
  if (!form.value.deviceType) { ElMessage.warning('请选择设备类型'); return }
  saveDevice({ ...form.value, id: editingId.value, projectId: scopeProjectId.value }, isEdit.value)
  ElMessage.success(isEdit.value ? '设备信息已更新' : '设备已添加')
  formVisible.value = false
  load()
}

function handleDelete(row) {
  ElMessageBox.confirm(`确认解绑设备「${row.name}」？`, '提示', { type: 'warning' }).then(() => {
    removeDevice(row.id); ElMessage.success('已解绑'); load()
  }).catch(() => {})
}

function resetFilter() { keyword.value = ''; filterStatus.value = ''; filterDeviceType.value = '' }
</script>

<template>
  <div class="page page-card">
    <div class="page-header">
      <div class="page-breadcrumb">危大工程监测 / 设备绑定</div>
      <div class="page-heading">
        <h1 class="page-title">设备绑定</h1>
        <el-button type="primary" class="ap-btn-primary" :icon="Plus" @click="openAdd" v-if="!isReadOnly">新增设备</el-button>
      </div>
      <p v-if="!isHqSelected" class="page-scope">当前项目：{{ scopeProjectLabel }}</p>
      <p class="page-tip">管理监测设备台账，将设备绑定至监测区域。设备在线状态由物联网系统自动同步。</p>
    </div>

    <div class="page-layout" :class="{ 'with-tree': isHqSelected }">
      <aside v-if="isHqSelected" class="project-tree-panel">
        <div class="panel-title">项目列表</div>
        <el-tree :data="treeData" node-key="id" highlight-current default-expand-all
          :current-node-key="treeProjectId" :expand-on-click-node="false" class="project-tree"
          @node-click="onTreeNodeClick" />
      </aside>

      <section class="content-panel">
        <div class="panel-head">
          <div v-if="isHqSelected" class="panel-title">{{ scopeProjectLabel || '请选择项目' }}</div>
          <div class="panel-stats">
            <span>设备 <b>{{ stats.total }}</b> 台</span>
            <span class="stat-normal">在线 <b>{{ stats.online }}</b> 台</span>
            <span class="stat-alert">离线 <b>{{ stats.offline }}</b> 台</span>
          </div>
        </div>

        <div class="filter-bar">
          <el-input v-model="keyword" placeholder="设备名称/编号/区域/类型" clearable style="width: 240px" :prefix-icon="Search" />
          <el-select v-model="filterDeviceType" placeholder="设备类型" clearable style="width: 180px">
            <el-option v-for="t in devTypeOptions" :key="t" :label="t" :value="t" />
          </el-select>
          <el-select v-model="filterStatus" placeholder="在线状态" clearable style="width: 110px">
            <el-option label="在线" value="online" /><el-option label="离线" value="offline" />
          </el-select>
          <el-button @click="resetFilter">重置</el-button>
        </div>

        <el-table :data="filteredList" border stripe class="ap-table" style="width:100%">
          <el-table-column type="index" label="序号" width="50" align="center" />
          <el-table-column prop="name" label="设备名称" min-width="140" />
          <el-table-column prop="deviceNo" label="设备SN" min-width="120" />
          <el-table-column prop="deviceType" label="设备类型" width="160" />
          <el-table-column prop="regionName" label="所属区域" min-width="150" show-overflow-tooltip />
          <el-table-column prop="contact" label="联系人" width="75" align="center" />
          <el-table-column prop="contactPhone" label="联系电话" width="105" align="center" />
          <el-table-column label="在线状态" width="70" align="center">
            <template #default="{ row }">
              <span class="ap-status-tag" :class="row.online ? 'ap-tag-enabled' : 'ap-tag-disabled'">{{ row.online ? '在线' : '离线' }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="bindTime" label="绑定时间" width="100" align="center" />
          <el-table-column prop="lastOnlineTime" label="最后在线时间" width="155" />
          <el-table-column label="操作" width="110" align="center">
            <template #default="{ row }">
              <el-button link type="primary" size="small" @click="openEdit(row)" v-if="!isReadOnly">编辑</el-button>
              <el-button link type="danger" size="small" @click="handleDelete(row)" v-if="!isReadOnly">解绑</el-button>
            </template>
          </el-table-column>
        </el-table>
      </section>
    </div>

    <el-dialog v-model="formVisible" :title="isEdit ? '编辑设备' : '新增设备'" width="500px" :close-on-click-modal="false">
      <el-form :model="form" label-width="110px">
        <el-form-item label="设备名称" required><el-input v-model="form.name" placeholder="请输入设备名称" /></el-form-item>
        <el-form-item label="设备SN" required><el-input v-model="form.deviceNo" placeholder="请输入设备SN" /></el-form-item>
        <el-form-item label="设备类型" required>
          <el-select v-model="form.deviceType" placeholder="请选择" style="width:100%">
            <el-option v-for="t in devTypeOptions" :key="t" :label="t" :value="t" />
          </el-select>
        </el-form-item>
        <el-form-item label="所属区域">
          <el-input v-model="form.regionName" placeholder="可选：请输入设备所在区域" />
        </el-form-item>
        <el-form-item label="联系人">
          <el-input v-model="form.contact" placeholder="可选：请输入设备联系人" />
        </el-form-item>
        <el-form-item label="联系电话">
          <el-input v-model="form.contactPhone" placeholder="可选：请输入联系人电话" />
        </el-form-item>
        <el-form-item label="备注"><el-input v-model="form.remark" type="textarea" :rows="2" placeholder="可选" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="formVisible = false">取消</el-button>
        <el-button type="primary" class="ap-btn-primary" @click="saveForm">{{ isEdit ? '保存' : '确认绑定' }}</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.page { padding: 20px 24px 32px; }
.page-breadcrumb { font-size: 13px; color: var(--ap-text-muted); margin-bottom: 4px; }
.page-heading { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 8px; }
.page-title { font-size: 20px; font-weight: 600; margin: 0; }
.page-scope, .page-tip { font-size: 13px; color: var(--ap-text-secondary); margin: 0 0 8px; }
.page-layout.with-tree { display: grid; grid-template-columns: 240px 1fr; gap: 16px; }
.project-tree-panel, .content-panel { border: 1px solid var(--ap-border); border-radius: 8px; background: #fff; padding: 16px; }
.panel-title { font-size: 14px; font-weight: 600; margin-bottom: 8px; }
.panel-head { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 8px; margin-bottom: 12px; }
.panel-stats { display: flex; flex-wrap: wrap; gap: 12px; font-size: 13px; color: var(--ap-text-secondary); }
.panel-stats .stat-normal { color: var(--ap-success); }
.panel-stats .stat-alert { color: var(--ap-danger); }
.filter-bar { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 12px; align-items: center; }
.project-tree { font-size: 13px; }
.project-tree :deep(.el-tree-node__content) { height: 36px; }
.project-tree :deep(.el-tree-node.is-current > .el-tree-node__content) { background: #fceef4; color: var(--ap-primary); font-weight: 600; }
</style>
