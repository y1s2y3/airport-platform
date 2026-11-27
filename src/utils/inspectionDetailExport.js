import { formatInspectionCategories, normalizeHazardCategory } from '../config/inspectionManagement.js'
import { getConfiguredPersonLabel } from '../composables/useInspectionPersonConfig.js'
import { getMobileRectification, getRectificationPhotoFiles, getTaskHazardRectification, mapMobileRecordToHazardRow } from '../composables/useMobileRectification.js'
import { buildInspectionHazardDetail, getInspectionHazard } from '../mock/inspectionHazardQuery.js'
import { listMobileInspectionTasks } from '../mock/mobileInspectionTasks.js'
import { getInspectionTaskCheckGroups, getMajorHazardPatrolDetail, getMajorHazardSyncDetail } from './inspectionTaskDetailData.js'

import { isInspectionRectificationOverdue } from './inspectionLedgerDates.js'

// 第四项是照片组的文件名前缀。
export const inspectionTaskDetailColumns = [
  ['taskNo', '巡检任务单编号', 26],
  ['taskName', '任务名称', 36],
  ['source', '任务来源'],
  ['project', '项目名称', 28],
  ['executor', '登记人', 24],
  ['inspectionCategory', '巡检分类'],
  ['inspectionType', '检查类型'],
  ['isMajorHazardPatrol', '危大工程现场巡视', 23],
  ['majorHazardName', '危大工程名称', 32],
  ['companions', '同行人', 28],
  ['deadline', '任务截止日期'],
  ['inspectionDate', '巡检日期'],
  ['status', '状态'],
  ['itemCount', '检查项数量'],
  ['checkItems', '检查项明细', 57],
  ['result', '巡检结果'],
  ['normalPhotos', '巡检照片', 42, '巡检照片'],
  ['hazardCount', '隐患数量'],
]

export const inspectionTaskHazardColumns = [
  ['number', '隐患序号', 12],
  ['category', '隐患类别'],
  ['level', '隐患等级', 24],
  ['requirement', '整改要求', 46],
  ['description', '隐患说明', 46],
  ['hazardPhotos', '隐患照片', 44, '隐患照片'],
  ['orderNo', '关联整改单编号', 26],
  ['orderStatus', '关联整改单状态'],
  ['rectifier', '整改人', 24],
  ['reviewer', '复查人', 24],
  ['rectifyDeadline', '整改截止日期'],
  ['issueCcPersons', '下发整改单抄送人', 28],
  ['completionCcPersons', '整改单完成抄送人', 28],
]

export const rectificationDetailColumns = [
  ['rn', '整改单编号', 26],
  ['tn', '巡检任务单编号', 26],
  ['pj', '项目名称', 28],
  ['cat', '巡检分类'],
  ['inspector', '登记人', 24],
  ['issueDate', '整改单下发日期', 21],
  ['rf', '整改人', 24],
  ['rv', '复查人', 24],
  ['issueCc', '下发整改单抄送人', 28],
  ['completionCc', '整改完成抄送人', 28],
  ['dl', '截止日期'],
  ['st', '状态'],
  ['currentNode', '当前流程节点', 28],
  ['cd', '关闭日期'],
  ['inspectionPhotos', '巡检照片', 44, '巡检照片'],
  ['category', '隐患类别'],
  ['level', '隐患等级'],
  ['requirement', '整改要求', 46],
  ['description', '隐患说明', 46],
  ['hazardPhotos', '隐患照片', 44, '隐患照片'],
  ['rectDate', '整改日期'],
  ['rectPhotos', '整改照片', 44, '整改照片'],
  ['rectNote', '整改说明', 46],
  ['reviewDate', '复查日期'],
  ['reviewResult', '复查结论'],
  ['reviewComment', '复查意见', 42],
  ['approvalManager', '审批人', 24],
  ['approvalStatus', '审批结果'],
  ['approvalDate', '审批日期'],
  ['approvalComment', '审批意见', 44],
  ['confirmActor', '确认人', 24],
  ['confirmStatus', '确认结果'],
  ['confirmDate', '确认日期'],
  ['confirmComment', '确认意见', 44],
  ['overdue', '逾期'],
]

const joined = (...values) => values.filter(Boolean).join(' · ')
const photoGroup = (photos, label = '', names = []) => ({ label, photos: photos || [], names })
const resultLabel = result => ({ normal: '全部正常', hazard: '有隐患' })[result] || result || ''

