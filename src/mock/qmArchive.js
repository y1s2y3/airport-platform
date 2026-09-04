/**
 * 质量验评 · 档案域 Mock — 对齐 data-model-for-验评 V2.3.1
 * 实体：ARCHIVE_FORM_INSTANCE / ARCHIVE_APPROVAL_SYNC / PROJECT_SEAL_USER / 节点级档案文件配置
 * 口径：C1 登记=用户主动行为；C2 节点配置了需填报档案文件才拦截；C6 通过前实时校验档案签章；
 *      C7 状态一律以档案为准（退回先写档案再同步回来）；D2 审批链登记时快照锁定；D6 配置源头在档案侧
 */
import { reactive } from 'vue'
import { approvalRecords, nowStr, wbsNodes } from './qmInspect.js'

/** 档案文档状态（form_status）— 与 §4.7 关联档案文档状态对齐 */
export const ARCHIVE_FORM_STATUS = {
  0: '填报中',
  1: '已提交',
  2: '已办结',
  3: '退回待补资料',
  4: '可复验',
  5: '已关闭',
}

/** 档案签章状态（sign_status） */
export const ARCHIVE_SIGN_STATUS = {
  0: '未签章',
  1: '部分签章',
  2: '已签章',
}

/** 同步来源（last_sync_source） */
export const SYNC_SOURCE_LABEL = {
  manual: '手动刷新',
  timer: '定时回传',
  push: '档案回写',
}

/**
 * 档案侧审批链（按 task_type）— 审批链源头在档案系统，本系统不本地配置
 * task_type 9/10 为历史「容器汇总」类型，现实体/专项分类节点均不可发起，链仅保留兼容
 */
export const ARCHIVE_CHAIN_BY_TYPE = {
  1: ['监理'],
  2: ['监理'],
  3: ['监理'],
  4: ['监理', '建设单位'],
  5: ['监理', '勘察', '设计', '建设单位', '指挥长'],
  /** 专项验收演示：档案侧未回传审批节点 → 走本系统手动流程配置 */
  6: [],
  7: ['监理', '建设单位', '指挥长'],
  8: ['监理', '勘察', '设计', '建设单位', '指挥长'],
  9: ['监理', '建设单位'],
  10: ['监理', '建设单位'],
}

/**
 * 节点级档案文件配置（D6：源头在档案侧，本系统只读同步）
 * key = node_type；docs 为该节点任务需填报的档案文件清单；空数组 = 不拦截（C2）
 */
export const nodeArchiveDocConfigs = reactive([
  { node_type: 6, docs: ['检验批质量验收记录', '隐蔽工程验收记录（隐蔽时）'] },
  { node_type: 5, docs: ['分项工程质量验收记录'] },
  { node_type: 4, docs: ['子分部工程质量验收记录'] },
  { node_type: 3, docs: ['分部工程质量验收记录'] },
  { node_type: 2, docs: ['子单位工程质量验收记录'] },
  { node_type: 1, docs: ['单位工程质量竣工验收记录', '单位工程资料核查记录'] },
  { node_type: 7, docs: ['专项验收报告', '专项法定检测/批复文件'] },
  { node_type: 8, docs: ['竣工验收报告', '竣工资料全套目录'] },
  // node_type 9「实体工程验收」、10「专项验收」仅为目录分类，不发起验收，无档案拦截清单
  { node_type: 9, docs: [] },
  { node_type: 10, docs: [] },
])

/**
 * ARCHIVE_FORM_INSTANCE — 一任务一档案文档（Q12）
 * signed_roles：档案侧已签章角色（C6 校验依据；演示中由档案面板模拟档案系统内签章）
 */
