/**
 * 平台账号安全（原型 Mock）· Web 端登录与建管 APP 共用
 *
 * - 密码：修改 / 管理员重置后写入本机存储；未设置过密码的账号沿用
 *   「任意非空账号密码即可登录」的既有演示口径（改过密码的账号必须用新密码）
 * - 不提供「忘记密码」自助找回：用户登录密码由管理员在「系统管理 → 用户管理」中重置
 * - 与真实后端的差异（演示口径）：密码明文存本机、不校验账号是否存在与账号状态
 */

const STORAGE_CREDENTIALS = 'jg-account-credentials'

/** 管理员重置后的系统默认初始密码（演示值，接入后端后由服务端下发策略） */
export const DEFAULT_RESET_PASSWORD = 'Szjc@2026'

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    const data = JSON.parse(raw)
    return data == null ? fallback : data
  } catch {
    return fallback
  }
}

function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* 隐私模式等场景忽略 */
  }
}

export function normalizeAccount(account) {
  return String(account == null ? '' : account).trim()
}

export function validateAccount(account) {
  if (!normalizeAccount(account)) return { ok: false, msg: '请输入账号' }
  return { ok: true }
}

/** 新密码规则：8～20 位，须同时包含字母与数字 */
export function validatePassword(password) {
  const pwd = String(password == null ? '' : password)
  if (!pwd) return { ok: false, msg: '请输入新密码' }
  if (pwd.length < 8 || pwd.length > 20) return { ok: false, msg: '新密码需为 8～20 位' }
  if (!/[A-Za-z]/.test(pwd) || !/\d/.test(pwd)) return { ok: false, msg: '新密码需同时包含字母和数字' }
  return { ok: true }
}

function readCredentials() {
  const store = readJson(STORAGE_CREDENTIALS, {})
  return store && typeof store === 'object' ? store : {}
}

/** 该账号是否已设置过密码（修改或重置过） */
export function hasAppPassword(account) {
  const acc = normalizeAccount(account)
  if (!acc) return false
  const pwd = readCredentials()[acc]
  return typeof pwd === 'string' && pwd.length > 0
}

/**
 * 登录密码校验
 * - 已设置过密码：必须与当前密码一致
 * - 未设置过密码：沿用演示口径，任意非空密码通过
 */
export function verifyAccountPassword({ account, password }) {
  const acc = normalizeAccount(account)
  const pwd = String(password == null ? '' : password)
  if (!acc || !pwd) return { ok: false, msg: '请输入账号和密码' }
  if (!hasAppPassword(acc)) return { ok: true }
  if (readCredentials()[acc] !== pwd) return { ok: false, msg: '账号或密码不正确' }
  return { ok: true }
}

/** 写入账号密码（内部使用；对外走修改 / 管理员重置密码） */
export function setAppPassword({ account, password }) {
  const acc = normalizeAccount(account)
  if (!acc) return { ok: false, msg: '请输入账号' }
  const store = readCredentials()
  store[acc] = String(password == null ? '' : password)
  writeJson(STORAGE_CREDENTIALS, store)
  return { ok: true }
}

/**
 * 管理员重置密码：账号 → 写回系统默认初始密码
 * 不校验原密码，也不校验短信验证码（由管理员在用户管理中触发）
 * @returns {{ ok: boolean, msg?: string, defaultPassword?: string }}
 */
export function adminResetPassword({ account }) {
  const accCheck = validateAccount(account)
  if (!accCheck.ok) return accCheck
  const saved = setAppPassword({ account, password: DEFAULT_RESET_PASSWORD })
  if (!saved.ok) return saved
  return { ok: true, defaultPassword: DEFAULT_RESET_PASSWORD }
}

/**
 * 修改密码：原密码校验 → 新密码规则 → 新旧不得相同
 * @returns {{ ok: boolean, msg?: string }}
 */
export function changePassword({ account, oldPassword, newPassword }) {
  const acc = normalizeAccount(account)
  if (!acc) return { ok: false, msg: '未获取到当前账号，请重新登录' }
  const oldPwd = String(oldPassword == null ? '' : oldPassword)
  if (!oldPwd) return { ok: false, msg: '请输入原密码' }
  const verified = verifyAccountPassword({ account: acc, password: oldPwd })
  if (!verified.ok) return { ok: false, msg: '原密码不正确' }
  const pwdCheck = validatePassword(newPassword)
  if (!pwdCheck.ok) return pwdCheck
  if (String(newPassword) === oldPwd) return { ok: false, msg: '新密码不得与原密码相同' }
  const saved = setAppPassword({ account: acc, password: newPassword })
  if (!saved.ok) return saved
  return { ok: true, account: acc }
}
