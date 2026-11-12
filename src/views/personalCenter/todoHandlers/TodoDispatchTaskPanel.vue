<script setup>
import { computed, onMounted, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { getDispatchNoticeRecords, submitDispatchTaskReply } from '../../../coc/utils/dispatchMeetingStorage.js'
import { dispatchTaskOperator } from '../../../coc/utils/dispatchTaskIdentity.js'
import {
  taskActorName, taskAssignedActor, taskExecutionMode, taskReplies, taskStatus,
  TASK_STATUSES, TASK_EXECUTION_MODES,
} from '../../../coc/utils/dispatchTaskWorkflow.js'
import { listSysUsers } from '../../../mock/sysUsers.js'
import DispatchTaskDetailPanels from '../../../coc/components/DispatchTaskDetailPanels.vue'
import DispatchImageAttachments from '../../../coc/components/DispatchImageAttachments.vue'

const props = defineProps({ todo: { type: Object, required: true }, todoId: { type: String, default: '' }, isReadonly: { type: Boolean, default: false } })
const emit = defineEmits(['back'])
const task = ref(null), busy = ref(false)
const form = reactive({ result: '', remark: '', attachments: [] })
function load() { task.value = getDispatchNoticeRecords().find(item => item.id === props.todo.taskId) || null }
watch(() => props.todo.taskId, () => { Object.assign(form, { result: '', remark: '', attachments: [] }); load() }, { immediate: true })
const assigned = computed(() => task.value ? taskAssignedActor(task.value, dispatchTaskOperator(), listSysUsers()) : null)
const replies = computed(() => task.value ? taskReplies(task.value) : [])
const repliedByMe = computed(() => !!assigned.value && replies.value.some(reply => taskActorName(reply.actor) === taskActorName(assigned.value.label)))
const isParallel = computed(() => task.value ? taskExecutionMode(task.value) === TASK_EXECUTION_MODES.PARALLEL : false)
const canReply = computed(() => !props.isReadonly && task.value && taskStatus(task.value) === TASK_STATUSES.PROCESSING &&
  !!assigned.value && !repliedByMe.value)
const waitOthers = computed(() => !!task.value && taskStatus(task.value) === TASK_STATUSES.PROCESSING && repliedByMe.value)
const handleStatusText = computed(() => {
  if (!task.value) return '待处理'
  const status = taskStatus(task.value)
  if (status === TASK_STATUSES.COMPLETED) return '已完成'
  if (status === TASK_STATUSES.NO_ACTION) return '无需执行'
  if (repliedByMe.value) return '已提交'
  return '待处理'
})
const handleStatusTag = computed(() => {
  if (!task.value) return 'warning'
  const status = taskStatus(task.value)
  if (status === TASK_STATUSES.COMPLETED || status === TASK_STATUSES.NO_ACTION) return 'success'
  return repliedByMe.value ? 'info' : 'warning'
})
function onStorage(event) { if (event.key === 'coc-admin-dispatch-notices' || event.key === null) load() }
onMounted(() => { window.addEventListener('coc-dispatch-meeting-change', load); window.addEventListener('storage', onStorage) })
onBeforeUnmount(() => { window.removeEventListener('coc-dispatch-meeting-change', load); window.removeEventListener('storage', onStorage) })
async function submit() {
  if (busy.value || !canReply.value) return
  if (!form.result) return ElMessage.warning('请选择处理结果')
  if (!form.remark.trim()) return ElMessage.warning('请填写处理说明')
  busy.value = true
  try {
    const result = await submitDispatchTaskReply(task.value.id, form)
    if (!result.ok) { load(); return ElMessage.warning(result.message) }
    if (result.closed) {
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
    <div class="dispatch-task-handle-state">
      <span>办理状态</span>
      <el-tag :type="handleStatusTag" size="small">{{ handleStatusText }}</el-tag>
      <span v-if="waitOthers" class="dispatch-task-time-hint">您已提交处理结果，等待其他执行人回复</span>
    </div>
    <DispatchTaskDetailPanels :record="task" handling :can-reply="!!canReply">
      <template v-if="canReply" #processing>
        <el-form label-width="100px" class="dispatch-task-reply-form" @submit.prevent="submit">
          <el-form-item label="处理结果" required>
            <el-radio-group v-model="form.result" aria-label="处理结果"><el-radio value="已执行">已执行</el-radio><el-radio value="无需执行">无需执行</el-radio></el-radio-group>
          </el-form-item>
          <el-form-item label="处理说明" required><el-input v-model="form.remark" type="textarea" :rows="4" placeholder="请填写实际处理情况或无需执行原因" aria-label="处理说明" /></el-form-item>
          <el-form-item label="附件"><DispatchImageAttachments v-model="form.attachments" name-prefix="任务处理附件" /></el-form-item>
          <el-form-item label="处理时间"><span class="dispatch-task-time-hint">提交成功时由系统自动记录，精确到秒</span></el-form-item>
          <div class="dispatch-task-submit-actions"><el-button :disabled="busy" @click="emit('back')">取消</el-button><el-button type="primary" :loading="busy" @click="submit">提交处理</el-button></div>
        </el-form>
      </template>
    </DispatchTaskDetailPanels>
    </template>
  </div>
</template>

<style scoped>
.dispatch-task-handler { min-width: 0; }
.dispatch-task-handle-state { display: flex; align-items: center; gap: 12px; margin-bottom: 24px; color: var(--ap-text-secondary); font-size: 14px; }
.dispatch-task-reply-form { max-width: 880px; }
.dispatch-task-reply-form :deep(.el-form-item) { margin-bottom: 24px; }
.dispatch-task-time-hint { color: var(--ap-text-secondary); }
.dispatch-task-submit-actions { display: flex; justify-content: flex-end; border-top: 1px solid var(--ap-border); padding-top: 20px; }
</style>
