<script setup>
import { isHazardSamplingIndicatorVisible } from '../../config/hazardSamplingVisibility.js'
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Close } from '@element-plus/icons-vue'
import {
  assessmentPeriods, dateGap, displayTime, getAssessmentPreview, getDisplayedWork, getGeneratedInspectionTasks, getInspectionPeriod,
  getSamplingRowsInRange, groupProjects, hazardStates, inspectionScopes, percent,
} from '../dashboardData.js'

const props = defineProps({
  request: { type: Object, required: true },
  data: { type: Object, required: true },
  today: { type: String, required: true },
  workDate: { type: String, required: true },
})
const emit = defineEmits(['close', 'update:workDate'])

const panels = {
  inspection: { title: '巡检执行', source: '巡检管理 · 巡检任务', tabs: { generated: '任务总数', overdue: '当前逾期', month: '本月到期' } },
  hazards: { title: '巡检隐患闭环', source: '巡检管理 · 隐患清单', tabs: { month: '本月下发', overdue: '当前逾期', new: '本月新增' } },
  sampling: { title: '抽检与全面复查', source: '隐患清单汇总 · 隐患问题清单汇总 / 抽检任务 / 施工隐患复查', tabs: { coverage: '指挥部抽查', results: '监理抽检', review: '施工全面复查' } },
  work: { title: '当日施工作业', source: '施工作业申报 · 每日施工作业 / 危大工程信息登记', tabs: { danger: '危险作业', major: '危大作业登记' } },
  major: { title: '危大工程管控', source: '危大工程管理 · 危大清单 / 危大工程日历', tabs: { overdue: '超期未验收', alerts: '待处理异常', active: '在施工程' } },
  assessment: { title: '月度巡检专项考核', source: '考核评分 · 考核排名 / 扣分明细', tabs: {} },
}

const panel = computed(() => panels[props.request.kind])
const router = useRouter()
const dialog = ref(null)
const tab = ref(props.request.view || Object.keys(panel.value.tabs)[0])
const isSampling = computed(() => props.request.kind === 'sampling')
const samplingPhase = computed(() => tab.value === 'sampling' ? 'results' : tab.value)
const samplingOutcomeFilters = { coverage: ['未抽查', '已抽查'], results: ['不合格', '合格'] }
const isSamplingOutcome = computed(() => isSampling.value && Boolean(samplingOutcomeFilters[tab.value]))
const samplingDateControl = computed(() => tab.value === 'coverage' ? '登记日期' : tab.value === 'results' ? '结果提交日期' : '任务下发日期')
const monthStart = computed(() => props.today.slice(0, 7) + '-01')
const samplingStart = ref(isSamplingOutcome.value ? monthStart.value : '')
const samplingEnd = ref(isSamplingOutcome.value ? props.today : '')
const samplingRange = computed(() => {
  if (!samplingStart.value && !samplingEnd.value) return 'all'
  return samplingStart.value === monthStart.value && samplingEnd.value === props.today ? 'month' : 'custom'
})
const projectId = ref(props.request.projectId || '')
const keyword = ref('')
const inspectionScope = ref('month')
const filter = ref(isSampling.value && !isSamplingOutcome.value ? '未办结' : props.request.filter || '')
const periods = assessmentPeriods()
const period = ref(periods[0]?.id || '')
const assessmentType = ref('')
const inspectionPeriod = computed(() => getInspectionPeriod(props.data.tasks, props.today))
const unknownGeneratedCount = computed(() => props.data.tasks.filter(row => !row.generated).length)
const workPeriod = computed(() => getDisplayedWork(props.data, props.workDate, tab.value, props.today))

onMounted(() => dialog.value.showModal())
watch(tab, () => {
  filter.value = isSampling.value && !isSamplingOutcome.value ? '未办结' : ''
  if (isSampling.value) setSamplingRange(isSamplingOutcome.value ? 'month' : 'all')
})

function setSamplingRange(range) {
  samplingStart.value = range === 'month' ? monthStart.value : ''
  samplingEnd.value = range === 'month' ? props.today : ''
}

function originalSamplingTaskHref(id) {
  return router.resolve({ path: `/hazard-issues/sampling-task/${encodeURIComponent(id)}`, query: { viewer: 'hq' } }).href
}

function columns(labels) {
  return labels.split('|')
}

function view(rows, summaryColumns, detailColumns, summarize, describe, filters = [], filterBy = null) {
  return { rows, summaryColumns: columns(summaryColumns), detailColumns: columns(detailColumns),
    summarize, describe, filters, filterBy }
}

