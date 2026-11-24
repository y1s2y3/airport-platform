<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { getMobileRectification, submitInspectionWorkflowStep } from '../../composables/useMobileRectification'
import { useMobileRouteBase } from '../../composables/useMobileRouteBase'
import MobileRectifyBasicInfo from '../../components/MobileRectifyBasicInfo.vue'

import { workflowFlowRecords, currentWorkflowStep, usesExtendedInspectionWorkflow } from '../../utils/inspectionRectificationWorkflow'
import { canExecuteInspectionStep } from '../../utils/inspectionWorkflowIdentity'

function today() {
 const date = new Date()
 return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-')
}

const route = useRoute()
const router = useRouter()
const { rectifyBase } = useMobileRouteBase()
const record = computed(() => getMobileRectification(route.params.id))
const missing = computed(() => !record.value)
const approvalDate = ref(today())
const approvalComment = ref('')
const step = computed(() => currentWorkflowStep(record.value))
const expectedStage = ref('')
watch(() => route.params.id, () => { expectedStage.value = step.value?.key || '' }, { immediate: true })
const canHandle = computed(() => ['approval', 'departmentConfirmation', 'voidApproval'].includes(expectedStage.value)
  && step.value?.key === expectedStage.value && canExecuteInspectionStep(record.value, expectedStage.value))
const approvalLabel = computed(() => canHandle.value ? step.value.label : '整改单审批')
const isVoidApproval = computed(() => expectedStage.value === 'voidApproval')
const followsDepartmentConfirmation = computed(() => expectedStage.value === 'approval' && usesExtendedInspectionWorkflow(record.value))
const flowCollapsed = ref(false)
onMounted(() => document.querySelector('.page-viewport')?.scrollTo({ top: 0 }))

const flowRecords = computed(() => workflowFlowRecords(record.value).map(item => ({ ...item, action: item.a, date: item.d, detail: item.dt, current: item.cur })))

function displayPhotos(list) {
  if (!list?.length) return '--'
  return list.join('、')
}

