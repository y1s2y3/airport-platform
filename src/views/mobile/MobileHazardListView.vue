<script setup>
/**
 * APP · 危大工程清单列表
 * 关键字搜名称/部位；类型下拉精确筛类别
 */
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getAppSelectedOrg } from '../../mock/appSession.js'
import { DEFAULT_PROJECT_ID, HQ_PROJECT_OPTION } from '../../config/projectOptions.js'
import { selectedProjectId } from '../../composables/useCurrentProject.js'
import {
  buildLedgerRows,
  ensureMajorHazardData,
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

function plannedTime(row) {
  return `${row.source?.plannedStart || '--'} 至 ${row.source?.plannedEnd || '--'}`
}

function statusTag(row) {
  const status = getLedgerStatus(row)
  if (status === '完工') return 'success'
  if (status === '在施') return 'primary'
  return 'info'
}

const filteredRows = computed(() => {
  const kw = String(keyword.value || '').trim().toLowerCase()
  const cat = String(categoryFilter.value || '').trim()
  return ledgerRows.value.filter((row) => {
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
      <button type="button" class="mb" @click="goBack">‹</button>
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
          placeholder="危大工程类型"
          class="filter-select"
        >
          <el-option v-for="item in categoryOptions" :key="item" :label="item" :value="item" />
        </el-select>
        <button type="button" class="reset-btn" @click="resetFilter">重置</button>
      </div>
      <div class="tip-banner">共 {{ filteredRows.length }} 条<span v-if="filteredRows.length !== ledgerRows.length">（筛选自 {{ ledgerRows.length }} 条）</span></div>
    </div>

    <div class="list-body">
      <div v-if="!filteredRows.length" class="empty">{{ ledgerRows.length ? '无匹配危大工程' : '暂无危大工程清单' }}</div>
      <div v-for="row in filteredRows" :key="row.sourceId" class="card">
        <div class="card-main">
          <div class="card-top">
            <span class="card-cat">{{ row.categoryName || '--' }}</span>
            <el-tag size="small" :type="statusTag(row)">{{ getLedgerStatus(row) }}</el-tag>
          </div>
          <div class="card-title">{{ row.name || '--' }}</div>
          <div class="card-meta">分包：{{ row.subcontractor || '--' }}</div>
          <div class="card-meta">部位：{{ partNames(row) }}</div>
          <div class="card-meta">计划：{{ plannedTime(row) }} · 进度 {{ progressPercent(row) }}%</div>
        </div>
        <div class="card-actions">
          <button type="button" class="act" @click="goDetail(row)">查看详情</button>
          <button type="button" class="act primary" @click="goProcess(row)">过程管理</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.mp {
  width: 100%;
  max-width: 402px;
  margin: 0 auto;
  min-height: 100vh;
  background: #f5f5f5;
  font-family: 'PingFang SC', -apple-system, sans-serif;
  padding-bottom: 24px;
}
.mh {
  display: flex;
  align-items: center;
  height: 88px;
  padding: 0 16px;
  background: #8f0045;
  color: #fff;
}
.mb {
  width: 56px;
  height: 56px;
  border: 0;
  background: transparent;
  color: #fff;
  font-size: 42px;
  line-height: 1;
}
.mt {
  flex: 1;
  margin: 0;
  text-align: center;
  font-size: 34px;
  font-weight: 600;
}
.mh-spacer { width: 56px; }
.filter-panel {
  margin: 12px 16px 0;
  padding: 12px;
  border-radius: 12px;
  background: #fff;
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
  height: 28px;
  padding: 0 10px;
  border: 1px solid #d0d5dd;
  border-radius: 6px;
  background: #fff;
  color: #667085;
  font-size: 11px;
}
.tip-banner {
  margin-top: 8px;
  color: #667085;
  font-size: 11px;
  line-height: 1.4;
}
.list-body { padding: 10px 14px; display: flex; flex-direction: column; gap: 8px; }
.empty {
  padding: 48px 16px;
  text-align: center;
  color: #98a2b3;
  font-size: 12px;
}
.card {
  background: #fff;
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 1px 4px rgba(31, 41, 55, 0.04);
}
.card-main { padding: 10px 12px 6px; }
.card-top { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.card-cat { color: #8f0045; font-size: 11px; font-weight: 600; }
.card-title { margin-top: 4px; color: #1f2329; font-size: 13px; font-weight: 650; line-height: 1.35; }
.card-meta { margin-top: 3px; color: #667085; font-size: 11px; line-height: 1.4; }
.card-actions {
  display: flex;
  gap: 8px;
  padding: 6px 12px 10px;
}
.act {
  flex: 1;
  height: 30px;
  border: 1px solid #d0d5dd;
  border-radius: 7px;
  background: #fff;
  color: #344054;
  font-size: 12px;
}
.act.primary {
  border-color: #8f0045;
  background: #8f0045;
  color: #fff;
}
:deep(.el-input__wrapper),
:deep(.el-select__wrapper) {
  min-height: 28px;
  font-size: 12px;
}
:deep(.el-tag) {
  height: 20px;
  padding: 0 6px;
  font-size: 10px;
  line-height: 18px;
}
</style>
