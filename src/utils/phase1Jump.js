import { ElMessage } from 'element-plus'
import {
  PHASE1_ORG_SOURCE,
  PHASE1_SYSTEM_NAME,
  PHASE1_LOGIN_TIP,
  buildPhase1Url,
} from '../config/phase1'
import { selectedProjectId } from '../composables/useCurrentProject'
import { HQ_SELECTION_ID } from '../config/projectOptions'
import { getProjectOrgNodeId } from '../mock/orgStructure'
import { getCurrentUserSnapshot } from '../mock/currentUser'

/**
 * 解析要传给一期系统的组织ID（传参方式见 config/phase1.js）
 * @returns {string}
 */
export function resolvePhase1OrgId() {
  const projectId = selectedProjectId.value
  const isHq = !projectId || projectId === HQ_SELECTION_ID

  if (PHASE1_ORG_SOURCE === 'project-id') {
    return isHq ? '' : projectId
  }
  if (PHASE1_ORG_SOURCE === 'project-org') {
    return isHq ? '' : getProjectOrgNodeId(projectId)
  }
  // 'user-org'（缺省）：当前登录用户所属组织
  const snapshot = getCurrentUserSnapshot(projectId)
  return snapshot?.orgId || ''
}

/**
 * 生成某条一期菜单项的完整跳转地址
 * @param {{ hashPath?: string }} item
 * @returns {string}
 */
export function buildPhase1UrlForItem(item = {}) {
  return buildPhase1Url(item.hashPath, { orgId: resolvePhase1OrgId() })
}

/**
 * 打开一期页面（新窗口）。被浏览器拦截时返回 false，由占位页兜底。
 * @param {{ label?: string, hashPath?: string }} item
 * @param {{ silent?: boolean }} [options]
 * @returns {boolean}
 */
export function openPhase1ByItem(item = {}, options = {}) {
  const url = buildPhase1UrlForItem(item)
  if (!item.hashPath) {
    ElMessage.warning('未配置一期页面地址')
    return false
  }
  const win = window.open(url, '_blank', 'noopener,noreferrer')
  if (!options.silent) {
    ElMessage.success(`正在打开${PHASE1_SYSTEM_NAME}「${item.label || '页面'}」`)
    if (!win) ElMessage.info(PHASE1_LOGIN_TIP)
  }
  return Boolean(win)
}

/**
 * 直接按一期 hash 路径打开（占位页按钮使用）
 * @param {string} hashPath
 * @param {string} [label]
 */
export function openPhase1ByHashPath(hashPath, label = '') {
  return openPhase1ByItem({ hashPath, label })
}

export { PHASE1_LOGIN_TIP, PHASE1_SYSTEM_NAME }
