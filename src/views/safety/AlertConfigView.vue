<script setup>
import { ref, reactive, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search } from '@element-plus/icons-vue'
import { useRouter } from 'vue-router'
import { useLaborProjectScope } from '../../composables/useCurrentProject'
import { projectTree } from '../../mock/laborRealName.js'

const router = useRouter()
const { isHqSelected, treeProjectId, onTreeNodeClick: _treeClick } = useLaborProjectScope()
const treeSearch = ref('')
const localProjectId = ref('')

function handleTreeNodeClick(data) {
  if (data.id === 'hq') { localProjectId.value = ''; treeProjectId.value = data.id }
  else { localProjectId.value = data.id; _treeClick(data) }
}

const treeDataWithCount = computed(() => {
  if (!isHqSelected.value) return []
  const root = projectTree[0]
  const children = root.children.map(node => {
    const count = configData.value.filter(d => d.project_id === node.id).length
    const label = treeSearch.value ? (node.label.includes(treeSearch.value) ? `${node.label}（${count}）` : '') : `${node.label}（${count}）`
    return { ...node, label, _visible: !treeSearch.value || node.label.includes(treeSearch.value) }
  }).filter(n => n._visible)
  return [{ ...root, label: treeSearch.value ? '搜索结果' : root.label, children }]
})

const alertTypeOptions = ['塔吊告警', '升降机告警', '桩基告警', '复合地基告警', '高支模监测', '深基坑监测']

const configData = ref([
  {
    alertType: '塔吊告警',
    deviceName: '塔吊QTZ160（#1）',
    project_id: 'p-000',
    handler: '王工',
    enabled: true,
    updateBy: '系统管理员',
    updateTime: '2026-07-20 11:24:56',
  },
  {
    alertType: '塔吊告警',
    deviceName: '塔吊QTZ80（#7）',
    project_id: 'p-003',
    handler: '李工',
    enabled: true,
    updateBy: '系统管理员',
    updateTime: '2026-07-20 11:24:56',
  },
  {
    alertType: '升降机告警',
    deviceName: '升降机SC200（#2）',
    project_id: 'p-000',
    handler: '张工',
    enabled: true,
    updateBy: '系统管理员',
    updateTime: '2026-07-20 11:24:56',
  },
  {
    alertType: '高支模监测',
    deviceName: '高支模检测设备01',
    project_id: 'p-000',
    handler: '唐美丽、王也',
    enabled: true,
    updateBy: '系统管理员',
    updateTime: '2026-07-20 11:24:56',
  },
  {
    alertType: '高支模监测',
    deviceName: '高支模检测设备02',
    project_id: 'p-000',
    handler: '唐美丽',
    enabled: true,
    updateBy: '系统管理员',
    updateTime: '2026-07-20 11:24:56',
  },
  {
    alertType: '桩基告警',
    deviceName: '桩基钻孔机#5',
    project_id: 'p-000',
    handler: '赵工',
    enabled: false,
    updateBy: '王工',
    updateTime: '2026-05-13 16:23:51',
  },
])

const filterForm = reactive({ keyword: '', alertType: '' })

const filteredData = computed(() => {
  return configData.value.filter(d => {
    if (filterForm.alertType && d.alertType !== filterForm.alertType) return false
    if (filterForm.keyword && !d.deviceName.includes(filterForm.keyword) && !d.alertType.includes(filterForm.keyword)) return false
    return true
  })
})

// 编辑弹窗
const dialogVisible = ref(false)
const dialogTitle = ref('')
const editForm = reactive({
  alertType: '',
  deviceName: '',
  handler: '',
  enabled: true,
})

function openAdd() { router.push('/machine-supervise/alert-config/add') }

function openEdit(row) {
  router.push({ path: '/machine-supervise/alert-config/add', query: { type: row.alertType, device: row.deviceName, handler: row.handler, enabled: row.enabled ? '1' : '0' } })
}

function viewDetail(row) {
  router.push({ path: '/machine-supervise/alert-config/add', query: { type: row.alertType, device: row.deviceName, handler: row.handler, enabled: row.enabled ? '1' : '0', readonly: '1' } })
}

function saveConfig() {
  if (!editForm.alertType || !editForm.deviceName) {
    ElMessage.warning('请填写完整信息')
    return
  }
  ElMessage.success('配置已保存')
  dialogVisible.value = false
}

function deleteConfig(row, idx) {
  ElMessageBox.confirm(`确认删除 "${row.deviceName}" 的告警配置？`, '提示', {
    confirmButtonText: '确认', cancelButtonText: '取消', type: 'warning'
  }).then(() => {
    configData.value.splice(idx, 1)
    ElMessage.success('已删除')
  }).catch(() => {})
}

function handleReset() { filterForm.keyword = ''; filterForm.alertType = '' }
</script>

