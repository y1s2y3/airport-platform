/**
 * 巡检隐患查询（合并 Web 种子 + 移动端整改）
 * 独立模块，避免 inspectionDemoData ↔ useMobileRectification ↔ mobileInspectionTasks 循环依赖。
 */
import { currentWorkflowLabel, workflowFlowRecords, workflowSteps } from '../utils/inspectionRectificationWorkflow'
import { inspectionHazards } from './inspectionDemoData.js'
import { getInspectionTaskForRectification } from './mobileInspectionTasks.js'
import { getInspectionTaskPhotos } from '../utils/inspectionTaskPhotos.js'
import {
  getMobileRectification,
  listMobileHazardsAsInspectionRows,
  listMobileHazardsIncludingVoided,
  mapMobileRecordToHazardRow,
} from '../composables/useMobileRectification.js'
import { getInspectionPersonConfig, getInspectorById } from '../composables/useInspectionPersonConfig.js'
import { normalizeFlowNodeName } from '../config/hazardFlowNodes.js'

/** Web 批量种子 + 移动端整改记录（同一 id 以移动端为准）；includeVoided=true 时包含已作废整改单。 */
export function listInspectionHazards({ includeVoided = false } = {}) {
  const mobileRows = (includeVoided ? listMobileHazardsIncludingVoided() : listMobileHazardsAsInspectionRows()).map(withDisplayDefaults)
  const mobileIds = new Set(mobileRows.map((item) => item.id))
  return [...mobileRows, ...inspectionHazards.filter((item) => !mobileIds.has(item.id) && getMobileRectification(item.id)?.status !== '已作废').map(withDisplayDefaults)]
}

/** 历史种子缺少隐患等级/当前节点时，按分类与状态补齐展示值（不改原始数据）。 */
function withDisplayDefaults(row) {
  const statusNode = { 待整改: '施工单位整改', 待验收: '监理单位复核', 待复查: '项目经理审批' }[row.status] || row.status || ''
  // 历史种子里的旧节点措辞统一为新流程名称。
  const legacyNode = { 整改人整改: '施工单位整改', 复查人复查: '监理单位复核' }[row.currentNode] || ''
  let currentNode = legacyNode || row.currentNode || ''
  if (['已关闭', '已作废'].includes(row.status)) {
    currentNode = '已关闭'
  } else if (!currentNode) {
    const step = workflowSteps(row).find(item => item.status === row.status && !row[item.date] && !(item.result && row[item.result]))
    currentNode = step?.label || statusNode
  }
  return {
    ...row,
    inspector: row.inspector || resolveConfiguredInspector(row),
    hazardLevel: row.hazardLevel || (row.inspectionCategory === '质量' ? 'C' : 'Ⅲ一般隐患'),
    currentNode: currentNode === '已关闭' ? currentNode : normalizeFlowNodeName(currentNode),
  }
}

export function getInspectionHazard(id) {
  const live = getMobileRectification(id)
  if (live) return live.deletion ? null : mapMobileRecordToHazardRow(live)
  return inspectionHazards.find((item) => item.id === id) || null
}

/**
 * 「下发整改单」处理人：取巡检管理「人员配置」中该项目的巡检人。
 * 依据：人员配置页说明「保存后任务和隐患将默认带入巡检人、整改人及复查人」。
 * 未配置巡检人时返回空串（页面显示 --），不用兜底值冒充。
 */
function resolveConfiguredInspector(row) {
  const config = getInspectionPersonConfig(row.project_id || row.projectId || '', row.inspectionCategory || '安全')
  const person = getInspectorById(config?.inspectorId)
  return person ? `${person.name}（${person.role}）` : ''
}

export function getInspectionHazardDetail(id) {
  const row = getInspectionHazard(id)
  return row ? buildInspectionHazardDetail(row) : null
}

export function buildInspectionHazardDetail(row, live = getMobileRectification(row.id)) {
  const inspector = row.inspector || resolveConfiguredInspector(row)

  const detail = {
    rn: row.rectifyNo,
    tn: row.taskNo,
    inspectionPhotos: getInspectionTaskPhotos(getInspectionTaskForRectification(live || row)),
    pj: row.project,
    project_id: row.project_id,
    cat: row.inspectionCategory,
    rf: row.rectifier,
    rv: row.reviewer,
    inspector,
    issueDate: row.issueDate,
    ccPersons: row.issueCcPersons ?? row.ccPersons ?? '',
    issueCcPersons: row.issueCcPersons ?? row.ccPersons ?? '',
    completionCcPersons: row.completionCcPersons || '',
    dl: row.deadline,
    st: row.status,
    voidRequest: row.voidRequest,
    deletion: row.deletion,
    currentNode: live ? currentWorkflowLabel(live) : withDisplayDefaults(row).currentNode,
    cd: row.closeDate,
    hazard: {
      category: row.hazardCategory,
      level: row.hazardLevel || '',
      rectifyRequirement: row.rectifyRequirement || '',
      desc: row.desc,
      photos: [...(row.hazardPhotos || [])],
    },
    flow: [{ a: '下发整改单', d: `${row.issueDate || ''} 09:30`.trim(), by: inspector }],
  }

  if (row.isRejected && row.rejectReason) {
    detail.prevReview = {
      date: row.reviewDate || '',
      comment: row.rejectReason,
      result: '不通过',
    }
  }

  const rectDate = row.rectificationDate || row.rectDate
  if (rectDate || (row.rectificationPhotos && row.rectificationPhotos.length) || row.rectificationNote) {
    detail.rectification = {
      date: rectDate || '--',
      photos: [...(row.rectificationPhotos || [])],
      note: row.rectificationNote || '--',
    }
  }
  if (row.reviewDate || row.reviewComment || row.reviewResult) {
    detail.reviews = [{
      round: 1,
      date: row.reviewDate || '--',
      comment: row.reviewComment || row.rejectReason || '--',
      result: row.reviewResult || (row.isRejected ? '不通过' : '--'),
    }]
  }
  // 只有节点已办结（有结论）才展示确认信息；仍在办理中的节点不展示空块。
  const approvalDone = Boolean(row.approvalDate || row.approvalResult || row.status === '已关闭')
  if (approvalDone) {
    detail.managerApproval = {
      manager: row.manager,
      status: row.approvalResult || '通过',
      date: row.approvalDate || (row.status === '已关闭' ? row.closeDate : ''),
      comment: row.approvalComment || '--',
    }
  }
  const departmentDone = Boolean(row.departmentConfirmationDate || row.departmentConfirmationResult)
  if (departmentDone) {
    detail.departmentConfirmation = {
      actor: row.projectDepartmentHead || '项目部长',
      date: row.departmentConfirmationDate,
      status: row.departmentConfirmationResult || '已提交',
      comment: row.departmentConfirmationComment,
    }
  }
  // 流程记录统一按流程节点生成，保证与「状态 / 当前流程节点」一致。
  detail.flow = workflowFlowRecords(live || row)
  return detail
}
