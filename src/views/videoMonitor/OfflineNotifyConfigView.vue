<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { Plus, Delete } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useCurrentProject } from '../../composables/useCurrentProject'
import { HQ_PROJECT_OPTION } from '../../config/projectOptions'
import {
  STAFF_CONFIG_TYPE,
  STAFF_CONFIG_TYPE_OPTIONS,
  STAFF_CONFIG_TYPE_LABEL,
  OFFLINE_DURATION_UNIT,
  OFFLINE_DURATION_UNIT_OPTIONS,
  OFFLINE_DURATION_UNIT_LABEL,
  offlineDurationToMinutes,
  formatOfflineDuration,
  listNotifyPersonOptions,
  createEmptyOfflineNotifyRule,
  listHqVideoOfflineNotifyRules,
  listProjectVideoOfflineNotifyRules,
  saveHqVideoOfflineNotifyRules,
  saveProjectVideoOfflineNotifyPersons,
  resetHqVideoOfflineNotifyRules,
  resetVideoOfflineNotifyRules,
  getPersonNames,
} from '../../mock/videoOfflineNotifyConfig'

defineProps({
  title: { type: String, default: '离线通知配置' },
  description: { type: String, default: '' },
})

const { selectedProjectId, isHqSelected, headerProjectLabel } = useCurrentProject()

const isHqMode = computed(() => isHqSelected.value)

const projectId = computed(() =>
  isHqSelected.value || !selectedProjectId.value || selectedProjectId.value === HQ_PROJECT_OPTION.id
    ? ''
    : selectedProjectId.value,
)

const saving = ref(false)
const rows = ref([])

const hqPersonOptions = computed(() => listNotifyPersonOptions('hq'))
const projectPersonOptions = computed(() => listNotifyPersonOptions('project'))

function cloneRows(list) {
  return list.map((item) => ({
    ...item,
    offline_value: Number(item.offline_value) || 1,
    offline_unit: item.offline_unit || OFFLINE_DURATION_UNIT.minute,
    staff_config_type: item.staff_config_type || STAFF_CONFIG_TYPE.project,
    person_ids: [...(item.person_ids || [])],
    enabled: item.enabled !== false,
  }))
}

function personOptionsFor(row) {
  if (row.staff_config_type === STAFF_CONFIG_TYPE.hq) return hqPersonOptions.value
  return projectPersonOptions.value
}

function isProjectStaffRow(row) {
  return row.staff_config_type === STAFF_CONFIG_TYPE.project
}

/** 项目级：仅「项目人员」行可编辑通知人员 */
function canEditPersonsAtProject(row) {
  return !isHqMode.value && isProjectStaffRow(row)
}

function loadRows() {
  if (isHqMode.value) {
    rows.value = cloneRows(listHqVideoOfflineNotifyRules())
    return
  }
  if (!projectId.value) {
    rows.value = []
    return
  }
  rows.value = cloneRows(listProjectVideoOfflineNotifyRules(projectId.value))
}

onMounted(loadRows)
watch([isHqMode, projectId], loadRows)

function handleStaffTypeChange(row) {
  if (row.staff_config_type === STAFF_CONFIG_TYPE.project) {
    row.person_ids = []
  }
}

function handleAdd() {
  if (!isHqMode.value) {
    ElMessage.warning('项目级不可新增规则，请在指挥部配置')
    return
  }
  rows.value.push({
    id: `tmp-${Date.now()}`,
    ...createEmptyOfflineNotifyRule(),
  })
}

