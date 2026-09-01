/**
 * 施工部位 Mock — 挂在分项（WBS node_type=5）下，支持多级树（同一分项下最多三级）
 * 与验评目录树 / 实体工程分解同源依赖 wbsNodes 分项节点
 */
import { reactive } from 'vue'
import { ensureWbsScaffold, inspectionTasks, isWbsAlive, wbsNodes } from './qmInspect.js'
import { nowStr } from '../utils/datetime.js'
import { listEntries } from './mat.js'
import { COC_PROJECT_OPTIONS } from '../config/projectOptions.js'
import { listMaterialApps, listProcessApps } from './sample.js'
import {
  formatSpecialtiesDisplay,
  getEffectiveSpecialties,
} from '../constants/wbsSpecialty.js'
import { entityBreakdownTreeTypeLabel } from '../constants/wbsEntityLabels.js'

/** @type {Array<{
 *  id: string
 *  project_id: string
 *  wbs_node_id: string
 *  parent_id: string
 *  name: string
 *  code: string
 *  sort_no: number
 *  status: 1|0
 *  created_at: string
 *  updated_at: string
 * }>} */
export const constructionLocations = reactive([
  // —— wn-item-1 钢筋分项工程 ——
  {
    id: 'loc-rebar-a',
    project_id: 'p-000',
    wbs_node_id: 'wn-item-1',
    parent_id: '',
    name: '三层梁板钢筋区',
    code: 'RB-F3-A',
    sort_no: 1,
    status: 1,
    created_at: '2026-06-10 09:00:00',
    updated_at: '2026-06-10 09:00:00',
  },
  {
    id: 'loc-rebar-a1',
    project_id: 'p-000',
    wbs_node_id: 'wn-item-1',
    parent_id: 'loc-rebar-a',
    name: '轴1~5梁底',
    code: 'RB-F3-A-1',
    sort_no: 1,
    status: 1,
    created_at: '2026-06-10 09:05:00',
    updated_at: '2026-06-10 09:05:00',
  },
  {
    id: 'loc-rebar-a2',
    project_id: 'p-000',
    wbs_node_id: 'wn-item-1',
    parent_id: 'loc-rebar-a',
    name: '轴6~10板面',
    code: 'RB-F3-A-2',
    sort_no: 2,
    status: 1,
    created_at: '2026-06-10 09:06:00',
    updated_at: '2026-06-10 09:06:00',
  },
  {
    id: 'loc-rebar-b',
    project_id: 'p-000',
    wbs_node_id: 'wn-item-1',
    parent_id: '',
    name: '柱筋绑扎区',
    code: 'RB-F3-B',
    sort_no: 2,
    status: 1,
    created_at: '2026-06-10 09:10:00',
    updated_at: '2026-06-10 09:10:00',
  },
  {
    id: 'loc-rebar-c',
    project_id: 'p-000',
    wbs_node_id: 'wn-item-1',
    parent_id: '',
    name: '楼梯间钢筋区',
    code: 'RB-F3-C',
    sort_no: 3,
    status: 1,
    created_at: '2026-06-10 09:12:00',
    updated_at: '2026-06-10 09:12:00',
  },
  // —— wn-item-2 电缆敷设分项 ——
  {
    id: 'loc-cable-1',
    project_id: 'p-000',
    wbs_node_id: 'wn-item-2',
    parent_id: '',
    name: 'B1区低压电缆桥架',
    code: 'CB-B1-01',
    sort_no: 1,
    status: 1,
    created_at: '2026-06-11 10:00:00',
    updated_at: '2026-06-11 10:00:00',
  },
  {
    id: 'loc-cable-1a',
    project_id: 'p-000',
    wbs_node_id: 'wn-item-2',
    parent_id: 'loc-cable-1',
    name: '东侧桥架段',
    code: 'CB-B1-01-E',
    sort_no: 1,
    status: 1,
    created_at: '2026-06-11 10:05:00',
    updated_at: '2026-06-11 10:05:00',
  },
  {
    id: 'loc-cable-2',
    project_id: 'p-000',
    wbs_node_id: 'wn-item-2',
    parent_id: '',
    name: '配电室进线段',
    code: 'CB-B1-02',
    sort_no: 2,
    status: 1,
    created_at: '2026-06-11 10:10:00',
    updated_at: '2026-06-11 10:10:00',
  },
  // —— wn-item-3 混凝土分项 ——
  {
    id: 'loc-conc-1',
    project_id: 'p-000',
    wbs_node_id: 'wn-item-3',
    parent_id: '',
    name: '轨道梁本体',
    code: 'CT-AGT-01',
    sort_no: 1,
    status: 1,
    created_at: '2026-06-12 08:00:00',
    updated_at: '2026-06-12 08:00:00',
  },
  {
    id: 'loc-conc-1a',
    project_id: 'p-000',
    wbs_node_id: 'wn-item-3',
    parent_id: 'loc-conc-1',
    name: '跨中浇筑段',
    code: 'CT-AGT-01-M',
    sort_no: 1,
    status: 1,
    created_at: '2026-06-12 08:05:00',
    updated_at: '2026-06-12 08:05:00',
  },
  {
    id: 'loc-conc-2',
    project_id: 'p-000',
    wbs_node_id: 'wn-item-3',
    parent_id: '',
    name: '支座垫层区',
    code: 'CT-AGT-02',
    sort_no: 2,
    status: 1,
    created_at: '2026-06-12 08:10:00',
    updated_at: '2026-06-12 08:10:00',
  },
  // —— wn-item-4 防水分项 ——
  {
    id: 'loc-wp-1',
    project_id: 'p-000',
    wbs_node_id: 'wn-item-4',
    parent_id: '',
    name: '隧道顶板防水',
    code: 'WP-TUN-01',
    sort_no: 1,
    status: 1,
    created_at: '2026-06-13 09:00:00',
    updated_at: '2026-06-13 09:00:00',
  },
  {
    id: 'loc-wp-1a',
    project_id: 'p-000',
    wbs_node_id: 'wn-item-4',
    parent_id: 'loc-wp-1',
    name: '接缝加强带',
    code: 'WP-TUN-01-J',
    sort_no: 1,
    status: 1,
    created_at: '2026-06-13 09:05:00',
    updated_at: '2026-06-13 09:05:00',
  },
  {
    id: 'loc-wp-2',
    project_id: 'p-000',
    wbs_node_id: 'wn-item-4',
    parent_id: '',
    name: '侧墙卷材区',
    code: 'WP-TUN-02',
    sort_no: 2,
    status: 1,
    created_at: '2026-06-13 09:10:00',
    updated_at: '2026-06-13 09:10:00',
  },
  {
    id: 'loc-wp-3',
    project_id: 'p-000',
    wbs_node_id: 'wn-item-4',
    parent_id: '',
    name: '洞口附加层',
    code: 'WP-TUN-03',
    sort_no: 3,
    status: 1,
    created_at: '2026-06-13 09:15:00',
    updated_at: '2026-06-13 09:15:00',
  },
  // —— wn-item-ready 模板分项 ——
  {
    id: 'loc-form-1',
    project_id: 'p-000',
    wbs_node_id: 'wn-item-ready',
    parent_id: '',
    name: '三层梁板模板',
    code: 'FM-F3-01',
    sort_no: 1,
    status: 1,
    created_at: '2026-06-14 10:00:00',
    updated_at: '2026-06-14 10:00:00',
  },
  {
    id: 'loc-form-1a',
    project_id: 'p-000',
    wbs_node_id: 'wn-item-ready',
    parent_id: 'loc-form-1',
    name: '梁侧模',
    code: 'FM-F3-01-L',
    sort_no: 1,
    status: 1,
    created_at: '2026-06-14 10:05:00',
    updated_at: '2026-06-14 10:05:00',
  },
  {
    id: 'loc-form-2',
    project_id: 'p-000',
    wbs_node_id: 'wn-item-ready',
    parent_id: '',
    name: '柱模支设区',
    code: 'FM-F3-02',
    sort_no: 2,
    status: 1,
    created_at: '2026-06-14 10:10:00',
    updated_at: '2026-06-14 10:10:00',
  },
  // —— wn-item-p001 水泥混凝土面层（p-001） ——
  {
    id: 'loc-rwy-1',
    project_id: 'p-001',
    wbs_node_id: 'wn-item-p001',
    parent_id: '',
    name: '跑道东段面层',
    code: 'RWY-E-01',
    sort_no: 1,
    status: 1,
    created_at: '2026-06-15 08:00:00',
    updated_at: '2026-06-15 08:00:00',
  },
  {
    id: 'loc-rwy-1a',
    project_id: 'p-001',
    wbs_node_id: 'wn-item-p001',
    parent_id: 'loc-rwy-1',
    name: '接缝切缝带',
    code: 'RWY-E-01-J',
    sort_no: 1,
    status: 1,
    created_at: '2026-06-15 08:05:00',
    updated_at: '2026-06-15 08:05:00',
  },
  {
    id: 'loc-rwy-2',
    project_id: 'p-001',
    wbs_node_id: 'wn-item-p001',
    parent_id: '',
    name: '跑道西段面层',
    code: 'RWY-W-01',
    sort_no: 2,
    status: 1,
    created_at: '2026-06-15 08:10:00',
    updated_at: '2026-06-15 08:10:00',
  },
  {
    id: 'loc-rwy-3',
    project_id: 'p-001',
    wbs_node_id: 'wn-item-p001',
    parent_id: '',
    name: '滑行道口衔接区',
    code: 'RWY-TX-01',
    sort_no: 3,
    status: 1,
    created_at: '2026-06-15 08:15:00',
    updated_at: '2026-06-15 08:15:00',
  },
])

