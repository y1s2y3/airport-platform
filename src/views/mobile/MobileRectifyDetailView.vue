<script setup>
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

// ===== 两种场景判定 =====
// rec-004 : 一次整改闭环
// rec-011 : 二次整改闭环
const isRetry = route.params.id === 'rec-011'

const scenarioLabel = isRetry ? '二次整改闭环' : '一次整改闭环'

// ===== 单据信息 =====
const rectInfoMap = {
  'rec-004': { rectifyNo:'ZG202607004', taskNo:'XJ20260728005', project:'飞行区跑道延长工程', rectifier:'赵工', reviewer:'李工', closeDate:'2026-07-25' },
  'rec-011': { rectifyNo:'ZG202607011', taskNo:'XJ20260721003', project:'T3航站楼扩建工程', rectifier:'王工', reviewer:'张工', closeDate:'2026-07-30' },
}
const rectInfo = rectInfoMap[route.params.id] || rectInfoMap['rec-004']

// ===== 流程记录 =====
const flowRecords = isRetry ? [
  { action:'下发整改单',                date:'2026-07-20 09:00' },
  { action:'整改人提交整改结果',        date:'2026-07-24 15:30' },
  { action:'复查不通过，退回继续整改',  date:'2026-07-26 10:00', detail:'整改不彻底，需重新处理' },
  { action:'整改人重新提交整改结果',    date:'2026-07-28 16:20' },
  { action:'复查通过，整改单关闭',      date:'2026-07-30 11:00' },
] : [
  { action:'下发整改单',                date:'2026-07-18 09:00' },
  { action:'整改人提交整改结果',        date:'2026-07-22 14:30' },
  { action:'复查通过，整改单关闭',      date:'2026-07-25 16:00' },
]

const flowCollapsed = ref(false)

// ===== 复查记录 =====
const reviewRecords = isRetry ? [
  { round:1, date:'2026-07-26', comment:'整改不彻底，需重新处理', result:'不通过' },
  { round:2, date:'2026-07-30', comment:'整改到位，同意关闭',      result:'通过' },
] : [
  { round:1, date:'2026-07-25', comment:'整改合格，同意关闭',      result:'通过' },
]

// ===== 隐患整改明细（统一格式，无检查项/分类） =====

// --- 一次整改闭环 ---
const onceItems = [
  { desc:'电缆破损，存在安全隐患', inspPhotos:['📷 隐患照片1','📷 隐患照片2'],
    rectifications: [{ round:1, date:'2026-07-22', photos:['📷 整改照片1','📷 整改照片2'], note:'已更换破损电缆' }] },
]

// --- 二次整改闭环 ---
const retryItems = [
  { desc:'消防器材过期未更换', inspPhotos:['📷 隐患照片1','📷 隐患照片2'],
    rectifications: [
      { round:1, date:'2026-07-24', photos:['📷 整改照片1'], note:'已购买新灭火器' },
      { round:2, date:'2026-07-28', photos:['📷 整改照片1','📷 整改照片2'], note:'已全部更换并设置检查记录卡' },
    ] },
]

// ===== 当前隐患数据（统一取第一条） =====
const currentHazard = isRetry ? retryItems[0] : onceItems[0]

function goBack() { const tab = route.query.tab; router.push(tab ? `/mobile/rectify?tab=${tab}` : '/mobile/rectify') }
</script>

