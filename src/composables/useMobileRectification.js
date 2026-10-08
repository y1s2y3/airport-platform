import { computed, reactive } from 'vue'
import { getProjectRectifierLabel, getProjectReviewerLabel } from './useInspectionPersonConfig'
import { mobileInspectionTasks } from '../mock/mobileInspectionTasks'

const nowText = () => new Date().toLocaleString('zh-CN', { hour12: false }).replaceAll('/', '-')

function photoLabels(list, prefix = '整改照片') {
  if (!Array.isArray(list) || !list.length) return []
  return list.map((item, index) => {
    const raw = typeof item === 'string' ? item : item?.name || ''
    if (raw && !raw.startsWith('blob:') && !raw.startsWith('data:')) return raw
    return `${prefix}${index + 1}.jpg`
  })
}

/** 移动端整改记录 → Web 隐患清单行（同一真相源） */
export function mapMobileRecordToHazardRow(record) {
  const issueDate = String(record.applyDate || record.submitDate || '').slice(0, 10)
  return {
    id: record.id,
    rectifyNo: record.rectifyNo,
    taskNo: record.taskNo,
    inspectionCategory: record.inspectionCategory,
    project: record.project,
    projectFullName: record.project,
    project_id: record.projectId,
    rectifier: record.rectifier,
    reviewer: record.reviewer,
    manager: record.manager,
    issueDate: issueDate || '2026-07-25',
    deadline: record.deadline,
    status: record.status,
    rectDate: record.rectificationDate || record.submitDate || '',
    reviewDate: record.reviewDate || '',
    closeDate: record.closeDate || '',
    desc: record.hazard,
    hazardPhotos: [...(record.hazardPhotos || [])],
    rectificationPhotos: [...(record.rectificationPhotos || [])],
    rectificationNote: record.rectificationNote || '',
    reviewComment: record.reviewComment || '',
    reviewResult: record.reviewResult || '',
    approvalComment: record.approvalComment || '',
    isRejected: !!record.isRejected,
    rejectReason: record.rejectReason || '',
    approvalRejected: !!record.approvalRejected,
    approvalReason: record.approvalReason || '',
    source: 'mobile-rectify',
  }
}

