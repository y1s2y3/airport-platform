<script setup>
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getInspectionHazardDetail } from '../../mock/inspectionHazardQuery'

const route = useRoute()
const router = useRouter()
const rid = route.params.id
const flowCollapsed = ref(false)

const info = computed(() => getInspectionHazardDetail(rid))
const missing = computed(() => !info.value)

const latestRectifications = computed(() => {
  if (!info.value) return []
  if (info.value.rectifications?.length) {
    return [info.value.rectifications[info.value.rectifications.length - 1]]
  }
  return info.value.rectification ? [info.value.rectification] : []
})
const latestReviews = computed(() => {
  if (!info.value?.reviews?.length) return []
  return [info.value.reviews[info.value.reviews.length - 1]]
})

function goBack() {
  router.push('/safety-inspection/hazard')
}
</script>

<template>
  <div class="pg">
    <div class="hd">
      <button class="bk" @click="goBack">‹ 返回</button>
      <h3 class="pt">隐患详情</h3>
    </div>

    <div v-if="missing" class="empty-tip">未找到该隐患记录，请返回清单重试。</div>

    <template v-else>
      <div class="ig">
        <div class="ic"><label>整改单编号</label><span>{{ info.rn || '--' }}</span></div>
        <div class="ic"><label>巡检任务单编号</label><span>{{ info.tn || '--' }}</span></div>
        <div class="ic"><label>项目名称</label><span>{{ info.pj || '--' }}</span></div>
        <div class="ic"><label>巡检分类</label><span>{{ info.cat || '--' }}</span></div>
        <div class="ic"><label>整改人</label><span>{{ info.rf || '--' }}</span></div>
        <div class="ic"><label>复查人</label><span>{{ info.rv || '--' }}</span></div>
        <div class="ic"><label>截止日期</label><span>{{ info.dl || '--' }}</span></div>
        <div class="ic"><label>状态</label><span :style="{color:info.st==='已关闭'?'#34a853':info.st==='已复查'?'#8f0045':'#f5a623',fontWeight:600}">{{ info.st || '--' }}</span></div>
        <div class="ic" v-if="info.cd"><label>关闭日期</label><span>{{ info.cd }}</span></div>
      </div>

      <div class="sc">
        <div class="sct">隐患信息</div>
        <div class="rf"><label>隐患说明</label><span>{{ info.hazard?.desc || '--' }}</span></div>
        <div class="rf" v-if="info.hazard?.photos?.length"><label>隐患照片</label><span>{{ info.hazard.photos.join('、') }}</span></div>
      </div>

      <template v-if="['待复查', '已复查', '已关闭'].includes(info.st) || latestRectifications.length">
        <div class="sc">
          <div class="sct">整改信息</div>
          <div v-if="!latestRectifications.length" class="rf"><label>说明</label><span>--</span></div>
          <div v-for="(rct, idx) in latestRectifications" :key="idx" class="sc-inner">
            <div class="inner-title">整改</div>
            <div class="rf"><label>日期</label><span>{{ rct.date || '--' }}</span></div>
            <div class="rf"><label>照片</label><span>{{ rct.photos?.length ? rct.photos.join('、') : '--' }}</span></div>
            <div class="rf"><label>说明</label><span>{{ rct.note || '--' }}</span></div>
          </div>
        </div>
      </template>

      <template v-if="info.prevReview">
        <div class="sc">
          <div class="sct">上一轮复查（已退回）</div>
          <div class="rv-item">
            <div class="rv-top">
              <span class="rv-round">复查</span>
              <span class="rv-date">{{ info.prevReview.date || '--' }}</span>
              <span class="rv-result">❌ 不通过</span>
            </div>
            <div class="rv-comment">{{ info.prevReview.comment || '--' }}</div>
          </div>
        </div>
      </template>

      <template v-if="['已复查', '已关闭'].includes(info.st)">
        <div class="sc">
          <div class="sct">复查信息</div>
          <div v-if="!latestReviews.length" class="rf"><label>说明</label><span>--</span></div>
          <div v-for="(rv, idx) in latestReviews" :key="idx" class="rv-item" :class="{ 'rv-pass': rv.result==='通过' }">
            <div class="rv-top">
              <span class="rv-round">复查</span>
              <span class="rv-date">{{ rv.date || '--' }}</span>
              <span class="rv-result" :class="{ 'rv-result-pass': rv.result==='通过' }">{{ rv.result==='通过' ? '✅ 通过' : (rv.result === '不通过' ? '❌ 不通过' : (rv.result || '--')) }}</span>
            </div>
            <div class="rv-comment">{{ rv.comment || '--' }}</div>
          </div>
        </div>
      </template>

      <div v-if="info.managerApproval" class="sc">
        <div class="sct">项目经理审批</div>
        <div class="rf"><label>审批人</label><span>{{ info.managerApproval.manager || '--' }}</span></div>
        <div class="rf"><label>审批状态</label><span :style="{ color:info.managerApproval.status === '通过' ? '#34a853' : '#8f0045', fontWeight:600 }">{{ info.managerApproval.status || '--' }}</span></div>
        <div v-if="info.managerApproval.date" class="rf"><label>审批日期</label><span>{{ info.managerApproval.date }}</span></div>
        <div class="rf"><label>审批意见</label><span>{{ info.managerApproval.comment || '--' }}</span></div>
      </div>

      <div class="sc">
        <div class="sct colps" @click="flowCollapsed = !flowCollapsed">
          <span>流程记录</span>
          <span class="ar">{{ flowCollapsed ? '展开 ▸' : '收起 ▾' }}</span>
        </div>
        <div v-show="!flowCollapsed" class="fw">
          <div v-for="(f,i) in (info.flow || [])" :key="i" class="fi" :class="{ cur: f.cur, done: f.a.includes('关闭') }">
            <div class="fd" :class="{ cur: f.cur, done: f.a.includes('关闭') }"></div>
            <div class="fb">
              <span class="fa">{{ f.a }}</span>
              <span class="fd2">{{ f.d || '进行中' }}</span>
              <span v-if="f.dt" class="fdl">{{ f.dt }}</span>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.pg { padding:0; }
