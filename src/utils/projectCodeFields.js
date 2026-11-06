/**
 * 项目基础信息 · 项目级代号（需求变更 CR-07）
 * - 建设项目代号：4 位大写字母或数字，全系统唯一（原「工程代号」更名）
 * - 单项工程代号：2 位数字
 * - 专业工程代号：4 位大写字母或数字
 * 三者与「建设单位代号（固定 SZJC）」共同构成向档案系统传输的编码前缀。
 */

export const OWNER_UNIT_CODE = 'SZJC'
export const CONSTRUCTION_PROJECT_CODE_LEN = 4
export const SINGLE_PROJECT_CODE_LEN = 2
export const SPECIALTY_PROJECT_CODE_LEN = 4

const ALNUM_RE = /^[A-Z0-9]+$/
const DIGITS_RE = /^\d+$/

/** 仅保留英文数字并转大写，最长 maxLen */
export function normalizeAlnumCode(value, maxLen = CONSTRUCTION_PROJECT_CODE_LEN) {
  return String(value ?? '')
    .replace(/[^A-Za-z0-9]/g, '')
    .toUpperCase()
    .slice(0, maxLen)
}

/** 仅保留数字，最长 maxLen */
export function normalizeDigitCode(value, maxLen = SINGLE_PROJECT_CODE_LEN) {
  return String(value ?? '')
    .replace(/\D/g, '')
    .slice(0, maxLen)
}

export function normalizeConstructionProjectCode(value) {
  return normalizeAlnumCode(value, CONSTRUCTION_PROJECT_CODE_LEN)
}

export function normalizeSingleProjectCode(value) {
  return normalizeDigitCode(value, SINGLE_PROJECT_CODE_LEN)
}

export function normalizeSpecialtyProjectCode(value) {
  return normalizeAlnumCode(value, SPECIALTY_PROJECT_CODE_LEN)
}

/** @returns {{ ok: boolean, code: string, msg: string }} */
export function validateConstructionProjectCode(value) {
  const code = normalizeConstructionProjectCode(value)
  if (!code) return { ok: false, code, msg: '请填写建设项目代号' }
  if (code.length !== CONSTRUCTION_PROJECT_CODE_LEN || !ALNUM_RE.test(code)) {
    return { ok: false, code, msg: '建设项目代号须为4位大写字母或数字' }
  }
  return { ok: true, code, msg: '' }
}

export function validateSingleProjectCode(value) {
  const code = normalizeSingleProjectCode(value)
  if (!code) return { ok: false, code, msg: '请填写单项工程代号' }
  if (code.length !== SINGLE_PROJECT_CODE_LEN || !DIGITS_RE.test(code)) {
    return { ok: false, code, msg: '单项工程代号须为2位数字' }
  }
  return { ok: true, code, msg: '' }
}

export function validateSpecialtyProjectCode(value) {
  const code = normalizeSpecialtyProjectCode(value)
  if (!code) return { ok: false, code, msg: '请填写专业工程代号' }
  if (code.length !== SPECIALTY_PROJECT_CODE_LEN || !ALNUM_RE.test(code)) {
    return { ok: false, code, msg: '专业工程代号须为4位大写字母或数字' }
  }
  return { ok: true, code, msg: '' }
}
