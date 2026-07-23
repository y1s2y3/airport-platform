<script setup>
import { computed } from 'vue'
import { VideoCamera } from '@element-plus/icons-vue'
import { FOCUS_PROJECT_ID, HQ_SELECTION_ID } from '../../mock/data.js'
import { useCommandMeetingControl } from '../../composables/useCommandMeetingControl.js'

const props = defineProps({
  projects: { type: Array, default: () => [] },
  selectionId: { type: String, default: HQ_SELECTION_ID },
  statusFilters: { type: Array, default: () => ['在建'] },
  focusProjectId: { type: String, default: FOCUS_PROJECT_ID },
})

const emit = defineEmits(['project-change'])

const { meetingActive, startMeeting, endMeeting } = useCommandMeetingControl()

const filteredProjects = computed(() =>
  props.projects.filter((p) => props.statusFilters.includes(p.status)),
)

const treeOptions = computed(() => [
  {
    value: HQ_SELECTION_ID,
    label: '工程指挥部',
    children: filteredProjects.value.map((p) => ({
      value: p.id,
      label: p.shortName || p.name,
      fullName: p.name,
      status: p.status,
      connected: p.id === props.focusProjectId,
    })),
  },
])

const selectedOrgId = computed({
  get: () => props.selectionId,
  set: (id) => {
    if (id) handleOrgChange(id)
  },
})

function statusClass(status) {
  if (status === '前期') return 'early'
  if (status === '在建') return 'building'
  if (status === '历史') return 'history'
  return 'default'
}

function handleOrgChange(id) {
  emit('project-change', id)
}

async function handleMeetingAction() {
  if (meetingActive.value) {
    await endMeeting()
    return
  }
  await startMeeting()
}
</script>

<template>
  <div class="hq-header-toolbar">
    <el-tree-select
      v-model="selectedOrgId"
      :data="treeOptions"
      :default-expanded-keys="[HQ_SELECTION_ID]"
      :render-after-expand="false"
      check-strictly
      filterable
      placeholder="选择组织/项目"
      class="hq-org-tree-select"
      popper-class="coc-org-tree-select-popper hq-org-tree-select-popper"
      @change="handleOrgChange"
    >
      <template #default="{ data }">
        <span v-if="data.value === HQ_SELECTION_ID" class="org-tree-node is-root">
          {{ data.label }}
        </span>
        <span
          v-else
          class="org-tree-node is-project"
          :class="{ 'is-connected': data.connected }"
          :title="data.fullName || data.label"
        >
          <span class="org-tree-label">{{ data.label }}</span>
          <span v-if="data.status" class="org-tree-status" :class="statusClass(data.status)">
            {{ data.status }}
          </span>
        </span>
      </template>
    </el-tree-select>

    <button
      type="button"
      class="hq-start-meeting-btn"
      :class="{ active: meetingActive }"
      @click="handleMeetingAction"
    >
      <el-icon :size="16"><VideoCamera /></el-icon>
      <span>{{ meetingActive ? '结束会议' : '开始会议' }}</span>
    </button>
  </div>
</template>

<style scoped>
.hq-header-toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.hq-org-tree-select {
  width: 228px;
  flex-shrink: 0;
}

.hq-org-tree-select :deep(.el-select__wrapper) {
  min-height: 36px;
  padding: 4px 12px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.3px;
  background: rgba(16, 29, 55, 0.72);
  border: 1px solid rgba(94, 238, 255, 0.38);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
  transition: border-color 0.2s, box-shadow 0.2s;
}

.hq-org-tree-select :deep(.el-select__wrapper:hover),
.hq-org-tree-select :deep(.el-select__wrapper.is-focused) {
  border-color: rgba(94, 238, 255, 0.72);
  box-shadow: 0 0 10px rgba(94, 238, 255, 0.18);
}

.hq-org-tree-select :deep(.el-select__selected-item),
.hq-org-tree-select :deep(.el-select__placeholder) {
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.35;
}

.hq-org-tree-select :deep(.el-select__caret) {
  color: rgba(94, 238, 255, 0.85);
  font-size: 14px;
}

.hq-start-meeting-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
  height: 34px;
  padding: 0 14px;
  border: 1px solid rgba(94, 238, 255, 0.55);
  border-radius: 6px;
  background: linear-gradient(135deg, rgba(64, 158, 255, 0.85), rgba(94, 238, 255, 0.75));
  color: #fff;
  font-size: calc(13px + var(--coc-font-boost));
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
  transition: border-color 0.2s, box-shadow 0.2s, opacity 0.2s;
}

.hq-start-meeting-btn:hover {
  border-color: rgba(94, 238, 255, 0.85);
  box-shadow: 0 0 12px rgba(94, 238, 255, 0.25);
}

.hq-start-meeting-btn.active {
  border-color: rgba(246, 197, 117, 0.65);
  background: linear-gradient(135deg, rgba(246, 197, 117, 0.35), rgba(246, 197, 117, 0.2));
  color: #f6c575;
}
</style>
