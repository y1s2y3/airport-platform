/**
 * 风险管理 Mock — 风险点管控配置库 + 风险点管控台账
 * 口径：无业务类型；风险点管控的「风险类型 / 风险点 / 风险细分」选项来自当前项目配置库联动；仅项目级。
 */
import { reactive } from 'vue'
import { nowStr } from '../utils/datetime.js'
import { getProjectLabel } from './laborRealName.js'
import { tierPersonnelCatalog, getTierPersonLabel } from './laborWarningConfig.js'
import { getEntityNodePathLabel } from './constructionLocation.js'

export const RISK_LEVELS = ['重大', '较大', '一般', '低']

/** 配置库新增时可选的风险类型预设（仍可手输） */
export const RISK_TYPE_PRESETS = [
  '高处坠落',
  '起重伤害',
  '机械伤害',
  '车辆伤害',
  '坍塌',
  '触电',
  '物体打击',
  '中毒窒息',
  '火灾爆炸',
  '其他',
]

export const riskPersonCandidates = tierPersonnelCatalog

export function riskPersonLabel(personId) {
  return getTierPersonLabel(personId)
}

function cell(v) {
  if (v === null || v === undefined || String(v).trim() === '') return '--'
  return v
}

export { cell as formatRiskCell }

let configSeq = 3
let controlSeq = 3

/** 风险点管控配置库 */
export const riskPointConfigList = reactive([
  {
    id: 'rpc-001',
    project_id: 'p-000',
    risk_type: '高处坠落',
    risk_point: '临边防护缺失或不到位',
    risk_segment: '楼层临边、基坑临边',
    risk_desc: '作业面临边未设置防护栏杆或防护不严，人员易坠落。',
    control_measure: '临边设置不低于1.2m防护栏杆；挂设安全网；设置警示标识；班前检查。',
    creator: '陈安全',
    created_at: '2026-08-12',
  },
  {
    id: 'rpc-002',
    project_id: 'p-000',
    risk_type: '起重伤害',
    risk_point: '塔吊吊装交叉作业',
    risk_segment: '塔吊覆盖区吊运材料',
    risk_desc: '多台起重设备交叉作业或吊物下方有人，易发生碰撞、打击。',
    control_measure: '统一指挥、划定禁入区；司索工持证上岗；吊装前试吊；风速超限停工。',
    creator: '刘安全',
    created_at: '2026-08-15',
  },
  {
    id: 'rpc-003',
    project_id: 'p-001',
    risk_type: '坍塌',
    risk_point: '深基坑支护变形',
    risk_segment: '基坑开挖与支护',
    risk_desc: '支护结构变形超限或超挖导致基坑坍塌风险。',
    control_measure: '按方案分层开挖；监测预警联动；严禁超挖；雨季加强巡查。',
    creator: '张安全',
    created_at: '2026-08-18',
  },
])

/** 风险点管控台账（风险点位置 = 实体工程分解节点） */
export const riskPointControlList = reactive([
  {
    id: 'rpk-001',
    project_id: 'p-000',
    plan_month: '2026-09',
    risk_type: '高处坠落',
    risk_level: '较大',
    risk_point: '临边防护缺失或不到位',
    risk_segment: '楼层临边、基坑临边',
    risk_location_wbs_id: ['wn-item-1', 'wn-item-2'],
    risk_location: '',
    risk_desc: '东侧临边栏杆尚未封闭，存在坠落风险。',
    control_measure: '临边设置不低于1.2m防护栏杆；挂设安全网；设置警示标识；班前检查。',
    plan_start: '2026-09-01',
    plan_end: '2026-09-30',
    control_person_id: 'u-so-01',
    implement_person_id: 'u-cpm-01',
    creator: '陈安全',
    created_at: '2026-08-28 10:20:00',
  },
  {
    id: 'rpk-002',
    project_id: 'p-000',
    plan_month: '2026-09',
    risk_type: '起重伤害',
    risk_level: '重大',
    risk_point: '塔吊吊装交叉作业',
    risk_segment: '塔吊覆盖区吊运材料',
    risk_location_wbs_id: ['wn-item-2'],
    risk_location: '',
    risk_desc: '塔吊与汽车吊交叉作业时段集中，需加强指挥。',
    control_measure: '统一指挥、划定禁入区；司索工持证上岗；吊装前试吊；风速超限停工。',
    plan_start: '2026-09-05',
    plan_end: '2026-09-25',
    control_person_id: 'u-so-02',
    implement_person_id: 'u-site-01',
    creator: '刘安全',
    created_at: '2026-08-29 14:05:00',
  },
])

