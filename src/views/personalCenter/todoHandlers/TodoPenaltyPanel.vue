<script setup>
import { computed, reactive, ref, toRef, watch } from 'vue'
import {
  PENALTY_TODO_STATUS,
} from '../../../mock/personalCenter.js'
import {
  getDispatchPenaltyRecords,
  PENALTY_STATUSES,
} from '../../../coc/utils/dispatchMeetingStorage.js'
import DispatchImageAttachments from '../../../coc/components/DispatchImageAttachments.vue'
import PenaltyDetailPanels from '../../../coc/components/PenaltyDetailPanels.vue'
import { userOptions, getUserLabel } from '../../../composables/useInspectionPlan.js'
import { usePersonalTodoSubmit } from '../composables/usePersonalTodoSubmit.js'
import '../styles/todoHandleBlocks.css'

const props = defineProps({
  todo: { type: Object, required: true },
  todoId: { type: String, default: '' },
  isReadonly: { type: Boolean, default: false },
})

const emit = defineEmits(['back'])

const todoRef = toRef(props, 'todo')
const todoIdRef = computed(() => props.todoId)
const {
  submitProcessReport,
  submitProcessAppeal,
  submitAcceptHandle,
  submitAppealHandle,
} = usePersonalTodoSubmit({
  todo: todoRef,
  todoId: todoIdRef,
  goBack: () => emit('back'),
})

const bizToPenaltyStatus = {
  [PENALTY_TODO_STATUS.PROCESSING]: PENALTY_STATUSES.PROCESSING,
  [PENALTY_TODO_STATUS.PENDING_ACCEPTANCE]: PENALTY_STATUSES.PENDING_ACCEPTANCE,
  [PENALTY_TODO_STATUS.APPEALING]: PENALTY_STATUSES.APPEALING,
}

const mergedPenalty = computed(() => {
  if (!props.todo || props.todo.type !== 'penalty') return null
  const base = { ...(props.todo.penalty || {}) }
  const live = getDispatchPenaltyRecords().find((item) => item.id === props.todo.penaltyId)
  const merged = live
    ? { ...base, ...live, id: live.id || base.id || props.todo.penaltyId }
    : { ...base, id: base.id || props.todo.penaltyId }
  if (!merged.status) {
    merged.status = bizToPenaltyStatus[props.todo.bizStatus] || PENALTY_STATUSES.PROCESSING
  }
  return merged
})

const processTab = ref('report')
const reportForm = reactive({
  penaltyClause: '',
  amount: '',
  reportResult: '',
  acceptor: '',
  attachments: [],
})
const appealForm = reactive({ reason: '', attachments: [] })
const acceptForm = reactive({ decision: 'pass', remark: '' })
const appealHandleForm = reactive({ decision: 'pass', remark: '' })

function resetForms() {
  processTab.value = 'report'
  Object.assign(reportForm, {
    penaltyClause: mergedPenalty.value?.penaltyClause || '',
    amount: mergedPenalty.value?.amount || '',
    reportResult: '',
    acceptor: mergedPenalty.value?.acceptor || '',
    attachments: [],
  })
  Object.assign(appealForm, { reason: '', attachments: [] })
  Object.assign(acceptForm, { decision: 'pass', remark: '' })
  Object.assign(appealHandleForm, { decision: 'pass', remark: '' })
}

watch(() => props.todo, resetForms, { immediate: true })
</script>

