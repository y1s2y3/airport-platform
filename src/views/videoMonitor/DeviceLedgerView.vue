<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Search, Refresh, Download } from '@element-plus/icons-vue'
import { useCurrentProject } from '../../composables/useCurrentProject'
import {
  ACCESS_TYPE_OPTIONS,
  DEVICE_TYPE_OPTIONS,
  BUSINESS_STATUS_OPTIONS,
  USAGE_OPTIONS,
  AREA_OPTIONS,
  getProjectVideoDevices,
  getDeviceLedgerStats,
  saveProjectVideoDevice,
  removeProjectVideoDevices,
  emptyVideoDevice,
  VIDEO_DEVICE_CHANGE_EVENT,
  ensureVideoDeviceLedgerSeed,
} from '../../coc/utils/videoDeviceLedgerStorage.js'

defineProps({
  title: { type: String, default: '设备台账' },
  description: { type: String, default: '' },
})

const { selectedProjectId, headerProjectLabel } = useCurrentProject()
const list = ref([])
const selectedIds = ref([])
const filters = ref({
  accessType: '',
  keyword: '',
  deviceType: '',
})
const formVisible = ref(false)
const formMode = ref('create')
const form = ref(emptyVideoDevice())

const stats = computed(() => getDeviceLedgerStats(list.value))

const parentDeviceOptions = computed(() => {
  const names = new Set(
    list.value
      .map((d) => d.parentDevice || `${headerProjectLabel.value}-NVR-01`)
      .filter(Boolean),
  )
  names.add(`${headerProjectLabel.value}-NVR-01`)
  return [...names]
})

const filtered = computed(() => {
  return list.value.filter((row) => {
    if (filters.value.accessType && row.accessType !== filters.value.accessType) return false
    if (filters.value.deviceType && row.deviceType !== filters.value.deviceType) return false
    const q = filters.value.keyword.trim()
    if (!q) return true
    return [row.deviceName, row.deviceId, row.channelId].some((f) => String(f || '').includes(q))
  })
})

function load() {
  ensureVideoDeviceLedgerSeed()
  list.value = getProjectVideoDevices(selectedProjectId.value)
  selectedIds.value = []
}

function handleSearch() {
  /* filtered is computed */
}

function handleReset() {
  filters.value = { accessType: '', keyword: '', deviceType: '' }
}

function openCreate() {
  formMode.value = 'create'
  form.value = emptyVideoDevice({
    accessType: 'GB28181',
    supportPtz: true,
    businessStatus: '启用',
    deviceStatus: '未激活',
    parentDevice: `${headerProjectLabel.value}-NVR-01`,
  })
  formVisible.value = true
}

function openEdit(row) {
  formMode.value = 'edit'
  form.value = emptyVideoDevice(row)
  formVisible.value = true
}

function validateForm() {
  if (!form.value.accessType) {
    ElMessage.warning('请选择接入类型')
    return false
  }
  if (!form.value.deviceId?.trim()) {
    ElMessage.warning('请填写设备ID')
    return false
  }
  if (!form.value.channelId?.trim()) {
    ElMessage.warning('请填写通道ID')
    return false
  }
  if (!form.value.deviceType) {
    ElMessage.warning('请选择设备类型')
    return false
  }
  if (!form.value.parentDevice) {
    ElMessage.warning('请选择父级设备')
    return false
  }
  if (!form.value.deviceName?.trim()) {
    ElMessage.warning('请填写设备名称')
    return false
  }
  if (form.value.supportPtz == null) {
    ElMessage.warning('请选择是否支持云台操作')
    return false
  }
  if (!form.value.businessStatus) {
    ElMessage.warning('请选择业务状态')
    return false
  }
  const duplicated = list.value.some(
    (row) =>
      row.deviceName === form.value.deviceName.trim() &&
      row.id !== form.value.id,
  )
  if (duplicated) {
    ElMessage.warning('设备名称不可重复')
    return false
  }
  return true
}

