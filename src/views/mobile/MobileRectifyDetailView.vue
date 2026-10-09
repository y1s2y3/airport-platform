<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getMobileRectification } from '../../composables/useMobileRectification'
import { formatInspectionCategories } from '../../config/inspectionManagement'

const route = useRoute()
const router = useRouter()
const record = computed(() => getMobileRectification(route.params.id))
const missing = computed(() => !record.value)
const inspectionCategoryLabel = computed(() =>
  formatInspectionCategories(record.value?.inspectionCategories || record.value?.inspectionCategory),
)
onMounted(() => document.querySelector('.page-viewport')?.scrollTo({ top: 0 }))

const statusText = computed(() => record.value?.status || '--')
const managerApproval = computed(() => {
  const row = record.value
  if (!row?.manager || !['已复查', '已关闭'].includes(row.status)) return null
  const closed = row.status === '已关闭'
  return {
    manager: row.manager,
    status: closed ? '通过' : '审批中',
    date: closed ? (row.approvalDate || row.closeDate || '') : '',
    comment: closed ? (row.approvalComment || '--') : '--',
  }
})

const flowRecords = computed(() => {
  const row = record.value
  if (!row) return []
  if (row.status === '已关闭') {
    const items = [
      { action: '下发整改单', date: row.applyDate || '--' },
      { action: '整改人提交整改结果', date: row.rectificationDate || row.submitDate || '--' },
    ]
    if (row.isSecondRound || row.isRejected) {
      items.push({
        action: '复查不通过，退回继续整改',
        date: '--',
        detail: row.rejectReason || '整改不彻底',
      })
      items.push({ action: '整改人重新提交整改结果', date: row.rectificationDate || '--' })
    }
    items.push({ action: '复查通过，提交项目经理审批', date: row.reviewDate || '--' })
    items.push({ action: '项目经理审批通过，整改单关闭', date: row.closeDate || row.approvalDate || '--' })
    return items
  }
  const items = [{ action: '下发整改单', date: row.applyDate || '--' }]
  if (row.status === '待整改') {
    if (row.isRejected) {
      items.push({
        action: '整改人提交整改结果',
        date: row.rectificationDate || row.submitDate || '--',
      })
      items.push({
        action: '复查不通过，退回继续整改',
        date: row.reviewDate || '--',
        detail: row.rejectReason || row.reviewComment,
      })
    }
    items.push({ action: row.currentNode || '等待整改人执行', date: '', current: true })
  } else {
    items.push({
      action: '整改人提交整改结果',
      date: row.rectificationDate || row.submitDate || row.applyDate || '--',
    })
    if (row.status === '待复查') {
      if (row.approvalRejected) {
        items.push({
          action: '复查人复查通过，提交项目经理审批',
          date: row.reviewDate || '--',
        })
        items.push({
          action: '项目经理审批不通过，退回复查',
          date: row.approvalDate || '--',
          detail: row.approvalReason,
        })
      }
      items.push({ action: row.currentNode || '待复查人审核', date: '', current: true })
    }
    if (row.status === '已复查') {
      items.push({ action: '复查通过，提交项目经理审批', date: row.reviewDate || row.applyDate || '--' })
      items.push({ action: '待项目经理审批', date: '', current: true })
    }
  }
  return items
})

const flowCollapsed = ref(false)

const reviewRecords = computed(() => {
  const row = record.value
  if (!row) return []
  if (!(row.reviewDate || row.reviewComment || ['已复查', '已关闭'].includes(row.status))) return []
  return [{
    round: 1,
    date: row.reviewDate || '--',
    comment: row.reviewComment || '--',
    result: row.reviewResult || (row.isRejected ? '不通过' : '通过'),
  }]
})

const currentRectifications = computed(() => {
  const row = record.value
  if (!row) return []
  if (!(row.rectificationDate || row.rectificationNote || row.rectificationPhotos?.length || row.submitDate)) {
    return []
  }
  return [{
    round: 1,
    date: row.rectificationDate || row.submitDate || '--',
    photos: row.rectificationPhotos?.length ? [...row.rectificationPhotos] : [],
    note: row.rectificationNote || '--',
  }]
})

