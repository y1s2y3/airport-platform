<script setup>
import { computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getMobileRectification, requestInspectionVoid } from '../composables/useMobileRectification'
import { canRequestInspectionVoid } from '../utils/inspectionWorkflowIdentity'

const props = defineProps({ recordId: String })
const record = computed(() => getMobileRectification(props.recordId))
const canVoid = computed(() => canRequestInspectionVoid(record.value))

async function applyForVoid() {
  if (!canVoid.value) return
  let value
  try {
    ({ value } = await ElMessageBox.prompt(
      '提交后由指挥部安全和整改负责人审批。审批通过后，整改单及关联巡检单将从台账移除。',
      '申请作废整改单 ' + record.value.rectifyNo,
      {
        inputType: 'textarea',
        inputPlaceholder: '请填写作废理由',
        inputValidator: text => !!text?.trim() || '请填写作废理由',
        confirmButtonText: '提交申请',
        cancelButtonText: '取消',
      },
    ))
  } catch { return }
  if (!requestInspectionVoid(props.recordId, value)) return ElMessage.warning('当前单据不能申请作废，请刷新后重试')
  ElMessage.success('已提交作废申请，等待指挥部审批')
}
</script>

<template>
  <el-button v-if="canVoid" link type="danger" @click.stop="applyForVoid">作废</el-button>
</template>
