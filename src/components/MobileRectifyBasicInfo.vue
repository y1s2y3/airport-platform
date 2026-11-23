<script setup>
import { computed } from 'vue'
import { getConfiguredPersonLabel, getInspectionCopyDetailFields } from '../composables/useInspectionPersonConfig'
import { currentWorkflowLabel } from '../utils/inspectionRectificationWorkflow'

const props = defineProps({
  record: { type: Object, required: true },
  showCopyRecipients: Boolean,
})

const fields = computed(() => {
  const row = props.record
  const inspector = row.inspector || getConfiguredPersonLabel(row.projectId || row.project, row.inspectionCategory || '安全', 'inspectorId')
  return [
    { label: '整改单编号', value: row.rectifyNo },
    { label: '巡检任务单编号', value: row.taskNo },
    { label: '项目名称', value: row.project },
    { label: '巡检人', value: inspector },
    { label: '整改人', value: row.rectifier },
    { label: '复查人', value: row.reviewer },
    ...(props.showCopyRecipients ? getInspectionCopyDetailFields(row) : []),
    { label: '状态', value: row.status },
    { label: '当前流程节点', value: currentWorkflowLabel(row) },
    { label: '截止日期', value: row.deadline },
  ]
})
</script>

<template>
  <section class="rectify-basic-info" aria-label="基本信息">
    <h2 class="sct">基本信息</h2>
    <dl class="fields">
      <div v-for="field in fields" :key="field.label" class="field">
        <dt>{{ field.label }}</dt>
        <dd>{{ field.value || '--' }}</dd>
      </div>
    </dl>
  </section>
</template>

<style scoped>
.rectify-basic-info {
  margin: 12px 16px;
  padding: 14px 16px;
  border-radius: 10px;
  background: #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, .04);
}
.sct {
  margin: 0 0 10px;
  padding-left: 8px;
  border-left: 3px solid #8f0045;
  color: #1f2329;
  font-size: 13px;
  font-weight: 600;
}
.fields { display: grid; gap: 5px; margin: 0; }
.field { display: grid; grid-template-columns: 96px minmax(0, 1fr); gap: 10px; font-size: 13px; line-height: 1.55; }
.field dt { color: #666; }
.field dd { margin: 0; color: #1f2329; overflow-wrap: anywhere; }
</style>
