<script setup>
/**
 * 考核配置。指标配置、等级配置、考核项目仅指挥部。考核指标项目级只读。
 */
import { computed, nextTick, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Delete } from '@element-plus/icons-vue'
import { useCurrentProject } from '../../composables/useCurrentProject'
import { projectStatusOptions } from '../../mock/projectBasicInfo'
import {
  getAssessmentGrades,
  getAssessmentIndicators,
  formatIndicatorFormula,
  getExcludeHistorical,
  INDICATOR_FIELDS,
  listAssessmentProjects,
  listIndicatorConfigs,
  saveAssessmentGrades,
  saveAssessmentProjects,
  saveIndicatorBands,
  saveIndicatorConfigs,
  validateIndicatorRule,
} from '../../mock/assessmentScore'

const { isHqSelected } = useCurrentProject()
const route = useRoute()
const canSave = computed(() => true)
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

const RULE_OPS = ['+', '−', '×', '÷', '(', ')', '，']
const RULE_FUNCS = ['求和', '求平均']
const ruleEditorRef = ref(null)
const ruleCheck = ref({ ok: null, msg: '' })
let lastRuleRange = null

function rememberRuleRange() {
  const editor = ruleEditorRef.value
  const selection = window.getSelection()
  if (!editor || !selection?.rangeCount) return
  if (!editor.contains(selection.anchorNode)) return
  lastRuleRange = selection.getRangeAt(0).cloneRange()
}
const fieldGroups = computed(() => {
  const groups = []
  INDICATOR_FIELDS.forEach((field) => {
    let group = groups.find((item) => item.module === field.module)
    if (!group) {
      group = { module: field.module, fields: [] }
      groups.push(group)
    }
    group.fields.push(field)
  })
  return groups
})

function placeRuleCaret() {
  const editor = ruleEditorRef.value
  if (!editor) return null
  editor.focus()
  const selection = window.getSelection()
  if (selection && selection.rangeCount && editor.contains(selection.anchorNode)) {
    return selection.getRangeAt(0)
  }
  if (lastRuleRange && editor.contains(lastRuleRange.startContainer)) {
    selection?.removeAllRanges()
    selection?.addRange(lastRuleRange)
    return lastRuleRange
  }
  const range = document.createRange()
  range.selectNodeContents(editor)
  range.collapse(false)
  selection?.removeAllRanges()
  selection?.addRange(range)
  return range
}

function insertRuleCall(name) {
  const range = placeRuleCaret()
  if (!range) return
  range.deleteContents()
  const open = document.createTextNode(`${name}(`)
  const gap = document.createTextNode('\u200B')
  const close = document.createTextNode(')')
  const fragment = document.createDocumentFragment()
  fragment.append(open, gap, close)
  range.insertNode(fragment)
  range.setStartAfter(gap)
  range.collapse(true)
  const selection = window.getSelection()
  selection?.removeAllRanges()
  selection?.addRange(range)
  lastRuleRange = range.cloneRange()
  ruleCheck.value = { ok: null, msg: '' }
}

function insertRuleText(text) {
  const range = placeRuleCaret()
  if (!range) return
  range.deleteContents()
  const node = document.createTextNode(text)
  range.insertNode(node)
  range.setStartAfter(node)
  range.collapse(true)
  const selection = window.getSelection()
  selection?.removeAllRanges()
  selection?.addRange(range)
  lastRuleRange = range.cloneRange()
  ruleCheck.value = { ok: null, msg: '' }
}

function insertFieldTag(field) {
  const range = placeRuleCaret()
  if (!range) return
  range.deleteContents()
  const tag = document.createElement('span')
  tag.className = 'rule-tag'
  tag.setAttribute('contenteditable', 'false')
  tag.dataset.field = field.id
  tag.textContent = field.name
  const gap = document.createTextNode('\u200B')
  range.insertNode(gap)
  range.insertNode(tag)
  range.setStartAfter(gap)
  range.collapse(true)
  const selection = window.getSelection()
  selection?.removeAllRanges()
  selection?.addRange(range)
  lastRuleRange = range.cloneRange()
  ruleCheck.value = { ok: null, msg: '' }
}

function serializeRule() {
  const editor = ruleEditorRef.value
  if (!editor) return ''
  let text = ''
  const walk = (node) => {
    node.childNodes.forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE) {
        text += String(child.textContent || '').replace(/\u200B/g, '')
        return
      }
      if (child.nodeType !== Node.ELEMENT_NODE) return
      if (child.dataset?.field) {
        text += child.textContent || ''
        return
      }
      if (child.tagName === 'BR') return
      walk(child)
    })
  }
  walk(editor)
  return text
}

function clearRuleEditor() {
  if (ruleEditorRef.value) ruleEditorRef.value.innerHTML = ''
}

