<script setup>
import { computed } from 'vue'
import { workflowSteps, currentWorkflowStep } from '../utils/inspectionRectificationWorkflow'
const props = defineProps({ record: Object })
const steps = computed(() => workflowSteps(props.record))
</script>
<template><section v-if="record" class="inspection-workflow-summary"><h4>整改流程及处理人员</h4><div v-for="step in steps" :key="step.key" class="workflow-line"><strong>{{ step.label }}</strong><span>{{ step.actor || '未配置' }}</span><b>{{ currentWorkflowStep(record)?.key === step.key ? '当前节点' : record[step.result] || (record[step.date] ? '已提交' : '待流转') }}</b><small v-if="record[step.date]">{{ record[step.date] }}</small><p v-if="record[step.note]">{{ record[step.note] }}</p></div></section></template>
<style scoped>.inspection-workflow-summary { container-type:inline-size;padding:16px;background:#fff;border:1px solid #ebeef5;border-radius:8px;margin:12px 0; }.inspection-workflow-summary h4 { margin:0 0 12px;color:#8f0045; }.workflow-line { display:flex;gap:8px;flex-wrap:wrap;padding:9px 0;border-bottom:1px solid #eee;font-size:13px; }.workflow-line strong { min-width:160px; }.workflow-line span { flex:1; }.workflow-line b { color:#8f0045; }.workflow-line p { width:100%;margin:0;white-space:pre-wrap;color:#666; } @container (max-width:500px) { .workflow-line { display:grid;grid-template-columns:minmax(0,1fr) auto;gap:6px 12px; }.workflow-line strong,.workflow-line p { grid-column:1 / -1;min-width:0; }.workflow-line span { min-width:0;overflow-wrap:anywhere; }.workflow-line small { grid-column:1 / -1;color:#909399; } }</style>
