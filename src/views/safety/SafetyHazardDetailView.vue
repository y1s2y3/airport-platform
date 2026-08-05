<script setup>
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getProjectRectifierLabel, getProjectReviewerLabel } from '../../composables/useInspectionPersonConfig'

const route = useRoute()
const router = useRouter()
const rid = route.params.id

const flowCollapsed = ref(false)
const prevCollapsed = ref(true)

const d = {
  // ===== 待整改 =====
  'rec-001': {
    rn:'ZG202607001', tn:'AQXJ20260728001', pj:'飞行区跑道延长工程', rf:'赵工', rv:'张工', dl:'2026-07-30', st:'待整改',
    hazard:{ desc:'五芯电缆破损，线路未按规范敷设', photos:['📷 隐患照片1'] },
    flow:[
      { a:'下发整改单', d:'2026-07-25 09:00' },
      { a:'等待整改人执行', d:'', cur:true },
    ],
  },
  // ===== 待整改（复查退回） =====
  'rec-006': {
    rn:'ZG202607006', tn:'AQXJ20260721003', pj:'T3航站楼扩建工程', rf:'王工', rv:'张工', dl:'2026-07-22', st:'待整改',
    hazard:{ desc:'脚手架施工方案未报审即施工', photos:['📷 隐患照片1'] },
    prevRect:{ date:'2026-07-20', photos:['📷 整改照片1'], note:'已补报方案' },
    prevReview:{ date:'2026-07-22', comment:'整改不彻底，电缆接头处仍有裸露', result:'不通过' },
    flow:[
      { a:'下发整改单', d:'2026-07-20 14:00' },
      { a:'整改人提交整改结果', d:'2026-07-22 16:30' },
      { a:'复查不通过，退回继续整改', d:'2026-07-24 10:00', dt:'整改不彻底' },
      { a:'等待整改人重新整改', d:'', cur:true },
    ],
  },
  // ===== 待复查 =====
  'rec-002': {
    rn:'ZG202607002', tn:'AQXJ20260728001', pj:'飞行区跑道延长工程', rf:'李工', rv:'张工', dl:'2026-07-28', st:'待复查',
    hazard:{ desc:'五芯电缆破损，线路未按规范敷设', photos:['📷 隐患照片1'] },
    rectification:{ date:'2026-07-25', photos:['📷 整改照片1'], note:'已更换合规电缆' },
    flow:[
      { a:'下发整改单', d:'2026-07-20 14:00' },
      { a:'整改人提交整改结果', d:'2026-07-25 10:30' },
      { a:'待复查人审核', d:'', cur:true },
    ],
  },
  // ===== 待复查（曾退回） =====
  'rec-003': {
    rn:'ZG202607003', tn:'ZLXJ20260721003', pj:'T3航站楼扩建工程', rf:'王工', rv:'张工', dl:'2026-07-28', st:'待复查',
    hazard:{ desc:'脚手架施工方案未报审即施工', photos:['📷 隐患照片1'] },
    prevRect:{ date:'2026-07-23', photos:['📷 整改照片1'], note:'已补报方案' },
    prevReview:{ date:'2026-07-25', comment:'整改不彻底', result:'不通过' },
    rectification:{ date:'2026-07-27', photos:['📷 整改照片1'], note:'已重新补报方案并通过审核' },
    flow:[
      { a:'下发整改单', d:'2026-07-20 14:00' },
      { a:'整改人提交整改结果', d:'2026-07-23 10:30' },
      { a:'复查不通过，退回继续整改', d:'2026-07-25 09:00', dt:'整改不彻底' },
      { a:'整改人重新提交整改结果', d:'2026-07-27 16:30' },
      { a:'待复查人审核', d:'', cur:true },
    ],
  },
  // ===== 已复查·等待项目经理审批 =====
  'rec-007': {
    rn:'ZG202607007', tn:'AQXJ20260730001', pj:'飞行区跑道延长工程', rf:'赵工', rv:'张工', dl:'2026-07-31', st:'已复查',
    hazard:{ desc:'临边防护栏杆局部缺失', photos:['临边防护隐患照片.jpg'] },
    rectification:{ date:'2026-07-30', photos:['临边防护整改后照片.jpg'], note:'已恢复缺失栏杆并加固连接节点。' },
    reviews:[{ round:1, date:'2026-07-30', comment:'整改到位，同意提交项目经理审批。', result:'通过' }],
    managerApproval:{ manager:'赵经理（项目经理）', status:'审批中', comment:'-' },
    flow:[
      { a:'下发整改单', d:'2026-07-25 09:00' },
      { a:'整改人提交整改结果', d:'2026-07-30 16:30' },
      { a:'复查人复查通过', d:'2026-07-30 17:20' },
      { a:'待项目经理审批', d:'', cur:true },
    ],
  },
  // ===== 已关闭（直接闭环） =====
  'rec-004': {
    rn:'ZG202607004', tn:'ZLXJ20260728005', pj:'飞行区跑道延长工程', rf:'赵工', rv:'李工', dl:'2026-07-20', st:'已关闭', cd:'2026-07-25',
    hazard:{ desc:'电缆破损，存在安全隐患', photos:['📷 隐患照片1','📷 隐患照片2'] },
    rectifications:[{ round:1, date:'2026-07-22', photos:['📷 整改照片1','📷 整改照片2'], note:'已更换破损电缆' }],
    reviews:[{ round:1, date:'2026-07-25', comment:'整改合格，同意提交审批', result:'通过' }],
    managerApproval:{ manager:'赵经理（项目经理）', date:'2026-07-25', status:'通过', comment:'同意关闭' },
    flow:[
      { a:'下发整改单', d:'2026-07-18 09:00' },
      { a:'整改人提交整改结果', d:'2026-07-22 14:30' },
      { a:'复查人复查通过', d:'2026-07-25 15:30' },
      { a:'项目经理审批通过，整改单关闭', d:'2026-07-25 16:00' },
    ],
  },
  // ===== 已关闭（退回后闭环） =====
  'rec-011': {
    rn:'ZG202607011', tn:'AQXJ20260721003', pj:'T3航站楼扩建工程', rf:'王工', rv:'张工', dl:'2026-07-25', st:'已关闭', cd:'2026-07-30',
    hazard:{ desc:'消防器材过期未更换', photos:['📷 隐患照片1','📷 隐患照片2'] },
    rectifications:[
      { round:1, date:'2026-07-24', photos:['📷 整改照片1'], note:'已购买新灭火器' },
      { round:2, date:'2026-07-28', photos:['📷 整改照片1','📷 整改照片2'], note:'已全部更换并设置检查记录卡' },
    ],
    reviews:[
      { round:1, date:'2026-07-26', comment:'整改不彻底，需重新处理', result:'不通过' },
      { round:2, date:'2026-07-30', comment:'整改到位，同意提交审批', result:'通过' },
    ],
    managerApproval:{ manager:'李经理（项目经理）', date:'2026-07-30', status:'通过', comment:'同意关闭' },
    flow:[
      { a:'下发整改单', d:'2026-07-20 09:00' },
      { a:'整改人提交整改结果', d:'2026-07-24 15:30' },
      { a:'复查不通过，退回继续整改', d:'2026-07-26 10:00', dt:'整改不彻底，需重新处理' },
      { a:'整改人重新提交整改结果', d:'2026-07-28 16:20' },
      { a:'复查人复查通过', d:'2026-07-30 10:30' },
      { a:'项目经理审批通过，整改单关闭', d:'2026-07-30 11:00' },
    ],
  },
}
const info = computed(() => {
  const source = d[rid] || d['rec-001']
  return {
    ...source,
    cat: ['rec-003', 'rec-004'].includes(rid) ? '质量' : '安全',
    rf: getProjectRectifierLabel(source.pj),
    rv: getProjectReviewerLabel(source.pj),
  }
})
const isRetry = computed(() => rid === 'rec-003' || rid === 'rec-011')
const isRejected = computed(() => rid === 'rec-006')

