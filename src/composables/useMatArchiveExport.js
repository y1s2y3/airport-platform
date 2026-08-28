import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { exportMatEntryArchive } from '../utils/matEntryArchiveExport.js'

/** 材料/设备进场单导出归档：弹窗勾选 → 按选择导出 Word */
export function useMatArchiveExport() {
  const dialogVisible = ref(false)
  const exportLoading = ref(false)
  const pendingDetail = ref(null)

  function openExportDialog(detail) {
    if (!detail) {
      ElMessage.warning('进场单不存在')
      return
    }
    pendingDetail.value = detail
    dialogVisible.value = true
  }

  async function confirmExport(selectedKeys) {
    const detail = pendingDetail.value
    if (!detail || exportLoading.value) return
    exportLoading.value = true
    try {
      const r = await exportMatEntryArchive(detail, { sections: selectedKeys })
      if (!r.ok) {
        ElMessage.warning(r.msg)
        return
      }
      ElMessage.success('归档文件已导出')
      dialogVisible.value = false
      pendingDetail.value = null
    } finally {
      exportLoading.value = false
    }
  }

  return {
    dialogVisible,
    exportLoading,
    openExportDialog,
    confirmExport,
  }
}
