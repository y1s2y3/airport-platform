import { INSPECTION_CATEGORIES } from './inspectionManagement.js'

const typeByCategory = { 安全: 'safety', 质量: 'quality', 其他: 'other' }

export const DISPATCH_HAZARD_TYPE_OPTIONS = INSPECTION_CATEGORIES.map(label => ({
  label,
  value: typeByCategory[label],
}))

export function isDispatchHazardType(type) {
  return DISPATCH_HAZARD_TYPE_OPTIONS.some(option => option.value === type)
}

export function getDispatchHazardTypeLabel(type) {
  return DISPATCH_HAZARD_TYPE_OPTIONS.find(option => option.value === type)?.label || ''
}
