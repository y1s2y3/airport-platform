/**
 * 向档案系统传输的「工程代号」拼接（需求变更 CR-07）
 *
 * 格式：建设单位代号-建设项目代号-单项工程代号-专业工程代号-单位&子单位工程代号.分部&子分部工程代号.分项工程代号
 * 示例：SZJC-HZT2-02-MHCD-01010300.0101.03
 *
 * 规则要点：
 * - 建设单位代号：系统固定常量 SZJC；
 * - 单位&子单位：单位 4 位 + 子单位 4 位，子单位不存在时后四位补 0（01010000）；
 * - 分部&子分部：分部 2 位 + 子分部 2 位，子分部不存在时后两位补 0（0100）；
 * - 分项 2 位；编码只到分项层，同一分项下多个检验批共用同一编码。
 */
import { OWNER_UNIT_CODE } from './projectCodeFields.js'

export const WBS_TYPE = {
  UNIT: 1,
  SUB_UNIT: 2,
  DIVISION: 3,
  SUB_DIVISION: 4,
  ITEM: 5,
}

/** 定长数字：不足前补 0，超长取后 N 位 */
function fixedDigits(value, len) {
  const raw = String(value ?? '').replace(/\D/g, '')
  if (!raw) return ''
  return raw.length >= len ? raw.slice(-len) : raw.padStart(len, '0')
}

/** 由节点向上解析单位/子单位/分部/子分部/分项代号（检验批向上归到分项） */
export function resolveEntityCodeChain(nodeId, nodes) {
  const byId = new Map((nodes || []).map((n) => [n.id, n]))
  const chain = {
    unit: '',
    subUnit: '',
    division: '',
    subDivision: '',
    item: '',
    itemNode: null,
  }
  let cur = byId.get(nodeId) || null
  let guard = 0
  while (cur && guard < 30) {
    const type = Number(cur.node_type)
    const code = String(cur.location_code || '')
    if (type === WBS_TYPE.UNIT && !chain.unit) chain.unit = code
    else if (type === WBS_TYPE.SUB_UNIT && !chain.subUnit) chain.subUnit = code
    else if (type === WBS_TYPE.DIVISION && !chain.division) chain.division = code
    else if (type === WBS_TYPE.SUB_DIVISION && !chain.subDivision) chain.subDivision = code
    else if (type === WBS_TYPE.ITEM && !chain.item) {
      chain.item = code
      chain.itemNode = cur
    }
    cur = cur.parent_id ? byId.get(cur.parent_id) : null
    guard += 1
  }
  return chain
}

/**
 * 拼接档案工程代号
 * @param {{ project?: object, node?: object|string, nodes?: object[] }} args
 *   project 需含 constructionProjectCode / singleProjectCode / specialtyProjectCode
 *   node 为 WBS 节点对象或节点 id
 * @returns {{ ok: boolean, code: string, segments: object[], missing: string[] }}
 */
export function buildArchiveEngineeringCode({ project, node, nodes } = {}) {
  const nodeId = typeof node === 'string' ? node : node?.id
  const chain = resolveEntityCodeChain(nodeId, nodes)

  const headParts = [
    OWNER_UNIT_CODE,
    String(project?.constructionProjectCode || '').trim().toUpperCase(),
    String(project?.singleProjectCode || '').trim(),
    String(project?.specialtyProjectCode || '').trim().toUpperCase(),
  ]

  const unitGroup = chain.unit
    ? `${fixedDigits(chain.unit, 4)}${chain.subUnit ? fixedDigits(chain.subUnit, 4) : '0000'}`
    : ''
  const divisionGroup = chain.division
    ? `${fixedDigits(chain.division, 2)}${chain.subDivision ? fixedDigits(chain.subDivision, 2) : '00'}`
    : ''
  const itemCode = chain.item ? fixedDigits(chain.item, 2) : ''

  const missing = []
  if (!headParts[1]) missing.push('建设项目代号')
  if (!headParts[2]) missing.push('单项工程代号')
  if (!headParts[3]) missing.push('专业工程代号')
  if (!unitGroup) missing.push('单位工程代号')
  if (!divisionGroup) missing.push('分部工程代号')
  if (!itemCode) missing.push('分项工程代号')

  const segments = [
    { key: '建设单位代号', value: headParts[0], note: '系统固定常量' },
    { key: '建设项目代号', value: headParts[1] || '--', note: '项目基础信息' },
    { key: '单项工程代号', value: headParts[2] || '--', note: '项目基础信息' },
    { key: '专业工程代号', value: headParts[3] || '--', note: '项目基础信息' },
    {
      key: '单位&子单位工程代号',
      value: unitGroup || '--',
      note: chain.subUnit ? '单位 4 位 + 子单位 4 位' : '子单位工程不存在，后四位补 0',
    },
    {
      key: '分部&子分部工程代号',
      value: divisionGroup || '--',
      note: chain.subDivision ? '分部 2 位 + 子分部 2 位' : '子分部工程不存在，后两位补 0',
    },
    { key: '分项工程代号', value: itemCode || '--', note: '实体工程分解·分项节点（同分项多检验批共用）' },
  ]

  const code = missing.length
    ? ''
    : `${headParts[0]}-${headParts[1]}-${headParts[2]}-${headParts[3]}-${unitGroup}.${divisionGroup}.${itemCode}`

  return { ok: missing.length === 0, code, segments, missing }
}

/** 取节点所属项目 */
export function resolveProjectByNode(node, projects) {
  const projectId = String(node?.project_id || '')
  return (projects || []).find((p) => p.id === projectId) || null
}
