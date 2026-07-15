<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Plus,
  Edit,
  Delete,
  Search,
  Refresh,
  CirclePlus,
} from '@element-plus/icons-vue'
import { useCurrentProject } from '../../composables/useCurrentProject'
import {
  DEVICE_TYPE_OPTIONS,
  getProjectVideoDevices,
  VIDEO_DEVICE_CHANGE_EVENT,
  ensureVideoDeviceLedgerSeed,
} from '../../coc/utils/videoDeviceLedgerStorage.js'
import {
  getProjectDeviceGroups,
  flattenGroups,
  countGroupDevices,
  addDeviceGroup,
  renameDeviceGroup,
  removeDeviceGroup,
  setGroupDeviceIds,
  removeDevicesFromGroup,
  ensureVideoDeviceGroupSeed,
  VIDEO_GROUP_CHANGE_EVENT,
} from '../../coc/utils/videoDeviceGroupStorage.js'

defineProps({
  title: { type: String, default: '分组管理' },
  description: { type: String, default: '' },
})

const { selectedProjectId, headerProjectLabel } = useCurrentProject()

const groups = ref([])
const devices = ref([])
const activeGroupId = ref('')
const groupKeyword = ref('')
const filters = ref({ keyword: '', deviceType: '' })
const selectedRows = ref([])
const addDeviceVisible = ref(false)
const transferValue = ref([])

const flatGroups = computed(() => flattenGroups(groups.value))

const filteredGroups = computed(() => {
  const q = groupKeyword.value.trim()
  if (!q) return flatGroups.value
  return flatGroups.value.filter((g) => String(g.name || '').includes(q))
})

const activeGroup = computed(() =>
  flatGroups.value.find((g) => g.id === activeGroupId.value) || null,
)

const groupDevices = computed(() => {
  if (!activeGroup.value) return []
  const idSet = new Set(activeGroup.value.deviceIds || [])
  return devices.value.filter((d) => idSet.has(d.id))
})

const tableRows = computed(() => {
  let rows = groupDevices.value
  const q = filters.value.keyword.trim()
  if (q) {
    rows = rows.filter((d) =>
      [d.deviceId, d.deviceName, d.vendor, d.area].some((f) => String(f || '').includes(q)),
    )
  }
  if (filters.value.deviceType) {
    rows = rows.filter((d) => d.deviceType === filters.value.deviceType)
  }
  return rows
})

const transferData = computed(() =>
  devices.value.map((d) => ({
    key: d.id,
    label: `${d.deviceName}（${d.deviceType}）`,
    disabled: false,
  })),
)

const filteredTransferData = computed(() => {
  // el-transfer 自带 filter，这里直接提供全量
  return transferData.value
})

function load() {
  ensureVideoDeviceLedgerSeed()
  ensureVideoDeviceGroupSeed()
  devices.value = getProjectVideoDevices(selectedProjectId.value)
  groups.value = getProjectDeviceGroups(selectedProjectId.value)
  if (!activeGroupId.value || !flatGroups.value.some((g) => g.id === activeGroupId.value)) {
    activeGroupId.value = flatGroups.value[0]?.id || ''
  }
}

function selectGroup(id) {
  activeGroupId.value = id
  selectedRows.value = []
  filters.value = { keyword: '', deviceType: '' }
}

async function handleAddGroup(parentId = null) {
  try {
    const { value } = await ElMessageBox.prompt('请输入分组名称', parentId ? '新增子分组' : '新增分组', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      inputPattern: /\S+/,
      inputErrorMessage: '分组名称不能为空',
      inputPlaceholder: '如：入口A',
    })
    const group = addDeviceGroup(selectedProjectId.value, value, parentId)
    load()
    activeGroupId.value = group.id
    ElMessage.success('分组已创建')
  } catch {
    /* cancelled */
  }
}

async function handleRenameGroup(group) {
  try {
    const { value } = await ElMessageBox.prompt('请输入分组名称', '编辑分组', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      inputValue: group.name,
      inputPattern: /\S+/,
      inputErrorMessage: '分组名称不能为空',
    })
    renameDeviceGroup(selectedProjectId.value, group.id, value)
    load()
    ElMessage.success('分组已更新')
  } catch {
    /* cancelled */
  }
}

