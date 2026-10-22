/**
 * 一期系统（深圳机场工程项目管理系统）页面集成配置
 *
 * 本期范围：**只做页面跳转入口**——二期侧栏登记一期功能，点击后新窗口打开一期对应页面；
 * 不做业务逻辑/数据/审批集成，不复制一期页面。
 *
 * 一期地址：https://bim.szairport.com:58002（hash 路由 SPA，支持深链直达）
 * 登录：一期为双因子（账号密码 + 手机短信验证码），跳转后若未登录会落到一期登录页，
 *       同浏览器登录一次后所有跳转共享登录态。
 */

/** 一期系统基址（不含末尾斜杠） */
export const PHASE1_BASE_URL = 'https://bim.szairport.com:58002'

/**
 * 组织ID 传递方式（待与一期确认后只需改这里）
 * - param：参数名
 * - source：取值来源
 *   'user-org'    → 当前登录用户的组织ID（指挥部 org-hq / 项目部 org-proj-<projectId>-dept-0）
 *   'project-org' → 当前所选项目对应的组织节点ID（org-proj-<projectId>），指挥部选择时为空
 *   'project-id'  → 当前所选项目ID（p-xxx），指挥部选择时为空
 * - position：参数放在 `#` 之前（search）还是哈希路由查询（hash），或两处都放（both）
 */
export const PHASE1_ORG_PARAM = 'orgId'
export const PHASE1_ORG_SOURCE = 'user-org'
export const PHASE1_ORG_POSITION = 'both'

/**
 * 追加组织ID后的完整跳转地址
 * @param {string} hashPath 一期 hash 内路径，如 '/alteration/ledger'
 * @param {{ orgId?: string }} [options]
 * @returns {string}
 */
export function buildPhase1Url(hashPath, options = {}) {
  const path = String(hashPath || '').trim()
  const hash = path.startsWith('/') ? path : `/${path}`
  const orgId = String(options.orgId || '').trim()
  const query = orgId ? `${PHASE1_ORG_PARAM}=${encodeURIComponent(orgId)}` : ''
  const position = PHASE1_ORG_POSITION

  if (!query) return `${PHASE1_BASE_URL}/#${hash}`
  if (position === 'search') return `${PHASE1_BASE_URL}/?${query}#${hash}`
  if (position === 'hash') return `${PHASE1_BASE_URL}/#${hash}?${query}`
  return `${PHASE1_BASE_URL}/?${query}#${hash}?${query}`
}

/** 一期系统名称（提示文案用） */
export const PHASE1_SYSTEM_NAME = '一期工程管理系统'

/** 首次跳转提示（跨域无法探测一期登录态，只能前置文案提示） */
export const PHASE1_LOGIN_TIP = '即将打开一期系统：若尚未登录，需使用一期账号 + 短信验证码登录（同浏览器登录一次后免重复登录）'
