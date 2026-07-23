<script setup>
import { ref, computed, watch } from 'vue'
import { Search, Refresh, Plus } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useLaborProjectScope } from '../../composables/useCurrentProject'
import {
  projectTree,
  getProjectMonitorDevices,
  monitorDeviceTypeOptions,
  deviceStatusTagClass,
  emptyMonitorDeviceForm,
  getMonitorDeviceStats,
  responsiblePersonOptions,
} from '../../mock/majorHazard'

const { isHqSelected, treeProjectId, scopeProjectId, scopeProjectLabel, onTreeNodeClick } = useLaborProjectScope()
const keyword = ref('')
const filters = ref({ deviceType: '', status: '' })
const list = ref([])
const formVisible = ref(false)
const formRef = ref(null)
const formData = ref(emptyMonitorDeviceForm())
const editingId = ref('')
const formTab = ref('basic')

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
      const hay = `${row.name}${row.deviceNo}${row.location}${row.deviceType}`
      if (!hay.includes(kw)) return false
    }
    if (filters.value.deviceType && row.deviceType !== filters.value.deviceType) return false
    if (filters.value.status && row.status !== filters.value.status) return false
    return true
  })
})

const stats = computed(() => getMonitorDeviceStats(scopeProjectId.value))

const advancedVisible = ref(false)

const indicatorTypeMap = {
  '深基坑监测设备': ['水平位移', '竖向位移', '水位', '支撑轴力'],
  '地铁保护监测设备': ['沉降', '水平位移', '振动'],
  '高支模监测设备': ['沉降', '位移', '倾斜'],
}

const formRules = {
  deviceNo: [{ required: true, message: '请输入设备编号', trigger: 'blur' }],
  name: [{ required: true, message: '请输入设备名称', trigger: 'blur' }],
  deviceType: [{ required: true, message: '请选择设备类型', trigger: 'change' }],
  location: [{ required: true, message: '请输入安装位置', trigger: 'blur' }],
  monitorPoint: [{ required: true, message: '请输入监测点', trigger: 'blur' }],
}

function loadList() {
  list.value = getProjectMonitorDevices(scopeProjectId.value).map((row) => ({ ...row }))
}

watch(scopeProjectId, () => {
  keyword.value = ''
  filters.value = { deviceType: '' }
  loadList()
}, { immediate: true })

function handleReset() {
  keyword.value = ''
  filters.value = { deviceType: '' }
}

function openCreate() {
  editingId.value = ''
  formData.value = emptyMonitorDeviceForm()
  formVisible.value = true
}

function openEdit(row) {
  editingId.value = row.id
  formData.value = emptyMonitorDeviceForm(row)
  formVisible.value = true
}

