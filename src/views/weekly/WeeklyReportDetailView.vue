<script setup>
/**
 * 数字周报 · 详情
 * 结构：报头 → 本周概览（按 COC 调度 / 安质巡检 / 质量 三组指标卡）→ 二～五章（每章 总体说明 + 分项目统计表）→ 附录口径
 * 支持：导出 Word、章节锚点导航。同一周只生成一份，不提供重新生成。
 */
import { computed, nextTick, onErrorCaptured, onMounted, onUnmounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ArrowLeft, Back, Download } from '@element-plus/icons-vue'
// 命名空间导入 + 兜底：开发环境若命中旧版模块（缺 ensureSectionExtras 导出），
// 也不会抛 SyntaxError 白屏，只是不再补充图表/明细
import * as compatModule from '../../utils/weeklyReportCompat'
import { getWeeklyReport, getWeeklyTargets } from '../../utils/weeklyReportStorage'
import { WEEKLY_SECTION_ORDER, SECTION_CHAPTER, CHAPTER_TITLES } from '../../utils/weeklyReportBuilder'
import { exportWeeklyReportDocx } from '../../utils/weeklyReportDocx'
import WeeklySummaryCard from './WeeklySummaryCard.vue'

const ensureReportRichData = typeof compatModule.ensureReportRichData === 'function' ? compatModule.ensureReportRichData : (report) => report
const ensureSectionExtras = typeof compatModule.ensureSectionExtras === 'function' ? compatModule.ensureSectionExtras : (report) => report

const route = useRoute()
const router = useRouter()

const report = ref(null)
const renderError = ref(false)
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

/** 比率类指标的关注线（低于此值列入重点关注）；值来自「关注线设置」，缺失时用系统默认值 */
const PCT_TARGET = getWeeklyTargets()
/** 数量类指标中「越低越好」的键（上升时视为需关注） */
const LOWER_IS_BETTER = new Set(['newHazard', 'overdueHazard'])
/** 重点关注指标 → 下周行动建议 */
const ADVICE_MAP = {
  attendRate: '查看会议签到记录，缺勤项目在调度会通报并说明原因',
  dutyRate: '补齐值班表空缺槽位，明确四班三倒责任人',
  meetingReportRate: '督促项目按周上报监理例会记录与纪要',
  reportRate: '核查未上报日期，补报每日施工作业',
  taskRate: '督促未完成巡检任务在周一前闭合',
  closeRate: '对未闭环隐患明确整改责任人与完成时限',
  qmPassRate: '对未通过验收项组织复验并补齐资料',
  newHazard: '分析隐患集中类型，组织专项安全交底',
  overdueHazard: '逐条销项逾期隐患，逾期原因纳入考核',
}

/** 下周建议按四个模块拆分：COC 调度 / 巡检 / 安全 / 质量 */
const ADVICE_MODULES = [
  { key: 'coc', label: 'COC 调度' },
  { key: 'patrol', label: '巡检' },
  { key: 'safety', label: '安全' },
  { key: 'quality', label: '质量' },
]
/** 指标 → 所属模块 */
const MODULE_BY_CARD = {
  attendRate: 'coc',
  dutyRate: 'coc',
  meetingReportRate: 'coc',
  reportRate: 'coc',
  taskRate: 'patrol',
  closeRate: 'safety',
  newHazard: 'safety',
  overdueHazard: 'safety',
  qmPassRate: 'quality',
  qmBrandCount: 'quality',
  qmMatCount: 'quality',
}

function round1(value) {
  return Math.round(value * 10) / 10
}