export const archiveFormInstances = reactive([
  {
    id: 'afi-001',
    task_id: 'tk-001',
    archive_doc_id: 'DA-2026-0101',
    archive_url_web: 'https://archive.demo.local/web/doc/DA-2026-0101',
    archive_url_h5: 'https://archive.demo.local/h5/doc/DA-2026-0101',
    form_status: 1,
    sign_status: 0,
    signed_roles: [],
    last_sync_at: '2026-07-15 10:35:00',
    last_sync_source: 'manual',
  },
  {
    id: 'afi-003',
    task_id: 'tk-003',
    archive_doc_id: 'DA-2026-0103',
    archive_url_web: 'https://archive.demo.local/web/doc/DA-2026-0103',
    archive_url_h5: 'https://archive.demo.local/h5/doc/DA-2026-0103',
    form_status: 3,
    sign_status: 0,
    signed_roles: [],
    last_sync_at: '2026-07-12 17:05:00',
    last_sync_source: 'push',
  },
  {
    id: 'afi-004',
    task_id: 'tk-004',
    archive_doc_id: 'DA-2026-0104',
    archive_url_web: 'https://archive.demo.local/web/doc/DA-2026-0104',
    archive_url_h5: 'https://archive.demo.local/h5/doc/DA-2026-0104',
    form_status: 3,
    sign_status: 0,
    signed_roles: [],
    last_sync_at: '2026-07-13 10:05:00',
    last_sync_source: 'push',
  },
  {
    id: 'afi-008',
    task_id: 'tk-008',
    archive_doc_id: 'DA-2026-0108',
    archive_url_web: 'https://archive.demo.local/web/doc/DA-2026-0108',
    archive_url_h5: 'https://archive.demo.local/h5/doc/DA-2026-0108',
    form_status: 2,
    sign_status: 2,
    signed_roles: ['监理', '建设单位'],
    last_sync_at: '2026-07-19 16:05:00',
    last_sync_source: 'timer',
  },
  {
    id: 'afi-u3',
    task_id: 'tk-unit-3',
    archive_doc_id: 'DA-2026-0203',
    archive_url_web: 'https://archive.demo.local/web/doc/DA-2026-0203',
    archive_url_h5: 'https://archive.demo.local/h5/doc/DA-2026-0203',
    form_status: 2,
    sign_status: 2,
    signed_roles: ['监理', '勘察', '设计', '建设单位', '指挥长'],
    last_sync_at: '2026-07-12 17:05:00',
    last_sync_source: 'timer',
  },
])

/** ARCHIVE_APPROVAL_SYNC — 审批链快照（D2：登记时锁定，后续人员变更不影响在办任务） */
export const archiveApprovalSyncs = reactive([
  {
    id: 'aas-001',
    task_id: 'tk-001',
    chain_snapshot: ['监理'],
    synced_at: '2026-07-15 10:35:00',
    sync_source: 'manual',
  },
  {
    id: 'aas-003',
    task_id: 'tk-003',
    chain_snapshot: ['监理'],
    synced_at: '2026-07-11 14:05:00',
    sync_source: 'manual',
  },
  {
    id: 'aas-004',
    task_id: 'tk-004',
    chain_snapshot: ['监理'],
    synced_at: '2026-07-08 09:05:00',
    sync_source: 'manual',
  },
  {
    id: 'aas-008',
    task_id: 'tk-008',
    chain_snapshot: ['监理', '建设单位'],
    synced_at: '2026-07-18 10:05:00',
    sync_source: 'manual',
  },
  {
    id: 'aas-u3',
    task_id: 'tk-unit-3',
    chain_snapshot: ['监理', '勘察', '设计', '建设单位', '指挥长'],
    synced_at: '2026-07-10 09:05:00',
    sync_source: 'manual',
  },
])

/** PROJECT_SEAL_USER — 项目用章人（Q17：保存即下传档案系统） */
export const projectSealUsers = reactive([
  {
    id: 'psu-001',
    project_id: 'p-000',
    user_id: 'u-pm-02',
    user_name: '陈项目经理',
    post_label: '项目经理',
    phone: '13800007001',
    status: 1,
    pushed_at: '2026-07-05 09:30:00',
    remark: '施工单位用章人',
  },
  {
    id: 'psu-002',
    project_id: 'p-000',
    user_id: 'u-jl-01',
    user_name: '李总监',
    post_label: '总监理工程师',
    phone: '13800001001',
    status: 1,
    pushed_at: '2026-07-05 09:35:00',
    remark: '监理单位用章人（总监执业章）',
  },
])

export const SEAL_USER_STATUS = { 0: '已停用', 1: '已下传' }

/* ———————————————————— 查询 ———————————————————— */

export function getArchiveInstance(task_id) {
  return archiveFormInstances.find((i) => i.task_id === task_id) || null
}

export function getArchiveSync(task_id) {
  return archiveApprovalSyncs.find((s) => s.task_id === task_id) || null
}

/**
 * 档案侧实际回传的审批节点（不含本地叠加）。
 * 有同步记录 → 以 chain_snapshot 为准（可为空，不再回落类型默认）；
 * 无同步记录 → 读 ARCHIVE_CHAIN_BY_TYPE（档案侧「当前配置」，可为 []）。
 */
export function getArchiveReturnedChain(task) {
  if (!task) return []
  const sync = getArchiveSync(task.id)
  if (sync) return [...(sync.chain_snapshot || [])]
  return [...(ARCHIVE_CHAIN_BY_TYPE[task.task_type] || [])]
}

/** 档案未回传审批节点 → 需本系统手动配置审批流程 */
export function needsManualApprovalFlow(task) {
  return getArchiveReturnedChain(task).length === 0
}

/**
 * 任务审批链（D2）：档案回传非空时用回传链；空时由调用方改读手动配置。
 */
export function getArchiveChain(task) {
  return getArchiveReturnedChain(task)
}