export function listItemNodes(projectId) {
  if (!projectId) return []
  ensureWbsScaffold(projectId)
  return wbsNodes
    .filter((n) => isWbsAlive(n) && n.project_id === projectId && n.node_type === 5)
    .slice()
    .sort((a, b) => (a.sort_no || 0) - (b.sort_no || 0))
}

export function listLocations(projectId, wbsNodeId = '') {
  if (!projectId) return []
  return constructionLocations
    .filter(
      (r) =>
        !Number(r.del_status) &&
        r.project_id === projectId &&
        (!wbsNodeId || r.wbs_node_id === wbsNodeId),
    )
    .slice()
    .sort((a, b) => (a.sort_no || 0) - (b.sort_no || 0))
}

/** 分项下部位树（不含分项节点本身） */
export function buildLocationTree(projectId, wbsNodeId = '') {
  const list = listLocations(projectId, wbsNodeId)
  const map = new Map()
  list.forEach((r) => {
    map.set(r.id, {
      id: r.id,
      label: r.name,
      code: r.code,
      status: r.status,
      wbs_node_id: r.wbs_node_id,
      parent_id: r.parent_id || '',
      raw: r,
      children: [],
    })
  })
  const roots = []
  list.forEach((r) => {
    const node = map.get(r.id)
    if (r.parent_id && map.has(r.parent_id)) map.get(r.parent_id).children.push(node)
    else roots.push(node)
  })
  const sortDeep = (nodes) => {
    nodes.sort((a, b) => {
      const bySort = (a.raw?.sort_no || 0) - (b.raw?.sort_no || 0)
      if (bySort !== 0) return bySort
      return String(a.label || '').localeCompare(String(b.label || ''), 'zh-CN')
    })
    nodes.forEach((n) => n.children?.length && sortDeep(n.children))
  }
  sortDeep(roots)
  return roots
}

