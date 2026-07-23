<script setup>
import { ref, computed, onMounted } from 'vue'
import { Plus, Delete } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  listVideoOfflineNotifyRules,
  listNotifyPositionGroups,
  createEmptyOfflineNotifyRule,
  saveVideoOfflineNotifyRules,
  resetVideoOfflineNotifyRules,
} from '../../mock/videoOfflineNotifyConfig'

const props = defineProps({
  title: { type: String, default: '离线通知配置' },
  description: { type: String, default: '' },
})

const saving = ref(false)
const rows = ref([])
const positionGroups = computed(() => listNotifyPositionGroups())

function cloneRows(list) {
  return list.map((item) => ({
    ...item,
    position_ids: [...(item.position_ids || [])],
  }))
}

function loadRows() {
  rows.value = cloneRows(listVideoOfflineNotifyRules())
}

onMounted(loadRows)

function handleAdd() {
  rows.value.push({
    id: `tmp-${Date.now()}`,
    ...createEmptyOfflineNotifyRule(),
    offline_days: rows.value.length ? Math.max(...rows.value.map((r) => r.offline_days || 0)) + 1 : 1,
  })
}

async function handleRemove(index) {
  const row = rows.value[index]
  try {
    await ElMessageBox.confirm(
      `确定删除「离线 ${row.offline_days || '—'} 天」这条分级规则？`,
      '删除确认',
      { type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消' },
    )
    rows.value.splice(index, 1)
  } catch {
    /* cancelled */
  }
}

function validateRows() {
  if (!rows.value.length) {
    ElMessage.warning('请至少保留一条分级规则')
    return false
  }
  const daysSet = new Set()
  for (let i = 0; i < rows.value.length; i += 1) {
    const row = rows.value[i]
    const days = Number(row.offline_days)
    if (!Number.isFinite(days) || days < 1) {
      ElMessage.warning(`第 ${i + 1} 行：离线天数须为不小于 1 的整数`)
      return false
    }
    if (daysSet.has(days)) {
      ElMessage.warning(`离线天数「${days}」重复，请调整`)
      return false
    }
    daysSet.add(days)
    if (!row.position_ids?.length) {
      ElMessage.warning(`第 ${i + 1} 行：请选择通知岗位`)
      return false
    }
  }
  return true
}

async function handleSave() {
  if (!validateRows()) return
  saving.value = true
  try {
    const payload = rows.value
      .map((row) => ({
        id: String(row.id).startsWith('tmp-') ? undefined : row.id,
        offline_days: Number(row.offline_days),
        position_ids: [...row.position_ids],
        enabled: row.enabled !== false,
        remark: row.remark || '',
      }))
      .sort((a, b) => a.offline_days - b.offline_days)
      .map((row, index) => ({
        ...row,
        id: row.id || `rule-${index + 1}`,
      }))
    saveVideoOfflineNotifyRules(payload)
    loadRows()
    ElMessage.success('离线通知配置已保存')
  } finally {
    saving.value = false
  }
}

async function handleReset() {
  try {
    await ElMessageBox.confirm('确定恢复为一天 / 一周 / 一月的默认分级配置？', '重置确认', {
      type: 'warning',
      confirmButtonText: '重置',
      cancelButtonText: '取消',
    })
    resetVideoOfflineNotifyRules()
    loadRows()
    ElMessage.success('已恢复默认配置')
  } catch {
    /* cancelled */
  }
}
</script>

<template>
  <div class="offline-notify-page page-card">
    <div class="page-head">
      <div>
        <h2 class="page-title">{{ title }}</h2>
        <p class="page-desc">
          {{
            description ||
            '按视频设备离线时长分级通知不同岗位。默认提供一天、一周、一月三档，天数与岗位均可配置，并支持增删规则。'
          }}
        </p>
      </div>
      <div class="head-actions">
        <el-button @click="handleReset">恢复默认</el-button>
        <el-button type="primary" class="ap-btn-primary" :loading="saving" @click="handleSave">
          保存配置
        </el-button>
      </div>
    </div>

    <div class="table-head">
      <span class="tip-text">离线满设定天数后，向所选岗位推送离线通知（可多选岗位）</span>
      <el-button type="primary" class="ap-btn-primary" :icon="Plus" @click="handleAdd">
        新增规则
      </el-button>
    </div>

    <el-table :data="rows" border stripe class="ap-table" empty-text="暂无分级规则">
      <el-table-column label="序号" width="64" align="center">
        <template #default="{ $index }">{{ $index + 1 }}</template>
      </el-table-column>
      <el-table-column label="离线天数" width="160" align="center">
        <template #default="{ row }">
          <div class="days-cell">
            <el-input-number
              v-model="row.offline_days"
              :min="1"
              :max="3650"
              controls-position="right"
              style="width: 110px"
            />
            <span class="unit">天</span>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="通知岗位" min-width="280">
        <template #default="{ row }">
          <el-select
            v-model="row.position_ids"
            multiple
            filterable
            collapse-tags
            collapse-tags-tooltip
            placeholder="请选择岗位（指挥部 / 项目）"
            style="width: 100%"
          >
            <el-option-group
              v-for="group in positionGroups"
              :key="group.scope"
              :label="group.label"
            >
              <el-option
                v-for="opt in group.options"
                :key="opt.value"
                :label="`${opt.label}（${opt.scope}）`"
                :value="opt.value"
              />
            </el-option-group>
          </el-select>
        </template>
      </el-table-column>
      <el-table-column label="启用" width="88" align="center">
        <template #default="{ row }">
          <el-switch v-model="row.enabled" />
        </template>
      </el-table-column>
      <el-table-column label="备注" min-width="200">
        <template #default="{ row }">
          <el-input v-model="row.remark" placeholder="可选" maxlength="50" show-word-limit />
        </template>
      </el-table-column>
      <el-table-column label="操作" width="88" fixed="right" align="center">
        <template #default="{ $index }">
          <el-button link type="danger" :icon="Delete" @click="handleRemove($index)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <div class="legend">
      <span>默认档位参考：</span>
      <el-tag size="small" effect="plain">1 天</el-tag>
      <el-tag size="small" effect="plain">7 天（一周）</el-tag>
      <el-tag size="small" effect="plain">30 天（一月）</el-tag>
    </div>
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

.days-cell {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.unit {
  font-size: 13px;
  color: var(--ap-text-secondary);
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
