/** 控制性计划 · 六阶段 / 34 节点列定义 */
export const CONTROL_PLAN_PHASES = [
  {
    id: 'phase1',
    label: '一、前期阶段',
    nodes: ['项建批复', '可研批复'],
  },
  {
    id: 'phase2',
    label: '二、设计阶段',
    nodes: ['设计招标', '初设报批', '初设批复', '施工图出图', '施工图受控', 'BIM报建审查'],
  },
  {
    id: 'phase3',
    label: '三、施工招采阶段',
    nodes: [
      '施工采购立项',
      '施工招采文件内审',
      '施工招采文件集团审核',
      '施工招采挂网',
      '施工招采截标',
      '施工招采定标',
    ],
  },
  {
    id: 'phase4',
    label: '四、开工报建阶段',
    nodes: ['土地合同签订', '用规批复', '工规批复', '施工许可', '项目开工'],
  },
  {
    id: 'phase5',
    label: '五、施工阶段',
    nodes: ['控制性节点1', '控制性节点2', '控制性节点3', '控制性节点4', '控制性节点5'],
  },
  {
    id: 'phase6',
    label: '六、工程移交及结算阶段',
    nodes: [
      '规划验收',
      '消防验收',
      '人防验收',
      '竣工验收',
      '行业验收',
      '实物移交',
      '资产入账',
      '数字化交付',
      '工程结算',
      '资产转固',
    ],
  },
]

export const CONTROL_PLAN_NODE_COUNT = CONTROL_PLAN_PHASES.reduce(
  (sum, phase) => sum + phase.nodes.length,
  0,
)

export const CONTROL_PLAN_NODES = CONTROL_PLAN_PHASES.flatMap((phase) =>
  phase.nodes.map((name) => ({ phaseId: phase.id, phaseLabel: phase.label, name })),
)

export const CONTROL_PLAN_ROW_TYPES = [
  { key: 'planStart', label: '计划开始时间' },
  { key: 'planEnd', label: '计划结束时间' },
  { key: 'owner', label: '负责人' },
  { key: 'status', label: '完成情况' },
  { key: 'workProgress', label: '工作进展' },
  { key: 'remark', label: '备注' },
]

/** 解析「完成情况」单元格 */
export function parseControlNodeStatus(raw) {
  const text = String(raw ?? '').trim()
  if (!text || text === '/' || text === '-') {
    return { kind: 'empty', label: text || '—', progress: null }
  }
  if (text === '不涉及') {
    return { kind: 'na', label: '不涉及', progress: null }
  }
  if (text === '已完成') {
    return { kind: 'done', label: '已完成', progress: 100 }
  }
  if (text === '未开始') {
    return { kind: 'pending', label: '未开始', progress: null }
  }
  const activeMatch = text.match(/^进行中\s*(-?\s*(\d+(?:\.\d+)?%)?)?/)
  if (activeMatch) {
    const pctRaw = activeMatch[2]
    const progress = pctRaw ? parseFloat(pctRaw) : null
    return {
      kind: 'active',
      label: progress != null ? `进行中 ${progress}%` : '进行中',
      progress,
    }
  }
  return { kind: 'pending', label: text, progress: null }
}

/** 根据计划结束时间与完成情况推断是否滞后 */
export function resolveControlNodeKind(statusKind, planEnd) {
  if (statusKind === 'done' || statusKind === 'na' || statusKind === 'empty') {
    return statusKind
  }
  if (!planEnd || planEnd === '/' || planEnd === '-') return statusKind
  const endTime = new Date(planEnd).getTime()
  if (Number.isNaN(endTime)) return statusKind
  if (endTime < Date.now() && (statusKind === 'pending' || statusKind === 'active')) {
    return 'lag'
  }
  return statusKind
}

export function getControlNodeKindLabel(kind) {
  const map = {
    pending: '未开始',
    active: '进行中',
    done: '已完成',
    lag: '滞后',
    na: '不涉及',
    empty: '—',
  }
  return map[kind] || kind
}