function inspectionView() {
  if (tab.value === 'generated') {
    const generated = getGeneratedInspectionTasks(props.data.tasks, inspectionScope.value, props.today)
    return view(generated, '项目|生成任务数|已完成|未完成',
      '任务编号|巡检分类|任务来源|生成日期|日期依据|执行人|截止日期|执行状态',
      group => {
        const done = group.rows.filter(row => row.completed).length
        return [group.name, group.rows.length, done, group.rows.length - done]
      },
      row => [row.number, row.categories, row.source, row.generated, row.generatedFrom, row.executor, row.deadline, row.status],
      ['安全', '质量', '其他'], row => row.categories.split('、'))
  }
  const rows = tab.value === 'overdue' ? props.data.tasks.filter(row => row.overdue) : inspectionPeriod.value.rows
  return view(rows, '项目|任务数|已完成|完成率|逾期',
    '任务编号|巡检分类|执行人|截止日期|执行状态|逾期天数',
    group => {
      const done = group.rows.filter(row => row.completed).length
      return [group.name, group.rows.length, done, percent(done, group.rows.length), group.rows.filter(row => row.overdue).length]
    },
    row => [row.number, row.categories, row.executor, row.deadline, row.status, row.overdue ? dateGap(props.today, row.deadline) : '—'],
    ['安全', '质量', '其他'], row => row.categories.split('、'))
}

function hazardView() {
  const rows = props.data.hazards.filter(row => {
    if (tab.value === 'overdue') return row.overdue
    if (tab.value === 'new') return row.newThisMonth
    return row.issuedThisMonth
  })
  return view(rows, '项目|整改单数|待整改|待验收|待复查|已关闭|闭环率|其中逾期',
    '整改单号|隐患内容|类型／等级|登记日期|下发日期|整改截止日|状态／办理节点|关闭日期',
    group => {
      const counts = hazardStates.map(item => group.rows.filter(row => row.status === item.label).length)
      return [group.name, group.rows.length, ...counts, percent(counts.at(-1), group.rows.length),
        group.rows.filter(row => row.overdue).length]
    },
    row => [row.number, row.description, [row.category, row.level].filter(Boolean).join(' / '),
      row.registered, row.issued, row.deadline, [row.status, row.node].filter(Boolean).join(' / '), row.closed],
    hazardStates.map(item => item.label), row => [row.status])
}

function samplingView() {
  const sourceNames = ['安质巡检', '监理会议', '调度隐患', '随手拍']
  const inRange = (rows, field) => getSamplingRowsInRange(rows, field, samplingStart.value, samplingEnd.value)
  if (tab.value === 'coverage') {
    return view(inRange(props.data.coverage, 'registered'), '项目|可抽查|已抽查|未抽查|抽查覆盖率',
      '来源|单据编号|隐患内容|登记日期|指挥部抽查结论|抽查时间',
      group => {
        const checked = group.rows.filter(row => row.check).length
        return [group.name, group.rows.length, checked, group.rows.length - checked, percent(checked, group.rows.length)]
      },
      row => [row.source, row.number, row.description, row.registered, row.check?.result || '未抽查', displayTime(row.check?.time)],
      [...samplingOutcomeFilters.coverage, ...sourceNames], row => [row.check ? '已抽查' : '未抽查', row.source])
  }
  if (tab.value === 'results') {
    return view(inRange(props.data.results, 'time'), '项目|已抽检|不合格|抽检不合格率',
      '抽检批次|来源|单据编号|隐患内容|抽检结论|提交时间',
      group => {
        const fail = group.rows.filter(row => row.outcome === '不合格').length
        return [group.name, group.rows.length, fail, percent(fail, group.rows.length)]
      },
      row => [row.batch, row.source, row.number, row.description, row.outcome, displayTime(row.time)],
      [...samplingOutcomeFilters.results, ...sourceNames], row => [row.outcome, row.source])
  }
  const stage = tab.value === 'review' ? 'manager' : 'supervisor'
  const isReview = stage === 'manager'
  const rows = inRange(props.data.batches.filter(row => row.stage === stage), 'sent')
  const onlyUnfinished = ['未办结', '待办理', '办理中'].includes(filter.value)
  const status = row => row.complete ? '已办结' : row.done ? '办理中' : '待办理'
  return view(rows,
    `项目|未办结批次${onlyUnfinished ? '' : '|批次数'}|已办张数|应办张数`,
    `任务编号|来源|下发时间|${isReview ? '复查人' : '抽检人'}|已办／应办|状态${isReview ? '|关联原抽检任务' : ''}`,
    group => [group.name, group.rows.filter(row => !row.complete).length, ...(onlyUnfinished ? [] : [group.rows.length]),
      group.rows.reduce((sum, row) => sum + row.done, 0), group.rows.reduce((sum, row) => sum + row.total, 0)],
    row => [row.id, row.source, row.sent, row.recipient, row.done + ' / ' + row.total, status(row), ...(isReview ? [row.parent] : [])],
    ['未办结', '待办理', '办理中', '已办结', ...sourceNames],
    row => [status(row), row.complete ? '' : '未办结', ...row.source.split('、')])
}

