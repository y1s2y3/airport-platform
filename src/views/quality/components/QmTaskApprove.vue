<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { finishPersonalTodo } from '../../../mock/personalCenter.js'
import PersonalCenterReadonlyHint from '../../../components/PersonalCenterReadonlyHint.vue'
import {
  approveStep,
  approvalRecords,
  createRectify,
  findTask,
  getApprovalChain,
  getArchiveInstance,
  getArchiveSync,
  getCurrentManualNode,
  getItemsByTaskId,
  getManualLevelProgress,
  getNextApprovalRole,
  hasBlockFailItems,
  hasOnlyGeneralFail,
  ITEM_CATEGORY,
  JUDGE_RESULT,
  MANUAL_APPROVAL_MODE,
  rejectTask,
  resolveApproverName,
  resolveProjectName,
  rollbackToDraft,
  signatureRecords,
  TASK_STATUS,
  TASK_TYPE_LABEL,
  usesManualApprovalFlow,
  wbsNodes,
  getConfiguredApproversForChainRole,
  isChainRoleConfigured,
} from '../../../mock/qm.js'

const props = defineProps({
  title: { type: String, default: '验评审批' },
  listPath: { type: String, required: true },
  editPath: { type: String, required: true },
  embedded: { type: Boolean, default: false },
  /** 个人中心：仅渲染审批操作区（填报内容由 TodoQmInspectPanel 展示） */
  actionsOnly: { type: Boolean, default: false },
  taskId: { type: String, default: '' },
  todoId: { type: String, default: '' },
  readonly: { type: Boolean, default: false },
})

const emit = defineEmits(['back', 'finished'])

const route = useRoute()
const router = useRouter()
const task = ref(null)
/** 档案链：演示角色名；手动链：演示审批人 user id */
const demoRole = ref('')
const demoApproverId = ref('')

const isManualChain = computed(() => !!(task.value && usesManualApprovalFlow(task.value)))

const resolvedTaskId = computed(() => props.taskId || String(route.query.id || ''))

const showApproveActions = computed(
  () =>
    (props.embedded || props.actionsOnly) &&
    !props.readonly &&
    task.value?.status === 1,
)

function load() {
  task.value = resolvedTaskId.value ? findTask(resolvedTaskId.value) : null
  if (!task.value) return
  if (usesManualApprovalFlow(task.value)) {
    const node = getCurrentManualNode(task.value)
    demoRole.value = node?.label || ''
    const progress = node ? getManualLevelProgress(task.value, node) : null
    const passedSet = new Set(
      approvalRecords
        .filter(
          (r) =>
            r.task_id === task.value.id &&
            r.action === 2 &&
            r.operator_role === node?.label,
        )
        .map((r) => r.operator_id),
    )
    const pending = (node?.approver_ids || []).filter((id) => !passedSet.has(id))
    demoApproverId.value = pending[0] || node?.approver_ids?.[0] || ''
    void progress
  } else {
    demoRole.value = getNextApprovalRole(task.value) || '监理'
    demoApproverId.value = ''
  }
}

watch(resolvedTaskId, load, { immediate: true })

function goList() {
  if (props.embedded) {
    emit('back')
    return
  }
  router.push(props.listPath)
}

function goEdit() {
  if (!task.value) return
  if (props.embedded) return
  router.push(`${props.editPath}?id=${task.value.id}`)
}

function syncPersonalTodoFinish(label) {
  const todoId =
    props.todoId ||
    (Array.isArray(route.query.todoId) ? route.query.todoId[0] : route.query.todoId)
  if (!todoId) return
  finishPersonalTodo(String(todoId), label)
  if (props.embedded) emit('finished', label)
}

const chain = computed(() => (task.value ? getApprovalChain(task.value) : []))
const nextRole = computed(() => (task.value ? getNextApprovalRole(task.value) : null))
const currentManualNode = computed(() =>
  task.value && isManualChain.value ? getCurrentManualNode(task.value) : null,
)
const manualProgress = computed(() =>
  task.value && currentManualNode.value
    ? getManualLevelProgress(task.value, currentManualNode.value)
    : null,
)
const manualApproverOptions = computed(() => {
  const node = currentManualNode.value
  if (!node) return []
  const passedSet = new Set(
    approvalRecords
      .filter(
        (r) =>
          r.task_id === task.value.id &&
          r.action === 2 &&
          r.operator_role === node.label,
      )
      .map((r) => r.operator_id),
  )
  return node.approver_ids.map((id) => ({
    id,
    name: resolveApproverName(id),
    done: passedSet.has(id),
  }))
})