/** 本周结论：总结性 + 指导性说明（按概览指标规则化自动生成） */
const overviewConclusion = computed(() => {
  const data = report.value
  const cards = data?.overview?.cards || []
  if (!cards.length) return null

  const withDelta = cards.filter((card) => typeof card.delta === 'number' && card.delta !== 0)
  const isImproved = (card) => (LOWER_IS_BETTER.has(card.key) ? card.delta < 0 : card.delta > 0)
  const improved = withDelta.filter(isImproved)
  const worsened = withDelta.filter((card) => !isImproved(card))
  const flat = cards.filter((card) => card.delta === 0).length
  const bestDelta = improved.slice().sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))[0]

  const attention = []
  cards.forEach((card) => {
    if (card.value === null || card.value === undefined) return
    const target = PCT_TARGET[card.key]
    if (card.unit === '%' && target) {
      const gap = round1(target - card.value)
      if (gap > 0) {
        attention.push({
          card,
          score: gap,
          text: `${card.label} ${card.value}%，低于关注线 ${target}%（差 ${gap} 个百分点）`,
          action: ADVICE_MAP[card.key],
        })
      }
      return
    }
    if (LOWER_IS_BETTER.has(card.key) && typeof card.delta === 'number' && card.delta > 0) {
      attention.push({
        card,
        score: card.delta,
        text: `${card.label} ${card.value}${card.unit || ''}，环比增加 ${card.delta}${card.unit || ''}`,
        action: ADVICE_MAP[card.key],
      })
    }
  })
  attention.sort((a, b) => b.score - a.score)

  const pctCards = cards.filter((card) => card.unit === '%' && PCT_TARGET[card.key] && card.value !== null)
  const passCount = pctCards.filter((card) => card.value >= PCT_TARGET[card.key]).length
  const projectCount = data.projectCount || 0
  const deltaSuffix = (card) => (card.unit === '%' ? ' 个百分点' : ` ${card.unit || ''}`)

  const momText = withDelta.length
    ? `较上周改善 ${improved.length} 项、下滑 ${worsened.length} 项、持平 ${flat} 项` +
      (bestDelta ? `，改善最大为${bestDelta.label}（${bestDelta.delta > 0 ? '+' : ''}${bestDelta.delta}${deltaSuffix(bestDelta)}）` : '')
    : '上周无可比数据，本期不判断环比'

  const focusText = attention.length
    ? `${attention[0].text}${attention.length > 1 ? ` 等 ${attention.length} 项` : ''}`
    : '各项指标均在关注线以上，无需重点督办事项'
  const adviceText = attention.length
    ? `${attention[0].action || `针对${attention[0].card.label}制定专项改进措施`}${attention.length > 1 ? ` 等 ${attention.length} 条` : ''}`
    : '保持当前节奏，继续跟踪易波动指标'

  const momSub = withDelta.length
    ? bestDelta
      ? `最佳 ${bestDelta.label} ${bestDelta.delta > 0 ? '+' : ''}${bestDelta.delta}${deltaSuffix(bestDelta)}`
      : '本周无改善项'
    : '本期不与上周对比'

  const first = attention[0]
  const firstUnit = first ? (first.card.unit === '%' ? '%' : first.card.unit || '') : ''
  const focusMain = first ? `${first.card.label} ${first.card.value}${firstUnit}` : '各项指标均在关注线以上'
  const focusSub = first
    ? `${first.card.unit === '%' && PCT_TARGET[first.card.key] ? `低于关注线 ${PCT_TARGET[first.card.key]}%` : first.text} · 共 ${attention.length} 项`
    : '无需重点督办事项'

  // 下周建议：按 COC 调度 / 巡检 / 安全 / 质量 四个模块分别给建议
  const adviceByModule = ADVICE_MODULES.map((module) => {
    const matched = attention.filter((item) => MODULE_BY_CARD[item.card.key] === module.key)
    if (!matched.length) {
      return { key: module.key, label: module.label, text: '本周无重点关注事项', count: 0, detail: '' }
    }
    return {
      key: module.key,
      label: module.label,
      text: matched
        .slice(0, 2)
        .map((item) => item.action || `针对${item.card.label}制定专项改进措施`)
        .join('；'),
      count: matched.length,
      detail: matched.map((item) => `${item.card.label}：${item.action || '制定专项改进措施'}`).join('；'),
    }
  })

  return {
    items: [
      {
        key: 'overall',
        label: '总体',
        tone: 'neutral',
        main: `${projectCount} 个项目`,
        sub: `${cards.length} 项指标 · ${pctCards.length ? `${passCount}/${pctCards.length} 项比率达标` : '比率指标暂无数据'} · ${attention.length} 项需关注`,
        detail: `本周周报覆盖 ${projectCount} 个在建项目，共汇总 ${cards.length} 项概览指标；其中比率类指标 ${pctCards.length} 项，达到关注线的 ${passCount} 项；列入重点关注 ${attention.length} 项。`,
      },
      {
        key: 'mom',
        label: '环比',
        tone: worsened.length > improved.length ? 'danger' : 'success',
        main: withDelta.length ? `改善${improved.length}·下滑${worsened.length}·持平${flat}` : '上周无可比数据',
        sub: momSub,
        detail: momText,
      },
      {
        key: 'focus',
        label: '重点关注',
        tone: attention.length ? 'warning' : 'success',
        main: focusMain,
        sub: focusSub,
        detail: attention.length ? attention.map((item) => item.text).join('；') : focusText,
      },
    ],
    adviceByModule,
  }
})