async function handleRemove(index) {
  if (!isHqMode.value) return
  const row = rows.value[index]
  try {
    await ElMessageBox.confirm(
      `确定删除「离线 ${formatOfflineDuration(row.offline_value, row.offline_unit)}」这条分级规则？`,
      '删除确认',
      { type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消' },
    )
    rows.value.splice(index, 1)
  } catch {
    /* cancelled */
  }
}

function validateHqRows() {
  if (!rows.value.length) {
    ElMessage.warning('请至少保留一条分级规则')
    return false
  }
  const keySet = new Set()
  for (let i = 0; i < rows.value.length; i += 1) {
    const row = rows.value[i]
    const value = Number(row.offline_value)
    if (!Number.isFinite(value) || value < 1 || !Number.isInteger(value)) {
      ElMessage.warning(`第 ${i + 1} 行：离线时长须为不小于 1 的整数`)
      return false
    }
    if (!OFFLINE_DURATION_UNIT_LABEL[row.offline_unit]) {
      ElMessage.warning(`第 ${i + 1} 行：请选择离线时长单位`)
      return false
    }
    const key = `${offlineDurationToMinutes(value, row.offline_unit)}`
    if (keySet.has(key)) {
      ElMessage.warning(
        `离线时长「${formatOfflineDuration(value, row.offline_unit)}」与其它规则重复，请调整`,
      )
      return false
    }
    keySet.add(key)
    if (!STAFF_CONFIG_TYPE_LABEL[row.staff_config_type]) {
      ElMessage.warning(`第 ${i + 1} 行：请选择人员配置类型`)
      return false
    }
    if (row.staff_config_type === STAFF_CONFIG_TYPE.hq && !row.person_ids?.length) {
      ElMessage.warning(`第 ${i + 1} 行：人员配置类型为指挥部人员时，请配置通知人员`)
      return false
    }
  }
  return true
}

function validateProjectRows() {
  if (!projectId.value) {
    ElMessage.warning('请先选择具体项目')
    return false
  }
  for (let i = 0; i < rows.value.length; i += 1) {
    const row = rows.value[i]
    if (row.staff_config_type === STAFF_CONFIG_TYPE.project && !row.person_ids?.length) {
      ElMessage.warning(`第 ${i + 1} 行：请为本项目配置通知人员`)
      return false
    }
  }
  return true
}

async function handleSave() {
  saving.value = true
  try {
    if (isHqMode.value) {
      if (!validateHqRows()) return
      const payload = rows.value
        .map((row) => ({
          id: String(row.id).startsWith('tmp-') ? undefined : row.id,
          offline_value: Number(row.offline_value),
          offline_unit: row.offline_unit,
          staff_config_type: row.staff_config_type,
          person_ids:
            row.staff_config_type === STAFF_CONFIG_TYPE.hq ? [...(row.person_ids || [])] : [],
          enabled: row.enabled !== false,
        }))
        .sort(
          (a, b) =>
            offlineDurationToMinutes(a.offline_value, a.offline_unit) -
            offlineDurationToMinutes(b.offline_value, b.offline_unit),
        )
        .map((row, index) => ({
          ...row,
          id: row.id || `rule-${index + 1}`,
        }))
      saveHqVideoOfflineNotifyRules(payload)
      loadRows()
      ElMessage.success('指挥部离线通知配置已保存')
      return
    }

    if (!validateProjectRows()) return
    saveProjectVideoOfflineNotifyPersons(projectId.value, rows.value)
    loadRows()
    ElMessage.success('本项目通知人员已保存')
  } finally {
    saving.value = false
  }
}

async function handleReset() {
  if (isHqMode.value) {
    try {
      await ElMessageBox.confirm(
        '确定恢复为 10 分钟 / 6 小时 / 2 天的默认分级配置？',
        '重置确认',
        { type: 'warning', confirmButtonText: '重置', cancelButtonText: '取消' },
      )
      resetHqVideoOfflineNotifyRules()
      loadRows()
      ElMessage.success('已恢复默认配置')
    } catch {
      /* cancelled */
    }
    return
  }
  if (!projectId.value) {
    ElMessage.warning('请先选择具体项目')
    return
  }
  try {
    await ElMessageBox.confirm('确定清空本项目已配置的通知人员？', '重置确认', {
      type: 'warning',
      confirmButtonText: '重置',
      cancelButtonText: '取消',
    })
    resetVideoOfflineNotifyRules(projectId.value)
    loadRows()
    ElMessage.success('已清空本项目通知人员')
  } catch {
    /* cancelled */
  }
}

const pageDesc = computed(() => {
  if (isHqMode.value) {
    return '指挥部配置视频设备离线分级通知。人员配置类型为「项目人员」时，通知人由各项目分别配置；为「指挥部人员」时在此指定通知人。'
  }
  return '回显指挥部离线通知分级规则。人员配置类型为「项目人员」时可配置并保存本项目通知人员；「指挥部人员」规则仅只读展示。'
})

const scopeText = computed(() => {
  if (isHqMode.value) return '当前范围：指挥部'
  return `当前项目：${projectId.value ? headerProjectLabel.value : '请选择具体项目'}`
})

const tipText = computed(() => {
  if (isHqMode.value) {
    return '离线满设定时长后按规则推送通知；默认档位：10 分钟、6 小时、2 天'
  }
  return '不可增删规则；仅「项目人员」类型可编辑通知人员并保存'
})

const canOperate = computed(() => isHqMode.value || !!projectId.value)
</script>

<template>
  <div class="offline-notify-page page-card">
    <div class="page-head">
      <div>
        <h2 class="page-title">{{ title }}</h2>
        <p class="page-desc">{{ description || pageDesc }}</p>
        <p class="page-scope">{{ scopeText }}</p>
      </div>
      <div class="head-actions">
        <el-button :disabled="!canOperate" @click="handleReset">
          {{ isHqMode ? '恢复默认' : '清空本项目人员' }}
        </el-button>
        <el-button
          type="primary"
          class="ap-btn-primary"
          :loading="saving"
          :disabled="!canOperate"
          @click="handleSave"
        >
          {{ isHqMode ? '保存配置' : '保存本项目人员' }}
        </el-button>
      </div>
    </div>

    <el-empty
      v-if="!isHqMode && !projectId"
      description="请切换到具体项目查看指挥部规则并配置本项目通知人员"
    />

    <template v-else>
      <div class="table-head">
        <span class="tip-text">{{ tipText }}</span>
        <el-button
          v-if="isHqMode"
          type="primary"
          class="ap-btn-primary"
          :icon="Plus"
          @click="handleAdd"
        >
          新增规则
        </el-button>
      </div>

      <el-table :data="rows" border stripe class="ap-table" empty-text="暂无分级规则">
        <el-table-column label="序号" width="64" align="center">
          <template #default="{ $index }">{{ $index + 1 }}</template>
        </el-table-column>

        <el-table-column label="离线时长" width="220" align="center">
          <template #default="{ row }">
            <div v-if="isHqMode" class="duration-cell">
              <el-input-number
                v-model="row.offline_value"
                :min="1"
                :max="9999"
                controls-position="right"
                style="width: 110px"
              />
              <el-select v-model="row.offline_unit" style="width: 88px" aria-label="离线时长单位">
                <el-option
                  v-for="opt in OFFLINE_DURATION_UNIT_OPTIONS"
                  :key="opt.value"
                  :label="opt.label"
                  :value="opt.value"
                />
              </el-select>
            </div>
            <span v-else>{{ formatOfflineDuration(row.offline_value, row.offline_unit) }}</span>
          </template>
        </el-table-column>

        <el-table-column label="人员配置类型" width="160" align="center">
          <template #default="{ row }">
            <el-select
              v-if="isHqMode"
              v-model="row.staff_config_type"
              placeholder="请选择"
              style="width: 100%"
              aria-label="人员配置类型"
              @change="handleStaffTypeChange(row)"
            >
              <el-option
                v-for="opt in STAFF_CONFIG_TYPE_OPTIONS"
                :key="opt.value"
                :label="opt.label"
                :value="opt.value"
              />
            </el-select>
            <span v-else>{{ STAFF_CONFIG_TYPE_LABEL[row.staff_config_type] || '--' }}</span>
          </template>
        </el-table-column>

        <el-table-column label="通知人员" min-width="320">
          <template #default="{ row }">
            <template v-if="isHqMode">
              <el-select
                v-if="row.staff_config_type === STAFF_CONFIG_TYPE.hq"
                v-model="row.person_ids"
                multiple
                filterable
                collapse-tags
                collapse-tags-tooltip
                placeholder="请选择通知人员"
                style="width: 100%"
                aria-label="通知人员"
              >
                <el-option
                  v-for="opt in personOptionsFor(row)"
                  :key="opt.value"
                  :label="opt.label"
                  :value="opt.value"
                />
              </el-select>
              <el-alert
                v-else
                type="info"
                :closable="false"
                show-icon
                title="无需填写，由各项目分别配置"
              />
            </template>
            <template v-else>
              <el-select
                v-if="canEditPersonsAtProject(row)"
                v-model="row.person_ids"
                multiple
                filterable
                collapse-tags
                collapse-tags-tooltip
                placeholder="请选择本项目通知人员"
                style="width: 100%"
                aria-label="本项目通知人员"
              >
                <el-option
                  v-for="opt in projectPersonOptions"
                  :key="opt.value"
                  :label="opt.label"
                  :value="opt.value"
                />
              </el-select>
              <span v-else class="readonly-persons">
                {{ getPersonNames(row.person_ids).join('、') || '--' }}
              </span>
            </template>
          </template>
        </el-table-column>

        <el-table-column label="启用" width="88" align="center">
          <template #default="{ row }">
            <el-switch v-if="isHqMode" v-model="row.enabled" />
            <el-tag v-else size="small" :type="row.enabled !== false ? 'success' : 'info'" effect="plain">
              {{ row.enabled !== false ? '启用' : '停用' }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column v-if="isHqMode" label="操作" width="88" fixed="right" align="center">
          <template #default="{ $index }">
            <el-button link type="danger" :icon="Delete" @click="handleRemove($index)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="legend">
        <span>默认档位参考：</span>
        <el-tag size="small" effect="plain">10 分钟</el-tag>
        <el-tag size="small" effect="plain">6 小时</el-tag>
        <el-tag size="small" effect="plain">2 天</el-tag>
      </div>
    </template>
  </div>
</template>

<style scoped>
.offline-notify-page {
  padding: 16px 20px 20px;
  min-height: calc(100vh - 120px);
  display: flex;
  flex-direction: column;
}

.page-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.page-title {
  margin: 0 0 6px;
  font-size: 18px;
  font-weight: 600;
  color: var(--ap-text);
}

.page-desc {
  margin: 0;
  font-size: 13px;
  color: var(--ap-text-secondary);
  line-height: 1.5;
  max-width: 720px;
}

.page-scope {
  margin: 6px 0 0;
  font-size: 12px;
  color: var(--ap-text-muted);
}

.head-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.table-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
  flex-wrap: wrap;
}

.tip-text {
  font-size: 13px;
  color: var(--ap-text-muted);
}

.duration-cell {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  justify-content: center;
}

.readonly-persons {
  font-size: 13px;
  color: var(--ap-text-secondary);
  line-height: 1.5;
}

.legend {
  margin-top: 14px;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  font-size: 13px;
  color: var(--ap-text-secondary);
}
</style>
