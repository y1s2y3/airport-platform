<script setup>
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { getMobileRectification, submitRectificationReview } from '../../composables/useMobileRectification'

const route = useRoute()
const router = useRouter()
const rid = route.params.id
const workflowRecord = getMobileRectification(rid)

const isSecondRound = rid === 'rec-003'

const infoMap = {
  'rec-002': { rn:'ZG202607002', tn:'AQXJ20260728001', cat:'安全', pj:'飞行区跑道延长工程', rf:'王工（项目安全员）', rv:'陈工（监理工程师）', sd:'2026-07-25', is2:false,
    items:[{ desc:'五芯电缆破损，线路未按规范敷设', p:['📷 隐患照片1'], rd:'2026-07-25', rp:['📷 整改照片1'], rn:'已更换合规电缆' }] },
  'rec-003': { rn:'ZG202607003', tn:'ZLXJ20260721003', cat:'质量', pj:'T3航站楼扩建工程', rf:'刘工（专职安全员）', rv:'陈工（监理工程师）', sd:'2026-07-27', is2:true,
    items:[{ desc:'脚手架施工方案未报审即施工', p:['📷 隐患照片1'], rd:'2026-07-27', rp:['📷 整改照片1'], rn:'已重新补报方案并通过审核' }],
    preItems:[{ desc:'脚手架施工方案未报审即施工', p:['📷 隐患照片1'], rd:'2026-07-23', rp:['📷 整改照片1'], rn:'已补报方案' }],
    prv:{ d:'2026-07-25', c:'整改不彻底', r:'不通过' } },
  'rec-008': { rn:'ZG202607008', tn:'ZLXJ20260730002', cat:'质量', pj:'T3航站楼扩建工程', rf:'刘工（专职安全员）', rv:'陈工（监理工程师）', sd:'2026-07-30', is2:false,
    items:[{ desc:'混凝土外观存在蜂窝麻面', p:['📷 隐患照片1'], rd:'2026-07-30', rp:['📷 整改照片1'], rn:'已完成缺陷修补并养护' }] },
}

const info = infoMap[rid] || infoMap['rec-002']

const flowRecords = info.is2 ? [
  { a:'下发整改单', d:'2026-07-20 14:00' },
  { a:'整改人提交整改结果', d:'2026-07-23 10:30' },
  { a:'复查不通过，退回继续整改', d:'2026-07-25 09:00', dt:'整改不彻底' },
  { a:'整改人重新提交整改结果', d:'2026-07-27 16:30' },
  { a:'待复查人审核', d:'', cur:true },
] : [
  { a:'下发整改单', d:'2026-07-20 14:00' },
  { a:'整改人提交整改结果', d:'2026-07-25 10:30' },
  { a:'待复查人审核', d:'', cur:true },
]

const flowCollapsed = ref(false)
const prevCollapsed = ref(true)
const reviewComment = ref('')
const reviewDate = ref('')
onMounted(() => document.querySelector('.page-viewport')?.scrollTo({ top:0 }))

function handleReview(pass) {
  if (!reviewComment.value.trim()) { ElMessage.warning('请输入复查意见'); return }
  if (!reviewDate.value) { ElMessage.warning('请选择复查日期'); return }
  submitRectificationReview(rid, pass, { reviewDate: reviewDate.value, reviewComment: reviewComment.value.trim() })
  ElMessage.success(pass ? '复查通过，状态已更新为“已复查”，已流转至项目经理审批' : '复查不通过，已退回整改人重新整改')
  const tab = route.query.tab; router.push(tab ? `/mobile/rectify?tab=${tab}` : '/mobile/rectify')
}
function goBack() { const tab = route.query.tab; router.push(tab ? `/mobile/rectify?tab=${tab}` : '/mobile/rectify') }
</script>

