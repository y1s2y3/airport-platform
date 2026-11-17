/**
 * 巡检隐患查询（合并 Web 种子 + 移动端整改）
 * 独立模块，避免 inspectionDemoData ↔ useMobileRectification ↔ mobileInspectionTasks 循环依赖。
 */
import { isQualityA, workflowFlowRecords, workflowSteps, currentWorkflowStep } from '../utils/inspectionRectificationWorkflow'
import { inspectionHazards } from './inspectionDemoData.js'
import {
  getMobileRectification,
  listMobileHazardsAsInspectionRows,
} from '../composables/useMobileRectification.js'
import { getInspectionPersonConfig, getInspectorById } from '../composables/useInspectionPersonConfig.js'

/** Web 批量种子 + 移动端整改记录（同一 id 以移动端为准） */
export function listInspectionHazards() {
  const mobileRows = listMobileHazardsAsInspectionRows().map(withDisplayDefaults)
  const mobileIds = new Set(mobileRows.map((item) => item.id))
  return [...mobileRows, ...inspectionHazards.filter((item) => !mobileIds.has(item.id)).map(withDisplayDefaults)]
}

/** 历史种子缺少隐患等级/当前节点时，按分类与状态补齐展示值（不改原始数据）。 */
function withDisplayDefaults(row) {
  const statusNode = { 待整改: '施工单位整改', 待验收: '监理单位复核', 待复查: '项目经理审批', 已关闭: '流程结束' }[row.status] || row.status || ''
  // 历史种子里的旧节点措辞统一为新流程名称。
  const legacyNode = { 整改人整改: '施工单位整改', 复查人复查: '监理单位复核' }[row.currentNode] || ''
  let currentNode = legacyNode || row.currentNode || ''
  if (!currentNode) {
    const step = workflowSteps(row).find(item => item.status === row.status && !row[item.date] && !(item.result && row[item.result]))
    currentNode = step?.label || statusNode
  }
  return {
    ...row,
    hazardLevel: row.hazardLevel || (row.inspectionCategory === '质量' ? 'C' : 'Ⅲ一般隐患'),
    currentNode,
  }
}

export function getInspectionHazard(id) {
  if (getMobileRectification(id)) {
    return listMobileHazardsAsInspectionRows().find((item) => item.id === id) || null
  }
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
  if (!row) return null
  const inspector = resolveConfiguredInspector(row)

  const detail = {
    rn: row.rectifyNo,
    tn: row.taskNo,
    pj: row.project,
    project_id: row.project_id,
    cat: row.inspectionCategory,
    rf: row.rectifier,
    rv: row.reviewer,
    ccPersons: row.ccPersons || '',
    dl: row.deadline,
    st: row.status,
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

  if (row.rectDate || (row.rectificationPhotos && row.rectificationPhotos.length) || row.rectificationNote) {
    detail.rectification = {
      date: row.rectDate || '--',
      photos: [...(row.rectificationPhotos || [])],
      note: row.rectificationNote || '--',
    }
    detail.flow.push({ a: '整改人提交整改结果', d: row.rectDate ? `${row.rectDate} 16:20` : '', by: row.rectifier || '' })
  }
  if (row.reviewDate || row.reviewComment || row.reviewResult) {
    detail.reviews = [{
      round: 1,
      date: row.reviewDate || '--',
      comment: row.reviewComment || row.rejectReason || '--',
      result: row.reviewResult || (row.isRejected ? '不通过' : '--'),
    }]
    if (row.isRejected) {
      detail.flow.push({
        a: '复查不通过，退回继续整改',
        d: row.reviewDate ? `${row.reviewDate} 10:10` : '',
        dt: row.rejectReason || row.reviewComment,
        by: row.reviewer || '',
      })
    } else if (row.reviewResult === '通过' || (!row.isRejected && row.reviewDate)) {
      detail.flow.push({ a: '复查人复查通过', d: row.reviewDate ? `${row.reviewDate} 10:10` : '', by: row.reviewer || '' })
    }
  }
  if (row.status === '待复查') {
    detail.managerApproval = { manager: row.manager, status: '审批中', comment: '--' }
    detail.flow.push({ a: '待项目经理审批', d: '', cur: true, by: row.manager || '' })
  } else if (row.status === '已关闭') {
    detail.managerApproval = {
      manager: row.manager,
      date: row.closeDate,
      status: '通过',
      comment: row.approvalComment || '--',
    }
    detail.flow.push({ a: '项目经理审批通过，整改单关闭', d: row.closeDate ? `${row.closeDate} 11:00` : '', by: row.manager || '' })
  } else if (row.status === '待验收') {
    if (row.approvalRejected) {
      detail.flow.push({
        a: '项目经理审批不通过，退回复查',
        d: '',
        dt: row.approvalReason || '',
        by: row.manager || '',
      })
    }
    // 待验收阶段可能停在“监理单位复核”或“监理单位项目总监验收”，按实际节点展示。
    const acceptanceNode = currentWorkflowStep(row)
    detail.flow.push({ a: acceptanceNode ? `待${acceptanceNode.label}` : '待监理复查', d: '', cur: true, by: acceptanceNode?.actor || row.reviewer || '' })
  } else if (row.isRejected) {
    detail.flow.push({ a: '等待整改人重新整改', d: '', cur: true, by: row.rectifier || '' })
  } else {
    detail.flow.push({ a: '等待整改人执行', d: '', cur: true, by: row.rectifier || '' })
  }
  const live = getMobileRectification(id)
  if (live) detail.flow = workflowFlowRecords(live)
  return detail
}
