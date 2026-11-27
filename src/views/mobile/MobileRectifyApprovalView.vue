<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { getVisibleMobileRectification, submitInspectionWorkflowStep } from '../../composables/useMobileRectification'
import { useMobileRouteBase } from '../../composables/useMobileRouteBase'
import { rectifyDepartmentConfirmInfo, rectifyManagerConfirmInfo, rectifyRectificationRounds, rectifyReviewRounds } from '../../composables/useInspectionRectifySections'
import MobileRectifyBasicInfo from '../../components/MobileRectifyBasicInfo.vue'
import InspectionPhotoList from '../../components/InspectionPhotoList.vue'
import InspectionVoidStamp from '../../components/InspectionVoidStamp.vue'

import { workflowFlowRecords, inspectionVoidFlowRecords, inspectionVoidRequests, currentWorkflowStep, isInspectionVoidPending } from '../../utils/inspectionRectificationWorkflow'
import { canExecuteInspectionStep } from '../../utils/inspectionWorkflowIdentity'

function today() {
 const date = new Date()
 return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-')
}

const route = useRoute()
const router = useRouter()
const { rectifyBase } = useMobileRouteBase()
const record = computed(() => getVisibleMobileRectification(route.params.id))
const missing = computed(() => !record.value)
const processDate = ref(today())
const processComment = ref('')
const step = computed(() => currentWorkflowStep(record.value))
const expectedStage = ref('')
const expectedVoidSequence = ref(null)
watch(() => route.params.id, () => {
  expectedStage.value = step.value?.key || ''
  expectedVoidSequence.value = expectedStage.value === 'voidApproval' ? inspectionVoidRequests(record.value).length : null
}, { immediate: true })
const canHandle = computed(() => ['approval', 'departmentConfirmation', 'voidApproval'].includes(expectedStage.value)
  && step.value?.key === expectedStage.value && canExecuteInspectionStep(record.value, expectedStage.value))
const approvalLabel = computed(() => canHandle.value ? step.value.label : '整改单审批')
const isVoidApproval = computed(() => expectedStage.value === 'voidApproval')
const flowCollapsed = ref(true)
onMounted(() => document.querySelector('.page-viewport')?.scrollTo({ top: 0 }))

/** 隐患/整改/监理复核/两级确认的信息块，与「整改详情」页同源 */
const rectificationRounds = computed(() => rectifyRectificationRounds(record.value))
const reviewRounds = computed(() => rectifyReviewRounds(record.value))
const managerConfirm = computed(() => rectifyManagerConfirmInfo(record.value))
const departmentConfirm = computed(() => rectifyDepartmentConfirmInfo(record.value, step.value?.key))

/** 办理区文案：确认节点用「确认」，作废审批仍用「审批」 */
const formMeta = computed(() => (isVoidApproval.value
  ? { title: '作废审批意见', dateLabel: '审批日期', commentLabel: '审批意见', placeholder: '请填写作废审批意见（不通过时必填）' }
  : { title: `${approvalLabel.value}意见`, dateLabel: '确认日期', commentLabel: '确认意见', placeholder: '请输入确认意见...' }))
const commentRequired = computed(() => !isVoidApproval.value)

const flowRecords = computed(() => {
  const flow = isVoidApproval.value ? inspectionVoidFlowRecords(record.value?.voidRequest) : workflowFlowRecords(record.value)
  return flow.map(item => ({ ...item, action: item.a, date: item.d, detail: item.dt, current: item.cur }))
})

function handleApproval(pass) {
  if (missing.value) {
    ElMessage.error('未找到整改单，无法办理')
    return
  }
  if (!processDate.value) {
    ElMessage.warning(`请选择${formMeta.value.dateLabel}`)
    return
  }
  if (commentRequired.value && !processComment.value.trim()) {
    ElMessage.warning(`请输入${formMeta.value.commentLabel}`)
    return
  }
  if (isVoidApproval.value && !pass && !processComment.value.trim()) {
    ElMessage.warning('请输入审批意见')
    return
  }
  if (!canHandle.value) return
  const ok = submitInspectionWorkflowStep(record.value.id, expectedStage.value, pass, {
    date: processDate.value,
    comment: processComment.value.trim(),
    voidSequence: expectedVoidSequence.value,
  })
  if (!ok) {
    ElMessage.error('提交失败，当前节点可能已变更，请返回列表刷新后重试')
    return
  }
  ElMessage.success(isVoidApproval.value
    ? (pass ? '整改单已作废' : '作废申请未通过，原流程继续办理')
    : !pass ? '已退回整改人重新整改'
      : record.value.status === '已关闭' ? '确认通过，整改流程已关闭' : '确认通过，已转项目部长确认')
  if (route.query.from === 'message') router.push('/mobile/messages')
  else goBack()
}

