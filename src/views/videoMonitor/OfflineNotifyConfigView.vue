<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { Plus, Delete } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useCurrentProject } from '../../composables/useCurrentProject'
import { HQ_PROJECT_OPTION } from '../../config/projectOptions'
import { getMenuLabelByPath } from '../../config/menu.js'
import {
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
  saveProjectVideoOfflineNotifyRules,
  resetHqVideoOfflineNotifyRules,
  resetProjectVideoOfflineNotifyRules,
} from '../../mock/videoOfflineNotifyConfig'

const props = defineProps({
  title: { type: String, default: '监控离线通知' },
  description: { type: String, default: '' },
})

const route = useRoute()
const { selectedProjectId, isHqSelected, headerProjectLabel } = useCurrentProject()

/** 指挥部层级 / 项目层级：同一页面按顶栏层级切换，两侧配置各自独立保存 */
const isHqMode = computed(() => isHqSelected.value)

/** 页头标题取当前层级菜单名（两条菜单同 path，名称按层级区分） */
const pageTitle = computed(
  () => getMenuLabelByPath(route.path, isHqMode.value ? 'hq' : 'project') || props.title,
)

const projectId = computed(() =>
  isHqSelected.value || !selectedProjectId.value || selectedProjectId.value === HQ_PROJECT_OPTION.id
    ? ''
    : selectedProjectId.value,
)

const levelLabel = computed(() => (isHqMode.value ? '指挥部层级' : '项目层级'))

/** 通知人员候选池：只含本层级用户（公司级岗位=指挥部层级，项目级岗位=项目层级） */
const personOptions = computed(() => listNotifyPersonOptions(isHqMode.value ? 'hq' : 'project'))

const saving = ref(false)
const rows = ref([])

