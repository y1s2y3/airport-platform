<script setup>
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route = useRoute()

// 6条记录：待整改1 + 待整改(被退回)1 + 待复查2 + 已关闭2
const rectifyList = ref([
  { id:'rec-001', rectifyNo:'ZG202607001', taskNo:'XJ20260728001', project:'飞行区跑道延长工程', rectifier:'赵工', reviewer:'张工', deadline:'2026-07-30', status:'待整改', overdue:false, isRejected:false },
  { id:'rec-006', rectifyNo:'ZG202607006', taskNo:'XJ20260721003', project:'T3航站楼扩建工程', rectifier:'王工', reviewer:'张工', deadline:'2026-07-22', status:'待整改', overdue:true, isRejected:true, submitDate:'2026-07-20', rejectReason:'整改不彻底，电缆接头处仍有裸露' },
  { id:'rec-002', rectifyNo:'ZG202607002', taskNo:'XJ20260728001', project:'飞行区跑道延长工程', rectifier:'李工', reviewer:'张工', deadline:'2026-07-28', status:'待复查', overdue:false, submitDate:'2026-07-25', isSecondRound:false },
  { id:'rec-003', rectifyNo:'ZG202607003', taskNo:'XJ20260721003', project:'T3航站楼扩建工程', rectifier:'王工', reviewer:'张工', deadline:'2026-07-28', status:'待复查', overdue:false, submitDate:'2026-07-27', isSecondRound:true },
  { id:'rec-004', rectifyNo:'ZG202607004', taskNo:'XJ20260728005', project:'飞行区跑道延长工程', rectifier:'赵工', reviewer:'李工', deadline:'2026-07-20', status:'已关闭', overdue:false, closeDate:'2026-07-25' },
  { id:'rec-011', rectifyNo:'ZG202607011', taskNo:'XJ20260721003', project:'T3航站楼扩建工程', rectifier:'王工', reviewer:'张工', deadline:'2026-07-25', status:'已关闭', overdue:false, closeDate:'2026-07-30' },
])

const activeTab = ref('全部')
if (route.query.tab) activeTab.value = route.query.tab

const searchKeyword = ref('')
const tabs = computed(() => {
  const counts = { '全部': rectifyList.value.length }
  for (const t of rectifyList.value) {
    const label = t.isRejected ? '待整改' : t.status
    counts[label] = (counts[label] || 0) + 1
  }
  return ['全部','待整改','待复查','已关闭'].filter(t => (counts[t]||0) > 0 || t === '全部').map(t => ({ label: t, count: counts[t]||0 }))
})

const filteredList = computed(() => {
  let list = rectifyList.value
  if (activeTab.value !== '全部') {
    if (activeTab.value === '待整改') list = list.filter(t => t.status === '待整改')
    else list = list.filter(t => t.status === activeTab.value)
  }
  if (searchKeyword.value.trim()) {
    const kw = searchKeyword.value.trim()
    list = list.filter(t => t.rectifyNo?.includes(kw) || t.taskNo?.includes(kw) || t.project?.includes(kw))
  }
  return list
})

const statusStyles = {
  '待整改': { color:'#f5a623', bg:'#fff8e6' },
  '待复查': { color:'#4285f4', bg:'#e8f0fe' },
  '已关闭': { color:'#34a853', bg:'#e8f5e9' },
}

function goExecute(id) { router.push(`/mobile/rectify/${id}/execute?tab=${activeTab.value}`) }
function goReview(id) { router.push(`/mobile/rectify/${id}/review?tab=${activeTab.value}`) }
function goDetail(id) { router.push(`/mobile/rectify/${id}?tab=${activeTab.value}`) }
function goBack() { router.push('/mobile/tasks') }
</script>

