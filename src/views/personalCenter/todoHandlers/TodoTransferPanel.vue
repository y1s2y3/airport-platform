<script setup>
import { computed, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { dispatchTaskOperator, dispatchTaskUserOptions } from '../../../coc/utils/dispatchTaskIdentity.js'
import { transferPersonalTodo } from '../../../mock/personalCenter.js'

const props = defineProps({
  todo: { type: Object, required: true },
})
const emit = defineEmits(['transferred', 'back'])

const busy = ref(false)
const form = reactive({ toUser: '', note: '' })
const operator = computed(() => dispatchTaskOperator())
const transferOptions = computed(() => {
  const currentId = operator.value?.id || ''
  const currentName = operator.value?.name || ''
  return dispatchTaskUserOptions().filter((item) => item.userId !== currentId && item.value !== currentName)
})
const selectedLabel = computed(() => transferOptions.value.find((item) => item.value === form.toUser)?.label || form.toUser)

function submit() {
  if (busy.value) return
  const option = transferOptions.value.find((item) => item.value === form.toUser)
  if (!option) return ElMessage.warning('请选择转交人')
  if (!form.note.trim()) return ElMessage.warning('请填写说明')
  busy.value = true
  try {
    const result = transferPersonalTodo({ todo: props.todo, toUser: option, note: form.note, operator: operator.value })
    if (!result.ok) return ElMessage.warning(result.message)
    ElMessage.success(`已转交给${selectedLabel.value}，待办已从其待办列表处理`)
    emit('transferred')
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="todo-transfer-panel">
    <el-alert
      type="info"
      :closable="false"
      show-icon
      title="转交说明"
      description="转交后本待办将从您的待办列表移除，并出现在被转交人的待办列表中；原审批/办理数据不变，流程继续。"
    />
    <el-form label-width="100px" class="todo-transfer-form" @submit.prevent="submit">
      <el-form-item label="转交人" required>
        <el-select v-model="form.toUser" filterable placeholder="请选择转交人" style="width: 100%" aria-label="选择转交人">
          <el-option v-for="item in transferOptions" :key="item.userId || item.value" :label="item.label" :value="item.value" />
        </el-select>
      </el-form-item>
      <el-form-item label="说明" required>
        <el-input v-model="form.note" type="textarea" :rows="4" placeholder="请填写转交原因及办理要求" aria-label="说明" />
      </el-form-item>
      <div class="todo-transfer-actions">
        <el-button :disabled="busy" @click="emit('back')">取消</el-button>
        <el-button type="primary" :loading="busy" @click="submit">提交转交</el-button>
      </div>
    </el-form>
  </div>
</template>

<style scoped>
.todo-transfer-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-width: 880px;
}
.todo-transfer-form :deep(.el-form-item) {
  margin-bottom: 24px;
}
.todo-transfer-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  border-top: 1px solid var(--ap-border);
  padding-top: 20px;
}
</style>