function goBack() {
  const tab = route.query.tab
  router.push(tab ? `${rectifyBase.value}?tab=${tab}` : rectifyBase.value)
}
</script>

<template>
  <div class="mp">
    <header class="mh">
      <button class="mb" aria-label="返回" @click="goBack">‹</button>
      <h1 class="mt">{{ approvalLabel }}</h1>
      <span v-if="!missing" class="header-status">
        {{ record.status }} <InspectionVoidStamp v-if="isInspectionVoidPending(record)" />
      </span>
    </header>

    <div v-if="missing" class="empty-tip">未找到该整改单，请返回列表重试。</div>

    <template v-else>
      <MobileRectifyBasicInfo :record="record" />

      <div class="sc">
        <div class="sct">隐患信息</div>
        <div class="ic">
          <div class="ir"><span class="il">隐患类别</span><span>{{ record.hazardCategory || '--' }}</span></div>
          <div class="ir"><span class="il">隐患等级</span><span>{{ record.hazardLevel || '--' }}</span></div>
          <div class="ir"><span class="il">整改要求</span><span style="white-space:pre-wrap">{{ record.rectifyRequirement || '--' }}</span></div>
          <div class="ir"><span class="il">隐患说明</span><span>{{ record.hazard || '--' }}</span></div>
          <div class="ir">
            <span class="il">隐患照片</span>
            <div class="ir-val">
              <InspectionPhotoList v-if="record.hazardPhotos?.length" :photos="record.hazardPhotos" name-prefix="隐患照片" />
              <span v-else>--</span>
            </div>
          </div>
        </div>
      </div>

      <div class="sc">
        <div class="sct">整改信息</div>
        <div v-if="rectificationRounds.length" class="ic">
          <div v-for="(r, i) in rectificationRounds" :key="i">
            <div class="ir"><span class="il">整改日期</span><span>{{ r.date }}</span></div>
            <div class="ir">
              <span class="il">整改照片</span>
              <div class="ir-val">
                <InspectionPhotoList v-if="r.photos.length" :photos="r.photos" name-prefix="整改照片" />
                <span v-else>--</span>
              </div>
            </div>
            <div class="ir"><span class="il">整改说明</span><span>{{ r.note }}</span></div>
          </div>
        </div>
        <div v-else class="ic"><div class="ir"><span class="il">整改情况</span><span>施工单位尚未提交整改</span></div></div>
      </div>

      <div v-if="reviewRounds.length" class="sc">
        <div class="sct">监理复核记录</div>
        <div v-for="(r, i) in reviewRounds" :key="i" class="ic">
          <div class="ir"><span class="il">复核人</span><span>{{ r.reviewer }}</span></div>
          <div class="ir"><span class="il">复核日期</span><span>{{ r.date }}</span></div>
          <div class="ir"><span class="il">复核结果</span><span :class="r.result === '通过' ? 'pass' : 'fail'">{{ r.result }}</span></div>
          <div class="ir"><span class="il">复核意见</span><span>{{ r.comment }}</span></div>
        </div>
      </div>

      <div v-if="managerConfirm && expectedStage !== 'approval'" class="sc">
        <div class="sct">{{ managerConfirm.label }}</div>
        <div class="ic">
          <div class="ir"><span class="il">确认人</span><span>{{ managerConfirm.person }}</span></div>
          <div class="ir"><span class="il">确认结果</span><span :class="managerConfirm.passed ? 'pass' : 'pending'">{{ managerConfirm.result }}</span></div>
          <div class="ir"><span class="il">确认日期</span><span>{{ managerConfirm.date || '--' }}</span></div>
          <div class="ir"><span class="il">确认意见</span><span>{{ managerConfirm.comment }}</span></div>
        </div>
      </div>

      <!-- 当前正在办理的这个节点自己还没有结论，不展示“待确认/--”的空块 -->
      <div v-if="departmentConfirm && expectedStage !== 'departmentConfirmation'" class="sc">
        <div class="sct">项目部长确认</div>
        <div class="ic">
          <div class="ir"><span class="il">确认人</span><span>{{ departmentConfirm.person }}</span></div>
          <div class="ir"><span class="il">确认结果</span><span :class="departmentConfirm.result === '通过' ? 'pass' : 'pending'">{{ departmentConfirm.result }}</span></div>
          <div class="ir"><span class="il">确认日期</span><span>{{ departmentConfirm.date || '--' }}</span></div>
          <div class="ir"><span class="il">确认意见</span><span>{{ departmentConfirm.comment || '--' }}</span></div>
        </div>
      </div>

      <div v-if="isVoidApproval && record.voidRequest" class="sc">
        <div class="sct">作废申请</div>
        <div class="ic">
          <div class="ir"><span class="il">申请人</span><span>{{ record.voidRequest.applicant || '--' }}</span></div>
          <div class="ir"><span class="il">申请时间</span><span>{{ record.voidRequest.requestedAt || '--' }}</span></div>
          <div class="ir"><span class="il">作废理由</span><span style="white-space:pre-wrap">{{ record.voidRequest.reason || '--' }}</span></div>
        </div>
      </div>

      <div v-if="canHandle" class="sc">
        <div class="sct">{{ formMeta.title }}</div>
        <div class="fr">
          <span class="fl-label">{{ formMeta.dateLabel }} <i class="req">*</i></span>
          <input v-model="processDate" type="date" class="fi-input" />
        </div>
        <div class="fr">
          <span class="fl-label">{{ formMeta.commentLabel }} <i v-if="commentRequired" class="req">*</i></span>
          <textarea v-model="processComment" class="fta" rows="3" :placeholder="formMeta.placeholder" />
        </div>
        <div class="ra">
          <button class="ab reject" :disabled="!canHandle" @click="handleApproval(false)">❌ 不通过</button>
          <button class="ab pass" :disabled="!canHandle" @click="handleApproval(true)">✅ 通过</button>
        </div>
      </div>

      <div class="sc">
        <div class="sct colps" @click="flowCollapsed = !flowCollapsed">
          <span>流程记录</span>
          <span class="ca">{{ flowCollapsed ? '展开 ▸' : '收起 ▾' }}</span>
        </div>
        <div v-show="!flowCollapsed" class="fl">
          <div v-for="(f, i) in flowRecords" :key="i" class="fi" :class="{ cur: f.current }">
            <div class="fd" :class="{ cur: f.current }"></div>
            <div class="fc">
              <div class="fc-row">
                <span class="fa">{{ f.action }}</span>
                <span class="fd2">{{ f.date || '待处理' }}</span>
              </div>
              <span class="fd2">处理人：{{ f.by || '--' }}</span>
              <span v-if="f.detail" class="fdl">{{ f.detail }}</span>
            </div>
          </div>
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
.header-status { color:#ffd875; font-size:12px; font-weight:600; }
.empty-tip { margin:40px 16px; padding:24px; text-align:center; color:#999; background:#fff; border-radius:10px; }

.sc { background:#fff; border-radius:10px; padding:14px 16px; margin:12px 16px; box-shadow:0 1px 3px rgba(0,0,0,0.04); }
.sct { font-size:13px; font-weight:600; color:#1f2329; margin-bottom:10px; padding-left:8px; border-left:3px solid #8f0045; }
.sct.colps { cursor:pointer; display:flex; align-items:center; justify-content:space-between; }
.ca { font-size:12px; color:#999; font-weight:400; }

.ic { background:#fafafa; border-radius:8px; padding:12px; }
.ir { display:flex; gap:6px; font-size:13px; line-height:1.6; margin-bottom:4px; }
.il { color:#999; flex-shrink:0; width:68px; }
.ir > span:last-child { flex:1; min-width:0; overflow-wrap:anywhere; }
.ir-val { flex:1; min-width:0; }
.pass { color:#34a853; font-weight:600; }
.fail { color:#e53935; font-weight:600; }
.pending { color:#a75c00; font-weight:600; }

.fr { display:flex; gap:8px; margin-bottom:10px; align-items:flex-start; }
.fl-label { font-size:13px; color:#666; flex-shrink:0; width:72px; padding-top:4px; }
.req { color:#e53935; font-style:normal; margin-left:2px; }
.fi-input { flex:1; min-width:0; box-sizing:border-box; padding:8px 10px; border:1px solid #ddd; border-radius:8px; font-size:13px; background:#fff; }
.fta { flex:1; min-width:0; width:100%; padding:10px 12px; border:1px solid #ddd; border-radius:8px; font-size:13px; font-family:inherit; resize:none; background:#fff; box-sizing:border-box; }
.ra { display:flex; gap:10px; margin-top:10px; }
.ab { flex:1; padding:14px; border-radius:10px; font-size:15px; font-weight:600; cursor:pointer; text-align:center; border:1.5px solid; }
.ab.pass { background:#e8f5e9; color:#34a853; border-color:#34a853; }
.ab.reject { background:#ffebee; color:#e53935; border-color:#e53935; }
.ab:disabled { opacity:.55; cursor:not-allowed; }

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
