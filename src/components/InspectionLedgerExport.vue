<script setup>
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Download } from '@element-plus/icons-vue'

const props = defineProps({
  name: { type: String, required: true },
  rows: { type: Array, required: true },
  columns: { type: Array, required: true },
  detailColumns: { type: Array, default: () => [] },
  fontFamily: String,
  toDetail: { type: Function, required: true },
})

const exporting = ref(false)

async function exportFile() {
  if (exporting.value) return
  if (!props.rows.length) return ElMessage.warning('当前筛选没有可导出的记录')
  exporting.value = true
  try {
    const rows = props.rows.map(props.toDetail)
    const fileStem = props.name
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
  } catch {
    ElMessage.error('导出失败，请重试')
  } finally {
    exporting.value = false
  }
}
</script>

<template>
  <el-button :icon="Download" :loading="exporting" @click="exportFile">导出</el-button>
</template>