const chainWithApprovers = computed(() => {
  if (!task.value) return []
  if (isManualChain.value) {
    const flow = Array.isArray(task.value.manual_approval_flow)
      ? [...task.value.manual_approval_flow].sort((a, b) => a.level - b.level)
      : []
    return flow.map((node) => {
      const progress = getManualLevelProgress(task.value, {
        ...node,
        label: node.label,
        approver_ids: node.approver_ids || [],
        mode: node.mode === 'orsign' ? 'orsign' : 'countersign',
      })
      return {
        role: node.label,
        people: (node.approver_ids || []).map((id) => ({
          id,
          name: resolveApproverName(id),
          fromConfig: true,
        })),
        mode: node.mode,
        progress,
      }
    })
  }
  return chain.value.map((role) => ({
    role,
    people: getConfiguredApproversForChainRole(task.value?.project_id, role),
    mode: null,
    progress: null,
  }))
})

const nextRolePeople = computed(() => {
  if (isManualChain.value) {
    return manualApproverOptions.value.map((p) => ({
      name: p.name,
      postLabel: p.done ? '已签' : '待签',
    }))
  }
  return nextRole.value
    ? getConfiguredApproversForChainRole(task.value?.project_id, nextRole.value)
    : []
})

const items = computed(() => (task.value ? getItemsByTaskId(task.value.id) : []))
const records = computed(() =>
  task.value ? approvalRecords.filter((r) => r.task_id === task.value.id) : [],
)
const signs = computed(() =>
  task.value ? signatureRecords.filter((s) => s.task_id === task.value.id) : [],
)
const nodeName = computed(
  () => wbsNodes.find((n) => n.id === task.value?.wbs_node_id)?.node_name || '—',
)

const archiveSync = computed(() => (task.value ? getArchiveSync(task.value.id) : null))
const archiveInstance = computed(() => (task.value ? getArchiveInstance(task.value.id) : null))
const chainSourceTip = computed(() => {
  if (isManualChain.value) {
    return '审批链来源：本系统流程配置（填报第 3 步：级别 / 岗位 / 审批人 / 是否签章 / 抄送人）'
  }
  if (archiveSync.value) {
    return `审批链来源：档案同步快照（登记时锁定，同步于 ${archiveSync.value.synced_at}）——兼容未配置本系统流程的历史任务`
  }
  return '审批链来源：档案侧当前链（兼容未配置本系统流程的历史任务）'
})
const archiveSignedRoles = computed(() => archiveInstance.value?.signed_roles || [])

function operatorLabel(role) {
  if (isManualChain.value) return role
  const people = getConfiguredApproversForChainRole(task.value?.project_id, role)
  if (!people.length) return role
  return `${role}（${people.map((p) => p.name).join('、')}）`
}

function chainNodeDesc(node) {
  if (isManualChain.value) {
    const names = node.people.length ? node.people.map((p) => p.name).join('、') : '未配置审批人'
    const modeLab = MANUAL_APPROVAL_MODE[node.mode] || '会签'
    const prog = node.progress
      ? `｜进度 ${node.progress.passed}/${node.progress.total}`
      : ''
    return `${names}｜${modeLab}${prog}`
  }
  const base = node.people.length
    ? node.people.map((p) => p.name).join('、') + (node.people.every((p) => p.fromConfig) ? '' : '（默认）')
    : '未配置审批人'
  if (!archiveInstance.value) return base
  const signed = archiveSignedRoles.value.includes(node.role)
  return `${base}｜档案${signed ? '已签章' : '未签章'}`
}