function fillRuleEditor(text) {
  const editor = ruleEditorRef.value
  if (!editor) return
  editor.innerHTML = ''
  const source = String(text || '')
  const names = [...INDICATOR_FIELDS].sort((left, right) => right.name.length - left.name.length)
  let index = 0
  let buffer = ''
  const flush = () => {
    if (!buffer) return
    editor.appendChild(document.createTextNode(buffer))
    buffer = ''
  }
  while (index < source.length) {
    const field = names.find((item) => source.startsWith(item.name, index))
    if (field) {
      flush()
      const tag = document.createElement('span')
      tag.className = 'rule-tag'
      tag.setAttribute('contenteditable', 'false')
      tag.dataset.field = field.id
      tag.textContent = field.name
      editor.appendChild(tag)
      index += field.name.length
      continue
    }
    buffer += source[index]
    index += 1
  }
  flush()
}

function onFieldDragStart(event, field) {
  event.dataTransfer?.setData('text/plain', `field:${field.id}`)
  if (event.dataTransfer) event.dataTransfer.effectAllowed = 'copy'
}

function onRuleDrop(event) {
  const raw = event.dataTransfer?.getData('text/plain') || ''
  const field = INDICATOR_FIELDS.find((item) => raw === `field:${item.id}`)
  if (!field) return
  insertFieldTag(field)
}

function onRulePaste(event) {
  event.preventDefault()
  const text = event.clipboardData?.getData('text/plain') || ''
  if (text) insertRuleText(text)
}

function checkRule() {
  const result = validateIndicatorRule(serializeRule())
  ruleCheck.value = result
  if (result.ok) ElMessage.success(result.msg)
  else ElMessage.warning(result.msg)
}

const configVisible = ref(false)
const configMode = ref('create')
const configForm = ref(null)

function openCreateConfig() {
  configMode.value = 'create'
  ruleCheck.value = { ok: null, msg: '' }
  lastRuleRange = null
  configForm.value = {
    id: `ind-${Date.now()}`,
    name: '',
    rule_desc: '',
    builtin: false,
    enabled: true,
  }
  configVisible.value = true
  nextTick(() => clearRuleEditor())
}

function openEditConfig(row) {
  if (row.builtin) return
  configMode.value = 'edit'
  ruleCheck.value = { ok: null, msg: '' }
  lastRuleRange = null
  configForm.value = {
    id: row.id,
    name: row.name,
    rule_desc: row.rule_desc || '',
    builtin: false,
    enabled: !!row.enabled,
  }
  configVisible.value = true
  nextTick(() => fillRuleEditor(row.rule_text || row.calc_rule || ''))
}

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
  applyConfigSave(next, value ? '指标已启用。已结束月份不改名次，出勤和摄像头次日纳入月平均；塔吊、升降机按月累计，每日施工作业计填报天数，任务、隐患、预警在次月 1 日统计' : '指标已停用。已结束月份不改名次，出勤和摄像头次日纳入月平均；塔吊、升降机按月累计，每日施工作业计填报天数，任务、隐患、预警在次月 1 日统计')
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

function saveConfigForm() {
  if (!configForm.value || configForm.value.builtin) return
  if (!String(configForm.value.rule_desc || '').trim()) {
    ElMessage.warning('请填写考核规则说明')
    return
  }
  const ruleText = serializeRule()
  const check = validateIndicatorRule(ruleText)
  ruleCheck.value = check
  if (!check.ok) {
    ElMessage.warning(check.msg)
    return
  }
  const draft = {
    id: configForm.value.id,
    name: configForm.value.name,
    rule_desc: String(configForm.value.rule_desc || '').trim(),
    builtin: false,
    enabled: configMode.value === 'create' ? true : !!configForm.value.enabled,
    rule_text: ruleText.trim(),
    formula: [],
  }
  const next = snapshotConfigs()
  if (configMode.value === 'create') {
    next.push(draft)
  } else {
    const index = next.findIndex((item) => item.id === draft.id)
    if (index < 0) {
      ElMessage.warning('未找到该指标')
      return
    }
    next[index] = { ...next[index], name: draft.name, rule_text: draft.rule_text, rule_desc: draft.rule_desc }
  }
  const ok = applyConfigSave(next, configMode.value === 'create' ? '指标已新增。已结束月份不改名次，出勤和摄像头次日纳入月平均；塔吊、升降机按月累计，每日施工作业计填报天数，任务、隐患、预警在次月 1 日统计' : '指标已保存。已结束月份不改名次，出勤和摄像头次日纳入月平均；塔吊、升降机按月累计，每日施工作业计填报天数，任务、隐患、预警在次月 1 日统计')
  if (ok) configVisible.value = false
}