/** 位置节点标识统一为字符串数组（兼容历史单值） */
export function normalizeLocationWbsIds(value) {
  if (Array.isArray(value)) return value.map((id) => String(id || '').trim()).filter(Boolean)
  if (typeof value === 'string' && value.trim()) return [value.trim()]
  return []
}

/** 列表/详情展示：优先实体工程分解路径（多选以顿号拼接） */
export function riskLocationLabel(row) {
  if (!row) return '--'
  const ids = normalizeLocationWbsIds(row.risk_location_wbs_id)
  if (ids.length) {
    const paths = ids.map((id) => getEntityNodePathLabel(id)).filter(Boolean)
    if (paths.length) return paths.join('、')
  }
  return cell(row.risk_location)
}

export function listRiskPointConfigs(projectId, filters = {}) {
  const { risk_type = '', risk_point = '' } = filters
  return riskPointConfigList.filter((row) => {
    if (row.project_id !== projectId) return false
    if (risk_type && row.risk_type !== risk_type) return false
    if (risk_point && !(row.risk_point || '').includes(risk_point.trim())) return false
    return true
  })
}

/** 当前项目配置库中已出现的风险类型（供风险点管控下拉） */
export function listConfigRiskTypes(projectId) {
  const set = new Set()
  riskPointConfigList.forEach((row) => {
    if (row.project_id === projectId && row.risk_type) set.add(row.risk_type)
  })
  return [...set]
}

/** 指定风险类型下的风险点（去重，供管控登记联动） */
export function listConfigRiskPoints(projectId, riskType) {
  const set = new Set()
  riskPointConfigList.forEach((row) => {
    if (row.project_id === projectId && row.risk_type === riskType && row.risk_point) {
      set.add(row.risk_point)
    }
  })
  return [...set]
}

/** 指定类型+风险点下的风险细分（去重；空细分不参与联动选项） */
export function listConfigRiskSegments(projectId, riskType, riskPoint) {
  const set = new Set()
  riskPointConfigList.forEach((row) => {
    if (
      row.project_id === projectId
      && row.risk_type === riskType
      && row.risk_point === riskPoint
    ) {
      const seg = (row.risk_segment || '').trim()
      if (seg) set.add(seg)
    }
  })
  return [...set]
}

/** 按类型+风险点+细分匹配配置行（细分按 trim 比较；多条取第一条） */
export function findRiskPointConfig(projectId, riskType, riskPoint, riskSegment = '') {
  const seg = (riskSegment || '').trim()
  return (
    riskPointConfigList.find(
      (row) =>
        row.project_id === projectId
        && row.risk_type === riskType
        && row.risk_point === riskPoint
        && (row.risk_segment || '').trim() === seg,
    ) || null
  )
}

/** 校验管控登记的类型/风险点/细分是否落在配置库 */
export function matchControlToConfig(projectId, riskType, riskPoint, riskSegment = '') {
  if (!listConfigRiskTypes(projectId).includes(riskType)) {
    return { ok: false, msg: '风险类型须从配置库选择' }
  }
  if (!listConfigRiskPoints(projectId, riskType).includes(riskPoint)) {
    return { ok: false, msg: '风险点须从配置库选择，并与风险类型联动' }
  }
  const segs = listConfigRiskSegments(projectId, riskType, riskPoint)
  const seg = (riskSegment || '').trim()
  if (!segs.includes(seg)) {
    return { ok: false, msg: '风险细分须从配置库选择，并与风险类型、风险点联动' }
  }
  return { ok: true, config: findRiskPointConfig(projectId, riskType, riskPoint, seg) }
}