/** 旧快照结构归一：保证每个章节都有 columns/rows/totals/charts/extraTables，避免渲染期报错导致白屏 */
function normalizeSection(templateKey, raw) {
  if (!raw || typeof raw !== 'object') return null
  return {
    ...raw,
    key: raw.key || templateKey,
    title: raw.title || '',
    summary: raw.summary || '',
    columns: Array.isArray(raw.columns) ? raw.columns : [],
    rows: Array.isArray(raw.rows) ? raw.rows : [],
    totals: raw.totals || null,
    charts: Array.isArray(raw.charts) ? raw.charts : [],
    extraTables: Array.isArray(raw.extraTables) ? raw.extraTables : [],
  }
}

function normalizeReport(raw) {
  if (!raw || typeof raw !== 'object') return null
  const sections = {}
  Object.keys(raw.sections || {}).forEach((key) => {
    const section = normalizeSection(key, raw.sections[key])
    if (section) sections[key] = section
  })
  const overview = raw.overview && typeof raw.overview === 'object'
    ? {
        ...raw.overview,
        groups: Array.isArray(raw.overview.groups) ? raw.overview.groups : [],
        cards: Array.isArray(raw.overview.cards) ? raw.overview.cards : [],
      }
    : { groups: [], cards: [] }
  return {
    ...raw,
    sections,
    overview,
    appendix: Array.isArray(raw.appendix) ? raw.appendix : [],
  }
}

