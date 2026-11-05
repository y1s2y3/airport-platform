<script setup>
import { computed } from 'vue'
import { inspectionUsers, inspectionSelectableUsers } from '../../../mock/inspectionPersonnel.js'
import { enrichSysUserApproverCandidate } from '../../../utils/approverDisplay.js'

const props = defineProps({ modelValue: String, disabled: Boolean, scope: { type: String, required: true }, label: String, placeholder: { type: String, default: '请选择人员' }, showInvalidHint: { type: Boolean, default: true } })
const emit = defineEmits(['update:modelValue', 'selected'])
const users = computed(() => inspectionUsers(props.scope))
const selected = computed(() => inspectionSelectableUsers(props.scope).find(user => user.id === props.modelValue))
const options = computed(() => {
  const candidates = [...users.value]
  // Preserve an enabled preselected user even when outside the default project candidates.
  if (selected.value && !candidates.some(user => user.id === selected.value.id)) candidates.unshift(selected.value)
  return candidates.map(user => ({ ...user, optionLabel: enrichSysUserApproverCandidate(user)?.optionLabel || user.name }))
})
const emptyText = computed(() => users.value.length
  ? '未找到匹配人员，请调整姓名关键词。'
  : props.scope === 'dispatch'
    ? '暂无安全质量管理部启用人员，请在系统用户管理中维护部门归属。'
    : '暂无当前项目的有效关联人员，请维护项目与用户关系。')

function choose(id) {
  const user = inspectionSelectableUsers(props.scope).find(user => user.id === id)
  emit('update:modelValue', user?.id || '')
  emit('selected', user || null)
}
</script>

<template>
  <div class="daily-user-picker">
    <el-select
      :model-value="selected?.id || ''"
      :aria-label="label"
      :disabled="disabled"
      filterable
      clearable
      fit-input-width
      :placeholder="placeholder"
      popper-class="daily-user-picker-dropdown"
      @update:model-value="choose"
    >
      <el-option v-for="user in options" :key="user.id" :label="user.name" :value="user.id" class="daily-user-picker-option">
        <span class="daily-user-picker-name" :title="user.optionLabel">{{ user.optionLabel }}</span>
      </el-option>
      <template #empty><p class="daily-user-picker-empty" role="status">{{ emptyText }}</p></template>
    </el-select>
    <p v-if="showInvalidHint && users.length && modelValue && !selected" class="page-tip" role="status">{{ scope === 'dispatch' ? '原选人员已停用或不属于安质部，请重新选择或清空。' : '原选人员已停用或不存在，请重新选择。' }}</p>
  </div>
</template>

<style scoped>
.daily-user-picker { width: 100%; min-width: 0; }
.daily-user-picker .el-select { width: 100%; }
.daily-user-picker .page-tip { margin-top: 6px; line-height: 1.5; }
.daily-user-picker-option { display: flex; align-items: center; }
.daily-user-picker-name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.daily-user-picker-empty { margin: 0; padding: 12px 16px; color: var(--ap-text-secondary); font-size: 12px; line-height: 1.5; white-space: normal; overflow-wrap: anywhere; }
</style>
