/** 实体工程分解 / 验评目录树 · 节点/部位编码：英文+数字，1～10 位 */

export const WBS_NODE_CODE_MAX_LEN = 10
export const WBS_NODE_CODE_RE = /^[A-Za-z0-9]{1,10}$/

/** 输入过滤：仅保留英文数字，最多 10 位 */
export function normalizeWbsNodeCode(value) {
  return String(value ?? '')
    .replace(/[^A-Za-z0-9]/g, '')
    .slice(0, WBS_NODE_CODE_MAX_LEN)
}

/**
 * @returns {{ ok: true, code: string } | { ok: false, msg: string, code: string }}
 */
export function validateWbsNodeCode(value) {
  const code = normalizeWbsNodeCode(value)
  if (!code) {
    return { ok: false, msg: '请填写编码', code }
  }
  if (!WBS_NODE_CODE_RE.test(code)) {
    return { ok: false, msg: '编码须为英文或数字，最多10位', code }
  }
  return { ok: true, code }
}
