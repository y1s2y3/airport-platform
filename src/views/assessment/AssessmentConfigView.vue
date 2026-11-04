<script setup>
/**
 * 考核配置。指标配置、等级配置、考核项目仅指挥部。考核指标项目级只读。
 */
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Plus, Delete } from '@element-plus/icons-vue'
import { useCurrentProject } from '../../composables/useCurrentProject'
import { projectStatusOptions } from '../../mock/projectBasicInfo'
import {
  getAssessmentGrades,
  getAssessmentIndicators,
  formatIndicatorFormula,
  getExcludeHistorical,
  isProjectIncluded,
  listAssessmentProjects,
  listIndicatorConfigs,
  saveAssessmentGrades,
  saveAssessmentProjects,
  saveIndicatorBands,
  saveIndicatorConfigs,
} from '../../mock/assessmentScore'

const { isHqSelected, selectedProjectId } = useCurrentProject()
const route = useRoute()
const canSave = computed(() => true)
/** 项目级：该项目在考核项目矩阵中是否有任一已启用指标为开 */
const projectIncluded = computed(() => isHqSelected.value || isProjectIncluded(selectedProjectId.value))
const section = computed(() => {
  if (route.path.includes('/indicator-config')) return 'indicator-config'
  if (route.path.includes('/indicators')) return 'indicators'
  if (route.path.includes('/grades')) return 'grades'
  return 'projects'
})
const pageTitle = computed(() => ({
  projects: '考核项目',
  indicators: '考核指标',
  'indicator-config': '指标配置',
  grades: '等级配置',
}[section.value]))

const projects = ref(listAssessmentProjects())
const indicators = ref(getAssessmentIndicators())
const indicatorConfigs = ref(listIndicatorConfigs())
const GRADE_PALETTE = ['#67c23a', '#409eff', '#e6a23c', '#f56c6c', '#91003d', '#909399']
const GRADE_COLOR_FALLBACK = ['#f56c6c', '#e6a23c', '#409eff', '#67c23a']

function gradeRowsFromState(list) {
  return [...list]
    .sort((left, right) => Number(left.min) - Number(right.min) || Number(left.max) - Number(right.max))
    .map((item, index) => ({
      id: item.id,
      name: item.name,
      min: item.min,
      max: item.max,
      color: item.color || GRADE_COLOR_FALLBACK[index] || '#909399',
      min_cmp: index === 0 || item.min_inclusive ? 'gte' : 'gt',
      max_cmp: 'lte',
    }))
}

function nextGradeColor() {
  const used = new Set(grades.value.map((item) => item.color))
  return GRADE_PALETTE.find((color) => !used.has(color)) || '#909399'
}

const grades = ref(gradeRowsFromState(getAssessmentGrades()))

const projectKeyword = ref('')
const projectStatus = ref('')
const excludeHistorical = ref(getExcludeHistorical())
const filteredProjects = computed(() => {
  const text = projectKeyword.value.trim()
  return projects.value.filter((row) => {
    const nameOk = !text || String(row.project_name || '').includes(text)
    const statusOk = !projectStatus.value || row.project_status === projectStatus.value
    return nameOk && statusOk
  })
})

function rowAllOn(row) {
  return indicators.value.length > 0 && indicators.value.every((item) => !!row.switches?.[item.id])
}

function setRowIndicators(row, value) {
  indicators.value.forEach((item) => {
    row.switches[item.id] = value
  })
}

function historicalLocked(row) {
  return excludeHistorical.value && row.project_status === '历史'
}

watch(excludeHistorical, (value) => {
  if (!value) return
  projects.value.forEach((row) => {
    if (row.project_status === '历史') setRowIndicators(row, false)
  })
})

watch(() => route.path, () => {
  indicators.value = getAssessmentIndicators()
  indicatorConfigs.value = listIndicatorConfigs()
  projects.value = listAssessmentProjects()
})

function snapshotConfigs() {
  return indicatorConfigs.value.map((item) => ({
    ...item,
    formula: (item.formula || []).map((token) => ({ ...token })),
    rule_text: item.rule_text || '',
  }))
}

