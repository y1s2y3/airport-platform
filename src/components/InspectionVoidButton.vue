<script setup>
import { computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getMobileRectification, requestInspectionVoid } from '../composables/useMobileRectification'
import { canRequestInspectionVoid } from '../utils/inspectionWorkflowIdentity'

const props = defineProps({
  recordId: String,
  /** 在「我发起的」列表中，单据按列表语义视为本人发起，不再校验发起人身份。 */
  assumeInitiator: Boolean,
})
const record = computed(() => getMobileRectification(props.recordId))
const canVoid = computed(() => canRequestInspectionVoid(record.value, { assumeInitiator: props.assumeInitiator }))

async function applyForVoid() {
  if (!canVoid.value) return
  let value
  try {
    ({ value } = await ElMessageBox.prompt(
      '提交后送交该分类配置的作废审批人。审批通过后，这张整改单标记为「已作废」，关联巡检单继续保留。',
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
  if (!requestInspectionVoid(props.recordId, value, { assumeInitiator: props.assumeInitiator })) return ElMessage.warning('当前单据不能申请作废，请刷新后重试')
  ElMessage.success('已提交作废申请，等待指挥部审批')
}
</script>

<template>
  <el-button v-if="canVoid" link type="danger" @click.stop="applyForVoid">作废</el-button>
</template>