async function removeIndicatorConfig(row) {
  if (row.builtin) return
  try {
    await ElMessageBox.confirm(`确认删除指标「${row.name || '未命名'}」？`, '提示', { type: 'warning' })
  } catch {
    return
  }
  const next = indicatorConfigs.value
    .filter((item) => item.id !== row.id)
    .map((item) => ({ ...item, formula: (item.formula || []).map((token) => ({ ...token })), rule_text: item.rule_text || '' }))
  applyConfigSave(next, '指标已删除。已结束月份不改名次，出勤和摄像头次日纳入月平均；塔吊、升降机按月累计，每日施工作业计填报天数，任务、隐患、预警在次月 1 日统计')
}

function saveProjects() {
  const result = saveAssessmentProjects(projects.value, { excludeHistorical: excludeHistorical.value })
  if (!result.ok) {
    ElMessage.warning(result.msg)
    return
  }
  projects.value = listAssessmentProjects()
  excludeHistorical.value = getExcludeHistorical()
  ElMessage.success('考核项目已保存。历史项目不参与评分打开时，历史项目不计分。已结束月份不改名次，出勤和摄像头次日纳入月平均；塔吊、升降机按月累计，每日施工作业计填报天数，任务、隐患、预警在次月 1 日统计')
}

function saveGrades() {
  const result = saveAssessmentGrades(grades.value)
  if (!result.ok) {
    ElMessage.warning(result.msg)
    return
  }
  grades.value = gradeRowsFromState(getAssessmentGrades())
  ElMessage.success('等级已保存。已结束月份不改等级，出勤和摄像头次日纳入月平均；塔吊、升降机按月累计，每日施工作业计填报天数，任务、隐患、预警在次月 1 日统计')
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

function formatScoreRule(row) {
  const bands = sortBands(row.bands || [])
  if (!bands.length && !row.not_involved) return '--'
  const unit = scoreRuleUnit(row)
  const lines = bands.map((band) => {
    const left = band.min_inclusive ? '≤' : '<'
    const right = band.max_inclusive ? '≤' : '<'
    return `${formatBound(band.min)} ${unit} ${left} ${row.name} ${right} ${formatBound(band.max)} ${unit}，扣 ${formatBound(band.deduct)} 分`
  })
  if (row.not_involved) lines.push(`不涉及：${row.not_involved}`)
  return lines.join('\n') || '--'
}

function openBands(row) {
  bandTarget.value = row
  bandForm.value = {
    cap: row.cap,
    not_involved: row.not_involved || '',
    bands: sortBands(row.bands || []).map((item) => ({
      min: item.min,
      max: item.max,
      min_cmp: item.min_inclusive ? 'gte' : 'gt',
      max_cmp: item.max_inclusive ? 'lte' : 'lt',
      deduct: item.deduct,
    })),
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
    return '需大于前一项的值'
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
  ElMessage.success('分数分档已保存。已结束月份不改名次，出勤和摄像头次日纳入月平均；塔吊、升降机按月累计，每日施工作业计填报天数，任务、隐患、预警在次月 1 日统计')
}
</script>

<template>
  <div class="qm-page page-card">
    <div class="page-header">
      <div class="page-breadcrumb">考核评分 / {{ pageTitle }}</div>
      <div class="page-heading">
        <h1 class="page-title">{{ pageTitle }}</h1>
        <el-button
          v-if="isHqSelected && section === 'indicator-config'"
          type="primary"
          :icon="Plus"
          :disabled="!canSave"
          @click="openCreateConfig"
        >新增</el-button>
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
          <el-table-column label="指标规则" min-width="280" show-overflow-tooltip>
            <template #default="{ row }">{{ row.builtin ? (formatIndicatorFormula(row.formula) || '--') : (row.rule_text || '--') }}</template>
          </el-table-column>
          <el-table-column label="考核规则说明" min-width="280" show-overflow-tooltip>
            <template #default="{ row }">{{ row.rule_desc || '--' }}</template>
          </el-table-column>
          <el-table-column label="操作" width="220" align="center" fixed="right">
            <template #default="{ row }">
              <div class="row-actions">
                <el-switch
                  :model-value="row.enabled"
                  :disabled="!canSave"
                  aria-label="启用指标"
                  @change="(value) => toggleIndicatorEnabled(row, value)"
                />
                <el-button v-if="!row.builtin" link type="primary" :disabled="!canSave" @click="openEditConfig(row)">编辑</el-button>
                <el-button v-if="!row.builtin" link type="danger" :disabled="!canSave" @click="removeIndicatorConfig(row)">删除</el-button>
              </div>
            </template>
          </el-table-column>
        </el-table>
      </template>

      <template v-else-if="section === 'indicators'">
        <el-table :data="indicators" stripe border empty-text="暂无已启用指标">
          <el-table-column label="指标" min-width="160" prop="name" />
          <el-table-column label="考核规则" min-width="280">
            <template #default="{ row }">
              <span class="rule-text">{{ row.rule_desc || '--' }}</span>
            </template>
          </el-table-column>
          <el-table-column label="分数计算规则" min-width="360">
            <template #default="{ row }">
              <span class="rule-text score-rule">{{ formatScoreRule(row) }}</span>
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
            <span class="band-unit">{{ bandUnitText }}</span>
            <el-select v-model="row.min_cmp" class="band-op" :disabled="!canSave">
              <el-option label="≤" value="gte" />
              <el-option label="<" value="gt" />
            </el-select>
            <span class="band-name">{{ bandTarget?.name || '指标值' }}</span>
            <el-select v-model="row.max_cmp" class="band-op" :disabled="!canSave">
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
            <span class="band-unit">{{ bandUnitText }}</span>
            <el-input-number
              v-model="row.deduct"
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

    <el-dialog v-model="configVisible" :title="configMode === 'create' ? '新增指标' : '编辑指标'" width="1080px">
      <template v-if="configForm">
        <div class="formula-editor" :class="{ 'is-locked': configForm.builtin }">
          <div class="formula-editor-main">
            <div class="rule-form-row">
              <span class="rule-form-label required">指标名称</span>
              <div class="rule-form-value">
                <el-input
                  v-model="configForm.name"
                  maxlength="20"
                  :disabled="!canSave"
                  :class="{ 'grade-input-error': !String(configForm.name || '').trim() }"
                  aria-label="指标名称"
                />
                <span v-if="!String(configForm.name || '').trim()" class="band-error">请输入</span>
              </div>
            </div>
            <div class="rule-form-row">
              <span class="rule-form-label required">指标规则</span>
              <div class="rule-form-value">
                <div class="rule-box" :class="{ 'is-error': ruleCheck.ok === false }">
                  <div class="rule-ops">
                    <el-button
                      v-for="op in RULE_OPS"
                      :key="op"
                      size="small"
                      :disabled="!canSave"
                      @click="insertRuleText(op)"
                    >{{ op }}</el-button>
                    <el-button
                      v-for="fn in RULE_FUNCS"
                      :key="fn"
                      size="small"
                      :disabled="!canSave"
                      @click="insertRuleCall(fn)"
                    >{{ fn }}</el-button>
                    <el-button size="small" type="primary" plain :disabled="!canSave" @click="checkRule">校验</el-button>
                  </div>
                  <div
                    ref="ruleEditorRef"
                    class="rule-editor"
                    contenteditable="true"
                    aria-label="指标规则"
                    @dragover.prevent
                    @drop.prevent="onRuleDrop"
                    @paste="onRulePaste"
                    @mouseup="rememberRuleRange"
                    @keyup="rememberRuleRange"
                  />
                </div>
                <p v-if="ruleCheck.ok === false" class="band-error">{{ ruleCheck.msg }}</p>
                <p v-else-if="ruleCheck.ok" class="rule-ok">{{ ruleCheck.msg }}</p>
              </div>
            </div>
            <div class="rule-form-row">
              <span class="rule-form-label required">考核规则说明</span>
              <div class="rule-form-value">
                <el-input
                  v-model="configForm.rule_desc"
                  type="textarea"
                  :rows="3"
                  maxlength="200"
                  show-word-limit
                  :disabled="!canSave"
                  placeholder="用文字说明这项指标怎么考核"
                  :class="{ 'grade-input-error': !String(configForm.rule_desc || '').trim() }"
                  aria-label="考核规则说明"
                />
                <span v-if="!String(configForm.rule_desc || '').trim()" class="band-error">请输入</span>
              </div>
            </div>
          </div>
          <aside v-if="!configForm.builtin" class="formula-editor-side">
            <div class="field-side-title">统计字段</div>
            <p class="field-side-note">每个字段都带时间。月度按考核月，当日按已结束自然日，月累计为全月合计。</p>
            <div v-for="group in fieldGroups" :key="group.module" class="field-group">
              <div class="field-group-title">{{ group.module }}</div>
              <button
                v-for="field in group.fields"
                :key="field.id"
                type="button"
                class="field-chip"
                draggable="true"
                :disabled="!canSave"
                @dragstart="onFieldDragStart($event, field)"
                @click="insertFieldTag(field)"
              ><span class="field-grain">{{ field.grain }}</span>{{ field.name.startsWith(field.grain) ? field.name.slice(field.grain.length) : field.name }}</button>
            </div>
          </aside>
        </div>
      </template>
      <template #footer>
        <el-button @click="configVisible = false">取消</el-button>
        <el-button type="primary" :disabled="!canSave" @click="saveConfigForm">保存</el-button>
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
.score-rule { white-space: pre-line; }
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
.band-op { width: 72px; }
.band-name { line-height: 32px; white-space: nowrap; }
.band-unit { line-height: 32px; color: #606266; }
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