function toggleIndicatorEnabled(row, value) {
  const next = snapshotConfigs().map((item) => (
    item.id === row.id ? { ...item, enabled: value } : item
  ))
  applyConfigSave(next, value ? '指标已启用。已结束月份不改名次，出勤和摄像头次日纳入月平均；塔吊按月累计，每日施工作业计填报率，任务、隐患、预警在次月 1 日统计' : '指标已停用。已结束月份不改名次，出勤和摄像头次日纳入月平均；塔吊按月累计，每日施工作业计填报率，任务、隐患、预警在次月 1 日统计')
}

function applyConfigSave(rows, successText) {
  const result = saveIndicatorConfigs(rows)
  if (!result.ok) {
    ElMessage.warning(result.msg)
    return false
  }
  indicatorConfigs.value = listIndicatorConfigs()
  indicators.value = getAssessmentIndicators()
  projects.value = listAssessmentProjects()
  ElMessage.success(successText)
  return true
}

function saveProjects() {
  const result = saveAssessmentProjects(projects.value, { excludeHistorical: excludeHistorical.value })
  if (!result.ok) {
    ElMessage.warning(result.msg)
    return
  }
  projects.value = listAssessmentProjects()
  excludeHistorical.value = getExcludeHistorical()
  ElMessage.success('考核项目已保存。历史项目不参与评分打开时，历史项目不计分。已结束月份不改名次，出勤和摄像头次日纳入月平均；塔吊按月累计，每日施工作业计填报率，任务、隐患、预警在次月 1 日统计')
}

function saveGrades() {
  const result = saveAssessmentGrades(grades.value)
  if (!result.ok) {
    ElMessage.warning(result.msg)
    return
  }
  grades.value = gradeRowsFromState(getAssessmentGrades())
  ElMessage.success('等级已保存。已结束月份不改等级，出勤和摄像头次日纳入月平均；塔吊按月累计，每日施工作业计填报率，任务、隐患、预警在次月 1 日统计')
}

function resetGrades() {
  grades.value = gradeRowsFromState(getAssessmentGrades())
}

function removeGrade(index) {
  if (index === 0 || grades.value.length <= 1) return
  grades.value.splice(index, 1)
  const prev = grades.value[index - 1]
  const current = grades.value[index]
  if (prev && current) current.min = prev.max
  grades.value[grades.value.length - 1].max = 100
}

function addGradeAfter(index) {
  const current = grades.value[index]
  const next = grades.value[index + 1]
  const lower = Number(current?.max ?? 0)
  if (!next) {
    const start = Number(current?.min ?? 0)
    const mid = Math.round(((start + 100) / 2) * 10) / 10
    current.max = mid
    grades.value.push({
      id: `g-${Date.now()}`,
      name: '',
      min: mid,
      max: 100,
      color: nextGradeColor(),
      min_cmp: 'gt',
      max_cmp: 'lte',
    })
    return
  }
  const upper = Number(next.max)
  const mid = Math.round(((lower + upper) / 2) * 10) / 10
  grades.value.splice(index + 1, 0, {
    id: `g-${Date.now()}`,
    name: '',
    min: lower,
    max: mid,
    color: nextGradeColor(),
    min_cmp: 'gt',
    max_cmp: 'lte',
  })
  next.min = mid
  grades.value[grades.value.length - 1].max = 100
}

function onGradeMaxChange(index) {
  const next = grades.value[index + 1]
  if (next) next.min = grades.value[index].max
}

const bandVisible = ref(false)
const bandTarget = ref(null)
const bandForm = ref({ not_involved: '', bands: [] })
const bandUnitText = computed(() => {
  const unit = bandTarget.value?.band_unit || bandTarget.value?.value_unit || ''
  if (unit === '百分比') return '%'
  return unit || '--'
})