async function onApprove() {
  if (!task.value || task.value.status !== 1) return ElMessage.warning('当前不可审批')

  if (isManualChain.value) {
    const node = currentManualNode.value
    if (!node) return ElMessage.warning('审批链已完成')
    const uid = demoApproverId.value
    if (!uid) return ElMessage.warning('请选择本级审批人')
    let opinion = ''
    if (hasOnlyGeneralFail(task.value.id)) {
      try {
        const { value } = await ElMessageBox.prompt(
          '一般项目存在不合格，方案B须填写审批意见',
          '确认通过',
          {
            inputType: 'textarea',
            inputValidator: (v) => (!!String(v || '').trim() ? true : '审批意见不能为空'),
          },
        )
        opinion = value
      } catch {
        return
      }
    }
    const r = approveStep(task.value, {
      opinion,
      operator_role: node.label,
      operator_id: uid,
    })
    if (!r.ok) return ElMessage.error(r.msg)
    if (r.finished) {
      ElMessage.success('审批链完成，任务已通过')
      syncPersonalTodoFinish('审批通过')
    } else {
      ElMessage.success(`本级通过，下一岗：${r.next}`)
    }
    load()
    return
  }

  const role = demoRole.value || nextRole.value
  if (!isChainRoleConfigured(task.value.project_id, role)) {
    return ElMessage.warning(`「${role}」暂无可用审批人（审批人名单由档案侧同步）`)
  }
  let opinion = ''
  if (hasOnlyGeneralFail(task.value.id)) {
    try {
      const { value } = await ElMessageBox.prompt(
        '一般项目存在不合格，方案B须填写审批意见',
        '确认通过',
        {
          inputType: 'textarea',
          inputValidator: (v) => (!!String(v || '').trim() ? true : '审批意见不能为空'),
        },
      )
      opinion = value
    } catch {
      return
    }
  }
  const r = approveStep(task.value, {
    opinion,
    operator_role: role,
  })
  if (!r.ok) return ElMessage.error(r.msg)
  if (r.finished) {
    ElMessage.success('审批链完成，任务已通过')
    syncPersonalTodoFinish('审批通过')
  } else {
    ElMessage.success(`本级通过，下一岗：${r.next}`)
    demoRole.value = r.next
  }
  load()
}

async function onReject() {
  try {
    const { value } = await ElMessageBox.prompt('请填写退回意见（必填）', '审核不通过', {
      inputType: 'textarea',
      inputValidator: (v) => (!!String(v || '').trim() ? true : '意见不能为空'),
    })
    const role = isManualChain.value
      ? currentManualNode.value?.label || nextRole.value || '审批人'
      : demoRole.value || nextRole.value || '监理'
    if (!isManualChain.value && !isChainRoleConfigured(task.value.project_id, role)) {
      return ElMessage.warning(`「${role}」暂无可用审批人（审批人名单由档案侧同步）`)
    }
    const r = rejectTask(task.value, value, role)
    if (!r.ok) return ElMessage.error(r.msg)
    ElMessage.warning('已判定不通过（退回状态已先写入档案系统并同步回本系统）')
    syncPersonalTodoFinish('审批不通过')
    try {
      await ElMessageBox.confirm(
        '是否按驳回意见生成整改单？整改为驳回的结果，由任务提交人整改，不存在单独下发动作。',
        '整改（驳回结果）',
        { type: 'warning', confirmButtonText: '生成整改单', cancelButtonText: '暂不' },
      )
      const cr = createRectify(task.value, value)
      if (!cr.ok) return ElMessage.error(cr.msg)
      ElMessage.success(`已生成整改单 ${cr.order.order_no}，整改人=任务提交人`)
    } catch {
      /* skip */
    }
    if (!props.embedded) {
      router.push(`${props.editPath}?id=${task.value.id}`)
    }
  } catch {
    /* cancel */
  }
}

function onRollback() {
  const r = rollbackToDraft(task.value)
  if (!r.ok) return ElMessage.error(r.msg)
  ElMessage.success('已退回待验评，可修改后重报')
  syncPersonalTodoFinish('退回重报')
  if (!props.embedded) {
    router.push(`${props.editPath}?id=${task.value.id}`)
  }
}

void hasBlockFailItems
</script>