/** 任务所属节点需填报的档案文件清单（C2 拦截依据；空 = 不拦截） */
export function nodeRequiredArchiveDocs(task) {
  if (!task) return []
  const node = wbsNodes.find((n) => n.id === task.wbs_node_id)
  const node_type = node?.node_type
  const cfg = nodeArchiveDocConfigs.find((c) => c.node_type === node_type)
  return cfg?.docs || []
}

/**
 * C2 节点级档案拦截（提交/通过前）。
 *
 * Demo / 当前实现口径（刻意简化，勿当生产完备）：
 * - **只认「已登记」**：存在 ARCHIVE_FORM_INSTANCE（有档案文档号）即放行；
 * - **不校验**表格填报完成度（form_status）、签章状态、隐蔽相关子项是否齐套。
 * - 隐蔽工程（is_hidden_work）仅任务标记，不参与本拦截裁剪。
 *
 * 正式对接档案系统时，应改为：登记 + 表单达到约定状态（如已提交）再放行，
 * 并按节点/隐蔽标记校验必填档案子项。
 */
export function checkArchiveBlock(task) {
  const docs = nodeRequiredArchiveDocs(task)
  if (!docs.length) return { blocked: false, docs: [] }
  const inst = getArchiveInstance(task.id)
  if (inst) return { blocked: false, docs }
  return {
    blocked: true,
    docs,
    msg: `当前节点需填报档案文件（${docs.join('、')}），请先在「档案」区块完成档案数据登记`,
  }
}

/* ———————————————————— C1 登记（用户主动行为） ———————————————————— */

/**
 * 去档案系统登记数据（C1）：用户在档案区块主动触发
 * 动作：档案侧建档 → 生成档案文档号与嵌入地址 → 同步审批链并锁定快照（D2）
 * 草稿（is_draft=1）也可登记，互不影响（C1）
 */
export function registerArchiveDoc(task, { operator_id = 'u-sg-01', sync_source = 'manual' } = {}) {
  if (!task) return { ok: false, msg: '任务不存在' }
  const exist = getArchiveInstance(task.id)
  if (exist) return { ok: false, msg: '该任务已登记档案数据（一任务一档案文档）' }

  const seq = String(archiveFormInstances.length + 101).padStart(4, '0')
  const docNo = `DA-2026-${seq}`
  const now = nowStr()
  const inst = {
    id: `afi-${Date.now()}`,
    task_id: task.id,
    archive_doc_id: docNo,
    archive_url_web: `https://archive.demo.local/web/doc/${docNo}`,
    archive_url_h5: `https://archive.demo.local/h5/doc/${docNo}`,
    form_status: 0,
    sign_status: 0,
    signed_roles: [],
    last_sync_at: now,
    last_sync_source: sync_source,
  }
  archiveFormInstances.push(inst)

  // 与档案侧当前配置一致；专项等类型可为 []（无回传节点 → 手动流程）
  const chain = [...(ARCHIVE_CHAIN_BY_TYPE[task.task_type] || [])]
  archiveApprovalSyncs.push({
    id: `aas-${Date.now()}`,
    task_id: task.id,
    chain_snapshot: chain,
    synced_at: now,
    sync_source,
  })

  task.archive_instance_id = inst.id
  task.archive_status = 1
  task.updated_at = now
  void operator_id
  return { ok: true, instance: inst }
}

/** D1 状态回传（慢策略：档案系统先成功，本系统靠定时/手动刷新拉回；演示为手动刷新） */
export function pullArchiveStatus(task) {
  const inst = getArchiveInstance(task.id)
  if (!inst) return { ok: false, msg: '尚未登记档案数据，无档案状态可同步' }
  inst.last_sync_at = nowStr()
  inst.last_sync_source = 'manual'
  task.updated_at = nowStr()
  return { ok: true, instance: inst }
}

/* ———————————————————— 档案侧动作（演示档案系统内行为） ———————————————————— */

/** 模拟档案侧签章：signed_roles 追加角色，全链签完 sign_status=2 */
export function archiveSign(task, role) {
  const inst = getArchiveInstance(task.id)
  if (!inst) return { ok: false, msg: '尚未登记档案数据' }
  const chain = getArchiveChain(task)
  if (!chain.includes(role)) return { ok: false, msg: `「${role}」不在本任务审批链内` }
  if (!inst.signed_roles.includes(role)) inst.signed_roles.push(role)
  inst.sign_status = inst.signed_roles.length >= chain.length ? 2 : 1
  if (inst.sign_status === 2 && inst.form_status === 1) inst.form_status = 2
  inst.last_sync_at = nowStr()
  inst.last_sync_source = 'push'
  return { ok: true, instance: inst }
}

