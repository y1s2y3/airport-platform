<script setup>
import { canExecuteInspectionStep } from '../../utils/inspectionWorkflowIdentity'
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { getMobileRectification, submitInspectionWorkflowStep } from '../../composables/useMobileRectification'
import { useMobileRouteBase } from '../../composables/useMobileRouteBase'

import { workflowFlowRecords, currentWorkflowStep, workflowSteps, isAcceptanceStage } from '../../utils/inspectionRectificationWorkflow'

function today() {
 const date = new Date()
 return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-')
}

const route = useRoute()
const router = useRouter()
const { rectifyBase } = useMobileRouteBase()
const rid = computed(() => route.params.id)

const record = computed(() => getMobileRectification(rid.value))
const missing = computed(() => !record.value)
const assignmentRevision = ref(record.value?.workflowAssignmentRevision || 0)
const canHandle = computed(() => canExecuteInspectionStep(record.value, expectedStage.value))
const expectedStage = ref('')
watch(rid, () => {
  assignmentRevision.value = record.value?.workflowAssignmentRevision || 0
  const stage = currentWorkflowStep(record.value)?.key
  expectedStage.value = ['contractorAcceptance', 'review', 'directorAcceptance'].includes(stage) ? stage : ''
}, { immediate: true })
const actionStep = computed(() => workflowSteps(record.value).find(step => step.key === expectedStage.value))
const actionLabel = computed(() => actionStep.value?.label || '复核')
const actionInputLabel = computed(() => ({ contractorAcceptance: '施工验收', review: '监理复核', directorAcceptance: '总监验收' })[expectedStage.value] || '复核')

/** 进入总监验收/审批等后续节点时，把上一环“监理复核”的结论单独展示出来 */
const reviewRecord = computed(() => {
  const row = record.value
  if (!row) return null
  if (!(row.reviewDate || row.reviewComment || row.reviewResult)) return null
  return {
    reviewer: row.reviewer || '',
    date: row.reviewDate || '',
    result: row.reviewResult || '通过',
    comment: row.reviewComment || '',
  }
})

const flowCollapsed = ref(false)
const reviewComment = ref('')
const acceptanceStage = computed(() => isAcceptanceStage(expectedStage.value))
const reviewDate = ref(today())
onMounted(() => document.querySelector('.page-viewport')?.scrollTo({ top: 0 }))

const flowRecords = computed(() => workflowFlowRecords(record.value))

function displayPhotos(list) {
  if (!list?.length) return '--'
  return list.join('、')
}

function handleReview(pass) {
  if (missing.value) {
    ElMessage.error('未找到整改单，无法复核')
    return
  }
  if ((!pass || !acceptanceStage.value) && !reviewComment.value.trim()) {
    ElMessage.warning(`请输入${actionLabel.value}意见`)
    return
  }
  if (!reviewDate.value) {
    ElMessage.warning(`请选择${actionLabel.value}日期`)
    return
  }
  const ok = submitInspectionWorkflowStep(rid.value, expectedStage.value, pass, {
    assignmentRevision: assignmentRevision.value,
    date: reviewDate.value,
    comment: reviewComment.value.trim(),
  })
  if (!ok) {
    ElMessage.error('提交失败，当前节点可能已变更，请返回列表刷新后重试')
    return
  }
  ElMessage.success(pass ? `处理通过，已流转至${record.value.currentNode}` : `处理不通过，已退回${record.value.currentNode}`)
  const tab = route.query.tab
  router.push(tab ? `${rectifyBase.value}?tab=${tab}` : rectifyBase.value)
}

function goBack() {
  const tab = route.query.tab
  router.push(tab ? `${rectifyBase.value}?tab=${tab}` : rectifyBase.value)
}
</script>