function goBack() { router.push('/safety-inspection/hazard') }
</script>

<template>
  <div class="pg">
    <div class="hd">
      <button class="bk" @click="goBack">‹ 返回</button>
      <h3 class="pt">隐患详情</h3>
    </div>

    <!-- ===== 基本信息 ===== -->
    <div class="ig">
      <div class="ic"><label>整改单编号</label><span>{{ info.rn }}</span></div>
      <div class="ic"><label>巡检任务单编号</label><span>{{ info.tn }}</span></div>
      <div class="ic"><label>项目名称</label><span>{{ info.pj }}</span></div>
      <div class="ic"><label>巡检分类</label><span>{{ info.cat }}</span></div>
      <div class="ic"><label>整改人</label><span>{{ info.rf }}</span></div>
      <div class="ic"><label>复查人</label><span>{{ info.rv }}</span></div>
      <div class="ic"><label>截止日期</label><span>{{ info.dl }}</span></div>
      <div class="ic"><label>状态</label><span :style="{color:info.st==='已关闭'?'#34a853':info.st==='已复查'?'#8f0045':'#f5a623',fontWeight:600}">{{ info.st }}</span></div>
      <div class="ic" v-if="info.cd"><label>关闭日期</label><span>{{ info.cd }}</span></div>
    </div>

    <!-- ===== 隐患信息 ===== -->
    <div class="sc">
      <div class="sct">隐患信息</div>
      <div class="rf"><label>隐患说明</label><span>{{ info.hazard.desc }}</span></div>
      <div class="rf" v-if="info.hazard.photos?.length"><label>隐患照片</label><span>{{ info.hazard.photos.join('、') }}</span></div>
    </div>

    <!-- ===== 待整改：上次整改情况+复查结果 ===== -->
    <template v-if="isRejected">
      <div class="sc">
        <div class="sct">上次整改情况</div>
        <div class="rf"><label>整改日期</label><span>{{ info.prevRect.date }}</span></div>
        <div class="rf"><label>整改照片</label><span>{{ info.prevRect.photos.join('、') }}</span></div>
        <div class="rf"><label>整改说明</label><span>{{ info.prevRect.note }}</span></div>
      </div>
      <div class="sc">
        <div class="sct" style="color:#e53935;border-left-color:#e53935">❌ 复查结果</div>
        <div class="rf"><label>复查日期</label><span>{{ info.prevReview.date }}</span></div>
        <div class="rf"><label>复查意见</label><span>{{ info.prevReview.comment }}</span></div>
        <div class="rf"><label>结果</label><span style="color:#e53935;font-weight:600">{{ info.prevReview.result }}</span></div>
      </div>
    </template>

    <!-- ===== 待复查：上次整改情况+复查结果（可收起） ===== -->
    <template v-if="isRetry && info.st === '待复查'">
      <div class="sc">
        <div class="sct colps" @click="prevCollapsed = !prevCollapsed">
          <span>上次整改情况</span>
          <span class="ar">{{ prevCollapsed ? '展开 ▸' : '收起 ▾' }}</span>
        </div>
        <div v-show="!prevCollapsed">
          <div class="sc-inner">
            <div class="inner-title">历史整改</div>
            <div class="rf"><label>日期</label><span>{{ info.prevRect.date }}</span></div>
            <div class="rf"><label>照片</label><span>{{ info.prevRect.photos.join('、') }}</span></div>
            <div class="rf"><label>说明</label><span>{{ info.prevRect.note }}</span></div>
          </div>
          <div class="sc-inner" style="border-left-color:#e53935">
            <div class="inner-title" style="color:#e53935">❌ 复查结果</div>
            <div class="rf"><label>日期</label><span>{{ info.prevReview.date }}</span></div>
            <div class="rf"><label>意见</label><span>{{ info.prevReview.comment }}</span></div>
            <div class="rf"><label>结果</label><span style="color:#e53935;font-weight:600">{{ info.prevReview.result }}</span></div>
          </div>
        </div>
      </div>
    </template>

    <!-- ===== 整改信息（待复查/已复查/已关闭展示） ===== -->
    <template v-if="['待复查', '已复查', '已关闭'].includes(info.st)">
      <div class="sc">
        <div class="sct">整改信息</div>
        <div v-if="info.rectifications" v-for="(rct, ri) in info.rectifications" :key="ri" class="sc-inner" :class="{ 'inner-fail': ri===0 && info.rectifications.length>1, 'inner-pass': ri===info.rectifications.length-1 }">
          <div class="inner-title">
            <template v-if="info.rectifications.length>1">{{ ri === info.rectifications.length - 1 ? '本次整改' : '历史整改' }}</template>
            <template v-else>整改</template>
            <span v-if="ri===0 && info.rectifications.length>1" class="tag-fail">退回</span>
            <span v-if="ri===info.rectifications.length-1 && info.rectifications.length>1" class="tag-pass">通过</span>
          </div>
          <div class="rf"><label>日期</label><span>{{ rct.date }}</span></div>
          <div class="rf"><label>照片</label><span>{{ rct.photos.join('、') }}</span></div>
          <div class="rf"><label>说明</label><span>{{ rct.note }}</span></div>
        </div>
        <!-- 待复查：单条整改 -->
        <div v-if="info.rectification" class="sc-inner">
          <div class="inner-title">整改</div>
          <div class="rf"><label>日期</label><span>{{ info.rectification.date }}</span></div>
          <div class="rf"><label>照片</label><span>{{ info.rectification.photos.join('、') }}</span></div>
          <div class="rf"><label>说明</label><span>{{ info.rectification.note }}</span></div>
        </div>
      </div>
    </template>

    <!-- ===== 复查信息（复查通过后展示） ===== -->
    <template v-if="['已复查', '已关闭'].includes(info.st)">
      <div class="sc">
        <div class="sct">复查信息</div>
        <div v-for="(rv, ri) in info.reviews" :key="ri" class="rv-item" :class="{ 'rv-pass': rv.result==='通过' }">
          <div class="rv-top">
            <span v-if="info.reviews.length>1" class="rv-round">{{ ri === info.reviews.length - 1 ? '本次复查' : '历史复查' }}</span>
            <span v-else class="rv-round">复查</span>
            <span class="rv-date">{{ rv.date }}</span>
            <span class="rv-result" :class="{ 'rv-result-pass': rv.result==='通过' }">{{ rv.result==='通过' ? '✅ 通过' : '❌ 不通过' }}</span>
          </div>
          <div class="rv-comment">{{ rv.comment }}</div>
        </div>
      </div>
    </template>

    <div v-if="info.managerApproval" class="sc">
      <div class="sct">项目经理审批</div>
      <div class="rf"><label>审批人</label><span>{{ info.managerApproval.manager }}</span></div>
      <div class="rf"><label>审批状态</label><span :style="{ color:info.managerApproval.status === '通过' ? '#34a853' : '#8f0045', fontWeight:600 }">{{ info.managerApproval.status }}</span></div>
      <div v-if="info.managerApproval.date" class="rf"><label>审批日期</label><span>{{ info.managerApproval.date }}</span></div>
      <div class="rf"><label>审批意见</label><span>{{ info.managerApproval.comment }}</span></div>
    </div>

    <!-- ===== 流程记录（最底部） ===== -->
    <div class="sc">
      <div class="sct colps" @click="flowCollapsed = !flowCollapsed">
        <span>流程记录</span>
        <span class="ar">{{ flowCollapsed ? '展开 ▸' : '收起 ▾' }}</span>
      </div>
      <div v-show="!flowCollapsed" class="fw">
        <div v-for="(f,i) in info.flow" :key="i" class="fi" :class="{ cur: f.cur, done: f.a.includes('关闭') }">
          <div class="fd" :class="{ cur: f.cur, done: f.a.includes('关闭') }"></div>
          <div class="fb">
            <span class="fa">{{ f.a }}</span>
            <span class="fd2">{{ f.d || '进行中' }}</span>
            <span v-if="f.dt" class="fdl">{{ f.dt }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.pg { padding:0; }
.hd { display:flex; align-items:center; gap:12px; margin-bottom:20px; }
.bk { background:none; border:1px solid #ddd; border-radius:6px; padding:4px 12px; font-size:13px; color:#666; cursor:pointer; }
.bk:hover { color:#8f0045; border-color:#8f0045; }
.pt { font-size:18px; font-weight:600; color:#1f2329; margin:0; flex:1; }
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

/* 内嵌子卡片 */
.sc-inner { border:1px solid #e9ecef; border-radius:6px; padding:12px 14px; margin-bottom:8px; border-left:3px solid #8f0045; }
.sc-inner.inner-fail { border-left-color:#e53935; }
.sc-inner.inner-pass { border-left-color:#34a853; }
.inner-title { font-size:13px; font-weight:600; color:#8f0045; margin-bottom:6px; }
.tag-fail { font-size:11px; color:#e53935; font-weight:400; margin-left:6px; }
.tag-pass { font-size:11px; color:#34a853; font-weight:400; margin-left:6px; }

/* 复查记录 */
.rv-item { border:1px solid #e9ecef; border-radius:6px; padding:12px 14px; margin-bottom:8px; border-left:3px solid #e53935; }
.rv-item.rv-pass { border-left-color:#34a853; }
.rv-top { display:flex; align-items:center; gap:8px; margin-bottom:4px; }
.rv-round { font-size:13px; font-weight:600; color:#212529; }
.rv-date { font-size:12px; color:#868e96; }
.rv-result { font-size:12px; font-weight:600; color:#e53935; }
.rv-result.rv-result-pass { color:#34a853; }
.rv-comment { font-size:13px; color:#495057; }

/* 流程记录 */
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