function displayPhotos(list) {
  if (!list?.length) return '--'
  return list.join('、')
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
      <h1 class="mt">整改详情</h1>
    </header>

    <div v-if="missing" class="empty-tip">未找到该整改单，请返回列表重试。</div>

    <template v-else>
      <div class="ib">
        <div class="ibn">{{ record.rectifyNo }}</div>
        <div class="ibm">巡检任务单编号：{{ record.taskNo || '--' }}</div>
        <div class="ibm">巡检分类：{{ inspectionCategoryLabel || '--' }}</div>
        <div class="ibm">{{ record.project || '--' }}</div>
        <div class="ibm">整改人：{{ record.rectifier || '--' }}　复查人：{{ record.reviewer || '--' }}</div>
        <div class="ibm">状态：<b :class="'st-' + statusText">{{ statusText }}</b>
          <template v-if="record.closeDate">　关闭日期：{{ record.closeDate }}</template>
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
                <span class="fd2">{{ f.date || '进行中' }}</span>
              </div>
              <span v-if="f.detail" class="fdl">{{ f.detail }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="sc">
        <div class="sct">隐患信息</div>
        <div class="ir"><span class="il">隐患说明</span><span>{{ record.hazard || '--' }}</span></div>
        <div class="ir"><span class="il">隐患照片</span><span>{{ displayPhotos(record.hazardPhotos) }}</span></div>
      </div>

      <div v-if="currentRectifications.length" class="sc">
        <div class="sct">整改信息</div>
        <div v-for="(r, i) in currentRectifications" :key="i" class="ic">
          <div class="ir"><span class="il">整改日期</span><span>{{ r.date }}</span></div>
          <div class="ir"><span class="il">整改照片</span><span>{{ displayPhotos(r.photos) }}</span></div>
          <div class="ir"><span class="il">整改说明</span><span>{{ r.note }}</span></div>
        </div>
      </div>

      <div v-if="reviewRecords.length && ['已复查', '已关闭'].includes(statusText)" class="sc">
        <div class="sct">复查信息</div>
        <div v-for="(r, i) in reviewRecords" :key="i" class="ic">
          <div class="ir"><span class="il">复查日期</span><span>{{ r.date }}</span></div>
          <div class="ir"><span class="il">复查结果</span><span :class="r.result === '通过' ? 'pass' : 'fail'">{{ r.result }}</span></div>
          <div class="ir"><span class="il">复查意见</span><span>{{ r.comment }}</span></div>
        </div>
      </div>

      <div v-if="managerApproval" class="sc">
        <div class="sct">项目经理审批</div>
        <div class="ir"><span class="il">审批人</span><span>{{ managerApproval.manager }}</span></div>
        <div class="ir"><span class="il">审批状态</span><span :class="managerApproval.status === '通过' ? 'pass' : ''">{{ managerApproval.status }}</span></div>
        <div class="ir" v-if="managerApproval.date"><span class="il">审批日期</span><span>{{ managerApproval.date }}</span></div>
        <div class="ir"><span class="il">审批意见</span><span>{{ managerApproval.comment }}</span></div>
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
.ibm { font-size:12px; line-height:1.7; color:#666; }
.st-待整改,.st-待复查 { color:#f5a623; }
.st-已复查 { color:#8f0045; }
.st-已关闭 { color:#34a853; }
.sc { background:#fff; border-radius:10px; padding:14px 16px; margin:12px 16px; box-shadow:0 1px 3px rgba(0,0,0,0.04); }
.sct { font-size:13px; font-weight:600; color:#1f2329; margin-bottom:10px; padding-left:8px; border-left:3px solid #8f0045; }
.sct.colps { cursor:pointer; display:flex; align-items:center; justify-content:space-between; }
.ca { font-size:12px; color:#999; font-weight:400; }
.ic { background:#fafafa; border-radius:8px; padding:12px; }
.ir { display:flex; gap:6px; font-size:13px; line-height:1.6; margin-bottom:4px; }
.il { color:#999; flex-shrink:0; width:68px; }
.ir > span:last-child { flex:1; min-width:0; word-break:break-word; }
.pass { color:#34a853; font-weight:600; }
.fail { color:#e53935; font-weight:600; }
.fl { padding-left:6px; }
.fi { display:flex; gap:10px; padding-bottom:14px; position:relative; }
.fi::before { content:''; position:absolute; left:7px; top:15px; bottom:0; width:1px; background:#e0e0e0; }
.fi:last-child::before { display:none; }
.fd { width:14px; height:14px; border-radius:50%; background:#34a853; flex-shrink:0; margin-top:2px; }
.fd.cur { background:#8f0045; box-shadow:0 0 0 3px #fceef4; }
.fc { display:flex; flex-direction:column; gap:4px; flex:1; }
.fc-row { display:flex; justify-content:space-between; align-items:baseline; width:100%; }
.fa { font-size:13px; color:#1f2329; font-weight:500; }
.fd2 { font-size:12px; color:#999; flex-shrink:0; }
.fdl { font-size:11px; color:#e53935; background:#ffebee; padding:2px 8px; border-radius:4px; display:inline-block; }
.fi.cur .fa { color:#8f0045; font-weight:600; }
</style>
