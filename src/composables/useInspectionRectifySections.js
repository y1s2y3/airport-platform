import { workflowSteps } from '../utils/inspectionRectificationWorkflow'

/**
 * 移动端整改详情 / 审批（确认）页共用的信息块取数口径。
 * 目的：同一张整改单在「整改详情」「整改单审批（确认）」两个页面看到的内容与字段口径完全一致。
 * 命名口径：监理阶段统一叫「复核」，指挥部项目经理与项目部长阶段统一叫「确认」。
 */

/** 整改信息（可多轮，当前实现为一轮）；无任何整改痕迹时返回空数组 */
export function rectifyRectificationRounds(row) {
  if (!row) return []
  if (!(row.rectificationDate || row.rectificationNote || row.rectificationPhotos?.length || row.submitDate)) return []
  return [{
    round: 1,
    date: row.rectificationDate || row.submitDate || '--',
    photos: row.rectificationPhotos?.length ? [...row.rectificationPhotos] : [],
    note: row.rectificationNote || '--',
  }]
}

/** 监理复核记录；整改/验收阶段尚未产生复核结论时不展示（与详情页原有门槛一致） */
export function rectifyReviewRounds(row) {
  if (!row) return []
  if (!(row.reviewDate || row.reviewComment || row.reviewResult)) return []
  if (!['待验收', '待复查', '已关闭'].includes(row.status)) return []
  return [{
    round: 1,
    reviewer: row.reviewer || '--',
    date: row.reviewDate || '--',
    result: row.reviewResult || (row.isRejected ? '不通过' : '通过'),
    comment: row.reviewComment || '--',
  }]
}

/** 指挥部项目经理确认信息（扩展流程最后一环的前置结论） */
export function rectifyManagerConfirmInfo(row) {
  if (!row?.manager || !['待复查', '已关闭'].includes(row.status)) return null
  const passed = row.approvalResult === '通过' || row.status === '已关闭'
  return {
    label: workflowSteps(row).find(step => step.key === 'approval')?.label || '指挥部项目经理确认',
    person: row.manager,
    result: passed ? '通过' : '审批中',
    date: passed ? (row.approvalDate || row.closeDate || '') : '',
    comment: passed ? (row.approvalComment || '--') : '--',
    passed,
  }
}

/** 项目部长确认信息；未进入该节点且无确认痕迹时返回 null */
export function rectifyDepartmentConfirmInfo(row, currentKey) {
  if (!row) return null
  if (!(row.departmentConfirmationDate || currentKey === 'departmentConfirmation')) return null
  return {
    person: row.projectDepartmentHead || '项目部长',
    result: row.departmentConfirmationResult || '待确认',
    date: row.departmentConfirmationDate || '',
    comment: row.departmentConfirmationComment || '',
  }
}
