/** 实体工程分解 / 施工部位管理 — 统一节点类型展示名（验评目录树用 qmInspect 内 WBS_TREE_NODE_TYPE_LABEL） */
export const ENTITY_BREAKDOWN_NODE_TYPES = [1, 2, 3, 4, 5]

export const WBS_ENTITY_TYPE_LABEL = {
  1: '单位工程',
  2: '子单位工程',
  3: '分部工程',
  4: '子分部工程',
  5: '分项工程',
  9: '实体工程',
  loc: '施工部位',
}

export function entityBreakdownTypeLabel(nodeType) {
  return WBS_ENTITY_TYPE_LABEL[nodeType] || String(nodeType ?? '—')
}

/** 实体工程分解页节点展示名（分类节点固定为「实体工程」） */
export function displayEntityBreakdownNodeName(row) {
  if (!row) return ''
  if (row.node_type === 9) return '实体工程'
  return row.node_name || ''
}

/** 树节点 type_label（buildEntityBreakdownTree 等使用） */
export function entityBreakdownTreeTypeLabel(nodeType) {
  if (nodeType === 9) return '实体工程'
  return WBS_ENTITY_TYPE_LABEL[nodeType] || String(nodeType)
}
