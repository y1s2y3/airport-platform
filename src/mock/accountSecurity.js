/**
 * 平台账号安全（原型 Mock）· Web 端登录与建管 APP 共用
 *
 * - 验证码：演示固定 123456，5 分钟有效，60 秒内不可重复发送
 * - 密码：修改 / 重置后写入本机存储；未设置过密码的账号沿用
 *   「任意非空账号密码即可登录」的既有演示口径（改过密码的账号必须用新密码）
 * - 与真实后端的差异（演示口径）：不校验「账号 ↔ 手机号」绑定关系，
 *   不发真实短信，不校验账号是否存在
 */

const STORAGE_CREDENTIALS = 'jg-account-credentials'
const STORAGE_SMS = 'jg-account-sms'

/** 演示验证码（真实环境由后端下发） */
export const DEMO_SMS_CODE = '123456'
/** 验证码有效期 */
export const SMS_CODE_TTL_MS = 5 * 60 * 1000
/** 验证码重发间隔 */
export const SMS_RESEND_COOLDOWN_MS = 60 * 1000

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

export function validatePhone(phone) {
  const p = String(phone == null ? '' : phone).trim()
  if (!p) return { ok: false, msg: '请输入手机号' }
  if (!/^1\d{10}$/.test(p)) return { ok: false, msg: '手机号格式不正确' }
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

/** 写入账号密码（内部使用；对外走修改 / 重置密码） */
export function setAppPassword({ account, password }) {
  const acc = normalizeAccount(account)
  if (!acc) return { ok: false, msg: '请输入账号' }
  const store = readCredentials()
  store[acc] = String(password == null ? '' : password)
  writeJson(STORAGE_CREDENTIALS, store)
  return { ok: true }
}

/** 发送短信验证码（演示：固定 123456，直接回显；校验重发倒计时） */
export function sendSmsCode({ phone }) {
  const check = validatePhone(phone)
  if (!check.ok) return check
  const p = String(phone).trim()
  const now = Date.now()
  const last = readJson(STORAGE_SMS, null)
  if (last && last.phone === p && last.nextSendAt > now) {
    return { ok: false, msg: `请 ${Math.ceil((last.nextSendAt - now) / 1000)} 秒后再获取验证码` }
  }
  const record = {
    phone: p,
    code: DEMO_SMS_CODE,
    expireAt: now + SMS_CODE_TTL_MS,
    nextSendAt: now + SMS_RESEND_COOLDOWN_MS,
    sentAt: now,
  }
  writeJson(STORAGE_SMS, record)
  return { ok: true, code: DEMO_SMS_CODE, expireAt: record.expireAt, nextSendAt: record.nextSendAt }
}

/** 剩余重发倒计时秒数（页面刷新后可恢复） */
export function smsCountdownSeconds(phone) {
  const p = String(phone == null ? '' : phone).trim()
  const last = readJson(STORAGE_SMS, null)
  if (!p || !last || last.phone !== p) return 0
  const left = Math.ceil((last.nextSendAt - Date.now()) / 1000)
  return left > 0 ? left : 0
}

export function verifySmsCode({ phone, code }) {
  const check = validatePhone(phone)
  if (!check.ok) return check
  const p = String(phone).trim()
  const c = String(code == null ? '' : code).trim()
  if (!c) return { ok: false, msg: '请输入验证码' }
  const last = readJson(STORAGE_SMS, null)
  if (!last || last.phone !== p) return { ok: false, msg: '请先获取验证码' }
  if (Date.now() > last.expireAt) return { ok: false, msg: '验证码已失效，请重新获取' }
  if (last.code !== c) return { ok: false, msg: '验证码不正确' }
  return { ok: true }
}

export function clearSmsCode() {
  try {
    localStorage.removeItem(STORAGE_SMS)
  } catch {
    /* ignore */
  }
}

/**
 * 找回密码：账号 + 手机号 + 验证码 → 设置新密码
 * @returns {{ ok: boolean, msg?: string }}
 */
export function resetPassword({ account, phone, code, newPassword }) {
  const accCheck = validateAccount(account)
  if (!accCheck.ok) return accCheck
  const smsCheck = verifySmsCode({ phone, code })
  if (!smsCheck.ok) return smsCheck
  const pwdCheck = validatePassword(newPassword)
  if (!pwdCheck.ok) return pwdCheck
  const saved = setAppPassword({ account, password: newPassword })
  if (!saved.ok) return saved
  clearSmsCode()
  return { ok: true }
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