/**
 * 业务页 tree-select：按实体工程结构树展示；仅施工部位可选
 * @param {string} projectId
 * @param {{
 *   scopeWbsNodeId?: string
 *   filterByScope?: boolean  默认 true：仅展示作用域内分项；false：全树展示（验评定位不限制）
 * }} [opts]
 */
export function listLocationsForSelect(projectId, opts = {}) {
  if (!projectId) return []
  ensureWbsScaffold(projectId)
  const scopeWbsNodeId = opts.scopeWbsNodeId || ''
  const filterByScope = opts.filterByScope !== false
  const itemIdSet = scopeWbsNodeId
    ? new Set(resolveLocationScopeItemIds(scopeWbsNodeId))
    : null

  // 过滤模式下：有节点但解析不到分项 → 空树
  if (filterByScope && scopeWbsNodeId && itemIdSet && !itemIdSet.size) return []

  const mapLocSelectable = (nodes) =>
    (nodes || []).map((n) => ({
      id: n.id,
      label: n.label,
      disabled: false,
      is_loc: true,
      wbs_node_id: n.wbs_node_id,
      children: mapLocSelectable(n.children),
    }))

  const toSelectNode = (n) => {
    if (n.node_type === 5) {
      if (filterByScope && itemIdSet && !itemIdSet.has(n.id)) return null
      const locs = buildLocationTree(projectId, n.id).filter((l) => {
        const raw = l.raw || getLocationById(l.id)
        return !raw || raw.status !== 0
      })
      // 停用部位：从树中剔除（含整棵子树根若停用）
      const filterActive = (list) =>
        list
          .filter((x) => {
            const raw = x.raw || getLocationById(x.id)
            return raw && raw.status !== 0
          })
          .map((x) => ({
            ...x,
            children: filterActive(x.children || []),
          }))
      const activeLocs = filterActive(locs)
      return {
        id: `wbs-${n.id}`,
        label: n.label,
        disabled: true,
        is_wbs: true,
        node_type: 5,
        type_label: n.type_label,
        wbs_node_id: n.id,
        in_scope: !!(itemIdSet && itemIdSet.has(n.id)),
        children: mapLocSelectable(activeLocs),
      }
    }
    const children = (n.children || []).map(toSelectNode).filter(Boolean)
    if (filterByScope && itemIdSet && !children.length) return null
    return {
      id: `wbs-${n.id}`,
      label: n.label,
      disabled: true,
      is_wbs: true,
      node_type: n.node_type,
      type_label: n.type_label,
      wbs_node_id: n.id,
      in_scope: false,
      children,
    }
  }

  return buildEntityBreakdownTree(projectId).map(toSelectNode).filter(Boolean)
}

