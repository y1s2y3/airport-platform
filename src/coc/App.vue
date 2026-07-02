<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import TopNav from './components/TopNav.vue'
import SafetyVideoPanel from './components/safety/SafetyVideoPanel.vue'
import ProjectProgressDetailView from './components/ProjectProgressDetailView.vue'
import ProgressPanel from './components/ProgressPanel.vue'
import LaborStats from './components/LaborStats.vue'
import LaborAnalysisPanel from './components/LaborAnalysisPanel.vue'
import HazardAnalysisPanel from './components/HazardAnalysisPanel.vue'
import ProjectRedBlackBoard from './components/ProjectRedBlackBoard.vue'
import CocFloatingPanels from './components/CocFloatingPanels.vue'
import { useCommandMeetingControl } from './composables/useCommandMeetingControl.js'
import CommandMeetingLiveView from './components/CommandMeetingLiveView.vue'
import CommandMeetingRecordsView from './components/CommandMeetingRecordsView.vue'
import ProjectHazardListPanel from './components/ProjectHazardListPanel.vue'
import ProjectDispatchView from './components/ProjectDispatchView.vue'
import { cocFeatureFlags } from './config/featureFlags.js'
import { collapseCocFloatingPanels } from './composables/useMeetingAiSession.js'
import { DESIGN_WIDTH, DESIGN_HEIGHT, FOCUS_PROJECT_ID, HQ_SELECTION_ID, buildProjects, getProjectShortName, resolveDispatchProjectId } from './mock/data.js'

const projects = ref(buildProjects())
const selectedProjectId = ref(HQ_SELECTION_ID)
const statusFilters = ref(['在建'])
const homeProjectDispatchId = ref(null)
const homeProjectDispatchLabel = ref('')
const homeProjectDispatchDeviceId = ref(null)
const progressDetailScreen = ref(false)
const scale = ref(1)
const { commandMeetingScreen } = useCommandMeetingControl()

function closeMeetingScreen() {
  commandMeetingScreen.value = null
}

function closeHomeProjectDispatch() {
  homeProjectDispatchId.value = null
  homeProjectDispatchLabel.value = ''
  homeProjectDispatchDeviceId.value = null
}

function openHomeProjectDispatch(projectId, label, deviceId = null) {
  collapseCocFloatingPanels()
  commandMeetingScreen.value = null
  homeProjectDispatchId.value = projectId
  homeProjectDispatchLabel.value = label
  homeProjectDispatchDeviceId.value = deviceId
}

function handleOpenDispatchFromHome(device) {
  const projectId = resolveDispatchProjectId(device, selectedProjectId.value)
  const project = projects.value.find((p) => p.id === projectId)
  openHomeProjectDispatch(
    projectId,
    project?.shortName || getProjectShortName(projectId),
    device.id,
  )
}

function handleLeaderSpeech() {
  collapseCocFloatingPanels()
  closeHomeProjectDispatch()
  commandMeetingScreen.value = 'live'
}

function handleProjectLevelDispatch() {
  const project = selectedProject.value
  if (!project) return
  openHomeProjectDispatch(project.id, project.shortName || getProjectShortName(project))
}

const canvasRef = ref(null)

const filteredProjects = computed(() =>
  projects.value.filter((p) => statusFilters.value.includes(p.status)),
)

const isHqView = computed(() => selectedProjectId.value === HQ_SELECTION_ID)

const selectedProject = computed(() => {
  if (isHqView.value) return null
  return projects.value.find((p) => p.id === selectedProjectId.value) || null
})

const videoProject = computed(() =>
  projects.value.find((p) => p.id === FOCUS_PROJECT_ID) || projects.value[0],
)

const homeDispatchVideoProject = computed(() => {
  if (!homeProjectDispatchId.value) return videoProject.value
  return projects.value.find((p) => p.id === homeProjectDispatchId.value) || videoProject.value
})

function updateScale() {
  const sw = window.innerWidth / DESIGN_WIDTH
  const sh = window.innerHeight / DESIGN_HEIGHT
  scale.value = Math.min(sw, sh)
  window.dispatchEvent(new Event('coc-scale-change'))
}

function handleProjectChange(id) {
  selectedProjectId.value = id
  progressDetailScreen.value = false
  closeHomeProjectDispatch()
}

function handleStatusFilter(filters) {
  statusFilters.value = filters
}

onMounted(() => {
  updateScale()
  window.addEventListener('resize', updateScale)
})

onUnmounted(() => {
  window.removeEventListener('resize', updateScale)
})
</script>

