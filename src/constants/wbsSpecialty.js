/**
 * WBS 实体工程节点 · 专业枚举（实体工程分解维护）
 * 口径：房建按 GB 50300 / 通用安装工程划分；航空按民航局民航专业工程分类；线性按市政/线性基础设施划分。
 */

export const WBS_SPECIALTY_DEFAULT = '结构'

/** @type {{ label: string, options: { value: string, label: string }[] }[]} */
export const WBS_SPECIALTY_GROUPS = [
  {
    label: '房建工程',
    options: [
      { value: '结构', label: '结构' },
      { value: '建筑', label: '建筑' },
      { value: '装饰装修', label: '装饰装修' },
      { value: '屋面', label: '屋面' },
      { value: '钢结构', label: '钢结构' },
      { value: '地基与基础', label: '地基与基础' },
      { value: '给排水及采暖', label: '给排水及采暖' },
      { value: '通风与空调', label: '通风与空调' },
      { value: '建筑电气', label: '建筑电气' },
      { value: '建筑智能化', label: '建筑智能化' },
      { value: '电梯', label: '电梯' },
      { value: '幕墙', label: '幕墙' },
      { value: '消防', label: '消防' },
      { value: '人防', label: '人防' },
      { value: '节能', label: '节能' },
      { value: '机电', label: '机电（综合安装）' },
    ],
  },
  {
    label: '航空 / 民航专业工程',
    options: [
      { value: '道面', label: '场道工程' },
      { value: '空管工程', label: '空管工程' },
      { value: '目视助航工程', label: '目视助航工程' },
      { value: '弱电系统工程', label: '弱电系统工程' },
      { value: '供油工程', label: '供油工程' },
      { value: '飞行区土石方', label: '飞行区土石方' },
      { value: '飞行区排水', label: '飞行区排水' },
      { value: '围界及安防', label: '围界及安防' },
    ],
  },
  {
    label: '线性 / 市政工程',
    options: [
      { value: '市政', label: '市政（综合）' },
      { value: '道路工程', label: '道路工程' },
      { value: '桥梁工程', label: '桥梁工程' },
      { value: '隧道工程', label: '隧道工程' },
      { value: '轨道交通', label: '轨道交通' },
      { value: '综合管廊', label: '综合管廊' },
      { value: '给水工程', label: '给水工程' },
      { value: '排水工程', label: '排水工程' },
      { value: '燃气工程', label: '燃气工程' },
      { value: '供热工程', label: '供热工程' },
      { value: '市政电气', label: '市政电气' },
      { value: '通信管线', label: '通信管线' },
    ],
  },
]

export const WBS_SPECIALTY_OPTIONS = WBS_SPECIALTY_GROUPS.flatMap((g) => g.options)

export const WBS_SPECIALTY_VALUES = WBS_SPECIALTY_OPTIONS.map((o) => o.value)

export const WBS_SPECIALTY_SET = new Set(WBS_SPECIALTY_VALUES)

export const WBS_SPECIALTY_DEFAULTS = [WBS_SPECIALTY_DEFAULT]

/** 归一化为去重后的有效枚举数组（兼容 legacy 单值 / 顿号拼接） */
export function normalizeSpecialties(input) {
  let raw = []
  if (Array.isArray(input)) {
    raw = input
  } else if (input == null || input === '') {
    return []
  } else {
    const s = String(input).trim()
    raw = s.includes('、') ? s.split('、') : [s]
  }
  const out = []
  for (const item of raw) {
    const v = String(item || '').trim()
    if (v && WBS_SPECIALTY_SET.has(v) && !out.includes(v)) out.push(v)
  }
  return out
}

export function getEffectiveSpecialties(node) {
  if (!node) return []
  return normalizeSpecialties(node.specialties ?? node.specialty)
}

export function formatSpecialtiesDisplay(input, fallback = '—') {
  const arr = normalizeSpecialties(input)
  if (!arr.length) return fallback
  return arr.map((v) => wbsSpecialtyLabel(v)).join('、')
}

export function syncSpecialtyFields(node) {
  const specialties = normalizeSpecialties(node?.specialties ?? node?.specialty)
  node.specialties = specialties
  node.specialty = specialties.length ? specialties.join('、') : ''
  return node
}

export function isValidWbsSpecialty(value) {
  if (value == null || value === '') return true
  if (Array.isArray(value)) return value.every((v) => !v || WBS_SPECIALTY_SET.has(String(v)))
  return WBS_SPECIALTY_SET.has(String(value))
}

export function isValidWbsSpecialties(values) {
  if (!Array.isArray(values)) return values == null || values === '' || isValidWbsSpecialty(values)
  if (!values.length) return true
  return values.every((v) => v && WBS_SPECIALTY_SET.has(String(v)))
}

export function wbsSpecialtyLabel(value) {
  const hit = WBS_SPECIALTY_OPTIONS.find((o) => o.value === value)
  return hit?.label || value || '—'
}

/** 新建子节点时继承父节点专业；父节点无配置时回退默认 */
export function inheritSpecialtiesFromParent(parentNode) {
  const inherited = getEffectiveSpecialties(parentNode)
  return inherited.length ? [...inherited] : [...WBS_SPECIALTY_DEFAULTS]
}