/** 多选路径标签 */
export function resolveLocationPathLabels(locationIds = []) {
  return (locationIds || []).map((id) => resolveLocationPathLabel(id)).filter(Boolean)
}

/** 多选展示文案（顿号/分号连接） */
export function joinLocationLabels(locationIds = [], sep = '；') {
  return resolveLocationPathLabels(locationIds).join(sep)
}

/**
 * 归一化一对多施工部位字段（兼容旧单值）
 * @returns {{ location_ids: string[], location_name: string, location_id: string }}
 */
export function normalizeLocationFields(input = {}) {
  let ids = []
  if (Array.isArray(input.location_ids) && input.location_ids.length) {
    ids = input.location_ids.map(String).filter(Boolean)
  } else if (input.location_id) {
    ids = [String(input.location_id)]
  }
  const fromTree = joinLocationLabels(ids)
  const fallback = String(input.location_name || input.use_part || '').trim()
  const location_name = fromTree || fallback
  return {
    location_ids: ids,
    location_name,
    location_id: ids[0] || '',
  }
}

/** 验评定位：作用域内分项对应的 tree-select 展开 key */
export function resolveScopeExpandKeys(wbsNodeId) {
  const itemIds = resolveLocationScopeItemIds(wbsNodeId)
  return itemIds.map((id) => `wbs-${id}`)
}