<template>
  <!-- 个人中心：仅审批操作区（无可办时不渲染空壳） -->
  <section
    v-if="actionsOnly && (!task || showApproveActions)"
    class="block block--panel block--action qm-actions-only"
  >
    <template v-if="task && showApproveActions">
      <div class="block-head">
        <div class="block-title">审批操作</div>
        <el-tag v-if="nextRole" size="small" type="warning" effect="light">
          当前待审：{{ nextRole }}
          <template v-if="isManualChain && manualProgress">
            · {{ MANUAL_APPROVAL_MODE[manualProgress.mode] || '会签' }}
            {{ manualProgress.passed }}/{{ manualProgress.total }}
          </template>
        </el-tag>
      </div>
      <el-alert
        v-if="archiveInstance && !isManualChain"
        type="info"
        :closable="false"
        show-icon
        class="mb"
        title="点「通过」时将实时校验：档案侧该级须已签章，否则不让过"
      />
      <el-alert
        v-else-if="isManualChain"
        type="info"
        :closable="false"
        show-icon
        class="mb"
        title="本任务为手动审批链：会签须本级全员通过，或签任一人通过即可进入下一级（不校验档案签章）"
      />
      <div class="filter-bar op-actions-inline">
        <template v-if="isManualChain">
          <span>本级审批人</span>
          <el-select
            v-model="demoApproverId"
            style="width: 220px"
            placeholder="选择本级审批人"
            aria-label="选择本级审批人"
          >
            <el-option
              v-for="p in manualApproverOptions"
              :key="p.id"
              :label="p.done ? `${p.name}（已签）` : p.name"
              :value="p.id"
              :disabled="p.done"
            />
          </el-select>
        </template>
        <template v-else>
          <span>审批角色</span>
          <el-select v-model="demoRole" style="width: 160px" aria-label="选择审批角色">
            <el-option v-for="role in chain" :key="role" :label="role" :value="role" />
          </el-select>
        </template>
        <el-button type="success" @click="onApprove">本级通过并签章</el-button>
        <el-button type="danger" @click="onReject">不通过/退回</el-button>
        <el-button @click="onRollback">退回重报</el-button>
        <el-button @click="goList">取消</el-button>
      </div>
    </template>
    <el-empty v-else description="未找到任务" :image-size="48" />
  </section>

  <div v-else-if="!actionsOnly && !task" class="qm-page page-card">
    <el-empty description="未找到任务">
      <el-button type="primary" @click="goList">返回</el-button>
    </el-empty>
  </div>
  <div v-else-if="!actionsOnly && task" class="qm-page page-card">
    <div v-if="!embedded" class="page-header">
      <div class="page-breadcrumb">质量验评 / {{ title }}</div>
      <h1 class="page-title">{{ task.task_no }} · 审批签章</h1>
      <p class="page-tip">
        {{ resolveProjectName(task.project_id) }} · {{ nodeName }} · {{ TASK_TYPE_LABEL[task.task_type] }} ·
        {{ TASK_STATUS[task.status] }}
      </p>
    </div>
    <p v-else class="page-tip embed-tip">
      {{ task.task_no }} · {{ resolveProjectName(task.project_id) }} · {{ nodeName }} ·
      {{ TASK_TYPE_LABEL[task.task_type] }} · {{ TASK_STATUS[task.status] }}
    </p>

    <PersonalCenterReadonlyHint
      v-if="!embedded && task.status === 1"
      title="本页为只读查看；验评审批请在「个人中心 → 我的待办」中处理。"
    />

    <div class="chain-box mb">
      <div class="section-title">审批链</div>
      <p class="hint">{{ chainSourceTip }}</p>
      <el-steps
        :active="nextRole ? Math.max(0, chain.findIndex((r) => r === nextRole)) : chain.length"
        finish-status="success"
        align-center
      >
        <el-step
          v-for="node in chainWithApprovers"
          :key="node.role"
          :title="node.role"
          :description="chainNodeDesc(node)"
        />
      </el-steps>
      <p v-if="task.status === 1 && nextRole" class="hint">
        当前待审：{{ nextRole }}
        <template v-if="isManualChain && manualProgress">
          · {{ MANUAL_APPROVAL_MODE[manualProgress.mode] || '会签' }}
          · 进度 {{ manualProgress.passed }}/{{ manualProgress.total }}
        </template>
        <template v-if="nextRolePeople.length">
          · {{ nextRolePeople.map((p) => `${p.name}（${p.postLabel}）`).join('、') }}
        </template>
        <template v-else>
          · <span class="warn-text">尚未配置审批人</span>
        </template>
      </p>
      <p v-else-if="task.status === 2" class="hint ok">已办结通过</p>
    </div>

    <div v-if="showApproveActions" class="filter-bar mb">
      <template v-if="isManualChain">
        <span>演示审批人</span>
        <el-select v-model="demoApproverId" style="width: 220px" placeholder="选择本级审批人" aria-label="选择本级审批人">
          <el-option
            v-for="p in manualApproverOptions"
            :key="p.id"
            :label="p.done ? `${p.name}（已签）` : p.name"
            :value="p.id"
            :disabled="p.done"
          />
        </el-select>
      </template>
      <template v-else>
        <span>演示角色</span>
        <el-select v-model="demoRole" style="width: 160px">
          <el-option v-for="role in chain" :key="role" :label="role" :value="role" />
        </el-select>
      </template>
      <el-button type="success" @click="onApprove">本级通过并签章</el-button>
      <el-button type="danger" @click="onReject">不通过/退回</el-button>
      <el-button @click="onRollback">退回重报</el-button>
    </div>
    <el-alert
      v-if="task.status === 1 && archiveInstance && !isManualChain"
      type="info"
      :closable="false"
      show-icon
      class="mb"
      title="点「通过」时将实时校验：档案侧该级须已签章，否则不让过（可在填报页④档案区块模拟档案侧签章）"
    />
    <el-alert
      v-else-if="task.status === 1 && isManualChain"
      type="info"
      :closable="false"
      show-icon
      class="mb"
      title="本任务为手动审批链：会签须本级全员通过，或签任一人通过即可进入下一级（不校验档案签章）"
    />

    <div class="section-title">检查项核查</div>
    <el-table :data="items" border size="small" class="mb">
      <el-table-column prop="seq_no" label="序号" width="60" />
      <el-table-column label="类别" width="70">
        <template #default="{ row }">{{ ITEM_CATEGORY[row.item_category] }}</template>
      </el-table-column>
      <el-table-column prop="item_name" label="检查项" min-width="160" />
      <el-table-column prop="measured_value" label="实测值" min-width="120" />
      <el-table-column label="判定" width="90">
        <template #default="{ row }">{{ JUDGE_RESULT[row.judge_result] }}</template>
      </el-table-column>
    </el-table>
    <p class="hint">主控/观感不合格禁止通过；仅一般不合格可走方案B（须填意见）。</p>

    <div class="section-title">签章记录</div>
    <el-table :data="signs" border size="small" class="mb" empty-text="暂无签章">
      <el-table-column prop="signer_role" label="签章角色" width="140" />
      <el-table-column prop="ca_cert_id" label="CA证书标识" min-width="160" />
      <el-table-column prop="sign_time" label="签章时间" width="180" />
    </el-table>
    <p v-if="archiveInstance && !isManualChain" class="hint mb">
      档案侧签章：{{ archiveSignedRoles.length ? archiveSignedRoles.join('、') : '暂无' }}
      （档案文档 {{ archiveInstance.archive_doc_id }}；签章以档案为准，本表为本系统文字审批留痕）
    </p>

    <div class="section-title">审批轨迹</div>
    <el-timeline>
      <el-timeline-item v-for="r in records" :key="r.id" :timestamp="r.action_time">
        <template v-if="isManualChain && r.action === 2">
          {{ r.operator_role }} · {{ resolveApproverName(r.operator_id) }} · 通过
        </template>
        <template v-else>
          {{ operatorLabel(r.operator_role) }} · {{ { 1: '提交', 2: '通过', 3: '不通过' }[r.action] }}
        </template>
        <span v-if="r.opinion"> — {{ r.opinion }}</span>
      </el-timeline-item>
    </el-timeline>

    <div v-if="!embedded" class="filter-bar">
      <el-button @click="goList">返回列表</el-button>
      <el-button @click="goEdit">查看填报</el-button>
    </div>
  </div>
</template>

<style scoped>
.qm-page { display: flex; flex-direction: column; gap: 12px; }
.page-breadcrumb { font-size: 12px; color: #909399; }
.page-title { margin: 4px 0; font-size: 20px; }
.page-tip { margin: 0; font-size: 13px; color: #606266; }
.section-title { font-weight: 600; }
.hint { margin: 8px 0 0; font-size: 13px; color: #606266; }
.hint.ok { color: #67c23a; }
.warn-text { color: #e6a23c; }
.filter-bar { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.mb { margin-bottom: 12px; }
.hint { font-size: 12px; color: #909399; }
.hint.ok { color: #67c23a; }
.warn-text { color: #e6a23c; }
.embed-tip { margin: 0 0 8px; font-size: 13px; color: #606266; }
.chain-box { background: #fafafa; padding: 12px; border-radius: 8px; }

.qm-actions-only {
  background: #fff;
  border: 1px solid #ebeef5;
  border-radius: 10px;
  padding: 14px 16px 16px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.02);
}
.qm-actions-only .block-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 14px;
  padding-bottom: 10px;
  border-bottom: 1px solid #f0f2f5;
}
.qm-actions-only .block-title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: #1f2329;
}
.op-actions-inline {
  margin-top: 4px;
}
</style>