/** 列表/详情展示单位：内置「百分比」显示为 %，自定义指标按录入文本展示。 */
function displayUnitText(value) {
  const unit = String(value || '').trim()
  if (!unit) return '--'
  if (unit === '百分比') return '%'
  return unit
}

function sortBands(bands) {
  return [...bands].sort((left, right) => {
    const leftMin = left.min === null || left.min === undefined || left.min === '' ? Number.NEGATIVE_INFINITY : Number(left.min)
    const rightMin = right.min === null || right.min === undefined || right.min === '' ? Number.NEGATIVE_INFINITY : Number(right.min)
    return leftMin - rightMin
  })
}

function formatBound(value) {
  if (value === null || value === undefined || value === '') return '不限'
  const number = Number(value)
  if (Number.isNaN(number)) return '--'
  return Number.isInteger(number) ? String(number) : String(Math.round(number * 10) / 10)
}

function scoreRuleUnit(row) {
  const unit = row.band_unit || row.value_unit || ''
  if (unit === '百分比') return '%'
  return unit
}

/** 比率与强度类单位保留 1 位小数；计数类（条/个/人次/次/台/天）取整。 */
function isDecimalUnit(unit) {
  const text = String(unit || '')
  return text === '%' || text.includes('%') || text.includes('台·日') || text.includes('台日') || text.includes('/')
}

/** 考核成绩句式中的数值：比率与报警强度保留 1 位，其余按整数。 */
function formatRuleNumber(value, unit) {
  const number = Number(value)
  if (Number.isNaN(number)) return '--'
  if (isDecimalUnit(unit)) return number.toFixed(1)
  return Number.isInteger(number) ? String(number) : String(Math.round(number * 10) / 10)
}

/** 本档扣分统一保留 1 位小数（与综合得分/扣分合计同口径）。 */
function formatRuleDeduct(value) {
  const number = Number(value)
  if (Number.isNaN(number)) return '--'
  return number.toFixed(1)
}

/** 分档边界是否为空（空表示该侧不限）：为空时对应单位与比较符不展示，保持句式可读。 */
function isBoundEmpty(value) {
  return value === null || value === undefined || value === ''
}

/**
 * 组装一档成绩句式（列表摘要与规则配置预览共用）：
 * 40.0%＜巡检任务完成率≤60.0%，扣4.0分（无下限/上限时省略该侧；上下限相等写作「指标名称＝值」）。
 */
function buildBandSentenceParts(band) {
  const unit = band.unit || ''
  const left = band.minInclusive ? '≤' : '＜'
  const right = band.maxInclusive ? '≤' : '＜'
  const minEmpty = band.min === null || band.min === undefined || band.min === ''
  const maxEmpty = band.max === null || band.max === undefined || band.max === ''
  const sameBound = !minEmpty && !maxEmpty && Number(band.min) === Number(band.max)
  let prefix = ''
  if (minEmpty && maxEmpty) {
    prefix = `${band.name}不限`
  } else if (sameBound && band.minInclusive && band.maxInclusive) {
    prefix = `${band.name}＝${formatRuleNumber(band.min, unit)}${unit}`
  } else if (minEmpty) {
    prefix = `${band.name}${right}${formatRuleNumber(band.max, unit)}${unit}`
  } else if (maxEmpty) {
    prefix = `${formatRuleNumber(band.min, unit)}${unit}${left}${band.name}`
  } else {
    prefix = `${formatRuleNumber(band.min, unit)}${unit}${left}${band.name}${right}${formatRuleNumber(band.max, unit)}${unit}`
  }
  return [
    { text: prefix },
    { text: '，扣' },
    { text: formatRuleDeduct(band.deduct), deduct: true },
    { text: '分' },
  ]
}

/**
 * 考核成绩（分档摘要）逐档展示，扣分数字单独成段以便标红。
 */
function formatScoreRuleLines(row) {
  const bands = sortBands(row.bands || [])
  const unit = scoreRuleUnit(row)
  const name = String(row.name || '').trim() || '指标值'
  const lines = bands.map((band) => buildBandSentenceParts({
    min: band.min,
    max: band.max,
    minInclusive: band.min_inclusive,
    maxInclusive: band.max_inclusive,
    deduct: band.deduct,
    name,
    unit,
  }))
  if (row.not_involved) lines.push([{ text: `不涉及：${row.not_involved}` }])
  return lines.length ? lines : [[{ text: '--' }]]
}

