<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getMobileRectification } from '../../composables/useMobileRectification'

const route = useRoute()
const router = useRouter()
const workflowRecord = getMobileRectification(route.params.id)
onMounted(() => document.querySelector('.page-viewport')?.scrollTo({ top:0 }))

// 是否包含退回后重新整改记录
const isRetry = route.params.id === 'rec-011'

// ===== 单据信息 =====
const rectInfoMap = {
  'rec-004': { rectifyNo:'ZG202607004', taskNo:'ZLXJ20260728005', inspectionCategory:'质量', project:'飞行区跑道延长工程', rectifier:'王工（项目安全员）', reviewer:'陈工（监理工程师）', closeDate:'2026-07-25' },
  'rec-011': { rectifyNo:'ZG202607011', taskNo:'AQXJ20260721003', inspectionCategory:'安全', project:'T3航站楼扩建工程', rectifier:'刘工（专职安全员）', reviewer:'陈工（监理工程师）', closeDate:'2026-07-30' },
}
const rectInfo = workflowRecord || rectInfoMap[route.params.id] || rectInfoMap['rec-004']
const statusText = computed(() => rectInfo.status || '已关闭')
const managerApproval = computed(() => {
  if (!rectInfo.manager || !['已复查', '已关闭'].includes(statusText.value)) return null
  const closed = statusText.value === '已关闭'
  return {
    manager: rectInfo.manager,
    status: closed ? '通过' : '审批中',
    date: closed ? (rectInfo.approvalDate || rectInfo.closeDate) : '',
    comment: closed ? (rectInfo.approvalComment || '同意关闭') : '—',
  }
})

// ===== 流程记录 =====
const closedFlowRecords = isRetry ? [
  { action:'下发整改单',                date:'2026-07-20 09:00' },
  { action:'复查不通过，退回继续整改',  date:'2026-07-26 10:00', detail:'整改不彻底，需重新处理' },
  { action:'整改人重新提交整改结果',    date:'2026-07-28 16:20' },
  { action:'复查通过，提交项目经理审批',date:'2026-07-30 10:30' },
  { action:'项目经理审批通过，整改单关闭',date:'2026-07-30 11:00' },
] : [
  { action:'下发整改单',                date:'2026-07-18 09:00' },
  { action:'整改人提交整改结果',        date:'2026-07-22 14:30' },
  { action:'复查通过，提交项目经理审批',date:'2026-07-25 15:30' },
  { action:'项目经理审批通过，整改单关闭',date:'2026-07-25 16:00' },
]

const flowRecords = computed(() => {
  if (!workflowRecord || workflowRecord.status === '已关闭') return closedFlowRecords
  const items = [{ action:'下发整改单', date:workflowRecord.applyDate }]
  if (workflowRecord.status === '待整改') {
    items.push({ action:workflowRecord.currentNode, date:'', current:true })
  } else {
    items.push({ action:'整改人提交整改结果', date:workflowRecord.submitDate || workflowRecord.applyDate })
    if (workflowRecord.status === '待复查') items.push({ action:workflowRecord.currentNode, date:'', current:true })
    if (workflowRecord.status === '已复查') {
      items.push({ action:'复查通过，提交项目经理审批', date:workflowRecord.applyDate })
      items.push({ action:'待项目经理审批', date:'', current:true })
    }
  }
  return items
})

const flowCollapsed = ref(false)

// ===== 复查记录 =====
const fallbackReviewRecords = isRetry ? [
  { round:1, date:'2026-07-30', comment:'整改到位，同意关闭', result:'通过' },
] : [
  { round:1, date:'2026-07-25', comment:'整改合格，同意关闭',      result:'通过' },
]
const reviewRecords = computed(() => {
  if (workflowRecord?.reviewDate || workflowRecord?.reviewComment) {
    return [{
      round: 1,
      date: workflowRecord.reviewDate || workflowRecord.submitDate || '—',
      comment: workflowRecord.reviewComment || '—',
      result: workflowRecord.reviewResult || '通过',
    }]
  }
  return fallbackReviewRecords
})

// ===== 隐患整改明细（统一格式，无检查项/分类） =====

const onceItems = [
  { desc:'电缆破损，存在安全隐患', inspPhotos:['📷 隐患照片1','📷 隐患照片2'],
    rectifications: [{ round:1, date:'2026-07-22', photos:['📷 整改照片1','📷 整改照片2'], note:'已更换破损电缆' }] },
]

const retryItems = [
  { desc:'消防器材过期未更换', inspPhotos:['📷 隐患照片1','📷 隐患照片2'],
    rectifications: [
      { round:2, date:'2026-07-28', photos:['📷 整改照片1','📷 整改照片2'], note:'已全部更换并设置检查记录卡' },
    ] },
]

