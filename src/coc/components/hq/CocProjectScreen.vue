<script setup>
import CocPanelHeading from './CocPanelHeading.vue'
import SafetyVideoPanel from '../safety/SafetyVideoPanel.vue'
import ProgressPanel from '../ProgressPanel.vue'
import LaborStats from '../LaborStats.vue'
import ProjectHazardListPanel from '../ProjectHazardListPanel.vue'

defineProps({
  projects: { type: Array, required: true },
  selectedProjectId: { type: String, required: true },
  statusFilters: { type: Array, required: true },
  selectedProject: { type: Object, required: true },
  videoProject: { type: Object, required: true },
})

const emit = defineEmits([
  'project-change',
  'status-filter',
  'open-dispatch',
  'expand-progress',
  'project-dispatch',
])
</script>

<template>
  <main class="hq-grid">
    <section class="hq-zone hq-zone--media">
      <SafetyVideoPanel
        class="hq-media-panel"
        hq-layout
        :project="videoProject"
        :projects="projects"
        :selection-id="selectedProjectId"
        :status-filters="statusFilters"
        @project-change="emit('project-change', $event)"
        @status-filter="emit('status-filter', $event)"
        @open-dispatch="emit('open-dispatch', $event)"
      />
    </section>

    <section class="hq-zone hq-zone--progress">
      <CocPanelHeading title="项目进度" />
      <ProgressPanel
        class="hq-panel hq-hide-inner-title"
        :projects="projects"
        :project="selectedProject"
        :is-enterprise="false"
        @expand="emit('expand-progress')"
        @project-change="emit('project-change', $event)"
      />
    </section>

    <aside class="hq-zone hq-zone--right">
      <button
        type="button"
        class="project-dispatch-btn"
        @click="emit('project-dispatch')"
      >
        项目调度
      </button>
      <div class="hq-analysis-block">
        <CocPanelHeading title="劳务分析" />
        <LaborStats
          class="hq-labor-panel hq-hide-inner-title"
          :projects="projects"
          :focus-project="selectedProject"
          :is-enterprise="false"
        />
      </div>
      <div class="hq-analysis-block hq-analysis-block--hazard">
        <CocPanelHeading title="隐患清单" />
        <ProjectHazardListPanel
          class="hq-hazard-panel hq-hide-inner-title"
          :project-id="selectedProject.id"
        />
      </div>
    </aside>
  </main>
</template>

<style scoped>
.hq-grid {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  grid-template-rows: repeat(3, minmax(0, 1fr));
  gap: 12px;
  padding: 4px 20px 16px;
}

.hq-zone {
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.hq-zone--media {
  grid-column: 1 / 3;
  grid-row: 1 / 3;
}

.hq-media-panel {
  flex: 1;
  min-height: 0;
  height: 100%;
}

.hq-media-panel :deep(.safety-video-wrap),
.hq-media-panel :deep(.safety-video-modules) {
  height: 100%;
  min-height: 0;
}

.hq-zone--progress {
  grid-column: 1 / 3;
  grid-row: 3 / 4;
}

.hq-zone--progress .hq-panel {
  flex: 1;
  min-height: 0;
}

.hq-zone--right {
  grid-column: 3 / 4;
  grid-row: 1 / 4;
  gap: 10px;
}

.project-dispatch-btn {
  flex-shrink: 0;
  width: 100%;
  height: 34px;
  margin: 0;
  padding: 0 12px;
  border-radius: 6px;
  border: 1px solid rgba(94, 238, 255, 0.45);
  background: rgba(64, 158, 255, 0.12);
  color: #5eeeff;
  font-size: calc(12px + var(--coc-font-boost));
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s, border-color 0.2s, box-shadow 0.2s;
}

.project-dispatch-btn:hover {
  background: rgba(64, 158, 255, 0.22);
  border-color: rgba(94, 238, 255, 0.65);
  box-shadow: 0 0 12px rgba(94, 238, 255, 0.15);
}

.hq-analysis-block {
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.hq-analysis-block:first-of-type {
  flex: 1.15;
}

.hq-analysis-block--hazard {
  flex: 1;
  min-height: 0;
}

.hq-labor-panel,
.hq-hazard-panel {
  flex: 1;
  min-height: 0;
}
</style>
