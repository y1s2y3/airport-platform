<script setup>
import { computed, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Download } from '@element-plus/icons-vue'
import { DAILY_WORK_EXPORT_SHEETS } from '../utils/dailyWorkExport.js'
import { exportDailyWorkRecords } from '../utils/dailyWorkExportWorkbook.js'

const props = defineProps({
  modelValue: Boolean,
  records: { type: Array, default: () => [] },
  selectedDate: { type: String, default: '' },
  keyword: { type: String, default: '' },
})
const emit = defineEmits(['update:modelValue'])
const exportDate = ref('')
const calendarDefaultDate = ref(new Date())
const calendarPopperOptions = {
  strategy: 'fixed',
  modifiers: [{ name: 'preventOverflow', options: { altAxis: true, tether: false, padding: 12 } }],
}
const sheets = ref([])
const exporting = ref(false)
const canExport = computed(() => Boolean(exportDate.value && sheets.value.length))

watch(() => props.modelValue, visible => {
  if (!visible) return
  exportDate.value = props.selectedDate || ''
  if (props.selectedDate) {
    const [year, month, day] = props.selectedDate.split('-').map(Number)
    calendarDefaultDate.value = new Date(year, month - 1, day)
  } else {
    calendarDefaultDate.value = new Date()
  }
  sheets.value = DAILY_WORK_EXPORT_SHEETS.map(sheet => sheet.key)
})

async function confirmExport() {
  if (!canExport.value || exporting.value) return
  exporting.value = true
  try {
    const result = await exportDailyWorkRecords(props.records, { dates: [exportDate.value], sheets: sheets.value, keyword: props.keyword })
    if (!result.ok) {
      ElMessage.warning(result.error)
      return
    }
    emit('update:modelValue', false)
    ElMessage.success('导出成功')
  } catch (error) {
    ElMessage.error(error?.message || '导出失败，请重试')
  } finally {
    exporting.value = false
  }
}
</script>

<template>
  <el-dialog
    :model-value="modelValue"
    title="导出每日施工作业"
    width="min(560px, calc(100vw - 32px))"
    align-center
    append-to-body
    class="dw-export-dialog"
    modal-class="dw-export-overlay"
    :close-on-click-modal="!exporting"
    :close-on-press-escape="!exporting"
    :show-close="!exporting"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <el-form label-position="top" class="dw-export-form">
      <el-form-item label="导出日期" required>
        <el-date-picker
          v-model="exportDate"
          type="date"
          format="YYYY-MM-DD"
          value-format="YYYY-MM-DD"
          :default-value="calendarDefaultDate"
          :popper-options="calendarPopperOptions"
          placeholder="请选择日期"
          :disabled="exporting"
          class="dw-export-date"
          aria-label="导出日期"
        />
      </el-form-item>
      <el-form-item label="导出表单" required>
        <el-checkbox-group v-model="sheets" :disabled="exporting" class="dw-export-sheets" aria-label="导出表单">
          <el-checkbox v-for="sheet in DAILY_WORK_EXPORT_SHEETS" :key="sheet.key" :value="sheet.key" class="dw-export-sheet">
            <span class="dw-export-sheet-name">{{ sheet.name }}</span>
          </el-checkbox>
        </el-checkbox-group>
      </el-form-item>
    </el-form>
    <template #footer>
      <div class="dw-export-actions">
        <el-button :disabled="exporting" @click="emit('update:modelValue', false)">取消</el-button>
        <el-button type="primary" :icon="Download" :loading="exporting" :disabled="!canExport" @click="confirmExport">确认导出</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<style scoped>
:global(.dw-export-overlay .el-overlay-dialog) { box-sizing: border-box; padding: 16px; overflow: hidden; }
:global(.dw-export-dialog.el-dialog) { display: flex; flex-direction: column; max-height: calc(100dvh - 32px); margin: auto; }
:global(.dw-export-dialog > .el-dialog__body) { min-height: 0; overflow-y: auto; overscroll-behavior: contain; }
.dw-export-form { padding: 4px 0; }
.dw-export-form :deep(.el-form-item) { margin-bottom: 24px; }
.dw-export-form :deep(.el-form-item:last-child) { margin-bottom: 0; }
.dw-export-form :deep(.el-form-item__label) { font-weight: 500; color: var(--ap-text); }
.dw-export-form :deep(.dw-export-date.el-date-editor) { width: 100%; }
.dw-export-sheets { display: flex; flex-wrap: wrap; gap: 8px 24px; }
.dw-export-sheet { margin: 0; height: 32px; }
.dw-export-sheet-name { display: inline-flex; align-items: center; gap: 6px; color: var(--ap-text); }
.dw-export-actions { display: flex; justify-content: flex-end; gap: 12px; padding-top: 4px; }
.dw-export-actions :deep(.el-button + .el-button) { margin-left: 0; }
</style>