// ===== 当前隐患数据（统一取第一条） =====
const currentHazard = isRetry ? retryItems[0] : onceItems[0]
if (workflowRecord?.hazard) {
  currentHazard.desc = workflowRecord.hazard
  currentHazard.inspPhotos = workflowRecord.hazardPhotos || currentHazard.inspPhotos
  if (workflowRecord.rectificationDate || workflowRecord.submitDate) {
    currentHazard.rectifications = [{
      round: 1,
      date: workflowRecord.rectificationDate || workflowRecord.submitDate,
      photos: workflowRecord.rectificationPhotos || ['整改现场照片.jpg'],
      note: workflowRecord.rectificationNote || '已完成整改并提交复查。',
    }]
  }
}

// 详情只保留最新一轮整改结果；多轮失败说明统一在流程记录中查看。
const currentRectifications = computed(() => {
  const rows = currentHazard.rectifications || []
  return rows.length ? [rows[rows.length - 1]] : []
})

function goBack() { const tab = route.query.tab; router.push(tab ? `/mobile/rectify?tab=${tab}` : '/mobile/rectify') }
</script>

<template>
  <div class="mp">
    <header class="mh">
      <button class="mb" @click="goBack">‹</button>
      <h1 class="mt">整改详情</h1>
      <span class="header-status" :class="{ closed:statusText === '已关闭' }">{{ statusText === '已关闭' ? '✅ 已关闭' : statusText }}</span>
    </header>

    <!-- 基本信息 -->
    <div class="section">
      <div class="section-title">基本信息</div>
      <div class="ir"><span class="il">整改单编号</span><span>{{ rectInfo.rectifyNo }}</span></div>
      <div class="ir"><span class="il">巡检任务单编号</span><span>{{ rectInfo.taskNo }}</span></div>
      <div class="ir"><span class="il">项目名称</span><span>{{ rectInfo.project }}</span></div>
      <div class="ir"><span class="il">巡检分类</span><span>{{ rectInfo.inspectionCategory }}</span></div>
      <div class="ir"><span class="il">整改人</span><span>{{ rectInfo.rectifier }}</span></div>
      <div class="ir"><span class="il">复查人</span><span>{{ rectInfo.reviewer }}</span></div>
      <div class="ir"><span class="il">截止日期</span><span>{{ rectInfo.deadline || '—' }}</span></div>
      <div class="ir"><span class="il">状态</span><span class="status-value" :class="{ closed:statusText === '已关闭', reviewed:statusText === '已复查' }">{{ statusText }}</span></div>
      <div v-if="rectInfo.closeDate" class="ir"><span class="il">关闭日期</span><span>{{ rectInfo.closeDate }}</span></div>
    </div>

    <!-- 隐患信息 -->
    <div class="section">
      <div class="section-title">隐患信息</div>
      <div class="ir"><span class="il">隐患说明</span><span>{{ currentHazard.desc }}</span></div>
      <div v-if="currentHazard.inspPhotos?.length" class="ir"><span class="il">隐患照片</span><span>{{ currentHazard.inspPhotos.join('、') }}</span></div>
    </div>

    <!-- 整改信息 -->
    <div v-if="['待复查', '已复查', '已关闭'].includes(statusText)" class="section">
      <div class="section-title">整改信息</div>
      <div
        v-for="rct in currentRectifications"
        :key="rct.date"
        class="hc-round"
      >
        <div class="hc-round-title">
          整改
        </div>
        <div class="hc-row"><span class="il">日期</span><span>{{ rct.date }}</span></div>
        <div class="hc-row"><span class="il">照片</span><span>{{ rct.photos.join('、') }}</span></div>
        <div class="hc-row"><span class="il">说明</span><span>{{ rct.note }}</span></div>
      </div>
    </div>

    <!-- 复查信息 -->
    <div v-if="['已复查', '已关闭'].includes(statusText)" class="section">
      <div class="section-title">复查信息</div>
      <div v-for="rv in reviewRecords" :key="rv.date" class="review-record" :class="{ pass: rv.result === '通过' }">
        <div class="rr-top">
          <span class="rr-round">复查</span>
          <span class="rr-date">{{ rv.date }}</span>
          <span class="rr-result" :class="{ pass: rv.result === '通过' }">
            {{ rv.result === '通过' ? '✅ 通过' : '❌ 不通过' }}
          </span>
        </div>
        <div class="rr-comment">{{ rv.comment }}</div>
      </div>
    </div>

    <!-- 项目经理审批 -->
    <div v-if="managerApproval" class="section">
      <div class="section-title">项目经理审批</div>
      <div class="ir"><span class="il">审批人</span><span>{{ managerApproval.manager }}</span></div>
      <div class="ir"><span class="il">审批状态</span><span class="status-value" :class="{ closed:managerApproval.status === '通过' }">{{ managerApproval.status }}</span></div>
      <div v-if="managerApproval.date" class="ir"><span class="il">审批日期</span><span>{{ managerApproval.date }}</span></div>
      <div class="ir"><span class="il">审批意见</span><span>{{ managerApproval.comment }}</span></div>
    </div>

    <!-- 流程记录（与 WEB 端一致放在详情最下方） -->
    <div class="section">
      <div class="section-title collapsible" @click="flowCollapsed = !flowCollapsed">
        <span>流程记录</span>
        <span class="collapse-arrow">{{ flowCollapsed ? '展开 ▸' : '收起 ▾' }}</span>
      </div>
      <div v-show="!flowCollapsed" class="flow-list">
        <div
          v-for="(f,i) in flowRecords"
          :key="i"
          class="flow-item"
          :class="{ reject: f.action.includes('不通过'), done: f.action.includes('关闭'), current:f.current }"
        >
          <div class="flow-dot" :class="{ reject: f.action.includes('不通过') }"></div>
          <div class="flow-content">
            <div class="fc-row">
              <span class="flow-action">{{ f.action }}</span>
              <span class="flow-date">{{ f.date }}</span>
            </div>
            <span v-if="f.detail" class="flow-detail">{{ f.detail }}</span>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<style scoped>
