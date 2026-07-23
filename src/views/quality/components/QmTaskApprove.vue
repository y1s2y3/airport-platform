<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  approveStep,
  approvalRecords,
  createRectify,
  findTask,
  getApprovalChain,
  getItemsByTaskId,
  getNextApprovalRole,
  hasBlockFailItems,
  hasOnlyGeneralFail,
  ITEM_CATEGORY,
  JUDGE_RESULT,
  rejectTask,
  resolveProjectName,
  rollbackToDraft,
  signatureRecords,
  TASK_STATUS,
  TASK_TYPE_LABEL,
  wbsNodes,
  getConfiguredApproversForChainRole,
  isChainRoleConfigured,
} from '../../../mock/qm.js'

const props = defineProps({
  title: { type: String, default: '验评审批' },
  listPath: { type: String, required: true },
  editPath: { type: String, required: true },
})

const route = useRoute()
const router = useRouter()
const task = ref(null)
const demoRole = ref('')

function load() {
  task.value = route.query.id ? findTask(route.query.id) : null
  if (task.value) {
    demoRole.value = getNextApprovalRole(task.value) || '监理'
  }
}

watch(() => route.query.id, load, { immediate: true })

const chain = computed(() => (task.value ? getApprovalChain(task.value) : []))
const nextRole = computed(() => (task.value ? getNextApprovalRole(task.value) : null))
const chainWithApprovers = computed(() =>
  chain.value.map((role) => ({
    role,
    people: getConfiguredApproversForChainRole(task.value?.project_id, role),
  })),
)
const nextRolePeople = computed(() =>
  nextRole.value
    ? getConfiguredApproversForChainRole(task.value?.project_id, nextRole.value)
    : [],
)
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

function operatorLabel(role) {
  const people = getConfiguredApproversForChainRole(task.value?.project_id, role)
  if (!people.length) return role
  return `${role}（${people.map((p) => p.name).join('、')}）`
}

async function onApprove() {
  if (!task.value || task.value.status !== 1) return ElMessage.warning('当前不可审批')
  const role = demoRole.value || nextRole.value
  if (!isChainRoleConfigured(task.value.project_id, role)) {
    return ElMessage.warning(`「${role}」尚未配置审批人，请先在「审批人配置」中设置`)
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
    const role = demoRole.value || nextRole.value || '监理'
    if (!isChainRoleConfigured(task.value.project_id, role)) {
      return ElMessage.warning(`「${role}」尚未配置审批人，请先在「审批人配置」中设置`)
    }
    const r = rejectTask(task.value, value, role)
    if (!r.ok) return ElMessage.error(r.msg)
    ElMessage.warning('已判定不通过，请下发整改单')
    try {
      await ElMessageBox.confirm('是否立即下发整改单？', '提示', { type: 'warning' })
      const cr = createRectify(task.value, value)
      if (!cr.ok) return ElMessage.error(cr.msg)
      ElMessage.success(`已下发 ${cr.order.order_no}`)
    } catch {
      /* skip */
    }
    router.push(`${props.editPath}?id=${task.value.id}`)
  } catch {
    /* cancel */
  }
}

function onRollback() {
  const r = rollbackToDraft(task.value)
  if (!r.ok) return ElMessage.error(r.msg)
  ElMessage.success('已退回待验评，可修改后重报')
  router.push(`${props.editPath}?id=${task.value.id}`)
}

void hasBlockFailItems
</script>

<template>
  <div v-if="!task" class="qm-page page-card">
    <el-empty description="未找到任务">
      <el-button type="primary" @click="router.push(listPath)">返回列表</el-button>
    </el-empty>
  </div>
  <div v-else class="qm-page page-card">
    <div class="page-header">
      <div class="page-breadcrumb">质量验评 / {{ title }}</div>
      <h1 class="page-title">{{ task.task_no }} · 审批签章</h1>
      <p class="page-tip">
        {{ resolveProjectName(task.project_id) }} · {{ nodeName }} · {{ TASK_TYPE_LABEL[task.task_type] }} ·
        {{ TASK_STATUS[task.status] }}
      </p>
    </div>

    <div class="chain-box mb">
      <div class="section-title">审批链</div>
      <el-steps
        :active="nextRole ? Math.max(0, chain.findIndex((r) => r === nextRole)) : chain.length"
        finish-status="success"
        align-center
      >
        <el-step
          v-for="node in chainWithApprovers"
          :key="node.role"
          :title="node.role"
          :description="
            node.people.length
              ? node.people.map((p) => p.name).join('、') + (node.people.every((p) => p.fromConfig) ? '' : '（默认）')
              : '未配置审批人'
          "
        />
      </el-steps>
      <p v-if="task.status === 1 && nextRole" class="hint">
        当前待审：{{ nextRole }}
        <template v-if="nextRolePeople.length">
          · {{ nextRolePeople.map((p) => `${p.name}（${p.postLabel}）`).join('、') }}
        </template>
        <template v-else>
          · <span class="warn-text">尚未配置审批人</span>
        </template>
      </p>
      <p v-else-if="task.status === 2" class="hint ok">已办结通过</p>
    </div>

    <div v-if="task.status === 1" class="filter-bar mb">
      <span>演示角色</span>
      <el-select v-model="demoRole" style="width: 160px">
        <el-option v-for="role in chain" :key="role" :label="role" :value="role" />
      </el-select>
      <el-button type="success" @click="onApprove">本级通过并签章</el-button>
      <el-button type="danger" @click="onReject">不通过/退回</el-button>
      <el-button @click="onRollback">退回重报</el-button>
    </div>

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

    <div class="section-title">审批轨迹</div>
    <el-timeline>
      <el-timeline-item v-for="r in records" :key="r.id" :timestamp="r.action_time">
        {{ operatorLabel(r.operator_role) }} · {{ { 1: '提交', 2: '通过', 3: '不通过' }[r.action] }}
        <span v-if="r.opinion"> — {{ r.opinion }}</span>
      </el-timeline-item>
    </el-timeline>

    <div class="filter-bar">
      <el-button @click="router.push(listPath)">返回列表</el-button>
      <el-button @click="router.push(`${editPath}?id=${task.id}`)">查看填报</el-button>
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
.chain-box { background: #fafafa; padding: 12px; border-radius: 8px; }
</style>
