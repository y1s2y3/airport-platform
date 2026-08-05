<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getMobileInspectionTask } from '../../mock/mobileInspectionTasks'
import { DEFAULT_INSPECTOR_LABEL } from '../../config/inspectionManagement'

const route = useRoute()
const router = useRouter()

/** 静态补充详情（列表 seed 字段不全时兜底，避免白屏） */
const taskMap = {
  'mt-001': {
    taskNo: 'AQXJ20260728001',
    planName: '7月第4周安全巡检',
    planNo: 'AQXJ20260719001',
    planType: '周检',
    inspectionCategory: '安全',
    project: '飞行区跑道延长工程',
    executor: '监理',
    source: '任务推送',
    inspector: '监理',
    companions: [],
    deadline: '2026-07-28',
    inspDate: '2026-07-28',
    status: '待执行',
    submittedAt: '',
    result: '',
    normalPhotos: [],
    hazardItems: [],
  },
  'mt-002': {
    taskNo: 'AQXJ20260720002',
    planName: '临时用电专项检查',
    planNo: 'AQXJ20260718001',
    planType: '专项巡检',
    inspectionCategory: '安全',
    project: 'T3航站楼扩建工程',
    executor: '监理',
    source: '任务推送',
    inspector: '监理',
    companions: [],
    deadline: '2026-07-20',
    inspDate: '2026-07-20',
    status: '已完成',
    submittedAt: '2026-07-19 15:30',
    result: 'hazard',
    normalPhotos: [],
    hazardItems: [
      {
        desc: '五芯电缆破损，线路未按规范敷设',
        photos: ['📷 隐患照片1'],
        hasRectify: true,
        rectifyNo: 'ZG202607001',
        rectifyPerson: '刘工（专职安全员）',
        reviewPerson: DEFAULT_INSPECTOR_LABEL,
        rectifyDeadline: '2026-07-30',
      },
      {
        desc: '电缆线路沿地明敷未做保护',
        photos: ['📷 隐患照片1'],
        hasRectify: true,
        rectifyNo: 'ZG202607002',
        rectifyPerson: '刘工（专职安全员）',
        reviewPerson: DEFAULT_INSPECTOR_LABEL,
        rectifyDeadline: '2026-07-30',
      },
    ],
  },
  'mt-003': {
    taskNo: 'AQXJ20260721003',
    planName: '7月第三周安全巡检',
    planNo: 'AQXJ20260714001',
    planType: '周检',
    inspectionCategory: '安全',
    project: 'T3航站楼扩建工程',
    executor: '监理',
    source: '任务推送',
    inspector: '监理',
    companions: [],
    deadline: '2026-07-21',
    inspDate: '2026-07-20',
    status: '已完成',
    submittedAt: '2026-07-20 11:20',
    result: 'normal',
    normalPhotos: ['📷 巡检照片1', '📷 巡检照片2'],
    hazardItems: [],
  },
  'mt-004': {
    taskNo: 'ZLXJ20260731004',
    planName: '',
    source: '系统自建',
    inspectionCategory: '质量',
    project: '新货运站建设工程',
    executor: '当前用户',
    inspType: '月检',
    inspector: '当前用户',
    companions: [],
    deadline: '2026-07-31',
    inspDate: '2026-07-31',
    status: '已完成',
    submittedAt: '2026-07-31 10:00',
    result: 'normal',
    normalPhotos: ['📷 巡检照片1'],
    hazardItems: [],
  },
  'mt-005': {
    taskNo: 'ZLXJ20260728005',
    planName: '',
    source: '系统自建',
    inspectionCategory: '质量',
    project: '飞行区跑道延长工程',
    executor: '当前用户',
    inspType: '专项巡检',
    inspector: '当前用户',
    companions: ['吴工'],
    deadline: '2026-07-28',
    inspDate: '2026-07-28',
    status: '已完成',
    submittedAt: '2026-07-28 10:30',
    result: 'hazard',
    normalPhotos: [],
    hazardItems: [
      {
        desc: '电缆破损，存在安全隐患',
        photos: ['📷 隐患照片1'],
        hasRectify: true,
        rectifyNo: 'ZG202607003',
        rectifyPerson: '赵工（项目经理）',
        rectifyDeadline: '2026-08-05',
      },
    ],
  },
}