<template>
  <div class="mp">
    <header class="mh">
      <button class="mb" @click="goBack">‹</button>
      <h1 class="mt">整改详情</h1>
      <span style="font-size:12px;color:#34a853;font-weight:600">✅ 已关闭</span>
    </header>

    <div class="info-bar">
      <div class="info-title">⚠ {{ rectInfo.rectifyNo }}</div>
      <div class="info-meta">巡检单号：{{ rectInfo.taskNo }}</div>
      <div class="info-meta" style="margin-top:2px">
        <span class="scenario-tag">{{ scenarioLabel }}</span>
        {{ rectInfo.project }} · 整改人：{{ rectInfo.rectifier }} · 复查人：{{ rectInfo.reviewer }}
      </div>
    </div>

    <!-- 流程记录（含收起展开） -->
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
          :class="{ reject: f.action.includes('不通过'), done: f.action.includes('关闭') }"
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

    <!-- 隐患信息 -->
    <div class="section">
      <div class="section-title">隐患信息</div>
      <div class="ir"><span class="il">隐患说明</span><span>{{ currentHazard.desc }}</span></div>
      <div v-if="currentHazard.inspPhotos?.length" class="ir"><span class="il">隐患照片</span><span>{{ currentHazard.inspPhotos.join('、') }}</span></div>
    </div>

    <!-- 整改信息 -->
    <div class="section">
      <div class="section-title">整改信息</div>
      <div
        v-for="(rct,ri) in currentHazard.rectifications"
        :key="ri"
        class="hc-round"
        :class="{ 'hc-round-fail': ri === 0 && currentHazard.rectifications.length > 1, 'hc-round-pass': ri === currentHazard.rectifications.length - 1 }"
      >
        <div class="hc-round-title">
          <template v-if="currentHazard.rectifications.length > 1">第{{ rct.round }}次整改</template>
          <template v-else>整改</template>
          <span v-if="ri === 0 && currentHazard.rectifications.length > 1" style="color:#e53935;font-size:11px;font-weight:400">（退回）</span>
          <span v-if="ri === currentHazard.rectifications.length - 1 && currentHazard.rectifications.length > 1" style="color:#34a853;font-size:11px;font-weight:400">（通过）</span>
        </div>
        <div class="hc-row"><span class="il">日期</span><span>{{ rct.date }}</span></div>
        <div class="hc-row"><span class="il">照片</span><span>{{ rct.photos.join('、') }}</span></div>
        <div class="hc-row"><span class="il">说明</span><span>{{ rct.note }}</span></div>
      </div>
    </div>

    <!-- 复查信息 -->
    <div class="section">
      <div class="section-title">复查信息</div>
      <div v-for="(rv,ri) in reviewRecords" :key="ri" class="review-record" :class="{ pass: rv.result === '通过' }">
        <div class="rr-top">
          <span v-if="reviewRecords.length > 1" class="rr-round">第{{ rv.round }}次复查</span>
          <span v-else class="rr-round">复查</span>
          <span class="rr-date">{{ rv.date }}</span>
          <span class="rr-result" :class="{ pass: rv.result === '通过' }">
            {{ rv.result === '通过' ? '✅ 通过' : '❌ 不通过' }}
          </span>
        </div>
        <div class="rr-comment">{{ rv.comment }}</div>
      </div>
    </div>

    <!-- 场景标识脚注 -->
    <div class="scenario-footer">{{ scenarioLabel }}</div>
  </div>
</template>

<style scoped>
.mp { width:100%; max-width:402px; margin:0 auto; min-height:100vh; background:#f5f5f5; font-family:'PingFang SC',-apple-system,sans-serif; padding-bottom:env(safe-area-inset-bottom,0); }
.mh { display:flex; align-items:center; padding:12px 16px; background:#8f0045; color:#fff; position:sticky; top:0; z-index:10; }
.mb { background:none; border:none; color:#fff; font-size:28px; padding:0 4px 0 0; line-height:1; cursor:pointer; }
.mt { flex:1; font-size:18px; font-weight:600; margin:0; }
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
.hc-round { margin-bottom:8px; padding:8px 10px; background:#fafafa; border-radius:6px; }
.hc-round.hc-round-fail { border-left:3px solid #e53935; }
.hc-round.hc-round-pass { border-left:3px solid #34a853; }
.hc-round-title { font-size:12px; font-weight:600; color:#4285f4; margin-bottom:4px; }
.hc-row { display:flex; gap:6px; font-size:13px; line-height:1.6; margin-bottom:4px; }
.hc-row .il { color:#999; flex-shrink:0; width:36px; }

/* 脚注 */
.scenario-footer { text-align:center; padding:20px 16px 30px; font-size:11px; color:#ccc; }
</style>