/**
 * 验收节点 → 应展示施工部位的分项 id 列表
 * - 分项：自身
 * - 检验批等下级：向上找所属分项
 * - 单位/分部等上级：其下全部子孙分项
 */
export function resolveLocationScopeItemIds(wbsNodeId) {
  if (!wbsNodeId) return []
  const node = wbsNodes.find((n) => n.id === wbsNodeId)
  if (!node) return []
  if (node.node_type === 5) return [node.id]
  if (node.node_type === 6) {
    let cur = node
    const guard = new Set()
    while (cur && !guard.has(cur.id)) {
      guard.add(cur.id)
      if (cur.node_type === 5) return [cur.id]
      cur = cur.parent_id ? wbsNodes.find((n) => n.id === cur.parent_id) : null
    }
    return []
  }
  // 1～4、9：子孙分项
  if ([1, 2, 3, 4, 9].includes(node.node_type)) {
    return collectDescendantItemIds(node.project_id, node.id)
  }
  return []
}

/** 判断部位是否落在验收节点作用域内 */
export function isLocationInWbsScope(locationId, wbsNodeId) {
  if (!locationId || !wbsNodeId) return false
  const loc = getLocationById(locationId)
  if (!loc) return false
  const items = resolveLocationScopeItemIds(wbsNodeId)
  return items.includes(loc.wbs_node_id)
}

export function getLocationById(id) {
  const row = constructionLocations.find((r) => r.id === id) || null
  if (!row || Number(row.del_status)) return null
  return row
}

function collectRecordLocationIds(record) {
  const ids = new Set()
  if (!record) return ids
  if (record.location_id) ids.add(String(record.location_id))
  if (Array.isArray(record.location_ids)) {
    record.location_ids.forEach((x) => x && ids.add(String(x)))
  }
  if (Array.isArray(record.line_items)) {
    record.line_items.forEach((line) => {
      if (line?.location_id) ids.add(String(line.location_id))
      if (Array.isArray(line?.location_ids)) {
        line.location_ids.forEach((x) => x && ids.add(String(x)))
      }
    })
  }
  return ids
}

/** 施工部位是否被下游业务单据引用 */
export function findLocationReferenceSource(locationId) {
  const id = String(locationId || '')
  if (!id) return ''

  for (const task of inspectionTasks) {
    if (collectRecordLocationIds(task).has(id)) return '验评任务'
  }

  for (const entry of listEntries('')) {
    if (collectRecordLocationIds(entry).has(id)) return '材料设备进场'
  }

  for (const opt of COC_PROJECT_OPTIONS) {
    for (const app of [...listMaterialApps(opt.id), ...listProcessApps(opt.id)]) {
      if (collectRecordLocationIds(app).has(id)) return '样板管理'
    }
  }

  return ''
}

/** 展示路径：分项名 / 部位1 / 部位2 */
export function resolveLocationPathLabel(locationId) {
  const loc = getLocationById(locationId)
  if (!loc) return ''
  const item = wbsNodes.find((n) => n.id === loc.wbs_node_id)
  const parts = []
  let cur = loc
  const guard = new Set()
  while (cur && !guard.has(cur.id)) {
    guard.add(cur.id)
    parts.unshift(cur.name)
    cur = cur.parent_id ? getLocationById(cur.parent_id) : null
  }
  if (item?.node_name) parts.unshift(item.node_name)
  return parts.join(' / ')
}

export const MAX_LOCATION_DEPTH = 3

/** 同一分项下：根级部位 depth=1，每向上一级 parent 累加 1 */
export function getLocationDepth(locationId) {
  if (!locationId) return 0
  let depth = 0
  let cur = getLocationById(locationId)
  const guard = new Set()
  while (cur && !guard.has(cur.id)) {
    depth += 1
    guard.add(cur.id)
    cur = cur.parent_id ? getLocationById(cur.parent_id) : null
  }
  return depth
}

