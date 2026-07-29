<script setup>
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getProjectInspectorLabel } from '../../composables/useInspectionPersonConfig'

const route = useRoute()
const router = useRouter()
const taskId = route.params.id

// ===== 5条任务基本信息 =====
const taskMap = {
  'mt-000': { taskNo:'XJ20260730001', planName:'6月底安全巡检', planNo:'JH2026007', planType:'周检', source:'任务推送', project:'飞行区跑道延长工程', projectId:'p-000', executor:'', inspector:getProjectInspectorLabel('p-000'), companions:[], deadline:'2026-07-10', inspectionDate:'', status:'待执行', itemCount:10, hazardCount:0, result:'', normalPhotos:[], hazardItems:[] },
  'mt-001': { taskNo:'XJ20260728001', planName:'7月第4周安全巡检', planNo:'JH2026001', planType:'周检', source:'任务推送', project:'飞行区跑道延长工程', projectId:'p-000', executor:'王工', inspector:getProjectInspectorLabel('p-000'), companions:[], deadline:'2026-07-28', inspectionDate:'', status:'待执行', itemCount:12, hazardCount:0, result:'', normalPhotos:[], hazardItems:[] },
  'mt-002': { taskNo:'XJ20260720002', planName:'临时用电专项检查', planNo:'JH2026002', planType:'专项巡检', source:'任务推送', project:'T3航站楼扩建工程', projectId:'p-001', executor:'王工', inspector:getProjectInspectorLabel('p-001'), companions:[], deadline:'2026-07-20', inspectionDate:'2026-07-20', status:'已完成', itemCount:8, hazardCount:2, result:'hazard', normalPhotos:[],
    hazardItems:[
      { desc:'五芯电缆破损，线路未按规范敷设', photos:['📷 隐患照片1'], hasRectify:true, rectifyNo:'ZG202607001', rectifyId:'rec-001', rectifier:'赵工', rectifyDeadline:'2026-07-30' },
      { desc:'电缆线路沿地明敷未做保护', photos:['📷 隐患照片1'], hasRectify:true, rectifyNo:'ZG202607002', rectifyId:'rec-002', rectifier:'赵工', rectifyDeadline:'2026-07-30' },
    ] },
  'mt-003': { taskNo:'XJ20260721003', planName:'7月第三周安全巡检', planNo:'JH2026001', planType:'周检', source:'任务推送', project:'T3航站楼扩建工程', projectId:'p-001', executor:'王工', inspector:getProjectInspectorLabel('p-001'), companions:[], deadline:'2026-07-21', inspectionDate:'2026-07-21', status:'已完成', itemCount:12, hazardCount:0, result:'normal', normalPhotos:['📷 巡检照片1','📷 巡检照片2'], hazardItems:[] },
  'mt-004': { taskNo:'XJ20260731004', planName:'【自建】月检巡检', planNo:'', planType:'月检', source:'系统自建', project:'新货运站建设工程', projectId:'p-003', executor:'王工', inspector:'王工', companions:[], deadline:'2026-07-31', inspectionDate:'2026-07-31', status:'已完成', itemCount:0, hazardCount:0, result:'normal', normalPhotos:['📷 巡检照片1','📷 巡检照片2'], hazardItems:[] },
  'mt-005': { taskNo:'XJ20260728005', planName:'【自建】专项巡检', planNo:'', planType:'专项巡检', source:'系统自建', project:'飞行区跑道延长工程', projectId:'p-000', executor:'王工', inspector:'王工', companions:['吴工'], deadline:'2026-07-28', inspectionDate:'2026-07-28', status:'已完成', itemCount:0, hazardCount:1, result:'hazard', normalPhotos:[],
    hazardItems:[
      { desc:'电缆破损，存在安全隐患', photos:['📷 隐患照片1','📷 隐患照片2'], hasRectify:true, rectifyNo:'ZG202607007', rectifyId:'rec-007', rectifier:'赵工', rectifyDeadline:'2026-08-05' },
    ] },
}
const taskInfo = computed(() => taskMap[taskId] || taskMap['mt-001'])

