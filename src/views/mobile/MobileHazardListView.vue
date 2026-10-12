<script setup>
/**
 * APP · 危大工程清单列表
 * 字段与 WEB「危大清单」列表保持一致：
 * 危大工程类别 / 危大工程名称 / 分包单位 / 责任人 / 施工部位 / 计划时间 /
 * 施工时间 / 施工进度 / 安全状态（管控要点已落实数）/ 施工情况
 */
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getAppSelectedOrg } from '../../mock/appSession.js'
import { DEFAULT_PROJECT_ID, HQ_PROJECT_OPTION } from '../../config/projectOptions.js'
import { selectedProjectId } from '../../composables/useCurrentProject.js'
import {
  buildLedgerRows,
  ensureMajorHazardData,
  getLedgerEndDate,
  getLedgerStartDate,
  getLedgerStatus,
  getMajorHazardData,
} from '../../utils/majorHazardManualStorage.js'

const router = useRouter()
const route = useRoute()
const tick = ref(0)
const keyword = ref('')
const categoryFilter = ref('')

const hazardBasePath = computed(() => (route.path.startsWith('/app/') ? '/app/hazard' : '/mobile/hazard'))

function resolveProjectId() {
  const org = getAppSelectedOrg()
  const matched = String(org?.id || '').match(/^proj-(.+)$/)
  if (matched?.[1] && matched[1] !== HQ_PROJECT_OPTION.id) return matched[1]
  if (selectedProjectId.value && selectedProjectId.value !== HQ_PROJECT_OPTION.id) return selectedProjectId.value
  return DEFAULT_PROJECT_ID
}

const projectId = computed(() => {
  void tick.value
  return resolveProjectId()
})

const ledgerRows = computed(() => {
  void tick.value
  const id = projectId.value
  if (!id) return []
  ensureMajorHazardData(id)
  return buildLedgerRows(getMajorHazardData(id))
})

const categoryOptions = computed(() => {
  const set = new Set()
  for (const row of ledgerRows.value) {
    const name = String(row.categoryName || '').trim()
    if (name) set.add(name)
  }
  return [...set]
})

function partNames(row) {
  return (row.parts || []).map((part) => part.wbsPath || part.name).filter(Boolean).join('；') || '--'
}

function partProgressPercent(part) {
  const node = part.process?.progress || {}
  const latest = [...(node.records || [])].reverse().find((record) => record.executionRate !== '' && record.executionRate !== undefined && record.executionRate !== null)
  const rawValue = latest?.executionRate ?? node.executionRate
  if (rawValue === '' || rawValue === undefined || rawValue === null) return node.status === '已完成' ? 100 : 0
  return Math.min(100, Math.max(0, Number(rawValue) || 0))
}

function progressPercent(row) {
  const parts = row.parts || []
  if (!parts.length) return 0
  return Math.round(parts.reduce((sum, part) => sum + partProgressPercent(part), 0) / parts.length)
}

/**
 * 安全状态：与 WEB 危大清单列表「N/M 管控要点」同口径。
 * 按「部位 × 管控要点」逐项展开，取该要点最新一条记录的显示状态判定是否已落实。
 */
function controlPointStats(row) {
  const definitions = row.controlPoints || []
  const flags = (row.parts || []).flatMap((part) => definitions.map((point) => {
    const latest = [...(part.process?.controlPoints?.records || [])]
      .reverse()
      .find((record) => record.controlPointId === point.id)
    return latest?.displayStatus === 'green' || latest?.status === '已落实'
  }))
  const done = flags.filter(Boolean).length
  return { done, total: flags.length, percent: flags.length ? Math.round((done / flags.length) * 100) : 0 }
}

function plannedTime(row) {
  return `${row.source?.plannedStart || '--'} 至 ${row.source?.plannedEnd || '--'}`
}

/** 施工时间：与 WEB 列表「施工时间」同口径（清单各施工部位最早开工 ~ 最晚计划完工） */
function constructionTime(row) {
  return `${getLedgerStartDate(row) || '--'} 至 ${getLedgerEndDate(row) || '--'}`
}

function statusTag(row) {
  const status = getLedgerStatus(row)
  if (status === '完工') return 'success'
  if (status === '在施') return 'primary'
  return 'info'
}

