<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { listMobileInspectionTasks } from '../../mock/mobileInspectionTasks'

const router = useRouter()

/** 直接读共享 reactive，提交后列表状态可即时刷新 */
const tasks = computed(() => listMobileInspectionTasks())

const activeTab = ref('全部')
const searchKeyword = ref('')
const sourceFilter = ref('')
const categoryFilter = ref('')
const typeFilter = ref('')
const tabs = computed(() => {
  const counts = { '全部': tasks.value.length }
  for (const t of tasks.value) {
    counts[t.status] = (counts[t.status] || 0) + 1
  }
  return ['全部', '待执行', '已完成'].filter(t => (counts[t] || 0) > 0 || t === '全部').map(t => ({ label: t, count: counts[t] || 0 }))
})

const filteredTasks = computed(() => {
  let list = tasks.value
  if (activeTab.value !== '全部') list = list.filter(t => t.status === activeTab.value)
  if (sourceFilter.value) list = list.filter(t => t.source === sourceFilter.value)
  if (categoryFilter.value) list = list.filter(t => t.inspectionCategory === categoryFilter.value)
  if (typeFilter.value) list = list.filter(t => t.planType && (t.planType === typeFilter.value || t.planType.startsWith(typeFilter.value)))
  if (searchKeyword.value.trim()) {
    const kw = searchKeyword.value.trim()
    list = list.filter(t => t.taskNo.includes(kw) || t.planName.includes(kw) || t.project.includes(kw))
  }
  return list
})

const typeTagMap = { '周检': '#f5a623', '月检': '#4285f4', '专项': '#e53935', '专项巡检': '#e53935' }

function goExecute(id) { router.push(`/mobile/tasks/${id}/execute`) }
function goDetail(id) { router.push(`/mobile/tasks/${id}`) }
function goCreate() { router.push('/mobile/tasks/create') }
function goBack() { router.push('/') }
</script>

<template>
  <div class="mobile-page">
    <header class="m-header">
      <button class="m-back" @click="goBack">‹</button>
      <h1 class="m-title">巡检任务</h1>
      <div class="m-header-right">
        <button class="m-create-btn" @click="goCreate">＋</button>
        <span class="m-avatar">王</span>
      </div>
    </header>

    <div class="m-tabs">
      <button v-for="tab in tabs" :key="tab.label" class="m-tab" :class="{ active: activeTab === tab.label }" @click="activeTab = tab.label">
        {{ tab.label }}<span class="m-tab-count">{{ tab.count }}</span>
      </button>
    </div>

    <!-- 筛选栏 -->
    <div class="m-filter">
      <input v-model="searchKeyword" class="m-search-input" placeholder="搜索编号/名称/项目..." />
      <div class="m-source-chips">
        <button class="m-chip" :class="{ active: sourceFilter === '' }" @click="sourceFilter = ''">全部</button>
        <button class="m-chip push" :class="{ active: sourceFilter === '任务推送' }" @click="sourceFilter = '任务推送'">任务推送</button>
        <button class="m-chip self" :class="{ active: sourceFilter === '系统自建' }" @click="sourceFilter = '系统自建'">系统自建</button>
      </div>
      <div class="m-type-chips">
        <button class="m-chip" :class="{ active: categoryFilter === '' }" @click="categoryFilter = ''">全部分类</button>
        <button class="m-chip" :class="{ active: categoryFilter === '安全' }" @click="categoryFilter = '安全'">安全</button>
        <button class="m-chip" :class="{ active: categoryFilter === '质量' }" @click="categoryFilter = '质量'">质量</button>
      </div>
      <div class="m-type-chips">
        <button class="m-chip" :class="{ active: typeFilter === '' }" @click="typeFilter = ''">全部类型</button>
        <button class="m-chip" :class="{ active: typeFilter === '周检' }" @click="typeFilter = '周检'">周检</button>
        <button class="m-chip" :class="{ active: typeFilter === '月检' }" @click="typeFilter = '月检'">月检</button>
        <button class="m-chip" :class="{ active: typeFilter === '专项巡检' }" @click="typeFilter = '专项巡检'">专项巡检</button>
      </div>
    </div>

    <div class="m-list">
      <template v-for="(task, idx) in filteredTasks" :key="task.id">
        <!-- 分组标题 -->
        <div v-if="idx === 0 || filteredTasks[idx-1].source !== task.source" class="m-section-title">
          <span class="m-section-label">{{ task.source }}</span>
          <span class="m-section-count">{{ filteredTasks.filter(t => t.source === task.source).length }}项</span>
        </div>
        <div class="m-task-card" :class="task.source" @click="task.status === '待执行' ? goExecute(task.id) : goDetail(task.id)">
        <div class="m-task-top">
          <span class="m-task-icon">📋</span>
          <div class="m-task-info">
            <div class="m-task-name-row">
              <span class="m-task-name">{{ task.taskNo }}</span>
              <span class="m-task-source" style="font-size:10px;padding:1px 5px;border-radius:3px" :style="{ background: task.source==='任务推送'?'#e8f0fe':'#fceef4', color: task.source==='任务推送'?'#4285f4':'#8f0045' }">{{ task.source }}</span>
              <span v-if="task.overdue" class="m-overdue-badge">⚠ 已逾期</span>
            </div>
            <span class="m-task-project">{{ task.project }}</span>
            <div v-if="task.source==='任务推送'" style="display:flex;gap:6px;font-size:11px;color:#999;margin-top:2px">
              <span>{{ task.planName }}</span>
              <span v-if="task.planNo">· {{ task.planNo }}</span>
            </div>
            <span v-if="task.hasRectify" class="m-rectify-badge">📋 已发整改单</span>
          </div>
        </div>
        <div class="m-task-mid">
          <span class="m-type-tag" :style="{ background: task.inspectionCategory === '质量' ? '#fff3e0' : '#e8f5e9', color: task.inspectionCategory === '质量' ? '#e67e22' : '#34a853' }">{{ task.inspectionCategory }}</span>
          <span class="m-type-tag" :style="{ background: typeTagMap[task.planType] + '20', color: typeTagMap[task.planType] }">{{ task.planType }}</span>
          <span class="m-task-status-label" :style="{ color: task.status === '待执行' ? '#f5a623' : '#34a853' }">{{ task.status === '待执行' ? '待执行' : '已完成' }}</span>
        </div>
        <div class="m-task-bottom">
          <span>执行人：{{ task.executor }}</span>
          <span>截止：{{ task.deadline }}</span>
          <span>{{ task.itemCount }} 项</span>
        </div>
        </div>
      </template>
      <div v-if="filteredTasks.length === 0" class="m-empty"><p>暂无任务</p></div>
      <div v-if="filteredTasks.length > 0" class="m-more">—— 没有更多了 ——</div>
    </div>
  </div>
