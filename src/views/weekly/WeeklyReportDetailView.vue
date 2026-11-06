<script setup>
/**
 * 数字周报 · 详情
 * 结构：报头 → 本周概览（按 COC 调度 / 安质巡检 / 质量 三组指标卡）→ 二～五章（每章 总体说明 + 分项目统计表）→ 附录口径
 * 支持：导出 Word、章节锚点导航。同一周只生成一份，不提供重新生成。
 */
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ArrowLeft, Back, Download } from '@element-plus/icons-vue'
import { getWeeklyReport } from '../../utils/weeklyReportStorage'
import { ensureReportRichData } from '../../utils/weeklyReportCompat'
import { WEEKLY_SECTION_ORDER, SECTION_CHAPTER, CHAPTER_TITLES } from '../../utils/weeklyReportBuilder'
import { exportWeeklyReportDocx } from '../../utils/weeklyReportDocx'
import WeeklySummaryCard from './WeeklySummaryCard.vue'

const route = useRoute()
const router = useRouter()

const report = ref(null)
const exporting = ref(false)
const activeAnchor = ref('overview')

const CHAPTER_ORDER = ['chapter-coc', 'chapter-anzi', 'chapter-quality', 'chapter-next']

const anchors = computed(() => [
  { id: 'overview', title: '一、本周概览' },
  ...chapterGroups.value.map((group) => ({ id: group.id, title: group.title })),
  { id: 'appendix', title: '附：指标口径' },
])

const chapterGroups = computed(() => {
  if (!report.value) return []
  const groups = CHAPTER_ORDER.map((id) => ({ id, title: CHAPTER_TITLES[id] || id, sections: [] }))
  WEEKLY_SECTION_ORDER.forEach((key) => {
    const section = report.value.sections?.[key]
    if (!section) return
    const group = groups.find((item) => item.id === (SECTION_CHAPTER[key] || ''))
    if (group) group.sections.push(section)
  })
  return groups.filter((group) => group.sections.length)
})

function formatCardValue(card) {
  if (card.value === null || card.value === undefined) return '--'
  if (card.unit === '%') return `${card.value}%`
  return card.unit ? `${card.value} ${card.unit}` : String(card.value)
}

function formatDelta(card) {
  if (card.delta === null || card.delta === undefined) return '--'
  if (card.delta === 0) return '持平'
  const suffix = card.unit === '%' ? ' 个百分点' : card.unit ? ` ${card.unit}` : ''
  return `${card.delta > 0 ? '+' : ''}${card.delta}${suffix}`
}

function formatPrev(card) {
  if (card.prevValue === null || card.prevValue === undefined) return '--'
  if (card.unit === '%') return `${card.prevValue}%`
  return card.unit ? `${card.prevValue} ${card.unit}` : String(card.prevValue)
}

function deltaClass(card) {
  if (card.delta === null || card.delta === undefined || card.delta === 0) return ''
  return card.delta > 0 ? 'is-up' : 'is-down'
}

function load() {
  report.value = ensureReportRichData(getWeeklyReport(route.params.id))
}

function goBack() {
  router.push('/weekly-report')
}

async function handleExport() {
  exporting.value = true
  const result = await exportWeeklyReportDocx(report.value)
  exporting.value = false
  if (!result.ok) {
    ElMessage.error(result.msg || '导出失败')
    return
  }
  ElMessage.success(`已导出 ${result.fileName}`)
}

function getScrollContainer() {
  return document.querySelector('.page-viewport')
}

function scrollTo(id) {
  const element = document.getElementById(id)
  if (!element) return
  const container = getScrollContainer()
  if (container) {
    const top = element.getBoundingClientRect().top - container.getBoundingClientRect().top + container.scrollTop - 16
    container.scrollTo({ top, behavior: 'smooth' })
  } else {
    const top = element.getBoundingClientRect().top + window.scrollY - 90
    window.scrollTo({ top, behavior: 'smooth' })
  }
  activeAnchor.value = id
}