export function getRiskPointConfig(id) {
  return riskPointConfigList.find((r) => r.id === id) || null
}

export function saveRiskPointConfig(projectId, payload, editorName = '系统管理员') {
  const risk_type = (payload.risk_type || '').trim()
  const risk_point = (payload.risk_point || '').trim()
  const risk_segment = (payload.risk_segment || '').trim()
  const risk_desc = (payload.risk_desc || '').trim()
  const control_measure = (payload.control_measure || '').trim()
  // 必填：风险类型、风险点、风险细分、管控措施
  if (!risk_type) return { ok: false, msg: '请填写风险类型' }
  if (!risk_point) return { ok: false, msg: '请填写风险点' }
  if (risk_point.length > 100) return { ok: false, msg: '风险点不超过100字' }
  if (!risk_segment) return { ok: false, msg: '请填写风险细分' }
  if (risk_segment.length > 100) return { ok: false, msg: '风险细分不超过100字' }
  if (risk_desc.length > 300) return { ok: false, msg: '风险描述不超过300字' }
  if (!control_measure) return { ok: false, msg: '请填写管控措施' }
  if (control_measure.length > 300) return { ok: false, msg: '管控措施不超过300字' }
  if (!projectId) return { ok: false, msg: '请先选择项目' }

  const dup = riskPointConfigList.find(
    (r) =>
      r.project_id === projectId
      && r.risk_type === risk_type
      && r.risk_point === risk_point
      && r.id !== payload.id,
  )
  // 相同「风险类型+风险点」仅提醒，不强制拦截；由调用方确认后带 allowDuplicate 再存
  if (dup && !payload.allowDuplicate) {
    return {
      ok: false,
      code: 'DUPLICATE_TYPE_POINT',
      msg: '同项目下已存在相同「风险类型+风险点」，是否仍要保存？',
    }
  }

  if (payload.id) {
    const row = riskPointConfigList.find((r) => r.id === payload.id && r.project_id === projectId)
    if (!row) return { ok: false, msg: '记录不存在' }
    Object.assign(row, {
      risk_type,
      risk_point,
      risk_segment,
      risk_desc,
      control_measure,
    })
    return { ok: true, data: row }
  }

  const row = {
    id: `rpc-${String(++configSeq).padStart(3, '0')}`,
    project_id: projectId,
    risk_type,
    risk_point,
    risk_segment,
    risk_desc,
    control_measure,
    creator: editorName,
    created_at: nowStr().slice(0, 10),
  }
  riskPointConfigList.unshift(row)
  return { ok: true, data: row }
}

/** 台账引用条数：同项目「风险类型+风险点+风险细分」与配置项一致 */
export function countControlRefsToConfig(projectId, configRow) {
  if (!configRow || !projectId) return 0
  const type = (configRow.risk_type || '').trim()
  const point = (configRow.risk_point || '').trim()
  const segment = (configRow.risk_segment || '').trim()
  return riskPointControlList.filter(
    (r) =>
      r.project_id === projectId
      && (r.risk_type || '').trim() === type
      && (r.risk_point || '').trim() === point
      && (r.risk_segment || '').trim() === segment,
  ).length
}

export function removeRiskPointConfig(projectId, id) {
  const idx = riskPointConfigList.findIndex((r) => r.id === id && r.project_id === projectId)
  if (idx < 0) return { ok: false, msg: '记录不存在' }
  const row = riskPointConfigList[idx]
  const refCount = countControlRefsToConfig(projectId, row)
  if (refCount > 0) {
    return {
      ok: false,
      code: 'CONFIG_IN_USE',
      msg: `该配置已被 ${refCount} 条风险辨识引用，请先处理台账后再删除`,
    }
  }
  riskPointConfigList.splice(idx, 1)
  return { ok: true }
}

export function listRiskPointControls(projectId, filters = {}) {
  const { plan_month = '', risk_type = '', risk_level = '' } = filters
  return riskPointControlList.filter((row) => {
    if (row.project_id !== projectId) return false
    if (plan_month && row.plan_month !== plan_month) return false
    if (risk_type && row.risk_type !== risk_type) return false
    if (risk_level && row.risk_level !== risk_level) return false
    return true
  })
}

