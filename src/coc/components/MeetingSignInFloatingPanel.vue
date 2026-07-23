<script setup>
import { computed, ref, watch } from 'vue'
import { UserFilled } from '@element-plus/icons-vue'
import { useSignInFloatingPanel } from '../composables/useMeetingAiSession.js'
import { HQ_SELECTION_ID, getProjectShortName } from '../mock/data.js'
import MeetingRegistration from './MeetingRegistration.vue'

const props = defineProps({
  projects: { type: Array, default: () => [] },
  selectedProjectId: { type: String, default: HQ_SELECTION_ID },
  statusFilters: { type: Array, default: () => ['在建'] },
})

const emit = defineEmits(['project-change'])

const { panelExpanded, togglePanel } = useSignInFloatingPanel()

const isHqMode = computed(() => props.selectedProjectId === HQ_SELECTION_ID)
const signInProjectId = ref('')

/** 与项目列表一致：按状态筛选，当前选中项目始终保留在下拉中 */
const selectableProjects = computed(() => {
  let list = props.projects.filter((p) => props.statusFilters.includes(p.status))
  const activeId = isHqMode.value ? signInProjectId.value : props.selectedProjectId
  if (activeId) {
    const selected = props.projects.find((p) => p.id === activeId)
    if (selected && !list.some((p) => p.id === selected.id)) {
      list = [selected, ...list]
    }
  }
  return list
})

watch(
  [() => props.projects, () => props.statusFilters, isHqMode],
  () => {
    if (!isHqMode.value) return
    const list = selectableProjects.value
    if (!list.length) {
      signInProjectId.value = ''
      return
    }
    if (!list.some((p) => p.id === signInProjectId.value)) {
      signInProjectId.value = list[0].id
    }
  },
  { immediate: true },
)

const activeSignInProjectId = computed(() =>
  isHqMode.value ? signInProjectId.value : props.selectedProjectId,
)

const projectOptions = computed(() =>
  selectableProjects.value.map((p) => ({
    value: p.id,
    label: p.shortName || getProjectShortName(p),
  })),
)

const meetingPersonnel = computed(() => {
  const project = props.projects.find((p) => p.id === activeSignInProjectId.value)
  return project?.personnel || []
})

function handleScopeSelect(id) {
  if (!id || id === activeSignInProjectId.value) return
  if (isHqMode.value) {
    signInProjectId.value = id
    return
  }
  emit('project-change', id)
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
      <el-icon :size="22"><UserFilled /></el-icon>
      <div class="fab-label-wrap">
        <span class="fab-label">会议签到</span>
        <span class="panel-v2-tip panel-v2-tip--fab">V2版本上线</span>
      </div>
    </button>

    <div v-else class="panel-card sign-in-panel">
      <div class="panel-title compact title-row">
        <div class="title-main">
          <span>会议签到</span>
          <span class="panel-v2-tip">V2版本上线</span>
        </div>
        <button type="button" class="collapse-btn" title="收起" @click="togglePanel(false)">
          收起
        </button>
      </div>

      <div class="panel-body sign-in-body">
        <el-select
          :model-value="activeSignInProjectId"
          class="scope-select"
          placeholder="请选择项目"
          size="default"
          filterable
          @update:model-value="handleScopeSelect"
        >
          <el-option
            v-for="opt in projectOptions"
            :key="opt.value"
            :label="opt.label"
            :value="opt.value"
          />
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
  width: var(--coc-float-fab-size, 56px);
  min-height: var(--coc-float-fab-size, 56px);
  height: auto;
  padding: 6px 4px;
  border: 1px solid var(--coc-fab-border, rgba(201, 123, 99, 0.35));
  border-radius: 12px;
  background: var(--coc-fab-bg, linear-gradient(180deg, #fff, #faf6f3));
  color: var(--coc-accent);
  cursor: pointer;
  box-shadow: var(--coc-fab-shadow, 0 4px 16px rgba(0, 0, 0, 0.12));
}

.sign-fab-btn:hover {
  border-color: var(--coc-accent);
  box-shadow: var(--coc-fab-hover-shadow, 0 6px 20px rgba(201, 123, 99, 0.18));
}

.fab-label-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  max-width: 100%;
}

.fab-label {
  font-size: calc(10px + var(--coc-font-boost));
  font-weight: 700;
  line-height: 1;
}

.panel-v2-tip--fab {
  margin-left: 0;
  font-size: calc(7px + var(--coc-font-boost));
  padding: 0 3px;
  line-height: 1.2;
  max-width: 48px;
  white-space: normal;
  text-align: center;
}

.title-main {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  flex: 1;
}

.sign-in-panel {
  width: var(--coc-float-panel-width, 340px);
  height: var(--coc-float-panel-height, 400px);
  max-height: var(--coc-float-panel-height, 400px);
  min-height: var(--coc-float-panel-min-height, 280px);
  display: flex;
  flex-direction: column;
  box-shadow: 0 8px 28px rgba(0, 0, 0, 0.14);
}

.title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: calc(13px + var(--coc-font-boost));
  padding: 6px 12px;
  line-height: 1.2;
  flex-shrink: 0;
}

.collapse-btn {
  border: none;
  background: transparent;
  font-size: calc(11px + var(--coc-font-boost));
  font-weight: 600;
  color: var(--coc-text-secondary);
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 4px;
}

.collapse-btn:hover {
  color: var(--coc-accent);
  background: var(--coc-collapse-hover-bg, rgba(201, 123, 99, 0.08));
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

.sign-in-body :deep(.meeting-registration-root) {
  flex: 1;
  min-height: 0;
}
</style>
