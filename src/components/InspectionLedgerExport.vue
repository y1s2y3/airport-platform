<script setup>
import { computed, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Download } from '@element-plus/icons-vue'
import { isWithinInspectionDateRange } from '../utils/inspectionLedgerDates'

const props = defineProps({
  name: { type: String, required: true },
  rows: { type: Array, required: true },
  columns: { type: Array, required: true },
  detailColumns: { type: Array, default: () => [] },
  fontFamily: String,
  dateOptions: { type: Array, required: true },
  toDetail: { type: Function, required: true },
})

const visible = ref(false)
const exporting = ref(false)
const dateField = ref('')
const range = ref(null)
const dateLabel = computed(() => props.dateOptions.find(option => option.key === dateField.value)?.label || '')
const selectedRows = computed(() => range.value?.length === 2
  ? props.rows.filter(row => isWithinInspectionDateRange(row[dateField.value], range.value))
  : [],
)

function open() {
  dateField.value = props.dateOptions[0].key
  range.value = null
  visible.value = true
}

async function exportFile() {
  if (!range.value?.length) return ElMessage.warning('请选择起止日期')
  if (!selectedRows.value.length) return ElMessage.warning('所选日期范围内没有可导出的记录')
  exporting.value = true
  try {
    const rows = selectedRows.value.map(props.toDetail)
    const fileStem = props.name + '_' + range.value.join('_')
    const { buildInspectionExportFile } = await import('../utils/inspectionExportWorkbook')
    const { filename, blob } = await buildInspectionExportFile({
      name: props.name,
      fileStem,
      columns: props.columns,
      detailColumns: props.detailColumns,
      fontFamily: props.fontFamily,
      rows,
      identifier: props.columns[0][0],
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    visible.value = false
  } catch {
    ElMessage.error('导出失败，请重试')
  } finally {
    exporting.value = false
  }
}
</script>

<template>
  <el-button :icon="Download" @click="open">导出</el-button>
  <el-dialog v-model="visible" :title="'导出' + name" width="min(520px, 94vw)" append-to-body>
    <el-form label-width="132px">
      <el-form-item v-if="dateOptions.length > 1" label="日期依据">
        <el-select v-model="dateField">
          <el-option v-for="option in dateOptions" :key="option.key" :label="option.label" :value="option.key" />
        </el-select>
      </el-form-item>
      <el-form-item :label="dateLabel" required>
        <el-date-picker
          v-model="range"
          type="daterange"
          value-format="YYYY-MM-DD"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          range-separator="至"
          unlink-panels
        />
      </el-form-item>
      <el-form-item v-if="range?.length === 2">符合条件 {{ selectedRows.length }} 条</el-form-item>
      <el-form-item>
        {{ detailColumns.length
          ? '导出含检查项和隐患详情。每条隐患一行，同一巡检单的公共字段合并。无隐患的巡检单保留一行。'
          : '导出含隐患、整改、复查及审批详情。每条整改单一行。' }}
        有照片原文件时，Excel 与照片一并打包。
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" :loading="exporting" @click="exportFile">导出 Excel</el-button>
    </template>
  </el-dialog>
</template>
