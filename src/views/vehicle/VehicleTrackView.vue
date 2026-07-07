<script setup>
import { ref, computed, watch } from 'vue'
import { Plus, VideoPlay, VideoPause } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { useCurrentProject } from '../../composables/useCurrentProject'
import { getVehicleMenuItem } from '../../config/vehicleMenu.js'
import {
  projectTree,
  getProjectGeofences,
  addProjectGeofence,
  geofenceTypeOptions,
  emptyGeofenceForm,
  getProjectLabel,
  getDefaultProjectId,
  getProjectTrackVehicles,
  getVehicleTrackHistory,
} from '../../mock/vehicleManagement'

function formatToday() {
  const d = new Date()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${month}-${day}`
}

const menuItem = getVehicleMenuItem('vehicle-track')
const { isHqSelected, laborProjectId, projectLabel } = useCurrentProject()
const filterProjectId = ref(getDefaultProjectId())
const geofenceVersion = ref(0)
const selectedGeofenceId = ref('')
const selectedVehicleId = ref('')
const vehicleKeyword = ref('')
const mapMode = ref('realtime')
const trackDate = ref(formatToday())
const trackTimeStart = ref('08:00')
const trackTimeEnd = ref('18:00')
const playbackPoints = ref([])
const fenceFormVisible = ref(false)
const fenceFormRef = ref(null)
const fenceForm = ref(emptyGeofenceForm())

const fenceFormRules = {
  name: [{ required: true, message: '请输入围栏名称', trigger: 'blur' }],
  fenceType: [{ required: true, message: '请选择围栏类型', trigger: 'change' }],
}

const projectOptions = computed(() =>
  projectTree.flatMap(
    (group) =>
      group.children?.map((item) => ({
        id: item.id,
        label: item.label.replace(/\(\d+\)$/, ''),
      })) || [],
  ),
)

const activeProjectId = computed(() =>
  isHqSelected.value ? filterProjectId.value : laborProjectId.value,
)

const activeProjectLabel = computed(() => getProjectLabel(activeProjectId.value))

const currentGeofences = computed(() => {
  geofenceVersion.value
  return getProjectGeofences(activeProjectId.value)
})

const panelProjectLabel = computed(() => {
  if (mapMode.value === 'playback' && selectedVehicle.value) {
    return `${activeProjectLabel.value} · ${selectedVehicle.value.plateNo} · 轨迹回放`
  }
  if (selectedVehicle.value) {
    return `${activeProjectLabel.value} · ${selectedVehicle.value.plateNo}`
  }
  if (selectedGeofenceId.value) {
    const fence = currentGeofences.value.find((item) => item.id === selectedGeofenceId.value)
    if (fence) return `${activeProjectLabel.value} · ${fence.name}`
  }
  return activeProjectLabel.value
})

const mapModeLabel = computed(() =>
  mapMode.value === 'playback' ? '历史轨迹回放中' : '实时位置',
)

const visibleGeofences = computed(() => currentGeofences.value)

const trackVehicles = computed(() => getProjectTrackVehicles(activeProjectId.value))

const filteredVehicles = computed(() => {
  const kw = vehicleKeyword.value.trim()
  if (!kw) return trackVehicles.value
  return trackVehicles.value.filter((veh) => {
    const hay = `${veh.plateNo}${veh.driverName}${veh.vehicleType}${veh.unitName}`
    return hay.includes(kw)
  })
})

const selectedVehicle = computed(
  () => trackVehicles.value.find((veh) => veh.id === selectedVehicleId.value) || null,
)

const playbackPolyline = computed(() => {
  if (mapMode.value !== 'playback' || !playbackPoints.value.length) return ''
  return playbackPoints.value.map((point) => `${point.x},${point.y}`).join(' ')
})

const playbackHead = computed(() => {
  const points = playbackPoints.value
  if (!points.length) return null
  return points[points.length - 1]
})

const playbackRangeLabel = computed(() => {
  if (!trackDate.value) return ''
  if (trackTimeStart.value && trackTimeEnd.value) {
    return `${trackDate.value} ${trackTimeStart.value} ~ ${trackTimeEnd.value}`
  }
  return trackDate.value
})

function getTrackTimeRange() {
  return [trackTimeStart.value, trackTimeEnd.value]
}

function filterHistoryByTimeRange(history, timeRange) {
  const [start, end] = timeRange || []
  if (!start || !end) return history
  return history.filter((point) => {
    const hm = (point.time.split(' ')[1] || '').slice(0, 5)
    return hm >= start && hm <= end
  })
}

function markerStyle(position, options = {}) {
  const { highlight = false, offline = false } = options
  const scale = highlight ? 1.15 : 1
  return {
    left: `${position.x}%`,
    top: `${position.y}%`,
    opacity: offline ? 0.72 : 1,
    transform: `translate(-50%, -50%) scale(${scale})`,
  }
}

function pointsToSvg(points) {
  return points.map((point) => `${point.x},${point.y}`).join(' ')
}

function resetTrackState(clearSelection = false) {
  mapMode.value = 'realtime'
  playbackPoints.value = []
  trackDate.value = formatToday()
  trackTimeStart.value = '08:00'
  trackTimeEnd.value = '18:00'
  if (clearSelection) selectedVehicleId.value = ''
}

watch(activeProjectId, () => {
  selectedGeofenceId.value = ''
  vehicleKeyword.value = ''
  resetTrackState(true)
})

watch(laborProjectId, (id) => {
  if (!isHqSelected.value) filterProjectId.value = id
})

watch(selectedVehicleId, () => {
  if (mapMode.value === 'playback') {
    resetTrackState(false)
  }
})

function selectVehicle(veh) {
  selectedVehicleId.value = veh.id
}

function startPlayback() {
  if (!selectedVehicle.value) {
    ElMessage.warning('请先选择车辆')
    return
  }
  if (!trackDate.value) {
    ElMessage.warning('请选择轨迹日期')
    return
  }
  if (!trackTimeStart.value || !trackTimeEnd.value) {
    ElMessage.warning('请选择时间范围')
    return
  }
  if (trackTimeStart.value > trackTimeEnd.value) {
    ElMessage.warning('开始时间不能晚于结束时间')
    return
  }
  const history = filterHistoryByTimeRange(
    getVehicleTrackHistory(selectedVehicle.value.id, trackDate.value),
    getTrackTimeRange(),
  )
  if (!history.length) {
    ElMessage.warning('所选日期与时间范围内暂无轨迹数据')
    return
  }
  playbackPoints.value = history
  mapMode.value = 'playback'
  ElMessage.success(`正在回放 ${selectedVehicle.value.plateNo} ${playbackRangeLabel.value} 轨迹`)
}

function endPlayback() {
  resetTrackState(false)
  ElMessage.info('已结束轨迹回放，恢复实时位置展示')
}

function openCreateFence() {
  fenceForm.value = emptyGeofenceForm()
  fenceFormVisible.value = true
}

async function submitFenceForm() {
  await fenceFormRef.value.validate()
  const created = addProjectGeofence(activeProjectId.value, fenceForm.value)
  if (!created) {
    ElMessage.warning('请选择具体项目后再创建围栏')
    return
  }
  geofenceVersion.value += 1
  selectedGeofenceId.value = created.id
  fenceFormVisible.value = false
  ElMessage.success(`已创建电子围栏「${created.name}」`)
}
</script>

<template>
  <div class="vehicle-track-page page-card">
    <div class="page-header">
      <div class="page-breadcrumb">车辆管理 / 车辆轨迹监管</div>
      <div class="page-heading">
        <h1 class="page-title">车辆轨迹监管</h1>
        <el-button type="primary" class="ap-btn-primary" :icon="Plus" @click="openCreateFence">
          创建围栏
        </el-button>
      </div>
      <p v-if="!isHqSelected" class="page-scope">当前项目：{{ projectLabel }}</p>
      <p class="page-tip">{{ menuItem?.description }}</p>
    </div>

    <div class="page-layout with-tree">
      <aside class="sidebar-panel">
        <section class="sidebar-section project-filter-section">
          <div class="section-title">项目筛选</div>
          <el-select
            v-if="isHqSelected"
            v-model="filterProjectId"
            filterable
            placeholder="请选择项目"
            class="project-filter-select"
          >
            <el-option
              v-for="item in projectOptions"
              :key="item.id"
              :label="item.label"
              :value="item.id"
            />
          </el-select>
          <div v-else class="project-filter-current">{{ projectLabel }}</div>
        </section>

        <section class="sidebar-section vehicle-list-section">
          <div class="section-title">车辆列表</div>
          <el-input
            v-model="vehicleKeyword"
            placeholder="搜索车牌 / 司机 / 类型"
            clearable
            size="small"
            class="vehicle-search"
          />
          <div class="section-scroll">
            <button
              v-for="veh in filteredVehicles"
              :key="veh.id"
              type="button"
              class="vehicle-item"
              :class="{ active: selectedVehicleId === veh.id }"
              @click="selectVehicle(veh)"
            >
              <div class="vehicle-item-head">
                <span class="vehicle-plate">{{ veh.plateNo }}</span>
                <span class="ap-status-tag" :class="veh.online ? 'ap-tag-enabled' : 'ap-tag-disabled'">
                  {{ veh.online ? '在线' : '离线' }}
                </span>
              </div>
              <div class="vehicle-meta">{{ veh.vehicleType }} · {{ veh.driverName }}</div>
            </button>
            <div v-if="!filteredVehicles.length" class="list-empty">当前项目暂无定位车辆</div>
          </div>
          <div v-if="selectedVehicle" class="track-replay-panel">
            <div class="track-replay-title">轨迹查询</div>
            <div class="track-field">
              <span class="track-field-label">轨迹日期</span>
              <el-date-picker
                v-model="trackDate"
                type="date"
                value-format="YYYY-MM-DD"
                placeholder="选择日期"
                size="small"
                class="track-date-picker"
                :disabled="mapMode === 'playback'"
              />
            </div>
            <div class="track-field">
              <span class="track-field-label">时间范围</span>
              <div class="track-time-range-row">
                <el-time-select
                  v-model="trackTimeStart"
                  placeholder="开始"
                  start="00:00"
                  step="00:30"
                  end="23:30"
                  size="small"
                  class="track-time-select"
                  :disabled="mapMode === 'playback'"
                />
                <span class="track-time-sep">至</span>
                <el-time-select
                  v-model="trackTimeEnd"
                  placeholder="结束"
                  start="00:00"
                  step="00:30"
                  end="23:30"
                  size="small"
                  class="track-time-select"
                  :disabled="mapMode === 'playback'"
                />
              </div>
            </div>
            <el-button
              v-if="mapMode !== 'playback'"
              type="primary"
              size="small"
              class="ap-btn-primary track-replay-btn"
              :icon="VideoPlay"
              @click="startPlayback"
            >
              轨迹回放
            </el-button>
            <el-button
              v-else
              type="warning"
              plain
              size="small"
              class="track-replay-btn"
              :icon="VideoPause"
              @click="endPlayback"
            >
              结束回放
            </el-button>
          </div>
        </section>

        <section class="sidebar-section area-list-section">
          <div class="section-title">区域列表</div>
          <div class="section-scroll">
            <button
              v-for="fence in currentGeofences"
              :key="fence.id"
              type="button"
              class="fence-node-item"
              :class="{ active: selectedGeofenceId === fence.id }"
              @click="selectedGeofenceId = fence.id"
            >
              <span class="fence-node-name">{{ fence.name }}</span>
              <span class="fence-node-type">{{ fence.fenceType }}</span>
            </button>
            <div v-if="!currentGeofences.length" class="list-empty">当前项目暂无电子围栏</div>
          </div>
        </section>
      </aside>

      <div class="map-panel page-panel">
        <div class="panel-title-row">
          <div>
            <div class="panel-title">{{ panelProjectLabel }}</div>
            <div class="panel-sub">
              GIS 轨迹地图 · {{ mapModeLabel }}
              <span v-if="mapMode === 'playback'">（{{ playbackRangeLabel }}）</span>
            </div>
          </div>
          <div class="map-legend">
            <span><i class="dot forbidden" />禁行区域</span>
            <span><i class="dot allowed" />允许区域</span>
            <span v-if="mapMode === 'realtime'"><i class="dot vehicle" />定位车辆</span>
            <span v-else><i class="dot track" />历史轨迹</span>
          </div>
        </div>

        <div class="map-canvas">
          <div class="map-grid" />
          <svg class="map-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
            <polygon
              v-for="fence in visibleGeofences"
              :key="fence.id"
              :points="pointsToSvg(fence.points)"
              :fill="fence.fill"
              :stroke="fence.stroke"
              stroke-width="0.8"
              :class="{ active: selectedGeofenceId === fence.id }"
            />
            <polyline
              v-if="mapMode === 'playback' && playbackPolyline"
              :points="playbackPolyline"
              class="track-path"
            />
            <circle
              v-for="(point, index) in mapMode === 'playback' ? playbackPoints : []"
              :key="`pt-${index}`"
              :cx="point.x"
              :cy="point.y"
              r="0.9"
              class="track-point"
            />
          </svg>

          <template v-if="mapMode === 'realtime'">
            <div
              v-for="veh in trackVehicles"
              :key="veh.id"
              class="vehicle-marker"
              :class="{
                highlight: selectedVehicleId === veh.id,
                offline: !veh.online,
              }"
              :style="markerStyle(veh.position, {
                highlight: selectedVehicleId === veh.id,
                offline: !veh.online,
              })"
              @click="selectVehicle(veh)"
            >
              <span class="vehicle-marker-label">{{ veh.plateNo }}</span>
            </div>
          </template>

          <div
            v-else-if="playbackHead && selectedVehicle"
            class="vehicle-marker playback-head"
            :style="markerStyle(playbackHead, { highlight: true })"
          >
            <span class="vehicle-marker-label">{{ selectedVehicle.plateNo }}</span>
          </div>

          <div v-if="mapMode === 'realtime' && !trackVehicles.length" class="map-empty">
            当前项目暂无绑定定位设备的车辆
          </div>
          <div v-else-if="!visibleGeofences.length && mapMode === 'realtime'" class="map-empty map-empty-hint">
            当前项目暂无电子围栏，请点击「创建围栏」
          </div>
          <div v-else class="fence-tags">
            <span
              v-for="fence in visibleGeofences"
              :key="`${fence.id}-tag`"
              class="fence-tag"
              :class="{ active: selectedGeofenceId === fence.id }"
              @click="selectedGeofenceId = fence.id"
            >
              {{ fence.name }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <el-dialog v-model="fenceFormVisible" title="创建电子围栏" width="480px" destroy-on-close>
      <el-form ref="fenceFormRef" :model="fenceForm" :rules="fenceFormRules" label-width="96px">
        <el-form-item label="围栏名称" prop="name">
          <el-input v-model="fenceForm.name" placeholder="如：东门禁行区" />
        </el-form-item>
        <el-form-item label="围栏类型" prop="fenceType">
          <el-radio-group v-model="fenceForm.fenceType">
            <el-radio v-for="opt in geofenceTypeOptions" :key="opt" :value="opt">{{ opt }}</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="绘制说明">
          <p class="form-hint">保存后将在 GIS 地图中生成默认绘制区域，可在后续版本中支持拖拽编辑节点。</p>
        </el-form-item>
        <el-form-item label="所属项目">
          <el-input :model-value="activeProjectLabel" readonly />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="fenceFormVisible = false">取消</el-button>
        <el-button type="primary" class="ap-btn-primary" @click="submitFenceForm">保存并绘制</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.page-header {
  margin-bottom: 12px;
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
  gap: 12px;
}

.page-title {
  font-size: 20px;
  font-weight: 600;
  color: var(--ap-text);
  margin: 0;
}

.page-scope {
  margin: 8px 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--ap-text);
}

.page-tip {
  margin: 0;
  font-size: 12px;
  color: var(--ap-text-muted);
  line-height: 1.5;
}

.page-layout {
  height: calc(100vh - 188px);
  min-height: 520px;
  max-height: calc(100vh - 188px);
}

.page-layout.with-tree {
  display: grid;
  grid-template-columns: 280px minmax(0, 1fr);
  gap: 16px;
  align-items: stretch;
}

.sidebar-panel {
  display: grid;
  grid-template-rows: auto minmax(0, 1.2fr) minmax(0, 0.8fr);
  height: 100%;
  min-height: 0;
  overflow: hidden;
  border: 1px solid var(--ap-border);
  border-radius: 8px;
  background: #fff;
  padding: 12px;
  gap: 0;
}

.sidebar-section {
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

.sidebar-section + .sidebar-section {
  border-top: 1px solid var(--ap-border);
  margin-top: 10px;
  padding-top: 10px;
}

.project-filter-section {
  flex-shrink: 0;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--ap-text);
  line-height: 1.2;
}

.section-scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  margin-top: 8px;
}

.project-filter-select {
  width: 100%;
  margin-top: 8px;
}

.project-filter-current {
  margin-top: 8px;
  padding: 6px 10px;
  border: 1px solid var(--ap-border);
  border-radius: 6px;
  background: #fafafa;
  font-size: 13px;
  font-weight: 600;
  color: var(--ap-text);
}

.vehicle-search {
  margin-top: 8px;
}

.vehicle-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
  width: 100%;
  border: 1px solid var(--ap-border);
  border-radius: 6px;
  background: #fff;
  padding: 8px 10px;
  margin-bottom: 6px;
  cursor: pointer;
  text-align: left;
}

.vehicle-item:last-child {
  margin-bottom: 0;
}

.vehicle-item:hover {
  border-color: rgba(143, 0, 69, 0.25);
  background: var(--ap-primary-muted);
}

.vehicle-item.active {
  border-color: var(--ap-primary);
  background: var(--ap-primary-light);
}

.vehicle-item-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.vehicle-plate {
  font-size: 13px;
  font-weight: 600;
  color: var(--ap-text);
}

.vehicle-meta {
  font-size: 12px;
  color: var(--ap-text-muted);
}

.list-empty {
  padding: 12px 8px;
  font-size: 12px;
  color: var(--ap-text-muted);
  text-align: center;
}

.vehicle-list-section {
  position: relative;
}

.track-replay-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--ap-text-secondary);
  margin-bottom: 6px;
}

.track-field {
  margin-bottom: 8px;
  min-width: 0;
  overflow: hidden;
}

.track-replay-panel {
  flex-shrink: 0;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px dashed var(--ap-border);
  min-width: 0;
  overflow: hidden;
}

.track-field-label {
  display: block;
  margin-bottom: 4px;
  font-size: 12px;
  color: var(--ap-text-muted);
}

.track-date-picker {
  width: 100%;
}

.track-time-range-row {
  display: flex;
  align-items: center;
  gap: 4px;
  width: 100%;
}

.track-time-select {
  flex: 1;
  min-width: 0;
}

.track-time-select :deep(.el-select__wrapper) {
  padding-left: 8px;
  padding-right: 8px;
}

.track-time-sep {
  flex-shrink: 0;
  font-size: 12px;
  color: var(--ap-text-muted);
}

.track-replay-btn {
  width: 100%;
  margin-top: 4px;
}

.vehicle-marker {
  position: absolute;
  z-index: 3;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--ap-primary);
  border: 2px solid #fff;
  box-shadow: 0 2px 8px rgba(143, 0, 69, 0.35);
  cursor: pointer;
  transition: transform 0.15s;
}

.vehicle-marker.highlight {
  width: 14px;
  height: 14px;
  box-shadow: 0 0 0 4px rgba(143, 0, 69, 0.18);
}

.vehicle-marker.offline {
  background: #909399;
}

.vehicle-marker.playback-head {
  width: 14px;
  height: 14px;
  cursor: default;
  box-shadow: 0 0 0 4px rgba(255, 152, 0, 0.25);
  background: #ff9800;
}

.track-path {
  fill: none;
  stroke: #ff9800;
  stroke-width: 1.2;
  stroke-linecap: round;
  stroke-linejoin: round;
  vector-effect: non-scaling-stroke;
}

.track-point {
  fill: #ffb74d;
  stroke: #fff;
  stroke-width: 0.3;
  vector-effect: non-scaling-stroke;
}

.dot.vehicle {
  background: var(--ap-primary);
}

.dot.track {
  background: #ff9800;
}

.map-empty-hint {
  pointer-events: none;
  background: rgba(255, 255, 255, 0.35);
}

.vehicle-marker-label {
  position: absolute;
  left: 50%;
  top: -24px;
  transform: translateX(-50%);
  white-space: nowrap;
  padding: 2px 8px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid var(--ap-border);
  font-size: 11px;
  color: var(--ap-text);
  font-weight: 600;
}

.page-panel {
  border: 1px solid var(--ap-border);
  border-radius: 8px;
  background: #fff;
  padding: 16px;
}

.panel-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--ap-text);
}

.panel-sub {
  margin-top: 4px;
  font-size: 12px;
  color: var(--ap-text-muted);
}

.map-panel {
  display: flex;
  flex-direction: column;
  min-height: 0;
  height: 100%;
  overflow: hidden;
}

.panel-title-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 12px;
  flex-shrink: 0;
}

.map-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  font-size: 12px;
  color: var(--ap-text-secondary);
}

.map-legend span {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  display: inline-block;
}

.dot.forbidden {
  background: #e53935;
}

.dot.allowed {
  background: #43a047;
}

.map-canvas {
  position: relative;
  flex: 1;
  min-height: 0;
  border: 1px dashed var(--ap-border);
  border-radius: 8px;
  overflow: hidden;
  background: linear-gradient(180deg, #f4f8fc 0%, #eef3f8 100%);
}

.map-grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(143, 0, 69, 0.05) 1px, transparent 1px),
    linear-gradient(90deg, rgba(143, 0, 69, 0.05) 1px, transparent 1px);
  background-size: 24px 24px;
}

.map-svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.map-svg polygon {
  transition: stroke-width 0.15s, filter 0.15s;
}

.map-svg polygon.active {
  stroke-width: 1.6;
  filter: drop-shadow(0 0 4px rgba(143, 0, 69, 0.35));
}

.map-empty {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  color: var(--ap-text-muted);
  z-index: 2;
}

.fence-tags {
  position: absolute;
  left: 12px;
  bottom: 12px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  z-index: 2;
}

.fence-tag {
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid var(--ap-border);
  font-size: 12px;
  color: var(--ap-text-secondary);
  cursor: pointer;
}

.fence-tag.active {
  border-color: var(--ap-primary);
  color: var(--ap-primary);
  font-weight: 600;
}

.form-hint {
  margin: 0;
  font-size: 12px;
  line-height: 1.6;
  color: var(--ap-text-muted);
}

.fence-node-item {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  width: 100%;
  border: 1px solid transparent;
  border-radius: 6px;
  background: none;
  padding: 8px 10px;
  margin-bottom: 4px;
  cursor: pointer;
  text-align: left;
}

.fence-node-item:hover {
  background: var(--ap-primary-muted);
}

.fence-node-item.active {
  background: var(--ap-primary-light);
  border-color: rgba(143, 0, 69, 0.15);
}

.fence-node-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--ap-text);
}

.fence-node-type {
  font-size: 12px;
  color: var(--ap-text-muted);
}
</style>
