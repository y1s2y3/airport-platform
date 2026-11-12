/**
 * 实体工程分解 / 验评目录树 · 节点编码
 *
 * 需求变更 CR-07：单位工程～分项工程的代号在「实体工程分解」维护，且为纯数字、定长：
 *   1 单位工程 4 位 / 2 子单位工程 4 位 / 3 分部工程 2 位 / 4 子分部工程 2 位 / 5 分项工程 2 位
 * 其余类型（7 专项、9 实体分类）与「施工部位」编码沿用原规则：英文+数字，1～10 位。
 * 检验批（6）按 CR-05（2026-11-12）：英文 + 数字 + 符号，1～20 位。
 */

export const WBS_NODE_CODE_MAX_LEN = 10
export const WBS_NODE_CODE_RE = /^[A-Za-z0-9]{1,10}$/
export const WBS_ENTITY_CODE_DIGITS_RE = /^\d+$/
/** 检验批编码（英文+数字+符号，1～20 位，不允许空白与中文） */
export const WBS_INSPECTION_CODE_MAX_LEN = 20
export const WBS_INSPECTION_CODE_RE = /^[\x21-\x7E]{1,20}$/

/** 单位工程～分项工程的编码位数（纯数字） */
export const WBS_ENTITY_CODE_SPEC = {
  1: { len: 4, label: '单位工程代号' },
  2: { len: 4, label: '子单位工程代号' },
  3: { len: 2, label: '分部工程代号' },
  4: { len: 2, label: '子分部工程代号' },
  5: { len: 2, label: '分项工程代号' },
}

/** 取实体工程分解节点类型的编码规则；非单位～分项返回 null */
export function wbsEntityCodeSpec(nodeType) {
  if (nodeType === null || nodeType === undefined || nodeType === '') return null
  return WBS_ENTITY_CODE_SPEC[Number(nodeType)] || null
}

/** 输入过滤：单位～分项仅保留数字并截断到定长；检验批保留 ASCII 可见字符最多 20 位；其它类型保留英文数字最多 10 位 */
export function normalizeWbsNodeCode(value, nodeType) {
  const spec = wbsEntityCodeSpec(nodeType)
  if (spec) {
    return String(value ?? '')
      .replace(/\D/g, '')
      .slice(0, spec.len)
  }
  if (Number(nodeType) === 6) {
    return String(value ?? '')
      .replace(/[^\x21-\x7E]/g, '')
      .slice(0, WBS_INSPECTION_CODE_MAX_LEN)
  }
  return String(value ?? '')
    .replace(/[^A-Za-z0-9]/g, '')
    .slice(0, WBS_NODE_CODE_MAX_LEN)
}

/**
 * @returns {{ ok: true, code: string } | { ok: false, msg: string, code: string }}
 */
export function validateWbsNodeCode(value, nodeType) {
  const spec = wbsEntityCodeSpec(nodeType)
  if (spec) {
    const code = normalizeWbsNodeCode(value, nodeType)
    if (!code) {
      return { ok: false, msg: `请填写${spec.label}`, code }
    }
    if (!WBS_ENTITY_CODE_DIGITS_RE.test(code) || code.length !== spec.len) {
      return { ok: false, msg: `${spec.label}须为${spec.len}位数字`, code }
    }
    return { ok: true, code }
  }
  if (Number(nodeType) === 6) {
    const code = normalizeWbsNodeCode(value, 6)
    if (!code) {
      return { ok: false, msg: '请填写检验批代号', code }
    }
    if (!WBS_INSPECTION_CODE_RE.test(code)) {
      return { ok: false, msg: '检验批代号须为英文、数字或符号，最多20位', code }
    }
    return { ok: true, code }
  }
  const code = normalizeWbsNodeCode(value, nodeType)
  if (!code) {
    return { ok: false, msg: '请填写编码', code }
  }
  if (!WBS_NODE_CODE_RE.test(code)) {
    return { ok: false, msg: '编码须为英文或数字，最多10位', code }
  }
  return { ok: true, code }
}