function submitForm() {
  if (!validateForm()) return
  saveProjectVideoDevice(selectedProjectId.value, {
    ...form.value,
    deviceName: form.value.deviceName.trim(),
    deviceId: form.value.deviceId.trim(),
    channelId: form.value.channelId.trim(),
    application: form.value.usage || form.value.application,
    deviceStatus:
      formMode.value === 'create'
        ? form.value.deviceStatus || '未激活'
        : form.value.deviceStatus,
  })
  load()
  formVisible.value = false
  ElMessage.success(formMode.value === 'create' ? '设备已接入' : '设备已更新')
}

async function handleDelete(row) {
  try {
    await ElMessageBox.confirm(`确定删除设备「${row.deviceName}」？`, '提示', { type: 'warning' })
    removeProjectVideoDevices(selectedProjectId.value, [row.id])
    load()
    ElMessage.success('已删除')
  } catch {
    /* cancelled */
  }
}

function handleExport() {
  ElMessage.success(`已导出当前筛选 ${filtered.value.length} 条设备台账（演示）`)
}

function handleBatchAdd() {
  ElMessage.info('批量添加：请使用模板导入（演示）')
}

function statusTagType(status) {
  if (status === '在线') return 'success'
  if (status === '离线') return 'info'
  return 'warning'
}

watch(selectedProjectId, () => {
  handleReset()
  load()
})

onMounted(() => {
  load()
  window.addEventListener(VIDEO_DEVICE_CHANGE_EVENT, load)
})

onUnmounted(() => {
  window.removeEventListener(VIDEO_DEVICE_CHANGE_EVENT, load)
})
</script>

