<script setup>
import { ref, computed } from 'vue'
import { VideoCamera, ArrowLeft, ArrowRight } from '@element-plus/icons-vue'
import { useDispatchOrder } from '../../composables/useDispatchOrder.js'
import {
  DISPATCH_DEVICES,
  PERSONNEL_DISPATCH_DEVICES,
  getDispatchDeviceTypeLabel,
  formatDispatchOperatorLabel,
  videoPlaceholderColor,
  videoPlaceholderClass,
} from '../../mock/data.js'
import { PANEL_TITLE_ICON_URL } from '../../config/panelTitleAssets.js'
import HqPanelTitleLine from './HqPanelTitleLine.vue'

const DISPATCH_PAGE_SIZE = 3

const props = defineProps({
  scene: { type: String, default: 'default', validator: (v) => ['default', 'personnel'].includes(v) },
})

const emit = defineEmits(['open-dispatch'])

const dispatchPage = ref(0)

const dispatchDeviceList = computed(() =>
  props.scene === 'personnel' ? PERSONNEL_DISPATCH_DEVICES : DISPATCH_DEVICES,
)

const { dispatchOrder, orderedDevices, handleDispatchReorder } = useDispatchOrder(dispatchDeviceList)

const dispatchTitle = computed(() =>
  props.scene === 'personnel' ? '人员核验对讲' : '巡检对讲设备',
)

const dispatchHint = computed(() =>
  props.scene === 'personnel'
    ? '点击进入人员远程核验对讲页，支持证件核查与在岗确认'
    : '点击进入项目调度页',
)

const dispatchStats = computed(() => {
  const list = orderedDevices.value
  const online = list.filter((d) => d.online).length
  return { total: list.length, online, offline: list.length - online }
})

const dispatchTotalPages = computed(() =>
  Math.max(1, Math.ceil(orderedDevices.value.length / DISPATCH_PAGE_SIZE)),
)

const pagedDispatch = computed(() => {
  const start = dispatchPage.value * DISPATCH_PAGE_SIZE
  return orderedDevices.value.slice(start, start + DISPATCH_PAGE_SIZE)
})

function openDispatch(device) {
  emit('open-dispatch', device)
}

defineExpose({ dispatchOrder, handleDispatchReorder })
</script>

<template>
  <div class="panel-card module-panel dispatch-module">
    <div class="panel-title simple-title module-title-bar">
      <img
        class="hq-panel-title-icon"
        :src="PANEL_TITLE_ICON_URL"
        width="11"
        height="11"
        alt=""
        aria-hidden="true"
        draggable="false"
      />
      <div class="header-row">
        <span class="module-title-text">{{ dispatchTitle }}</span>
      </div>
      <HqPanelTitleLine />
      <div class="header-sub-row header-sub-row--compact">
        <div class="title-stats title-stats--compact">
          <span class="stat-item">总数<b>{{ dispatchStats.total }}</b></span>
          <span class="stat-item online">
            <i class="status-dot online" />在线<b>{{ dispatchStats.online }}</b>
          </span>
          <span class="stat-item offline">
            <i class="status-dot offline" />离线<b>{{ dispatchStats.offline }}</b>
          </span>
        </div>
        <div class="page-nav">
          <button
            type="button"
            class="arrow-btn"
            :disabled="dispatchPage <= 0"
            aria-label="上一页"
            @click="dispatchPage--"
          >
            <el-icon><ArrowLeft /></el-icon>
          </button>
          <span class="page-info">{{ dispatchPage + 1 }}/{{ dispatchTotalPages }}</span>
          <button
            type="button"
            class="arrow-btn"
            :disabled="dispatchPage >= dispatchTotalPages - 1"
            aria-label="下一页"
            @click="dispatchPage++"
          >
            <el-icon><ArrowRight /></el-icon>
          </button>
        </div>
      </div>
    </div>
    <div class="panel-body module-body">
      <div class="dispatch-hint">{{ dispatchHint }}</div>
      <div class="dispatch-col">
        <div
          v-for="(dv, idx) in pagedDispatch"
          :key="dv.id"
          class="video-cell dispatch-cell clickable"
          :class="{ offline: !dv.online }"
          @click="openDispatch(dv)"
        >
          <div
            class="video-placeholder"
            :class="videoPlaceholderClass(dv.online, 'cool', dv.type)"
            :style="{ background: videoPlaceholderColor(dv.online, idx, 'cool', dv.type) }"
          >
            <el-icon v-if="dv.online && dv.type !== 'handheld'" :size="19" color="rgba(255,255,255,0.6)"><VideoCamera /></el-icon>
            <span v-if="!dv.online" class="offline-mask">离线</span>
          </div>
          <div class="video-label dispatch-label">
            <div class="label-top">
              <span class="type-badge" :class="dv.type">{{ getDispatchDeviceTypeLabel(dv.type) }}</span>
              <span class="cam-name" :title="dv.name">{{ dv.name }}</span>
            </div>
            <div class="label-bottom">
              <span v-if="dv.operator" class="operator-tag" :title="formatDispatchOperatorLabel(dv)">
                {{ formatDispatchOperatorLabel(dv) }}
              </span>
              <span class="cam-status" :class="dv.online ? 'online' : 'offline'">
                {{ dv.online ? '在线' : '离线' }}
              </span>
            </div>
          </div>
        </div>
        <div
          v-for="n in Math.max(0, DISPATCH_PAGE_SIZE - pagedDispatch.length)"
          :key="'de-' + n"
          class="video-cell empty"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.dispatch-module {
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.simple-title {
  font-size: calc(18px + var(--coc-font-boost));
}

.title-stats--compact {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: 6px;
  font-size: calc(9px + var(--coc-font-boost));
  color: var(--coc-text-secondary);
  flex: 0 1 auto;
  min-width: 0;
  white-space: nowrap;
}

.title-stats--compact b {
  font-size: calc(10px + var(--coc-font-boost));
  color: var(--coc-text);
  margin-left: 2px;
  font-weight: 700;
}

.title-stats--compact .online b { color: var(--coc-success); }
.title-stats--compact .offline b { color: var(--coc-danger); }

.title-stats--compact .stat-item {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  white-space: nowrap;
  flex-shrink: 0;
}

.title-stats--compact .status-dot {
  width: 5px;
  height: 5px;
  flex-shrink: 0;
}

.header-row {
  display: flex;
  align-items: center;
  min-width: 0;
}

.header-sub-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-width: 0;
}

