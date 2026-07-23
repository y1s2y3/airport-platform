/**
 * 质量验评 · 审批人配置（项目级 Mock）
 * 按参建单位/验收组岗位分类配置，均支持多人
 */
import { reactive } from 'vue'
import { nowStr } from './qmInspect.js'

/**
 * 审批岗位分类（与验评签章/签署人员对齐）
 * role.key 为配置主键；label 为展示名；hint 为补充说明
 */
export const APPROVER_ROLE_GROUPS = [
  {
    key: 'owner',
    label: '一、建设单位人员',
    roles: [
      { key: 'js_pm', label: '建设单位项目负责人', hint: '或称「项目负责人」' },
      { key: 'js_legal', label: '建设单位法定代表人', hint: '授权、签署合同；竣工验收报告' },
      { key: 'js_tech', label: '建设单位专业技术负责人', hint: '部分专项' },
    ],
  },
  {
    key: 'supervisor',
    label: '二、监理单位人员',
    roles: [
      { key: 'jl_chief', label: '总监理工程师', hint: '需加盖执业印章' },
      { key: 'jl_deputy', label: '总监理工程师代表', hint: '' },
      { key: 'jl_pro', label: '专业监理工程师', hint: '' },
      { key: 'jl_legal', label: '监理单位法定代表人', hint: '评估报告等' },
      { key: 'jl_tech', label: '监理单位技术负责人', hint: '审批监理规划' },
      { key: 'jl_site', label: '项目监理机构人员', hint: '驻场监理、监理员等，部分记录需签名' },
    ],
  },
  {
    key: 'contractor',
    label: '三、施工单位人员',
    roles: [
      { key: 'sg_pm', label: '施工单位项目负责人', hint: '项目经理，需加盖注册建造师执业章' },
      { key: 'sg_tech_corp', label: '施工单位技术负责人', hint: '企业技术负责人，需盖章' },
      { key: 'sg_tech_proj', label: '项目技术负责人', hint: '项目部' },
      { key: 'sg_worker', label: '施工员', hint: '' },
      { key: 'sg_qa', label: '质量员', hint: '或「专业质量检查员」' },
      { key: 'sg_foreman', label: '施工班组长', hint: '' },
      { key: 'sg_doc', label: '资料员', hint: '汇总表等' },
      { key: 'sg_ops', label: '测量人/记录人/检测人/试验员', hint: '具体操作人员' },
      { key: 'fb_pm', label: '专业分包单位项目负责人', hint: '' },
      { key: 'fb_tech', label: '专业分包单位技术负责人', hint: '' },
      { key: 'fb_qa_worker', label: '分包单位质量员、施工员', hint: '' },
    ],
  },
  {
    key: 'survey',
    label: '四、勘察单位人员',
    roles: [
      { key: 'kc_pm', label: '勘察项目负责人', hint: '需注册岩土工程师执业章' },
      { key: 'kc_tech', label: '勘察单位技术负责人', hint: '' },
    ],
  },
  {
    key: 'design',
    label: '五、设计单位人员',
    roles: [
      { key: 'sj_pm', label: '设计项目负责人', hint: '需注册建筑师或结构工程师执业章' },
      { key: 'sj_tech', label: '设计单位技术负责人', hint: '' },
      { key: 'sj_pro', label: '专业设计人员', hint: '交底、变更等' },
    ],
  },
  {
    key: 'accept_group',
    label: '七、验收组/专家组',
    roles: [
      { key: 'ys_leader', label: '竣工验收组组长', hint: '由建设、勘察、设计、施工、监理及专家组成' },
      { key: 'ys_deputy', label: '竣工验收组副组长', hint: '' },
      { key: 'ys_member', label: '竣工验收组组员', hint: '' },
    ],
  },
  {
    key: 'completion',
    label: '十、单位工程竣工验收及备案',
    roles: [
      { key: 'sg_legal', label: '施工单位法定代表人', hint: '竣工报告、保修书' },
      { key: 'kc_legal', label: '勘察单位法定代表人', hint: '质量检查报告' },
      { key: 'sj_legal', label: '设计单位法定代表人', hint: '质量检查报告' },
      {
        key: 'reg_practice',
        label: '注册执业人员',
        hint: '建造师、结构师、建筑师、岩土工程师等，需加盖执业印章',
      },
    ],
  },
]

