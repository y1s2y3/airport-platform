<script setup>
import { computed } from 'vue'
import { useCurrentProject } from '../composables/useCurrentProject.js'
import { projectSamplingRole, samplingPersonId, samplingActorId, useSamplingRole } from '../mock/hazardSampling.js'
import { getCurrentHazardIssueProjectKey } from '../utils/hazardIssueSummary.js'
import { getSamplingPeople, getSamplingManager } from '../mock/samplingPeople.js'
const { selectedProjectId } = useCurrentProject()
const role = useSamplingRole()
const projectKey = computed(() => getCurrentHazardIssueProjectKey(selectedProjectId.value))
const people = computed(() => getSamplingPeople(projectKey.value))
const actor = computed({get:()=>samplingActorId(projectKey.value,role.value),set:value=>{samplingPersonId.value=value}})
</script>
<template>
  <div v-if="role !== 'hq'" class="sampling-controls">
    <span>原型演示身份</span><el-select v-model="projectSamplingRole" style="width:140px"><el-option label="抽检人" value="supervisor"/><el-option label="项目经理" value="manager"/></el-select>
    <template v-if="role === 'supervisor'"><span>当前办理人</span><el-select v-model="actor" filterable style="width:300px"><el-option v-for="person in people" :key="person.id" :label="person.label" :value="person.id"/></el-select></template>
    <span v-else>{{ getSamplingManager(projectKey)?.label || '项目经理' }}</span>
  </div>
</template>
<style scoped>
.sampling-controls { display:flex; align-items:center; gap:12px; flex-wrap:wrap; padding:16px; margin-bottom:16px; border:1px solid #e5e9ef; border-radius:8px; background:#fff; }
</style>