function getMaxRelativeDepth(locationId) {
  let max = 0
  const walk = (id, rel) => {
    max = Math.max(max, rel)
    constructionLocations
      .filter((r) => r.parent_id === id)
      .forEach((c) => walk(c.id, rel + 1))
  }
  walk(locationId, 0)
  return max
}

function validateLocationDepth(parentId, selfId = '') {
  const selfDepth = parentId ? getLocationDepth(parentId) + 1 : 1
  if (selfDepth > MAX_LOCATION_DEPTH) {
    return { ok: false, msg: '同一分项下施工部位最多支持三级，无法继续新增下级' }
  }
  if (selfId) {
    const maxRel = getMaxRelativeDepth(selfId)
    if (selfDepth + maxRel > MAX_LOCATION_DEPTH) {
      return { ok: false, msg: '调整上级后将超过三级限制' }
    }
  }
  return { ok: true }
}

export function upsertLocation(payload, id = '') {
  if (!payload?.project_id || !payload?.wbs_node_id || !payload?.name?.trim()) {
    return { ok: false, msg: '项目、归属分项、部位名称必填' }
  }
  const item = wbsNodes.find(
    (n) =>
      isWbsAlive(n) &&
      n.id === payload.wbs_node_id &&
      n.node_type === 5 &&
      n.project_id === payload.project_id,
  )
  if (!item) return { ok: false, msg: '归属分项不存在或不属于当前项目' }

  const parent_id = payload.parent_id || ''
  if (parent_id) {
    const parent = getLocationById(parent_id)
    if (!parent || parent.wbs_node_id !== payload.wbs_node_id) {
      return { ok: false, msg: '上级部位须属于同一分项' }
    }
    if (id && (parent_id === id || isDescendantOf(parent_id, id))) {
      return { ok: false, msg: '不能将节点挂到自身或其下级下' }
    }
  }

  const depthCheck = validateLocationDepth(parent_id, id)
  if (!depthCheck.ok) return depthCheck

  const name = payload.name.trim()
  const code = (payload.code || '').trim()
  const sort_no = Number(payload.sort_no) || 0
  const status = Number(payload.status) === 0 ? 0 : 1
  const ts = nowStr()

  if (id) {
    const exist = getLocationById(id)
    if (!exist) return { ok: false, msg: '部位不存在' }
    Object.assign(exist, {
      name,
      code,
      parent_id,
      sort_no,
      status,
      updated_at: ts,
    })
    return { ok: true, row: exist }
  }

  const row = {
    id: `loc-${Date.now()}`,
    project_id: payload.project_id,
    wbs_node_id: payload.wbs_node_id,
    parent_id,
    name,
    code,
    sort_no,
    status,
    del_status: 0,
    created_at: ts,
    updated_at: ts,
  }
  constructionLocations.push(row)
  return { ok: true, row }
}

function isDescendantOf(candidateId, ancestorId) {
  let cur = getLocationById(candidateId)
  const guard = new Set()
  while (cur && !guard.has(cur.id)) {
    if (cur.parent_id === ancestorId) return true
    guard.add(cur.id)
    cur = cur.parent_id ? getLocationById(cur.parent_id) : null
  }
  return false
}

export function removeLocation(id) {
  const row = constructionLocations.find((r) => r.id === id && !Number(r.del_status))
  if (!row) return { ok: false, msg: '部位不存在' }
  const hasChild = constructionLocations.some(
    (r) => !Number(r.del_status) && r.parent_id === id,
  )
  if (hasChild) return { ok: false, msg: '请先删除下级部位' }
  const refSource = findLocationReferenceSource(id)
  if (refSource) return { ok: false, msg: `该部位已被${refSource}引用，不可删除` }
  row.del_status = 1
  row.updated_at = nowStr()
  return { ok: true }
}