<template>
  <div class="mp">
    <header class="mh">
      <button class="mb" @click="goBack">‹</button>
      <h1 class="mt">整改复查</h1>
      <span style="font-size:12px;opacity:0.7">{{ rectifyList.length }} 单</span>
    </header>
    <div class="m-tabs">
      <button v-for="tab in tabs" :key="tab.label" class="m-tab" :class="{ active: activeTab === tab.label }" @click="activeTab = tab.label">
        {{ tab.label === '待整改' ? '待整改' : tab.label }}<span class="m-tab-count">{{ tab.count }}</span>
      </button>
    </div>
    <div class="m-filter">
      <input v-model="searchKeyword" class="m-search-input" placeholder="搜索整改单编号/巡检单编号..." />
    </div>
    <div class="m-list">
      <div v-for="item in filteredList" :key="item.id" class="rec-card"
        @click="item.status==='待整改'?goExecute(item.id):item.status==='待复查'?goReview(item.id):goDetail(item.id)">
        <div class="rec-top">
          <span class="rec-icon" :class="{ overdue: item.overdue }">⚠</span>
          <div class="rec-info">
            <div class="rec-name-row">
              <span class="rec-name">{{ item.rectifyNo }}</span>
              <span style="font-size:11px;color:#999">{{ item.taskNo }}</span>
              <span v-if="item.overdue&&item.status==='待整改'" class="rec-overdue">⚠ 已逾期</span>
            </div>
            <span class="rec-project">{{ item.project }}</span>
          </div>
          <span class="rec-status" :style="{ color: statusStyles[item.status]?.color, background: statusStyles[item.status]?.bg }">{{ item.status }}</span>
        </div>
        <div class="rec-mid">
          <span>整改人：{{ item.rectifier }}</span>
          <span v-if="item.reviewer">复查人：{{ item.reviewer }}</span>
        </div>
        <div v-if="item.isRejected&&item.rejectReason" class="rec-reject">❌ 退回原因：{{ item.rejectReason }}</div>
        <div class="rec-bottom">
          <span v-if="item.status==='待整改'">截止：{{ item.deadline }}</span>
          <span v-else-if="item.status==='待复查'">提交：{{ item.submitDate }}</span>
          <span v-else>已关闭：{{ item.closeDate }}</span>
        </div>
      </div>
      <div v-if="filteredList.length===0" class="m-empty">暂无数据</div>
    </div>
  </div>
</template>

<style scoped>
.mp { width:100%; max-width:402px; margin:0 auto; min-height:100vh; background:#f5f5f5; font-family:'PingFang SC',-apple-system,sans-serif; padding-bottom:env(safe-area-inset-bottom,0); }
.mh { display:flex; align-items:center; padding:12px 16px; background:#8f0045; color:#fff; position:sticky; top:0; z-index:10; }
.mb { background:none; border:none; color:#fff; font-size:28px; padding:0 4px 0 0; line-height:1; cursor:pointer; }
.mt { flex:1; font-size:18px; font-weight:600; margin:0; }
.m-tabs { display:flex; padding:10px 16px; background:#fff; overflow-x:auto; border-bottom:1px solid #eee; }
.m-tab { flex-shrink:0; display:flex; align-items:center; gap:4px; padding:6px 14px; border:none; background:none; font-size:13px; color:#666; cursor:pointer; border-radius:16px; white-space:nowrap; }
.m-tab.active { background:#fceef4; color:#8f0045; font-weight:600; }
.m-tab-count { font-size:11px; min-width:18px; height:18px; border-radius:9px; display:inline-flex; align-items:center; justify-content:center; background:#f0f0f0; padding:0 5px; }
.m-tab.active .m-tab-count { background:rgba(143,0,69,0.12); }
.m-filter { padding:8px 16px; background:#fff; border-bottom:1px solid #eee; }
.m-search-input { width:100%; padding:8px 12px; border:1px solid #ddd; border-radius:8px; font-size:13px; background:#fafafa; box-sizing:border-box; outline:none; }
.m-search-input:focus { border-color:#8f0045; background:#fff; }
.m-list { padding:12px 16px; display:flex; flex-direction:column; gap:10px; }
.rec-card { background:#fff; border-radius:12px; padding:14px 16px; cursor:pointer; box-shadow:0 1px 4px rgba(0,0,0,0.04); }
.rec-top { display:flex; align-items:flex-start; gap:10px; margin-bottom:6px; }
.rec-icon { font-size:18px; flex-shrink:0; }
.rec-icon.overdue { color:#e53935; }
.rec-info { flex:1; display:flex; flex-direction:column; gap:2px; }
.rec-name-row { display:flex; align-items:center; gap:6px; flex-wrap:wrap; }
.rec-name { font-size:15px; font-weight:600; color:#1f2329; }
.rec-overdue { font-size:10px; color:#e53935; background:#ffebee; padding:1px 6px; border-radius:3px; }
.rec-project { font-size:12px; color:#999; }
.rec-status { flex-shrink:0; font-size:11px; padding:2px 8px; border-radius:4px; font-weight:500; }

.rec-mid { display:flex; gap:12px; font-size:12px; color:#999; margin-bottom:6px; flex-wrap:wrap; }
.rec-reject { font-size:12px; color:#e53935; background:#ffebee; padding:6px 8px; border-radius:6px; margin-bottom:6px; }
.rec-bottom { font-size:12px; color:#999; }
.m-empty { text-align:center; padding:40px 0; color:#999; font-size:14px; }
</style>
