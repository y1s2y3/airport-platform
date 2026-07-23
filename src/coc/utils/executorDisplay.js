import { TASK_EXECUTOR_OPTIONS } from '../mock/data.js'

/** 姓名（岗位） */
export function formatExecutorLabel({ name, position } = {}) {
  if (!name) return ''
  return position ? `${name}（${position}）` : name
}

export function getExecutorOptionValue(option) {
  return formatExecutorLabel(option)
}

/** 列表/详情展示：兼容仅存姓名的历史数据 */
export function resolveExecutorDisplay(value, position = '') {
  if (!value) return '—'
  if (position) return formatExecutorLabel({ name: value, position })
  if (/（.+）$/.test(value)) return value
  const byValue = TASK_EXECUTOR_OPTIONS.find((o) => getExecutorOptionValue(o) === value)
  if (byValue) return value
  const byName = TASK_EXECUTOR_OPTIONS.find((o) => o.name === value)
  if (byName) return formatExecutorLabel(byName)
  return value
}

export function parseExecutor(value) {
  const text = String(value || '').trim()
  if (!text) return { name: '', position: '' }
  const match = text.match(/^(.+?)（(.+?)）$/)
  if (match) return { name: match[1], position: match[2] }
  const byName = TASK_EXECUTOR_OPTIONS.find((o) => o.name === text)
  if (byName) return { name: byName.name, position: byName.position }
  return { name: text, position: '' }
}

export function buildExecutorOptions(extra = []) {
  const map = new Map()
  ;[...TASK_EXECUTOR_OPTIONS, ...extra.filter(Boolean)].forEach((item) => {
    if (typeof item === 'string') {
      const parsed = parseExecutor(item)
      if (parsed.name) map.set(getExecutorOptionValue(parsed), parsed)
      return
    }
    map.set(getExecutorOptionValue(item), item)
  })
  return [...map.entries()].map(([value, option]) => ({ value, ...option }))
}
