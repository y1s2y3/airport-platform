<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { getMobileRectification, submitRectificationReview } from '../../composables/useMobileRectification'

const route = useRoute()
const router = useRouter()
const rid = route.params.id

const record = computed(() => getMobileRectification(rid))
const missing = computed(() => !record.value)

const flowCollapsed = ref(false)
const reviewComment = ref('')
const reviewDate = ref('')
onMounted(() => document.querySelector('.page-viewport')?.scrollTo({ top: 0 }))

const flowRecords = computed(() => {
  const row = record.value
  if (!row) return []
  if (row.isSecondRound) {
    return [
      { a: '下发整改单', d: row.applyDate || '--' },
      { a: '整改人提交整改结果', d: '--' },
      { a: '复查不通过，退回继续整改', d: '--', dt: row.rejectReason || '整改不彻底' },
      { a: '整改人重新提交整改结果', d: row.rectificationDate || row.submitDate || '--' },
      { a: '待复查人审核', d: '', cur: true },
    ]
  }
  if (row.approvalRejected) {
    return [
      { a: '下发整改单', d: '--' },
      { a: '整改人提交整改结果', d: row.rectificationDate || row.submitDate || '--' },
      { a: '复查人复查通过，提交项目经理审批', d: row.reviewDate || '--' },
      { a: '项目经理审批不通过，退回复查', d: row.approvalDate || '--', dt: row.approvalReason },
      { a: '复查人重新复查', d: '', cur: true },
    ]
  }
  return [
    { a: '下发整改单', d: row.applyDate || '--' },
    { a: '整改人提交整改结果', d: row.rectificationDate || row.submitDate || '--' },
    { a: '待复查人审核', d: '', cur: true },
  ]
})

function displayPhotos(list) {
  if (!list?.length) return '--'
  return list.join('、')
}

function handleReview(pass) {
  if (missing.value) {
    ElMessage.error('未找到整改单，无法复查')
    return
  }
  if (!reviewComment.value.trim()) {
    ElMessage.warning('请输入复查意见')
    return
  }
  if (!reviewDate.value) {
    ElMessage.warning('请选择复查日期')
    return
  }
  const ok = submitRectificationReview(rid, pass, {
    reviewDate: reviewDate.value,
    reviewComment: reviewComment.value.trim(),
  })
  if (!ok) {
    ElMessage.error('复查提交失败，未找到整改单')
    return
  }
  ElMessage.success(
    pass
      ? '复查通过，状态已更新为“已复查”，已流转至项目经理审批'
      : '复查不通过，已退回整改人重新整改',
  )
  const tab = route.query.tab
  router.push(tab ? `/mobile/rectify?tab=${tab}` : '/mobile/rectify')
}

function goBack() {
  const tab = route.query.tab
  router.push(tab ? `/mobile/rectify?tab=${tab}` : '/mobile/rectify')
}
</script>

<template>
  <div class="mp">
    <header class="mh">
      <button class="mb" @click="goBack">‹</button>
      <h1 class="mt">整改复查</h1>
    </header>

    <div v-if="missing" class="empty-tip">未找到该整改单，请返回列表重试。</div>

    <template v-else>
      <div class="ib">
        <div class="ibn"><span class="ibn-label">整改单编号：</span>{{ record.rectifyNo }}</div>
        <div class="ibm"><span class="ibm-label">巡检任务单编号：</span><span class="ibm-value">{{ record.taskNo || '--' }}</span></div>
        <div class="ibm"><span class="ibm-label">巡检分类：</span><span class="ibm-value">{{ record.inspectionCategory || '--' }}</span></div>
        <div class="ibm"><span class="ibm-label">项目名称：</span><span class="ibm-value">{{ record.project || '--' }}</span></div>
        <div class="ibm"><span class="ibm-label">整改人：</span><span class="ibm-value">{{ record.rectifier || '--' }}</span></div>
        <div class="ibm"><span class="ibm-label">复查人：</span><span class="ibm-value">{{ record.reviewer || '--' }}</span></div>
      </div>

      <div v-if="record.approvalRejected" class="approval-reject-tip">
        <strong>项目经理审批不通过</strong>
        <span>{{ record.approvalReason || '--' }}</span>
        <small>请复查人重新核验并提交审批</small>
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
              <span v-if="f.dt" class="fdl">{{ f.dt }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="sc">
        <div class="sct">整改结果</div>
        <div class="ic">
          <div class="ir"><span class="il">隐患说明</span><span>{{ record.hazard || '--' }}</span></div>
          <div class="ir"><span class="il">隐患照片</span><span>{{ displayPhotos(record.hazardPhotos) }}</span></div>
          <div class="dv"></div>
          <div class="ir"><span class="il">整改日期</span><span>{{ record.rectificationDate || record.submitDate || '--' }}</span></div>
          <div class="ir"><span class="il">整改照片</span><span>{{ displayPhotos(record.rectificationPhotos) }}</span></div>
          <div class="ir"><span class="il">整改说明</span><span>{{ record.rectificationNote || '--' }}</span></div>
        </div>
      </div>

      <div class="sc review">
        <div class="sct">复查意见</div>
        <div class="fr"><span class="fl-label">复查日期 <i class="req">*</i></span><input type="date" v-model="reviewDate" class="fi-input" /></div>
        <div class="fr">
          <span class="fl-label">复查意见 <i class="req">*</i></span>
          <textarea v-model="reviewComment" class="fta" placeholder="请输入复查意见..." rows="3"></textarea>
        </div>
        <div class="ra">
          <button class="ab reject" @click="handleReview(false)">❌ 不通过</button>
          <button class="ab pass" @click="handleReview(true)">✅ 通过</button>
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
.fdl { font-size:11px; color:#e53935; background:#ffebee; padding:2px 8px; border-radius:4px; display:inline-block; }
.fi.cur .fa { color:#8f0045; }
.fi.cur .fd2 { color:#f5a623; }
</style>