/** 扁平岗位列表 */
export const APPROVER_ROLES = APPROVER_ROLE_GROUPS.flatMap((g) =>
  g.roles.map((r) => ({ ...r, groupKey: g.key, groupLabel: g.label })),
)

export const APPROVER_ROLE_KEYS = APPROVER_ROLES.map((r) => r.key)

export function getApproverRoleMeta(roleKey) {
  return APPROVER_ROLES.find((r) => r.key === roleKey) || null
}

/** @deprecated 兼容旧粗粒度节点名，映射到主要岗位 */
export const APPROVAL_NODE_ROLES = [
  '监理',
  '勘察',
  '设计',
  '建设单位',
  '指挥长',
  '业主/总监',
]

/** 各验收类型默认审批链（展示/流程用，粗粒度） */
export const APPROVAL_CHAIN_BY_TYPE = {
  1: ['监理'],
  2: ['监理'],
  3: ['监理'],
  4: ['监理', '建设单位'],
  5: ['监理', '勘察', '设计', '建设单位', '指挥长'],
  6: ['监理', '建设单位'],
  7: ['监理', '建设单位', '指挥长'],
  8: ['监理', '勘察', '设计', '建设单位', '指挥长'],
}

/** 候选人员（按岗位 roleKey） */
const CANDIDATE_SEED = [
  // 建设单位
  ['js_pm', '吴建设', '机场建设指挥部', '13800004001'],
  ['js_pm', '郑项目', '机场建设指挥部', '13800004002'],
  ['js_legal', '刘法人', '机场建设指挥部', '13800004010'],
  ['js_tech', '何专技', '机场建设指挥部', '13800004020'],
  // 监理
  ['jl_chief', '李总监', '深圳某监理有限公司', '13800001001'],
  ['jl_deputy', '王代总', '深圳某监理有限公司', '13800001002'],
  ['jl_pro', '赵专监', '深圳某监理有限公司', '13800001003'],
  ['jl_pro', '钱专监', '深圳某监理有限公司', '13800001004'],
  ['jl_legal', '孙法人', '深圳某监理有限公司', '13800001010'],
  ['jl_tech', '周技负', '深圳某监理有限公司', '13800001020'],
  ['jl_site', '吴驻监', '深圳某监理有限公司', '13800001030'],
  ['jl_site', '郑监理员', '深圳某监理有限公司', '13800001031'],
  // 施工
  ['sg_pm', '陈项目经理', '中建某局机场项目部', '13800007001'],
  ['sg_tech_corp', '褚企技', '中建某局', '13800007010'],
  ['sg_tech_proj', '卫项技', '中建某局机场项目部', '13800007020'],
  ['sg_worker', '蒋施工', '中建某局机场项目部', '13800007030'],
  ['sg_worker', '沈施工', '中建某局机场项目部', '13800007031'],
  ['sg_qa', '韩质量', '中建某局机场项目部', '13800007040'],
  ['sg_foreman', '杨班长', '中建某局机场项目部', '13800007050'],
  ['sg_doc', '朱资料', '中建某局机场项目部', '13800007060'],
  ['sg_ops', '秦测量', '中建某局机场项目部', '13800007070'],
  ['sg_ops', '尤试验', '中建某局机场项目部', '13800007071'],
  ['fb_pm', '许分包经理', '某专业分包公司', '13800007101'],
  ['fb_tech', '何分包技负', '某专业分包公司', '13800007110'],
  ['fb_qa_worker', '吕分包质量', '某专业分包公司', '13800007120'],
  ['fb_qa_worker', '施分包施工', '某专业分包公司', '13800007121'],
  // 勘察
  ['kc_pm', '张岩土', '华南勘察设计院', '13800002001'],
  ['kc_tech', '孔技负', '华南勘察设计院', '13800002010'],
  // 设计
  ['sj_pm', '曹设计', '机场设计研究院', '13800003001'],
  ['sj_tech', '严技负', '机场设计研究院', '13800003010'],
  ['sj_pro', '华结构', '机场设计研究院', '13800003020'],
  ['sj_pro', '金建筑', '机场设计研究院', '13800003021'],
  // 验收组
  ['ys_leader', '魏组长', '竣工验收组', '13800008001'],
  ['ys_deputy', '姜副组长', '竣工验收组', '13800008002'],
  ['ys_member', '谢组员', '竣工验收组', '13800008010'],
  ['ys_member', '邹组员', '竣工验收组', '13800008011'],
  ['ys_member', '喻专家', '外聘专家', '13800008012'],
  // 竣工备案相关
  ['sg_legal', '柏施工法人', '中建某局', '13800007200'],
  ['kc_legal', '水勘察法人', '华南勘察设计院', '13800002100'],
  ['sj_legal', '窦设计法人', '机场设计研究院', '13800003100'],
  ['reg_practice', '章建造师', '注册执业', '13800009001'],
  ['reg_practice', '云结构师', '注册执业', '13800009002'],
  ['reg_practice', '苏建筑师', '注册执业', '13800009003'],
  ['reg_practice', '潘岩土师', '注册执业', '13800009004'],
]