function normalizeTaskDetail(raw) {
  if (!raw) return null
  return {
    taskNo: raw.taskNo || '—',
    planName: raw.planName || '',
    planNo: raw.planNo || '',
    planType: raw.planType || raw.inspType || '—',
    inspType: raw.inspType || raw.planType || '—',
    inspectionCategory: raw.inspectionCategory || '安全',
    project: raw.project || '—',
    executor: raw.executor || '—',
    source: raw.source || '任务推送',
    inspector: raw.inspector || raw.executor || '—',
    companions: Array.isArray(raw.companions) ? raw.companions : [],
    deadline: raw.deadline || '—',
    inspDate: raw.inspDate || raw.deadline || '—',
    status: raw.status || '待执行',
    submittedAt: raw.submittedAt || '',
    result: raw.result || '',
    normalPhotos: Array.isArray(raw.normalPhotos) ? raw.normalPhotos : [],
    hazardItems: Array.isArray(raw.hazardItems) ? raw.hazardItems : [],
  }
}

const taskInfo = computed(() => {
  const id = String(route.params.id || '')
  const fromStore = getMobileInspectionTask(id)
  const fromMap = taskMap[id]
  // 优先 store（含刚提交的隐患结果），静态 map 补全缺失字段
  const merged = fromStore || fromMap ? { ...(fromMap || {}), ...(fromStore || {}) } : taskMap['mt-001']
  return normalizeTaskDetail(merged)
})

const isPush = computed(() => taskInfo.value.source === '任务推送')
const hazardCount = computed(() => taskInfo.value.hazardItems.length)
const rectifyCount = computed(() => taskInfo.value.hazardItems.filter((h) => h.hasRectify).length)

function goBack() {
  router.push('/mobile/tasks')
}
</script>

<template>
  <div class="mp">
    <header class="mh">
      <button class="mb" @click="goBack">‹</button>
      <h1 class="mt">检查结果</h1>
      <span v-if="taskInfo.status === '已完成'" style="color: #34a853; font-size: 13px; font-weight: 600">✓ 已完成</span>
      <span v-else style="color: #f5a623; font-size: 13px; font-weight: 600">待执行</span>
    </header>

    <div class="task-bar">
      <div class="task-bar-name">{{ taskInfo.taskNo }}</div>
      <div v-if="isPush" style="font-size: 13px; font-weight: 500; color: #1f2329; margin-bottom: 2px">{{ taskInfo.planName }}</div>
      <div class="task-bar-info">
        <span>{{ taskInfo.project }}</span>
        <span class="src-tag" :style="{ background: isPush ? '#e8f0fe' : '#fceef4', color: isPush ? '#4285f4' : '#8f0045' }">{{ taskInfo.source }}</span>
      </div>
    </div>

    <div class="sc-card">
      <div class="sc-title">巡检信息</div>
      <div class="sc-row"><span class="sc-lbl">巡检任务单编号</span><span>{{ taskInfo.taskNo }}</span></div>
      <div v-if="isPush" class="sc-row"><span class="sc-lbl">计划名称</span><span>{{ taskInfo.planName }}</span></div>
      <div v-if="isPush" class="sc-row"><span class="sc-lbl">计划编号</span><span>{{ taskInfo.planNo }}</span></div>
      <div class="sc-row"><span class="sc-lbl">任务来源</span><span>{{ taskInfo.source }}</span></div>
      <div class="sc-row"><span class="sc-lbl">项目名称</span><span>{{ taskInfo.project }}</span></div>
      <div class="sc-row"><span class="sc-lbl">执行人</span><span>{{ taskInfo.executor || '-' }}</span></div>
      <div class="sc-row"><span class="sc-lbl">巡检分类</span><span>{{ taskInfo.inspectionCategory }}</span></div>
      <div class="sc-row"><span class="sc-lbl">同行人</span><span>{{ taskInfo.companions.length ? taskInfo.companions.join('、') : '-' }}</span></div>
      <div class="sc-row"><span class="sc-lbl">巡检类型</span><span>{{ isPush ? taskInfo.planType : taskInfo.inspType }}</span></div>
      <div class="sc-row"><span class="sc-lbl">巡检日期</span><span>{{ taskInfo.inspDate }}</span></div>
      <div class="sc-row"><span class="sc-lbl">状态</span><span style="color: #34a853; font-weight: 600">{{ taskInfo.status }}</span></div>
    </div>

    <div class="sc-card">
      <div class="sc-title">巡检结果</div>
      <div class="sc-row">
        <span class="sc-lbl">结果</span>
        <span :style="{ color: taskInfo.result === 'hazard' ? '#e53935' : '#34a853', fontWeight: 600 }">
          {{ taskInfo.result === 'hazard' ? `⚠ 有隐患（${hazardCount}项）` : taskInfo.result === 'normal' ? '✓ 全部正常' : '—' }}
        </span>
      </div>
      <div v-if="taskInfo.result === 'normal' && taskInfo.normalPhotos.length" class="sc-row">
        <span class="sc-lbl">巡检照片</span>
        <span>{{ taskInfo.normalPhotos.join('、') }}</span>
      </div>
    </div>

    <div v-if="taskInfo.result === 'hazard'" class="hazard-area">
      <div class="sc-card" style="margin: 0 0 10px">
        <div class="sc-title">隐患清单</div>
      </div>
      <div v-for="(hi, i) in taskInfo.hazardItems" :key="i" class="hazard-card">
        <div class="hazard-header">⚠ 隐患 {{ i + 1 }}</div>
        <div class="sc-row"><span class="sc-lbl">隐患说明</span><span>{{ hi.desc }}</span></div>
        <div class="sc-row" v-if="hi.photos?.length"><span class="sc-lbl">隐患照片</span><span>{{ hi.photos.join('、') }}</span></div>
        <div v-if="hi.hasRectify" class="rectify-card">
          <div class="rectify-title">📋 整改单</div>
          <div class="sc-row"><span class="sc-lbl">整改单编号</span><span class="rectify-no">{{ hi.rectifyNo }}</span></div>
          <div class="sc-row"><span class="sc-lbl">整改人</span><span>{{ hi.rectifyPerson }}</span></div>
          <div class="sc-row"><span class="sc-lbl">复查人</span><span>{{ hi.reviewPerson || '-' }}</span></div>
          <div class="sc-row"><span class="sc-lbl">整改截止日期</span><span>{{ hi.rectifyDeadline }}</span></div>
        </div>
      </div>
    </div>

    <div class="bottom-bar">
      <div v-if="taskInfo.status === '已完成' && taskInfo.result === 'hazard'" class="bottom-info warn">
        ⚠ 已发现 {{ hazardCount }} 项隐患，已下发 {{ rectifyCount }} 份整改单
      </div>
      <div v-else-if="taskInfo.status === '已完成'" class="bottom-info ok">✓ 全部正常，无需整改</div>
      <div v-else class="bottom-info" style="color: #f5a623; font-weight: 500; text-align: center">待执行，请先完成巡检</div>
    </div>
  </div>