/** C6 通过前实时校验：档案该级已签章，否则不让过 */
export function realtimeCheckArchiveSign(task, role) {
  const block = checkArchiveBlock(task)
  if (block.blocked) return { ok: false, msg: block.msg }
  const inst = getArchiveInstance(task.id)
  if (!inst) return { ok: true } // 节点无档案文件配置：不强制（C2 豁免）
  if (!inst.signed_roles.includes(role)) {
    return {
      ok: false,
      msg: `档案侧「${role}」尚未签章（档案文档 ${inst.archive_doc_id}），请在档案系统完成签章后再点通过`,
    }
  }
  return { ok: true }
}

/** C7 退回先写档案：本系统退回动作先落档案（退回待补资料），再同步回本系统 */
export function archiveWriteReject(task, { operator_role = '监理' } = {}) {
  const inst = getArchiveInstance(task.id)
  if (!inst) return { ok: true } // 无实例：节点未配置档案文件，仅本地退回
  inst.form_status = 3
  // 驳回级之后的签章在档案侧作废，保留已签部分
  inst.signed_roles = inst.signed_roles.filter(
    (r) => getArchiveChain(task).indexOf(r) < getArchiveChain(task).indexOf(operator_role),
  )
  inst.sign_status = inst.signed_roles.length ? 1 : 0
  inst.last_sync_at = nowStr()
  inst.last_sync_source = 'push'
  return { ok: true, instance: inst }
}

/** 整改提交复验：档案文档置「可复验」（§4.7） */
export function archiveWriteReinspect(task) {
  const inst = getArchiveInstance(task.id)
  if (!inst) return { ok: true }
  inst.form_status = 4
  inst.last_sync_at = nowStr()
  inst.last_sync_source = 'push'
  return { ok: true }
}

/** 办结/复验通过：档案文档置「已办结/已关闭」 */
export function archiveWriteFinish(task, { closed = false } = {}) {
  const inst = getArchiveInstance(task.id)
  if (!inst) return { ok: true }
  inst.form_status = closed ? 5 : 2
  inst.last_sync_at = nowStr()
  inst.last_sync_source = 'push'
  task.archive_status = 2
  task.archive_pkg_no = inst.archive_doc_id
  return { ok: true }
}

/* ———————————————————— 项目用章人（保存即下传） ———————————————————— */

export function listSealUsers(project_id) {
  if (!project_id) return [...projectSealUsers]
  return projectSealUsers.filter((u) => u.project_id === project_id)
}

/** 保存用章人（新增/编辑）→ 保存即下传档案系统（status=1，pushed_at=保存时间） */
export function saveSealUser(payload, id = '') {
  if (!payload.project_id) return { ok: false, msg: '请先选择项目' }
  if (!payload.user_id?.trim() && !payload.user_name?.trim()) {
    return { ok: false, msg: '请选择用章人' }
  }
  if (!payload.user_name?.trim()) return { ok: false, msg: '用章人姓名必填' }
  const userId = String(payload.user_id || '').trim()
  if (userId) {
    const dup = projectSealUsers.find(
      (u) => u.project_id === payload.project_id && u.user_id === userId && u.id !== id,
    )
    if (dup) return { ok: false, msg: '该项目下已存在相同用户的用章人' }
  }
  const now = nowStr()
  const next = {
    user_id: userId,
    user_name: payload.user_name.trim(),
    post_label: String(payload.post_label || '').trim(),
    phone: String(payload.phone || '').trim(),
    remark: payload.remark || '',
    status: 1,
    pushed_at: now,
  }
  if (id) {
    const row = projectSealUsers.find((u) => u.id === id)
    if (!row) return { ok: false, msg: '用章人不存在' }
    Object.assign(row, next)
    return { ok: true, user: row }
  }
  const user = {
    id: `psu-${Date.now()}`,
    project_id: payload.project_id,
    ...next,
  }
  projectSealUsers.push(user)
  return { ok: true, user }
}

/** 停用/启用：停用后不再作为档案侧可用用章人下传 */
export function toggleSealUserStatus(row) {
  if (!row) return { ok: false, msg: '用章人不存在' }
  row.status = row.status === 1 ? 0 : 1
  row.pushed_at = nowStr()
  return { ok: true }
}

export function removeSealUser(id) {
  const idx = projectSealUsers.findIndex((u) => u.id === id)
  if (idx < 0) return { ok: false, msg: '用章人不存在' }
  projectSealUsers.splice(idx, 1)
  return { ok: true }
}

/** 整改单档案文档状态（§4.7 关联档案文档状态） */
export const RECTIFY_ARCHIVE_DOC_STATUS = {
  REJECTED: '退回待补资料',
  REINSPECT: '可复验',
  CLOSED: '已关闭',
}

/** 供整改联动读取最近一条驳回记录（D4：驳回人=整改来源） */
export function getLatestRejectRecord(task_id) {
  return [...approvalRecords].reverse().find((r) => r.task_id === task_id && r.action === 3) || null
}