<template>
  <div class="mp">
    <header class="mh">
      <button class="mb" @click="goBack">‹</button>
      <h1 class="mt">{{ actionLabel }}</h1>
    </header>

    <div v-if="missing" class="empty-tip">未找到该整改单，请返回列表重试。</div>

    <template v-else>
      <div v-if="!canHandle" class="empty-tip">任务已指派给其他人员，你无法继续执行。</div>
      <div class="ib">
        <div class="ibn"><span class="ibn-label">整改单编号：</span>{{ record.rectifyNo }}</div>
        <div class="ibm"><span class="ibm-label">巡检任务单编号：</span><span class="ibm-value">{{ record.taskNo || '--' }}</span></div>
        <div class="ibm"><span class="ibm-label">巡检分类：</span><span class="ibm-value">{{ record.inspectionCategory || '--' }}</span></div>
        <div class="ibm"><span class="ibm-label">截止日期：</span><span class="ibm-value">{{ record.deadline || '--' }}</span></div>
        <div class="ibm"><span class="ibm-label">状态：</span><span class="ibm-value">{{ record.status || '--' }}</span></div>
        <div class="ibm"><span class="ibm-label">项目名称：</span><span class="ibm-value">{{ record.project || '--' }}</span></div>
        <div class="ibm"><span class="ibm-label">整改人：</span><span class="ibm-value">{{ record.rectifier || '--' }}</span></div>
        <div class="ibm"><span class="ibm-label">复核人：</span><span class="ibm-value">{{ record.reviewer || '--' }}</span></div>
      </div>

      <div v-if="record.approvalRejected" class="approval-reject-tip">
        <strong>项目经理审批不通过</strong>
        <span>{{ record.approvalReason || '--' }}</span>
        <small>请复核人重新核验并提交审批</small>
      </div>

      <div class="sc">
        <div class="sct colps" @click="flowCollapsed = !flowCollapsed">
          <span>流程记录</span>
          <span class="ca">{{ flowCollapsed ? '展开 ▸' : '收起 ▾' }}</span>
        </div>
        <div v-show="!flowCollapsed" class="fl">
          <div v-for="(f, i) in flowRecords" :key="i" class="fi" :class="{ cur: f.cur }">
            <div class="fd" :class="{ cur: f.cur }"></div>
            <div class="fc">
              <div class="fc-row">
                <span class="fa">{{ f.a }}</span>
                <span class="fd2">{{ f.d || '待处理' }}</span>
              </div>
              <span class="fd2">处理人：{{ f.by || '--' }}</span>
              <span v-if="f.dt" class="fdl">{{ f.dt }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="sc">
        <div class="sct">整改结果</div>
        <div class="ic">
          <div class="ir"><span class="il">隐患类别</span><span>{{ record.hazardCategory || '安全管理' }}</span></div>
          <div class="ir"><span class="il">隐患等级</span><span>{{ record.hazardLevel || '未设置' }}</span></div>
          <div class="ir"><span class="il">整改要求</span><span style="white-space:pre-wrap">{{ record.rectifyRequirement || '未填写' }}</span></div>
          <div class="ir"><span class="il">隐患说明</span><span>{{ record.hazard || '--' }}</span></div>
          <div class="ir"><span class="il">隐患照片</span><span>{{ displayPhotos(record.hazardPhotos) }}</span></div>
          <div class="dv"></div>
          <div class="ir"><span class="il">整改日期</span><span>{{ record.rectificationDate || record.submitDate || '--' }}</span></div>
          <div class="ir"><span class="il">整改照片</span><span>{{ displayPhotos(record.rectificationPhotos) }}</span></div>
          <div class="ir"><span class="il">整改说明</span><span>{{ record.rectificationNote || '--' }}</span></div>
        </div>
      </div>

      <div v-if="reviewRecord" class="sc">
        <div class="sct">监理复核记录</div>
        <div class="ic">
          <div class="ir"><span class="il">复核人</span><span>{{ reviewRecord.reviewer || '--' }}</span></div>
          <div class="ir"><span class="il">复核日期</span><span>{{ reviewRecord.date || '--' }}</span></div>
          <div class="ir"><span class="il">复核结果</span><span :class="reviewRecord.result === '通过' ? 'pass' : 'fail'">{{ reviewRecord.result || '--' }}</span></div>
          <div class="ir"><span class="il">复核意见</span><span>{{ reviewRecord.comment || '--' }}</span></div>
        </div>
      </div>

      <div class="sc review">
        <div class="sct">{{ actionLabel }}意见</div>
        <div class="fr"><span class="fl-label">{{ actionInputLabel }}日期 <i class="req">*</i></span><input type="date" v-model="reviewDate" class="fi-input" /></div>
        <div class="fr">
          <span class="fl-label">{{ actionInputLabel }}意见 <i v-if="!acceptanceStage" class="req">*</i></span>
          <textarea v-model="reviewComment" class="fta" :placeholder="acceptanceStage ? `${actionLabel}意见（通过选填，不通过必填）` : `请输入${actionLabel}意见`" rows="3"></textarea>
        </div>
        <div class="ra">
          <button class="ab reject" :disabled="!canHandle" @click="handleReview(false)">❌ 不通过</button>
          <button class="ab pass" :disabled="!canHandle" @click="handleReview(true)">✅ 通过</button>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.mp { width:100%; max-width:402px; margin:0 auto; min-height:100vh; background:#f5f5f5; padding-bottom:env(safe-area-inset-bottom,0); }
.mh { display:flex; align-items:center; padding:12px 16px; background:#8f0045; color:#fff; position:sticky; top:0; z-index:10; }
.mb { background:none; border:none; color:#fff; font-size:28px; padding:0 4px 0 0; line-height:1; cursor:pointer; }
.mt { flex:1; font-size:18px; font-weight:600; margin:0; }
.empty-tip { margin:40px 16px; padding:24px; text-align:center; color:#999; background:#fff; border-radius:10px; }

.ib { background:#fff; padding:14px 16px; border-bottom:1px solid #eee; }
.ibn { font-size:15px; font-weight:600; color:#1f2329; margin-bottom:6px; }
.ibn-label { font-size:12px; font-weight:400; color:#999; }
.ibm { display:flex; align-items:flex-start; gap:4px; font-size:12px; line-height:1.6; color:#999; }
.ibm-label { flex:0 0 96px; text-align:right; white-space:nowrap; }
.ibm-value { flex:1; min-width:0; color:#666; word-break:break-word; }
.approval-reject-tip { margin:12px 16px 0; padding:12px 14px; border-radius:10px; background:#fff2f2; border:1px solid #ffc9c9; display:flex; flex-direction:column; gap:4px; color:#d93025; font-size:13px; }
.approval-reject-tip small { color:#999; }

.sc { background:#fff; border-radius:10px; padding:14px 16px; margin:12px 16px; box-shadow:0 1px 3px rgba(0,0,0,0.04); }
.sct { font-size:13px; font-weight:600; color:#1f2329; margin-bottom:10px; padding-left:8px; border-left:3px solid #8f0045; }
.sct.colps { cursor:pointer; display:flex; align-items:center; justify-content:space-between; }
.ca { font-size:12px; color:#999; font-weight:400; }

.ic { background:#fafafa; border-radius:8px; padding:12px; margin-bottom:8px; }
.ir { display:flex; gap:6px; font-size:13px; line-height:1.6; margin-bottom:4px; }
.il { color:#999; flex-shrink:0; width:68px; }
.pass { color:#34a853; font-weight:600; }
.fail { color:#e53935; font-weight:600; }
.ir > span:last-child { flex:1; min-width:0; word-break:break-word; }
.dv { height:1px; background:#eee; margin:8px 0; }

.fr { display:flex; gap:8px; margin-bottom:10px; align-items:flex-start; }
.fl-label { font-size:13px; color:#666; flex-shrink:0; width:72px; padding-top:4px; }
.req { color:#e53935; font-style:normal; margin-left:2px; }
.fi-input { flex:1; min-width:0; box-sizing:border-box; padding:8px 10px; border:1px solid #ddd; border-radius:8px; font-size:13px; background:#fff; }
.fta { flex:1; min-width:0; width:100%; padding:10px 12px; border:1px solid #ddd; border-radius:8px; font-size:13px; font-family:inherit; resize:none; background:#fff; box-sizing:border-box; }
.ra { display:flex; gap:10px; margin-top:10px; }
.ab { flex:1; padding:14px; border-radius:10px; font-size:15px; font-weight:600; cursor:pointer; text-align:center; border:1.5px solid; }
.ab.pass { background:#e8f5e9; color:#34a853; border-color:#34a853; }
.ab.reject { background:#ffebee; color:#e53935; border-color:#e53935; }

.fl { padding-left:6px; }
.fi { display:flex; gap:10px; padding-bottom:14px; position:relative; }
.fi::before { content:''; position:absolute; left:7px; top:15px; bottom:0; width:1px; background:#e0e0e0; }
.fi:last-child::before { display:none; }
.fi:last-child { padding-bottom:0; }
.fd { width:14px; height:14px; border-radius:50%; background:#34a853; flex-shrink:0; margin-top:2px; }
.fd.cur { background:#8f0045; box-shadow:0 0 0 3px #fceef4; }
.fc { display:flex; flex-direction:column; gap:4px; flex:1; }
.fc-row { display:flex; justify-content:space-between; align-items:baseline; width:100%; }
.fa { font-size:13px; color:#1f2329; font-weight:500; }
.fd2 { font-size:12px; color:#999; flex-shrink:0; }
.fdl { font-size:11px; color:#606266; background:#f5f7fa; padding:2px 8px; border-radius:4px; display:inline-block; }
.fi.cur .fa { color:#8f0045; }
.fi.cur .fd2 { color:#f5a623; }
</style>