/** 预计算卡片派生字段，避免模板里重复计算 */
const rows = computed(() => ledgerRows.value.map((row) => ({
  ...row,
  progress: progressPercent(row),
  points: controlPointStats(row),
})))

const filteredRows = computed(() => {
  const kw = String(keyword.value || '').trim().toLowerCase()
  const cat = String(categoryFilter.value || '').trim()
  return rows.value.filter((row) => {
    if (cat && String(row.categoryName || '').trim() !== cat) return false
    if (!kw) return true
    const name = String(row.name || '').toLowerCase()
    const category = String(row.categoryName || '').toLowerCase()
    const parts = partNames(row).toLowerCase()
    return name.includes(kw) || category.includes(kw) || parts.includes(kw)
  })
})

function goDetail(row) {
  router.push(`${hazardBasePath.value}/detail?sourceId=${encodeURIComponent(row.sourceId)}`)
}

function goProcess(row) {
  router.push(`${hazardBasePath.value}/process?sourceId=${encodeURIComponent(row.sourceId)}`)
}

function goBack() {
  if (route.path.startsWith('/app/')) router.push('/app/biz')
  else router.back()
}

function resetFilter() {
  keyword.value = ''
  categoryFilter.value = ''
}

watch(projectId, () => { tick.value += 1 }, { immediate: true })
</script>

<template>
  <div class="mp">
    <header class="mh">
      <button type="button" class="mb" aria-label="返回" @click="goBack">‹</button>
      <h1 class="mt">危大工程清单</h1>
      <span class="mh-spacer" />
    </header>

    <div class="filter-panel">
      <el-input
        v-model="keyword"
        clearable
        placeholder="搜索危大工程名称 / 部位名称"
        class="filter-input"
      />
      <div class="filter-row">
        <el-select
          v-model="categoryFilter"
          clearable
          placeholder="危大工程类别"
          class="filter-select"
        >
          <el-option v-for="item in categoryOptions" :key="item" :label="item" :value="item" />
        </el-select>
        <button type="button" class="reset-btn" @click="resetFilter">重置</button>
      </div>
      <div class="list-count">
        共 {{ filteredRows.length }} 条<span v-if="filteredRows.length !== ledgerRows.length"> · 筛选自 {{ ledgerRows.length }} 条</span>
      </div>
    </div>

    <div class="list-body">
      <div v-if="!filteredRows.length" class="empty">
        <p class="empty-title">{{ ledgerRows.length ? '无匹配危大工程' : '暂无危大工程清单' }}</p>
        <p class="empty-tip">{{ ledgerRows.length ? '试试更换关键字或清空筛选条件' : '危大辨识审批通过后自动生成清单' }}</p>
      </div>

      <article v-for="row in filteredRows" :key="row.sourceId" class="card">
        <div class="card-top">
          <span class="card-cat">{{ row.categoryName || '--' }}</span>
          <span class="tag-status" :class="`is-${statusTag(row)}`">{{ getLedgerStatus(row) }}</span>
        </div>
        <h2 class="card-title">{{ row.name || '--' }}</h2>

        <div class="kv-list">
          <div class="kv"><span class="k">分包单位</span><span class="v">{{ row.subcontractor || '--' }}</span></div>
          <div class="kv"><span class="k">责任人</span><span class="v">{{ row.responsible || '--' }}</span></div>
          <div class="kv"><span class="k">施工部位</span><span class="v">{{ partNames(row) }}</span></div>
          <div class="kv"><span class="k">计划时间</span><span class="v">{{ plannedTime(row) }}</span></div>
          <div class="kv"><span class="k">施工时间</span><span class="v">{{ constructionTime(row) }}</span></div>
        </div>

        <div class="stat-block">
          <div class="stat-line">
            <span class="stat-label">施工进度</span>
            <span class="stat-bar"><i :style="{ width: `${row.progress}%` }" /></span>
            <span class="stat-value">{{ row.progress }}%</span>
          </div>
          <div class="stat-line">
            <span class="stat-label">安全状态</span>
            <span class="stat-bar is-point"><i :style="{ width: `${row.points.percent}%` }" /></span>
            <span class="stat-value">{{ row.points.done }}/{{ row.points.total }} 已落实</span>
          </div>
        </div>

        <div class="card-actions">
          <button type="button" class="act" @click="goDetail(row)">查看详情</button>
          <button type="button" class="act primary" @click="goProcess(row)">过程管理</button>
        </div>
      </article>
    </div>
  </div>
