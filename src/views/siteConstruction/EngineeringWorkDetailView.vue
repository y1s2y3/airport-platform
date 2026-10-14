<script setup>
import './engineering-work-page.css'
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Clock } from '@element-plus/icons-vue'
import PersonalCenterReadonlyHint from '../../components/PersonalCenterReadonlyHint.vue'
import EngineeringWorkFormBody from './EngineeringWorkFormBody.vue'
import {
  ACTION_LABEL,
  NODE_LABEL,
  STATUS_LABEL,
  buildEngineeringWorkApprovalFlow,
  emptyCell,
  getEngineeringWork,
  statusTagType,
} from '../../mock/engineeringWork.js'

const route = useRoute()
const router = useRouter()

const detail = computed(() => {
  const id = String(route.query.id || '')
  return id ? getEngineeringWork(id) : null
})

const form = computed(() => detail.value || {
  snapshot: {},
  personnel_qual_desc: '',
  scheme_files: [],
  briefing_files: [],
  cert_files: [],
  remark: '',
})

const isReviewing = computed(() => detail.value?.status === 'reviewing')

/** 审批过程：与个人中心待办面板同一取数 */
const approvalFlow = computed(() => buildEngineeringWorkApprovalFlow(detail.value))

const processSteps = computed(() => {
  const d = detail.value
  if (!d) return []
  const last = [...(d.approvals || [])].reverse().find((r) => r.node === 'supervisor')
  function supervisorStep() {
    if (last?.action === 'agree') return { status: 'success', desc: last.time || '已通过' }
    if (last?.action === 'reject') return { status: 'error', desc: last.time || '已驳回' }
    if (isReviewing.value) return { status: 'process', desc: '审批中' }
    return { status: 'wait', desc: '等待' }
  }
  return [
    { title: '施工提交', status: 'success', desc: d.submit_time || '已提交' },
    { title: '监理审批', ...supervisorStep() },
  ]
})

const timeline = computed(() =>
  approvalFlow.value.map((step, index) => ({
    key: `${step.title}-${index}-${step.time}`,
    title: step.title,
    actionLabel: step.status === 'current' ? '待办理' : (ACTION_LABEL[stepAction(detail.value, index)] || ''),
    operator: step.user || '--',
    time: step.time || '--',
    remark: step.remark || '',
    status: step.status,
    color: step.status === 'current' ? '#e6a23c' : (stepAction(detail.value, index) === 'reject' ? '#f56c6c' : '#67c23a'),
  })),
)

/** 第 index 条留痕的办理动作（用于时间线颜色与动作标签） */
function stepAction(row, index) {
  const records = Array.isArray(row?.approvals) ? row.approvals : []
  return records[index]?.action || ''
}

function actionTagType(action) {
  if (action === 'agree' || action === 'submit') return 'success'
  if (action === 'reject') return 'danger'
  return 'info'
}
</script>

<template>
  <div class="ew-page page-card">
    <div class="page-header">
      <div class="page-breadcrumb">施工作业申报 / 工程作业申报 / 详情</div>
      <div class="title-row">
        <h1 class="page-title">工程作业申报详情</h1>
        <el-button @click="router.push('/site-construction/engineering-work')">返回列表</el-button>
      </div>
      <PersonalCenterReadonlyHint
        v-if="isReviewing"
        title="本页为只读查看；审批请在「个人中心 → 我的待办」中处理。提交后资料不可再编辑。"
      />
      <p v-else class="page-tip">审批请在个人中心待办办理；提交后资料只读。</p>
    </div>

    <el-empty v-if="!detail" description="未找到申报单" />

    <el-form v-else label-width="168px" class="create-form" label-position="right">
      <el-descriptions :column="2" border class="mb">
        <el-descriptions-item label="申报单号">{{ emptyCell(detail.biz_no) }}</el-descriptions-item>
        <el-descriptions-item label="申报人">{{ emptyCell(detail.applicant_name) }}</el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag size="small" :type="statusTagType(detail.status)">
            {{ STATUS_LABEL[detail.status] }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="当前节点">
          {{ NODE_LABEL[detail.current_node_key] || '--' }}
        </el-descriptions-item>
        <el-descriptions-item label="提交时间">{{ emptyCell(detail.submit_time) }}</el-descriptions-item>
        <el-descriptions-item v-if="detail.copy_from_biz_no" label="重新申报来源" :span="2">
          {{ detail.copy_from_biz_no }}
        </el-descriptions-item>
      </el-descriptions>

      <EngineeringWorkFormBody :form="form" readonly :project-id="detail.project_id" />

      <section class="form-section">
        <header class="section-head">
          <el-icon class="section-icon"><Clock /></el-icon>
          <div class="section-head-main">
            <h2 class="section-title">审批过程</h2>
            <p class="section-desc">施工提交后由监理一级办理。</p>
          </div>
        </header>
        <div class="section-body">
          <el-steps :active="isReviewing ? 1 : 2" finish-status="success" align-center class="mb">
            <el-step
              v-for="(s, idx) in processSteps"
              :key="idx"
              :title="s.title"
              :status="s.status"
              :description="s.desc"
            />
          </el-steps>
          <el-timeline v-if="timeline.length">
            <el-timeline-item
              v-for="item in timeline"
              :key="item.key"
              :timestamp="item.time"
              :color="item.color"
              placement="top"
            >
              <div class="tl-card">
                <div>
                  <strong>{{ item.title }}</strong>
                  <el-tag size="small" class="ml" :type="actionTagType(item.actionLabel === '驳回' ? 'reject' : 'agree')">
                    {{ item.actionLabel }}
                  </el-tag>
                </div>
                <div class="tl-meta">{{ item.operator }}</div>
                <div v-if="item.remark" class="tl-comment">{{ item.remark }}</div>
              </div>
            </el-timeline-item>
          </el-timeline>
          <div v-else class="empty-inline">暂无审批记录</div>
        </div>
      </section>
    </el-form>
  </div>
</template>

<style scoped>
.ml {
  margin-left: 8px;
}
</style>
