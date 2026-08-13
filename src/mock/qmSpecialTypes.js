/**
 * 专项验收类型字典（无 ops 依赖）
 * 法定资料按类型提供建议清单，份数可配；提交不强制上传。
 */

/** 专项验收类型及建议法定资料清单（选填，非强制） */
export const SPECIAL_ACCEPT_TYPES = [
  {
    code: 'fire',
    label: '消防验收',
    form_template_id: 'ft-special-fire',
    requiredDocs: [
      { slot: 'fire_design', label: '消防设计审查意见书' },
      { slot: 'fire_detect', label: '消防设施检测报告' },
      { slot: 'fire_opinion', label: '消防验收意见书/备案凭证' },
    ],
  },
  {
    code: 'civil_defense',
    label: '人防验收',
    form_template_id: 'ft-special-fire',
    requiredDocs: [
      { slot: 'cd_design', label: '人防设计审查文件' },
      { slot: 'cd_opinion', label: '人防验收意见书' },
    ],
  },
  {
    code: 'energy',
    label: '节能验收',
    form_template_id: 'ft-special-fire',
    requiredDocs: [
      { slot: 'en_design', label: '节能设计审查意见' },
      { slot: 'en_test', label: '节能检测报告' },
      { slot: 'en_opinion', label: '节能专项验收意见' },
    ],
  },
  {
    code: 'planning',
    label: '规划验收',
    form_template_id: 'ft-special-fire',
    requiredDocs: [
      { slot: 'pl_permit', label: '建设工程规划许可证' },
      { slot: 'pl_opinion', label: '规划核实意见书' },
    ],
  },
  {
    code: 'special_equip',
    label: '特种设备',
    form_template_id: 'ft-special-fire',
    requiredDocs: [
      { slot: 'se_cert', label: '特种设备制造/安装许可证' },
      { slot: 'se_inspect', label: '特种设备监督检验报告' },
      { slot: 'se_register', label: '特种设备使用登记证' },
      { slot: 'se_notify', label: '特种设备安装告知书' },
    ],
  },
]

export function getSpecialAcceptType(code) {
  return SPECIAL_ACCEPT_TYPES.find((t) => t.code === code) || null
}

export function specialTypeLabel(code) {
  return getSpecialAcceptType(code)?.label || code || '—'
}

/**
 * 专项建议资料未上传列表（仅供界面展示，不用于提交拦截）
 * @deprecated 提交不再强制；保留供选填进度展示
 */
export function missingSpecialRequiredDocs(task, attachments = []) {
  if (!task || Number(task.task_type) !== 6 || !task.special_type) return []
  const meta = getSpecialAcceptType(task.special_type)
  if (!meta?.requiredDocs?.length) return []
  const slots = new Set(
    (attachments || [])
      .filter((a) => a && a.doc_slot)
      .map((a) => a.doc_slot),
  )
  return meta.requiredDocs.filter((d) => !slots.has(d.slot))
}