/** 规则配置弹窗「考核成绩」分档行在扣分输入框前显示「，扣」。 */

function openBands(row) {
  bandTarget.value = row
  const storedBands = sortBands(row.bands || []).map((item) => ({
    min: item.min,
    max: item.max,
    min_cmp: item.min_inclusive ? 'gte' : 'gt',
    max_cmp: item.max_inclusive ? 'lte' : 'lt',
    deduct: item.deduct,
  }))
  bandForm.value = {
    cap: row.cap,
    not_involved: row.not_involved || '',
    // 尚未配置分档时给一档空白行，避免弹窗里无法新增分档
    bands: storedBands.length
      ? storedBands
      : [{ min: null, max: null, min_cmp: 'gte', max_cmp: 'lte', deduct: 0 }],
  }
  bandVisible.value = true
}

function addBandAfter(index) {
  const current = bandForm.value.bands[index]
  const min = current && current.max !== null && current.max !== undefined ? current.max : null
  bandForm.value.bands.splice(index + 1, 0, {
    min,
    max: null,
    min_cmp: min === null ? 'gte' : 'gt',
    max_cmp: 'lte',
    deduct: 0,
  })
}

function removeBand(index) {
  bandForm.value.bands.splice(index, 1)
}

function syncNextMin(index) {
  const current = bandForm.value.bands[index]
  const next = bandForm.value.bands[index + 1]
  if (!next || current.max === null || current.max === undefined || current.max === '') return
  next.min = current.max
  next.min_cmp = 'gt'
}

function bandRowError(index) {
  const row = bandForm.value.bands[index]
  if (!row) return ''
  const maxEmpty = row.max === null || row.max === undefined || row.max === ''
  const minEmpty = row.min === null || row.min === undefined || row.min === ''
  if (!maxEmpty && !minEmpty && Number(row.max) < Number(row.min)) return '上限须大于下限'
  if (!maxEmpty && !minEmpty && Number(row.max) === Number(row.min) && !(row.min_cmp === 'gte' && row.max_cmp === 'lte')) {
    return '上限须大于下限'
  }
  const prev = bandForm.value.bands[index - 1]
  if (prev && !maxEmpty && prev.max !== null && prev.max !== undefined && prev.max !== '' && Number(row.max) <= Number(prev.max)) {
    // 单点档（上下限相等且两端闭合，如「＝100%」）允许与前一项上限相同
    const singlePoint = !minEmpty && Number(row.min) === Number(row.max)
      && row.min_cmp === 'gte' && row.max_cmp === 'lte'
    if (!singlePoint) return '需大于前一项的值'
  }
  return ''
}

function saveBands() {
  const errorIndex = bandForm.value.bands.findIndex((_, index) => bandRowError(index))
  if (errorIndex >= 0) {
    ElMessage.warning(bandRowError(errorIndex))
    return
  }
  const result = saveIndicatorBands(bandTarget.value.id, {
    not_involved: bandForm.value.not_involved,
    bands: bandForm.value.bands.map((item) => ({
      ...item,
      min_inclusive: item.min_cmp === 'gte',
      max_inclusive: item.max_cmp === 'lte',
    })),
    cap: bandForm.value.cap,
  })
  if (!result.ok) {
    ElMessage.warning(result.msg)
    return
  }
  const row = indicators.value.find((item) => item.id === bandTarget.value.id)
  if (row) {
    row.not_involved = result.indicator.not_involved
    row.bands = result.indicator.bands
    row.cap = result.indicator.cap
  }
  bandVisible.value = false
  ElMessage.success('分数分档已保存。已结束月份不改名次，出勤和摄像头次日纳入月平均；塔吊按月累计，每日施工作业计填报率，任务、隐患、预警在次月 1 日统计')
}
</script>

