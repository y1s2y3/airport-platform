<script setup>
import { ref, computed, watch } from 'vue'
import { VideoPlay, VideoPause } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { useCurrentProject } from '../../composables/useCurrentProject'
import {
  projectTree,
  getProjectLabel,
  getDefaultProjectId,
  getProjectTrackPersonnel,
  getPersonnelTrackHistory,
} from '../../mock/laborPersonnelTrack'

function formatToday() {
  const d = new Date()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${month}-${day}`
}

const { isHqSelected, laborProjectId, projectLabel } = useCurrentProject()
const filterProjectId = ref(getDefaultProjectId())
const selectedPersonId = ref('')
const personKeyword = ref('')
const mapMode = ref('realtime')
const trackDate = ref(formatToday())
const trackTimeStart = ref('08:00')
const trackTimeEnd = ref('18:00')
const playbackPoints = ref([])

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

const trackPersonnel = computed(() => getProjectTrackPersonnel(activeProjectId.value))

const filteredPersonnel = computed(() => {
  const kw = personKeyword.value.trim()
  if (!kw) return trackPersonnel.value
  return trackPersonnel.value.filter((person) => {
    const hay = `${person.name}${person.personnelNo}${person.workType}${person.unitName}`
    return hay.includes(kw)
  })
})

const selectedPerson = computed(
  () => trackPersonnel.value.find((p) => p.id === selectedPersonId.value) || null,
)

const panelProjectLabel = computed(() => {
  if (mapMode.value === 'playback' && selectedPerson.value) {
    return `${activeProjectLabel.value} · ${selectedPerson.value.name} · 轨迹回放`
  }
  if (selectedPerson.value) return `${activeProjectLabel.value} · ${selectedPerson.value.name}`
  return activeProjectLabel.value
})

const mapModeLabel = computed(() =>
  mapMode.value === 'playback' ? '历史轨迹回放中' : '实时位置',
)

const displayMarkers = computed(() => {
  if (mapMode.value === 'playback') return playbackPoints.value
  return trackPersonnel.value.filter((p) => p.online)
})

const playbackPolyline = computed(() => {
  if (mapMode.value !== 'playback' || !playbackPoints.value.length) return ''
  return playbackPoints.value.map((point) => `${point.x},${point.y}`).join(' ')
})

const playbackHead = computed(() => {
  const points = playbackPoints.value
  if (!points.length) return null
  return points[points.length - 1]
})

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

function resetTrackState(clearSelection = false) {
  mapMode.value = 'realtime'
  playbackPoints.value = []
  trackDate.value = formatToday()
  trackTimeStart.value = '08:00'
  trackTimeEnd.value = '18:00'
  if (clearSelection) selectedPersonId.value = ''
}

watch(activeProjectId, () => {
  personKeyword.value = ''
  resetTrackState(true)
})

watch(laborProjectId, (id) => {
  if (!isHqSelected.value) filterProjectId.value = id
})

function selectPerson(person) {
  selectedPersonId.value = person.id
}

function filterHistoryByTimeRange(history, timeRange) {
  const [start, end] = timeRange || []
  if (!start || !end) return history
  return history.filter((point) => {
    const hm = (point.time.split(' ')[1] || '').slice(0, 5)
    return hm >= start && hm <= end
  })
}

function startPlayback() {
  if (!selectedPerson.value) {
    ElMessage.warning('请先选择人员')
    return
  }
  const history = filterHistoryByTimeRange(
    getPersonnelTrackHistory(selectedPerson.value.id, trackDate.value),
    [trackTimeStart.value, trackTimeEnd.value],
  )
  if (!history.length) {
    ElMessage.warning('所选日期与时间范围内暂无轨迹数据')
    return
  }
  playbackPoints.value = history
  mapMode.value = 'playback'
  ElMessage.success(`正在回放 ${selectedPerson.value.name} 轨迹`)
}

function endPlayback() {
  resetTrackState(false)
  ElMessage.info('已结束轨迹回放，恢复实时位置展示')
}
</script>

<template>
  <div class="person-track-page page-card">
    <div class="page-header">
      <div class="page-breadcrumb">人员实名制管理 / 人员轨迹</div>
      <h1 class="page-title">人员轨迹</h1>
      <p v-if="!isHqSelected" class="page-scope">当前项目：{{ projectLabel }}</p>
      <p class="page-tip">按项目展示人员实时位置及轨迹回放，支持 GPS 定位设备数据查询。</p>
    </div>

    <div class="page-layout with-tree">
      <aside class="sidebar-panel">
        <section class="sidebar-section">
          <div class="section-title">项目筛选</div>
          <el-select
            v-if="isHqSelected"
            v-model="filterProjectId"
            filterable
            placeholder="请选择项目"
            class="project-filter-select"
          >
            <el-option v-for="item in projectOptions" :key="item.id" :label="item.label" :value="item.id" />
          </el-select>
          <div v-else class="project-filter-current">{{ projectLabel }}</div>
        </section>

        <section class="sidebar-section">
          <div class="section-title">人员列表</div>
          <el-input v-model="personKeyword" placeholder="搜索姓名/编号/工种" clearable size="small" class="person-search" />
          <div class="section-scroll">
            <button
              v-for="person in filteredPersonnel"
              :key="person.id"
              type="button"
              class="person-item"
              :class="{ active: selectedPersonId === person.id }"
              @click="selectPerson(person)"
            >
              <div class="person-item-head">
                <span class="person-name">{{ person.name }}</span>
                <span class="ap-status-tag" :class="person.online ? 'ap-tag-enabled' : 'ap-tag-disabled'">
                  {{ person.online ? '在线' : '离线' }}
                </span>
              </div>
              <div class="person-meta">{{ person.workType }} · {{ person.team }}</div>
            </button>
            <div v-if="!filteredPersonnel.length" class="list-empty">当前项目暂无定位人员</div>
          </div>

          <div v-if="selectedPerson" class="track-replay-panel">
            <div class="track-replay-title">轨迹查询</div>
            <el-date-picker v-model="trackDate" type="date" value-format="YYYY-MM-DD" size="small" style="width: 100%" :disabled="mapMode === 'playback'" />
            <div class="track-time-range-row">
              <el-time-select v-model="trackTimeStart" placeholder="开始" start="00:00" step="00:30" end="23:30" size="small" :disabled="mapMode === 'playback'" />
              <span>至</span>
              <el-time-select v-model="trackTimeEnd" placeholder="结束" start="00:00" step="00:30" end="23:30" size="small" :disabled="mapMode === 'playback'" />
            </div>
            <el-button v-if="mapMode !== 'playback'" type="primary" size="small" class="ap-btn-primary" :icon="VideoPlay" @click="startPlayback">轨迹回放</el-button>
            <el-button v-else type="warning" plain size="small" :icon="VideoPause" @click="endPlayback">结束回放</el-button>
          </div>
        </section>
      </aside>

      <div class="map-panel page-panel">
        <div class="panel-title-row">
          <div>
            <div class="panel-title">{{ panelProjectLabel }}</div>
            <div class="panel-sub">GIS 轨迹地图 · {{ mapModeLabel }}</div>
          </div>
          <div class="map-legend">
            <span v-if="mapMode === 'realtime'"><i class="dot person" />在线人员</span>
            <span v-else><i class="dot track" />历史轨迹</span>
          </div>
        </div>

        <div class="map-canvas">
          <div class="map-grid" />
          <svg class="map-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
            <polyline
              v-if="mapMode === 'playback' && playbackPolyline"
              :points="playbackPolyline"
              class="track-path"
            />
          </svg>

          <template v-if="mapMode === 'realtime'">
            <div
              v-for="person in displayMarkers"
              :key="person.id"
              class="map-marker person-marker"
              :class="{ highlight: selectedPersonId === person.id, offline: !person.online }"
              :style="markerStyle(person.position, { highlight: selectedPersonId === person.id, offline: !person.online })"
              @click="selectPerson(person)"
            >
              <span class="marker-label">{{ person.name }}</span>
            </div>
          </template>

          <div
            v-if="mapMode === 'playback' && playbackHead"
            class="map-marker person-marker playback-head"
            :style="markerStyle(playbackHead, { highlight: true })"
          >
            <span class="marker-label">{{ selectedPerson?.name }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.person-track-page { padding: 20px 24px 32px; }
.page-breadcrumb { font-size: 13px; color: var(--ap-text-muted); margin-bottom: 4px; }
.page-title { font-size: 20px; font-weight: 600; margin: 0 0 8px; }
.page-scope, .page-tip { font-size: 13px; color: var(--ap-text-secondary); margin: 0 0 8px; }
.page-layout.with-tree { display: grid; grid-template-columns: 280px 1fr; gap: 16px; min-height: 620px; }
.sidebar-panel, .map-panel { border: 1px solid var(--ap-border); border-radius: 8px; background: #fff; }
.sidebar-panel { padding: 12px; display: flex; flex-direction: column; gap: 12px; }
.sidebar-section { display: flex; flex-direction: column; gap: 8px; }
.section-title { font-size: 13px; font-weight: 600; color: var(--ap-text); }
.project-filter-select, .project-filter-current { width: 100%; }
.project-filter-current { font-size: 13px; color: var(--ap-text-secondary); padding: 8px 10px; background: var(--ap-bg-soft); border-radius: 6px; }
.section-scroll { max-height: 280px; overflow: auto; display: flex; flex-direction: column; gap: 6px; }
.person-item { text-align: left; border: 1px solid var(--ap-border); border-radius: 8px; background: #fff; padding: 10px 12px; cursor: pointer; }
.person-item:hover {
  border-color: rgba(143, 0, 69, 0.25);
  background: var(--ap-primary-muted);
}

.person-item.active {
  border-color: var(--ap-primary);
  background: var(--ap-primary-light);
}
.person-item-head { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
.person-name { font-weight: 600; font-size: 13px; }
.person-meta { margin-top: 4px; font-size: 12px; color: var(--ap-text-secondary); }
.list-empty { font-size: 13px; color: var(--ap-text-muted); text-align: center; padding: 24px 8px; }
.track-replay-panel { margin-top: 8px; padding-top: 10px; border-top: 1px dashed var(--ap-border); display: flex; flex-direction: column; gap: 8px; }
.track-replay-title { font-size: 13px; font-weight: 600; }
.track-time-range-row { display: flex; align-items: center; gap: 6px; }
.map-panel { padding: 16px; display: flex; flex-direction: column; }
.panel-title-row { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; }
.panel-title { font-size: 15px; font-weight: 600; }
.panel-sub { font-size: 12px; color: var(--ap-text-secondary); margin-top: 4px; }
.map-legend { display: flex; gap: 12px; font-size: 12px; color: var(--ap-text-secondary); }
.map-legend .dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 4px; }
.dot.person { background: var(--ap-primary); }
.dot.track { background: #ff9800; }
.map-canvas {
  position: relative;
  flex: 1;
  min-height: 520px;
  border-radius: 8px;
  overflow: hidden;
  background: linear-gradient(180deg, #f4f8fc 0%, #eef3f8 100%);
  border: 1px dashed var(--ap-border);
}
.map-grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(143, 0, 69, 0.05) 1px, transparent 1px),
    linear-gradient(90deg, rgba(143, 0, 69, 0.05) 1px, transparent 1px);
  background-size: 24px 24px;
}
.map-svg { position: absolute; inset: 0; width: 100%; height: 100%; }
.track-path {
  fill: none;
  stroke: #ff9800;
  stroke-width: 1.2;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-dasharray: 2 1;
  vector-effect: non-scaling-stroke;
}
.map-marker { position: absolute; z-index: 2; cursor: pointer; }
.person-marker {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--ap-primary);
  border: 2px solid #fff;
  box-shadow: 0 2px 8px rgba(143, 0, 69, 0.35);
  transition: transform 0.15s;
}
.person-marker.highlight {
  width: 14px;
  height: 14px;
  box-shadow: 0 0 0 4px rgba(143, 0, 69, 0.18);
}
.person-marker.offline {
  background: #909399;
}
.person-marker.playback-head {
  width: 14px;
  height: 14px;
  cursor: default;
  box-shadow: 0 0 0 4px rgba(255, 152, 0, 0.25);
  background: #ff9800;
}
.marker-label { position: absolute; left: 14px; top: -6px; white-space: nowrap; font-size: 11px; background: rgba(255,255,255,.92); padding: 2px 6px; border-radius: 4px; border: 1px solid var(--ap-border); }
</style>