function cloneRows(list) {
  return list.map((item) => ({
    ...item,
    offline_value: Number(item.offline_value) || 1,
    offline_unit: item.offline_unit || OFFLINE_DURATION_UNIT.minute,
    person_ids: [...(item.person_ids || [])],
    enabled: item.enabled !== false,
  }))
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

function handleAdd() {
  rows.value.push({
    id: `tmp-${Date.now()}`,
    ...createEmptyOfflineNotifyRule(),
  })
}

async function handleRemove(index) {
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

/**
 * 校验分级档位：时长合法且不重复、每档至少 1 名本层级通知人员。
 * 允许删空（列表为空＝本层级不推送离线通知）。
 */
function validateRows() {
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
    if (!row.person_ids?.length) {
      ElMessage.warning(
        `第 ${i + 1} 行：请选择至少 1 名${levelLabel.value}通知人员；本层级不需要该档位推送时可直接删除该档`,
      )
      return false
    }
  }
  return true
}

function buildPayload() {
  return rows.value.map((row) => ({
    id: String(row.id).startsWith('tmp-') ? undefined : row.id,
    offline_value: Number(row.offline_value),
    offline_unit: row.offline_unit,
    person_ids: [...(row.person_ids || [])],
    enabled: row.enabled !== false,
  }))
}

async function handleSave() {
  if (!isHqMode.value && !projectId.value) {
    ElMessage.warning('请先选择具体项目')
    return
  }
  if (!validateRows()) return
  saving.value = true
  try {
    if (isHqMode.value) {
      saveHqVideoOfflineNotifyRules(buildPayload())
      loadRows()
      ElMessage.success('指挥部层级离线通知配置已保存')
      return
    }
    saveProjectVideoOfflineNotifyRules(projectId.value, buildPayload())
    loadRows()
    ElMessage.success('本项目离线通知配置已保存')
  } finally {
    saving.value = false
  }
}

async function handleReset() {
  if (!isHqMode.value && !projectId.value) {
    ElMessage.warning('请先选择具体项目')
    return
  }
  const confirmText = isHqMode.value
    ? '确定恢复为 6 小时 / 2 天的默认分级配置？通知人员将清空，需重新选择后保存。'
    : '确定恢复为 10 分钟的默认分级配置？通知人员将清空，需重新选择后保存。'
  try {
    await ElMessageBox.confirm(confirmText, '重置确认', {
      type: 'warning',
      confirmButtonText: '重置',
      cancelButtonText: '取消',
    })
    if (isHqMode.value) {
      resetHqVideoOfflineNotifyRules()
    } else {
      resetProjectVideoOfflineNotifyRules(projectId.value)
    }
    loadRows()
    ElMessage.success('已恢复默认配置')
  } catch {
    /* cancelled */
  }
}

const pageDesc = computed(() =>
  isHqMode.value
    ? '指挥部层级维护视频设备离线分级通知规则，并为每档指定指挥部层级通知人员；与项目层级配置各自独立保存。'
    : '项目层级维护本项目的视频设备离线分级通知规则，并为每档指定项目层级通知人员；与指挥部层级配置各自独立保存。',
)

const scopeText = computed(() => {
  if (isHqMode.value) return '当前范围：指挥部'
  return `当前项目：${projectId.value ? headerProjectLabel.value : '请选择具体项目'}`
})

const tipText = computed(() => {
  const base = `离线满设定时长后向本档${levelLabel.value}通知人员推送；通知人员必填`
  return isHqMode.value
    ? `${base}；默认档位：6 小时、2 天`
    : `${base}；默认档位：10 分钟；本项目配置与指挥部配置分别保存`
})

const canOperate = computed(() => isHqMode.value || !!projectId.value)
</script>

<template>
  <div class="offline-notify-page page-card">
    <div class="page-head">
      <div>
        <h2 class="page-title">{{ pageTitle }}</h2>
        <p class="page-desc">{{ pageDesc }}</p>
        <p class="page-scope">{{ scopeText }}</p>
      </div>
      <div class="head-actions">
        <el-button :disabled="!canOperate" @click="handleReset">恢复默认</el-button>
        <el-button
          type="primary"
          class="ap-btn-primary"
          :loading="saving"
          :disabled="!canOperate"
          @click="handleSave"
        >
          保存配置
        </el-button>
      </div>
    </div>

    <el-empty
      v-if="!isHqMode && !projectId"
      description="请切换到具体项目配置本项目离线通知"
    />

    <template v-else>
      <div class="table-head">
        <span class="tip-text">{{ tipText }}</span>
      </div>

      <el-table :data="rows" border stripe class="ap-table" empty-text="暂无分级规则">
        <el-table-column label="序号" width="64" align="center">
          <template #default="{ $index }">{{ $index + 1 }}</template>
        </el-table-column>

        <el-table-column label="离线时长" width="220" align="center">
          <template #default="{ row }">
            <div class="duration-cell">
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
          </template>
        </el-table-column>

        <el-table-column :label="`通知人员（${levelLabel}用户）`" min-width="320">
          <template #default="{ row }">
            <el-select
              v-model="row.person_ids"
              multiple
              filterable
              collapse-tags
              collapse-tags-tooltip
              :placeholder="`请选择${levelLabel}通知人员`"
              style="width: 100%"
              aria-label="通知人员"
            >
              <el-option
                v-for="opt in personOptions"
                :key="opt.value"
                :label="opt.label"
                :value="opt.value"
              />
            </el-select>
          </template>
        </el-table-column>

        <el-table-column label="启用" width="88" align="center">
          <template #default="{ row }">
            <el-switch v-model="row.enabled" />
          </template>
        </el-table-column>

        <el-table-column label="操作" width="88" fixed="right" align="center">
          <template #default="{ $index }">
            <el-button link type="danger" :icon="Delete" @click="handleRemove($index)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="table-foot">
        <el-button type="primary" class="ap-btn-primary" :icon="Plus" @click="handleAdd">
          新增规则
        </el-button>
      </div>

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
  gap: 12px;
  margin-bottom: 10px;
  flex-wrap: wrap;
}

.table-foot {
  margin-top: 12px;
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
