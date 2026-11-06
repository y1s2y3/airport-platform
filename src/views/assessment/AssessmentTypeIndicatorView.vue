<script setup>
/**
 * 指标配置（按前期 / 施工 / 收尾三类分页配置，页签为按钮样式）。
 * 每类页面只列该类型参与考核的指标，可调整扣分上限与扣分分档；
 * 保存时校验该类合计为 100 分。指挥部可编辑，项目级只读。
 */
import { computed, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus, Delete, RefreshLeft } from '@element-plus/icons-vue'
import { useCurrentProject } from '../../composables/useCurrentProject'
import {
  ASSESSMENT_TYPES,
  listTypeIndicators,
  resetTypeIndicatorBands,
  saveTypeIndicatorBands,
  saveTypeIndicatorConfig,
} from '../../mock/assessmentScore'

const { isHqSelected } = useCurrentProject()

const assessmentTypes = ASSESSMENT_TYPES
const typeId = ref(ASSESSMENT_TYPES[0]?.id || 'pre')
const typeMeta = computed(() => assessmentTypes.find((item) => item.id === typeId.value) || assessmentTypes[0])
const editable = computed(() => isHqSelected.value)

/**
 * 指标单位展示：内置「百分比」显示为 %，其余自定义单位按录入文本原样展示。
 * 与 AssessmentConfigView 的 displayUnitText / bandUnitText 保持同一口径。
 */
function formatUnitText(value) {
  const unit = String(value || '').trim()
  if (!unit) return ''
  if (unit === '百分比') return '%'
  return unit
}

/** 当前分档弹窗对应指标的单位（自带值优先，兼容 band_unit 覆盖值）。 */
const bandUnit = computed(() => formatUnitText(bandRow.value?.band_unit || bandRow.value?.value_unit))

const groups = ref([])
const bandVisible = ref(false)
const bandRow = ref(null)
const bandDraft = ref([])

function load() {
  groups.value = listTypeIndicators(typeId.value)
    .map((group) => ({
      ...group,
      indicators: group.indicators
        .filter((item) => item.involved)
        .map((item) => ({ ...item, bands: (item.bands || []).map((band) => ({ ...band })) })),
    }))
    .filter((group) => group.indicators.length)
}

watch(typeId, load, { immediate: true })

const allRows = computed(() => groups.value.flatMap((group) => group.indicators))
const capTotal = computed(() => Math.round(allRows.value.reduce((sum, item) => sum + Number(item.cap || 0), 0) * 10) / 10)
/** 本类型合计是否满足「扣分上限合计 = 100 分」 */
const totalOk = computed(() => capTotal.value === 100)

/** 已启用的指标行（该类型下上限 > 0 即视为启用） */
const enabledRows = computed(() => allRows.value.filter((item) => Number(item.cap) > 0))
const enabledCount = computed(() => enabledRows.value.length)

function isRowEnabled(row) {
  return Number(row.cap) > 0
}

/** 单个指标启用/关闭：关闭时记住其分值，重新启用时回填（避免用户重填） */
function toggleRowEnabled(row, enabled) {
  if (enabled) {
    const restore = Number(row.last_cap || 0)
    row.cap = restore > 0 ? restore : 5
    row.last_cap = 0
    return
  }
  row.last_cap = Number(row.cap) || Number(row.last_cap) || 0
  row.cap = 0
}

function groupEnabledCount(group) {
  return (group.indicators || []).filter(isRowEnabled).length
}

function groupAllEnabled(group) {
  const total = (group.indicators || []).length
  return total > 0 && groupEnabledCount(group) === total
}

function groupPartialEnabled(group) {
  const count = groupEnabledCount(group)
  return count > 0 && count < (group.indicators || []).length
}

/** 整类启用/关闭：批量设置该分类下所有指标 */
function toggleGroupEnabled(group, enabled) {
  ;(group.indicators || []).forEach((row) => toggleRowEnabled(row, enabled))
}

/** 已关闭的指标整行置灰 */
function rowClassName({ row }) {
  return isRowEnabled(row) ? '' : 'is-row-disabled'
}

/** 单个指标分类的扣分累计（随输入实时联动，不用 mock 返回的静态 capTotal） */
function groupCapTotal(group) {
  return Math.round((group.indicators || []).reduce((sum, item) => sum + Number(item.cap || 0), 0) * 10) / 10
}

function save() {
  if (!totalOk.value) {
    ElMessage.error(`「${typeMeta.value.name}」类型的已启用指标扣分上限合计须为 100 分，当前为 ${capTotal.value} 分`)
    return
  }
  const entries = allRows.value.map((item) => ({
    id: item.id,
    name: item.name,
    involved: Number(item.cap) > 0,
    cap: item.cap,
  }))
  const result = saveTypeIndicatorConfig(typeId.value, entries)
  if (!result.ok) {
    ElMessage.error(result.msg)
    return
  }
  ElMessage.success(`「${typeMeta.value.name}」类型指标已保存`)
  load()
}

