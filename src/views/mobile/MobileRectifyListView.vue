<script setup>
import { ref, computed, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { mobileRectificationRecords } from '../../composables/useMobileRectification'
import { INSPECTION_CATEGORIES, getHazardCategoryFilterOptions, getHazardLevels, matchesHazardCategoryFilter, normalizeInspectionCategories } from '../../config/inspectionManagement'
import { useMobileRouteBase } from '../../composables/useMobileRouteBase'
import InspectionVoidStamp from '../../components/InspectionVoidStamp.vue'
import { isInspectionRectificationOverdue } from '../../utils/inspectionLedgerDates'
import { confirmInspectionVoidDelete } from '../../composables/useInspectionVoidDelete'
import { canDeleteInspectionRectification, canExecuteInspectionStep } from '../../utils/inspectionWorkflowIdentity'

defineProps({
  /** 嵌在建管 APP 二级页时隐藏自带顶栏，避免双顶栏 */
  embedded: { type: Boolean, default: false },
})

import { RECTIFICATION_STATUSES, currentWorkflowStep, currentWorkflowLabel, isInspectionRectificationReturned, isInspectionVoidPending } from '../../utils/inspectionRectificationWorkflow'
const router = useRouter()
const route = useRoute()
const { rectifyBase, tasksBase } = useMobileRouteBase()

const rectifyList = computed(() => mobileRectificationRecords.filter(record => !record.deletion))

const activeTab = ref('全部')
if (RECTIFICATION_STATUSES.includes(route.query.tab)) activeTab.value = route.query.tab

const searchKeyword = ref('')
const hazardCategory = ref('')
const hazardLevel = ref('')
const categoryFilter = ref('')
const hazardCategoryOptions = computed(() => getHazardCategoryFilterOptions(categoryFilter.value))
const hazardLevelOptions = computed(() => getHazardLevels(categoryFilter.value))
watch(categoryFilter, () => { hazardCategory.value = ''; hazardLevel.value = '' })
const tabs = computed(() => {
  const counts = { '全部': rectifyList.value.length }
  for (const t of rectifyList.value) {
    counts[t.status] = (counts[t.status] || 0) + 1
  }
  return ['全部', ...RECTIFICATION_STATUSES].filter(t => (counts[t] || 0) > 0 || t === '全部').map(t => ({ label: t, count: counts[t] || 0 }))
})

const filteredList = computed(() => {
  let list = rectifyList.value
  if (categoryFilter.value) list = list.filter(t => normalizeInspectionCategories(t.inspectionCategories || t.inspectionCategory).includes(categoryFilter.value))
  if (activeTab.value !== '全部') {
    list = list.filter(t => t.status === activeTab.value)
  }
  if (searchKeyword.value.trim()) {
    const kw = searchKeyword.value.trim()
    list = list.filter(t => t.rectifyNo?.includes(kw) || t.taskNo?.includes(kw) || t.project?.includes(kw) || t.hazard?.includes(kw))
  }
  if (hazardCategory.value) list = list.filter(t => matchesHazardCategoryFilter(t, hazardCategory.value))
  if (hazardLevel.value) list = list.filter(t => t.hazardLevel === hazardLevel.value)
  return list
})

const statusStyles = {
  '待整改': { color:'#f5a623', bg:'#fff8e6' },
  '待验收': { color:'#4285f4', bg:'#e8f0fe' },
  '待复查': { color:'#8f0045', bg:'#fceef4' },
  '已关闭': { color:'#34a853', bg:'#e8f5e9' },
  '已作废': { color:'#656b75', bg:'#edf0f4' },
}

function goExecute(id) { router.push(`${rectifyBase.value}/${id}/execute?tab=${activeTab.value}`) }
function goReview(id) { router.push(`${rectifyBase.value}/${id}/review?tab=${activeTab.value}`) }
function goApproval(id) { router.push(`${rectifyBase.value}/${id}/approval?tab=${activeTab.value}`) }
function goDetail(id) { router.push(`${rectifyBase.value}/${id}?tab=${activeTab.value}`) }
function goBack() { router.push(tasksBase.value) }

function canHandleReview(item, step = currentWorkflowStep(item)) {
  return item.status === '待复查' && ['approval', 'departmentConfirmation'].includes(step?.key)
    && canExecuteInspectionStep(item, step.key)
}

function onCardClick(item) {
  const step = currentWorkflowStep(item)
  // 作废审批中：作废审批人点卡片直接进审批页，其他人进详情查看「作废中」状态。
  if (step?.key === 'voidApproval') {
    return canExecuteInspectionStep(item, 'voidApproval') ? goApproval(item.id) : goDetail(item.id)
  }
  if (!canExecuteInspectionStep(item, step?.key)) return goDetail(item.id)
  // 施工方项目经理验收也属于“待整改”，当前节点为验收时进入验收页。
  if (item.status === '待整改') return step?.key === 'contractorAcceptance' ? goReview(item.id) : goExecute(item.id)
  if (item.status === '待验收') return goReview(item.id)
  if (canHandleReview(item, step)) return goApproval(item.id)
  return goDetail(item.id)
}
</script>

<template>
  <div class="mp" :class="{ embedded }">
    <header v-if="!embedded" class="mh">
      <button class="mb" @click="goBack">‹</button>
      <h1 class="mt">整改复查</h1>
      <span style="font-size:12px;opacity:0.7">{{ rectifyList.length }} 单</span>
    </header>
    <div class="m-tabs">
      <button v-for="tab in tabs" :key="tab.label" class="m-tab" :class="{ active: activeTab === tab.label }" @click="activeTab = tab.label">
        {{ tab.label }}<span class="m-tab-count">{{ tab.count }}</span>
      </button>
    </div>
    <div class="m-filter">
      <input v-model="searchKeyword" class="m-search-input" placeholder="搜索整改单编号/巡检单编号..." />
      <select v-model="categoryFilter" class="m-category-select" aria-label="巡检分类筛选">
        <option value="">全部巡检分类</option>
        <option v-for="category in INSPECTION_CATEGORIES" :key="category" :value="category">{{ category }}</option>
      </select>
      <select v-model="hazardCategory" class="m-category-select">
        <option value="">全部隐患类别</option>
        <option v-for="option in hazardCategoryOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
      </select>
      <select v-model="hazardLevel" class="m-category-select" aria-label="隐患等级筛选">
        <option value="">全部隐患等级</option>
        <option v-for="level in hazardLevelOptions" :key="level" :value="level">{{ level }}</option>
      </select>
    </div>
    <div class="m-list">
      <div v-for="item in filteredList" :key="item.id" class="rec-card"
        role="button"
        tabindex="0"
        @click="onCardClick(item)"
        @keydown.enter.prevent="onCardClick(item)"
        @keydown.space.prevent="onCardClick(item)">
        <div class="rec-top">
          <span class="rec-icon" :class="{ overdue: isInspectionRectificationOverdue(item) }">⚠</span>
          <div class="rec-info">
            <div class="rec-name-row">
              <span class="rec-name">{{ item.rectifyNo }}</span>
              <span style="font-size:11px;color:#999">{{ item.taskNo }}</span>
              <span v-if="isInspectionRectificationOverdue(item)" class="rec-overdue">⚠ 已逾期</span>
            </div>
            <span class="rec-project">{{ item.project }}</span>
            <span class="rec-project rec-category-row">
              巡检分类：
              <span
                v-for="category in normalizeInspectionCategories(item.inspectionCategories || item.inspectionCategory)"
                :key="category"
                class="rec-category-tag"
                :class="category === '质量' ? 'quality' : 'safety'"
              >{{ category }}</span>
            </span>
            <span class="rec-project">隐患类别：{{ item.hazardCategory }}</span>
            <span class="rec-project">隐患等级：{{ item.hazardLevel || '未设置' }}</span>
          </div>
          <div class="rec-status-group">
            <span class="rec-status" :style="{ color: statusStyles[item.status]?.color, background: statusStyles[item.status]?.bg }">{{ item.status }}</span>
            <InspectionVoidStamp v-if="isInspectionVoidPending(item)" />
          </div>
        </div>
        <div class="rec-mid">
          <span>当前流程节点：{{ currentWorkflowLabel(item) }}</span>
        </div>
        <div v-if="item.isRejected&&item.rejectReason" class="rec-reject">❌ 退回原因：{{ item.rejectReason }}</div>
        <div v-if="item.approvalRejected&&item.approvalReason" class="rec-reject">❌ 审批退回：{{ item.approvalReason }}</div>
        <div class="rec-bottom">
          <span v-if="item.status==='待整改'">截止：{{ item.deadline }}</span>
          <span v-else-if="item.status==='待验收'">提交：{{ item.submitDate }}</span>
          <span v-else-if="item.status === '已作废'">作废时间：{{ item.closeDate || '--' }}</span>
          <span v-else-if="item.status === '已关闭'">已关闭：{{ item.closeDate }}</span>
          <button
            v-if="isInspectionRectificationReturned(item) && canExecuteInspectionStep(item, 'rectify')"
            type="button"
            class="rec-process"
            @click.stop="goExecute(item.id)"
            @keydown.stop
          >编辑</button>
          <button
            v-if="canHandleReview(item)"
            type="button"
            class="rec-process"
            @click.stop="goApproval(item.id)"
            @keydown.stop
          >处理</button>
          <button
            v-if="canDeleteInspectionRectification(item)"
            type="button"
            class="rec-delete"
            @click.stop="confirmInspectionVoidDelete(item)"
            @keydown.stop
          >删除</button>
        </div>
      </div>
      <div v-if="filteredList.length===0" class="m-empty">暂无数据</div>
    </div>
  </div>
</template>

<style scoped>
.mp { width:100%; max-width:402px; margin:0 auto; min-height:100vh; background:#f5f5f5; font-family:'PingFang SC',-apple-system,sans-serif; padding-bottom:env(safe-area-inset-bottom,0); }
.mp.embedded { min-height:0; }
.mh { display:flex; align-items:center; padding:12px 16px; background:#8f0045; color:#fff; position:sticky; top:0; z-index:10; }
.mb { background:none; border:none; color:#fff; font-size:28px; padding:0 4px 0 0; line-height:1; cursor:pointer; }
.mt { flex:1; font-size:18px; font-weight:600; margin:0; }
.m-tabs { display:flex; padding:10px 16px; background:#fff; overflow-x:auto; border-bottom:1px solid #eee; }
.m-tab { flex-shrink:0; display:flex; align-items:center; gap:4px; padding:6px 14px; border:none; background:none; font-size:13px; color:#666; cursor:pointer; border-radius:16px; white-space:nowrap; }
.m-tab.active { background:#fceef4; color:#8f0045; font-weight:600; }
.m-tab-count { font-size:11px; min-width:18px; height:18px; border-radius:9px; display:inline-flex; align-items:center; justify-content:center; background:#f0f0f0; padding:0 5px; }
.m-tab.active .m-tab-count { background:rgba(143,0,69,0.12); }
.m-filter { padding:8px 16px; background:#fff; border-bottom:1px solid #eee; display:flex; flex-wrap:wrap; gap:8px; }
.m-search-input { width:100%; padding:8px 12px; border:1px solid #ddd; border-radius:8px; font-size:13px; background:#fafafa; box-sizing:border-box; outline:none; }
.m-search-input:focus { border-color:#8f0045; background:#fff; }
.m-category-select { flex:1; min-width:0; padding:8px; border:1px solid #ddd; border-radius:8px; font-size:12px; color:#555; background:#fafafa; outline:none; }
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
.rec-category-row { display:flex; align-items:center; gap:3px; flex-wrap:wrap; }
.rec-category-tag { padding:0 5px; border-radius:3px; font-size:10px; line-height:17px; }
.rec-category-tag.safety { color:#168f55; background:#effaf4; }
.rec-category-tag.quality { color:#b36b00; background:#fdf6ec; }
.rec-status { flex-shrink:0; font-size:11px; padding:2px 8px; border-radius:4px; font-weight:500; }

.rec-mid { display:flex; gap:12px; font-size:12px; color:#999; margin-bottom:6px; flex-wrap:wrap; }
.rec-reject { font-size:12px; color:#e53935; background:#ffebee; padding:6px 8px; border-radius:6px; margin-bottom:6px; }
.rec-bottom { display:flex; align-items:center; justify-content:space-between; gap:8px; font-size:12px; color:#999; }
.rec-status-group { display:flex; flex-direction:column; align-items:flex-end; gap:6px; flex-shrink:0; }
.rec-card:focus-visible { outline:2px solid #8f0045; outline-offset:2px; }
.rec-delete { min-height:34px; padding:4px 12px; border:1px solid #f2cbc6; border-radius:6px; background:#fff5f4; color:#b52f22; cursor:pointer; }
.m-empty { text-align:center; padding:40px 0; color:#999; font-size:14px; }
.rec-process { margin-left:auto; padding:4px 10px; border:1px solid #8f0045; border-radius:5px; color:#8f0045; background:#fff; font-size:12px; cursor:pointer; }
</style>