function workView() {
  const rows = workPeriod.value.rows
  return view(rows, '项目|当日项数|类别及数量', '类别|施工单位|作业区域|作业内容|作业时段|管控措施',
    group => {
      const counts = new Map()
      for (const row of group.rows) counts.set(row.category, (counts.get(row.category) || 0) + 1)
      return [group.name, group.rows.length, [...counts].map(([name, count]) => name + ' ' + count + ' 项').join(' · ')]
    },
    row => [row.category, row.contractor, row.area, row.content, row.time, row.measures],
    [...new Set(rows.map(row => row.category))], row => [row.category])
}

function majorView() {
  if (tab.value === 'alerts') {
    const rows = props.data.alerts.filter(row => row.status !== '已关闭')
    return view(rows, '项目|待处理异常',
      '工程|施工部位|异常类型|异常内容|产生时间|处置状态',
      group => [group.name, group.rows.length],
      row => [row.name, row.part, row.kind, row.content, row.time, row.status])
  }
  const rows = props.data.engineering.filter(row => tab.value === 'overdue' ? row.overdue : row.status === '在施')
  return view(rows, '项目|工程数|其中超危|其中超期未验收',
    '工程|类别|超危|施工状态|施工部位／计划完工／验收',
    group => [group.name, group.rows.length, group.rows.filter(row => row.superMajor).length,
      group.rows.filter(row => row.overdue).length],
    row => [row.name, row.category, row.superMajor ? '是' : '否', row.status,
      row.parts.filter(part => tab.value !== 'overdue' || part.overdue)
        .map(part => [part.name, part.due || '—', part.acceptance].join(' / ')).join('\n')],
    ['超危工程', ...new Set(rows.map(row => row.category).filter(Boolean))],
    row => [row.category, row.superMajor ? '超危工程' : ''])
}

const currentView = computed(() => {
  if (props.request.kind === 'inspection') return inspectionView()
  if (props.request.kind === 'hazards') return hazardView()
  if (props.request.kind === 'sampling') return samplingView()
  if (props.request.kind === 'work') return workView()
  if (props.request.kind === 'major') return majorView()
  return null
})

const activeTab = computed(() => isSampling.value ? samplingPhase.value : tab.value)
const search = computed(() => keyword.value.trim().toLowerCase())
const groups = computed(() => {
  const current = currentView.value
  if (!current) return []
  const rows = current.rows.filter(row => !filter.value || current.filterBy?.(row).includes(filter.value))
  // 按结论筛选明细时，项目比率仍以所选日期内的全部单据为分母。
  const totals = isSamplingOutcome.value && samplingOutcomeFilters[tab.value].includes(filter.value)
    ? new Map(groupProjects(current.rows, props.data.projects).map(group => [group.id, group]))
    : null
  return groupProjects(rows, props.data.projects)
    .filter(group => !search.value || [group.name, props.data.projects.get(group.id)?.fullName]
      .some(value => String(value || '').toLowerCase().includes(search.value)))
    .map(group => ({ ...group, values: current.summarize(totals?.get(group.id) || group) }))
    .sort((a, b) => {
      const isHazard = props.request.kind === 'hazards'
      const index = isHazard && tab.value !== 'new' ? 7 : 1
      return b.values[index] - a.values[index] || b.rows.length - a.rows.length || a.name.localeCompare(b.name, 'zh-CN')
    })
})
const selected = computed(() => groups.value.find(group => group.id === projectId.value))
const selectedName = computed(() => selected.value?.name || props.data.projects.get(projectId.value)?.label || '项目明细')
const detailRows = computed(() => (selected.value?.rows || []).map(row => ({
  id: row.id, data: currentView.value.describe(row), entries: row.entries, parent: tab.value === 'review' ? row.parent : '',
})))
const expandedBatch = ref('')
watch([tab, projectId], () => { expandedBatch.value = '' })
const previewRows = computed(() => period.value ? getAssessmentPreview(period.value, assessmentType.value)
  .filter(row => !search.value || row.name.toLowerCase().includes(search.value)) : [])