export function exportInspectionTaskDetail(task) {
  const hazards = task.hazardItems || []
  const groups = task.source === '任务下发' ? getInspectionTaskCheckGroups(task) : []
  const checks = groups.flatMap(group => group.items.map(item => ({ ...item, group: joined(group.inspectionCategory, group.label) })))
  return {
    ...task,
    taskName: task.taskName || task.planName,
    executor: task.executor || task.inspector,
    inspectionCategory: formatInspectionCategories(task.inspectionCategories || task.inspectionCategory),
    isMajorHazardPatrol: getMajorHazardPatrolDetail(task),
    majorHazardName: task.isMajorHazardPatrol === '是' ? task.majorHazardName : '',
    majorHazardSync: getMajorHazardSyncDetail(task),
    companions: (task.companions || []).join('、'),
    itemCount: groups.length ? checks.length : task.itemCount,
    checkItems: checks.map(item => joined(item.group, item.label, resultLabel(item.result), item.desc)).join('\n'),
    result: resultLabel(task.result || task.inspectionResult),
    normalPhotos: [photoGroup(task.normalPhotos?.length ? task.normalPhotos : task.photos)],
    hazardCount: task.hazardCount ?? hazards.length,
    detailRows: hazards.map((item, index) => {
      const archived = getTaskHazardRectification(item)
      const order = !archived?.deletion && item.rectifyId ? getInspectionHazard(item.rectifyId) : null
      const showOrder = !archived?.deletion
      return {
        number: index + 1,
        category: normalizeHazardCategory(item.hazardCategory || order?.hazardCategory) || '安全管理',
        level: item.hazardLevel || order?.hazardLevel || '未设置',
        description: item.desc || order?.desc,
        requirement: item.rectifyRequirement || order?.rectifyRequirement || '未填写',
        hazardPhotos: [photoGroup(item.photos?.length ? item.photos : order?.hazardPhotos)],
        orderNo: showOrder ? item.rectifyNo || order?.rectifyNo : '',
        orderStatus: order?.status,
        rectifier: showOrder ? item.rectifier || item.rectifyPerson || order?.rectifier : '',
        reviewer: showOrder ? item.reviewer || item.reviewPerson || order?.reviewer : '',
        rectifyDeadline: showOrder ? item.rectifyDeadline || order?.deadline : '',
        issueCcPersons: showOrder ? item.issueCcPersons ?? item.ccPersons ?? order?.issueCcPersons : '',
        completionCcPersons: showOrder ? item.completionCcPersons ?? order?.completionCcPersons : '',
      }
    }),
  }
}

export function exportRectificationDetail(row) {
  const live = getMobileRectification(row.id)
  const current = live ? mapMobileRecordToHazardRow(live) : row
  const detail = buildInspectionHazardDetail(current, live)
  const history = current.workflowHistory || []
  const photos = getRectificationPhotoFiles(row.id)
  const originalHazardPhotos = photos?.hazards?.length ? photos.hazards : listMobileInspectionTasks()
    .find(task => task.taskNo === row.taskNo)?.hazardItems
    ?.find(item => item.rectifyId === row.id || item.rectifyNo === row.rectifyNo)?.photos
  const latestRectificationIndex = history.findLastIndex(log => log.stage === 'rectify' && log.type !== 'assignment')
  const latestRectificationPhotos = history[latestRectificationIndex]?.photoFiles
    || photos?.rounds.find(round => round.historyIndex === latestRectificationIndex)?.photos
  const review = detail.reviews?.at(-1) || detail.prevReview
  const approval = live?.approvalResult || (!history.length && row.approvalRejected)
    ? { manager: live?.manager || row.manager, status: live?.approvalResult || '不通过', date: live?.approvalDate || row.approvalDate, comment: live?.approvalComment || row.approvalReason }
    : detail.managerApproval || {}
  const project = row.project_id || row.project
  const overdue = isInspectionRectificationOverdue(current)
  return {
    ...detail,
    rf: detail.rf || getConfiguredPersonLabel(project, row.inspectionCategory, 'rectifierId'),
    rv: detail.rv || getConfiguredPersonLabel(project, row.inspectionCategory, 'reviewerId'),
    category: normalizeHazardCategory(detail.hazard.category),
    level: detail.hazard.level || '未设置',
    requirement: detail.hazard.rectifyRequirement || '未填写',
    description: detail.hazard.desc,
    hazardPhotos: [photoGroup(originalHazardPhotos, '', detail.hazard.photos)],
    rectDate: detail.rectification?.date,
    rectNote: detail.rectification?.note,
    rectPhotos: [photoGroup(latestRectificationPhotos, '', detail.rectification?.photos || [])],
    reviewDate: review?.date,
    reviewResult: review?.result,
    reviewComment: review?.comment,
    approvalManager: approval.manager,
    approvalStatus: approval.status,
    approvalDate: approval.date,
    approvalComment: approval.comment,
    inspectionPhotos: [photoGroup(detail.inspectionPhotos, '巡检照片')],
    confirmActor: detail.departmentConfirmation?.actor,
    confirmStatus: detail.departmentConfirmation?.status,
    confirmDate: detail.departmentConfirmation?.date,
    confirmComment: detail.departmentConfirmation?.comment,
    issueCc: current.issueCcPersons ?? row.issueCcPersons,
    completionCc: current.completionCcPersons ?? row.completionCcPersons,
    overdue: overdue === null ? '--' : overdue ? '是' : '否',
  }
}
