<script setup>
/**
 * APP · 危大工程详情（基础信息 + 施工部位）
 * 字段与 WEB「危大清单详情」基本信息对齐：
 * 危大工程名称 / 危大工程类别 / 危大工程概况 / 计划时间 / 施工时间 /
 * 责任分包单位 / 责任人 / 类别描述，并补充施工进度与安全状态概览。
 */
import { computed, inject, onBeforeUnmount, ref, watch } from 'vue'
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
  normalizeLedger,
} from '../../utils/majorHazardManualStorage.js'

const route = useRoute()
const router = useRouter()
const appBizPageChrome = inject('appBizPageChrome', null)
const tick = ref(0)
const sourceId = computed(() => String(route.query.sourceId || ''))

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

const form = computed(() => {
  void tick.value
  const id = projectId.value
  if (!id || !sourceId.value) return null
  ensureMajorHazardData(id)
  const data = getMajorHazardData(id)
  const row = buildLedgerRows(data).find((item) => item.sourceId === sourceId.value)
  return row ? normalizeLedger(row, data) : null
})

function plannedTime() {
  if (!form.value) return '--'
  return `${form.value.source?.plannedStart || form.value.plannedStart || '--'} 至 ${form.value.source?.plannedEnd || form.value.plannedEnd || '--'}`
}

function constructionTime() {
  if (!form.value) return '--'
  return `${getLedgerStartDate(form.value) || '--'} 至 ${getLedgerEndDate(form.value) || '--'}`
}

function partStatus(part) {
  if (part.process?.acceptance?.status === '已完成' && part.process?.acceptance?.result === '合格') return '完工'
  return part.startDate ? '在施' : '未开工'
}

function statusTagType(status) {
  if (status === '完工') return 'success'
  if (status === '在施') return 'primary'
  return 'info'
}

function partProgressPercent(part) {
  const node = part.process?.progress || {}
  const latest = [...(node.records || [])].reverse().find((record) => record.executionRate !== '' && record.executionRate !== undefined && record.executionRate !== null)
  const rawValue = latest?.executionRate ?? node.executionRate
  if (rawValue === '' || rawValue === undefined || rawValue === null) return node.status === '已完成' ? 100 : 0
  return Math.min(100, Math.max(0, Number(rawValue) || 0))
}

/** 施工进度：与 WEB 危大清单列表「施工进度」同口径（各施工部位平均） */
const progress = computed(() => {
  const parts = form.value?.parts || []
  if (!parts.length) return 0
  return Math.round(parts.reduce((sum, part) => sum + partProgressPercent(part), 0) / parts.length)
})

/** 安全状态：与 WEB 危大清单列表「N/M 管控要点」同口径 */
const points = computed(() => {
  const definitions = form.value?.controlPoints || []
  const flags = (form.value?.parts || []).flatMap((part) => definitions.map((point) => {
    const latest = [...(part.process?.controlPoints?.records || [])]
      .reverse()
      .find((record) => record.controlPointId === point.id)
    return latest?.displayStatus === 'green' || latest?.status === '已落实'
  }))
  const done = flags.filter(Boolean).length
  return { done, total: flags.length, percent: flags.length ? Math.round((done / flags.length) * 100) : 0 }
})

function goBack() {
  const base = route.path.startsWith('/app/') ? '/app/hazard' : '/mobile/hazard'
  router.push(base)
}

watch([projectId, sourceId], () => { tick.value += 1 }, { immediate: true })
watch(form, (val) => {
  if (!appBizPageChrome) return
  const name = String(val?.name || '').trim()
  appBizPageChrome.setTitle(name || '危大工程详情')
}, { immediate: true })
onBeforeUnmount(() => {
  appBizPageChrome?.clear?.()
})
</script>