export const QM_APPROVER_CANDIDATES = CANDIDATE_SEED.map(([role, name, org, phone], i) => ({
  id: `u-${role}-${String(i + 1).padStart(2, '0')}`,
  name,
  role,
  org,
  phone,
}))

/**
 * 项目审批人配置
 * { id, project_id, role, user_ids: string[], updated_at }
 */
function seedConfig(project_id, role, user_ids) {
  return {
    id: `qac-${project_id}-${role}`,
    project_id,
    role,
    user_ids,
    updated_at: '2026-07-10 09:00:00',
  }
}

function firstCandidateIds(role, n = 1) {
  return QM_APPROVER_CANDIDATES.filter((u) => u.role === role)
    .slice(0, n)
    .map((u) => u.id)
}

export const qmApproverConfigs = reactive([
  seedConfig('p-000', 'js_pm', firstCandidateIds('js_pm', 1)),
  seedConfig('p-000', 'jl_chief', firstCandidateIds('jl_chief', 1)),
  seedConfig('p-000', 'jl_pro', firstCandidateIds('jl_pro', 2)),
  seedConfig('p-000', 'sg_pm', firstCandidateIds('sg_pm', 1)),
  seedConfig('p-000', 'sg_qa', firstCandidateIds('sg_qa', 1)),
  seedConfig('p-000', 'kc_pm', firstCandidateIds('kc_pm', 1)),
  seedConfig('p-000', 'sj_pm', firstCandidateIds('sj_pm', 1)),
  seedConfig('p-000', 'ys_leader', firstCandidateIds('ys_leader', 1)),
  seedConfig('p-000', 'ys_member', firstCandidateIds('ys_member', 2)),
])

export function candidatesByRole(role) {
  return QM_APPROVER_CANDIDATES.filter((u) => u.role === role)
}

export function resolveApproverNames(user_ids = []) {
  return user_ids
    .map((id) => QM_APPROVER_CANDIDATES.find((u) => u.id === id)?.name || id)
    .filter(Boolean)
}

export function getApproverConfig(project_id, role) {
  return qmApproverConfigs.find((c) => c.project_id === project_id && c.role === role) || null
}

/** 按分类返回配置行 */
export function listApproverConfigGroups(project_id) {
  return APPROVER_ROLE_GROUPS.map((g) => ({
    key: g.key,
    label: g.label,
    rows: g.roles.map((r) => {
      const cfg = getApproverConfig(project_id, r.key)
      const user_ids = cfg?.user_ids || []
      return {
        role: r.key,
        roleLabel: r.label,
        hint: r.hint || '',
        user_ids: [...user_ids],
        user_names: resolveApproverNames(user_ids),
        updated_at: cfg?.updated_at || '',
        config_id: cfg?.id || '',
      }
    }),
  }))
}