function onScroll() {
  const container = getScrollContainer()
  const containerTop = container ? container.getBoundingClientRect().top : 0
  const ids = anchors.value.map((item) => item.id)
  let current = ids[0]
  ids.forEach((id) => {
    const element = document.getElementById(id)
    if (!element) return
    if (element.getBoundingClientRect().top - containerTop <= 120) current = id
  })
  activeAnchor.value = current
}

function backToTop() {
  const container = getScrollContainer()
  if (container) container.scrollTo({ top: 0 })
  else window.scrollTo({ top: 0 })
}

onMounted(async () => {
  load()
  await nextTick()
  const container = getScrollContainer()
  if (container) container.addEventListener('scroll', onScroll, { passive: true })
  else window.addEventListener('scroll', onScroll, { passive: true })
})

onUnmounted(() => {
  const container = getScrollContainer()
  if (container) container.removeEventListener('scroll', onScroll)
  window.removeEventListener('scroll', onScroll)
})
</script>

<template>
  <div v-if="report" class="qm-page page-card weekly-detail">
    <div class="page-header">
      <div class="detail-top">
        <el-button link type="primary" :icon="ArrowLeft" @click="goBack">返回数字周报</el-button>
      </div>
      <div class="page-breadcrumb">数据看板 / 数字周报 / 周报详情</div>
      <div class="title-row">
        <div class="title-block">
          <h1 class="page-title">{{ report.weekLabel }} 周报</h1>
          <div class="title-tags">
            <el-tag size="small" type="success" effect="plain">已冻结</el-tag>
            <el-tag v-if="report.isDemo" size="small" type="info" effect="plain">演示数据</el-tag>
          </div>
        </div>
        <div class="title-actions">
          <el-button type="primary" :icon="Download" :loading="exporting" @click="handleExport">导出 Word</el-button>
        </div>
      </div>
      <p class="page-tip">
        统计周期 {{ report.rangeLabel }} · 数据截止 {{ report.weekEnd }} 24:00 · 生成时间 {{ report.generatedAt }} ·
        统计范围：在建项目 {{ report.projectCount }} 个
      </p>
    </div>

    <div class="detail-layout">
      <aside class="detail-nav">
        <div v-for="item in anchors" :key="item.id" class="nav-item" :class="{ 'is-active': activeAnchor === item.id }" @click="scrollTo(item.id)">
          {{ item.title }}
        </div>
      </aside>

      <div class="detail-body">
        <!-- 一、本周概览 -->
        <section id="overview" class="weekly-section overview-section">
          <div class="section-head">
            <h2 class="section-title">一、本周概览</h2>
          </div>
          <p class="overview-summary">{{ report.overview?.summary }}</p>

          <div v-for="group in report.overview?.groups || []" :key="group.key" class="metric-group">
            <div class="group-head">
              <span class="group-title">{{ group.title }}</span>
              <span class="group-count">{{ group.cards.length }} 项指标</span>
            </div>
            <div class="card-grid">
              <div v-for="card in group.cards" :key="card.key" class="metric-card">
                <div class="metric-label">{{ card.label }}</div>
                <div class="metric-value">{{ formatCardValue(card) }}</div>
                <div class="metric-foot">
                  <span class="metric-prev">上周 {{ formatPrev(card) }}</span>
                  <span class="metric-delta" :class="deltaClass(card)">{{ formatDelta(card) }}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- 二～五章 -->
        <section v-for="group in chapterGroups" :id="group.id" :key="group.id" class="chapter-block">
          <h2 class="chapter-title">{{ group.title }}</h2>
          <WeeklySummaryCard v-for="section in group.sections" :key="section.key" :section="section" />
        </section>

        <!-- 附：指标口径 -->
        <section id="appendix" class="weekly-section appendix-section">
          <div class="section-head">
            <h2 class="section-title">附：指标口径说明</h2>
          </div>
          <el-table :data="report.appendix || []" stripe border size="small" empty-text="暂无口径配置">
            <el-table-column prop="name" label="指标" width="180" />
            <el-table-column prop="unit" label="单位" width="90" align="center" />
            <el-table-column prop="rule" label="口径说明" min-width="420" />
            <el-table-column prop="source" label="数据来源" min-width="170" />
          </el-table>
          <p class="appendix-note">
            说明：周报由平台各业务模块台账汇总生成，生成后数据冻结；同一周只生成一份，不支持重新生成。
          </p>
        </section>
      </div>
    </div>
  </div>

  <div v-else class="qm-page page-card">
    <el-empty description="周报不存在或已被清理" />
    <div class="empty-action">
      <el-button type="primary" :icon="Back" @click="goBack">返回数字周报</el-button>
    </div>
  </div>
