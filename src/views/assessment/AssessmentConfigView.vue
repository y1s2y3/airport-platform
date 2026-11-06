<script setup>
/**
 * 考核配置。等级配置、考核项目仅指挥部可用（指标配置已并入「指标配置」页）。
 */
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Plus, Delete } from '@element-plus/icons-vue'
import { useCurrentProject } from '../../composables/useCurrentProject'
import { projectStatusOptions } from '../../mock/projectBasicInfo'
import {
  ASSESSMENT_TYPES,
  getAssessmentGrades,
  getAssessmentIndicators,
  getExcludeHistorical,
  listAssessmentProjects,
  saveAssessmentGrades,
  saveAssessmentProjects,
  saveProjectAssessmentType,
} from '../../mock/assessmentScore'

const { isHqSelected, selectedProjectId } = useCurrentProject()
const route = useRoute()
const canSave = computed(() => true)
/** 项目级：该项目在考核项目矩阵中是否有任一已启用指标为开 */
const projectIncluded = computed(() => isHqSelected.value || isProjectIncluded(selectedProjectId.value))
const section = computed(() => (route.path.includes('/grades') ? 'grades' : 'projects'))
const pageTitle = computed(() => ({ projects: '考核项目', grades: '等级配置' }[section.value]))

const projects = ref(listAssessmentProjects())
const assessmentTypes = ASSESSMENT_TYPES
/** 调整项目考核类型：即时保存，历史期得分不重算 */
function changeProjectType(row, value) {
  const result = saveProjectAssessmentType(row.project_id, value)
  if (!result.ok) {
    ElMessage.error(result.msg)
    const origin = listAssessmentProjects().find((item) => item.project_id === row.project_id)
    row.assessment_type = origin?.assessment_type
    return
  }
  row.assessment_type_name = assessmentTypes.find((item) => item.id === value)?.name || ''
  ElMessage.success(result.msg)
}
const indicators = ref(getAssessmentIndicators())
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
  projects.value = listAssessmentProjects()
})

function saveProjects() {
  const result = saveAssessmentProjects(projects.value, { excludeHistorical: excludeHistorical.value })
  if (!result.ok) {
    ElMessage.warning(result.msg)
    return
  }
  projects.value = listAssessmentProjects()
  excludeHistorical.value = getExcludeHistorical()
  ElMessage.success('考核项目已保存')
}

function saveGrades() {
  const result = saveAssessmentGrades(grades.value)
  if (!result.ok) {
    ElMessage.warning(result.msg)
    return
  }
  grades.value = gradeRowsFromState(getAssessmentGrades())
  ElMessage.success('等级已保存')
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

</script>

<template>
  <div class="qm-page page-card">
    <div class="page-header">
      <div class="page-breadcrumb">考核评分 / {{ pageTitle }}</div>
      <div class="page-heading">
        <h1 class="page-title">{{ pageTitle }}</h1>
      </div>
    </div>

    <el-empty v-if="!isHqSelected" description="考核配置仅指挥部可用" />

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
          <el-table-column label="考核类型" width="130" align="center" fixed="left">
            <template #default="{ row }">
              <el-select
                v-model="row.assessment_type"
                size="small"
                :disabled="!canSave || historicalLocked(row)"
                aria-label="考核类型"
                @change="(value) => changeProjectType(row, value)"
              >
                <el-option v-for="type in assessmentTypes" :key="type.id" :label="type.name" :value="type.id" />
              </el-select>
            </template>
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
.type-rule-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 12px; margin-bottom: 16px; }
.type-rule-card { border: 1px solid var(--ap-border, #ebeef5); border-radius: 8px; padding: 12px 14px; background: #fafbfc; }
.type-rule-head { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 6px; }
.type-rule-name { font-size: 14px; font-weight: 700; color: var(--ap-primary, #91003d); }
.type-rule-total { font-size: 12px; color: #67c23a; }
.type-rule-total.is-bad { color: #f56c6c; font-weight: 600; }
.type-rule-desc { margin: 0 0 8px; font-size: 12px; color: var(--ap-text-muted, #909399); line-height: 1.6; }
.type-rule-tags { display: flex; flex-wrap: wrap; gap: 6px; }
.type-rule-tip { margin: 0 0 12px; font-size: 12px; color: var(--ap-text-muted, #909399); line-height: 1.7; }
.type-rule-footer { margin-top: 8px; }
.type-rule-link { font-size: 12px; color: var(--ap-primary, #91003d); text-decoration: none; }
.type-rule-link:hover { text-decoration: underline; }
</style>
