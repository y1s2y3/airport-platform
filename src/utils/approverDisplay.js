import { findTreeNode, unifiedOrgTree } from '../mock/orgStructure'
import { getPosition } from '../mock/positions'

/**
 * 审批人下拉/详情展示：姓名（组织-岗位）
 * 例：张三（T2空侧捷运线-安全总监）
 */
export function formatApproverOptionLabel(name, orgName, postLabel) {
  const n = String(name || '').trim()
  const org = String(orgName || '').trim()
  const post = String(postLabel || '').trim()
  const orgPost = [org, post].filter(Boolean).join('-')
  if (!n && !orgPost) return '—'
  if (!n) return orgPost
  if (!orgPost) return n
  return `${n}（${orgPost}）`
}

export function formatApproverCandidateLabel(candidate) {
  if (!candidate) return '—'
  const org =
    candidate.orgName ||
    candidate.org ||
    candidate.org_name ||
    candidate.organization ||
    ''
  const post =
    candidate.postLabel ||
    candidate.post_label ||
    candidate.position ||
    candidate.positionLabels ||
    ''
  return formatApproverOptionLabel(candidate.name, org, post)
}

export function resolveSysUserOrgName(orgId) {
  if (!orgId) return ''
  const node = findTreeNode(unifiedOrgTree.value, orgId)
  return node?.label || node?.rawLabel || ''
}

export function resolveSysUserPostLabel(positionIds) {
  const labels = (positionIds || [])
    .map((id) => getPosition(id)?.name)
    .filter(Boolean)
  return labels.join('、')
}

/** 系统用户（sysUsers）审批候选人 enrich */
export function enrichSysUserApproverCandidate(user) {
  if (!user) return null
  const orgName = resolveSysUserOrgName(user.orgId)
  const postLabel = resolveSysUserPostLabel(user.positions)
  return {
    userId: user.id,
    name: user.name,
    phone: user.phone || '',
    orgName,
    postLabel,
    optionLabel: formatApproverOptionLabel(user.name, orgName, postLabel),
  }
}

export function formatApproverByUserId(userId, findUser, fallbackName = '') {
  const user = findUser?.(userId)
  if (user) {
    if (user.optionLabel) return user.optionLabel
    if (user.org || user.post_label) {
      return formatApproverCandidateLabel(user)
    }
    if (user.orgId !== undefined) {
      return enrichSysUserApproverCandidate(user)?.optionLabel || user.name
    }
  }
  return fallbackName || '—'
}