async function handleDeleteGroup(group) {
  try {
    await ElMessageBox.confirm(`确定删除分组「${group.name}」及其子分组？`, '提示', {
      type: 'warning',
    })
    removeDeviceGroup(selectedProjectId.value, group.id)
    load()
    ElMessage.success('分组已删除')
  } catch {
    /* cancelled */
  }
}

function openAddDevice() {
  if (!activeGroup.value) {
    ElMessage.warning('请先选择分组')
    return
  }
  transferValue.value = [...(activeGroup.value.deviceIds || [])]
  addDeviceVisible.value = true
}

function submitAddDevice() {
  if (!activeGroup.value) return
  setGroupDeviceIds(selectedProjectId.value, activeGroup.value.id, transferValue.value)
  addDeviceVisible.value = false
  load()
  ElMessage.success('设备已更新到分组')
}

async function handleRemoveSelected() {
  if (!activeGroup.value) return
  if (!selectedRows.value.length) {
    ElMessage.warning('请先勾选要删除的设备')
    return
  }
  try {
    await ElMessageBox.confirm(`确定从分组中移除选中的 ${selectedRows.value.length} 台设备？`, '提示', {
      type: 'warning',
    })
    removeDevicesFromGroup(
      selectedProjectId.value,
      activeGroup.value.id,
      selectedRows.value.map((r) => r.id),
    )
    load()
    selectedRows.value = []
    ElMessage.success('已移除')
  } catch {
    /* cancelled */
  }
}

async function handleRemoveOne(row) {
  if (!activeGroup.value) return
  try {
    await ElMessageBox.confirm(`确定从分组中移除「${row.deviceName}」？`, '提示', {
      type: 'warning',
    })
    removeDevicesFromGroup(selectedProjectId.value, activeGroup.value.id, [row.id])
    load()
    ElMessage.success('已移除')
  } catch {
    /* cancelled */
  }
}

function handleSearch() {
  /* computed */
}

function handleReset() {
  filters.value = { keyword: '', deviceType: '' }
}

function statusTagType(status) {
  if (status === '在线') return 'success'
  if (status === '离线') return 'info'
  return 'warning'
}

function filterTransferMethod(query, item) {
  return String(item.label || '').includes(query)
}

watch(selectedProjectId, async () => {
  activeGroupId.value = ''
  groupKeyword.value = ''
  handleReset()
  load()
  await nextTick()
})

onMounted(() => {
  load()
  window.addEventListener(VIDEO_DEVICE_CHANGE_EVENT, load)
  window.addEventListener(VIDEO_GROUP_CHANGE_EVENT, load)
})

onUnmounted(() => {
  window.removeEventListener(VIDEO_DEVICE_CHANGE_EVENT, load)
  window.removeEventListener(VIDEO_GROUP_CHANGE_EVENT, load)
})
</script>