/** 扁平列表（兼容） */
export function listApproverConfigs(project_id) {
  return listApproverConfigGroups(project_id).flatMap((g) =>
    g.rows.map((row) => ({ ...row, groupKey: g.key, groupLabel: g.label })),
  )
}

/** 保存某项目某岗位的审批人（多人） */
export function saveApproverConfig(project_id, role, user_ids = []) {
  if (!project_id) return { ok: false, msg: '请先选择项目' }
  if (!APPROVER_ROLE_KEYS.includes(role)) return { ok: false, msg: '审批岗位不存在' }
  const ids = [...new Set((user_ids || []).filter(Boolean))]
  const invalid = ids.filter((id) => {
    const u = QM_APPROVER_CANDIDATES.find((x) => x.id === id)
    return !u || u.role !== role
  })
  if (invalid.length) return { ok: false, msg: '存在与岗位不匹配的人员' }

  let cfg = getApproverConfig(project_id, role)
  if (!cfg) {
    cfg = {
      id: `qac-${project_id}-${role}-${Date.now()}`,
      project_id,
      role,
      user_ids: ids,
      updated_at: nowStr(),
    }
    qmApproverConfigs.push(cfg)
  } else {
    cfg.user_ids = ids
    cfg.updated_at = nowStr()
  }
  return { ok: true, config: cfg }
}

/** 某粗粒度角色在哪些验收类型中出现（审批链展示用） */
export function taskTypesUsingRole(role) {
  const hits = []
  Object.entries(APPROVAL_CHAIN_BY_TYPE).forEach(([type, chain]) => {
    if (chain.includes(role)) hits.push(Number(type))
  })
  if (role === '业主/总监') hits.push(1)
  return [...new Set(hits)]
}

/**
 * 审批链粗角色 → 审批人配置岗位 keys（取已配置人员用于签章/展示）
 */
export const CHAIN_ROLE_TO_POSTS = {
  监理: ['jl_chief', 'jl_deputy', 'jl_pro', 'jl_site'],
  勘察: ['kc_pm', 'kc_tech'],
  设计: ['sj_pm', 'sj_tech', 'sj_pro'],
  建设单位: ['js_pm', 'js_tech', 'js_legal'],
  指挥长: ['ys_leader', 'ys_deputy'],
  '业主/总监': ['js_pm', 'jl_chief'],
}

/** 读取某项目某审批链节点已配置的审批人（无配置时回落该岗位默认候选人） */
export function getConfiguredApproversForChainRole(project_id, chainRole) {
  if (!project_id || !chainRole) return []
  const posts = CHAIN_ROLE_TO_POSTS[chainRole] || []
  const list = []
  const seen = new Set()
  for (const post of posts) {
    const cfg = getApproverConfig(project_id, post)
    const meta = getApproverRoleMeta(post)
    for (const uid of cfg?.user_ids || []) {
      if (seen.has(uid)) continue
      seen.add(uid)
      const user = QM_APPROVER_CANDIDATES.find((u) => u.id === uid)
      list.push({
        id: uid,
        name: user?.name || uid,
        post,
        postLabel: meta?.label || post,
        org: user?.org || '',
        fromConfig: true,
      })
    }
  }
  if (list.length) return list
  // 未配置时：取映射岗位的默认候选人，保证审批链可演示
  for (const post of posts.slice(0, 2)) {
    const meta = getApproverRoleMeta(post)
    for (const uid of firstCandidateIds(post, 1)) {
      if (seen.has(uid)) continue
      seen.add(uid)
      const user = QM_APPROVER_CANDIDATES.find((u) => u.id === uid)
      list.push({
        id: uid,
        name: user?.name || uid,
        post,
        postLabel: meta?.label || post,
        org: user?.org || '',
        fromConfig: false,
      })
    }
  }
  return list
}

/** 审批链节点是否已有可用审批人（含默认候选人） */
export function isChainRoleConfigured(project_id, chainRole) {
  return getConfiguredApproversForChainRole(project_id, chainRole).length > 0
}