/** 实体工程分解树：仅实体分类(9)及其下 1～5，不含检验批 */
export function buildEntityBreakdownTree(projectId) {
  if (!projectId) return []
  ensureWbsScaffold(projectId)
  const allow = new Set([1, 2, 3, 4, 5, 9])
  const list = wbsNodes.filter(
    (n) => isWbsAlive(n) && n.project_id === projectId && allow.has(n.node_type),
  )
  const map = new Map()
  list.forEach((n) => {
    map.set(n.id, {
      id: n.id,
      // 实体工程分解页：分类节点展示为「实体工程」（验评目录树仍用「实体工程验收」）
      label: n.node_type === 9 ? '实体工程' : n.node_name,
      node_type: n.node_type,
      type_label:
        n.node_type === 9
          ? '实体工程'
          : ({ 1: '单位工程', 2: '子单位工程', 3: '分部工程', 4: '子分部工程', 5: '分项工程' }[
              n.node_type
            ] || String(n.node_type)),
      raw: n,
      children: [],
    })
  })
  const roots = []
  list.forEach((n) => {
    const node = map.get(n.id)
    if (n.parent_id && map.has(n.parent_id)) map.get(n.parent_id).children.push(node)
    else if (n.node_type === 9) roots.push(node)
  })
  const sortDeep = (nodes) => {
    nodes.sort((a, b) => {
      const bySort = (a.raw?.sort_no || 0) - (b.raw?.sort_no || 0)
      if (bySort !== 0) return bySort
      return String(a.label || '').localeCompare(String(b.label || ''), 'zh-CN')
    })
    nodes.forEach((n) => n.children?.length && sortDeep(n.children))
  }
  sortDeep(roots)
  return roots
}

/** 收集某 WBS 节点下全部子孙分项 id（含自身若为分项） */
export function collectDescendantItemIds(projectId, wbsNodeId) {
  if (!projectId || !wbsNodeId) return []
  ensureWbsScaffold(projectId)
  const byParent = new Map()
  wbsNodes
    .filter(
      (n) =>
        isWbsAlive(n) &&
        n.project_id === projectId &&
        [1, 2, 3, 4, 5].includes(n.node_type),
    )
    .forEach((n) => {
      const key = n.parent_id || ''
      if (!byParent.has(key)) byParent.set(key, [])
      byParent.get(key).push(n)
    })
  const items = []
  const walk = (id) => {
    const node = wbsNodes.find((n) => isWbsAlive(n) && n.id === id)
    if (!node || node.project_id !== projectId) return
    if (node.node_type === 5) items.push(node.id)
    const kids = byParent.get(id) || []
    kids.forEach((k) => walk(k.id))
  }
  walk(wbsNodeId)
  return items
}

/** 某实体节点下（含子孙分项）全部施工部位；可选仅根部位 */
export function listLocationsUnderWbs(projectId, wbsNodeId, { rootsOnly = false } = {}) {
  const itemIds = new Set(collectDescendantItemIds(projectId, wbsNodeId))
  if (!itemIds.size) return []
  return constructionLocations
    .filter(
      (r) =>
        !Number(r.del_status) &&
        r.project_id === projectId &&
        itemIds.has(r.wbs_node_id) &&
        (!rootsOnly || !r.parent_id),
    )
    .slice()
    .sort((a, b) => (a.sort_no || 0) - (b.sort_no || 0))
}

/**
 * 施工部位管理左侧：实体工程结构树；分项下挂接部位多级树
 * 仅分项可挂部位；上级 WBS 节点用于查询下级挂接部位
 */
export function buildLocationManageEntityTree(projectId) {
  const entityTree = buildEntityBreakdownTree(projectId)
  const attachLoc = (nodes) => {
    nodes.forEach((n) => {
      if (n.node_type === 5) {
        n.is_item = true
        n.wbs_node_id = n.id
        n.children = buildLocationTree(projectId, n.id).map(mapLocNodeForManage)
      } else {
        n.is_item = false
        n.wbs_node_id = n.id
        if (n.children?.length) attachLoc(n.children)
      }
    })
  }
  attachLoc(entityTree)
  return entityTree
}

