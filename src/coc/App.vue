<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import TopNav from './components/TopNav.vue'
import CocHqHeader from './components/hq/CocHqHeader.vue'
import HqEdgeLights from './components/hq/HqEdgeLights.vue'
import CocHqScreen from './components/hq/CocHqScreen.vue'
import CocProjectScreen from './components/hq/CocProjectScreen.vue'
import './styles/hq-dark-theme.css'
import ProjectProgressDetailView from './components/ProjectProgressDetailView.vue'
import CocFloatingPanels from './components/CocFloatingPanels.vue'
import { useCommandMeetingControl } from './composables/useCommandMeetingControl.js'
import CommandMeetingLiveView from './components/CommandMeetingLiveView.vue'
import CommandMeetingRecordsView from './components/CommandMeetingRecordsView.vue'
import ProjectDispatchView from './components/ProjectDispatchView.vue'
import { cocFeatureFlags } from './config/featureFlags.js'
import { collapseCocFloatingPanels } from './composables/useMeetingAiSession.js'
import { DESIGN_WIDTH, DESIGN_HEIGHT, FOCUS_PROJECT_ID, HQ_SELECTION_ID, buildProjects, getProjectShortName, resolveDispatchProjectId } from './mock/data.js'
import { createCocInitialState } from './utils/cocBoot.js'

const cocInitialState = createCocInitialState()
const projects = ref(buildProjects())
const selectedProjectId = ref(cocInitialState.selectedProjectId)
const statusFilters = ref(['在建'])
const homeProjectDispatchId = ref(cocInitialState.homeProjectDispatchId)
const homeProjectDispatchLabel = ref(cocInitialState.homeProjectDispatchLabel)
const homeProjectDispatchDeviceId = ref(cocInitialState.homeProjectDispatchDeviceId)
const progressDetailScreen = ref(false)
const scale = ref(1)
const viewportStyle = computed(() => ({
  '--coc-viewport-scale': String(scale.value),
  '--coc-font-boost': `${Math.round(2.5 * scale.value * 10) / 10}px`,
}))
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

const isHqDarkShell = computed(() => {
  if (progressDetailScreen.value) return false
  if (commandMeetingScreen.value === 'records') return false
  return true
})

const isSecondaryScreen = computed(
  () =>
    commandMeetingScreen.value === 'live'
    || commandMeetingScreen.value === 'records'
    || Boolean(homeProjectDispatchId.value)
    || (progressDetailScreen.value && Boolean(selectedProject.value)),
)

watch(
  isHqDarkShell,
  (active) => {
    document.body.classList.toggle('coc-hq-shell', active)
  },
  { immediate: true },
)

const selectedProject = computed(() => {
  if (isHqView.value) return null
  return projects.value.find((p) => p.id === selectedProjectId.value) || null
})

const videoProject = computed(() =>
  projects.value.find((p) => p.id === FOCUS_PROJECT_ID) || projects.value[0],
)

const projectVideoProject = computed(() =>
  selectedProject.value || videoProject.value,
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
  document.body.classList.remove('coc-hq-shell')
})
</script>

<template>
  <div class="screen-viewport" :class="{ 'coc-hq-mode': isHqDarkShell }" :style="viewportStyle">
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
      :class="{ 'coc-hq-mode': isHqDarkShell, 'coc-secondary-screen': isSecondaryScreen }"
      :style="{ transform: `scale(${scale})` }"
    >
      <HqEdgeLights v-if="isHqDarkShell" />
      <CocHqHeader v-if="isHqDarkShell" />
      <TopNav
        v-else
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

      <main v-else-if="isHqView" class="hq-screen-root">
        <CocHqScreen
          :projects="projects"
          :selected-project-id="selectedProjectId"
          :status-filters="statusFilters"
          :video-project="videoProject"
          @project-change="handleProjectChange"
          @status-filter="handleStatusFilter"
          @open-dispatch="handleOpenDispatchFromHome"
          @leader-speech="handleLeaderSpeech"
        />
      </main>

      <main v-else-if="selectedProject" class="hq-screen-root">
        <CocProjectScreen
          :projects="projects"
          :selected-project-id="selectedProjectId"
          :status-filters="statusFilters"
          :selected-project="selectedProject"
          :video-project="projectVideoProject"
          @project-change="handleProjectChange"
          @status-filter="handleStatusFilter"
          @open-dispatch="handleOpenDispatchFromHome"
          @expand-progress="progressDetailScreen = true"
          @project-dispatch="handleProjectLevelDispatch"
        />
      </main>

      <!-- 全画布浮层挂载点（视频放大等），须置于 canvas 最末层 -->
      <div id="coc-overlay-root" class="coc-overlay-root" />
    </div>
  </div>
</template>

<style scoped>
.hq-screen-root {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
</style>
