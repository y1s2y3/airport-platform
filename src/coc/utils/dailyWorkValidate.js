/**
 * 每日施工作业 — 录入/导入共用格式与业务校验
 *（导出不做项目存在性等限制，仅按列写出）
 */
import { parseContacts, parseOneContact } from '../../utils/contactValue.js'
import { projectList } from '../../mock/projectBasicInfo.js'
import {
  DANGER_WORK_CATEGORY_OPTIONS,
  DANGER_WORK_FIELDS,
  DAILY_WORK_DEFAULT_LEAD_UNIT,
} from '../config/dailyWorkSchema.js'

export { DAILY_WORK_DEFAULT_LEAD_UNIT }

export const DAILY_WORK_FIELD_LIMITS = {
  projectName: 200,
  workArea: 200,
  dangerControlMeasures: 2000,
}

/** 项目负责人类：仅单人 */
export const DAILY_WORK_SINGLE_CONTACT_KEYS = [
  'ownerProjectManager',
  'contractorProjectManager',
  'supervisorProjectManager',
]

/** 安全监管人类：可多人（英文逗号分隔） */
export const DAILY_WORK_MULTI_CONTACT_KEYS = [
  'ownerSafetyManager',
  'contractorSafetyManager',
  'supervisorSafetyManager',
  'majorOwnerSafetyManager',
  'majorContractorSafetyManager',
  'majorSupervisorSafetyManager',
]

const DATETIME_RE = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/
const MOBILE_RE = /^\d{11}$/

function fieldLabelOf(key) {
  const hit = DANGER_WORK_FIELDS.find((f) => f.key === key)
  return hit?.label || key
}

export function findProjectByDailyWorkName(projectName) {
  const text = String(projectName || '').trim()
  if (!text) return null
  return (
    projectList.find(
      (item) =>
        !item.hidden &&
        (String(item.projectName || '').trim() === text ||
          String(item.shortName || '').trim() === text),
    ) || null
  )
}

export function getContractorByProjectName(projectName) {
  const project = findProjectByDailyWorkName(projectName)
  return project ? String(project.contractorUnit || '').trim() : ''
}