function resetAll() {
  load()
  ElMessage.info('已还原为上次保存的配置')
}

function openBands(row) {
  bandRow.value = row
  bandDraft.value = (row.bands || []).map((band) => ({ min: band.min, max: band.max, deduct: band.deduct }))
  bandVisible.value = true
}

function addBand() {
  bandDraft.value.push({ min: null, max: null, deduct: 0 })
}

function removeBand(index) {
  bandDraft.value.splice(index, 1)
}

function saveBands() {
  const result = saveTypeIndicatorBands(typeId.value, bandRow.value.id, bandDraft.value)
  if (!result.ok) {
    ElMessage.error(result.msg)
    return
  }
  bandVisible.value = false
  ElMessage.success(`「${bandRow.value.name}」分档已保存`)
  load()
}

function resetBands() {
  resetTypeIndicatorBands(typeId.value, bandRow.value.id)
  bandVisible.value = false
  ElMessage.success('已恢复为通用分档')
  load()
}
</script>

<template>
  <div class="qm-page page-card">
    <div class="page-header">
      <div class="page-breadcrumb">考核评分 / 指标配置</div>
      <h1 class="page-title">指标配置</h1>
    </div>

    <div class="type-tab-bar">
      <el-radio-group v-model="typeId" size="large" class="type-tab-group">
        <el-radio-button v-for="type in assessmentTypes" :key="type.id" :value="type.id">
          {{ type.name }}
        </el-radio-button>
      </el-radio-group>
      <div class="type-tab-actions">
        <template v-if="editable">
          <el-button :icon="RefreshLeft" @click="resetAll">还原</el-button>
          <el-button type="primary" @click="save">保存</el-button>
        </template>
        <span v-else class="readonly-tip">项目级仅可查看，配置由指挥部维护</span>
      </div>
    </div>

    <p class="type-desc">{{ typeMeta.desc }}</p>

    <div class="cap-summary" :class="{ 'is-warn': !totalOk }">
      <span class="cap-summary-label">已启用指标合计</span>
      <b class="cap-summary-value">{{ capTotal }} 分</b>
      <span class="cap-summary-count">已启用 {{ enabledCount }} 项 / 共 {{ allRows.length }} 项</span>
      <span class="cap-summary-hint">{{ totalOk ? '（已满足 100 分，可保存）' : `（须为 100 分，当前 ${capTotal} 分）` }}</span>
    </div>

    <div v-for="group in groups" :key="group.id" class="type-group">
      <div class="group-head">
        <span class="group-name">{{ group.name }}</span>
        <span class="group-desc">{{ group.desc }}</span>
        <span class="group-total">
          <span class="group-total-label">{{ group.indicators.length }} 项 · 扣分累计</span>
          <b class="group-total-value">{{ groupCapTotal(group) }}</b>
          <span>分</span>
        </span>
        <span class="group-switch">
          <span class="group-switch-state">
            已启用 {{ groupEnabledCount(group) }}/{{ group.indicators.length }}{{ groupPartialEnabled(group) ? '（部分）' : '' }}
          </span>
          <el-switch
            :model-value="groupAllEnabled(group)"
            :disabled="!editable"
            size="small"
            :aria-label="`整类启用 ${group.name}`"
            @change="(value) => toggleGroupEnabled(group, value)"
          />
        </span>
      </div>
      <el-table :data="group.indicators" size="small" border empty-text="暂无指标" :row-class-name="rowClassName">
        <el-table-column label="指标" min-width="210" show-overflow-tooltip>
          <template #default="{ row }">
            {{ row.name }}<span v-if="formatUnitText(row.value_unit)" class="unit-text">（{{ formatUnitText(row.value_unit) }}）</span>
          </template>
        </el-table-column>
        <el-table-column label="启用" width="90" align="center">
          <template #default="{ row }">
            <el-switch
              :model-value="isRowEnabled(row)"
              :disabled="!editable"
              size="small"
              :aria-label="`启用 ${row.name}`"
              @change="(value) => toggleRowEnabled(row, value)"
            />
          </template>
        </el-table-column>
        <el-table-column label="扣分上限" width="160" align="center">
          <template #default="{ row }">
            <el-input-number
              v-if="editable"
              v-model="row.cap"
              :min="0"
              :max="100"
              :step="0.5"
              :precision="1"
              :disabled="!isRowEnabled(row)"
              size="small"
              controls-position="right"
              style="width: 130px"
            />
            <span v-else>{{ isRowEnabled(row) ? `${row.cap} 分` : '已关闭' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="扣分分档" width="150" align="center">
          <template #default="{ row }">
            <el-button v-if="editable" link type="primary" :disabled="!isRowEnabled(row)" @click="openBands(row)">
              {{ (row.bands || []).length }} 档{{ row.band_custom ? '（自定义）' : '' }}
            </el-button>
            <span v-else>{{ isRowEnabled(row) ? `${(row.bands || []).length} 档` : '--' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="考核规则" min-width="320" show-overflow-tooltip>
          <template #default="{ row }">
            <span class="rule-text">{{ row.calc_rule || '--' }}</span>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <el-dialog
      v-model="bandVisible"
      :title="`扣分分档 · ${bandRow?.name || ''}${bandUnit ? `（${bandUnit}）` : ''}`"
      width="720px"
      destroy-on-close
    >
      <p class="band-tip">
        分档用于展示扣分梯度，按指标统计值{{ bandUnit ? `（单位：${bandUnit}）` : '' }}落入的区间取扣分；可调整区间与扣分值，或恢复通用分档。
      </p>
      <el-table :data="bandDraft" size="small" border>
        <el-table-column label="序号" type="index" width="60" align="center" />
        <el-table-column :label="`最小值（不含${bandUnit ? `，${bandUnit}` : ''}）`" width="170" align="center">
          <template #default="{ row }">
            <el-input-number v-model="row.min" :step="1" size="small" controls-position="right" style="width: 130px" />
          </template>
        </el-table-column>
        <el-table-column :label="`最大值（含${bandUnit ? `，${bandUnit}` : ''}）`" width="170" align="center">
          <template #default="{ row }">
            <el-input-number v-model="row.max" :step="1" size="small" controls-position="right" style="width: 130px" />
          </template>
        </el-table-column>
        <el-table-column label="扣分" width="150" align="center">
          <template #default="{ row }">
            <el-input-number v-model="row.deduct" :min="0" :step="0.5" :precision="1" size="small" controls-position="right" style="width: 120px" />
          </template>
        </el-table-column>
        <el-table-column label="操作" width="90" align="center">
          <template #default="{ $index }">
            <el-button link type="danger" :icon="Delete" @click="removeBand($index)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <div class="band-actions">
        <el-button :icon="Plus" @click="addBand">新增分档</el-button>
      </div>
      <template #footer>
        <el-button @click="resetBands">恢复通用分档</el-button>
        <el-button @click="bandVisible = false">取消</el-button>
        <el-button type="primary" @click="saveBands">保存分档</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.type-tab-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  margin-bottom: 10px;
}
.type-tab-group :deep(.el-radio-button__inner) {
  padding: 10px 26px;
  font-size: 14px;
  font-weight: 600;
}
.type-tab-actions { margin-left: auto; display: flex; align-items: center; gap: 8px; }
.readonly-tip { font-size: 12px; color: var(--ap-text-muted, #909399); }
.type-desc { margin: 0 0 16px; font-size: 13px; color: var(--ap-text-muted, #909399); line-height: 1.6; }
.type-group { margin-bottom: 18px; }
.group-head { display: flex; align-items: baseline; gap: 10px; margin-bottom: 8px; }
.group-name { font-size: 14px; font-weight: 700; color: var(--ap-text, #303133); padding-left: 8px; border-left: 3px solid var(--ap-primary, #91003d); }
.group-desc { font-size: 12px; color: var(--ap-text-muted, #909399); }
.group-total { margin-left: auto; display: inline-flex; align-items: baseline; gap: 4px; font-size: 12px; color: var(--ap-text-muted, #909399); }
.group-total-value { font-size: 14px; color: var(--ap-primary, #91003d); }
.cap-summary {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin: 0 0 16px;
  padding: 8px 12px;
  border-radius: 6px;
  background: #f5f7fa;
  border: 1px solid #e6e9f0;
  font-size: 13px;
  color: #303133;
}
.cap-summary.is-warn { background: #fdf6ec; border-color: #f5dab1; }
.cap-summary-label { color: var(--ap-text-muted, #909399); }
.cap-summary-value { font-size: 15px; color: var(--ap-primary, #91003d); }
.cap-summary.is-warn .cap-summary-value { color: #e6a23c; }
.cap-summary-hint { font-size: 12px; color: var(--ap-text-muted, #909399); }
.cap-summary-count { font-size: 12px; color: #5c6b7f; }
.group-switch { display: inline-flex; align-items: center; gap: 6px; margin-left: 16px; }
.group-switch-state { font-size: 12px; color: var(--ap-text-muted, #909399); }
:deep(.el-table .is-row-disabled) { color: #c0c4cc; background: #fafafa; }
.rule-text { font-size: 12px; color: #606266; line-height: 1.5; }
.unit-text { font-size: 12px; color: var(--ap-text-muted, #909399); }
.band-tip { margin: 0 0 10px; font-size: 12px; color: var(--ap-text-muted, #909399); line-height: 1.6; }
.band-actions { margin-top: 10px; }
</style>
