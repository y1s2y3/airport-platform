import { utils as XLSXUtils, write as xlsxWrite } from 'xlsx'
import { HAZARD_ISSUE_SOURCES, isHazardIssueOverdue } from './hazardIssueSummary.js'

/** 隐患清单汇总导出：按来源分 4 个 sheet，字段对齐各来源详情（不含流程记录）。 */

const SOURCE_META = {
  inspection: { sheet: '安质巡检', label: '安质巡检' },
  supervision: { sheet: '监理会议', label: '监理会议' },
  dispatch: { sheet: '调度隐患', label: '调度隐患' },
  externalQuality: { sheet: '随手拍', label: '随手拍' },
}

const text = (v) => (v == null || v === '' ? '--' : String(v))
const photoNames = (photos) => {
  if (!Array.isArray(photos) || !photos.length) return '--'
  return photos
    .map((p) => (typeof p === 'string' ? p : p?.name || p?.url || ''))
    .filter(Boolean)
    .join('、') || '--'
}
const hazardTypeText = (type) => ({ safety: '安全', quality: '质量', other: '其他' }[type] || text(type))
const sourceTypeText = (type) => ({ live: '实时', playback: '回放', meeting: '会议' }[type] || text(type))
const overdueText = (row) => {
  const value = isHazardIssueOverdue(row)
  return value === null ? '--' : value ? '是' : '否'
}
const dateOnly = (v) => (v ? String(v).slice(0, 10) : '--')

/* ============ 各来源列定义（与详情页字段一致，去除流程记录） ============ */

const inspectionColumns = [
  ['整改单编号', (r) => text(r.raw.rectifyNo)],
  ['巡检任务单编号', (r) => text(r.raw.taskNo)],
  ['项目名称', (r) => text(r.projectName)],
  ['巡检分类', (r) => text(r.categoryLabel)],
  ['登记人', (r) => text(r.raw.inspector || r.registrant)],
  ['整改单下发日期', (r) => text(r.raw.issueDate)],
  ['整改人', (r) => text(r.raw.rectifier)],
  ['复查人', (r) => text(r.raw.reviewer)],
  ['截止日期', (r) => text(r.raw.deadline)],
  ['状态', (r) => text(r.status)],
  ['当前流程节点', (r) => text(r.raw.currentNode)],
  ['关闭日期', (r) => text(r.raw.closeDate)],
  ['隐患类别', (r) => text(r.raw.hazardCategory)],
  ['隐患等级', (r) => text(r.raw.hazardLevel)],
  ['整改要求', (r) => text(r.raw.rectifyRequirement)],
  ['隐患说明', (r) => text(r.raw.hazard || r.raw.desc)],
  ['隐患照片', (r) => photoNames(r.raw.hazardPhotos)],
  ['巡检照片', (r) => photoNames(r.raw.inspectionPhotos)],
  ['整改日期', (r) => text(r.raw.rectificationDate)],
  ['整改照片', (r) => photoNames(r.raw.rectificationPhotos)],
  ['整改说明', (r) => text(r.raw.rectificationNote)],
  ['复查日期', (r) => text(r.raw.reviewDate)],
  ['复查结论', (r) => text(r.raw.reviewResult)],
  ['复查意见', (r) => text(r.raw.reviewComment)],
  ['审批人', (r) => text(r.raw.manager || r.raw.approver)],
  ['审批结果', (r) => text(r.raw.approvalResult)],
  ['审批日期', (r) => text(r.raw.approvalDate)],
  ['审批意见', (r) => text(r.raw.approvalComment)],
  ['确认人', (r) => text(r.raw.projectDepartmentHead || r.raw.departmentConfirmationActor)],
  ['确认结果', (r) => text(r.raw.departmentConfirmationResult)],
  ['确认日期', (r) => text(r.raw.departmentConfirmationDate)],
  ['确认意见', (r) => text(r.raw.departmentConfirmationComment)],
  ['下发整改单抄送', (r) => text(r.raw.issueCcPersons)],
  ['整改单完成抄送', (r) => text(r.raw.completionCcPersons)],
  ['逾期', (r) => overdueText(r)],
]

const supervisionColumns = [
  ['项目名称', (r) => text(r.projectName)],
  ['隐患编号', (r) => text(r.raw.id)],
  ['隐患类型', (r) => hazardTypeText(r.raw.hazardType)],
  ['隐患描述', (r) => text(r.raw.description)],
  ['隐患等级', (r) => text(r.raw.hazardLevel)],
  ['登记人', (r) => text(r.raw.registrant)],
  ['隐患图片', (r) => photoNames(r.raw.hazardPhotos)],
  ['整改说明', (r) => text(r.raw.rectifyRemark)],
  ['整改图片', (r) => photoNames(r.raw.rectifyPhotos)],
  ['备注', (r) => text(r.raw.remark)],
  ['整改状态', (r) => text(r.status)],
  ['来源', (r) => text(r.raw.source)],
  ['关联会议', (r) => text(r.raw.meetingId)],
  ['登记时间', (r) => text(r.raw.uploadTime)],
]