/** @deprecated 使用 buildLocationManageEntityTree */
export function buildItemLocationManageTree(projectId) {
  return buildLocationManageEntityTree(projectId)
}

function mapLocNodeForManage(n) {
  return {
    id: n.id,
    label: n.label,
    node_type: 'loc',
    type_label: '施工部位',
    is_item: false,
    is_loc: true,
    wbs_node_id: n.wbs_node_id,
    raw: n.raw,
    children: (n.children || []).map(mapLocNodeForManage),
  }
}

/**
 * 实体工程分解（合并施工部位）树表数据
 * 列：节点名称、节点类型、编码、专业、完整路径、排序值
 * 部位专业继承所属分项
 */
export function buildEntityBreakdownTableTree(projectId) {
  const entityTree = buildLocationManageEntityTree(projectId)

  const mapRow = (n, parentPath) => {
    const isLoc = n.node_type === 'loc' || n.is_loc
    const locRaw = isLoc ? n.raw?.raw || n.raw : null
    const wbsRaw = !isLoc ? n.raw : null
    const nodeName = isLoc
      ? n.label || locRaw?.name || ''
      : n.node_type === 9
        ? '实体工程'
        : n.label || wbsRaw?.node_name || ''
    const fullPath = parentPath ? `${parentPath} / ${nodeName}` : nodeName

    let specialties = []
    if (isLoc) {
      const item = wbsNodes.find((w) => w.id === n.wbs_node_id)
      specialties = getEffectiveSpecialties(item)
    } else {
      specialties = getEffectiveSpecialties(wbsRaw)
    }

    return {
      id: n.id,
      kind: isLoc ? 'loc' : 'wbs',
      node_name: nodeName,
      node_type: isLoc ? 'loc' : n.node_type,
      type_label: isLoc
        ? '施工部位'
        : n.type_label || entityBreakdownTreeTypeLabel(n.node_type),
      code: isLoc ? locRaw?.code || '' : wbsRaw?.location_code || '',
      specialties: [...specialties],
      specialty_display: formatSpecialtiesDisplay(specialties),
      full_path: fullPath,
      sort_no: isLoc ? Number(locRaw?.sort_no) || 0 : Number(wbsRaw?.sort_no) || 0,
      wbs_node_id: isLoc ? n.wbs_node_id : n.id,
      parent_id: isLoc ? locRaw?.parent_id || '' : wbsRaw?.parent_id || '',
      project_id: isLoc ? locRaw?.project_id : wbsRaw?.project_id,
      status: isLoc ? (locRaw?.status === 0 ? 0 : 1) : 1,
      children: (n.children || []).map((c) => mapRow(c, fullPath)),
    }
  }

  return entityTree.map((n) => mapRow(n, ''))
}

/** 默认展开到单位工程可见：展开「实体工程」根节点 */
export function collectEntityBreakdownDefaultExpandKeys(rows) {
  const keys = []
  const walk = (list) => {
    ;(list || []).forEach((r) => {
      if (r.kind === 'wbs' && r.node_type === 9) keys.push(r.id)
      if (r.children?.length) walk(r.children)
    })
  }
  walk(rows)
  return keys
}

/** 按关键字过滤树（保留命中节点及其祖先） */
export function filterEntityBreakdownTableTree(rows, keyword) {
  const kw = String(keyword || '').trim()
  if (!kw) return rows
  const match = (r) =>
    String(r.node_name || '').includes(kw) ||
    String(r.code || '').includes(kw) ||
    String(r.full_path || '').includes(kw) ||
    String(r.type_label || '').includes(kw)

  const walk = (list) => {
    const out = []
    ;(list || []).forEach((r) => {
      const kids = walk(r.children || [])
      if (match(r) || kids.length) {
        out.push({ ...r, children: kids })
      }
    })
    return out
  }
  return walk(rows)
}