.hd { display:flex; align-items:center; gap:12px; margin-bottom:20px; }
.bk { background:none; border:1px solid #ddd; border-radius:6px; padding:4px 12px; font-size:13px; color:#666; cursor:pointer; }
.bk:hover { color:#8f0045; border-color:#8f0045; }
.pt { font-size:18px; font-weight:600; color:#1f2329; margin:0; flex:1; }
.empty-tip { margin:40px 0; padding:32px; text-align:center; color:#999; background:#fff; border:1px solid #dee2e6; border-radius:8px; }
.ig { display:grid; grid-template-columns:1fr 1fr 1fr; border:1px solid #dee2e6; border-radius:8px; overflow:hidden; margin-bottom:20px; background:#fff; }
.ic { display:flex; border-bottom:1px solid #f0f0f0; border-right:1px solid #f0f0f0; font-size:13px; }
.ic:nth-child(3n) { border-right:none; }
.ic:nth-last-child(-n+3) { border-bottom:none; }
.ic label { width:95px; flex-shrink:0; padding:9px 12px; background:#f8f9fa; color:#868e96; border-right:1px solid #f0f0f0; }
.ic span { padding:9px 12px; color:#212529; }
.sc { border:1px solid #dee2e6; border-radius:8px; padding:16px 20px; margin-bottom:20px; background:#fff; }
.sct { font-size:14px; font-weight:600; color:#212529; padding-left:10px; border-left:3px solid #8f0045; margin-bottom:14px; }
.sct.colps { cursor:pointer; display:flex; align-items:center; justify-content:space-between; }
.ar { font-size:12px; color:#868e96; font-weight:400; }
.rf { display:flex; font-size:13px; line-height:1.7; padding:2px 0; }
.rf label { width:70px; flex-shrink:0; color:#868e96; }
.rf span { color:#212529; }

.sc-inner { border:1px solid #e9ecef; border-radius:6px; padding:12px 14px; margin-bottom:8px; border-left:3px solid #8f0045; }
.inner-title { font-size:13px; font-weight:600; color:#8f0045; margin-bottom:6px; }

.rv-item { border:1px solid #e9ecef; border-radius:6px; padding:12px 14px; margin-bottom:8px; border-left:3px solid #e53935; }
.rv-item.rv-pass { border-left-color:#34a853; }
.rv-top { display:flex; align-items:center; gap:8px; margin-bottom:4px; }
.rv-round { font-size:13px; font-weight:600; color:#212529; }
.rv-date { font-size:12px; color:#868e96; }
.rv-result { font-size:12px; font-weight:600; color:#e53935; }
.rv-result.rv-result-pass { color:#34a853; }
.rv-comment { font-size:13px; color:#495057; }

.fw { padding-top:4px; }
.fi { display:flex; gap:10px; padding-bottom:12px; position:relative; font-size:13px; }
.fi:last-child { padding-bottom:0; }
.fi::before { content:''; position:absolute; left:7px; top:16px; bottom:0; width:1px; background:#dee2e6; }
.fi:last-child::before { display:none; }
.fd { width:10px; height:10px; border-radius:50%; background:#adb5bd; flex-shrink:0; margin-top:4px; }
.fd.cur { background:#8f0045; box-shadow:0 0 0 3px #fceef4; }
.fd.done { background:#34a853; }
.fb { display:flex; flex-direction:column; gap:2px; }
.fa { color:#212529; font-weight:500; }
.fd2 { color:#868e96; font-size:12px; }
.fdl { color:#e53935; font-size:12px; margin-top:2px; background:#ffebee; padding:1px 6px; border-radius:3px; display:inline-block; }
</style>