<template>
  <section class="block block--panel">
    <div class="block-head">
      <div class="block-title">处罚单详情</div>
    </div>
    <PenaltyDetailPanels v-if="mergedPenalty" :record="mergedPenalty" />
  </section>

  <section v-if="!isReadonly" class="block block--panel block--action">
    <div class="block-head">
      <div class="block-title">审批操作</div>
    </div>

    <template v-if="todo.bizStatus === PENALTY_TODO_STATUS.PROCESSING">
      <el-tabs v-model="processTab">
        <el-tab-pane label="上报结果" name="report">
          <el-form label-width="110px" class="op-form">
            <el-form-item label="条款" required>
              <el-input v-model="reportForm.penaltyClause" placeholder="请输入处罚条款" aria-label="请输入处罚条款" />
            </el-form-item>
            <el-form-item label="金额" required>
              <el-input v-model="reportForm.amount" placeholder="如 5000 元" aria-label="如 5000 元" />
            </el-form-item>
            <el-form-item label="上报结果" required>
              <el-input
                v-model="reportForm.reportResult"
                type="textarea"
                :rows="4"
                placeholder="请说明整改及处理情况"
                aria-label="请说明整改及处理情况"
              />
            </el-form-item>
            <el-form-item label="验收人" required>
              <el-select
                v-model="reportForm.acceptor"
                filterable
                clearable
                placeholder="请选择验收人"
                style="width: 100%"
                aria-label="请选择验收人"
              >
                <el-option
                  v-for="u in userOptions"
                  :key="u.id"
                  :label="getUserLabel(u.id)"
                  :value="getUserLabel(u.id)"
                />
              </el-select>
            </el-form-item>
            <el-form-item label="上报结果附件">
              <DispatchImageAttachments v-model="reportForm.attachments" name-prefix="上报结果附件" />
            </el-form-item>
          </el-form>
        </el-tab-pane>
        <el-tab-pane label="申诉" name="appeal">
          <el-form label-width="110px" class="op-form">
            <el-form-item label="申诉理由" required>
              <el-input
                v-model="appealForm.reason"
                type="textarea"
                :rows="4"
                placeholder="请说明申诉理由"
                aria-label="请说明申诉理由"
              />
            </el-form-item>
            <el-form-item label="申诉附件">
              <DispatchImageAttachments v-model="appealForm.attachments" name-prefix="申诉附件" />
            </el-form-item>
          </el-form>
        </el-tab-pane>
      </el-tabs>
      <div class="op-actions">
        <el-button @click="emit('back')">取消</el-button>
        <el-button v-if="processTab === 'report'" type="primary" @click="submitProcessReport(reportForm)">
          提交上报
        </el-button>
        <el-button v-else type="primary" @click="submitProcessAppeal(appealForm)">提交申诉</el-button>
      </div>
    </template>

    <template v-else-if="todo.bizStatus === PENALTY_TODO_STATUS.PENDING_ACCEPTANCE">
      <el-form label-width="96px" class="op-form">
        <el-form-item label="处理意见" required>
          <el-radio-group v-model="acceptForm.decision">
            <el-radio value="pass">验收通过</el-radio>
            <el-radio value="reject">驳回</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="说明" required>
          <el-input
            v-model="acceptForm.remark"
            type="textarea"
            :rows="4"
            placeholder="请填写验收说明"
            aria-label="请填写验收说明"
          />
        </el-form-item>
      </el-form>
      <div class="op-actions">
        <el-button @click="emit('back')">取消</el-button>
        <el-button type="primary" @click="submitAcceptHandle(acceptForm)">提交</el-button>
      </div>
    </template>

    <template v-else-if="todo.bizStatus === PENALTY_TODO_STATUS.APPEALING">
      <el-form label-width="120px" class="op-form">
        <el-form-item label="处理意见" required>
          <el-radio-group v-model="appealHandleForm.decision">
            <el-radio value="pass">通过并关闭处罚单</el-radio>
            <el-radio value="reject">驳回</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="说明" required>
          <el-input
            v-model="appealHandleForm.remark"
            type="textarea"
            :rows="4"
            placeholder="请填写处理说明"
            aria-label="请填写处理说明"
          />
        </el-form-item>
      </el-form>
      <div class="op-actions">
        <el-button @click="emit('back')">取消</el-button>
        <el-button type="primary" @click="submitAppealHandle(appealHandleForm)">提交</el-button>
      </div>
    </template>
  </section>
</template>