</template>

<style scoped>
.weekly-detail {
  position: relative;
}
.detail-top {
  margin-bottom: 8px;
}
.title-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  flex-wrap: wrap;
}
.title-block {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}
.title-tags {
  display: flex;
  gap: 6px;
}
.title-actions {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
}
.detail-layout {
  display: flex;
  gap: 18px;
  align-items: flex-start;
}
.detail-nav {
  position: sticky;
  top: 84px;
  flex: 0 0 176px;
  border: 1px solid var(--ap-border, #ebeef5);
  border-radius: 8px;
  background: #fff;
  padding: 10px 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.nav-item {
  padding: 8px 10px;
  border-radius: 6px;
  font-size: 13px;
  color: #4a4f57;
  cursor: pointer;
  transition: background 0.2s, color 0.2s;
}
.nav-item:hover {
  background: #f5f7fa;
}
.nav-item.is-active {
  background: #fdf2f6;
  color: var(--ap-primary, #91003d);
  font-weight: 600;
}
.detail-body {
  flex: 1;
  min-width: 0;
}
.overview-section,
.appendix-section {
  border: 1px solid var(--ap-border, #ebeef5);
  border-radius: 10px;
  background: #fff;
  padding: 16px 18px;
  margin-bottom: 14px;
}
.section-head {
  margin-bottom: 10px;
}
.section-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}
.overview-summary {
  margin: 0 0 14px;
  padding: 10px 12px;
  border-radius: 8px;
  background: #f7f8fa;
  border-left: 3px solid var(--ap-primary, #91003d);
  font-size: 13px;
  line-height: 1.7;
  color: #4a4f57;
}
.metric-group {
  margin-bottom: 16px;
}
.metric-group:last-child {
  margin-bottom: 0;
}
.group-head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
  padding-left: 8px;
  border-left: 3px solid #c9c9c9;
}
.group-title {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
}
.group-count {
  font-size: 12px;
  color: var(--ap-text-muted, #909399);
}
.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 12px;
}
.metric-card {
  border: 1px solid var(--ap-border, #ebeef5);
  border-radius: 8px;
  padding: 12px 14px;
  background: #fff;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.metric-label {
  font-size: 13px;
  color: var(--ap-text-muted, #909399);
}
.metric-value {
  font-size: 21px;
  font-weight: 700;
  color: var(--ap-primary, #91003d);
  line-height: 1.2;
}
.metric-foot {
  display: flex;
  gap: 10px;
  font-size: 12px;
  color: var(--ap-text-muted, #909399);
}
.metric-delta.is-up {
  color: #67c23a;
}
.metric-delta.is-down {
  color: #f56c6c;
}
.chapter-block {
  margin-bottom: 18px;
}
.chapter-title {
  margin: 0 0 12px;
  font-size: 17px;
  font-weight: 700;
  padding-left: 10px;
  border-left: 4px solid var(--ap-primary, #91003d);
}
.appendix-note {
  margin: 12px 0 0;
  font-size: 12px;
  color: var(--ap-text-muted, #909399);
  line-height: 1.7;
}
.empty-action {
  display: flex;
  justify-content: center;
  margin-top: 12px;
}
@media (max-width: 1100px) {
  .detail-nav {
    display: none;
  }
}
</style>