function load() {
  const raw = getWeeklyReport(route.params.id)
  if (!raw) {
    report.value = null
    return
  }
  const normalized = normalizeReport(raw)
  // 展示派生数据（图表/明细）失败时降级为原始快照，保证正文可用
  try {
    report.value = ensureSectionExtras(ensureReportRichData(normalized))
  } catch (error) {
    report.value = normalized
  }
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

/** 渲染异常兜底：记录标记，页面仍显示已加载内容，避免整页白屏 */
onErrorCaptured(() => {
  renderError.value = true
  return false
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

    <el-alert
      v-if="renderError"
      class="render-error-alert"
      type="warning"
      :closable="true"
      show-icon
      title="部分内容未能正常展示"
      description="周报正文与统计表已尽量展示；如仍有内容缺失，可尝试刷新页面或重新打开本周周报。"
      @close="renderError = false"
    />

    <div class="detail-layout">
      <aside class="detail-nav">
        <div v-for="item in anchors" :key="item.id" class="nav-item" :class="{ 'is-active': activeAnchor === item.id }" @click="scrollTo(item.id)">
          {{ item.title }}
        </div>
      </aside>

      <div class="detail-body">
        <!-- 本周结论：置于「一、本周概览」之上（总结性 + 指导性说明） -->
        <div v-if="overviewConclusion" class="overview-conclusion">
          <div class="oc-head">
            <span class="oc-title">本周结论</span>
          </div>
          <div class="oc-grid">
            <el-tooltip
              v-for="item in overviewConclusion.items"
              :key="item.key"
              :content="item.detail"
              placement="top"
              effect="dark"
              :disabled="!item.detail"
            >
              <div class="oc-card" :class="[`is-${item.tone}`, { 'is-nowrap': item.key === 'mom' }]">
                <div class="oc-card-label"><i class="oc-dot" />{{ item.label }}</div>
                <div class="oc-card-main">{{ item.main }}</div>
                <div class="oc-card-sub">{{ item.sub }}</div>
              </div>
            </el-tooltip>
          </div>

          <!-- 下周建议：按 COC 调度 / 巡检 / 安全 / 质量 四个模块拆分 -->
          <div class="oc-advice">
            <div class="oc-advice-head">
              <span class="oc-advice-title">下周建议</span>
            </div>
            <div class="oc-advice-grid">
              <el-tooltip
                v-for="item in overviewConclusion.adviceByModule"
                :key="item.key"
                :content="item.detail"
                placement="top"
                effect="dark"
                :disabled="!item.detail"
              >
                <div class="oc-advice-item" :class="{ 'is-empty': !item.count }">
                  <span class="oc-advice-module">{{ item.label }}</span>
                  <span class="oc-advice-text">{{ item.text }}</span>
                </div>
              </el-tooltip>
            </div>
          </div>
        </div>

        <!-- 一、本周概览 -->
        <section id="overview" class="weekly-section overview-section">
          <div class="section-head">
            <h2 class="section-title">一、本周概览</h2>
          </div>

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
.render-error-alert {
  margin-bottom: 14px;
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
.overview-conclusion {
  margin: 0 0 16px;
  padding: 14px 16px 16px;
  border: 1px solid var(--ap-border, #ebeef5);
  border-radius: 10px;
  background: #fff;
  box-shadow: 0 2px 10px rgba(145, 0, 61, 0.05);
  position: relative;
  overflow: hidden;
}
.overview-conclusion::before {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  height: 3px;
  background: linear-gradient(90deg, var(--ap-primary, #91003d), #d38aa6 45%, #f3eaf0);
}
.oc-head {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin-bottom: 8px;
}
.oc-title {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
  padding-left: 8px;
  border-left: 3px solid var(--ap-primary, #91003d);
}
.oc-sub {
  font-size: 12px;
  color: var(--ap-text-muted, #909399);
}
.oc-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}
.oc-card {
  position: relative;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 12px 14px 12px 16px;
  border: 1px solid var(--ap-border, #ebeef5);
  border-radius: 10px;
  background: #fff;
  transition: box-shadow 0.18s ease, transform 0.18s ease;
}
.oc-card::before {
  content: '';
  position: absolute;
  left: 0;
  top: 12px;
  bottom: 12px;
  width: 3px;
  border-radius: 0 3px 3px 0;
  background: #c0c4cc;
}
.oc-card.is-success::before {
  background: #67c23a;
}
.oc-card.is-danger::before {
  background: #f56c6c;
}
.oc-card.is-warning::before {
  background: #e6a23c;
}
.oc-card.is-primary::before {
  background: var(--ap-primary, #91003d);
}
.oc-card:hover {
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.08);
  transform: translateY(-1px);
}
.oc-card-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--ap-text-muted, #909399);
}
.oc-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #c0c4cc;
  flex: 0 0 auto;
}
.is-success .oc-dot {
  background: #67c23a;
}
.is-danger .oc-dot {
  background: #f56c6c;
}
.is-warning .oc-dot {
  background: #e6a23c;
}
.is-primary .oc-dot {
  background: var(--ap-primary, #91003d);
}
.oc-card-main {
  font-size: 14.5px;
  font-weight: 700;
  color: #303133;
  line-height: 1.45;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}
/* 环比卡：「改善 / 下滑 / 持平」放同一行，超长省略（悬浮看完整说明） */
.oc-card.is-nowrap .oc-card-main {
  display: block;
  white-space: nowrap;
  text-overflow: ellipsis;
  -webkit-line-clamp: unset;
  font-size: 13.5px;
}
.oc-card.is-danger .oc-card-main {
  color: #c45656;
}
.oc-card-sub {
  font-size: 12px;
  color: var(--ap-text-muted, #909399);
  line-height: 1.5;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}
@media (max-width: 1100px) {
  .oc-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .oc-advice-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
/* 下周建议：按四个模块拆分 */
.oc-advice {
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px dashed var(--ap-border, #ebeef5);
}
.oc-advice-head {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin-bottom: 8px;
}
.oc-advice-title {
  font-size: 13px;
  font-weight: 700;
  color: var(--ap-text, #303133);
  padding-left: 8px;
  border-left: 3px solid var(--ap-primary, #91003d);
}
.oc-advice-sub {
  font-size: 12px;
  color: var(--ap-text-muted, #909399);
}
.oc-advice-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}
.oc-advice-item {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px 12px;
  border-radius: 8px;
  background: #faf7f9;
  border: 1px solid #f3eaf0;
}
.oc-advice-item.is-empty {
  background: #f7f8fa;
  border-color: #f0f2f5;
}
.oc-advice-module {
  font-size: 12px;
  font-weight: 700;
  color: var(--ap-primary, #91003d);
}
.oc-advice-item.is-empty .oc-advice-module {
  color: var(--ap-text-muted, #909399);
}
.oc-advice-text {
  font-size: 12.5px;
  line-height: 1.55;
  color: #303133;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.oc-advice-item.is-empty .oc-advice-text {
  color: var(--ap-text-muted, #909399);
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