</template>

<style scoped>
.mp {
  width: 100%;
  max-width: 402px;
  margin: 0 auto;
  min-height: 100vh;
  background: #f4f5f7;
  color: #1f2329;
  font-family: 'PingFang SC', -apple-system, sans-serif;
  padding-bottom: 24px;
}

/* 顶栏：与移动端其它页面（巡检任务等）保持一致的比例 */
.mh {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 12px 16px;
  background: #8f0045;
  color: #fff;
  position: sticky;
  top: 0;
  z-index: 20;
}
.mb {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  border: 0;
  background: transparent;
  color: #fff;
  font-size: 26px;
  line-height: 1;
  cursor: pointer;
}
.mt {
  flex: 1;
  margin: 0;
  text-align: center;
  font-size: 17px;
  font-weight: 600;
}
.mh-spacer { width: 28px; }

/* 筛选区 */
.filter-panel {
  position: sticky;
  top: 52px;
  z-index: 10;
  padding: 12px 16px 10px;
  background: #fff;
  border-bottom: 1px solid #eef0f4;
}
.filter-input { width: 100%; }
.filter-row {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}
.filter-select { flex: 1; min-width: 0; }
.reset-btn {
  flex: 0 0 auto;
  height: 34px;
  padding: 0 14px;
  border: 1px solid #d0d5dd;
  border-radius: 8px;
  background: #fff;
  color: #475467;
  font-size: 13px;
  cursor: pointer;
}
.reset-btn:active { background: #f5f6f8; }
.list-count {
  margin-top: 8px;
  color: #98a2b3;
  font-size: 12px;
}

/* 列表 */
.list-body {
  padding: 10px 12px 4px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.empty { padding: 56px 16px; text-align: center; }
.empty-title { margin: 0; color: #667085; font-size: 14px; font-weight: 600; }
.empty-tip { margin: 6px 0 0; color: #98a2b3; font-size: 12px; }

.card {
  padding: 12px;
  border: 1px solid #f0f1f4;
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 1px 3px rgba(16, 24, 40, 0.06);
}
.card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.card-cat {
  max-width: 62%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  padding: 2px 8px;
  border-radius: 6px;
  background: #fceef4;
  color: #8f0045;
  font-size: 11px;
  font-weight: 600;
}
.tag-status {
  flex: 0 0 auto;
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  background: #f2f4f7;
  color: #475467;
}
.tag-status.is-primary { background: #eaf3ff; color: #2773d6; }
.tag-status.is-success { background: #e8f5e9; color: #2f9e44; }
.tag-status.is-info { background: #f2f4f7; color: #667085; }
.card-title {
  margin: 8px 0 0;
  font-size: 15px;
  font-weight: 600;
  line-height: 1.4;
  color: #1f2329;
}

.kv-list {
  margin-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.kv {
  display: flex;
  gap: 8px;
  font-size: 12px;
  line-height: 1.45;
}
.k { flex: 0 0 60px; color: #98a2b3; }
.v {
  flex: 1;
  min-width: 0;
  color: #344054;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  word-break: break-all;
}

.stat-block {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px dashed #eef0f4;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.stat-line {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
}
.stat-label { flex: 0 0 60px; color: #98a2b3; }
.stat-bar {
  flex: 1;
  min-width: 40px;
  height: 6px;
  border-radius: 3px;
  background: #f0f2f5;
  overflow: hidden;
}
.stat-bar > i {
  display: block;
  height: 100%;
  border-radius: 3px;
  background: #8f0045;
}
.stat-bar.is-point > i { background: #2f9e44; }
.stat-value {
  flex: 0 0 auto;
  color: #475467;
  font-size: 11px;
  font-variant-numeric: tabular-nums;
}

.card-actions {
  display: flex;
  gap: 8px;
  margin-top: 10px;
}
.act {
  flex: 1;
  height: 34px;
  border: 1px solid #d0d5dd;
  border-radius: 8px;
  background: #fff;
  color: #344054;
  font-size: 13px;
  cursor: pointer;
}
.act.primary {
  border-color: #8f0045;
  background: #8f0045;
  color: #fff;
}
.act:active { opacity: 0.85; }

:deep(.el-input__wrapper),
:deep(.el-select__wrapper) {
  min-height: 34px;
  border-radius: 8px;
  font-size: 13px;
}
</style>
