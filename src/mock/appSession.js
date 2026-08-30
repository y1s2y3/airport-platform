/**
 * 建管 APP 登录会话（原型 Mock）
 */
import { ref, computed } from 'vue'
import { getCurrentUserSnapshot } from './currentUser.js'
import { getOrgInfo, getOrgMembers } from './orgStructure.js'
import { selectedProjectId } from '../composables/useCurrentProject'
import { COC_PROJECT_OPTIONS } from '../config/projectOptions.js'

const STORAGE_SESSION = 'jg-app-session'
const STORAGE_REMEMBER = 'jg-app-remember'

export const appLoggedIn = ref(false)
export const appLoginAccount = ref('')
/** 业务功能页当前选中的组织 id */
export const appSelectedOrgId = ref('')

const STORAGE_ORG = 'jg-app-selected-org'

function readSession() {
  try {
    const raw = sessionStorage.getItem(STORAGE_SESSION)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function hydrateAppSession() {
  const s = readSession()
  if (s?.account) {
    appLoggedIn.value = true
    appLoginAccount.value = s.account
  }
  try {
    const orgId = sessionStorage.getItem(STORAGE_ORG)
    if (orgId) appSelectedOrgId.value = orgId
  } catch {
    /* ignore */
  }
}

export function getRememberedLogin() {
  try {
    const raw = localStorage.getItem(STORAGE_REMEMBER)
    if (!raw) return { account: '', password: '', remember: false }
    const data = JSON.parse(raw)
    return {
      account: data.account || '',
      password: data.password || '',
      remember: !!data.remember,
    }
  } catch {
    return { account: '', password: '', remember: false }
  }
}

export function loginApp({ account, password, remember }) {
  const acc = String(account || '').trim()
  const pwd = String(password || '')
  if (!acc || !pwd) return { ok: false, msg: '请输入账号和密码' }
  appLoggedIn.value = true
  appLoginAccount.value = acc
  sessionStorage.setItem(STORAGE_SESSION, JSON.stringify({ account: acc, at: Date.now() }))
  if (!appSelectedOrgId.value) {
    const orgs = listAppUserOrgs()
    if (orgs[0]) setAppSelectedOrgId(orgs[0].id)
  }
  if (remember) {
    localStorage.setItem(
      STORAGE_REMEMBER,
      JSON.stringify({ account: acc, password: pwd, remember: true }),
    )
  } else {
    localStorage.removeItem(STORAGE_REMEMBER)
  }
  return { ok: true }
}

export function logoutApp() {
  appLoggedIn.value = false
  appLoginAccount.value = ''
  appSelectedOrgId.value = ''
  sessionStorage.removeItem(STORAGE_SESSION)
  sessionStorage.removeItem(STORAGE_ORG)
}

/**
 * 用户具备的组织列表（演示：当前用户组织 + 若干项目部）
 * @returns {{ id: string, orgName: string, position: string }[]}
 */
export function listAppUserOrgs() {
  const snap = getCurrentUserSnapshot(selectedProjectId.value)
  const orgId = snap.orgId
  const members = orgId ? getOrgMembers(orgId, false) : []
  const self =
    members.find((m) => m.id === snap.id || m.loginAccount === snap.loginAccount) ||
    members[0] ||
    null
  const position = self?.position || '项目经理岗'
  const list = []
  const seen = new Set()

  const pushOrg = (id, orgName, pos = position) => {
    const key = String(id || orgName)
    if (!key || seen.has(key)) return
    seen.add(key)
    list.push({ id: key, orgName: orgName || '—', position: pos })
  }

  const orgInfo = orgId ? getOrgInfo(orgId) : null
  if (orgInfo) {
    pushOrg(orgId, orgInfo.orgName || orgInfo.orgPath || '组织', position)
  }

  for (const p of COC_PROJECT_OPTIONS.slice(0, 6)) {
    pushOrg(`proj-${p.id}`, p.label, `${p.label}综合岗`)
  }

  if (!list.length) {
    pushOrg('hq-default', '深圳机场扩建工程指挥部', '综合岗')
  }
  return list
}

export function setAppSelectedOrgId(orgId) {
  const list = listAppUserOrgs()
  const hit = list.find((o) => o.id === orgId) || list[0]
  if (!hit) return
  appSelectedOrgId.value = hit.id
  sessionStorage.setItem(STORAGE_ORG, hit.id)
}

export function getAppSelectedOrg() {
  const list = listAppUserOrgs()
  const id = appSelectedOrgId.value
  const hit = list.find((o) => o.id === id)
  if (hit) return hit
  if (list[0]) {
    if (!appSelectedOrgId.value) setAppSelectedOrgId(list[0].id)
    return list[0]
  }
  return { id: '', orgName: '—', position: '—' }
}

/** 我的：头像/姓名/手机/组织岗位列表 */
export function getAppMineProfile() {
  const snap = getCurrentUserSnapshot(selectedProjectId.value)
  const orgId = snap.orgId
  const members = orgId ? getOrgMembers(orgId, false) : []
  const self =
    members.find((m) => m.id === snap.id || m.loginAccount === snap.loginAccount) ||
    members[0] ||
    null
  const orgs = listAppUserOrgs()
  return {
    avatarText: String(snap.name || '用').slice(0, 1),
    name: snap.name || '演示用户',
    phone: self?.phone || '13800138000',
    account: appLoginAccount.value || snap.loginAccount || 'demo',
    orgs,
  }
}

export function useAppSession() {
  hydrateAppSession()
  return {
    appLoggedIn: computed(() => appLoggedIn.value),
    appLoginAccount: computed(() => appLoginAccount.value),
    appSelectedOrgId: computed(() => appSelectedOrgId.value),
    loginApp,
    logoutApp,
    getRememberedLogin,
    getAppMineProfile,
    listAppUserOrgs,
    setAppSelectedOrgId,
    getAppSelectedOrg,
  }
}

hydrateAppSession()
