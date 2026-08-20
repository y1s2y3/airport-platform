<script setup>
import { ref, computed, watch } from 'vue'
import { Search, Plus, Delete, Edit } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useLaborProjectScope } from '../../composables/useCurrentProject'
import {
  projectTree, getRegions, getPoints, getDevices, getAllDevices,
  indicatorDefs, getIndicatorsByDevice, ensureSeeded,
  addRegion, updateRegion, deleteRegionAndPoints,
  addPoint, updatePoint, deletePoint,
} from '../../mock/majorHazard'

const props = defineProps({
  hazardType: { type: String, required: true },
  title: { type: String, default: '' },
  breadcrumb: { type: String, default: '' },
  tip: { type: String, default: '' },
})

const { isHqSelected, treeProjectId, scopeProjectId, scopeProjectLabel, onTreeNodeClick } = useLaborProjectScope()
const isReadOnly = computed(() => isHqSelected.value)

// 所有区域/点/设备数据
const regions = ref([])
const points = ref([])
const devices = ref([])
const selectedRegion = ref(null)
const keyword = ref('')

const treeData = computed(() =>
  projectTree.map((g) => ({ id: g.id, label: g.label, children: g.children?.map((c) => ({ id: c.id, label: c.label.replace(/\(\d+\)$/, '') })) }))
)

// 选中区域下的监测点
const regionPoints = computed(() => {
  if (!selectedRegion.value) return []
  return points.value.filter(p => p.regionId === selectedRegion.value.id)
})

// 可用设备列表（未绑定其他区域的设备 + 当前区域已绑定的设备）
const availableDevices = computed(() => {
  const boundPointIds = points.value.filter(p => p.regionId !== selectedRegion.value?.id).map(p => p.id)
  const allDevs = getAllDevices(scopeProjectId.value)
  return allDevs.filter(d => !boundPointIds.includes(d.pointId) || regionPoints.value.some(rp => rp.id === d.pointId))
})

function getDeviceForPoint(pointId) {
  return devices.value.find(d => d.pointId === pointId)
}

function loadData() {
  ensureSeeded(scopeProjectId.value)
  regions.value = getRegions(scopeProjectId.value, props.hazardType)
  points.value = getPoints(scopeProjectId.value, props.hazardType)
  devices.value = getDevices(scopeProjectId.value, props.hazardType)
}

watch(scopeProjectId, () => {
  keyword.value = ''
  selectedRegion.value = null
  loadData()
}, { immediate: true })

function selectRegion(region) {
  selectedRegion.value = region
}

// ----- 区域 CRUD -----
const regionDialogVisible = ref(false)
const isEditRegion = ref(false)
const regionForm = ref({ name: '' })

function openAddRegion() {
  isEditRegion.value = false
  regionForm.value = { name: '' }
  regionDialogVisible.value = true
}

function openEditRegion(region) {
  isEditRegion.value = true
  regionForm.value = { name: region.name }
  selectedRegion.value = region
  regionDialogVisible.value = true
}

function saveRegion() {
  if (!regionForm.value.name.trim()) { ElMessage.warning('请输入区域名称'); return }
  if (isEditRegion.value && selectedRegion.value) {
    updateRegion(selectedRegion.value.id, { name: regionForm.value.name })
    ElMessage.success('区域已更新')
  } else {
    addRegion({ projectId: scopeProjectId.value, hazardType: props.hazardType, name: regionForm.value.name })
    ElMessage.success('区域已新增')
  }
  regionDialogVisible.value = false
  loadData()
}

function deleteRegion(region) {
  ElMessageBox.confirm(`确认删除区域「${region.name}」及其所有监测点？`, '提示', { type: 'warning' }).then(() => {
    deleteRegionAndPoints(region.id)
    if (selectedRegion.value?.id === region.id) selectedRegion.value = null
    loadData()
    ElMessage.success('已删除')
  }).catch(() => {})
}

// ----- 监测点 CRUD -----
const pointDialogVisible = ref(false)
const isEditPoint = ref(false)
const pointForm = ref({ name: '', deviceId: '' })
const editingPointId = ref('')

function openAddPoint() {
  if (!selectedRegion.value) { ElMessage.warning('请先选择一个区域'); return }
  isEditPoint.value = false
  editingPointId.value = ''
  pointForm.value = { name: '', deviceId: '' }
  pointDialogVisible.value = true
}

function openEditPoint(point) {
  isEditPoint.value = true
  editingPointId.value = point.id
  const dev = devices.value.find(d => d.pointId === point.id)
  pointForm.value = { name: point.name, deviceId: dev?.id || '' }
  pointDialogVisible.value = true
}