function handleApproval(pass) {
  if (missing.value) {
    ElMessage.error('未找到整改单，无法审批')
    return
  }
  if (!approvalDate.value) {
    ElMessage.warning('请选择审批日期')
    return
  }
  if (!approvalComment.value.trim()) {
    ElMessage.warning('请输入审批意见')
    return
  }
  if (!canHandle.value) return
  const ok = submitInspectionWorkflowStep(record.value.id, expectedStage.value, pass, {
    date: approvalDate.value,
    comment: approvalComment.value.trim(),
  })
  if (!ok) {
    ElMessage.error('提交失败，当前节点可能已变更，请返回列表刷新后重试')
    return
  }
  ElMessage.success(isVoidApproval.value
    ? (pass ? '整改单已作废' : '作废申请未通过，原流程继续办理')
    : !pass ? '已退回整改人重新整改'
      : record.value.status === '已关闭' ? '确认通过，整改流程已关闭' : '验收通过，已转项目部长确认')
  router.push(route.query.from === 'message' ? '/mobile/messages' : rectifyBase.value)
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
      <h1 class="mt">{{ approvalLabel }}</h1>
    </header>

    <div v-if="missing" class="empty-tip">未找到该整改单，请返回列表重试。</div>

    <template v-else>
      <MobileRectifyBasicInfo :record="record" />

      <div class="section">
        <div class="section-title collapsible" @click="flowCollapsed = !flowCollapsed">
          <span>流程记录</span>
          <span class="collapse-arrow">{{ flowCollapsed ? '展开 ▸' : '收起 ▾' }}</span>
        </div>
        <div v-show="!flowCollapsed" class="flow-list">
          <div v-for="(item, index) in flowRecords" :key="index" class="flow-item" :class="{ current: item.current }">
            <span class="flow-dot"></span>
            <div class="flow-content">
              <strong>{{ item.action }}</strong>
              <span>{{ item.date || '待处理' }}</span>
              <span>处理人：{{ item.by || '--' }}</span>
              <span v-if="item.detail" class="flow-detail">{{ item.detail }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">隐患与整改复核结果</div>
        <div class="info-row"><span>隐患类别</span><p>{{ record.hazardCategory || '安全管理' }}</p></div>
        <div class="info-row"><span>隐患等级</span><p>{{ record.hazardLevel || '未设置' }}</p></div>
        <div class="info-row"><span>整改要求</span><p style="white-space:pre-wrap">{{ record.rectifyRequirement || '未填写' }}</p></div>
        <div class="info-row"><span>隐患说明</span><p>{{ record.hazard || '--' }}</p></div>
        <div class="info-row"><span>隐患照片</span><p>{{ displayPhotos(record.hazardPhotos) }}</p></div>
        <div class="info-row"><span>整改日期</span><p>{{ record.rectificationDate || record.submitDate || '--' }}</p></div>
        <div class="info-row"><span>整改照片</span><p>{{ displayPhotos(record.rectificationPhotos) }}</p></div>
        <div class="info-row"><span>整改说明</span><p>{{ record.rectificationNote || '--' }}</p></div>
        <div class="info-row"><span>复核日期</span><p>{{ record.reviewDate || '--' }}</p></div>
        <div class="info-row"><span>复核结果</span><p :class="{ 'pass-text': record.reviewResult === '通过' }">{{ record.reviewResult || '--' }}</p></div>
        <div class="info-row"><span>复核意见</span><p>{{ record.reviewComment || '--' }}</p></div>
      </div>

      <div v-if="isVoidApproval && record.voidRequest" class="section">
        <div class="section-title">作废申请</div>
        <div class="info-row"><span>申请人</span><p>{{ record.voidRequest.applicant }}</p></div>
        <div class="info-row"><span>作废理由</span><p style="white-space:pre-wrap">{{ record.voidRequest.reason }}</p></div>
      </div>

      <div v-if="canHandle" class="section approval-card">
        <div class="section-title">审批意见</div>
        <label class="form-row">
          <span>审批日期 <i>*</i></span>
          <input v-model="approvalDate" type="date" />
        </label>
        <label class="form-row">
          <span>审批意见 <i>*</i></span>
          <textarea v-model="approvalComment" rows="3" placeholder="请输入审批意见..." />
        </label>
        <div class="actions">
          <button class="reject" @click="handleApproval(false)">{{ isVoidApproval ? '不通过' : '不通过，退回整改' }}</button>
          <button class="pass" @click="handleApproval(true)">{{ isVoidApproval ? '通过' : followsDepartmentConfirmation ? '通过，提交项目部长' : '通过并关闭' }}</button>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.mp { width:100%; max-width:402px; min-height:100vh; margin:0 auto; background:#f5f5f5; font-family:'PingFang SC',-apple-system,sans-serif; padding-bottom:20px; }
.mh { display:flex; align-items:center; padding:12px 16px; background:#8f0045; color:#fff; position:sticky; top:0; z-index:10; }
.mb { border:0; background:transparent; color:#fff; font-size:28px; line-height:1; cursor:pointer; }
.mt { flex:1; margin:0; font-size:18px; font-weight:600; }
.empty-tip { margin:40px 16px; padding:24px; text-align:center; color:#999; background:#fff; border-radius:10px; }
.section { margin:12px 16px; padding:14px 16px; background:#fff; border-radius:10px; box-shadow:0 1px 3px rgba(0,0,0,.04); }
.section-title { margin-bottom:12px; padding-left:9px; border-left:3px solid #8f0045; color:#1f2329; font-size:14px; font-weight:600; }
.collapsible { display:flex; justify-content:space-between; cursor:pointer; }
.collapse-arrow { color:#999; font-size:12px; font-weight:400; }
.flow-list { padding-left:6px; }
.flow-item { position:relative; display:flex; gap:10px; padding-bottom:14px; }
.flow-item::before { content:''; position:absolute; left:6px; top:14px; bottom:0; width:1px; background:#ddd; }
.flow-item:last-child::before { display:none; }
.flow-dot { width:13px; height:13px; margin-top:2px; border-radius:50%; background:#34a853; flex:none; }
.flow-item.current .flow-dot { background:#8f0045; box-shadow:0 0 0 3px #fceef4; }
.flow-content { flex:1; min-width:0; display:flex; flex-direction:column; gap:4px; font-size:12px; overflow-wrap:anywhere; }
.flow-content strong { color:#333; font-size:13px; }
.flow-content span { color:#999; }
.info-row { display:flex; gap:8px; margin-bottom:8px; font-size:13px; line-height:1.6; }
.info-row > span { width:68px; color:#999; flex:none; }
.info-row p { margin:0; color:#333; }
.pass-text { color:#34a853!important; font-weight:600; }
.form-row { display:flex; gap:8px; align-items:flex-start; margin-bottom:12px; font-size:13px; }
.form-row > span { width:72px; padding-top:7px; color:#666; flex:none; }
.form-row i { color:#e53935; font-style:normal; }
.form-row input,.form-row textarea { flex:1; box-sizing:border-box; min-width:0; padding:9px 10px; border:1px solid #ddd; border-radius:8px; background:#fff; font:inherit; }
.actions { display:flex; gap:10px; margin-top:14px; }
.actions button { flex:1; padding:12px 6px; border-radius:9px; font-size:14px; font-weight:600; cursor:pointer; }
.actions .reject { border:1px solid #e53935; background:#fff2f2; color:#e53935; }
.actions .pass { border:1px solid #8f0045; background:#8f0045; color:#fff; }
</style>