<template>
  <div class="mp">
    <header class="mh">
      <button class="mb" @click="goBack">‹</button>
      <h1 class="mt">整改复查</h1>
    </header>

    <div class="ib">
      <div class="ibn">⚠ {{ info.rn }}</div>
      <div class="ibm">巡检任务单编号：{{ info.tn }}</div>
      <div class="ibm">巡检分类：{{ info.cat }}</div>
      <div class="ibm">{{ info.pj }} · 整改人：{{ info.rf }} · 复查人：{{ info.rv }} · 提交：{{ info.sd }}</div>
    </div>

    <div v-if="workflowRecord?.approvalRejected" class="approval-reject-tip">
      <strong>项目经理审批不通过</strong>
      <span>{{ workflowRecord.approvalReason }}</span>
      <small>请复查人重新核验并提交审批</small>
    </div>

    <!-- 流程记录 -->
    <div class="sc">
      <div class="sct colps" @click="flowCollapsed=!flowCollapsed"><span>流程记录</span><span class="ca">{{ flowCollapsed?'展开 ▸':'收起 ▾' }}</span></div>
      <div v-show="!flowCollapsed" class="fl">
        <div v-for="(f,i) in flowRecords" :key="i" class="fi" :class="{cur:f.cur}">
          <div class="fd" :class="{cur:f.cur}"></div>
          <div class="fc">
            <div class="fc-row">
              <span class="fa">{{ f.a }}</span>
              <span class="fd2">{{ f.d||'待处理' }}</span>
            </div>
            <span v-if="f.dt" class="fdl">{{ f.dt }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 二次：上次整改情况 -->
    <div v-if="info.is2" class="sc">
      <div class="sct colps" @click="prevCollapsed=!prevCollapsed"><span>上次整改情况</span><span class="ca">{{ prevCollapsed?'展开 ▸':'收起 ▾' }}</span></div>
      <div v-show="!prevCollapsed">
        <div v-for="(item,i) in info.preItems" :key="i" class="ic">
          <div class="ir"><span class="il">隐患说明</span><span>{{ item.desc }}</span></div>
          <div class="ir" v-if="item.p"><span class="il">隐患照片</span><span>{{ item.p.join('、') }}</span></div>
          <div class="dv"></div>
          <div class="ir"><span class="il">整改日期</span><span>{{ item.rd }}</span></div>
          <div class="ir"><span class="il">整改照片</span><span>{{ item.rp.join('、') }}</span></div>
          <div class="ir"><span class="il">整改说明</span><span>{{ item.rn }}</span></div>
        </div>
        <div class="pv">
          <div class="pvt">❌ 复查结果</div>
          <div class="ir"><span class="il">日期</span><span>{{ info.prv.d }}</span></div>
          <div class="ir"><span class="il">意见</span><span>{{ info.prv.c }}</span></div>
          <div class="ir"><span class="il">结果</span><span style="color:#e53935;font-weight:600">{{ info.prv.r }}</span></div>
        </div>
      </div>
    </div>

    <!-- 整改结果 -->
    <div class="sc">
      <div class="sct">整改结果</div>
      <div v-for="(item,i) in info.items" :key="i" class="ic">
          <div class="ir"><span class="il">隐患说明</span><span>{{ item.desc }}</span></div>
        <div class="ir" v-if="item.p"><span class="il">隐患照片</span><span>{{ item.p.join('、') }}</span></div>
        <div class="dv"></div>
        <div class="ir"><span class="il">整改日期</span><span>{{ item.rd }}</span></div>
        <div class="ir"><span class="il">整改照片</span><span>{{ item.rp.join('、') }}</span></div>
        <div class="ir"><span class="il">整改说明</span><span>{{ item.rn }}</span></div>
      </div>
    </div>

    <!-- 复查意见 -->
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
  </div>
</template>

<style scoped>
.mp { width:100%; max-width:402px; margin:0 auto; min-height:100vh; background:#f5f5f5; padding-bottom:env(safe-area-inset-bottom,0); }
.mh { display:flex; align-items:center; padding:12px 16px; background:#8f0045; color:#fff; position:sticky; top:0; z-index:10; }
.mb { background:none; border:none; color:#fff; font-size:28px; padding:0 4px 0 0; line-height:1; cursor:pointer; }
.mt { flex:1; font-size:18px; font-weight:600; margin:0; }

.ib { background:#fff; padding:14px 16px; border-bottom:1px solid #eee; }
.ibn { font-size:15px; font-weight:600; color:#1f2329; margin-bottom:4px; }
.ibm { font-size:12px; color:#999; }
.approval-reject-tip { margin:12px 16px 0; padding:12px 14px; border-radius:10px; background:#fff2f2; border:1px solid #ffc9c9; display:flex; flex-direction:column; gap:4px; color:#d93025; font-size:13px; }
.approval-reject-tip small { color:#999; }

.sc { background:#fff; border-radius:10px; padding:14px 16px; margin:12px 16px; box-shadow:0 1px 3px rgba(0,0,0,0.04); }
.sct { font-size:13px; font-weight:600; color:#1f2329; margin-bottom:10px; padding-left:8px; border-left:3px solid #8f0045; }
.sct.colps { cursor:pointer; display:flex; align-items:center; justify-content:space-between; }
.ca { font-size:12px; color:#999; font-weight:400; }

.ic { background:#fafafa; border-radius:8px; padding:12px; margin-bottom:8px; }
.ir { display:flex; gap:6px; font-size:13px; line-height:1.6; margin-bottom:4px; }
.il { color:#999; flex-shrink:0; width:68px; }
.dv { height:1px; background:#eee; margin:8px 0; }

.pv { background:#fff; border-radius:8px; padding:12px; border-left:3px solid #e53935; margin-top:8px; }
.pvt { font-size:13px; font-weight:600; color:#e53935; margin-bottom:8px; }

.sc.review { }
.fr { display:flex; gap:8px; margin-bottom:10px; align-items:flex-start; }
.fl-label { font-size:13px; color:#666; flex-shrink:0; width:72px; padding-top:4px; }
.req { color:#e53935; font-style:normal; margin-left:2px; }
.fi-input { flex:1; padding:8px 10px; border:1px solid #ddd; border-radius:8px; font-size:13px; background:#fff; }
.fta { flex:1; width:100%; padding:10px 12px; border:1px solid #ddd; border-radius:8px; font-size:13px; font-family:inherit; resize:none; background:#fff; box-sizing:border-box; }
.ra { display:flex; gap:10px; margin-top:10px; }
.ab { flex:1; padding:14px; border-radius:10px; font-size:15px; font-weight:600; cursor:pointer; text-align:center; border:1.5px solid; }
.ab.pass { background:#e8f5e9; color:#34a853; border-color:#34a853; }
.ab.reject { background:#ffebee; color:#e53935; border-color:#e53935; }

/* 流程 */
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
