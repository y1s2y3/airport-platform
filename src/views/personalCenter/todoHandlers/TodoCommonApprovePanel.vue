<script setup>
import { computed, reactive, toRef, watch } from 'vue'
import { usePersonalTodoSubmit } from '../composables/usePersonalTodoSubmit.js'
import { COMMON_APPROVE_TYPES } from './registry.js'
import '../styles/todoHandleBlocks.css'

const props = defineProps({
  todo: { type: Object, required: true },
  todoId: { type: String, default: '' },
})

const emit = defineEmits(['back'])

const todoRef = toRef(props, 'todo')
const todoIdRef = computed(() => props.todoId)
const { submitCommonHandle } = usePersonalTodoSubmit({
  todo: todoRef,
  todoId: todoIdRef,
  goBack: () => emit('back'),
})

const commonForm = reactive({ decision: 'pass', remark: '' })

watch(
  () => props.todo,
  () => Object.assign(commonForm, { decision: 'pass', remark: '' }),
  { immediate: true },
)

const remarkRequired = computed(() => {
  const t = props.todo?.type
  if (!COMMON_APPROVE_TYPES.has(t)) return true
  return commonForm.decision === 'reject'
})

const remarkPlaceholder = computed(() => {
  const t = props.todo?.type
  if (commonForm.decision === 'reject' && t === 'brand') return '驳回意见必填'
  if (commonForm.decision === 'reject' && COMMON_APPROVE_TYPES.has(t)) return '退回意见必填'
  if (COMMON_APPROVE_TYPES.has(t)) return '审批意见选填'
  return '请填写审批说明'
})
</script>

<template>
  <section class="block block--panel block--action">
    <div class="block-head">
      <div class="block-title">审批操作</div>
    </div>
    <el-form label-width="96px" class="op-form">
      <el-form-item label="处理意见" required>
        <el-radio-group v-model="commonForm.decision">
          <el-radio value="pass">通过</el-radio>
          <el-radio value="reject">驳回</el-radio>
        </el-radio-group>
      </el-form-item>
      <el-form-item label="说明" :required="remarkRequired">
        <el-input
          v-model="commonForm.remark"
          type="textarea"
          :rows="3"
          :placeholder="remarkPlaceholder"
          :aria-label="remarkPlaceholder"
        />
      </el-form-item>
    </el-form>
    <div class="op-actions">
      <el-button @click="emit('back')">取消</el-button>
      <el-button type="primary" @click="submitCommonHandle(commonForm)">提交</el-button>
    </div>
  </section>
</template>