export const mobileRectificationRecords = reactive([
  {
    id: 'rec-001',
    rectifyNo: 'ZG202607001',
    taskNo: 'AQXJ20260728001',
    inspectionCategory: '安全',
    projectId: 'p-000',
    project: '飞行区跑道延长工程',
    rectifier: getProjectRectifierLabel('p-000'),
    reviewer: getProjectReviewerLabel('p-000'),
    manager: '赵经理（项目经理）',
    deadline: '2026-07-30',
    status: '待整改',
    currentNode: '整改人整改',
    applicant: '陈工（监理工程师）',
    applyDate: '2026-07-25 09:00:00',
    overdue: false,
    hazard: '五芯电缆破损，线路未按规范敷设',
    hazardPhotos: ['隐患照片1.jpg', '隐患照片2.jpg'],
  },
  {
    id: 'rec-006',
    rectifyNo: 'ZG202607006',
    taskNo: 'AQXJ20260721003',
    inspectionCategory: '安全',
    projectId: 'p-001',
    project: 'T3航站楼扩建工程',
    rectifier: getProjectRectifierLabel('p-001'),
    reviewer: getProjectReviewerLabel('p-001'),
    manager: '李经理（项目经理）',
    deadline: '2026-07-22',
    status: '待整改',
    currentNode: '整改人重新整改',
    applicant: '陈工（监理工程师）',
    applyDate: '2026-07-20 14:00:00',
    overdue: true,
    isRejected: true,
    rejectReason: '整改不彻底，脚手架专项方案仍未按要求补报并通过审核',
    hazard: '脚手架施工方案未报审即施工',
    hazardPhotos: ['隐患照片1.jpg'],
    rectificationDate: '2026-07-20',
    rectificationPhotos: ['整改照片1.jpg'],
    rectificationNote: '已补报脚手架专项施工方案',
    reviewDate: '2026-07-22',
    reviewResult: '不通过',
    reviewComment: '整改不彻底，脚手架专项方案仍未按要求补报并通过审核',
  },
  {
    id: 'rec-002',
    rectifyNo: 'ZG202607002',
    taskNo: 'AQXJ20260728001',
    inspectionCategory: '安全',
    projectId: 'p-000',
    project: '飞行区跑道延长工程',
    rectifier: getProjectRectifierLabel('p-000'),
    reviewer: getProjectReviewerLabel('p-000'),
    manager: '赵经理（项目经理）',
    deadline: '2026-07-28',
    status: '待复查',
    currentNode: '复查人复查',
    applicant: '王工（项目安全员）',
    applyDate: '2026-07-25 10:30:00',
    submitDate: '2026-07-25',
    overdue: false,
    hazard: '五芯电缆破损，线路未按规范敷设',
    hazardPhotos: ['隐患照片1.jpg'],
    rectificationDate: '2026-07-25',
    rectificationPhotos: ['整改照片1.jpg'],
    rectificationNote: '已更换合规电缆并按规范重新敷设',
  },
  {
    id: 'rec-003',
    rectifyNo: 'ZG202607003',
    taskNo: 'ZLXJ20260721003',
    inspectionCategory: '质量',
    projectId: 'p-001',
    project: 'T3航站楼扩建工程',
    rectifier: getProjectRectifierLabel('p-001'),
    reviewer: getProjectReviewerLabel('p-001'),
    manager: '李经理（项目经理）',
    deadline: '2026-07-28',
    status: '待复查',
    currentNode: '复查人复查',
    applicant: '刘工（专职安全员）',
    applyDate: '2026-07-27 16:30:00',
    submitDate: '2026-07-27',
    overdue: false,
    isSecondRound: true,
    hazard: '脚手架施工方案未报审即施工',
    hazardPhotos: ['隐患照片1.jpg'],
    rectificationDate: '2026-07-27',
    rectificationPhotos: ['整改照片1.jpg'],
    rectificationNote: '已重新补报方案并通过审核',
    rejectReason: '整改不彻底',
  },
  {
    id: 'rec-007',
    rectifyNo: 'ZG202607007',
    taskNo: 'AQXJ20260730001',
    inspectionCategory: '安全',
    projectId: 'p-000',
    project: '飞行区跑道延长工程',
    rectifier: getProjectRectifierLabel('p-000'),
    reviewer: getProjectReviewerLabel('p-000'),
    manager: '赵经理（项目经理）',
    deadline: '2026-07-31',
    status: '已复查',
    currentNode: '项目经理审批',
    applicant: '陈工（监理工程师）',
    applyDate: '2026-07-30 17:20:00',
    submitDate: '2026-07-30',
    overdue: false,
    hazard: '临边防护栏杆局部缺失',
    hazardPhotos: ['临边防护隐患照片.jpg'],
    rectificationDate: '2026-07-30',
    rectificationPhotos: ['临边防护整改后照片.jpg'],
    rectificationNote: '已恢复缺失栏杆并加固连接节点。',
    reviewDate: '2026-07-30',
    reviewResult: '通过',
    reviewComment: '整改到位，同意提交项目经理审批。',
  },
  {
    id: 'rec-008',
    rectifyNo: 'ZG202607008',
    taskNo: 'ZLXJ20260730002',
    inspectionCategory: '质量',
    projectId: 'p-001',
    project: 'T3航站楼扩建工程',
    rectifier: getProjectRectifierLabel('p-001'),
    reviewer: getProjectReviewerLabel('p-001'),
    manager: '李经理（项目经理）',
    deadline: '2026-08-01',
    status: '待复查',
    currentNode: '复查人重新复查',
    applicant: '李经理（项目经理）',
    applyDate: '2026-07-30 18:10:00',
    submitDate: '2026-07-30',
    overdue: false,
    approvalRejected: true,
    approvalReason: '复查依据不充分，请补充现场核验意见',
    hazard: '混凝土外观存在蜂窝麻面',
    hazardPhotos: ['隐患照片1.jpg'],
    rectificationDate: '2026-07-30',
    rectificationPhotos: ['整改照片1.jpg'],
    rectificationNote: '已完成缺陷修补并养护',
    reviewDate: '2026-07-30',
    reviewResult: '通过',
    reviewComment: '现场已修补，建议提交审批',
  },
  {
    id: 'rec-004',
    rectifyNo: 'ZG202607004',
    taskNo: 'ZLXJ20260728005',
    inspectionCategory: '质量',
    projectId: 'p-000',
    project: '飞行区跑道延长工程',
    rectifier: getProjectRectifierLabel('p-000'),
    reviewer: getProjectReviewerLabel('p-000'),
    manager: '赵经理（项目经理）',
    deadline: '2026-07-20',
    status: '已关闭',
    currentNode: '流程结束',
    applicant: '陈工（监理工程师）',
    applyDate: '2026-07-18 09:00:00',
    closeDate: '2026-07-25',
    overdue: false,
    hazard: '电缆破损，存在安全隐患',
    hazardPhotos: ['隐患照片1.jpg', '隐患照片2.jpg'],
    rectificationDate: '2026-07-22',
    rectificationPhotos: ['整改照片1.jpg', '整改照片2.jpg'],
    rectificationNote: '已更换破损电缆',
    reviewDate: '2026-07-25',
    reviewResult: '通过',
    reviewComment: '整改合格，同意关闭',
    approvalDate: '2026-07-25',
    approvalComment: '同意关闭',
  },
  {
    id: 'rec-011',
    rectifyNo: 'ZG202607011',
    taskNo: 'AQXJ20260721003',
    inspectionCategory: '安全',
    projectId: 'p-001',
    project: 'T3航站楼扩建工程',
    rectifier: getProjectRectifierLabel('p-001'),
    reviewer: getProjectReviewerLabel('p-001'),
    manager: '李经理（项目经理）',
    deadline: '2026-07-25',
    status: '已关闭',
    currentNode: '流程结束',
    applicant: '陈工（监理工程师）',
    applyDate: '2026-07-20 09:00:00',
    closeDate: '2026-07-30',
    overdue: false,
    isSecondRound: true,
    hazard: '消防器材过期未更换',
    hazardPhotos: ['隐患照片1.jpg', '隐患照片2.jpg'],
    rectificationDate: '2026-07-28',
    rectificationPhotos: ['整改照片1.jpg', '整改照片2.jpg'],
    rectificationNote: '已全部更换并设置检查记录卡',
    reviewDate: '2026-07-30',
    reviewResult: '通过',
    reviewComment: '整改到位，同意关闭',
    approvalDate: '2026-07-30',
    approvalComment: '同意关闭',
  },
])