<template>
  <div class="group-page">
    <div class="group-layout">
      <aside class="group-aside">
        <div class="aside-head">
          <span class="aside-title">设备分组目录</span>
          <el-button type="primary" size="small" @click="handleAddGroup()">新增</el-button>
        </div>
        <el-input
          v-model="groupKeyword"
          placeholder="关键字搜索"
          clearable
          :prefix-icon="Search"
          class="aside-search"
        />
        <div class="project-tip">{{ headerProjectLabel }}</div>
        <div class="group-list">
          <button
            v-for="group in filteredGroups"
            :key="group.id"
            type="button"
            class="group-item"
            :class="{ active: group.id === activeGroupId }"
            :style="{ paddingLeft: `${12 + group.depth * 16}px` }"
            @click="selectGroup(group.id)"
          >
            <span class="group-name">{{ group.name }} ({{ countGroupDevices(group) }})</span>
            <span class="group-actions" @click.stop>
              <el-button link type="primary" :icon="CirclePlus" title="新增子分组" @click="handleAddGroup(group.id)" />
              <el-button link type="primary" :icon="Edit" title="编辑" @click="handleRenameGroup(group)" />
              <el-button link type="danger" :icon="Delete" title="删除" @click="handleDeleteGroup(group)" />
            </span>
          </button>
          <div v-if="!filteredGroups.length" class="aside-empty">暂无分组</div>
        </div>
      </aside>

      <section class="group-main">
        <div class="filter-bar">
          <div class="filter-item">
            <span class="filter-label">关键词检索</span>
            <el-input v-model="filters.keyword" placeholder="请输入关键词" clearable style="width: 200px" />
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
          <span class="total-text">共 {{ tableRows.length }} 条</span>
          <div class="toolbar-actions">
            <el-button type="primary" :icon="Plus" :disabled="!activeGroup" @click="openAddDevice">
              添加设备
            </el-button>
            <el-button type="danger" :disabled="!selectedRows.length" @click="handleRemoveSelected">
              删除
            </el-button>
          </div>
        </div>

        <el-table
          :data="tableRows"
          border
          stripe
          empty-text="暂无数据"
          @selection-change="(rows) => (selectedRows = rows)"
        >
          <el-table-column type="selection" width="48" align="center" />
          <el-table-column prop="deviceId" label="设备ID" min-width="130" show-overflow-tooltip />
          <el-table-column prop="deviceName" label="设备名称" min-width="160" show-overflow-tooltip />
          <el-table-column prop="deviceType" label="设备类型" width="90" align="center" />
          <el-table-column label="设备状态" width="96" align="center">
            <template #default="{ row }">
              <el-tag size="small" :type="statusTagType(row.deviceStatus)">{{ row.deviceStatus }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="vendor" label="厂家" width="110" show-overflow-tooltip />
          <el-table-column prop="area" label="区域" width="100" show-overflow-tooltip />
          <el-table-column label="操作" width="90" fixed="right" align="center">
            <template #default="{ row }">
              <el-button link type="danger" @click="handleRemoveOne(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </section>
    </div>

    <el-dialog v-model="addDeviceVisible" title="添加设备" width="720px" destroy-on-close>
      <el-transfer
        v-model="transferValue"
        filterable
        :filter-method="filterTransferMethod"
        filter-placeholder="输入关键字进行过滤"
        :data="filteredTransferData"
        :titles="['未选择设备', '已选择设备']"
        :props="{ key: 'key', label: 'label' }"
        class="device-transfer"
      />
      <template #footer>
        <el-button @click="addDeviceVisible = false">取消</el-button>
        <el-button type="primary" @click="submitAddDevice">提交</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.group-page {
  background: #fff;
  border: 1px solid var(--ap-border, #e4e7ed);
  border-radius: 8px;
  overflow: hidden;
  min-height: calc(100vh - 160px);
}

.group-layout {
  display: grid;
  grid-template-columns: 280px minmax(0, 1fr);
  min-height: inherit;
}

.group-aside {
  border-right: 1px solid #ebeef5;
  padding: 12px;
  background: #fafbfc;
}

.aside-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.aside-title {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
}

.aside-search {
  margin-bottom: 8px;
}

.project-tip {
  font-size: 12px;
  color: #909399;
  margin-bottom: 8px;
}

.group-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
  max-height: calc(100vh - 280px);
  overflow: auto;
}

.group-item {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  border: none;
  background: transparent;
  border-radius: 4px;
  padding: 8px 8px 8px 12px;
  cursor: pointer;
  text-align: left;
}

.group-item:hover,
.group-item.active {
  background: #ecf5ff;
}

.group-name {
  flex: 1;
  min-width: 0;
  font-size: 13px;
  color: #303133;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.group-item.active .group-name {
  color: #409eff;
  font-weight: 600;
}

.group-actions {
  display: none;
  align-items: center;
  flex-shrink: 0;
}

.group-item:hover .group-actions,
.group-item.active .group-actions {
  display: inline-flex;
}

.aside-empty {
  padding: 24px 0;
  text-align: center;
  font-size: 13px;
  color: #909399;
}

.group-main {
  padding: 16px 20px 24px;
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

.device-transfer {
  display: flex;
  justify-content: center;
}

.device-transfer :deep(.el-transfer-panel) {
  width: 260px;
}
</style>
