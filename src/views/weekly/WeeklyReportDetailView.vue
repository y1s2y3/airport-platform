<script setup>
/**
 * 数字周报 · 详情
 * 结构：报头 → 本周概览（指标卡）→ 二～五章（每章 总体说明 + 分项目统计表）→ 附录口径
 * 支持：导出 Word、重新生成（升版本）、历史版本切换、章节锚点导航。
 */
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowLeft, Back, Download, Refresh } from '@element-plus/icons-vue'
import {
  getWeeklyReport,
  listVersions,
  regenerateWeeklyReport,
  WEEKLY_REPORT_TODAY,
} from '../../utils/weeklyReportStorage'
import { WEEKLY_SECTION_ORDER, SECTION_CHAPTER } from '../../utils/weeklyReportBuilder'
import { exportWeeklyReportDocx } from '../../utils/weeklyReportDocx'
import WeeklySummaryCard from './WeeklySummaryCard.vue'

const route = useRoute()
const router = useRouter()

const report = ref(null)
const versions = ref([])
const currentVersion = ref(null)
const exporting = ref(false)
const regenerating = ref(false)
const activeAnchor = ref('overview')

const CHAPTER_ORDER = [
  { id: 'chapter-coc', title: '二、COC 调度' },
  { id: 'chapter-safety', title: '三、安全管理' },
  { id: 'chapter-quality', title: '四、质量管理' },
  { id: 'chapter-overview', title: '五、综合运行' },
]

const anchors = computed(() => [
  { id: 'overview', title: '一、本周概览' },
  ...CHAPTER_ORDER.filter((chapter) => chapterGroups.value.some((group) => group.id === chapter.id)),
  { id: 'appendix', title: '附：指标口径' },
])

const chapterGroups = computed(() => {
  if (!report.value) return []
  const groups = CHAPTER_ORDER.map((chapter) => ({ ...chapter, sections: [] }))
  WEEKLY_SECTION_ORDER.forEach((key) => {
    const section = report.value.sections?.[key]
    if (!section) return
    const chapterId = SECTION_CHAPTER[key]
    const group = groups.find((item) => item.id === chapterId)
    if (group) group.sections.push(section)
  })
  return groups.filter((group) => group.sections.length)
})

const cardDisplay = computed(() =>
  (report.value?.overview?.cards || []).map((card) => ({
    ...card,
    valueText:
      card.value === null || card.value === undefined
        ? '--'
        : `${card.value}${card.unit === '%' ? '%' : card.unit ? ` ${card.unit}` : ''}`,
    prevText:
      card.prevValue === null || card.prevValue === undefined
        ? '--'
        : `${card.prevValue}${card.unit === '%' ? '%' : card.unit ? ` ${card.unit}` : ''}`,
    deltaText:
      card.delta === null || card.delta === undefined
        ? '--'
        : card.delta === 0
          ? '持平'
          : `${card.delta > 0 ? '+' : ''}${card.delta}${card.unit === '%' ? ' 个百分点' : card.unit ? ` ${card.unit}` : ''}`,
    deltaClass: card.delta > 0 ? 'is-up' : card.delta < 0 ? 'is-down' : '',
  })),
)

function load(version) {
  const found = getWeeklyReport(route.params.id, version)
  report.value = found
  versions.value = listVersions(route.params.id)
  currentVersion.value = found?.version ?? null
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

async function handleRegenerate() {
  try {
    await ElMessageBox.confirm(
      `重新生成会重新取数并冻结为新版本（v${Number(report.value?.version || 1) + 1}），旧版本保留可查。是否继续？`,
      '重新生成周报',
      { confirmButtonText: '重新生成', cancelButtonText: '取消', type: 'warning' },
    )
  } catch (error) {
    return
  }
  regenerating.value = true
  const result = regenerateWeeklyReport(route.params.id)
  regenerating.value = false
  if (!result.ok) {
    ElMessage.warning(result.msg || '重新生成失败')
    return
  }
  load()
  ElMessage.success(result.msg || '已重新生成')
}

function switchVersion(version) {
  load(version)
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

watch(
  () => route.params.id,
  () => {
    load()
    backToTop()
  },
)
watch(
  () => currentVersion.value,
  () => {
    nextTick(backToTop)
  },
)
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
            <el-tag size="small" effect="plain">v{{ report.version }}</el-tag>
            <el-tag v-if="report.isDemo" size="small" type="info" effect="plain">演示数据</el-tag>
          </div>
        </div>
        <div class="title-actions">
          <el-select
            v-if="versions.length > 1"
            :model-value="currentVersion"
            style="width: 132px"
            aria-label="版本"
            @change="switchVersion"
          >
            <el-option v-for="item in versions" :key="item.version" :label="`v${item.version}${item.current ? '（当前）' : '（历史）'}`" :value="item.version" />
          </el-select>
          <el-button :icon="Refresh" :loading="regenerating" @click="handleRegenerate">重新生成</el-button>
          <el-button type="primary" :icon="Download" :loading="exporting" @click="handleExport">导出 Word</el-button>
        </div>
      </div>
      <p class="page-tip">
        统计周期 {{ report.rangeLabel }} · 数据截止 {{ report.weekEnd }} 24:00 · 生成时间 {{ report.generatedAt }} ·
        统计范围：在建项目 {{ report.projectCount }} 个 · 关联上一周：{{ report.prevWeekId || '--' }}
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
          <div class="card-grid">
            <div v-for="card in cardDisplay" :key="card.key" class="metric-card">
              <div class="metric-label">{{ card.label }}</div>
              <div class="metric-value">{{ card.valueText }}</div>
              <div class="metric-foot">
                <span class="metric-prev">上周 {{ card.prevText }}</span>
                <span class="metric-delta" :class="card.deltaClass">{{ card.deltaText }}</span>
              </div>
            </div>
          </div>
          <div v-if="report.overview?.warnRows?.length" class="warn-block">
            <h4 class="warn-title">项目预警清单</h4>
            <el-table :data="report.overview.warnRows" stripe border size="small" empty-text="本周无项目预警">
              <el-table-column prop="project" label="项目" min-width="140" />
              <el-table-column prop="type" label="预警类型" width="140" />
              <el-table-column prop="count" label="数量（天）" width="110" align="center" />
              <el-table-column prop="detail" label="要点明细" min-width="260" show-overflow-tooltip />
            </el-table>
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
            <el-table-column prop="name" label="指标" width="170" />
            <el-table-column prop="unit" label="单位" width="90" align="center" />
            <el-table-column prop="rule" label="口径说明" min-width="420" />
            <el-table-column prop="source" label="数据来源" min-width="170" />
          </el-table>
          <p class="appendix-note">
            说明：周报由平台各业务模块台账汇总生成，生成后数据冻结；如需最新数据请使用「重新生成」创建新版本。
            当前演示基准日：{{ WEEKLY_REPORT_TODAY }}。
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
.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(168px, 1fr));
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
.warn-block {
  margin-top: 16px;
}
.warn-title {
  margin: 0 0 10px;
  font-size: 14px;
  font-weight: 600;
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