function isValidPersonToken(raw) {
  const text = String(raw || '').trim()
  if (!text) return false
  if (!/\//.test(text)) return false
  const { name, phone } = parseOneContact(text)
  return Boolean(name && MOBILE_RE.test(String(phone || '').trim()))
}

/** 单人：姓名/手机号；不得含英文逗号 */
export function validateSingleContactValue(raw, label) {
  const text = String(raw || '').trim()
  if (!text) return `${label}不能为空`
  if (text.includes(',')) return `${label}只能填写单人，请勿使用逗号分隔`
  if (!isValidPersonToken(text)) {
    return `${label}格式须为「姓名/11位手机号」（例：李XX/135xxxx4567）`
  }
  return ''
}

/** 多人：英文逗号分隔的多个「姓名/手机号」 */
export function validateMultiContactValue(raw, label, opts = {}) {
  const max = opts.max ?? 5
  const text = String(raw || '').trim()
  if (!text) return `${label}不能为空`
  if (/[，；;、]/.test(text)) {
    return `${label}多人之间须用英文逗号分隔`
  }
  const parts = text.split(',').map((p) => p.trim()).filter(Boolean)
  if (!parts.length) return `${label}不能为空`
  if (parts.length > max) {
    return `${label}最多 ${max} 人`
  }
  for (let i = 0; i < parts.length; i += 1) {
    if (!isValidPersonToken(parts[i])) {
      return `${label}第${i + 1}人格式须为「姓名/11位手机号」`
    }
  }
  return ''
}

export function validateWorkDateTime(value, label) {
  const text = String(value || '').trim()
  if (!text) return `${label}不能为空`
  if (!DATETIME_RE.test(text)) {
    return `${label}格式须为 yyyy-MM-dd HH:mm（例：2025-07-08 08:00）`
  }
  return ''
}

/**
 * 作业时段须落在施工日当天 00:00–23:59，且开始 ≤ 结束
 */
export function validateWorkTimeWindow(reportDate, startTime, endTime) {
  const day = String(reportDate || '').trim()
  if (!day) return '请先填写施工日期'

  const startErr = validateWorkDateTime(startTime, '作业开始时间')
  if (startErr) return startErr
  const endErr = validateWorkDateTime(endTime, '作业结束时间')
  if (endErr) return endErr

  const startDay = startTime.slice(0, 10)
  const endDay = endTime.slice(0, 10)
  if (startDay !== day || endDay !== day) {
    return `作业开始/结束时间须落在施工日当天（${day}）的 00:00–23:59`
  }

  const startHm = startTime.slice(11, 16)
  const endHm = endTime.slice(11, 16)
  if (startHm < '00:00' || startHm > '23:59' || endHm < '00:00' || endHm > '23:59') {
    return '作业时间须在当天 00:00–23:59 范围内'
  }
  if (startTime > endTime) {
    return '作业开始时间不能晚于作业结束时间'
  }
  return ''
}

export function validateDangerCategory(value) {
  const text = String(value || '').trim()
  if (!text) return '作业类别不能为空'
  if (!DANGER_WORK_CATEGORY_OPTIONS.includes(text)) {
    return `作业类别须为单选枚举值（当前不支持「${text}」）`
  }
  return ''
}

function validateLength(value, key, label) {
  const max = DAILY_WORK_FIELD_LIMITS[key]
  if (!max) return ''
  const text = String(value || '')
  if (text.length > max) return `${label}最大长度为${max}`
  return ''
}

/**
 * 校验单条记录（录入 / 导入共用）
 * @param {object} record
 * @param {{ requireProjectExists?: boolean, fillContractor?: boolean }} [opts]
 * @returns {{ ok: boolean, errors: string[], record: object }}
 */
export function validateDailyWorkRecord(record, opts = {}) {
  const requireProjectExists = opts.requireProjectExists !== false
  const errors = []
  const next = { ...record }

  if (!String(next.leadUnit || '').trim()) {
    next.leadUnit = DAILY_WORK_DEFAULT_LEAD_UNIT
  }

  const requiredKeys = DANGER_WORK_FIELDS.filter((f) => f.required).map((f) => f.key)
  for (const key of requiredKeys) {
    if (DAILY_WORK_SINGLE_CONTACT_KEYS.includes(key) || DAILY_WORK_MULTI_CONTACT_KEYS.includes(key)) {
      continue
    }
    if (key === 'startTime' || key === 'endTime' || key === 'dangerWorkCategory') continue
    if (!String(next[key] ?? '').trim()) {
      errors.push(`请填写${fieldLabelOf(key)}`)
    }
  }

  const lenChecks = [
    ['projectName', '施工项目名称'],
    ['workArea', '施工区域'],
    ['dangerControlMeasures', '风险管控措施'],
  ]
  lenChecks.forEach(([key, label]) => {
    const err = validateLength(next[key], key, label)
    if (err) errors.push(err)
  })

  if (requireProjectExists) {
    const projectName = String(next.projectName || '').trim()
    if (projectName) {
      const project = findProjectByDailyWorkName(projectName)
      if (!project) {
        errors.push(`施工项目名称「${projectName}」不存在，请填写系统内项目全称或简称`)
      } else {
        next.projectName = project.projectName
        if (opts.fillContractor || !String(next.contractor || '').trim()) {
          next.contractor = String(project.contractorUnit || '').trim()
        }
      }
    }
  }

  const catErr = validateDangerCategory(next.dangerWorkCategory)
  if (catErr) errors.push(catErr)

  const timeWindowErr = validateWorkTimeWindow(next.reportDate, next.startTime, next.endTime)
  if (timeWindowErr) errors.push(timeWindowErr)

  DAILY_WORK_SINGLE_CONTACT_KEYS.forEach((key) => {
    const field = DANGER_WORK_FIELDS.find((f) => f.key === key)
    const required = field?.required
    const text = String(next[key] || '').trim()
    if (!text) {
      if (required) errors.push(`请填写${fieldLabelOf(key)}`)
      return
    }
    const err = validateSingleContactValue(text, fieldLabelOf(key))
    if (err) errors.push(err)
  })

  DAILY_WORK_MULTI_CONTACT_KEYS.forEach((key) => {
    const field = DANGER_WORK_FIELDS.find((f) => f.key === key)
    if (!field) return
    const text = String(next[key] || '').trim()
    if (!text) {
      if (field.required) errors.push(`请填写${fieldLabelOf(key)}`)
      return
    }
    const err = validateMultiContactValue(text, fieldLabelOf(key), { max: 5 })
    if (err) errors.push(err)
  })

  return { ok: errors.length === 0, errors, record: next }
}

/**
 * 批量导入硬校验：任一行失败则整批拦截
 * @returns {{ ok: boolean, errors: string[], records: object[] }}
 */
export function validateDailyWorkImportRecords(records) {
  const list = Array.isArray(records) ? records : []
  if (!list.length) {
    return { ok: false, errors: ['没有可导入的数据'], records: [] }
  }
  const out = []
  const errors = []
  list.forEach((row, index) => {
    const result = validateDailyWorkRecord(row, {
      requireProjectExists: true,
      fillContractor: false,
    })
    out.push(result.record)
    result.errors.forEach((msg) => {
      errors.push(`第${index + 1}行：${msg}`)
    })
  })
  return { ok: errors.length === 0, errors, records: out }
}

/** 供界面把多联系人字符串拆成行编辑 */
export function splitMultiContacts(raw) {
  return parseContacts(raw).map((c) => {
    const name = c.name || ''
    const phone = c.phone || ''
    if (!name && !phone) return ''
    if (!phone) return name
    return `${name}/${phone}`
  })
}

export function joinMultiContacts(parts) {
  return (parts || [])
    .map((p) => String(p || '').trim())
    .filter(Boolean)
    .join(',')
}
