<script setup>
import { computed } from 'vue'
import { ArrowLeft } from '@element-plus/icons-vue'
import DispatchVideoPanels from './safety/dispatch/DispatchVideoPanels.vue'
import DispatchProjectDispatchLower from './safety/dispatch/DispatchProjectDispatchLower.vue'
import DispatchDocTicketPanel from './safety/dispatch/DispatchDocTicketPanel.vue'
import DispatchHazardListPanel from './safety/dispatch/DispatchHazardListPanel.vue'
import QualityEvalRiskPanel from './safety/dispatch/QualityEvalRiskPanel.vue'
import { getMonitorDispatchDevices, findDispatchDevice, DISPATCH_DEVICES } from '../mock/data.js'

const props = defineProps({
  videoProject: { type: Object, required: true },
  selectedProjectId: { type: String, required: true },
  showBack: { type: Boolean, default: false },
  projectLabel: { type: String, default: '' },
  initialDeviceId: { type: String, default: '' },
})

defineEmits(['back'])

const dispatchDevice = computed(() => {
  if (props.initialDeviceId) return findDispatchDevice(props.initialDeviceId)
  const list = getMonitorDispatchDevices(
    props.selectedProjectId,
    props.videoProject?.shortName || props.projectLabel,
  )
  return list[0] || findDispatchDevice(DISPATCH_DEVICES[0]?.id)
})
</script>

<template>
  <main class="project-dispatch-layout" :class="{ 'with-back': showBack }">
    <div v-if="showBack" class="dispatch-backbar panel-card">
      <div class="topbar-row">
        <button type="button" class="back-btn" @click="$emit('back')">
          <el-icon :size="14"><ArrowLeft /></el-icon>
          返回
        </button>
        <span class="back-title">
          {{ projectLabel ? `项目调度 · ${projectLabel}` : '项目调度' }}
        </span>
      </div>
    </div>

    <div class="dispatch-content">
      <section class="dispatch-main">
        <section class="detail-upper">
          <DispatchVideoPanels
            :device="dispatchDevice"
            :video-project="videoProject"
            :project-id="selectedProjectId"
            :single-device-view="Boolean(initialDeviceId)"
            :enable-device-switch="Boolean(initialDeviceId)"
            monitor-grid="3x2"
            vertical-stretch
          />
        </section>

        <DispatchProjectDispatchLower :project-id="selectedProjectId" />
      </section>

      <aside class="dispatch-side">
        <DispatchDocTicketPanel :device="dispatchDevice" />
        <DispatchHazardListPanel />
        <QualityEvalRiskPanel :selection-id="selectedProjectId" />
      </aside>
    </div>
  </main>
</template>

<style scoped>
.project-dispatch-layout {
  display: flex;
  flex: 1;
  min-height: 0;
  padding: 8px 28px 20px;
  gap: 6px;
  flex-direction: column;
}

.dispatch-content {
  flex: 1;
  min-height: 0;
  display: flex;
  gap: 20px;
}

.dispatch-backbar {
  flex-shrink: 0;
  flex-direction: row;
  padding: 6px 20px;
}

.topbar-row {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 16px;
  width: 100%;
}

.back-btn {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 14px;
  border: 1px solid var(--coc-border);
  border-radius: 6px;
  background: #fff;
  font-size: calc(13px + var(--coc-font-boost));
  font-weight: 600;
  cursor: pointer;
  color: var(--coc-text);
}

.back-btn:hover {
  border-color: var(--coc-accent);
  color: var(--coc-accent);
}

.back-title {
  font-size: calc(16px + var(--coc-font-boost));
  font-weight: 700;
  color: var(--coc-text);
  white-space: nowrap;
  line-height: 1.2;
}

.dispatch-main {
  flex: 0 0 73%;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.detail-upper {
  flex: 2 1 0;
  min-height: 0;
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: 14px;
}

.dispatch-main :deep(.project-dispatch-lower) {
  flex: 1 1 0;
  min-height: 0;
}

.detail-upper :deep(.device-panel),
.detail-upper :deep(.monitor-panel) {
  min-height: 0;
  height: 100%;
}

.detail-upper :deep(.device-body),
.detail-upper :deep(.monitor-wrap) {
  flex: 1;
  min-height: 0;
}

.detail-upper :deep(.main-video),
.detail-upper :deep(.device-live-grid) {
  flex: 1;
  min-height: 0;
}

.detail-upper :deep(.monitor-grid) {
  flex: 1;
  min-height: 0;
  height: auto;
}

.dispatch-side {
  flex: 1;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.dispatch-side :deep(.doc-ticket-panel),
.dispatch-side :deep(.hazard-side-panel),
.dispatch-side :deep(.quality-risk-panel) {
  flex: 1 1 0;
  min-height: 0;
}
</style>
