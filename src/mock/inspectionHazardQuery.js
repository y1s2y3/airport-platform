/**
 * 巡检隐患查询（合并 Web 种子 + 移动端整改）
 * 独立模块，避免 inspectionDemoData ↔ useMobileRectification ↔ mobileInspectionTasks 循环依赖。
 */
import { inspectionHazards } from './inspectionDemoData.js'
import {
  getMobileRectification,
  listMobileHazardsAsInspectionRows,
} from '../composables/useMobileRectification.js'

/** Web 批量种子 + 移动端整改记录（同一 id 以移动端为准） */
export function listInspectionHazards() {
  const mobileRows = listMobileHazardsAsInspectionRows()
  const mobileIds = new Set(mobileRows.map((item) => item.id))
  return [...mobileRows, ...inspectionHazards.filter((item) => !mobileIds.has(item.id))]
}

export function getInspectionHazard(id) {
  if (getMobileRectification(id)) {
    return listMobileHazardsAsInspectionRows().find((item) => item.id === id) || null
  }
  return inspectionHazards.find((item) => item.id === id) || null
}

export function getInspectionHazardDetail(id) {
  const row = getInspectionHazard(id)
  if (!row) return null

  const detail = {
    rn: row.rectifyNo,
    tn: row.taskNo,
    pj: row.project,
    project_id: row.project_id,
    cat: row.inspectionCategory,
    rf: row.rectifier,
    rv: row.reviewer,
    dl: row.deadline,
    st: row.status,
    cd: row.closeDate,
    hazard: { desc: row.desc, photos: [...(row.hazardPhotos || [])] },
    flow: [{ a: '下发整改单', d: `${row.issueDate || ''} 09:30`.trim() }],
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
    detail.flow.push({ a: '整改人提交整改结果', d: row.rectDate ? `${row.rectDate} 16:20` : '' })
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
      })
    } else if (row.reviewResult === '通过' || (!row.isRejected && row.reviewDate)) {
      detail.flow.push({ a: '复查人复查通过', d: row.reviewDate ? `${row.reviewDate} 10:10` : '' })
    }
  }
  if (row.status === '已复查') {
    detail.managerApproval = { manager: row.manager, status: '审批中', comment: '--' }
    detail.flow.push({ a: '待项目经理审批', d: '', cur: true })
  } else if (row.status === '已关闭') {
    detail.managerApproval = {
      manager: row.manager,
      date: row.closeDate,
      status: '通过',
      comment: row.approvalComment || '--',
    }
    detail.flow.push({ a: '项目经理审批通过，整改单关闭', d: row.closeDate ? `${row.closeDate} 11:00` : '' })
  } else if (row.status === '待复查') {
    if (row.approvalRejected) {
      detail.flow.push({
        a: '项目经理审批不通过，退回复查',
        d: '',
        dt: row.approvalReason || '',
      })
    }
    detail.flow.push({ a: '待复查人审核', d: '', cur: true })
  } else if (row.isRejected) {
    detail.flow.push({ a: '等待整改人重新整改', d: '', cur: true })
  } else {
    detail.flow.push({ a: '等待整改人执行', d: '', cur: true })
  }
  return detail
}