.mp { width:100%; max-width:402px; margin:0 auto; min-height:100vh; background:#f5f5f5; font-family:'PingFang SC',-apple-system,sans-serif; padding-bottom:env(safe-area-inset-bottom,0); }
.mh { display:flex; align-items:center; padding:12px 16px; background:#8f0045; color:#fff; position:sticky; top:0; z-index:10; }
.mb { background:none; border:none; color:#fff; font-size:28px; padding:0 4px 0 0; line-height:1; cursor:pointer; }
.mt { flex:1; font-size:18px; font-weight:600; margin:0; }
.header-status { font-size:12px; color:#ffd166; font-weight:600; }
.header-status.closed { color:#d8f5df; }
.info-bar { background:#fff; padding:14px 16px; border-bottom:1px solid #eee; }
.info-title { font-size:15px; font-weight:600; color:#1f2329; margin-bottom:4px; }
.info-meta { font-size:12px; color:#999; }
.scenario-tag { display:inline-block; font-size:10px; color:#8f0045; background:#fceef4; padding:1px 6px; border-radius:3px; margin-right:6px; font-weight:500; }

.section { background:#fff; border-radius:10px; padding:14px 16px 6px; margin:12px 16px; box-shadow:0 1px 3px rgba(0,0,0,0.04); }
.section-title { font-size:14px; font-weight:600; color:#1f2329; margin-bottom:10px; padding-left:10px; border-left:3px solid #8f0045; }
.section-title.collapsible { cursor:pointer; display:flex; align-items:center; justify-content:space-between; }
.section-title.collapsible:hover { opacity:0.7; }
.collapse-arrow { font-size:12px; color:#999; font-weight:400; }

/* 流程记录 */
.flow-list { padding-left:6px; }
.flow-item { display:flex; gap:10px; padding-bottom:16px; position:relative; }
.flow-item::before { content:''; position:absolute; left:7px; top:16px; bottom:0; width:1px; background:#e0e0e0; }
.flow-item:last-child::before { display:none; }
.flow-dot { width:14px; height:14px; border-radius:50%; background:#4285f4; flex-shrink:0; margin-top:3px; }
.flow-dot.reject { background:#e53935; }
.flow-item.done .flow-dot { background:#34a853; }
.flow-content { display:flex; flex-direction:column; gap:4px; flex:1; }
.fc-row { display:flex; justify-content:space-between; align-items:baseline; width:100%; }
.flow-action { font-size:13px; color:#1f2329; font-weight:500; }
.flow-date { font-size:12px; color:#999; flex-shrink:0; }
.flow-detail { font-size:11px; color:#e53935; background:#ffebee; padding:2px 8px; border-radius:4px; display:inline-block; }

/* 复查记录 */
.review-record { background:#fafafa; border-radius:8px; padding:12px 14px; margin-bottom:8px; border-left:3px solid #e53935; }
.review-record.pass { border-left-color:#34a853; }
.rr-top { display:flex; align-items:center; gap:8px; margin-bottom:6px; flex-wrap:wrap; }
.rr-round { font-size:13px; font-weight:600; color:#1f2329; }
.rr-date { font-size:11px; color:#999; }
.rr-result { font-size:12px; font-weight:600; color:#e53935; }
.rr-result.pass { color:#34a853; }
.rr-comment { font-size:13px; color:#666; }

/* 隐患/整改卡片 */
.ir { display:flex; gap:6px; font-size:13px; line-height:1.6; margin-bottom:4px; }
.il { color:#999; flex-shrink:0; width:68px; }
.ir > span:last-child { flex:1; min-width:0; word-break:break-word; }
.status-value { color:#f5a623; font-weight:600; }
.status-value.reviewed { color:#8f0045; }
.status-value.closed { color:#34a853; }
.hc-round { margin-bottom:8px; padding:8px 10px; background:#fafafa; border-radius:6px; }
.hc-round.hc-round-fail { border-left:3px solid #e53935; }
.hc-round.hc-round-pass { border-left:3px solid #34a853; }
.hc-round-title { font-size:12px; font-weight:600; color:#4285f4; margin-bottom:4px; }
.hc-row { display:flex; gap:6px; font-size:13px; line-height:1.6; margin-bottom:4px; }
.hc-row .il { color:#999; flex-shrink:0; width:36px; }

/* 脚注 */
.scenario-footer { text-align:center; padding:20px 16px 30px; font-size:11px; color:#ccc; }
</style>