const unboundDevices = computed(() => {
  const boundPointIds = points.value.filter(p => p.regionId === selectedRegion.value?.id && p.id !== editingPointId.value).map(p => p.id)
  const allDevs = getAllDevices(scopeProjectId.value)
  return allDevs.filter(d => !boundPointIds.includes(d.pointId))
})

function savePoint() {
  if (!pointForm.value.name.trim()) { ElMessage.warning('请输入监测点'); return }
  if (!pointForm.value.deviceId) { ElMessage.warning('请选择绑定设备'); return }
  
  if (isEditPoint.value && editingPointId.value) {
    updatePoint(editingPointId.value, { name: pointForm.value.name, deviceId: pointForm.value.deviceId })
    ElMessage.success('监测点已更新')
  } else {
    addPoint({ regionId: selectedRegion.value.id, name: pointForm.value.name, deviceId: pointForm.value.deviceId })
    ElMessage.success('监测点已新增')
  }
  pointDialogVisible.value = false
  loadData()
  devices.value = getDevices(scopeProjectId.value, props.hazardType)
}

function removePoint(point) {
  ElMessageBox.confirm(`确认删除监测点「${point.name}」？`, '提示', { type: 'warning' }).then(() => {
    deletePoint(point.id)
    loadData()
    devices.value = getDevices(scopeProjectId.value, props.hazardType)
    ElMessage.success('已删除')
  }).catch(() => {})
}

const filteredRegions = computed(() => {
  if (!keyword.value.trim()) return regions.value
  return regions.value.filter(r => r.name.includes(keyword.value.trim()))
})
</script>

<template>
  <div class="hazard-page page-card">
    <div class="page-header">
      <div class="page-breadcrumb">{{ breadcrumb }}</div>
      <div class="page-heading">
        <h1 class="page-title">{{ title }}</h1>
      </div>
      <p v-if="!isHqSelected" class="page-scope">当前项目：{{ scopeProjectLabel }}</p>
      <p class="page-tip">{{ tip }}</p>
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
            <span>监测区域 <b>{{ regions.length }}</b> 个</span>
            <span>监测点 <b>{{ points.length }}</b> 个</span>
            <span>已绑定设备 <b>{{ devices.filter(d => d.pointId).length }}</b> 台</span>
          </div>
        </div>

        <div style="display:flex;gap:16px;align-items:flex-start">
          <!-- 左侧：区域列表 -->
          <div style="width:340px;flex-shrink:0;border:1px solid var(--ap-border);border-radius:6px;padding:12px">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
              <span style="font-weight:600;font-size:14px">监测区域</span>
              <el-button size="small" type="primary" class="ap-btn-primary" :icon="Plus" @click="openAddRegion" v-if="!isReadOnly">新增区域</el-button>
            </div>
            <el-input v-model="keyword" placeholder="搜索区域..." clearable size="small" style="margin-bottom:8px" :prefix-icon="Search" aria-label="搜索区域..."/>
            <div class="region-list">
              <div
                v-for="r in filteredRegions" :key="r.id"
                class="region-item"
                :class="{ active: selectedRegion?.id === r.id }"
                @click="selectRegion(r)"
              >
                <span class="region-name">{{ r.name }}</span>
                <span class="region-point-count">{{ points.filter(p => p.regionId === r.id).length }}个点</span>
                <el-button link type="primary" size="small" @click.stop="openEditRegion(r)" v-if="!isReadOnly"><el-icon><Edit /></el-icon></el-button>
                <el-button link type="danger" size="small" @click.stop="deleteRegion(r)" v-if="!isReadOnly"><el-icon><Delete /></el-icon></el-button>
              </div>
              <div v-if="filteredRegions.length === 0" class="empty-hint">暂无区域，请新增</div>
            </div>
          </div>

          <!-- 右侧：监测点列表 -->
          <div style="flex:1;min-width:0;border:1px solid var(--ap-border);border-radius:6px;padding:12px">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
              <span style="font-weight:600;font-size:14px">
                监测点
                <span v-if="selectedRegion" style="font-weight:400;color:var(--ap-text-secondary)"> — {{ selectedRegion.name }}</span>
                <span v-else style="font-weight:400;color:#999"> — 请先选择区域</span>
              </span>
              <el-button size="small" type="primary" class="ap-btn-primary" :icon="Plus" :disabled="!selectedRegion" @click="openAddPoint" v-if="!isReadOnly">新增监测点</el-button>
            </div>

            <el-table :data="regionPoints" border stripe class="ap-table" style="width:100%">
              <el-table-column type="index" label="序号" width="50" align="center" />
              <el-table-column prop="name" label="监测点" min-width="160" />
              <el-table-column label="绑定设备" min-width="180">
                <template #default="{ row }">
                  <template v-if="getDeviceForPoint(row.id)">
                    <span class="ap-status-tag ap-tag-enabled" style="margin-right:4px">已绑定</span>
                    {{ getDeviceForPoint(row.id).name }}
                  </template>
                  <span v-else class="ap-muted">未绑定</span>
                </template>
              </el-table-column>
              <el-table-column label="设备SN" min-width="120">
                <template #default="{ row }">
                  {{ getDeviceForPoint(row.id)?.deviceNo || '-' }}
                </template>
              </el-table-column>
              <el-table-column label="操作" width="130" align="center">
                <template #default="{ row }">
                  <el-button link type="primary" size="small" @click="openEditPoint(row)" v-if="!isReadOnly">编辑</el-button>
                  <el-button link type="danger" size="small" @click="removePoint(row)" v-if="!isReadOnly">删除</el-button>
                </template>
              </el-table-column>
            </el-table>
            <div v-if="selectedRegion && regionPoints.length === 0" class="empty-hint" style="margin-top:16px">该区域暂无监测点，请新增</div>
          </div>
        </div>
      </section>
    </div>

    <!-- 区域对话框 -->
    <el-dialog v-model="regionDialogVisible" :title="isEditRegion ? '编辑区域' : '新增区域'" width="420px" :close-on-click-modal="false">
      <el-form :model="regionForm" label-width="80px">
        <el-form-item label="区域名称" required>
          <el-input v-model="regionForm.name" placeholder="请输入监测区域名称" aria-label="请输入监测区域名称"/>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="regionDialogVisible = false">取消</el-button>
        <el-button type="primary" class="ap-btn-primary" @click="saveRegion">{{ isEditRegion ? '保存' : '确认新增' }}</el-button>
      </template>
    </el-dialog>

    <!-- 监测点对话框 -->
    <el-dialog v-model="pointDialogVisible" :title="isEditPoint ? '编辑监测点' : '新增监测点'" width="480px" :close-on-click-modal="false">
      <el-form :model="pointForm" label-width="100px">
        <el-form-item label="监测点" required>
          <el-input v-model="pointForm.name" placeholder="请输入监测点编号，如：SJK001、DTBH002" aria-label="请输入监测点编号，如：SJK001、DTBH002"/>
        </el-form-item>
        <el-form-item label="绑定设备" required>
          <el-select v-model="pointForm.deviceId" placeholder="请选择设备绑定" filterable style="width:100%" aria-label="请选择设备绑定">
            <el-option v-for="d in unboundDevices" :key="d.id" :label="`${d.name}（${d.deviceNo}）`" :value="d.id" />
          </el-select>
          <div class="form-tip">将设备绑定至该监测点，一个监测点最多绑定一台设备</div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="pointDialogVisible = false">取消</el-button>
        <el-button type="primary" class="ap-btn-primary" @click="savePoint">{{ isEditPoint ? '保存' : '确认新增' }}</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.hazard-page { padding: 20px 24px 32px; }
