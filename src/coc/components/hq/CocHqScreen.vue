<script setup>
import CocPanelHeading from './CocPanelHeading.vue'
import SafetyVideoPanel from '../safety/SafetyVideoPanel.vue'
import ProgressPanel from '../ProgressPanel.vue'
import ProjectRedBlackBoard from '../ProjectRedBlackBoard.vue'
import LaborAnalysisPanel from '../LaborAnalysisPanel.vue'
import HazardAnalysisPanel from '../HazardAnalysisPanel.vue'

defineProps({
  projects: { type: Array, required: true },
  selectedProjectId: { type: String, required: true },
  statusFilters: { type: Array, required: true },
  videoProject: { type: Object, required: true },
})

const emit = defineEmits([
  'project-change',
  'status-filter',
  'open-dispatch',
  'leader-speech',
])
</script>

<template>
  <main class="hq-grid">
    <!-- 左上 2×2：监控列表 + 视频监控 + 巡检对讲设备 -->
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

    <!-- 左下 1×2：项目进度 -->
    <section class="hq-zone hq-zone--progress">
      <CocPanelHeading title="项目进度" />
      <ProgressPanel
        class="hq-panel hq-hide-inner-title"
        :projects="projects"
        :project="null"
        is-enterprise
        @project-change="emit('project-change', $event)"
      />
    </section>

    <!-- 右侧 3×1：领导讲话 / 红黑榜 / 劳务 / 隐患 -->
    <aside class="hq-zone hq-zone--right">
      <div class="hq-analysis-block hq-analysis-block--rb">
        <ProjectRedBlackBoard
          class="hq-rb-board hq-hide-inner-title"
          dark-theme
          @leader-speech="emit('leader-speech')"
        />
      </div>
      <div class="hq-analysis-block">
        <CocPanelHeading title="劳务分析" />
        <LaborAnalysisPanel
          class="hq-labor-panel hq-hide-inner-title"
          dark-theme
          :projects="projects"
        />
      </div>
      <div class="hq-analysis-block hq-analysis-block--hazard">
        <CocPanelHeading title="隐患分析" />
        <HazardAnalysisPanel
          class="hq-hazard-panel hq-hide-inner-title"
          dark-theme
          @project-change="emit('project-change', $event)"
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

/* 左上 2×2 */
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

/* 左下 1×2 */
.hq-zone--progress {
  grid-column: 1 / 3;
  grid-row: 3 / 4;
}

.hq-zone--progress .hq-panel {
  flex: 1;
  min-height: 0;
}

/* 右侧 3×1 */
.hq-zone--right {
  grid-column: 3 / 4;
  grid-row: 1 / 4;
  gap: 10px;
}

.hq-analysis-block--rb {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.hq-analysis-block--rb .hq-rb-board {
  flex: 1;
  min-height: 0;
}

.hq-analysis-block {
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
}

.hq-analysis-block--hazard {
  flex: 1;
  min-height: 0;
}

.hq-analysis-block--hazard .hq-hazard-panel {
  flex: 1;
  min-height: 0;
}

.hq-hazard-panel {
  min-height: 0;
}
</style>