<template>
  <div class="mp">
    <header class="mh">
      <button type="button" class="mb" aria-label="返回" @click="goBack">‹</button>
      <h1 class="mt">危大工程详情</h1>
      <span class="mh-spacer" />
    </header>

    <template v-if="form">
      <section class="hero">
        <div class="hero-top">
          <span class="hero-cat">{{ form.categoryName || '--' }}</span>
          <span class="tag-status" :class="`is-${statusTagType(getLedgerStatus(form))}`">{{ getLedgerStatus(form) }}</span>
        </div>
        <h2 class="hero-title">{{ form.name || '--' }}</h2>
        <p class="hero-overview">{{ form.overview || '暂无危大工程概况' }}</p>

        <div class="stat-block">
          <div class="stat-line">
            <span class="stat-label">施工进度</span>
            <span class="stat-bar"><i :style="{ width: `${progress}%` }" /></span>
            <span class="stat-value">{{ progress }}%</span>
          </div>
          <div class="stat-line">
            <span class="stat-label">安全状态</span>
            <span class="stat-bar is-point"><i :style="{ width: `${points.percent}%` }" /></span>
            <span class="stat-value">{{ points.done }}/{{ points.total }} 已落实</span>
          </div>
        </div>
      </section>

      <section class="panel">
        <h3 class="panel-title">基本信息</h3>
        <div class="kv-list">
          <div class="kv"><span class="k">计划时间</span><span class="v">{{ plannedTime() }}</span></div>
          <div class="kv"><span class="k">施工时间</span><span class="v">{{ constructionTime() }}</span></div>
          <div class="kv"><span class="k">责任分包单位</span><span class="v">{{ form.subcontractor || '--' }}</span></div>
          <div class="kv"><span class="k">责任人</span><span class="v">{{ form.responsible || '--' }}</span></div>
          <div class="kv"><span class="k">类别描述</span><span class="v">{{ form.description || form.source?.description || '--' }}</span></div>
        </div>
      </section>

      <section class="panel">
        <h3 class="panel-title">施工部位（{{ form.parts?.length || 0 }}）</h3>
        <div v-if="!form.parts?.length" class="empty-inline">暂无施工部位</div>
        <div v-for="(part, index) in form.parts" :key="part.id" class="part-card">
          <div class="part-head">
            <span class="part-index">部位 {{ index + 1 }}</span>
            <span class="tag-status" :class="`is-${statusTagType(partStatus(part))}`">{{ partStatus(part) }}</span>
          </div>
          <div class="part-line">{{ part.wbsPath || part.name || '--' }}</div>
          <div class="kv-list">
            <div class="kv"><span class="k">安全责任人</span><span class="v">{{ part.safetyResponsible || '--' }}</span></div>
            <div class="kv"><span class="k">开工时间</span><span class="v">{{ part.startDate || '--' }}</span></div>
            <div class="kv"><span class="k">计划完工</span><span class="v">{{ part.plannedEndDate || '--' }}</span></div>
          </div>
        </div>
      </section>
    </template>
    <div v-else class="empty">未找到该危大工程</div>
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

.hero {
  margin: 12px 12px 0;
  padding: 14px;
  border: 1px solid #f0f1f4;
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 1px 3px rgba(16, 24, 40, 0.06);
}
.hero-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.hero-cat {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 6px;
  background: #fceef4;
  color: #8f0045;
  font-size: 11px;
  font-weight: 600;
}
.hero-title {
  margin: 10px 0 0;
  font-size: 17px;
  font-weight: 600;
  line-height: 1.4;
  color: #1f2329;
}
.hero-overview {
  margin: 8px 0 0;
  color: #667085;
  font-size: 12px;
  line-height: 1.5;
  white-space: pre-wrap;
}

.panel {
  margin: 10px 12px 0;
  padding: 14px;
  border: 1px solid #f0f1f4;
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 1px 3px rgba(16, 24, 40, 0.06);
}
.panel-title {
  margin: 0 0 10px;
  padding-left: 8px;
  border-left: 3px solid #8f0045;
  color: #1f2329;
  font-size: 14px;
  font-weight: 600;
}

.kv-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.kv {
  display: flex;
  gap: 8px;
  font-size: 12px;
  line-height: 1.45;
}
.k { flex: 0 0 76px; white-space: nowrap; color: #98a2b3; }
.v {
  flex: 1;
  min-width: 0;
  color: #344054;
  word-break: break-all;
  white-space: pre-wrap;
}

.stat-block {
  margin-top: 12px;
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

.part-card {
  margin-top: 10px;
  padding: 12px;
  border: 1px solid #eef0f4;
  border-radius: 10px;
  background: #fafbfc;
}
.part-card + .part-card { margin-top: 10px; }
.part-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.part-index { color: #98a2b3; font-size: 11px; }
.part-line {
  margin: 8px 0;
  color: #1f2329;
  font-size: 13px;
  font-weight: 600;
  line-height: 1.45;
}
.part-card .kv-list { margin-top: 0; }

.empty, .empty-inline {
  padding: 40px 16px;
  text-align: center;
  color: #98a2b3;
  font-size: 13px;
}
.empty-inline { padding: 20px 0; }
</style>