.module-title-text {
  font-size: calc(16px + var(--coc-font-boost));
  font-weight: 600;
  color: var(--coc-text);
  white-space: nowrap;
  flex-shrink: 0;
}

.title-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 12px;
  font-size: calc(11px + var(--coc-font-boost));
  color: var(--coc-text-secondary);
  flex: 1;
  min-width: 0;
}

.title-stats b {
  font-size: calc(12px + var(--coc-font-boost));
  color: var(--coc-text);
  margin-left: 3px;
}

.title-stats .online b { color: var(--coc-success); }
.title-stats .offline b { color: var(--coc-danger); }

.page-nav {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.arrow-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  padding: 0;
  border: 1px solid var(--coc-border);
  border-radius: 50%;
  background: #fff;
  color: var(--coc-text-secondary);
  cursor: pointer;
  transition: border-color 0.2s, color 0.2s, background 0.2s;
}

.arrow-btn:hover:not(:disabled) {
  border-color: var(--coc-accent);
  color: var(--coc-accent);
  background: rgba(201, 123, 99, 0.06);
}

.arrow-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.page-info {
  font-size: calc(11px + var(--coc-font-boost));
  font-weight: 600;
  min-width: 28px;
  text-align: center;
  color: var(--coc-text-secondary);
}

.module-body {
  padding: 10px 14px 14px !important;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 0;
  flex: 1;
}

.dispatch-col {
  flex: 1;
  display: grid;
  grid-template-rows: repeat(3, 1fr);
  gap: 12px;
  min-height: 0;
}

.video-cell {
  position: relative;
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid var(--coc-border);
  background: #f5f5f5;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.video-cell.clickable {
  cursor: pointer;
  transition: box-shadow 0.2s, border-color 0.2s;
}

.video-cell.clickable:hover {
  border-color: var(--coc-accent);
  box-shadow: 0 4px 16px rgba(201, 123, 99, 0.2);
}

.video-cell.offline { opacity: 0.85; }

.video-placeholder {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  min-height: 0;
}

.offline-mask {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.35);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: calc(12px + var(--coc-font-boost));
}

.dispatch-hint {
  font-size: calc(11px + var(--coc-font-boost));
  color: var(--coc-text-muted);
  flex-shrink: 0;
  line-height: 1.4;
}

.type-badge {
  font-size: calc(10px + var(--coc-font-boost));
  padding: 2px 8px;
  border-radius: 4px;
  flex-shrink: 0;
  font-weight: 600;
}

.type-badge.handheld {
  background: rgba(201, 123, 99, 0.15);
  color: var(--coc-accent);
}

.type-badge.app,
.type-badge.web {
  background: rgba(103, 194, 58, 0.12);
  color: #67c23a;
}

.video-label {
  padding: 5px 12px;
  background: rgba(255, 255, 255, 0.95);
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.dispatch-label {
  flex-direction: column;
  align-items: stretch;
  gap: 4px;
  padding: 6px 8px;
}

.label-top {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  min-width: 0;
}

.label-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  min-width: 0;
}

.cam-name {
  font-size: calc(11px + var(--coc-font-boost));
  font-weight: 600;
  line-height: 1.35;
  flex: 1;
  min-width: 0;
  white-space: normal;
  word-break: break-all;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.cam-status {
  font-size: calc(11px + var(--coc-font-boost));
  flex-shrink: 0;
  font-weight: 600;
}

.cam-status.online { color: var(--coc-success); }
.cam-status.offline { color: var(--coc-danger); }

.operator-tag {
  font-size: calc(10px + var(--coc-font-boost));
  color: var(--coc-text-muted);
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.video-cell.empty {
  background: #fafafa;
  border-style: dashed;
  cursor: default;
}
</style>
