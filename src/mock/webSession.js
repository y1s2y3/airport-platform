/**
 * Web 端登录会话（原型 Mock）
 *
 * 仅用于「打开平台先到登录页」的入口判断：
 * 未登录访问平台根路径 `/` 会进登录页，已登录进工作台。
 * 后台页面本身不做未登录拦截（演示口径，后台可直接访问）。
 */
import { ref } from 'vue'

const STORAGE_SESSION = 'web-login-session'

export const webLoggedIn = ref(false)
export const webLoginAccount = ref('')

export function hydrateWebSession() {
  try {
    const raw = sessionStorage.getItem(STORAGE_SESSION)
    if (!raw) return
    const data = JSON.parse(raw)
    if (data?.account) {
      webLoggedIn.value = true
      webLoginAccount.value = String(data.account)
    }
  } catch {
    /* ignore */
  }
}

export function loginWeb(account) {
  const acc = String(account == null ? '' : account).trim()
  webLoggedIn.value = true
  webLoginAccount.value = acc
  try {
    sessionStorage.setItem(STORAGE_SESSION, JSON.stringify({ account: acc, at: Date.now() }))
  } catch {
    /* ignore */
  }
  return { ok: true }
}

export function logoutWeb() {
  webLoggedIn.value = false
  webLoginAccount.value = ''
  try {
    sessionStorage.removeItem(STORAGE_SESSION)
  } catch {
    /* ignore */
  }
}