<template>
  <div class="qm-page page-card">
    <div class="page-header">
      <div class="page-breadcrumb">考核评分 / {{ pageTitle }}</div>
      <div class="page-heading">
        <h1 class="page-title">{{ pageTitle }}</h1>
      </div>
    </div>

    <el-empty v-if="!isHqSelected && section !== 'indicators'" description="考核配置仅指挥部可用" />

    <template v-else>
      <template v-if="section === 'projects'">
        <div class="filter-bar">
          <el-input v-model="projectKeyword" clearable placeholder="项目名称" style="width: 240px" aria-label="项目名称" />
          <el-select v-model="projectStatus" clearable placeholder="项目状态" style="width: 160px" aria-label="项目状态">
            <el-option v-for="item in projectStatusOptions" :key="item.value" :label="item.label" :value="item.label" />
          </el-select>
          <el-switch v-model="excludeHistorical" :disabled="!canSave" aria-label="历史项目不参与评分" />
          <span class="role-label">历史项目不参与评分</span>
        </div>
        <el-table class="matrix-table" :data="filteredProjects" stripe border empty-text="暂无项目">
          <el-table-column label="项目名称" min-width="180" prop="project_name" fixed="left" show-overflow-tooltip />
          <el-table-column label="项目状态" width="100" align="center" fixed="left">
            <template #default="{ row }">{{ row.project_status || '--' }}</template>
          </el-table-column>
          <el-table-column label="全部指标" width="110" align="center" fixed="left">
            <template #default="{ row }">
              <el-switch :model-value="rowAllOn(row)" :disabled="!canSave || historicalLocked(row)" @change="(value) => setRowIndicators(row, value)" />
            </template>
          </el-table-column>
          <el-table-column v-for="indicator in indicators" :key="indicator.id" width="120" align="center">
            <template #header>
              <span class="matrix-head">{{ indicator.name }}</span>
            </template>
            <template #default="{ row }">
              <el-switch v-model="row.switches[indicator.id]" :disabled="!canSave || historicalLocked(row)" />
            </template>
          </el-table-column>
        </el-table>
        <div class="save-bar">
          <el-button type="primary" :disabled="!canSave" @click="saveProjects">保存</el-button>
        </div>
      </template>

      <template v-else-if="section === 'indicator-config'">
        <el-table :data="indicatorConfigs" stripe border empty-text="暂无指标">
          <el-table-column label="指标名称" min-width="180" show-overflow-tooltip>
            <template #default="{ row }">{{ row.name || '--' }}</template>
          </el-table-column>
          <el-table-column label="指标规则" min-width="240" show-overflow-tooltip>
            <template #default="{ row }">{{ row.builtin ? (formatIndicatorFormula(row.formula) || '--') : (row.rule_text || '--') }}</template>
          </el-table-column>
          <el-table-column label="考核规则说明" min-width="240" show-overflow-tooltip>
            <template #default="{ row }">{{ row.rule_desc || '--' }}</template>
          </el-table-column>
          <el-table-column label="单位" width="100" align="center">
            <template #default="{ row }">{{ displayUnitText(row.value_unit) }}</template>
          </el-table-column>
          <el-table-column label="启用" width="100" align="center" fixed="right">
            <template #default="{ row }">
              <el-switch
                :model-value="row.enabled"
                :disabled="!canSave"
                aria-label="启用指标"
                @change="(value) => toggleIndicatorEnabled(row, value)"
              />
            </template>
          </el-table-column>
        </el-table>
      </template>

      <template v-else-if="section === 'indicators'">
        <el-empty
          v-if="!projectIncluded"
          :image-size="150"
          description="该项目不参与信息化考核评分"
        />
        <el-table v-else :data="indicators" stripe border empty-text="暂无已启用指标">
          <el-table-column label="指标" min-width="160" prop="name" />
          <el-table-column label="考核规则" min-width="280">
            <template #default="{ row }">
              <span class="rule-text">{{ row.rule_desc || '--' }}</span>
            </template>
          </el-table-column>
          <el-table-column label="分数计算规则" min-width="360">
            <template #default="{ row }">
              <span class="rule-text score-rule">
                <span v-for="(line, lineIndex) in formatScoreRuleLines(row)" :key="lineIndex" class="score-rule-line">
                  <span
                    v-for="(part, partIndex) in line"
                    :key="partIndex"
                    :class="{ 'score-rule-deduct': part.deduct }"
                  >{{ part.text }}</span>
                </span>
              </span>
            </template>
          </el-table-column>
          <el-table-column label="扣分上限" width="120" align="center">
            <template #default="{ row }">{{ formatBound(row.cap) }} 分</template>
          </el-table-column>
          <el-table-column v-if="isHqSelected" label="操作" width="110" align="center" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" @click="openBands(row)">配置分数</el-button>
            </template>
          </el-table-column>
        </el-table>
      </template>

      <template v-else>
        <div class="grade-board">
          <div class="grade-head">
            <span class="grade-col-name">等级</span>
            <span class="grade-col-color">颜色</span>
            <span>分数区间</span>
          </div>
          <div v-for="(row, index) in grades" :key="row.id" class="grade-line">
            <div class="grade-name">
              <el-input
                v-model="row.name"
                maxlength="8"
                :disabled="!canSave"
                :class="{ 'grade-input-error': !String(row.name || '').trim() }"
              />
              <span v-if="!String(row.name || '').trim()" class="band-error">请输入</span>
            </div>
            <div class="grade-color">
              <el-color-picker v-model="row.color" :disabled="!canSave" :predefine="GRADE_PALETTE" aria-label="等级颜色" />
            </div>
            <div class="band-line">
              <el-input-number
                v-model="row.min"
                :min="0"
                :max="100"
                :precision="1"
                :controls="false"
                :disabled="!canSave || index === 0"
              />
              <el-select v-model="row.min_cmp" class="band-op" :disabled="!canSave || index === 0">
                <el-option label="≤" value="gte" />
                <el-option label="<" value="gt" />
              </el-select>
              <span class="band-name">分数</span>
              <el-select v-model="row.max_cmp" class="band-op" :disabled="!canSave">
                <el-option label="≤" value="lte" />
                <el-option label="<" value="lt" />
              </el-select>
              <el-input-number
                v-model="row.max"
                :min="0"
                :max="100"
                :precision="1"
                controls-position="right"
                :disabled="!canSave || index === grades.length - 1"
                @change="onGradeMaxChange(index)"
              />
              <div class="band-actions">
                <el-button circle type="primary" :icon="Plus" :disabled="!canSave" aria-label="新增等级" @click="addGradeAfter(index)" />
                <el-button
                  v-if="index > 0"
                  circle
                  type="danger"
                  plain
                  :icon="Delete"
                  :disabled="!canSave"
                  aria-label="删除等级"
                  @click="removeGrade(index)"
                />
              </div>
            </div>
          </div>
          <div class="grade-footer">
            <el-button type="primary" :disabled="!canSave" @click="saveGrades">保存</el-button>
            <el-button :disabled="!canSave" @click="resetGrades">取消</el-button>
          </div>
        </div>
      </template>
    </template>

    <el-dialog v-model="bandVisible" title="规则配置" width="980px">
      <div class="rule-form-row">
        <span class="rule-form-label">二级指标名称</span>
        <span class="rule-form-value">{{ bandTarget?.name || '--' }}</span>
      </div>
      <div class="rule-form-row">
        <span class="rule-form-label">考核标准</span>
        <span class="rule-form-value">{{ bandTarget?.rule_desc || '--' }}</span>
      </div>
      <div class="rule-form-row">
        <span class="rule-form-label">单位</span>
        <span class="rule-form-value">{{ bandUnitText }}</span>
      </div>
      <div class="rule-form-row">
        <span class="rule-form-label required">扣分上限</span>
        <div class="rule-form-value">
          <el-input-number
            v-model="bandForm.cap"
            :min="0"
            :max="100"
            :step="1"
            :precision="1"
            :disabled="!canSave"
            aria-label="扣分上限"
          />
          <span class="unit">分</span>
        </div>
      </div>
      <div class="rule-form-row">
        <span class="rule-form-label">不涉及条件</span>
        <div class="rule-form-value">
          <el-input v-model="bandForm.not_involved" :disabled="!canSave" maxlength="80" placeholder="没有考核对象时填写" />
        </div>
      </div>
      <div class="rule-form-row">
        <span class="rule-form-label required">考核成绩</span>
        <div class="rule-form-value">
          <div v-for="(row, index) in bandForm.bands" :key="index" class="band-line">
            <el-input-number
              v-model="row.min"
              :precision="1"
              :value-on-clear="null"
              :controls="false"
              :disabled="!canSave"
            />
            <span v-if="!isBoundEmpty(row.min)" class="band-unit">{{ bandUnitText }}</span>
            <el-select v-if="!isBoundEmpty(row.min)" v-model="row.min_cmp" class="band-op" :disabled="!canSave">
              <el-option label="≤" value="gte" />
              <el-option label="<" value="gt" />
            </el-select>
            <span class="band-name">{{ bandTarget?.name || '指标值' }}</span>
            <el-select v-if="!isBoundEmpty(row.max)" v-model="row.max_cmp" class="band-op" :disabled="!canSave">
              <el-option label="≤" value="lte" />
              <el-option label="<" value="lt" />
            </el-select>
            <div class="band-max">
              <el-input-number
                v-model="row.max"
                :precision="1"
                :value-on-clear="null"
                :disabled="!canSave"
                controls-position="right"
                @change="syncNextMin(index)"
              />
              <span v-if="bandRowError(index)" class="band-error">{{ bandRowError(index) }}</span>
            </div>
            <span v-if="!isBoundEmpty(row.max)" class="band-unit">{{ bandUnitText }}</span>
            <span class="band-punct">，扣</span>
            <el-input-number
              v-model="row.deduct"
              class="band-deduct"
              :min="0"
              :max="bandForm.cap ?? 100"
              :precision="1"
              :disabled="!canSave"
              controls-position="right"
            />
            <span class="band-unit">分</span>
            <div class="band-actions">
              <el-button circle type="primary" :icon="Plus" :disabled="!canSave" aria-label="新增分档" @click="addBandAfter(index)" />
              <el-button
                v-if="bandForm.bands.length > 1"
                circle
                type="danger"
                plain
                :icon="Delete"
                :disabled="!canSave"
                aria-label="删除分档"
                @click="removeBand(index)"
              />
            </div>
          </div>
        </div>
      </div>
      <template #footer>
        <el-button @click="bandVisible = false">取消</el-button>
        <el-button type="primary" :disabled="!canSave" @click="saveBands">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.page-heading { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
.page-title { margin: 4px 0; font-size: 20px; }
.filter-bar { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; margin-bottom: 16px; }
.role-label { font-size: 13px; color: var(--ap-text-muted, #909399); }
.save-bar { margin-top: 16px; }
.unit { margin-left: 6px; }
.rule-text { display: inline-block; line-height: 1.6; color: var(--ap-text, #303133); }
.score-rule { white-space: normal; }
.score-rule-line { display: block; }
.score-rule-deduct { color: #f56c6c; }
.formula-editor { display: flex; gap: 16px; align-items: flex-start; }
.formula-editor-main { flex: 1; min-width: 0; }
.formula-editor.is-locked .formula-editor-main { width: 100%; }
.formula-editor-side { width: 320px; flex: none; max-height: 520px; overflow: auto; padding: 8px 12px; border: 1px solid var(--el-border-color, #dcdfe6); border-radius: 4px; }
.field-side-title { margin-bottom: 4px; font-size: 13px; font-weight: 600; }
.field-side-note { margin: 0 0 12px; font-size: 12px; line-height: 1.5; color: var(--ap-text-muted, #909399); }
.field-group { margin-bottom: 12px; }
.field-group-title { margin-bottom: 6px; font-size: 13px; font-weight: 600; }
.field-chip { display: inline-flex; align-items: center; max-width: 100%; margin: 0 0 8px; padding: 4px 8px; border: 1px solid var(--el-border-color, #dcdfe6); border-radius: 4px; background: #fff; color: var(--ap-text, #303133); cursor: pointer; text-align: left; line-height: 1.4; white-space: normal; }
.field-chip:hover { border-color: #91003d; color: #91003d; }
.field-grain { flex: none; margin-right: 6px; padding: 0 4px; border-radius: 2px; background: #f4e8ee; color: #91003d; font-size: 12px; line-height: 18px; }
.rule-box { border: 1px solid var(--el-border-color, #dcdfe6); border-radius: 4px; overflow: hidden; }
.rule-box.is-error { border-color: #f56c6c; }
.rule-ops { display: flex; flex-wrap: wrap; gap: 8px; padding: 8px; border-bottom: 1px solid var(--el-border-color, #dcdfe6); background: #fafafa; }
.rule-box :deep(.el-textarea__inner) { border: 0; box-shadow: none; border-radius: 0; }
.rule-editor { min-height: 168px; padding: 8px 10px; outline: none; line-height: 32px; white-space: pre-wrap; word-break: break-all; }
.rule-editor:empty::before { content: '点击或拖入右侧字段，也可输入数字和运算符'; color: #c0c4cc; }
.rule-tag { display: inline-flex; align-items: center; max-width: 100%; margin: 0 4px; padding: 0 8px; height: 24px; border: 1px solid #e4c3d0; border-radius: 4px; background: #f4e8ee; color: #91003d; font-size: 12px; line-height: 22px; vertical-align: middle; user-select: none; white-space: nowrap; }
.row-actions { display: inline-flex; align-items: center; justify-content: center; gap: 8px; }
.formula-preview { margin: 6px 0 0; color: var(--ap-text-muted, #909399); font-size: 12px; line-height: 1.4; }
.matrix-head { display: inline-block; white-space: normal; line-height: 1.4; font-size: 12px; }
.rule-form-row { display: flex; align-items: flex-start; gap: 12px; margin-bottom: 16px; }
.rule-form-label { width: 96px; flex: none; line-height: 32px; text-align: right; color: var(--ap-text, #303133); }
.rule-form-label.required::before { content: '*'; color: #f56c6c; margin-right: 4px; }
.rule-form-value { flex: 1; min-width: 0; line-height: 32px; }
.band-line { display: flex; flex-wrap: wrap; align-items: flex-start; gap: 8px; margin-bottom: 14px; }
.band-punct { line-height: 32px; white-space: nowrap; }
.band-deduct :deep(.el-input__inner) { color: #f56c6c; }
.band-op { width: 72px; }
.band-name { line-height: 32px; white-space: nowrap; }
.band-unit { line-height: 32px; color: #606266; }
.unit-input { display: flex; flex-direction: column; align-items: flex-start; }
.unit-input :deep(.el-input) { width: 220px; }
.band-max { display: flex; flex-direction: column; }
.band-error { color: #f56c6c; font-size: 12px; line-height: 1.4; margin-top: 2px; }
.band-actions { display: flex; align-items: center; gap: 8px; height: 32px; }
.band-line :deep(.el-input-number) { width: 110px; }
.grade-board { max-width: 920px; }
.grade-head, .grade-line { display: flex; align-items: flex-start; gap: 24px; }
.grade-head { margin-bottom: 12px; font-weight: 600; }
.grade-col-name, .grade-name { width: 180px; flex: none; }
.grade-col-color, .grade-color { width: 56px; flex: none; }
.grade-name { display: flex; flex-direction: column; }
.grade-input-error :deep(.el-input__wrapper) { box-shadow: 0 0 0 1px #f56c6c inset; }
.grade-footer { display: flex; justify-content: center; gap: 12px; margin-top: 28px; }
</style>