const dispatchColumns = [
  ['项目名称', (r) => text(r.projectName)],
  ['隐患类型', (r) => hazardTypeText(r.raw.hazardType)],
  ['隐患描述', (r) => text(r.raw.description)],
  ['隐患类别', (r) => text(r.raw.hazardCategory)],
  ['隐患等级', (r) => text(r.raw.hazardLevel)],
  ['整改要求', (r) => text(r.raw.rectifyRequirement)],
  ['复查人', (r) => text(r.raw.reviewer)],
  ['下发整改单抄送', (r) => text(r.raw.issueCcPersons)],
  ['完成抄送', (r) => text(r.raw.completionCcPersons)],
  ['隐患照片', (r) => photoNames(r.raw.hazardPhotos)],
  ['整改状态', (r) => text(r.status)],
  ['当前流程节点', (r) => text(r.raw.currentNode)],
  ['整改人', (r) => text(r.raw.rectifier)],
  ['登记人', (r) => text(r.raw.registrant)],
  ['整改期限', (r) => text(r.raw.hazardDeadline)],
  ['摄像头', (r) => text(r.raw.cameraName)],
  ['监控点位', (r) => text(r.raw.cameraLocation)],
  ['截图方式', (r) => sourceTypeText(r.raw.sourceType)],
  ['登记来源', (r) => text(r.raw.source)],
  ['登记时间', (r) => text(r.raw.uploadTime)],
  ['隐患截图', (r) => (r.raw.snapshot ? '已附截图' : '--')],
  ['整改说明', (r) => text(r.raw.rectifyRemark)],
  ['整改照片', (r) => photoNames(r.raw.rectifyPhotos)],
]

const externalColumns = [
  ['问题编号', (r) => text(r.raw.id)],
  ['问题状态', (r) => text(r.raw.status)],
  ['问题名称', (r) => text(r.raw.title)],
  ['项目名称', (r) => text(r.projectName)],
  ['标段', (r) => text(r.raw.sectionName)],
  ['问题类型', (r) => text(r.raw.issueType)],
  ['问题来源', (r) => text(r.raw.source)],
  ['发现人', (r) => text(r.raw.finder)],
  ['发起人', (r) => text(r.raw.initiator)],
  ['整改人', (r) => text(r.raw.rectifier)],
  ['审核人', (r) => text(r.raw.reviewer)],
  ['填写日期', (r) => text(r.raw.createdAt)],
  ['要求完成日期', (r) => text(r.raw.dueAt)],
  ['问题明细', (r) => {
    const items = Array.isArray(r.raw.items) ? r.raw.items : []
    if (!items.length) return '--'
    return items
      .map((item, index) => `${index + 1}）${item.description || ''}${item.advice ? `；要求建议：${item.advice}` : ''}`)
      .join('\n')
  }],
  ['附件', (r) => {
    const files = (r.raw.items || []).flatMap((item) => item.attachments || [])
    return files.length ? files.join('、') : '--'
  }],
  ['审批记录', (r) => {
    const logs = Array.isArray(r.raw.approvalLogs) ? r.raw.approvalLogs : []
    if (!logs.length) return '--'
    return logs.map((log) => `${log.stage || ''}｜${log.person || ''}｜${log.opinion || ''}｜${log.time || ''}`).join('\n')
  }],
]

const COLUMNS = {
  inspection: inspectionColumns,
  supervision: supervisionColumns,
  dispatch: dispatchColumns,
  externalQuality: externalColumns,
}

/* ============ 生成工作簿 ============ */

function buildSheet(rows, columns, meta, rangeText) {
  const header = ['序号', ...columns.map(([label]) => label)]
  const title = `隐患问题清单汇总 · ${meta.label} · ${rangeText} · 共 ${rows.length} 条`
  const aoa = [[title], header]
  rows.forEach((row, index) => {
    aoa.push([index + 1, ...columns.map(([, get]) => get(row))])
  })
  if (!rows.length) aoa.push(['本区间无记录'])
  const sheet = XLSXUtils.aoa_to_sheet(aoa)
  sheet['!cols'] = [{ wch: 6 }, ...columns.map(([label]) => ({ wch: ['整改要求', '隐患说明', '问题明细', '审批记录', '整改说明', '整改图片', '隐患图片', '整改照片', '隐患照片'].includes(label) ? 40 : Math.min(28, Math.max(12, label.length * 2 + 6)) }))]
  sheet['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: header.length - 1 } }]
  sheet['!freeze'] = { xSplit: 0, ySplit: 2 }
  return sheet
}

export async function buildHazardSummaryExportFile({ rows = [], range = [], sources = [], name = '隐患问题清单汇总' }) {
  const selected = sources.length ? sources : HAZARD_ISSUE_SOURCES.map((item) => item.value)
  const rangeText = range?.length === 2 && range[0] && range[1] ? `${range[0]} 至 ${range[1]}` : '全部日期'
  const workbook = XLSXUtils.book_new()
  for (const source of selected) {
    const meta = SOURCE_META[source]
    if (!meta) continue
    const list = rows.filter((row) => row.source === source)
    const sheet = buildSheet(list, COLUMNS[source], meta, rangeText)
    XLSXUtils.book_append_sheet(workbook, sheet, meta.sheet)
  }
  const buffer = xlsxWrite(workbook, { type: 'array', bookType: 'xlsx' })
  const filename = `${name}_${range?.length === 2 && range[0] ? `${range[0]}_${range[1]}` : '全部日期'}.xlsx`
  return { filename, blob: new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }) }
}