export const getMobileRectification = (id) => mobileRectificationRecords.find((item) => item.id === id)

export function listMobileHazardsAsInspectionRows() {
  return mobileRectificationRecords.map(mapMobileRecordToHazardRow)
}

export function submitRectification(id, payload = {}) {
  const record = getMobileRectification(id)
  if (!record) return false
  const rectificationDate = payload.rectificationDate || payload.rectDate || nowText().slice(0, 10)
  const rectificationNote = payload.rectificationNote || payload.rectNote || ''
  const rectificationPhotos = photoLabels(
    payload.rectificationPhotos || payload.rectPhotos || [],
    '整改照片',
  )
  Object.assign(record, {
    rectificationDate,
    rectificationNote,
    rectificationPhotos,
    status: '待复查',
    currentNode: '复查人复查',
    submitDate: rectificationDate,
    applyDate: nowText(),
    isRejected: false,
    rejectReason: '',
    reviewDate: '',
    reviewResult: '',
    reviewComment: '',
    approvalRejected: false,
    approvalReason: '',
  })
  return true
}

export function submitRectificationReview(id, pass, payload = {}) {
  const record = getMobileRectification(id)
  if (!record) return false
  const reviewDate = payload.reviewDate || nowText().slice(0, 10)
  const reviewComment = payload.reviewComment || ''
  if (pass) {
    Object.assign(record, {
      reviewDate,
      reviewComment,
      reviewResult: '通过',
      status: '已复查',
      currentNode: '项目经理审批',
      applicant: record.reviewer,
      applyDate: nowText(),
      approvalRejected: false,
      approvalReason: '',
      isRejected: false,
      rejectReason: '',
    })
  } else {
    Object.assign(record, {
      reviewDate,
      reviewComment,
      reviewResult: '不通过',
      status: '待整改',
      currentNode: '整改人重新整改',
      applicant: record.reviewer,
      applyDate: nowText(),
      isRejected: true,
      rejectReason: reviewComment || '复查不通过，请重新整改',
    })
  }
  return true
}