</template>

<style scoped>

.mobile-page { width:100%; max-width:402px; margin:0 auto; min-height:100vh; background:#f5f5f5; font-family:'PingFang SC',-apple-system,sans-serif; padding-bottom:env(safe-area-inset-bottom,0); position:relative; box-shadow:0 0 20px rgba(0,0,0,0.05); }

/* 筛选 */
.m-filter { padding:8px 16px; background:#fff; border-bottom:1px solid #eee; }
.m-search-input { width:100%; padding:8px 12px; border:1px solid #ddd; border-radius:8px; font-size:13px; background:#fafafa; box-sizing:border-box; outline:none; }
.m-search-input:focus { border-color:#8f0045; background:#fff; }
.m-source-chips { display:flex; gap:6px; margin-top:8px; }
.m-type-chips { display:flex; gap:6px; margin-top:6px; }
.m-chip { padding:4px 12px; border:1px solid #ddd; border-radius:12px; background:#fff; font-size:12px; color:#666; cursor:pointer; }
.m-chip.active { background:#fceef4; color:#8f0045; border-color:#8f0045; font-weight:500; }

.m-section-title { display:flex; align-items:center; gap:8px; padding:12px 16px 4px; font-size:13px; color:#999; }
.m-section-label { font-weight:600; color:#666; }
.m-section-count { font-size:11px; }
.m-header { display:flex; align-items:center; padding:12px 16px; background:#8f0045; color:#fff; position:sticky; top:0; z-index:10; }
.m-back { background:none; border:none; color:#fff; font-size:28px; padding:0 4px 0 0; line-height:1; cursor:pointer; }
.m-title { flex:1; font-size:18px; font-weight:600; margin:0; }
.m-header-right { display:flex; align-items:center; gap:8px; }
.m-create-btn { background:rgba(255,255,255,0.2); border:none; color:#fff; font-size:22px; width:32px; height:32px; border-radius:50%; cursor:pointer; display:flex; align-items:center; justify-content:center; line-height:1; }
.m-avatar { width:32px; height:32px; border-radius:50%; background:rgba(255,255,255,0.2); display:flex; align-items:center; justify-content:center; font-size:14px; font-weight:600; }
.m-tabs { display:flex; gap:0; padding:10px 16px; background:#fff; overflow-x:auto; border-bottom:1px solid #eee; }
.m-tab { flex-shrink:0; display:flex; align-items:center; gap:4px; padding:6px 14px; border:none; background:none; font-size:13px; color:#666; cursor:pointer; border-radius:16px; white-space:nowrap; }
.m-tab.active { background:#fceef4; color:#8f0045; font-weight:600; }
.m-tab-count { font-size:11px; min-width:18px; height:18px; border-radius:9px; display:inline-flex; align-items:center; justify-content:center; background:#f0f0f0; padding:0 5px; }
.m-tab.active .m-tab-count { background:rgba(143,0,69,0.12); }
.m-list { padding:12px 16px; display:flex; flex-direction:column; gap:10px; }
.m-task-card { background:#fff; border-radius:12px; padding:14px 16px; cursor:pointer; box-shadow:0 1px 4px rgba(0,0,0,0.04); }
.m-task-top { display:flex; align-items:flex-start; gap:10px; margin-bottom:6px; }
.m-task-icon { font-size:20px; flex-shrink:0; }
.m-task-info { flex:1; display:flex; flex-direction:column; gap:2px; }
.m-task-name-row { display:flex; align-items:center; gap:6px; }
.m-task-name { font-size:15px; font-weight:600; color:#1f2329; }
.m-overdue-badge { font-size:10px; color:#e53935; background:#ffebee; padding:1px 6px; border-radius:3px; flex-shrink:0; }
.m-rectify-badge { font-size:10px; color:#8f0045; background:#fceef4; padding:1px 6px; border-radius:3px; display:inline-block; margin-top:2px; }
.m-task-project { font-size:12px; color:#999; }
.m-task-mid { display:flex; align-items:center; gap:8px; margin-bottom:8px; }
.m-type-tag { font-size:10px; padding:1px 6px; border-radius:3px; font-weight:500; }
.m-task-status-label { font-size:11px; font-weight:500; }
.m-task-bottom { display:flex; gap:16px; font-size:12px; color:#999; }
.m-empty { text-align:center; padding:40px 0; color:#999; font-size:14px; }
.m-more { text-align:center; padding:16px 0; color:#ccc; font-size:12px; }
</style>
