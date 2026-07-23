<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  findPlan,
  NODE_TYPE_LABEL,
  PLAN_STATUS,
  PLAN_TYPE,
  resolveProjectName,
  reviewPlan,
  wbsNodes,
} from '../../mock/qm.js'

const route = useRoute()
const router = useRouter()
const plan = computed(() => findPlan(route.query.id))
const nodeName = computed(() => {
  const n = wbsNodes.find((x) => x.id === plan.value?.wbs_node_id)
  return n ? `${n.node_name}（${NODE_TYPE_LABEL[n.node_type]}）` : '—'
})

async function onPass() {
  const r = reviewPlan(plan.value, { pass: true })
  if (!r.ok) return ElMessage.error(r.msg)
  ElMessage.success('复核通过，计划进入未开始')
  router.push('/qm/inspect/plans')
}

async function onReject() {
  try {
    const { value } = await ElMessageBox.prompt('请填写退回原因（必填）', '复核退回', {
      inputType: 'textarea',
      inputValidator: (v) => (!!String(v || '').trim() ? true : '意见不能为空'),
    })
    const r = reviewPlan(plan.value, { pass: false, review_opinion: value })
    if (!r.ok) return ElMessage.error(r.msg)
    ElMessage.warning('已退回施工方修改')
    router.push('/qm/inspect/plans')
  } catch {
    /* cancel */
  }
}

</script>

<template>
  <div v-if="!plan" class="qm-page page-card">
    <el-empty description="计划不存在" />
  </div>
  <div v-else class="qm-page page-card">
    <div class="page-header">
      <div class="page-breadcrumb">质量验评 / 验收计划 / 复核</div>
      <h1 class="page-title">{{ plan.plan_no }} · 监理复核</h1>
      <p class="page-tip">不经建设单位审批；退回须填写意见</p>
    </div>
    <el-descriptions :column="2" border>
      <el-descriptions-item label="计划名称">{{ plan.plan_name }}</el-descriptions-item>
      <el-descriptions-item label="类型">{{ PLAN_TYPE[plan.plan_type] }}</el-descriptions-item>
      <el-descriptions-item label="项目">{{ resolveProjectName(plan.project_id) }}</el-descriptions-item>
      <el-descriptions-item label="状态">{{ PLAN_STATUS[plan.status] }}</el-descriptions-item>
      <el-descriptions-item label="关联目录树">{{ nodeName }}</el-descriptions-item>
      <el-descriptions-item label="计划日期">{{ plan.plan_date }}</el-descriptions-item>
      <el-descriptions-item label="验收内容" :span="2">{{ plan.content }}</el-descriptions-item>
    </el-descriptions>
    <div class="actions">
      <el-button v-if="plan.status === 0" type="success" @click="onPass">复核通过</el-button>
      <el-button v-if="plan.status === 0" type="danger" @click="onReject">退回</el-button>
      <el-button @click="router.push('/qm/inspect/plans')">返回</el-button>
    </div>
  </div>
</template>

<style scoped>
.qm-page { display: flex; flex-direction: column; gap: 16px; }
.page-breadcrumb { font-size: 12px; color: #909399; }
.page-title { margin: 4px 0; font-size: 20px; }
.page-tip { margin: 0; font-size: 13px; color: #606266; }
.actions { display: flex; gap: 8px; }
</style>
