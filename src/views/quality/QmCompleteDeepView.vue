<script setup>
/**
 * 竣工验收 — 本页直接展示填报表单
 * 顶部：实体工程/专项完成情况；全部完成后可填报
 */
import { computed, ref, watch } from 'vue'
import { useQmProjectScope } from '../../composables/useCurrentProject'
import { buildCompleteGate, getOrCreateCompleteDraft } from '../../mock/qm.js'
import QmCompletePrereqPanel from './components/QmCompletePrereqPanel.vue'
import QmTaskEdit from './components/QmTaskEdit.vue'

const { isHqSelected, scopeProjectId, scopeProjectLabel } = useQmProjectScope()
const tick = ref(0)
const draftTaskId = ref('')

const gate = computed(() => {
  void tick.value
  return buildCompleteGate(isHqSelected.value ? '' : scopeProjectId.value)
})

function refreshDraft() {
  draftTaskId.value = ''
  if (isHqSelected.value || !scopeProjectId.value) return
  const r = getOrCreateCompleteDraft(scopeProjectId.value)
  // 有进行中任务则展示；前置未齐且无任务则不展示表单
  if (r.task) draftTaskId.value = r.task.id
  tick.value += 1
}

watch([scopeProjectId, isHqSelected], refreshDraft, { immediate: true })

watch(
  () => gate.value.canStart,
  (ok, prev) => {
    if (ok && !prev && !draftTaskId.value) refreshDraft()
  },
)
</script>

<template>
  <div class="qm-page page-card">
    <div class="page-header">
      <div class="page-breadcrumb">质量验评 / 竣工验收</div>
      <h1 class="page-title">竣工验收</h1>
      <p class="page-tip">
        当前：{{ isHqSelected ? '请切换到具体项目' : scopeProjectLabel }}
        · 实体工程验收与专项验收均全部完成后，可在本页直接填报
      </p>
    </div>

    <el-alert
      v-if="isHqSelected"
      type="warning"
      :closable="false"
      show-icon
      title="竣工验收仅项目级可用，请先在顶部切换到具体项目"
      class="mb"
    />

    <template v-else>
      <div class="section-title">前置完成情况</div>
      <QmCompletePrereqPanel :gate="gate" class="mb" />

      <QmTaskEdit
        v-if="draftTaskId"
        :key="draftTaskId"
        :task-id="draftTaskId"
        title="竣工填报/报验"
        list-path="/qm/inspect/complete-deep"
        embedded
        hide-prereq
      />
      <el-empty
        v-else
        description="实体工程与专项验收均全部完成后，本页将自动展开竣工填报表单"
        :image-size="72"
      />
    </template>
  </div>
</template>

<style scoped>
.qm-page { display: flex; flex-direction: column; gap: 12px; }
.page-breadcrumb { font-size: 12px; color: #909399; }
.page-title { margin: 4px 0; font-size: 20px; }
.page-tip { margin: 0; font-size: 13px; color: #606266; }
.section-title {
  margin: 4px 0 0;
  font-size: 15px;
  font-weight: 600;
  color: #303133;
}
.mb { margin-bottom: 4px; }
</style>