export function getRiskPointControl(id) {
  return riskPointControlList.find((r) => r.id === id) || null
}

export function getConfigProjectName(projectId) {
  return getProjectLabel(projectId) || '--'
}

export function saveRiskPointControl(projectId, payload, editorName = '系统管理员') {
  if (!projectId) return { ok: false, msg: '请先选择项目' }
  const plan_month = (payload.plan_month || '').trim()
  const risk_type = (payload.risk_type || '').trim()
  const risk_level = (payload.risk_level || '').trim()
  const risk_point = (payload.risk_point || '').trim()
  const risk_segment = (payload.risk_segment || '').trim()
  const risk_location_wbs_id = normalizeLocationWbsIds(payload.risk_location_wbs_id)
  const risk_location = risk_location_wbs_id
    .map((id) => getEntityNodePathLabel(id))
    .filter(Boolean)
    .join('、')
  const risk_desc = (payload.risk_desc || '').trim()
  const control_measure = (payload.control_measure || '').trim()
  const plan_start = (payload.plan_start || '').trim()
  const plan_end = (payload.plan_end || '').trim()
  const control_person_id = payload.control_person_id || ''
  const implement_person_id = payload.implement_person_id || ''

  // 必填：计划月份、风险类型、风险等级、风险点、管控措施、管控责任人、实施责任人
  // 选填：风险细分、位置（实体工程分解）、描述、计划起止
  if (!plan_month) return { ok: false, msg: '请选择计划月份' }
  if (!risk_type) return { ok: false, msg: '请选择风险类型' }
  if (!listConfigRiskTypes(projectId).includes(risk_type)) {
    return { ok: false, msg: '风险类型须从配置库已有类型中选择，请先在配置库维护' }
  }
  if (!risk_level) return { ok: false, msg: '请选择风险等级' }
  if (!RISK_LEVELS.includes(risk_level)) return { ok: false, msg: '风险等级无效' }
  if (!risk_point) return { ok: false, msg: '请选择风险点' }
  if (!(risk_segment || '').trim()) return { ok: false, msg: '请选择风险细分' }
  const cfgMatch = matchControlToConfig(projectId, risk_type, risk_point, risk_segment)
  if (!cfgMatch.ok) return cfgMatch
  if (risk_desc.length > 300) return { ok: false, msg: '风险描述不超过300字' }
  if (!control_measure) return { ok: false, msg: '请填写管控措施' }
  if (control_measure.length > 300) return { ok: false, msg: '管控措施不超过300字' }
  if (plan_start && plan_end && plan_end < plan_start) {
    return { ok: false, msg: '计划结束时间不能早于开始时间' }
  }
  if (!control_person_id) return { ok: false, msg: '请选择管控责任人' }
  if (!implement_person_id) return { ok: false, msg: '请选择实施责任人' }

  const base = {
    plan_month,
    risk_type,
    risk_level,
    risk_point,
    risk_segment,
    risk_location_wbs_id,
    risk_location,
    risk_desc,
    control_measure,
    plan_start,
    plan_end,
    control_person_id,
    implement_person_id,
  }

  if (payload.id) {
    const row = riskPointControlList.find((r) => r.id === payload.id && r.project_id === projectId)
    if (!row) return { ok: false, msg: '记录不存在' }
    Object.assign(row, base)
    return { ok: true, data: row }
  }

  const row = {
    id: `rpk-${String(++controlSeq).padStart(3, '0')}`,
    project_id: projectId,
    ...base,
    creator: editorName,
    created_at: nowStr(),
  }
  riskPointControlList.unshift(row)
  return { ok: true, data: row }
}

export function removeRiskPointControl(projectId, id) {
  const idx = riskPointControlList.findIndex((r) => r.id === id && r.project_id === projectId)
  if (idx < 0) return { ok: false, msg: '记录不存在' }
  riskPointControlList.splice(idx, 1)
  return { ok: true }
}