// ===== 场景判断 =====
const isPush   = taskId?.startsWith('mt-') && !taskId?.endsWith('-004') && !taskId?.endsWith('-005')
const isSelf   = taskId === 'mt-004' || taskId === 'mt-005'
const isPending = taskId === 'mt-001'
// mt-002 有隐患已发整改单, mt-003 无隐患, mt-004 无隐患, mt-005 有隐患已发整改单

// ===== mt-002 检查结果（任务推送·有隐患） =====
const pushHazardTree = [
  { id:'cat-2', label:'临时用电',
    items:[
      { id:'item-2-1', label:'TN-S系统是否完整设置', result:'normal', photos:['📷 巡检照片1'] },
      { id:'item-2-2', label:'重复接地电阻值是否符合要求', result:'hazard', desc:'实测值15Ω，规范要求≤10Ω', photos:['📷 巡检照片1'] },
      { id:'item-2-3', label:'电缆线路是否采取埋地或架空敷设', result:'hazard', desc:'存在沿地明敷现象', photos:['📷 巡检照片2'] },
    ]},
  { id:'cat-3', label:'高处作业',
    items:[
      { id:'item-3-1', label:'临边防护是否到位', result:'normal', photos:['📷 巡检照片1'] },
      { id:'item-3-2', label:'安全带是否正确使用', result:'normal', photos:['📷 巡检照片1'] },
    ]},
  { id:'cat-4', label:'脚手架工程',
    items:[
      { id:'item-4-1', label:'脚手架施工方案是否经审批', result:'normal', photos:['📷 巡检照片1'] },
    ]},
]

// ===== mt-003 检查结果（任务推送·全部正常） =====
const pushNormalTree = [
  { id:'cat-2', label:'临时用电',
    items:[
      { id:'item-2-1', label:'TN-S系统是否完整设置', result:'normal', photos:['📷 巡检照片1'] },
      { id:'item-2-2', label:'重复接地电阻值是否符合要求', result:'normal', photos:['📷 巡检照片1'] },
      { id:'item-2-3', label:'电缆线路是否采取埋地或架空敷设', result:'normal', photos:['📷 巡检照片2'] },
    ]},
  { id:'cat-3', label:'高处作业',
    items:[
      { id:'item-3-1', label:'临边防护是否到位', result:'normal', photos:['📷 巡检照片1'] },
      { id:'item-3-2', label:'安全带是否正确使用', result:'normal', photos:['📷 巡检照片1'] },
    ]},
  { id:'cat-4', label:'脚手架工程',
    items:[
      { id:'item-4-1', label:'脚手架施工方案是否经审批', result:'normal', photos:['📷 巡检照片1'] },
    ]},
]

// ===== mt-005 隐患项（系统自建·有隐患） =====
// 数据已合并到 taskMap 中

// ===== 根据场景使用对应的树 =====
const categoryTree = computed(() => {
  if (taskId === 'mt-003') return pushNormalTree
  return pushHazardTree
})
const activeId = ref(categoryTree.value[0]?.id || '')
const activeCat = computed(() => categoryTree.value.find(c => c.id === activeId.value))
const activeItems = computed(() => activeCat.value?.items || [])

function goBack() { router.push('/safety-inspection/task') }
function goRectify(id) { if (id) router.push(`/safety-inspection/hazard/${id}`) }
</script>