</template>

<style scoped>
.mp { width:100%; max-width:402px; margin:0 auto; min-height:100vh; background:#f5f5f5; font-family:'PingFang SC',-apple-system,sans-serif; padding-bottom:env(safe-area-inset-bottom,0); }
.mh { display:flex; align-items:center; padding:12px 16px; background:#8f0045; color:#fff; position:sticky; top:0; z-index:10; }
.mb { background:none; border:none; color:#fff; font-size:28px; padding:0 4px 0 0; line-height:1; cursor:pointer; }
.mt { flex:1; font-size:18px; font-weight:600; margin:0; }

.task-bar { background:#fff; padding:12px 16px; border-bottom:1px solid #eee; }
.task-bar-name { font-size:15px; font-weight:600; color:#1f2329; margin-bottom:2px; }
.task-bar-info { display:flex; gap:8px; font-size:12px; color:#999; flex-wrap:wrap; align-items:center; margin-top:4px; }
.src-tag { font-size:11px; padding:1px 5px; border-radius:3px; }

.sc-card { background:#fff; border-radius:10px; padding:14px; box-shadow:0 1px 3px rgba(0,0,0,0.04); margin:12px 16px; }
.sc-title { font-size:13px; font-weight:600; color:#1f2329; margin-bottom:8px; padding-left:8px; border-left:3px solid #8f0045; }
.sc-row { display:flex; gap:6px; font-size:13px; line-height:1.6; margin-bottom:3px; }
.sc-row:last-child { margin-bottom:0; }
.sc-lbl { color:#999; flex-shrink:0; width:72px; }

.hazard-area { margin:0 16px 12px; }
.hazard-card { background:#fff; border-radius:10px; padding:14px; margin-bottom:10px; box-shadow:0 1px 3px rgba(0,0,0,0.04); }
.hazard-header { font-size:13px; font-weight:600; color:#e53935; margin-bottom:8px; }
.rectify-card { margin-top:10px; padding:10px; background:#fafafa; border-radius:8px; border:1px solid #eee; }
.rectify-title { font-size:12px; font-weight:600; color:#8f0045; margin-bottom:6px; }
.rectify-no { color:#8f0045; font-weight:600; }

.bottom-bar { padding:12px 16px 24px; }
.bottom-info { font-size:13px; text-align:center; padding:10px; border-radius:8px; }
.bottom-info.warn { background:#fff3e0; color:#e67e22; }
.bottom-info.ok { background:#e8f5e9; color:#34a853; }
</style>
