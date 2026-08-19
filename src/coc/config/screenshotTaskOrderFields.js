export const TASK_WORK_TYPES = ['安全', '质量']

const QUALITY_WORK_TYPE_HINT = /质量|混凝土|养护|钢筋|模板|浇筑|开裂/

/** 将历史自由文本映射为工作类型枚举；空值保持为空，供表单必选。 */
export function resolveTaskWorkType(value, extraText = '') {
  if (TASK_WORK_TYPES.includes(value)) return value
  const blob = `${value || ''}${extraText || ''}`
  if (!blob.trim()) return ''
  if (QUALITY_WORK_TYPE_HINT.test(blob)) return '质量'
  return '安全'
}

export const TASK_WORK_SOURCES = ['视频监控', '监控回放', '调度会议', '远程对讲', '现场抽检']

export const TASK_EXECUTE_DEPTS = ['安监部', '质量部', '工程管理部', 'COC调度室', '责任单位']

export const TASK_LEDGER_ACTIONS = ['登记并下发', '仅登记台账', '待确认后下发']

export function mapSourceTypeToWorkSource(sourceType) {
  return (
    {
      live: '视频监控',
      playback: '监控回放',
      meeting: '调度会议',
    }[sourceType] || '视频监控'
  )
}

export function defaultTaskDeadline() {
  const d = new Date()
  d.setDate(d.getDate() + 7)
  return d.toISOString().slice(0, 10)
}

export function taskOrderStatusByLedgerAction(ledgerAction) {
  if (ledgerAction === '待确认后下发') return '待确认'
  if (ledgerAction === '登记并下发') return '已下发'
  return ''
}

export function shouldSyncTaskOrderLedger(ledgerAction) {
  return ledgerAction === '登记并下发' || ledgerAction === '待确认后下发'
}
