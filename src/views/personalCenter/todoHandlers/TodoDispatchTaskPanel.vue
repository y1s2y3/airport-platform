<script setup>
import { computed, onMounted, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { getDispatchNoticeRecords, submitDispatchTaskReply } from '../../../coc/utils/dispatchMeetingStorage.js'
import { dispatchTaskOperator, dispatchTaskUserOptions } from '../../../coc/utils/dispatchTaskIdentity.js'
import {
  taskActorName, taskAssignedActor, taskExecutors, taskExecutionMode, taskReplies, taskStatus,
  TASK_STATUSES, TASK_EXECUTION_MODES,
} from '../../../coc/utils/dispatchTaskWorkflow.js'
import { listSysUsers } from '../../../mock/sysUsers.js'
import DispatchTaskDetailPanels from '../../../coc/components/DispatchTaskDetailPanels.vue'
import DispatchImageAttachments from '../../../coc/components/DispatchImageAttachments.vue'

const props = defineProps({ todo: { type: Object, required: true }, todoId: { type: String, default: '' }, isReadonly: { type: Boolean, default: false } })
const emit = defineEmits(['back'])
const task = ref(null), busy = ref(false)
const emptyForm = () => ({ result: '已执行', remark: '', attachments: [], transferTo: '' })
const form = reactive(emptyForm())
function load() { task.value = getDispatchNoticeRecords().find(item => item.id === props.todo.taskId) || null }
watch(() => props.todo.taskId, () => { Object.assign(form, emptyForm()); load() }, { immediate: true })
const assigned = computed(() => task.value ? taskAssignedActor(task.value, dispatchTaskOperator(), listSysUsers()) : null)
const replies = computed(() => task.value ? taskReplies(task.value) : [])
const repliedByMe = computed(() => !!assigned.value && replies.value.some(reply => taskActorName(reply.actor) === taskActorName(assigned.value.label)))
const isParallel = computed(() => task.value ? taskExecutionMode(task.value) === TASK_EXECUTION_MODES.PARALLEL : false)
const canReply = computed(() => !props.isReadonly && task.value && taskStatus(task.value) === TASK_STATUSES.PROCESSING &&
  !!assigned.value && !repliedByMe.value)
// 说明：待办/已办仅用于列表分类，详情与处理页只展示业务状态（处理中/已完成/无需执行），不再单列办理状态
const transferOptions = computed(() => {
  const currentLabel = taskActorName(assigned.value?.label || '')
  const existing = new Set((task.value ? taskExecutors(task.value) : []).map(name => taskActorName(name)))
  return dispatchTaskUserOptions().filter(item => {
    const label = taskActorName(item.value)
    return label && label !== currentLabel && !existing.has(label)
  })
})
const transferLabel = computed(() => {
  const hit = transferOptions.value.find(item => item.value === form.transferTo)
  return hit?.label || form.transferTo || ''
})
function onStorage(event) { if (event.key === 'coc-admin-dispatch-notices' || event.key === null) load() }
onMounted(() => { window.addEventListener('coc-dispatch-meeting-change', load); window.addEventListener('storage', onStorage) })
onBeforeUnmount(() => { window.removeEventListener('coc-dispatch-meeting-change', load); window.removeEventListener('storage', onStorage) })
async function submit() {
  if (busy.value || !canReply.value) return
  if (!form.result) return ElMessage.warning('请选择处理结果')
  const isTransfer = form.result === '转派'
  if (isTransfer && !form.transferTo) return ElMessage.warning('请选择转派执行人')
  if (!form.remark.trim()) return ElMessage.warning(isTransfer ? '请填写转派说明' : '请填写处理说明')
  const payload = {
    result: form.result,
    remark: form.remark,
    attachments: isTransfer ? [] : form.attachments,
    ...(isTransfer
      ? {
          transferTo: {
            label: transferLabel.value,
            userId: transferOptions.value.find(item => item.value === form.transferTo)?.userId || '',
          },
        }
      : {}),
  }
  busy.value = true
  try {
    const result = await submitDispatchTaskReply(task.value.id, payload)
    if (!result.ok) { load(); return ElMessage.warning(result.message) }
    if (isTransfer) {
      ElMessage.success(`已转派给${transferLabel.value}，任务单继续流转`)
    } else if (result.closed) {
      ElMessage.success(isParallel.value ? '全部执行人已回复，任务单流程结束' : '处理结果已提交，任务单流程结束')
    } else {
      const remaining = (result.remaining || []).join('、')
      ElMessage.success(`处理结果已提交，任务单仍待其他执行人回复${remaining ? `（剩余：${remaining}）` : ''}`)
    }
    emit('back')
  } catch { ElMessage.error('处理结果保存失败，请重试；当前填写内容已保留') }
  finally { busy.value = false }
}
</script>

<template>
  <div class="dispatch-task-handler">
    <el-empty v-if="!task" description="任务单不存在或已删除" />
    <template v-else>
    <DispatchTaskDetailPanels :record="task" handling :can-reply="!!canReply">
      <template v-if="canReply" #processing>
        <el-form label-width="100px" class="dispatch-task-reply-form" @submit.prevent="submit">
          <el-form-item label="处理结果" required>
            <el-radio-group v-model="form.result" aria-label="处理结果">
              <el-radio value="已执行">已执行</el-radio>
              <el-radio value="无需执行">无需执行</el-radio>
              <el-radio value="转派">转派</el-radio>
            </el-radio-group>
          </el-form-item>
          <el-form-item v-if="form.result === '转派'" label="执行人" required>
            <el-select v-model="form.transferTo" filterable placeholder="请选择转派执行人" style="width: 100%" aria-label="选择转派执行人">
              <el-option v-for="item in transferOptions" :key="item.userId || item.value" :label="item.label" :value="item.value" />
            </el-select>
          </el-form-item>
          <el-form-item :label="form.result === '转派' ? '转派说明' : '处理说明'" required>
            <el-input
              v-model="form.remark"
              type="textarea"
              :rows="4"
              :placeholder="form.result === '转派' ? '请填写转派原因及处理要求' : '请填写实际处理情况或无需执行原因'"
              :aria-label="form.result === '转派' ? '转派说明' : '处理说明'"
            />
          </el-form-item>
          <el-form-item v-if="form.result !== '转派'" label="图片"><DispatchImageAttachments v-model="form.attachments" name-prefix="任务处理图片" /></el-form-item>
          <div class="dispatch-task-submit-actions"><el-button :disabled="busy" @click="emit('back')">取消</el-button><el-button type="primary" :loading="busy" @click="submit">提交处理</el-button></div>
        </el-form>
      </template>
    </DispatchTaskDetailPanels>
    </template>
  </div>
</template>

<style scoped>
.dispatch-task-handler { min-width: 0; }
.dispatch-task-reply-form { max-width: 880px; }
.dispatch-task-reply-form :deep(.el-form-item) { margin-bottom: 24px; }
.dispatch-task-submit-actions { display: flex; justify-content: flex-end; border-top: 1px solid var(--ap-border); padding-top: 20px; }
</style>