async function handleSubmit() {
  await formRef.value.validate()
  const now = new Date()
  const fmtDatetime = now.toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-')
  const payload = {
    ...formData.value,
    projectId: scopeProjectId.value,
    updatedAt: fmtDatetime,
  }
  if (editingId.value) {
    const index = list.value.findIndex((item) => item.id === editingId.value)
    if (index !== -1) list.value[index] = { ...list.value[index], ...payload, id: editingId.value }
    ElMessage.success('设备信息已更新')
  } else {
    list.value.unshift({
      ...payload,
      id: `${scopeProjectId.value}-mdev-${Date.now()}`,
      lastMaintainDate: '',
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
      <div class="page-breadcrumb">危大工程监管 / 监测设备管理</div>
      <div class="page-heading">
        <h1 class="page-title">监测设备管理</h1>
        <el-button type="primary" class="ap-btn-primary" :icon="Plus" @click="openCreate">新增设备</el-button>
      </div>
      <p v-if="!isHqSelected" class="page-scope">当前项目：{{ scopeProjectLabel }}</p>
      <p class="page-tip">管理深基坑监测设备、地铁保护监测设备、高支模监测设备，维护设备信息与运行状态。</p>
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
            <span class="stat-normal">在线 {{ stats.online }} 台</span>
            <span class="stat-warning">离线 {{ stats.offline }} 台</span>
            <span class="stat-alert">故障 {{ stats.fault }} 台</span>
          </div>
        </div>

        <div class="filter-bar">
          <el-input v-model="keyword" placeholder="设备名称/编号/位置" clearable style="width: 220px" />
          <el-select v-model="filters.deviceType" placeholder="设备类型" clearable style="width: 160px">
            <el-option v-for="opt in monitorDeviceTypeOptions" :key="opt" :label="opt" :value="opt" />
          </el-select>
          <el-button class="ap-btn-primary" type="primary" :icon="Search">查询</el-button>
          <el-button :icon="Refresh" @click="handleReset">重置</el-button>
        </div>

        <el-table :data="filteredList" border stripe class="ap-table">
          <el-table-column type="index" label="序号" width="55" align="center" />
          <el-table-column prop="name" label="设备名称" min-width="140" />
          <el-table-column prop="deviceType" label="设备类型" width="140" />
          <el-table-column prop="deviceNo" label="设备编号" width="170" />
          <el-table-column prop="location" label="安装位置" min-width="150" show-overflow-tooltip />
          <el-table-column label="运行状态" width="90" align="center">
            <template #default="{ row }">
              <span class="ap-status-tag" :class="deviceStatusTagClass[row.status]">{{ row.status }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="lastMaintainDate" label="最近保养" width="110" align="center" />
          <el-table-column prop="nextMaintainDate" label="下次保养" width="110" align="center" />
          <el-table-column prop="updatedAt" label="更新时间" width="160" />
          <el-table-column label="操作" width="130" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
              <el-button link type="danger" @click="handleDelete(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </section>
    </div>

    <el-dialog v-model="formVisible" :title="editingId ? '编辑设备' : '新增设备'" width="640px" destroy-on-close>
      <el-tabs v-model="formTab" class="dialog-tabs">
        <el-tab-pane label="基本信息" name="basic">
          <el-form ref="formRef" :model="formData" :rules="formRules" label-width="120px">
            <el-form-item label="设备编号" prop="deviceNo">
              <el-input v-model="formData.deviceNo" placeholder="请输入设备编号" />
            </el-form-item>
            <el-form-item label="设备名称" prop="name">
              <el-input v-model="formData.name" placeholder="请输入设备名称" />
            </el-form-item>
            <el-form-item label="设备类型" prop="deviceType">
              <el-select v-model="formData.deviceType" placeholder="请选择" style="width: 100%">
                <el-option v-for="opt in monitorDeviceTypeOptions" :key="opt" :label="opt" :value="opt" />
              </el-select>
            </el-form-item>
            <el-form-item label="安装位置" prop="location">
              <el-input v-model="formData.location" placeholder="请输入安装位置" />
            </el-form-item>
            <el-form-item label="监测点" prop="monitorPoint">
              <el-input v-model="formData.monitorPoint" placeholder="请输入监测点编号，如：JK-01-01" />
            </el-form-item>
            <el-form-item label="备注">
              <el-input v-model="formData.remark" type="textarea" :rows="2" placeholder="可选" />
            </el-form-item>
          </el-form>
        </el-tab-pane>
        <el-tab-pane label="告警配置" name="alarm-config">
          <el-form label-width="120px">
            <el-form-item label="监测指标" prop="monitorIndicator">
              <el-select v-model="formData.monitorIndicator" placeholder="请选择监测指标" style="width: 100%">
                <el-option
                  v-for="opt in (indicatorTypeMap[formData.deviceType] || [])"
                  :key="opt"
                  :label="opt"
                  :value="opt"
                />
              </el-select>
            </el-form-item>
            <template v-if="formData.monitorIndicator">
              <el-form-item :label="`${formData.monitorIndicator}·预警阈值`" prop="warningThreshold">
                <el-input v-model="formData.warningThreshold" placeholder="接近此值时触发预警">
                  <template #append>%</template>
                </el-input>
                <div class="form-tip">占超限阈值的百分比，如80表示达到超限值的80%时触发预警</div>
              </el-form-item>
              <el-form-item :label="`${formData.monitorIndicator}·超限阈值`" prop="alertThreshold">
                <el-input v-model="formData.alertThreshold" placeholder="超出此值触发超限告警">
                  <template #append>%</template>
                </el-input>
              </el-form-item>
            </template>
            <el-divider />
            <el-form-item label="推送人员">
              <el-select v-model="formData.pushTargets" multiple collapse-tags filterable style="width: 100%">
                <el-option
                  v-for="opt in responsiblePersonOptions"
                  :key="opt.label"
                  :label="`${opt.label}（${opt.phone}）`"
                  :value="opt.label"
                />
              </el-select>
            </el-form-item>
            <el-form-item label="推送间隔">
              <el-input-number v-model="formData.pushInterval" :min="5" :max="1440" :step="5" style="width: 200px">
                <template #suffix>分钟</template>
              </el-input-number>
            </el-form-item>
            <el-form-item label="督办时限">
              <el-input-number v-model="formData.supervisionDeadline" :min="1" :max="168" :step="1" style="width: 200px">
                <template #suffix>小时</template>
              </el-input-number>
              <div class="form-tip">告警推送后未处置超过此时限自动升级督办</div>
            </el-form-item>
          </el-form>
        </el-tab-pane>
      </el-tabs>
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
.panel-stats .stat-normal { color: var(--ap-success); }
.panel-stats .stat-warning { color: var(--ap-warning); }
.panel-stats .stat-alert { color: var(--ap-danger); font-weight: 600; }
.filter-bar { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 12px; }
.form-tip { font-size: 12px; color: var(--ap-text-muted); margin-top: 4px; line-height: 1.4; }
.dialog-tabs { margin-top: -8px; }
:deep(.dialog-tabs .el-tabs__header) { margin-bottom: 12px; }
</style>
