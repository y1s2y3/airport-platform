<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import {
  addAttachment,
  decideReinspect,
  findRectify,
  findTask,
  getAttachments,
  inspectionTasks,
  ORG_LABEL,
  RECTIFY_STATUS,
  resolveProjectName,
  reinspectRounds,
  saveRectifyMeasure,
  submitReinspectRequest,
  TASK_STATUS,
} from '../../mock/qm.js'

const route = useRoute()
const router = useRouter()
const order = ref(null)
const measure = ref('')

function load() {
  order.value = findRectify(route.query.id || route.params.id)
  measure.value = order.value?.measure || ''
}
watch(() => route.query.id, load, { immediate: true })
watch(() => route.params.id, load)

const task = computed(() =>
  order.value ? findTask(order.value.source_task_id) || inspectionTasks.find((t) => t.id === order.value.source_task_id) : null,
)
const afterPhotos = computed(() =>
  order.value ? getAttachments('RECTIFY', order.value.id).filter((a) => a.file_category === 8) : [],
)
const rounds = computed(() =>
  order.value ? reinspectRounds.filter((r) => r.rectify_id === order.value.id) : [],
)

function onSave() {
  const r = saveRectifyMeasure(order.value, measure.value)
  if (!r.ok) return ElMessage.error(r.msg)
  ElMessage.success('措施已保存')
}

function onPhoto() {
  const r = addAttachment({
    biz_type: 'RECTIFY',
    biz_id: order.value.id,
    task_id: order.value.source_task_id,
    file_name: '整改后影像.jpg',
    file_category: 8,
    file_ext: 'jpg',
  })
  if (!r.ok) return ElMessage.error(r.msg)
  ElMessage.success('已上传整改后影像')
}

function onSubmit() {
  if (!task.value) return ElMessage.error('来源任务不存在')
  const r = submitReinspectRequest(task.value)
  if (!r.ok) return ElMessage.error(r.msg)
  ElMessage.success('已提交复验')
  load()
}

function onPass() {
  const r = decideReinspect(task.value, { pass: true })
  if (!r.ok) return ElMessage.error(r.msg)
  ElMessage.success('复验通过并销号')
  load()
}
</script>

<template>
  <div v-if="!order" class="qm-page page-card"><el-empty description="整改单不存在" /></div>
  <div v-else class="qm-page page-card">
    <div class="page-header">
      <div class="page-breadcrumb">质量验评 / 整改复验 / 详情</div>
      <h1 class="page-title">{{ order.order_no }}</h1>
      <p class="page-tip">{{ RECTIFY_STATUS[order.status] }} · {{ resolveProjectName(order.project_id) }}</p>
    </div>
    <el-descriptions :column="2" border class="mb">
      <el-descriptions-item label="来源验评单">{{ task?.task_no || order.source_task_id }}</el-descriptions-item>
      <el-descriptions-item label="任务状态">{{ task ? TASK_STATUS[task.status] : '—' }}</el-descriptions-item>
      <el-descriptions-item label="问题描述" :span="2">{{ order.problem_desc }}</el-descriptions-item>
      <el-descriptions-item label="责任单位">{{ ORG_LABEL[order.responsible_org_id] }}</el-descriptions-item>
      <el-descriptions-item label="整改期限">{{ order.deadline }}</el-descriptions-item>
    </el-descriptions>

    <div class="section-title">整改措施</div>
    <el-input v-model="measure" type="textarea" :rows="3" class="mb" :disabled="order.status === 3" />
    <div class="filter-bar mb">
      <el-button v-if="order.status !== 3" @click="onSave">保存措施</el-button>
      <el-button v-if="order.status !== 3" @click="onPhoto">上传整改后影像（{{ afterPhotos.length }}）</el-button>
      <el-button v-if="task?.status === 4" type="primary" @click="onSubmit">提交复验</el-button>
      <el-button v-if="task?.status === 5" type="success" @click="onPass">复验通过</el-button>
    </div>

    <div class="section-title">复验轮次</div>
    <el-table :data="rounds" border size="small" empty-text="暂无复验轮次">
      <el-table-column prop="round_no" label="轮次" width="70" />
      <el-table-column prop="submit_time" label="提交时间" width="170" />
      <el-table-column prop="reinspect_time" label="复验时间" width="170" />
      <el-table-column label="结论" width="90">
        <template #default="{ row }">{{ { 0: '待判定', 1: '通过', 2: '不通过' }[row.result] }}</template>
      </el-table-column>
      <el-table-column prop="opinion" label="意见" min-width="160" />
    </el-table>

    <el-button style="margin-top: 16px" @click="router.push('/qm/inspect/rectify/list')">返回列表</el-button>
  </div>
</template>

<style scoped>
.qm-page { display: flex; flex-direction: column; gap: 12px; }
.page-breadcrumb { font-size: 12px; color: #909399; }
.page-title { margin: 4px 0; font-size: 20px; }
.page-tip { margin: 0; font-size: 13px; color: #606266; }
.section-title { font-weight: 600; }
.filter-bar { display: flex; flex-wrap: wrap; gap: 8px; }
.mb { margin-bottom: 12px; }
</style>