export function submitManagerApproval(id, pass, payload = {}) {
  const record = getMobileRectification(id)
  if (!record) return false
  const approvalDate = payload.approvalDate || nowText().slice(0, 10)
  const approvalComment = payload.approvalComment || ''
  if (pass) {
    Object.assign(record, {
      approvalDate,
      approvalComment,
      approvalResult: '通过',
      status: '已关闭',
      currentNode: '流程结束',
      closeDate: approvalDate,
      applicant: record.manager,
      applyDate: nowText(),
      approvalRejected: false,
      approvalReason: '',
    })
  } else {
    Object.assign(record, {
      approvalDate,
      approvalComment,
      approvalResult: '不通过',
      status: '待复查',
      currentNode: '复查人重新复查',
      applicant: record.manager,
      applyDate: nowText(),
      approvalRejected: true,
      approvalReason: approvalComment || '审批不通过，请复查人重新复查',
    })
  }
  return true
}

export const mobileWorkflowMessages = computed(() => {
  const inspectionTodo = mobileInspectionTasks
    .filter((item) => item.status === '待执行')
    .map((item) => ({
      id: `todo-task-${item.id}`,
      recordId: item.id,
      flowName: '巡检任务',
      currentNode: '巡检人执行',
      owner: item.executor,
      applicant: '工程指挥部',
      applyDate: item.deadline,
      status: '待办',
      action: 'task-execute',
    }))
  const rectifyTodo = mobileRectificationRecords
    .filter((item) => item.status === '待整改' || item.status === '待复查' || item.status === '已复查')
    .map((item) => ({
      id: `todo-${item.id}`,
      recordId: item.id,
      flowName: '隐患整改',
      currentNode: item.currentNode,
      owner:
        item.status === '待整改'
          ? item.rectifier
          : item.status === '待复查'
            ? item.reviewer
            : item.manager,
      applicant: item.applicant,
      applyDate: item.applyDate,
      status: '待办',
      action:
        item.status === '待整改' ? 'execute' : item.status === '待复查' ? 'review' : 'approve',
    }))
  const todo = [...inspectionTodo, ...rectifyTodo]
  const initiated = mobileRectificationRecords.slice(0, 5).map((item) => ({
    id: `started-${item.id}`,
    recordId: item.id,
    flowName: '隐患整改',
    currentNode: item.currentNode,
    owner:
      item.status === '待整改'
        ? item.rectifier
        : item.status === '待复查'
          ? item.reviewer
          : item.status === '已复查'
            ? item.manager
            : '-',
    applicant: item.applicant,
    applyDate: item.applyDate,
    status: item.status === '已关闭' ? '已办结' : '流转中',
    action: 'detail',
  }))
  const done = mobileRectificationRecords
    .filter((item) => item.status === '已关闭')
    .map((item) => ({
      id: `done-${item.id}`,
      recordId: item.id,
      flowName: '隐患整改',
      currentNode: '项目经理审批通过',
      owner: item.manager,
      applicant: item.applicant,
      applyDate: item.applyDate,
      status: '已办结',
      action: 'detail',
    }))
  const copied = mobileRectificationRecords.slice(1, 4).map((item) => ({
    id: `cc-${item.id}`,
    recordId: item.id,
    flowName: '隐患整改',
    currentNode: item.currentNode,
    owner: item.rectifier,
    applicant: item.applicant,
    applyDate: item.applyDate,
    status: '抄送',
    action: 'detail',
  }))
  return { todo, initiated, done, copied }
})