<template>
  <div class="ledger-page">
    <div class="stat-cards">
      <div class="stat-card">
        <div class="stat-label">设备总数</div>
        <div class="stat-value">
          <strong>{{ stats.total }}</strong><span>台</span>
        </div>
      </div>
      <div class="stat-card rate-card">
        <div class="rate-left">
          <div class="stat-label">设备在线率</div>
          <div class="rate-ring" :style="{ '--rate': `${stats.onlineRate}%` }">
            <span>{{ stats.onlineRate }}%</span>
          </div>
        </div>
        <div class="rate-right">
          <div class="rate-row"><i class="dot on" />设备在线数量 <b>{{ stats.online }}</b> 台</div>
          <div class="rate-row"><i class="dot off" />设备离线数量 <b>{{ stats.offline }}</b> 台</div>
          <div class="rate-row"><i class="dot idle" />设备未激活数量 <b>{{ stats.inactive }}</b> 台</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-label">设备类型</div>
        <div class="stat-value">
          <strong>{{ stats.typeCount }}</strong><span>类</span>
        </div>
      </div>
    </div>

    <div class="filter-bar">
      <div class="filter-item">
        <span class="filter-label">接入类型</span>
        <el-select v-model="filters.accessType" clearable placeholder="请选择接入类型" style="width: 180px">
          <el-option
            v-for="opt in ACCESS_TYPE_OPTIONS"
            :key="opt.value"
            :label="opt.label"
            :value="opt.value"
          />
        </el-select>
      </div>
      <div class="filter-item">
        <span class="filter-label">设备名称/设备ID</span>
        <el-input
          v-model="filters.keyword"
          clearable
          placeholder="请输入"
          style="width: 200px"
        />
      </div>
      <div class="filter-item">
        <span class="filter-label">设备类型</span>
        <el-select v-model="filters.deviceType" clearable placeholder="请选择设备类型" style="width: 160px">
          <el-option
            v-for="opt in DEVICE_TYPE_OPTIONS"
            :key="opt.value"
            :label="opt.label"
            :value="opt.value"
          />
        </el-select>
      </div>
      <el-button type="primary" :icon="Search" @click="handleSearch">搜索</el-button>
      <el-button :icon="Refresh" @click="handleReset">重置</el-button>
    </div>

    <div class="table-toolbar">
      <span class="total-text">共 {{ filtered.length }} 条</span>
      <div class="toolbar-actions">
        <el-button type="primary" :icon="Plus" @click="openCreate">新增</el-button>
        <el-button @click="handleBatchAdd">批量添加</el-button>
        <el-button :icon="Download" @click="handleExport">导出</el-button>
      </div>
    </div>

    <el-table
      :data="filtered"
      border
      stripe
      empty-text="暂无设备"
      @selection-change="(rows) => (selectedIds = rows.map((r) => r.id))"
    >
      <el-table-column type="selection" width="48" align="center" />
      <el-table-column type="index" label="序号" width="60" align="center" />
      <el-table-column prop="deviceId" label="设备ID" min-width="130" show-overflow-tooltip />
      <el-table-column prop="deviceName" label="设备名称" min-width="160" show-overflow-tooltip />
      <el-table-column prop="deviceType" label="设备类型" width="90" align="center" />
      <el-table-column label="设备状态" width="96" align="center">
        <template #default="{ row }">
          <el-tag size="small" :type="statusTagType(row.deviceStatus)">{{ row.deviceStatus }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="businessStatus" label="业务状态" width="90" align="center" />
      <el-table-column prop="application" label="应用" width="110" show-overflow-tooltip />
      <el-table-column prop="area" label="区域" width="100" show-overflow-tooltip />
      <el-table-column prop="vendor" label="厂商" width="100" show-overflow-tooltip />
      <el-table-column prop="createdAt" label="创建时间" width="170" sortable />
      <el-table-column label="操作" width="120" fixed="right" align="center">
        <template #default="{ row }">
          <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
          <el-button link type="danger" @click="handleDelete(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 设备接入 -->
    <el-dialog
      v-model="formVisible"
      :title="formMode === 'create' ? '设备接入' : '编辑设备'"
      width="880px"
      destroy-on-close
      class="device-access-dialog"
    >
      <el-form label-position="top" class="access-form">
        <div class="form-section">
          <div class="section-title">接入类型</div>
          <el-form-item label="接入类型" required>
            <el-select v-model="form.accessType" placeholder="请选择" style="width: 100%">
              <el-option
                v-for="opt in ACCESS_TYPE_OPTIONS"
                :key="opt.value"
                :label="opt.label"
                :value="opt.value"
              />
            </el-select>
          </el-form-item>
        </div>

        <div class="form-section">
          <div class="section-title">设备信息</div>
          <div class="form-grid">
            <el-form-item label="设备ID" required>
              <el-input v-model="form.deviceId" placeholder="请输入" />
            </el-form-item>
            <el-form-item label="通道ID" required>
              <el-input v-model="form.channelId" placeholder="请输入" />
            </el-form-item>
            <el-form-item label="设备类型" required>
              <el-select v-model="form.deviceType" placeholder="请选择" style="width: 100%">
                <el-option
                  v-for="opt in DEVICE_TYPE_OPTIONS"
                  :key="opt.value"
                  :label="opt.label"
                  :value="opt.value"
                />
              </el-select>
            </el-form-item>
            <el-form-item label="父级设备" required>
              <el-select v-model="form.parentDevice" placeholder="请选择" filterable style="width: 100%">
                <el-option v-for="name in parentDeviceOptions" :key="name" :label="name" :value="name" />
              </el-select>
            </el-form-item>
            <el-form-item label="设备名称" required class="span-2">
              <el-input v-model="form.deviceName" placeholder="请输入 (不可重复)" />
            </el-form-item>
          </div>
        </div>

        <div class="form-section">
          <div class="section-title">其他信息</div>
          <div class="form-grid">
            <el-form-item label="是否支持云台操作" required>
              <el-radio-group v-model="form.supportPtz">
                <el-radio :value="true">支持</el-radio>
                <el-radio :value="false">不支持</el-radio>
              </el-radio-group>
            </el-form-item>
            <el-form-item label="业务状态" required>
              <el-select v-model="form.businessStatus" placeholder="请选择" style="width: 100%">
                <el-option
                  v-for="opt in BUSINESS_STATUS_OPTIONS"
                  :key="opt.value"
                  :label="opt.label"
                  :value="opt.value"
                />
              </el-select>
            </el-form-item>
            <el-form-item label="厂商">
              <el-input v-model="form.vendor" placeholder="请输入" />
            </el-form-item>
            <el-form-item label="区域">
              <el-select v-model="form.area" clearable placeholder="请选择" style="width: 100%">
                <el-option
                  v-for="opt in AREA_OPTIONS"
                  :key="opt.value"
                  :label="opt.label"
                  :value="opt.value"
                />
              </el-select>
            </el-form-item>
            <el-form-item label="用途">
              <el-select v-model="form.usage" clearable placeholder="请选择" style="width: 100%">
                <el-option
                  v-for="opt in USAGE_OPTIONS"
                  :key="opt.value"
                  :label="opt.label"
                  :value="opt.value"
                />
              </el-select>
            </el-form-item>
            <el-form-item label="备注" class="span-2">
              <el-input v-model="form.remark" type="textarea" :rows="3" placeholder="请输入" />
            </el-form-item>
          </div>
        </div>
      </el-form>
      <template #footer>
        <el-button @click="formVisible = false">取消</el-button>
        <el-button type="primary" @click="submitForm">提交</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.ledger-page {
  background: #fff;
  border: 1px solid var(--ap-border, #e4e7ed);
  border-radius: 8px;
  padding: 16px 20px 24px;
}

.stat-cards {
  display: grid;
  grid-template-columns: 1fr 1.6fr 1fr;
  gap: 16px;
  margin-bottom: 18px;
}

.stat-card {
  border: 1px solid #ebeef5;
  border-radius: 8px;
  padding: 16px 20px;
  background: linear-gradient(180deg, #fcfcfd 0%, #fff 100%);
  min-height: 110px;
}

.stat-label {
  font-size: 13px;
  color: #909399;
  margin-bottom: 12px;
}

.stat-value {
  display: flex;
  align-items: baseline;
  gap: 6px;
}

.stat-value strong {
  font-size: 32px;
  font-weight: 600;
  color: #303133;
  line-height: 1;
}

.stat-value span {
  font-size: 14px;
  color: #909399;
}

.rate-card {
  display: flex;
  align-items: center;
  gap: 24px;
}

.rate-ring {
  --rate: 0%;
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: conic-gradient(#409eff var(--rate), #ebeef5 0);
  display: grid;
  place-items: center;
  margin-top: 4px;
}

.rate-ring::before {
  content: '';
  position: absolute;
  width: 54px;
  height: 54px;
  border-radius: 50%;
  background: #fff;
}

.rate-ring {
  position: relative;
}

.rate-ring span {
  position: relative;
  z-index: 1;
  font-size: 14px;
  font-weight: 600;
  color: #303133;
}

.rate-right {
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 13px;
  color: #606266;
}

.rate-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.rate-row b {
  color: #303133;
  margin: 0 2px;
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
}

.dot.on {
  background: #67c23a;
}

.dot.off {
  background: #909399;
}

.dot.idle {
  background: #e6a23c;
}

.filter-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 12px 16px;
  margin-bottom: 12px;
}

.filter-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.filter-label {
  font-size: 13px;
  color: #606266;
}

.table-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.total-text {
  font-size: 13px;
  color: #606266;
}

.toolbar-actions {
  display: flex;
  gap: 8px;
}

.form-section {
  margin-bottom: 8px;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 12px;
  padding-left: 10px;
  border-left: 3px solid #409eff;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0 16px;
}

.form-grid .span-2 {
  grid-column: span 2;
}

.access-form :deep(.el-form-item) {
  margin-bottom: 14px;
}

@media (max-width: 1100px) {
  .stat-cards {
    grid-template-columns: 1fr;
  }

  .form-grid {
    grid-template-columns: 1fr 1fr;
  }
}
</style>
