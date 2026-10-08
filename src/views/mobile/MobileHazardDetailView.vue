<script setup>
/**
 * APP · 危大工程详情（仅基础信息 + 施工部位）
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
      <button type="button" class="mb" @click="goBack">‹</button>
      <h1 class="mt">危大工程详情</h1>
      <span class="mh-spacer" />
    </header>

    <template v-if="form">
      <section class="hero">
        <div class="hero-top">
          <span class="hero-cat">{{ form.categoryName || '--' }}</span>
          <el-tag size="small" :type="getLedgerStatus(form) === '完工' ? 'success' : getLedgerStatus(form) === '在施' ? 'primary' : 'info'">
            {{ getLedgerStatus(form) }}
          </el-tag>
        </div>
        <h2 class="hero-title">{{ form.name || '--' }}</h2>
        <p class="hero-overview">{{ form.overview || '暂无危大工程概况' }}</p>
      </section>

      <section class="panel">
        <h3 class="panel-title">基本信息</h3>
        <div class="kv-grid">
          <div class="kv"><span class="k">计划时间</span><span class="v">{{ plannedTime() }}</span></div>
          <div class="kv"><span class="k">施工时间</span><span class="v">{{ constructionTime() }}</span></div>
          <div class="kv"><span class="k">责任分包</span><span class="v">{{ form.subcontractor || '--' }}</span></div>
          <div class="kv"><span class="k">责任人</span><span class="v">{{ form.responsible || '--' }}</span></div>
        </div>
      </section>

      <section class="panel">
        <h3 class="panel-title">施工部位（{{ form.parts?.length || 0 }}）</h3>
        <div v-if="!form.parts?.length" class="empty-inline">暂无施工部位</div>
        <div v-for="(part, index) in form.parts" :key="part.id" class="part-card">
          <div class="part-head">
            <span class="part-index">部位 {{ index + 1 }}</span>
            <el-tag size="small" :type="partStatus(part) === '完工' ? 'success' : partStatus(part) === '在施' ? 'primary' : 'info'">{{ partStatus(part) }}</el-tag>
          </div>
          <div class="part-line">{{ part.wbsPath || part.name || '--' }}</div>
          <div class="part-meta">安全责任人 {{ part.safetyResponsible || '--' }}</div>
          <div class="part-meta">开工 {{ part.startDate || '--' }} · 计划完工 {{ part.plannedEndDate || '--' }}</div>
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
.hero {
  margin: 10px 14px 0;
  padding: 10px 12px;
  border-radius: 10px;
  background: #fff;
}
.hero-top { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.hero-cat { color: #8f0045; font-size: 11px; font-weight: 600; }
.hero-title { margin: 6px 0 0; color: #1f2329; font-size: 13px; font-weight: 650; line-height: 1.35; }
.hero-overview { margin: 6px 0 0; color: #667085; font-size: 11px; line-height: 1.45; white-space: pre-wrap; }
.panel {
  margin: 8px 14px 0;
  padding: 10px 12px;
  border-radius: 10px;
  background: #fff;
}
.panel-title {
  margin: 0 0 8px;
  padding-left: 7px;
  border-left: 3px solid #8f0045;
  color: #1f2329;
  font-size: 12px;
  font-weight: 650;
}
.kv-grid { display: flex; flex-direction: column; gap: 6px; }
.kv {
  display: flex;
  gap: 8px;
  font-size: 11px;
  line-height: 1.4;
}
.k { flex: 0 0 56px; color: #98a2b3; }
.v { flex: 1; color: #344054; word-break: break-all; }
.part-card {
  margin-top: 6px;
  padding: 8px 10px;
  border-radius: 8px;
  background: #f8fafc;
}
.part-head { display: flex; justify-content: space-between; align-items: center; }
.part-index { color: #667085; font-size: 11px; }
.part-line { margin-top: 4px; color: #1f2329; font-size: 12px; font-weight: 600; line-height: 1.4; }
.part-meta { margin-top: 3px; color: #667085; font-size: 11px; line-height: 1.35; }
.empty, .empty-inline {
  padding: 36px 16px;
  text-align: center;
  color: #98a2b3;
  font-size: 12px;
}
:deep(.el-tag) {
  height: 20px;
  padding: 0 6px;
  font-size: 10px;
  line-height: 18px;
}
</style>
