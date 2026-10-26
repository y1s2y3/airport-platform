<script setup>
/**
 * 预警推送规则配置弹窗（用户 2026-10-26）
 *
 * 从「机械设备预警」页抽出的公共组件，机械设备预警与危大监测预警共用：
 * 界面一致、数据同源（src/mock/alertRuleConfig.js），任一页提交后另一页即为改后值。
 */
import { ref, watch } from 'vue'
import { InfoFilled } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import {
  ALERT_HQ_PUSH_OPTIONS,
  ALERT_RECEIVER_OPTIONS,
  ALERT_PUSH_METHOD_OPTIONS,
  ALERT_UPGRADE_ENABLE_OPTIONS,
  getAlertPushRules,
  saveAlertPushRules,
  getAlertUpgradeRules,
  saveAlertUpgradeRules,
} from '../../mock/alertRuleConfig'

const props = defineProps({
  /** 弹窗显隐（v-model） */
  modelValue: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['update:modelValue'])

const pushRuleRows = ref([])
const upgradeRuleRows = ref([])

/** 每次打开都从共享数据源重新读取，保证两页看到的是同一份配置 */
function loadRules() {
  pushRuleRows.value = getAlertPushRules()
  upgradeRuleRows.value = getAlertUpgradeRules()
}

watch(
  () => props.modelValue,
  (visible) => {
    if (visible) loadRules()
  },
  { immediate: true },
)

/** 选择「不推送」时清空接收人与推送方式 */
function handleHqPushChange(row) {
  if (row.pushToHq === '否') {
    row.receivers = []
    row.methods = []
  }
}

function close() {
  emit('update:modelValue', false)
}

function submit() {
  saveAlertPushRules(pushRuleRows.value)
  saveAlertUpgradeRules(upgradeRuleRows.value)
  close()
  ElMessage.success('预警推送规则配置已提交')
}
</script>

<template>
  <el-dialog
    :model-value="modelValue"
    title="预警推送规则配置"
    width="796px"
    :close-on-click-modal="false"
    class="rule-config-dialog"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div class="rule-section">
      <div class="rule-section-title">
        <span>分级推送配置</span>
        <el-icon class="rule-info"><InfoFilled /></el-icon>
      </div>
      <el-table :data="pushRuleRows" border class="rule-table" size="default">
        <el-table-column prop="alertLevel" label="预警等级" width="120" align="center" />
        <el-table-column label="是否推送工程指挥部" width="170" align="center">
          <template #default="{ row }">
            <el-select v-model="row.pushToHq" class="enable-select" placeholder="请选择" @change="handleHqPushChange(row)" aria-label="请选择">
              <el-option v-for="item in ALERT_HQ_PUSH_OPTIONS" :key="item" :label="item" :value="item" />
            </el-select>
          </template>
        </el-table-column>
        <el-table-column label="预警接收人" min-width="250" align="center">
          <template #default="{ row }">
            <el-select
              v-model="row.receivers"
              class="rule-select"
              multiple
              collapse-tags
              collapse-tags-tooltip
              :disabled="row.pushToHq === '否'"
              placeholder="请选择"
              aria-label="请选择"
            >
              <el-option v-for="item in ALERT_RECEIVER_OPTIONS" :key="item" :label="item" :value="item" />
            </el-select>
          </template>
        </el-table-column>
        <el-table-column label="推送方式" min-width="190" align="center">
          <template #default="{ row }">
            <el-select
              v-model="row.methods"
              class="rule-select"
              multiple
              collapse-tags
              collapse-tags-tooltip
              :disabled="row.pushToHq === '否'"
              placeholder="请选择"
              aria-label="请选择"
            >
              <el-option v-for="item in ALERT_PUSH_METHOD_OPTIONS" :key="item" :label="item" :value="item" />
            </el-select>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <div class="rule-section upgrade-section">
      <div class="rule-section-title">
        <span>预警超期未处理自动升级配置</span>
      </div>
      <el-table :data="upgradeRuleRows" border class="rule-table" size="default">
        <el-table-column prop="alertLevel" label="预警等级" width="150" align="center" />
        <el-table-column label="超期未处理天数" min-width="230" align="center">
          <template #default="{ row }">
            <div class="overdue-cell">
              <span>超过</span>
              <el-input-number v-model="row.overdueDays" :min="1" :controls="false" class="days-input" />
              <span>天未处理</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="upgradeLevel" label="升级后等级" min-width="180" align="center" />
        <el-table-column label="是否启用升级" min-width="160" align="center">
          <template #default="{ row }">
            <el-select v-model="row.enabled" class="enable-select" placeholder="请选择" aria-label="请选择">
              <el-option v-for="item in ALERT_UPGRADE_ENABLE_OPTIONS" :key="item" :label="item" :value="item" />
            </el-select>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <template #footer>
      <el-button @click="close">取消</el-button>
      <el-button type="primary" @click="submit">提交</el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
.rule-section { margin-bottom: 22px; }
.upgrade-section { margin-bottom: 0; }
.rule-section-title { display: flex; align-items: center; gap: 6px; margin-bottom: 12px; font-size: 14px; font-weight: 600; color: #1f2329; }
.rule-info { color: #909399; font-size: 16px; }
.rule-table { font-size: 13px; }
.rule-table :deep(.el-table__header th) { background: #f5f7fa; color: #606266; font-weight: 600; }
.rule-table :deep(.el-table__cell) { padding: 11px 0; }
.rule-select { width: 100%; }
.overdue-cell { display: flex; align-items: center; justify-content: center; gap: 8px; }
.days-input { width: 64px; }
.days-input :deep(.el-input__wrapper) { padding: 0 8px; }
.days-input :deep(.el-input__inner) { text-align: center; }
.enable-select { width: 96px; }
</style>
