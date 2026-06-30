<script setup>
import { ref, computed } from 'vue'
import { UserFilled } from '@element-plus/icons-vue'
import { HQ_SELECTION_ID, getProjectShortName, buildHqMeetingPersonnel } from '../mock/data.js'
import MeetingRegistration from './MeetingRegistration.vue'

const props = defineProps({
  projects: { type: Array, default: () => [] },
  selectedProjectId: { type: String, default: HQ_SELECTION_ID },
  statusFilters: { type: Array, default: () => ['在建'] },
})

const emit = defineEmits(['project-change'])

const panelExpanded = ref(true)

const isHqMode = computed(() => props.selectedProjectId === HQ_SELECTION_ID)

/** 与项目列表一致：按状态筛选，当前选中项目始终保留在下拉中 */
const selectableProjects = computed(() => {
  let list = props.projects.filter((p) => props.statusFilters.includes(p.status))
  if (!isHqMode.value) {
    const selected = props.projects.find((p) => p.id === props.selectedProjectId)
    if (selected && !list.some((p) => p.id === selected.id)) {
      list = [selected, ...list]
    }
  }
  return list
})

const projectOptions = computed(() =>
  selectableProjects.value.map((p) => ({
    value: p.id,
    label: p.shortName || getProjectShortName(p),
  })),
)

const meetingPersonnel = computed(() => {
  if (isHqMode.value) {
    return buildHqMeetingPersonnel(props.projects, props.statusFilters)
  }
  const project = props.projects.find((p) => p.id === props.selectedProjectId)
  return project?.personnel || []
})

function handleScopeSelect(id) {
  if (!id || id === props.selectedProjectId) return
  emit('project-change', id)
}

function togglePanel(force) {
  panelExpanded.value = typeof force === 'boolean' ? force : !panelExpanded.value
}

defineExpose({ togglePanel, panelExpanded })
</script>

<template>
  <div class="sign-in-float">
    <button
      v-if="!panelExpanded"
      type="button"
      class="sign-fab-btn"
      title="会议签到"
      @click="togglePanel(true)"
    >
      <el-icon :size="20"><UserFilled /></el-icon>
      <span class="fab-label">会议签到</span>
    </button>

    <div v-else class="panel-card sign-in-panel">
      <div class="panel-title compact title-row">
        <span>会议签到</span>
        <button type="button" class="collapse-btn" title="收起" @click="togglePanel(false)">
          收起
        </button>
      </div>

      <div class="panel-body sign-in-body">
        <el-select
          :model-value="selectedProjectId"
          class="scope-select"
          placeholder="请选择工程指挥部或项目"
          size="small"
          filterable
          @update:model-value="handleScopeSelect"
        >
          <el-option :label="'工程指挥部'" :value="HQ_SELECTION_ID">
            <div class="scope-option">
              <span class="scope-option-label scope-option-hq">工程指挥部</span>
              <span class="scope-option-sub">部门负责人 · 项目经理</span>
            </div>
          </el-option>
          <el-option-group label="项目">
            <el-option
              v-for="opt in projectOptions"
              :key="opt.value"
              :label="opt.label"
              :value="opt.value"
            />
          </el-option-group>
        </el-select>

        <MeetingRegistration embedded compact :personnel="meetingPersonnel" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.sign-in-float {
  pointer-events: auto;
}

.sign-fab-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  width: 52px;
  height: 52px;
  padding: 0;
  border: 1px solid rgba(201, 123, 99, 0.35);
  border-radius: 12px;
  background: linear-gradient(180deg, #fff, #faf6f3);
  color: var(--coc-accent);
  cursor: pointer;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
}

.sign-fab-btn:hover {
  border-color: var(--coc-accent);
  box-shadow: 0 6px 20px rgba(201, 123, 99, 0.18);
}

.fab-label {
  font-size: 9px;
  font-weight: 700;
  line-height: 1;
  transform: scale(0.92);
}

.sign-in-panel {
  width: 320px;
  height: calc((100vh - 120px) / 2);
  max-height: 380px;
  min-height: 260px;
  display: flex;
  flex-direction: column;
  box-shadow: 0 8px 28px rgba(0, 0, 0, 0.14);
}

.title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 13px;
  padding: 6px 12px;
  line-height: 1.2;
  flex-shrink: 0;
}

.collapse-btn {
  border: none;
  background: transparent;
  font-size: 11px;
  font-weight: 600;
  color: var(--coc-text-secondary);
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 4px;
}

.collapse-btn:hover {
  color: var(--coc-accent);
  background: rgba(201, 123, 99, 0.08);
}

.sign-in-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 0;
  flex: 1;
  padding: 8px 12px 12px !important;
}

.scope-select {
  width: 100%;
  flex-shrink: 0;
}

.scope-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  width: 100%;
}

.scope-option-label {
  font-weight: 600;
}

.scope-option-hq {
  color: var(--coc-accent);
}

.scope-option-sub {
  font-size: 11px;
  color: var(--coc-text-muted);
}

.sign-in-body :deep(.meeting-registration-root) {
  flex: 1;
  min-height: 0;
}
</style>