<template>
  <div class="page">
    <div class="page-layout">
      <aside v-if="isHqSelected" class="tree-panel">
        <div class="panel-title">项目列表</div>
        <el-input v-model="treeSearch" placeholder="搜索项目..." clearable size="small" style="margin-bottom:8px" :prefix-icon="Search" aria-label="搜索项目..."/>
        <el-tree :data="treeDataWithCount" node-key="id" highlight-current default-expand-all :current-node-key="localProjectId || 'hq'" :expand-on-click-node="false" class="project-tree" @node-click="handleTreeNodeClick" />
      </aside>
      <div class="page-panel">
    <div class="page-head">
      <h3 class="page-title">告警配置</h3>
      <span class="total-count">共 {{ filteredData.length }} 条</span>
      
    </div>
    <div class="filter-bar">
      <el-select v-model="filterForm.alertType" placeholder="告警类型" clearable style="width:130px" aria-label="告警类型">
        <el-option v-for="t in alertTypeOptions" :key="t" :label="t" :value="t" />
      </el-select>
      <el-input v-model="filterForm.keyword" placeholder="搜索设备名称..." clearable style="width:220px" :prefix-icon="Search" aria-label="搜索设备名称..."/>
      <el-button @click="handleReset">重置</el-button>
      <el-button v-if="!isHqSelected" @click="openAdd" style="background:#8F0045;border-color:#8F0045;color:#fff">新增告警配置</el-button>
    </div>

    <el-table :data="filteredData" stripe border style="width:100%" class="data-table">
      <el-table-column type="index" label="序号" width="55" align="center" />
      <el-table-column prop="alertType" label="告警类型"  align="center" />
      <el-table-column prop="deviceName" label="设备名称" min- />
      <el-table-column prop="handler" label="处理人"  align="center" />
      <el-table-column label="是否启用" width="80" align="center">
        <template #default="{ row }">
          <el-tag :type="row.enabled ? 'success' : 'danger'" size="small" effect="plain">{{ row.enabled ? '是' : '否' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="updateBy" label="更新人"  align="center" />
      <el-table-column prop="updateTime" label="更新时间"  align="center" />
      <el-table-column label="操作" width="150" align="center">
        <template #default="{ row, $index }">
          <el-button link type="primary" size="small" @click="viewDetail(row)">详情</el-button>
          <el-button v-if="!isHqSelected" link type="primary" size="small" @click="openEdit(row)">编辑</el-button>
          <el-button v-if="!isHqSelected" link type="danger" size="small" @click="deleteConfig(row, $index)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="500px" :close-on-click-modal="false">
      <el-form :model="editForm" label-width="90px">
        <el-form-item label="告警类型" required>
          <el-select v-model="editForm.alertType" placeholder="请选择告警类型" style="width:100%" aria-label="请选择告警类型">
            <el-option v-for="t in alertTypeOptions" :key="t" :label="t" :value="t" />
          </el-select>
        </el-form-item>
        <el-form-item label="设备名称" required>
          <el-input v-model="editForm.deviceName" placeholder="请输入设备名称" aria-label="请输入设备名称"/>
        </el-form-item>
        <el-form-item label="处理人">
          <el-select v-model="editForm.handler" placeholder="请选择处理人" style="width:100%" aria-label="请选择处理人">
            <el-option label="王工" value="王工" />
            <el-option label="李工" value="李工" />
            <el-option label="张工" value="张工" />
            <el-option label="赵工" value="赵工" />
            <el-option label="唐美丽" value="唐美丽" />
            <el-option label="王也" value="王也" />
            <el-option label="系统管理员" value="系统管理员" />
          </el-select>
        </el-form-item>
        <el-form-item label="是否启用">
          <el-switch v-model="editForm.enabled" active-text="是" inactive-text="否" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveConfig">保存</el-button>
      </template>
    </el-dialog>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page { padding:0; }
.page-head { display:flex; align-items:center; gap:12px; margin-bottom:16px; }
.page-title { font-size:18px; font-weight:600; color:#1f2329; margin:0; }
.total-count { font-size:12px; color:#999; margin-right:auto; }
.filter-bar { display:flex; gap:12px; margin-bottom:16px; flex-wrap:wrap; align-items:center; }
.data-table { font-size:13px; }
.page-layout { display:flex; gap:0; width:100%; }
.page-panel { flex:1; min-width:0; }
.tree-panel { width:220px; flex-shrink:0; margin-right:20px; }
.panel-title { font-size:14px; font-weight:600; color:#1f2329; margin-bottom:8px; }
.project-tree { font-size:13px; }

.el-table { width:100% !important; }
.el-table__header-wrapper table, .el-table__body-wrapper table { table-layout:fixed; width:100% !important; }
.el-form-item__label::before {
  content: '' !important;
}
.el-form-item.is-required .el-form-item__label::after {
  content: '*';
  color: #e74c3c;
  margin-left: 4px;
  font-weight: bold;
}
</style>
