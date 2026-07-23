import { CONTROL_PLAN_PHASES, CONTROL_PLAN_NODES, getControlNodeKindLabel } from './controlPlanSchema.js'

function isValidDate(value) {
  if (!value || value === '-' || value === '/') return false
  return !Number.isNaN(new Date(value).getTime())
}

function toTime(dateStr) {
  if (!isValidDate(dateStr)) return null
  return new Date(dateStr).getTime()
}

function aggregateStatus(nodes) {
  if (!nodes.length) return 'pending'
  if (nodes.some((n) => n.statusKind === 'lag')) return 'lag'
  if (nodes.some((n) => n.statusKind === 'active')) return 'active'
  if (nodes.every((n) => n.statusKind === 'done')) return 'done'
  if (nodes.some((n) => n.statusKind === 'done')) return 'active'
  return 'pending'
}

function attachNodeMeta(plan) {
  return plan.nodes.map((node, index) => ({
    ...node,
    name: CONTROL_PLAN_NODES[index]?.name ?? `节点${index + 1}`,
    phaseId: CONTROL_PLAN_NODES[index]?.phaseId,
    phaseLabel: CONTROL_PLAN_NODES[index]?.phaseLabel,
  }))
}

/** 单条控制性计划 → 甘特行（计划 / 工作项·阶段 / 节点） */
export function buildControlPlanGanttRows(plan, { includePlanRoot = true } = {}) {
  const nodes = attachNodeMeta(plan)
  const rows = []

  if (includePlanRoot) {
    const datedNodes = nodes.filter(
      (n) => n.statusKind !== 'na' && n.statusKind !== 'empty' && isValidDate(n.planStart) && isValidDate(n.planEnd),
    )
    const planStart = datedNodes.length
      ? datedNodes.reduce((min, n) => Math.min(min, toTime(n.planStart)), Infinity)
      : null
    const planEnd = datedNodes.length
      ? datedNodes.reduce((max, n) => Math.max(max, toTime(n.planEnd)), -Infinity)
      : null

    rows.push({
      id: `${plan.id}-root`,
      planId: plan.id,
      name: plan.name,
      level: 0,
      levelLabel: '控制性计划',
      planStart: planStart != null ? formatDate(planStart) : null,
      planEnd: planEnd != null ? formatDate(planEnd) : null,
      status: plan.lagCount > 0 ? 'lag' : plan.completionRate >= 100 ? 'done' : 'active',
      isGroup: true,
      completionRate: plan.completionRate,
      lagCount: plan.lagCount,
    })
  }

  CONTROL_PLAN_PHASES.forEach((phase) => {
    const phaseNodes = nodes.filter(
      (n) =>
        n.phaseId === phase.id &&
        n.statusKind !== 'na' &&
        n.statusKind !== 'empty' &&
        isValidDate(n.planStart) &&
        isValidDate(n.planEnd),
    )

    const phaseStart = phaseNodes.length
      ? formatDate(Math.min(...phaseNodes.map((n) => toTime(n.planStart))))
      : null
    const phaseEnd = phaseNodes.length
      ? formatDate(Math.max(...phaseNodes.map((n) => toTime(n.planEnd))))
      : null

    rows.push({
      id: `${plan.id}-${phase.id}`,
      planId: plan.id,
      name: phase.label,
      level: includePlanRoot ? 1 : 0,
      levelLabel: '工作项',
      planStart: phaseStart,
      planEnd: phaseEnd,
      status: aggregateStatus(phaseNodes),
      isGroup: true,
      nodeCount: phase.nodes.length,
    })

    phase.nodes.forEach((nodeName) => {
      const node = nodes.find((n) => n.phaseId === phase.id && n.name === nodeName)
      if (!node) return
      if (node.statusKind === 'na' || node.statusKind === 'empty') return
      if (!isValidDate(node.planStart) || !isValidDate(node.planEnd)) return

      rows.push({
        id: `${plan.id}-${phase.id}-${node.index}`,
        planId: plan.id,
        name: nodeName,
        level: includePlanRoot ? 2 : 1,
        levelLabel: '节点',
        planStart: node.planStart,
        planEnd: node.planEnd,
        status: node.statusKind,
        progress: node.progress,
        owner: node.owner,
        remark: node.remark !== '-' ? node.remark : '',
        workProgress: node.workProgress !== '-' ? node.workProgress : '',
        statusLabel: node.statusLabel,
      })
    })
  })

  return rows
}

export function buildProjectControlPlanGanttRows(plans) {
  if (!plans?.length) return []
  if (plans.length === 1) return buildControlPlanGanttRows(plans[0], { includePlanRoot: true })
  return plans.flatMap((plan) => buildControlPlanGanttRows(plan, { includePlanRoot: true }))
}

export function getControlPlanGanttTimeRange(rows, { maxTicks = 7 } = {}) {
  if (!rows.length) {
    const now = Date.now()
    return { min: now, max: now, ticks: [] }
  }
  let min = Infinity
  let max = -Infinity
  rows.forEach((row) => {
    ;[row.planStart, row.planEnd].forEach((d) => {
      const t = toTime(d)
      if (t == null) return
      if (t < min) min = t
      if (t > max) max = t
    })
  })
  if (!Number.isFinite(min)) {
    const now = Date.now()
    return { min: now, max: now, ticks: [] }
  }

  const span = Math.max(max - min, 1)
  const pad = span * 0.03
  const paddedMin = min - pad
  const paddedMax = max + pad
  const ticks = buildSparseTicks(paddedMin, paddedMax, maxTicks)

  return { min: paddedMin, max: paddedMax, ticks }
}

function buildSparseTicks(min, max, maxTicks) {
  const span = max - min
  const count = Math.min(Math.max(maxTicks, 2), 12)
  const ticks = []
  for (let i = 0; i < count; i += 1) {
    const time = min + (span * i) / (count - 1)
    ticks.push({
      time,
      label: formatTickLabel(time, span),
      position: i / (count - 1),
    })
  }
  return ticks
}

function formatTickLabel(time, spanMs) {
  const d = new Date(time)
  const year = d.getFullYear()
  const month = d.getMonth() + 1
  const years = spanMs / (365.25 * 24 * 3600 * 1000)
  if (years > 4) return `${year}`
  if (years > 1.5) return `${year}/${month}`
  return `${year}/${String(month).padStart(2, '0')}`
}

export function tickPosition(time, timeRange) {
  const span = Math.max(timeRange.max - timeRange.min, 1)
  return ((time - timeRange.min) / span) * 100
}

function formatDate(time) {
  const d = new Date(time)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export { getControlNodeKindLabel as getGanttStatusLabel }

export function barPos(start, end, timeRange) {
  const span = Math.max(timeRange.max - timeRange.min, 1)
  const startTime = toTime(start)
  const endTime = toTime(end)
  if (startTime == null || endTime == null) return null
  const left = ((startTime - timeRange.min) / span) * 100
  const width = ((endTime - startTime) / span) * 100
  return {
    left: `${Math.max(0, left)}%`,
    width: `${Math.max(0.8, width)}%`,
  }
}

export function levelIndent(level, expanded) {
  const base = expanded ? 14 : 12
  const step = expanded ? 24 : 20
  return `${base + level * step}px`
}

export function statusClass(status) {
  return `status-${status === 'warn' ? 'lag' : status}`
}