.page-breadcrumb { font-size: 13px; color: var(--ap-text-muted); margin-bottom: 4px; }
.page-heading { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 8px; }
.page-title { font-size: 20px; font-weight: 600; margin: 0; }
.page-scope, .page-tip { font-size: 13px; color: var(--ap-text-secondary); margin: 0 0 8px; }
.page-layout.with-tree { display: grid; grid-template-columns: 240px 1fr; gap: 16px; }
.project-tree-panel, .content-panel { border: 1px solid var(--ap-border); border-radius: 8px; background: #fff; padding: 16px; }
.panel-title { font-size: 14px; font-weight: 600; margin-bottom: 8px; }
.panel-head { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 8px; margin-bottom: 12px; }
.panel-stats { display: flex; flex-wrap: wrap; gap: 12px; font-size: 13px; color: var(--ap-text-secondary); }
.project-tree { font-size: 13px; }
.project-tree :deep(.el-tree-node__content) { height: 36px; }
.project-tree :deep(.el-tree-node.is-current > .el-tree-node__content) { background: #fceef4; color: var(--ap-primary); font-weight: 600; }

/* 区域列表 */
.region-list { max-height: 480px; overflow-y: auto; }
.region-item { display: flex; align-items: center; gap: 6px; padding: 8px 10px; border-radius: 4px; cursor: pointer; transition: background 0.2s; }
.region-item:hover { background: #f5f5f5; }
.region-item.active { background: #fceef4; color: var(--ap-primary); }
.region-name { flex: 1; font-size: 13px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.region-point-count { font-size: 11px; color: var(--ap-text-muted); white-space: nowrap; }
.empty-hint { text-align: center; color: #ccc; padding: 20px 0; font-size: 13px; }
.form-tip { font-size: 12px; color: var(--ap-text-muted); margin-top: 4px; line-height: 1.4; }
</style>
