import { ElMessage, ElMessageBox } from 'element-plus'
import { deleteMobileRectificationRecord } from './useMobileRectification'

export async function confirmInspectionVoidDelete(record) {
  try {
    await ElMessageBox.confirm(
      `确定删除已作废整改单「${record.rectifyNo}」？删除后原单无法查看，发起和审批记录可在个人中心查看。`,
      '删除确认',
      { type: 'warning', confirmButtonText: '确认删除', cancelButtonText: '取消' },
    )
  } catch {
    return
  }
  if (deleteMobileRectificationRecord(record.id)) ElMessage.success('已删除')
  else ElMessage.warning('删除失败，请确认单据状态和权限后重试')
}