<template>
  <div class="screen-viewport">
    <CocFloatingPanels
      :projects="projects"
      :selected-project-id="selectedProjectId"
      :status-filters="statusFilters"
      @project-change="handleProjectChange"
    />

    <div class="screen-badge">
      1920×1080 · 缩放 {{ (scale * 100).toFixed(0) }}%
    </div>

    <div
      ref="canvasRef"
      class="screen-canvas"
      :style="{ transform: `scale(${scale})` }"
    >
      <TopNav
        :projects="projects"
        :selection-id="selectedProjectId"
        :status-filters="statusFilters"
        @project-change="handleProjectChange"
      />

      <CommandMeetingLiveView
        v-if="commandMeetingScreen === 'live'"
        @back="closeMeetingScreen"
      />

      <ProjectDispatchView
        v-else-if="homeProjectDispatchId"
        :video-project="homeDispatchVideoProject"
        :selected-project-id="homeProjectDispatchId"
        :project-label="homeProjectDispatchLabel"
        :initial-device-id="homeProjectDispatchDeviceId"
        show-back
        @back="closeHomeProjectDispatch"
      />

      <CommandMeetingRecordsView
        v-else-if="cocFeatureFlags.meetingRecordsEntry && commandMeetingScreen === 'records'"
        @back="closeMeetingScreen"
      />

      <ProjectProgressDetailView
        v-else-if="progressDetailScreen && selectedProject"
        :project="selectedProject"
        @back="progressDetailScreen = false"
      />

      <main v-else class="main-layout">
        <section class="left-column">
          <div class="video-section">
            <SafetyVideoPanel
              :project="videoProject"
              :projects="projects"
              :selection-id="selectedProjectId"
              :status-filters="statusFilters"
              @project-change="handleProjectChange"
              @status-filter="handleStatusFilter"
              @open-dispatch="handleOpenDispatchFromHome"
            />
          </div>
          <div class="progress-section">
            <ProgressPanel
              :projects="projects"
              :project="selectedProject"
              :is-enterprise="isHqView"
              @expand="progressDetailScreen = true"
              @project-change="handleProjectChange"
            />
          </div>
        </section>

        <aside class="right-column" :class="{ 'hq-mode': isHqView }">
          <ProjectRedBlackBoard
            v-if="isHqView"
            @leader-speech="handleLeaderSpeech"
          />
          <LaborAnalysisPanel v-if="isHqView" :projects="projects" />
          <HazardAnalysisPanel v-if="isHqView" @project-change="handleProjectChange" />
          <div v-if="!isHqView" class="project-right-stack">
            <el-button class="project-dispatch-btn" @click="handleProjectLevelDispatch">
              项目调度
            </el-button>
            <LaborStats
              class="stack-labor"
              :projects="projects"
              :focus-project="selectedProject || videoProject"
              :is-enterprise="false"
            />
            <ProjectHazardListPanel
              v-if="selectedProject"
              class="stack-hazard"
              :project-id="selectedProject.id"
            />
          </div>
        </aside>
      </main>

      <!-- 全画布浮层挂载点（视频放大等），须置于 canvas 最末层 -->
      <div id="coc-overlay-root" class="coc-overlay-root" />
    </div>
  </div>
</template>

<style scoped>
.main-layout {
  display: flex;
  flex: 1;
  min-height: 0;
  padding: 20px 28px;
  gap: 20px;
}

.left-column {
  flex: 0 0 73%;
  display: flex;
  flex-direction: column;
  gap: 20px;
  min-width: 0;
  height: 100%;
  min-height: 0;
}

.video-section {
  flex: 2 1 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.video-section :deep(.safety-video-wrap) {
  flex: 1;
  min-height: 0;
  height: 100%;
}

.progress-section {
  flex: 1 1 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.progress-section :deep(.progress-panel) {
  flex: 1;
  min-height: 0;
}

.right-column {
  flex: 0 0 27%;
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
  height: 100%;
  min-height: 0;
}

.right-column.hq-mode {
  gap: 12px;
}

.right-column.hq-mode :deep(.dispatch-meeting-panel) {
  flex: 0 0 auto;
}

.right-column.hq-mode :deep(.red-black-wrap) {
  flex: 1;
  min-height: 0;
}

.right-column.hq-mode :deep(.labor-analysis-panel) {
  flex: 0 0 auto;
}

.right-column.hq-mode :deep(.hazard-analysis-panel) {
  flex: 1.1;
  min-height: 0;
}

.project-right-stack {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.project-dispatch-btn {
  flex-shrink: 0;
  width: 100%;
  height: 32px;
  margin: 0;
  font-size: calc(12px + var(--coc-font-boost));
  font-weight: 600;
  color: var(--coc-accent);
  border-color: rgba(201, 123, 99, 0.45);
}

.project-dispatch-btn:hover {
  color: var(--coc-accent);
  border-color: var(--coc-accent);
  background: rgba(201, 123, 99, 0.06);
}

.stack-labor {
  flex: 3;
  min-height: 0;
}

.stack-hazard {
  flex: 2;
  min-height: 0;
}

.project-right-stack :deep(.labor-panel),
.project-right-stack :deep(.project-hazard-panel) {
  height: 100%;
}
</style>