const previewProject = computed(() => previewRows.value.find(row => row.id === projectId.value))

function close() {
  emit('close')
}

function handleBackdrop(event) {
  if (event.target === dialog.value) close()
}
</script>

<template>
  <dialog ref="dialog" class="hd-dialog" aria-labelledby="hd-dialog-title" @cancel.prevent="close" @click="handleBackdrop">
    <div class="hd-dialog-inner">
      <header class="hd-dialog-head">
        <div><p>工程指挥部 · 项目明细</p><h2 id="hd-dialog-title">{{ panel.title }}</h2></div>
        <button type="button" class="hd-icon-button" aria-label="关闭明细" @click="close"><Close /></button>
      </header>

      <div v-if="currentView" class="hd-dialog-controls" :class="{ 'hd-sampling-controls': isSampling }">
        <div class="hd-tabs" :aria-label="isSampling ? '抽查环节' : '明细视图'">
          <button v-for="(label, id) in panel.tabs" :key="id" type="button" :aria-pressed="activeTab === id"
            @click="activeTab !== id && (tab = id)">{{ label }}</button>
        </div>
        <div v-if="isSampling && samplingPhase === 'results'" class="hd-tabs" aria-label="监理抽检视图">
          <button type="button" :aria-pressed="tab === 'results'" @click="tab = 'results'">抽检结果</button>
          <button type="button" :aria-pressed="tab === 'sampling'" @click="tab = 'sampling'">抽检批次</button>
        </div>
        <div class="hd-filters">
          <div v-if="isSampling" class="hd-sampling-dates">
            <span>{{ samplingDateControl }}</span>
            <div class="hd-tabs" aria-label="日期范围">
              <button type="button" :aria-pressed="samplingRange === 'month'" @click="setSamplingRange('month')">本月</button>
              <button type="button" :aria-pressed="samplingRange === 'all'" @click="setSamplingRange('all')">全部</button>
            </div>
            <input v-model="samplingStart" type="date" aria-label="开始日期" :max="samplingEnd || today">
            <span aria-hidden="true">至</span>
            <input v-model="samplingEnd" type="date" aria-label="结束日期" :min="samplingStart || undefined" :max="today">
          </div>
          <select v-if="request.kind === 'inspection' && tab === 'generated'" aria-label="巡检任务统计范围"
            v-model="inspectionScope">
            <option v-for="scope in inspectionScopes" :key="scope.value" :value="scope.value">{{ scope.label }}</option>
          </select>
          <input v-if="request.kind === 'work'" type="date" aria-label="作业日期" :value="workDate" :max="today"
            @change="emit('update:workDate', $event.target.value)">
          <select v-if="currentView.filters.length" v-model="filter" aria-label="筛选明细">
            <option value="">全部条件</option>
            <option v-for="item in currentView.filters" :key="item">{{ item }}</option>
          </select>
          <input v-if="!projectId" v-model="keyword" type="search" aria-label="搜索项目" placeholder="搜索项目">
        </div>
      </div>
      <template v-if="currentView">
        <div class="hd-dialog-caption">
          <template v-if="projectId">
            <button type="button" class="hd-text-button" @click="projectId = ''">全部项目</button>
            <span aria-hidden="true">/</span><strong>{{ selectedName }}</strong>
            <span>{{ detailRows.length }} 条</span>
          </template>
          <template v-else>
            <strong>{{ panel.tabs[activeTab] }}</strong><span>{{ groups.length }} 个项目</span>
            <span v-if="request.kind === 'work'">{{ workDate }}</span>
          </template>
          <span v-if="isSampling && tab === 'coverage'">抽查结论截至今日</span>
          <span v-if="request.kind === 'work' && workPeriod.exampleDate" class="hd-example">当日暂无登记 · 台账示例 {{ workPeriod.exampleDate }}</span>
          <span v-if="request.kind === 'inspection' && tab === 'generated' && unknownGeneratedCount">
            {{ unknownGeneratedCount }} 条历史任务无生成日期，仅计入「全部」
          </span>
          <span v-if="request.kind === 'inspection' && tab === 'month' && inspectionPeriod.exampleMonth" class="hd-example">本月暂无到期任务 · 台账示例 {{ inspectionPeriod.exampleMonth }}</span>
        </div>
        <div class="hd-table-wrap">
          <table v-if="!projectId && groups.length">
            <thead><tr><th v-for="title in currentView.summaryColumns" :key="title">{{ title }}</th></tr></thead>
            <tbody><tr v-for="group in groups" :key="group.id">
              <td><button type="button" class="hd-text-button" @click="projectId = group.id">{{ group.name }}</button></td>
              <td v-for="(value, index) in group.values.slice(1)" :key="index">{{ value }}</td>
            </tr></tbody>
          </table>
          <table v-else-if="projectId && detailRows.length">
            <thead><tr><th v-for="title in currentView.detailColumns" :key="title">{{ title }}</th></tr></thead>
            <tbody>
              <template v-for="row in detailRows" :key="row.id">
                <tr><td v-for="(value, index) in row.data" :key="index">
                  <button v-if="index === 0 && row.entries" type="button" class="hd-text-button"
                    :aria-expanded="expandedBatch === row.id" @click="expandedBatch = expandedBatch === row.id ? '' : row.id">{{ value }}</button>
                  <a v-else-if="row.parent && index === row.data.length - 1" class="hd-text-button"
                    :href="originalSamplingTaskHref(row.parent)" target="_blank" rel="noopener">{{ value }}</a>
                  <template v-else>{{ value || (value === 0 ? '0' : '—') }}</template>
                </td></tr>
                <tr v-if="row.entries && expandedBatch === row.id" class="hd-entries">
                  <td :colspan="currentView.detailColumns.length">
                    <ul>
                      <li v-for="entry in row.entries" :key="entry.id">
                        <strong>{{ entry.number }}</strong><span>{{ entry.description || '—' }}</span><b>{{ entry.outcome || '待办理' }}</b>
                      </li>
                    </ul>
                  </td>
                </tr>
              </template>
            </tbody>
          </table>
          <div v-else class="hd-dialog-empty">当前条件下暂无记录</div>
        </div>
      </template>
      <template v-else>
        <div class="hd-dialog-controls">
          <div class="hd-filters">
            <select v-model="period" aria-label="考核月份">
              <option v-for="item in periods" :key="item.id" :value="item.id">{{ item.label }}</option>
            </select>
            <select v-model="assessmentType" aria-label="考核类型">
              <option value="">全部考核类型</option><option value="pre">前期</option><option value="build">在建</option><option value="close">收尾</option>
            </select>
            <input v-model="keyword" type="search" aria-label="搜索考核项目" placeholder="搜索项目">
          </div>
          <span class="hd-example">原型示例 · 按专项上限折算百分制</span>
        </div>
        <div class="hd-dialog-caption">
          <button v-if="previewProject" type="button" class="hd-text-button" @click="projectId = ''">全部项目</button>
          <strong>{{ previewProject?.name || '项目专项得分' }}</strong><span v-if="previewProject">{{ previewProject.points }} 分 · {{ previewProject.type }}</span>
        </div>
        <div class="hd-table-wrap">
          <table v-if="previewProject">
            <thead><tr><th>指标</th><th>考核值</th><th>上限</th><th>扣分</th></tr></thead>
            <tbody><tr v-for="line in previewProject.lines.filter(line => isHazardSamplingIndicatorVisible(line.indicator_id))" :key="line.indicator_id">
              <td>{{ line.indicator_name }}</td><td>{{ line.value_text || '不涉及' }}</td>
              <td>{{ line.cap }}</td><td>{{ line.involved ? line.deduct : '—' }}</td>
            </tr></tbody>
          </table>
          <table v-else-if="previewRows.length">
            <thead><tr><th>项目</th><th>考核类型</th><th>专项得分／上限</th><th>专项得分（满分100）</th><th>扣分项</th></tr></thead>
            <tbody><tr v-for="row in previewRows" :key="row.id">
              <td><button type="button" class="hd-text-button" @click="projectId = row.id">{{ row.name }}</button></td>
              <td>{{ row.type }}</td><td>{{ row.score }} / {{ row.maximum }}</td><td>{{ row.points }} 分</td>
              <td>{{ row.lines.filter(line => isHazardSamplingIndicatorVisible(line.indicator_id) && line.involved && line.deduct > 0).map(line => line.indicator_name + ' ' + line.deduct + ' 分').join('、') || '—' }}</td>
            </tr></tbody>
          </table>
          <div v-else class="hd-dialog-empty">当前条件下暂无考核样例</div>
        </div>
      </template>
      <footer class="hd-dialog-foot"><span>数据来源 · {{ panel.source }}</span><button type="button" class="hd-button" @click="close">关闭</button></footer>
    </div>
  </dialog>
</template>
