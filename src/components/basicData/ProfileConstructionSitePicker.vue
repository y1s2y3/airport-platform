<script setup>
import { computed, ref, watch } from 'vue'
import { Location } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import {
  formatConstructionSiteCoords,
  lngLatToPercent,
  parseCoordInput,
  percentToLngLat,
  resolveMockSiteName,
} from '../../mock/constructionSiteMap'

const props = defineProps({
  site: {
    type: String,
    default: '',
  },
  lng: {
    type: [String, Number],
    default: '',
  },
  lat: {
    type: [String, Number],
    default: '',
  },
  readonly: {
    type: Boolean,
    default: false,
  },
  /** 弹窗标题；营地地址等场景可覆盖 */
  dialogTitle: {
    type: String,
    default: '施工地点地图选点（示意图）',
  },
  /** 地点名称输入框占位 */
  sitePlaceholder: {
    type: String,
    default: '请输入施工地点名称',
  },
})

const emit = defineEmits(['update:site', 'update:lng', 'update:lat'])

const dialogVisible = ref(false)
const draftSite = ref('')
const draftLng = ref('')
const draftLat = ref('')

const hasCoords = computed(() => {
  const lngNum = parseCoordInput(props.lng)
  const latNum = parseCoordInput(props.lat)
  return lngNum !== null && latNum !== null
})

const displaySite = computed(() => String(props.site || '').trim() || '—')

const displayCoords = computed(() => {
  if (!hasCoords.value) return '—'
  return formatConstructionSiteCoords(props.lng, props.lat)
})

const markerStyle = computed(() => {
  const pos = lngLatToPercent(draftLng.value, draftLat.value)
  if (!pos) return { display: 'none' }
  return {
    left: `${pos.x}%`,
    top: `${pos.y}%`,
  }
})

function syncDraftFromProps() {
  draftSite.value = String(props.site || '')
  const lngNum = parseCoordInput(props.lng)
  const latNum = parseCoordInput(props.lat)
  draftLng.value = lngNum === null ? '' : String(lngNum)
  draftLat.value = latNum === null ? '' : String(latNum)
}

function openDialog() {
  syncDraftFromProps()
  dialogVisible.value = true
}

function handleMapClick(event) {
  const rect = event.currentTarget.getBoundingClientRect()
  const xPercent = ((event.clientX - rect.left) / rect.width) * 100
  const yPercent = ((event.clientY - rect.top) / rect.height) * 100
  const { lng, lat } = percentToLngLat(xPercent, yPercent)
  draftLng.value = String(lng)
  draftLat.value = String(lat)
  draftSite.value = resolveMockSiteName(lng, lat)
}

function handleConfirm() {
  const siteName = draftSite.value.trim()
  if (!siteName) {
    ElMessage.warning('请填写地点名称')
    return
  }
  const lngNum = parseCoordInput(draftLng.value)
  const latNum = parseCoordInput(draftLat.value)
  if (lngNum === null || latNum === null) {
    ElMessage.warning('请填写有效的经纬度，或在示意图上点击选点')
    return
  }
  emit('update:site', siteName)
  emit('update:lng', lngNum)
  emit('update:lat', latNum)
  dialogVisible.value = false
}

function handleClear() {
  emit('update:site', '')
  emit('update:lng', '')
  emit('update:lat', '')
}

watch(dialogVisible, (visible) => {
  if (visible) syncDraftFromProps()
})
</script>

<template>
  <div class="site-picker">
    <div class="site-picker-display">
      <div class="site-name" :title="displaySite">{{ displaySite }}</div>
      <div class="site-coords" :title="displayCoords">{{ displayCoords }}</div>
    </div>
    <div v-if="!readonly" class="site-picker-actions">
      <el-button type="primary" link :icon="Location" @click="openDialog">地图选点</el-button>
      <el-button v-if="site || hasCoords" type="danger" link @click="handleClear">清除</el-button>
    </div>

    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="640px"
      destroy-on-close
      append-to-body
    >
      <div class="picker-form">
        <div class="picker-field">
          <label>地点名称</label>
          <el-input v-model="draftSite" :placeholder="sitePlaceholder" :aria-label="sitePlaceholder" />
        </div>
        <div class="picker-coord-row">
          <div class="picker-field">
            <label>经度</label>
            <el-input v-model="draftLng" placeholder="如 113.810600" aria-label="经度" />
          </div>
          <div class="picker-field">
            <label>纬度</label>
            <el-input v-model="draftLat" placeholder="如 22.639700" aria-label="纬度" />
          </div>
        </div>
        <div class="mock-map-wrap">
          <div class="mock-map-hint">点击示意图选点（Mock 示意，非真实地图）</div>
          <div class="mock-map" role="button" tabindex="0" aria-label="点击示意图选择经纬度" @click="handleMapClick">
            <div class="mock-map-grid" />
            <div class="mock-map-zone zone-t2">T2航站区</div>
            <div class="mock-map-zone zone-t1">T1航站区</div>
            <div class="mock-map-zone zone-east">东航站区</div>
            <div class="mock-map-zone zone-runway">三跑道</div>
            <div
              v-if="markerStyle.display !== 'none'"
              class="mock-map-marker"
              :style="markerStyle"
            >
              <span class="marker-pin" />
            </div>
          </div>
        </div>
      </div>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleConfirm">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.site-picker {
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: 100%;
  min-width: 0;
}

.site-picker-display {
  min-width: 0;
}

.site-name {
  font-size: 12px;
  color: #303133;
  line-height: 1.4;
  word-break: break-all;
}

.site-coords {
  margin-top: 2px;
  font-size: 11px;
  color: #909399;
  line-height: 1.3;
  word-break: break-all;
}

.site-picker-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
}

.picker-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.picker-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
  min-width: 0;
}

.picker-field label {
  font-size: 13px;
  color: #606266;
}

.picker-coord-row {
  display: flex;
  gap: 12px;
}

.mock-map-wrap {
  border: 1px solid #7ea8c9;
  border-radius: 6px;
  overflow: hidden;
  background: #e8f4fc;
}

.mock-map-hint {
  padding: 6px 10px;
  font-size: 12px;
  color: #606266;
  background: #dceaf5;
  border-bottom: 1px solid #7ea8c9;
}

.mock-map {
  position: relative;
  height: 280px;
  cursor: crosshair;
  background:
    linear-gradient(135deg, #b8d4e8 0%, #d4e8f4 40%, #c8dcc8 100%);
  overflow: hidden;
}

.mock-map-grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(126, 168, 201, 0.25) 1px, transparent 1px),
    linear-gradient(90deg, rgba(126, 168, 201, 0.25) 1px, transparent 1px);
  background-size: 32px 32px;
  pointer-events: none;
}

.mock-map-zone {
  position: absolute;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 11px;
  color: #1a5276;
  background: rgba(255, 255, 255, 0.55);
  border: 1px dashed rgba(26, 82, 118, 0.35);
  pointer-events: none;
  white-space: nowrap;
}

.zone-t2 {
  left: 38%;
  top: 42%;
}

.zone-t1 {
  left: 22%;
  top: 58%;
}

.zone-east {
  right: 12%;
  top: 28%;
}

.zone-runway {
  right: 8%;
  bottom: 18%;
}

.mock-map-marker {
  position: absolute;
  transform: translate(-50%, -100%);
  pointer-events: none;
  z-index: 2;
}

.marker-pin {
  display: block;
  width: 14px;
  height: 14px;
  border-radius: 50% 50% 50% 0;
  background: #e74c3c;
  border: 2px solid #fff;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.25);
  transform: rotate(-45deg);
}
</style>