<template>
  <div class="detail-page">
    <div class="detail-head">
      <button class="back-btn" @click="goBack">‹ 返回</button>
      <h3 class="page-title">巡检任务详情</h3>
    </div>

    <!-- ===== 基本信息 ===== -->
    <div class="info-card">
      <div class="info-row"><span class="il">任务单编号</span><span class="iv">{{ taskInfo.taskNo }}</span></div>
      <!-- 任务推送显示计划名称/编号，系统自建不显示 -->
      <template v-if="taskInfo.source === '任务推送'">
        <div class="info-row"><span class="il">计划名称</span><span class="iv">{{ taskInfo.planName }}</span></div>
        <div class="info-row"><span class="il">计划编号</span><span class="iv">{{ taskInfo.planNo }}</span></div>
      </template>
      <div class="info-row"><span class="il">来源</span><span class="iv">{{ taskInfo.source }}</span></div>
      <div class="info-row"><span class="il">项目</span><span class="iv">{{ taskInfo.project }}</span></div>
      <div class="info-row"><span class="il">巡检人</span><span class="iv">{{ taskInfo.inspector || '-' }}</span></div>
      <div class="info-row"><span class="il">同行人</span><span class="iv">{{ taskInfo.companions.length ? taskInfo.companions.join('、') : '-' }}</span></div>
      <div class="info-row"><span class="il">巡检类型</span><span class="iv">{{ taskInfo.planType }}</span></div>
      <!-- 任务推送：已完成→巡检日期，待执行→截止日期 -->
      <template v-if="taskInfo.source === '任务推送'">
        <div class="info-row" v-if="taskInfo.status === '已完成'"><span class="il">巡检日期</span><span class="iv">{{ taskInfo.inspectionDate }}</span></div>
        <div class="info-row" v-else><span class="il">截止日期</span><span class="iv">{{ taskInfo.deadline }}</span></div>
      </template>
      <!-- 系统自建：展示巡检日期 -->
      <div class="info-row" v-if="taskInfo.source === '系统自建' && taskInfo.inspectionDate"><span class="il">巡检日期</span><span class="iv">{{ taskInfo.inspectionDate }}</span></div>
      <div class="info-row"><span class="il">状态</span>
        <span class="iv" :style="{color:taskInfo.status==='已完成'?'#34a853':'#f5a623',fontWeight:600}">{{ taskInfo.status }}</span>
      </div>
    </div>

    <!-- ===== 任务推送：检查项（仅作查看，无标签/照片/说明） ===== -->
    <template v-if="isPush">
      <div class="tree-layout">
        <div class="tree-side">
          <button v-for="cat in categoryTree" :key="cat.id" class="tree-node" :class="{ active: activeId === cat.id }" @click="activeId = cat.id">
            <span class="tree-label">{{ cat.label }}</span>
            <span class="tree-badge">{{ cat.items.length }}</span>
          </button>
        </div>
        <div class="content-side">
          <div class="cs-header">{{ activeCat?.label }}（{{ activeItems.length }}项）</div>
          <div v-for="item in activeItems" :key="item.id" class="cs-item">
            <div class="ci-top">
              <span class="ci-label">{{ item.label }}</span>
            </div>
          </div>
          <div v-if="!activeItems.length" class="cs-empty">暂无检查项</div>
        </div>
      </div>
    </template>

    <!-- ===== 巡检结果 ===== -->
    <div v-if="taskInfo.status === '已完成'" class="result-section">
      <div class="section-title">巡检结果</div>

      <!-- 全部正常 -->
      <div v-if="taskInfo.result === 'normal'" class="result-normal">
        <div class="result-status ok">✓ 全部正常</div>
        <div v-if="taskInfo.normalPhotos?.length" class="result-photos">巡检照片：{{ taskInfo.normalPhotos.join('、') }}</div>
      </div>

      <!-- 有隐患 -->
      <div v-if="taskInfo.result === 'hazard'">
        <div class="result-status hazard">⚠ 有隐患（{{ taskInfo.hazardItems.length }}项）</div>
        <div v-for="(hi, idx) in taskInfo.hazardItems" :key="idx" class="hazard-item">
          <div class="hazard-title">隐患 {{ idx + 1 }}</div>
          <div class="hazard-desc">{{ hi.desc }}</div>
          <div v-if="hi.photos?.length" class="hazard-photos">隐患照片：{{ hi.photos.join('、') }}</div>
          <div v-if="hi.hasRectify" class="rectify-mini">
            <span class="rectify-label">整改单</span>
            <a class="rectify-link" @click="goRectify(hi.rectifyId)">{{ hi.rectifyNo }}</a>
            <span class="rectify-meta">{{ hi.rectifier }} · 截止{{ hi.rectifyDeadline }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.detail-page { padding:0; }
.detail-head { display:flex; align-items:center; gap:12px; margin-bottom:16px; }
.back-btn { background:none; border:1px solid #ddd; border-radius:6px; padding:4px 12px; font-size:13px; color:#666; cursor:pointer; }
.back-btn:hover { color:#8f0045; border-color:#8f0045; }
.page-title { font-size:18px; font-weight:600; color:#1f2329; margin:0; flex:1; }

/* 基本信息 */
.info-card { background:#fff; border-radius:10px; padding:16px 20px; margin-bottom:16px; box-shadow:0 1px 4px rgba(0,0,0,0.04); display:grid; grid-template-columns:1fr 1fr; gap:8px; }
.info-row { display:flex; gap:6px; font-size:13px; line-height:1.6; }
.il { color:#999; flex-shrink:0; width:72px; }
.iv { color:#1f2329; }

/* 左树右项 */
.tree-layout { display:flex; gap:0; background:#fff; border-radius:10px; overflow:hidden; box-shadow:0 1px 4px rgba(0,0,0,0.04); min-height:300px; margin-bottom:16px; }
.tree-side { width:160px; flex-shrink:0; background:#fafafa; border-right:1px solid #eee; padding:8px 0; }
.tree-node { display:flex; align-items:center; gap:6px; width:100%; padding:10px 16px; border:none; background:none; font-size:13px; color:#666; cursor:pointer; text-align:left; }
.tree-node.active { background:#fceef4; color:#8f0045; font-weight:600; }
.tree-label { flex:1; }
.tree-badge { font-size:11px; min-width:20px; height:20px; border-radius:10px; display:flex; align-items:center; justify-content:center; background:#eee; color:#999; }
.tree-node.active .tree-badge { background:rgba(143,0,69,0.12); color:#8f0045; }
.content-side { flex:1; padding:16px 20px; }
.cs-header { font-size:14px; font-weight:600; color:#1f2329; margin-bottom:12px; padding-bottom:8px; border-bottom:1px solid #eee; }
.cs-item { padding:12px; border-radius:6px; margin-bottom:8px; background:#fafafa; }
.ci-top { display:flex; align-items:center; gap:8px; }
.ci-label { font-size:13px; font-weight:500; color:#1f2329; flex:1; }
.cs-empty { text-align:center; padding:40px 0; color:#999; font-size:13px; }

/* 巡检结果 */
.result-section { background:#fff; border-radius:8px; padding:16px 20px; margin-bottom:16px; }
.section-title { font-size:14px; font-weight:600; color:#1f2329; margin-bottom:12px; padding-left:10px; border-left:3px solid #8f0045; }
.result-status { font-size:13px; font-weight:600; margin-bottom:10px; }
.result-status.ok { color:#34a853; }
.result-status.hazard { color:#e53935; }
.result-photos { font-size:12px; color:#999; }
.result-normal {  }

.hazard-item { padding:10px 0; border-bottom:1px solid #f0f0f0; }
.hazard-item:last-child { border-bottom:none; }
.hazard-title { font-size:13px; font-weight:600; color:#e53935; margin-bottom:4px; }
.hazard-desc { font-size:13px; color:#1f2329; margin-bottom:4px; line-height:1.5; }
.hazard-photos { font-size:12px; color:#999; margin-bottom:4px; }

.rectify-mini { display:flex; gap:6px; align-items:center; font-size:12px; color:#666; margin-top:4px; padding:6px 8px; background:#fafafa; border-radius:4px; }
.rectify-label { color:#999; flex-shrink:0; }
.rectify-link { color:#e53935; font-weight:600; cursor:pointer; text-decoration:underline; }
.rectify-link:hover { opacity:0.8; }
.rectify-meta { color:#999; }
</style>
