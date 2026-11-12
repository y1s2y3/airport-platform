import { computed, ref } from 'vue'

/**
 * 工作类型字典（指挥部维护：调度后台管理 → 任务单 → 配置工作类型）
 * - 默认三条：安全 / 质量 / 生态治理
 * - 全平台一份，指挥部统一维护；任务单、截图登记、处罚单「类型」均取此字典
 * - 原型存 localStorage（接后端后改为字典接口）
 */
export const DEFAULT_TASK_WORK_TYPES = ['安全', '质量', '生态治理']

const WORK_TYPE_STORAGE_KEY = 'coc-task-work-types-v1'
export const WORK_TYPE_CHANGE_EVENT = 'coc-task-work-types-change'

function sanitizeWorkTypes(list = []) {
  const seen = new Set()
  return (Array.isArray(list) ? list : [])
    .map((item) => String(item ?? '').trim())
    .filter((item) => {
      if (!item || seen.has(item)) return false
      seen.add(item)
      return true
    })
}

function readStoredWorkTypes() {
  try {
    const raw = window.localStorage.getItem(WORK_TYPE_STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : null
    const list = sanitizeWorkTypes(parsed)
    return list.length ? list : [...DEFAULT_TASK_WORK_TYPES]
  } catch (error) {
    return [...DEFAULT_TASK_WORK_TYPES]
  }
}

/** 当前生效的工作类型（响应式；配置弹窗保存后全站下拉即时更新） */
export const taskWorkTypes = ref(readStoredWorkTypes())

/** el-select 选项 */
export const taskWorkTypeOptions = computed(() =>
  taskWorkTypes.value.map((item) => ({ label: item, value: item })),
)

/** 当前值快照（非响应式场景使用） */
export function currentTaskWorkTypes() {
  return [...taskWorkTypes.value]
}

/** 保存工作类型字典；返回去重后的最新列表 */
export function saveTaskWorkTypes(list = []) {
  const next = sanitizeWorkTypes(list)
  taskWorkTypes.value = next.length ? next : [...DEFAULT_TASK_WORK_TYPES]
  try {
    window.localStorage.setItem(WORK_TYPE_STORAGE_KEY, JSON.stringify(taskWorkTypes.value))
  } catch (error) {
    // 原型存储失败不影响本次会话使用
  }
  window.dispatchEvent(new CustomEvent(WORK_TYPE_CHANGE_EVENT))
  return [...taskWorkTypes.value]
}

export function resetTaskWorkTypes() {
  return saveTaskWorkTypes(DEFAULT_TASK_WORK_TYPES)
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key === WORK_TYPE_STORAGE_KEY) taskWorkTypes.value = readStoredWorkTypes()
  })
}

const QUALITY_WORK_TYPE_HINT = /质量|混凝土|养护|钢筋|模板|浇筑|开裂/

/**
 * 历史数据兼容：已配置的值原样保留；空值按正文线索兜底映射。
 * 不再把非字典的历史自由文本改写成「安全/质量」，避免配置项被删除后历史单据被动改名。
 */
export function resolveTaskWorkType(value, extraText = '') {
  const types = taskWorkTypes.value
  const text = String(value ?? '').trim()
  if (text) return text
  const blob = String(extraText ?? '').trim()
  if (!blob) return ''
  if (types.includes('质量') && QUALITY_WORK_TYPE_HINT.test(blob)) return '质量'
  if (types.includes('安全')) return '安全'
  return ''
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
