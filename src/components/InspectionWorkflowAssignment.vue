<script setup>
import { computed, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { inspectorCandidates } from '../composables/useInspectionPersonConfig'
import { assignInspectionWorkflowStep } from '../composables/useMobileRectification'
import { canAssignInspectionStep, inspectionOperator } from '../utils/inspectionWorkflowIdentity'

const props = defineProps({ record: Object, stage: String, revision: { type: Number, default: 0 } })
const emit = defineEmits(['assigned'])
const targetId = ref('')
const allowed = computed(() => canAssignInspectionStep(props.record, props.stage))
const candidates = computed(() => inspectorCandidates.filter(person => person.id !== inspectionOperator().id))
function assign() {
  const result = assignInspectionWorkflowStep(props.record?.id, props.stage, targetId.value, props.revision)
  if (!result.ok) return ElMessage.warning(result.message)
  ElMessage.success('已指派，当前任务由接收人办理')
  emit('assigned')
}
</script>
<template>
  <div v-if="allowed" class="inspection-assignment">
    <strong>指派任务</strong>
    <div class="assignment-row">
      <el-select v-model="targetId" filterable placeholder="请选择接收人" aria-label="指派接收人">
        <el-option v-for="person in candidates" :key="person.id" :value="person.id" :label="`${person.name}（${person.role}）`" />
      </el-select>
      <el-button :disabled="!targetId" @click="assign">指派</el-button>
    </div>
    <small>指派后由接收人办理，你将不能继续执行本任务。</small>
  </div>
</template>
<style scoped>
.inspection-assignment { margin:12px 0; padding:12px; border:1px solid #eadce3; border-radius:8px; background:#fff; font-size:13px; }
.assignment-row { display:flex; gap:8px; margin:10px 0; }
.assignment-row .el-select { flex:1; min-width:0; }
small { color:#888; line-height:1.5; }
</style>
