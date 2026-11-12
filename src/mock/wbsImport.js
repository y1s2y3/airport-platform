/**
 * WBS 模板导入 · 增量追加写入（前端 Mock）
 *
 * 需求变更 CR-05（PRD V1.8）：只新增系统中不存在的节点，已存在按完整路径跳过，不修改、不删除。
 * 层级：实体工程根 → 单位工程 → 子单位工程（选填）→ 分部工程 → 子分部工程（选填）→ 分项工程
 *       → 检验批（选填）；施工部位挂在分项工程下（最多三级）。
 * 与「验评目录树 / 实体工程分解」同源：WBS 节点写 wbsNodes，施工部位写 constructionLocations。
 */
import {
  ensureWbsScaffold,
  getEntityRootNode,
  isWbsAlive,
  upsertWbsNode,
  wbsNodes,
} from './qm.js'
import { constructionLocations, inheritLocationSpecialties, upsertLocation } from './constructionLocation.js'

const INSPECTION_BATCH_TYPE = 'bt-rebar'

function findWbsChild(projectId, parentId, nodeType, code) {
  return wbsNodes.find(
    (n) =>
      isWbsAlive(n) &&
      n.project_id === projectId &&
      (n.parent_id || '') === (parentId || '') &&
      n.node_type === nodeType &&
      String(n.location_code || '') === String(code || ''),
  )
}

function ensureWbsChild(projectId, parentId, nodeType, nodeName, code) {
  const exists = findWbsChild(projectId, parentId, nodeType, code)
  if (exists) return { node: exists, created: false }
  const parent = wbsNodes.find((n) => isWbsAlive(n) && n.id === parentId)
  const payload = {
    project_id: projectId,
    parent_id: parentId || '',
    node_type: nodeType,
    node_name: nodeName,
    location_code: code,
    specialties: parent?.specialties ? [...parent.specialties] : [],
    sort_no: 0,
  }
  if (nodeType === 6) payload.batch_type_id = INSPECTION_BATCH_TYPE
  const result = upsertWbsNode(payload)
  if (!result?.ok) throw new Error(result?.msg || `创建${nodeName}失败`)
  return { node: result.node, created: true }
}

function findLocation(projectId, itemNodeId, parentId, code) {
  return constructionLocations.find(
    (l) =>
      l.project_id === projectId &&
      l.wbs_node_id === itemNodeId &&
      (l.parent_id || '') === (parentId || '') &&
      String(l.code || '') === String(code || ''),
  )
}

function ensureLocation(projectId, itemNodeId, parentId, name, code, sortNo) {
  const exists = findLocation(projectId, itemNodeId, parentId, code)
  if (exists) return { node: exists, created: false }
  const result = upsertLocation({
    project_id: projectId,
    wbs_node_id: itemNodeId,
    parent_id: parentId || '',
    name,
    code,
    sort_no: sortNo,
    specialties: inheritLocationSpecialties({ wbs_node_id: itemNodeId, parent_id: parentId || '' }),
  })
  if (!result?.ok) throw new Error(result?.msg || `创建施工部位「${name}」失败`)
  return { node: result.row, created: true }
}

function rowLabel(row) {
  return [row.unit, row.subUnit, row.part, row.subPart, row.item, row.inspection]
    .filter(Boolean)
    .join(' / ')
}

/**
 * 增量导入 WBS 模板数据
 * @param {string} projectId 项目 id
 * @param {Array} rows parseWbsImportFile 返回的 rows
 * @returns {{ added: number, skipped: number, failed: number, details: Array }}
 */
export function importWbsRows(projectId, rows = []) {
  if (!projectId) return { added: 0, skipped: 0, failed: 0, details: [] }
  ensureWbsScaffold(projectId)
  const root = getEntityRootNode(projectId)
  if (!root) return { added: 0, skipped: 0, failed: rows.length, details: rows.map((r) => ({ rowNo: r.rowNo, label: rowLabel(r), action: 'failed', message: '未找到「实体工程」根节点' })) }

  let added = 0
  let skipped = 0
  let failed = 0
  const details = []

  for (const row of rows) {
    let created = 0
    try {
      const unit = ensureWbsChild(projectId, root.id, 1, row.unit, row.unitCode)
      if (unit.created) created += 1

      let subUnitNode = null
      if (row.subUnit) {
        const r = ensureWbsChild(projectId, unit.node.id, 2, row.subUnit, row.subUnitCode)
        if (r.created) created += 1
        subUnitNode = r.node
      }

      const partParent = subUnitNode || unit.node
      const part = ensureWbsChild(projectId, partParent.id, 3, row.part, row.partCode)
      if (part.created) created += 1

      let subPartNode = null
      if (row.subPart) {
        const r = ensureWbsChild(projectId, part.node.id, 4, row.subPart, row.subPartCode)
        if (r.created) created += 1
        subPartNode = r.node
      }

      const itemParent = subPartNode || part.node
      const item = ensureWbsChild(projectId, itemParent.id, 5, row.item, row.itemCode)
      if (item.created) created += 1

      if (row.inspection) {
        const r = ensureWbsChild(projectId, item.node.id, 6, row.inspection, row.inspectionCode)
        if (r.created) created += 1
      }

      let loc1 = null
      if (row.loc1) {
        const r = ensureLocation(projectId, item.node.id, '', row.loc1, row.loc1Code, 1)
        if (r.created) created += 1
        loc1 = r.node
      }
      let loc2 = null
      if (row.loc2) {
        const r = ensureLocation(projectId, item.node.id, loc1?.id || '', row.loc2, row.loc2Code, 1)
        if (r.created) created += 1
        loc2 = r.node
      }
      if (row.loc3) {
        const r = ensureLocation(projectId, item.node.id, loc2?.id || '', row.loc3, row.loc3Code, 1)
        if (r.created) created += 1
      }

      if (created > 0) {
        added += 1
        details.push({ rowNo: row.rowNo, label: rowLabel(row), action: 'added', message: `新增 ${created} 个节点` })
      } else {
        skipped += 1
        details.push({ rowNo: row.rowNo, label: rowLabel(row), action: 'skipped', message: '已存在，跳过' })
      }
    } catch (err) {
      failed += 1
      details.push({ rowNo: row.rowNo, label: rowLabel(row), action: 'failed', message: err?.message || '导入失败' })
    }
  }

  return { added, skipped, failed, details }
}
