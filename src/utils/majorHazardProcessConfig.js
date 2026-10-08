/**
 * 危大工程过程管控 · 各阶段字段/列配置（Web / APP 共用）
 */
export const PROCESS_REQUIRED_STAR_TABS = ['scheme', 'conditionAcceptance', 'acceptance']

export const PROCESS_CONFIGS = {
  scheme: {
    label: '专项施工方案', dateField: 'preparedAt', responsibleField: 'preparedBy', summaryField: 'schemeName',
    fields: [
      { key: 'schemeName', label: '方案名称', required: true }, { key: 'schemeCode', label: '方案编号', required: true, readonly: true, placeholder: '系统自动生成' },
      { key: 'preparedBy', label: '方案编制人', type: 'person', required: true }, { key: 'preparedAt', label: '编制日期', type: 'date', required: true },
    ],
    columns: [
      { key: 'schemeCode', label: '方案编号', width: 130 }, { key: 'schemeName', label: '方案名称', minWidth: 200 },
      { key: 'preparedBy', label: '编制人', width: 100 }, { key: 'preparedAt', label: '编制日期', width: 120 },
    ],
  },
  schemeDisclosure: {
    label: '方案交底', dateField: 'disclosureDate', responsibleField: 'discloser', summaryField: 'schemeName',
    fields: [
      { key: 'schemeName', label: '方案名称', required: true },
      { key: 'discloser', label: '交底人员', type: 'person', required: true },
      { key: 'receiver', label: '接受人', type: 'people', required: true },
      { key: 'disclosureDate', label: '交底时间', type: 'datetime', required: true },
      { key: 'disclosureRemark', label: '交底备注', type: 'textarea', span: 24 },
    ],
    columns: [
      { key: 'schemeName', label: '方案名称', minWidth: 200 },
      { key: 'receiver', label: '接受人', minWidth: 180 },
      { key: 'discloser', label: '交底人员', width: 160 }, { key: 'disclosureDate', label: '交底时间', width: 170 },
      { key: 'disclosureRemark', label: '交底备注', minWidth: 200 },
    ],
  },
  safetyDisclosure: {
    label: '安全技术交底', dateField: 'disclosureDate', responsibleField: 'siteManager', summaryField: 'title',
    fields: [
      { key: 'title', label: '标题', required: true },
      { key: 'disclosureDate', label: '交底时间', type: 'datetime', required: true },
      { key: 'siteManager', label: '交底人员', type: 'person', required: true },
      { key: 'disclosureLocation', label: '交底地点', required: true },
      { key: 'receivingSubcontractor', label: '接受分包单位', type: 'subcontractor', required: true },
      { key: 'workTeam', label: '接受班组', required: true },
      { key: 'receiver', label: '接受人', type: 'people', required: true },
      { key: 'disclosureContent', label: '交底内容', type: 'textarea', span: 24, required: true },
    ],
    columns: [
      { key: 'title', label: '标题', minWidth: 200 }, { key: 'disclosureDate', label: '交底时间', width: 170 },
      { key: 'siteManager', label: '交底人员', width: 160 }, { key: 'disclosureLocation', label: '交底地点', minWidth: 150 },
      { key: 'receivingSubcontractor', label: '接受分包单位', minWidth: 180 }, { key: 'workTeam', label: '接受班组', width: 140 },
      { key: 'receiver', label: '接受人', minWidth: 180 },
      { key: 'disclosureContent', label: '交底内容', minWidth: 220 },
    ],
  },
  workerRegistration: {
    label: '作业人员登记', dateField: 'entryDate', responsibleField: 'workerName', summaryField: 'jobType',
    fields: [
      { key: 'personIds', label: '实名制人员', type: 'realNamePeople', span: 24, required: true },
    ],
    columns: [
      { key: 'workerName', label: '姓名', width: 100 },
      { key: 'phone', label: '手机号', width: 155, mask: true, fullKey: 'phoneFull' },
      { key: 'employer', label: '参建单位', minWidth: 170 },
      { key: 'jobType', label: '工种/职务', width: 120 },
      { key: 'workerType', label: '工人类型', width: 110 },
      { key: 'certificateNo', label: '资格证号', width: 150 }, { key: 'certificateExpiry', label: '证书有效期', width: 120 },
    ],
  },
  conditionAcceptance: {
    label: '施工条件验收', dateField: 'acceptanceDate', responsibleField: '', summaryField: 'acceptanceDescription',
    fields: [
      { key: 'acceptanceResult', label: '验收结果', type: 'select', options: ['合格', '不合格'], required: true, default: '合格' },
      { key: 'acceptanceDate', label: '验收时间', type: 'datetime', required: true },
      { key: 'acceptanceDescription', label: '验收描述', type: 'textarea', span: 24 },
    ],
    columns: [
      { key: 'acceptanceResult', label: '验收结果', width: 110 }, { key: 'acceptanceDate', label: '验收时间', width: 165 },
      { key: 'acceptanceDescription', label: '验收描述', minWidth: 240 },
    ],
  },
  progress: {
    label: '施工进度', dateField: 'recordDate', responsibleField: '', summaryField: 'progressDescription',
    fields: [
      { key: 'recordDate', label: '记录日期', type: 'date', required: true },
      { key: 'executionRate', label: '执行率（%）', type: 'number', required: true, default: 0 },
      { key: 'progressDescription', label: '进度描述', type: 'textarea', span: 24 },
    ],
    columns: [
      { key: 'recordDate', label: '记录日期', width: 120 }, { key: 'executionRate', label: '执行率', width: 100, suffix: '%' },
      { key: 'progressDescription', label: '进度描述', minWidth: 320 },
    ],
  },
  patrol: {
    label: '现场巡视', dateField: 'inspectionDate', responsibleField: 'inspectors', summaryField: 'inspectionTaskName',
    fields: [
      { key: 'inspectionTaskIds', label: '关联巡检单', type: 'inspectionTasks', span: 24, required: true },
    ],
    columns: [
      { key: 'inspectionTaskCount', label: '巡检单数量', width: 110 }, { key: 'inspectionTaskNo', label: '巡检单编号', minWidth: 190 },
      { key: 'inspectionTaskName', label: '巡检单名称', minWidth: 220 }, { key: 'inspectors', label: '巡检人员', width: 150 },
      { key: 'hazardCount', label: '隐患数', width: 90 },
    ],
  },
  acceptance: {
    label: '危大工程验收', dateField: 'acceptanceDate', responsibleField: '', summaryField: 'acceptanceDescription',
    fields: [
      { key: 'acceptanceResult', label: '验收结果', type: 'select', options: ['合格', '不合格'], required: true, default: '合格' },
      { key: 'acceptanceDate', label: '验收时间', type: 'datetime', required: true },
      { key: 'acceptanceDescription', label: '验收描述', type: 'textarea', span: 24 },
    ],
    columns: [
      { key: 'acceptanceResult', label: '验收结果', width: 110 }, { key: 'acceptanceDate', label: '验收时间', width: 165 },
      { key: 'acceptanceDescription', label: '验收描述', minWidth: 240 },
    ],
  },
  controlPoints: {
    label: '管控要点', dateField: 'date', responsibleField: 'responsible', summaryField: 'content', fields: [],
    columns: [
      { key: 'controlPointContent', label: '管控要点', minWidth: 300 }, { key: 'date', label: '记录日期', width: 120 },
    ],
  },
}

export const PROCESS_TABS = Object.entries(PROCESS_CONFIGS).map(([key, value]) => ({
  key,
  label: value.label,
  requiredStar: PROCESS_REQUIRED_STAR_TABS.includes(key),
}))

export const RECORD_DETAIL_EXAMPLES = {
  scheme: {
    schemeName: 'A区深基坑支护及土方开挖专项施工方案', schemeCode: 'ZX20260818001', preparedBy: '张工（项目技术负责人）', preparedAt: '2026-08-18',
    attachmentInfo: 'A区深基坑专项施工方案.pdf',
  },
  schemeDisclosure: {
    schemeName: 'A区深基坑支护及土方开挖专项施工方案', disclosureDate: '2026-08-20 09:00', discloser: '张工（项目技术负责人）', disclosureRemark: '明确分层开挖顺序、支撑安装要求和应急处置措施。',
    receiver: ['赵志强（班组长）', '李建国（施工员）'],
    attachmentInfo: '专项施工方案交底记录.pdf\n方案交底签到表.pdf\n交底现场照片.jpg',
  },
  safetyDisclosure: {
    title: '深基坑土方开挖安全技术交底', disclosureDate: '2026-08-21 09:00', siteManager: '李建国（施工员）', disclosureLocation: '项目部安全教育室', receivingSubcontractor: '深圳市政集团有限公司', workTeam: '基坑支护班组', receiver: ['赵志强（班组长）', '王强（施工员）'], disclosureContent: '作业前检查临边防护，按方案分层开挖；发现支护变形或异常涌水立即停止作业并报告。',
    attachmentInfo: '安全技术交底记录.pdf\n作业人员签字表.pdf\n班前教育照片.jpg',
  },
  workerRegistration: {
    personId: 'person-demo-001', workerName: '赵志强', idNumber: '440300********1137', idNumberFull: '440300199001010137',
    phone: '138****0137', phoneFull: '13810000137', employer: '中建土方工程有限公司',
    jobType: '挖掘机司机', workerType: '建筑工人', entryDate: '2026-08-21', isSpecialWorker: '是', certificateNo: '粤A01202608001', certificateExpiry: '2027-08-20',
    safetyEducationDone: 2, safetyEducationTotal: 3,
  },
  conditionAcceptance: {
    acceptanceDate: '2026-08-22 09:30', acceptanceResult: '合格', acceptanceDescription: '施工方案、人员、机械设备及现场安全防护条件均满足开工要求。',
    attachmentInfo: '施工条件验收现场照片01.jpg\n施工条件验收现场照片02.jpg',
  },
  progress: {
    recordDate: '2026-08-28', executionRate: 42, progressDescription: '完成第二层土方开挖3600m³及东侧钢支撑安装，现场施工进度符合计划。',
    attachmentInfo: '现场进度照片01.jpg\n现场进度照片02.jpg',
    dangerWorkIds: ['dw-demo-progress-1', 'dw-demo-progress-2'],
    dangerWorks: [
      { id: 'dw-demo-progress-1', reportDate: '2026-08-28', dangerWorkCategory: '动土作业', workArea: 'A区基坑东侧', workContent: '第二层土方开挖', startTime: '2026-08-28 08:00', endTime: '2026-08-28 18:00', contractor: '深圳市政集团有限公司' },
      { id: 'dw-demo-progress-2', reportDate: '2026-08-28', dangerWorkCategory: '吊装作业', workArea: 'A区基坑东侧', workContent: '钢支撑吊装就位', startTime: '2026-08-28 09:00', endTime: '2026-08-28 16:00', contractor: '深圳市政集团有限公司' },
    ],
  },
  patrol: {
    inspectionTaskIds: ['mt-demo-patrol-1', 'mt-demo-patrol-2'], inspectionTaskCount: 2,
    inspectionTaskNo: 'AQXJ20260824001、ZLXJ20260824002', inspectionTaskName: '深基坑临边防护专项巡检、钢支撑安装质量巡检',
    inspectionDate: '2026-08-24', inspectors: '王安全、陈监理', hazardCount: 1,
    inspectionTasks: [
      { id: 'mt-demo-patrol-1', taskNo: 'AQXJ20260824001', taskName: '深基坑临边防护专项巡检', inspectionCategory: '安全', source: '任务下发', project: '深圳机场扩建工程', inspectionDate: '2026-08-24', deadline: '2026-08-24', status: '已完成', inspector: '王安全', executor: '王安全', itemCount: 8, hazardCount: 1, result: 'hazard', hazardItems: [{ desc: '西侧临边一处警示标识松动', rectifier: '赵班长', rectifyDeadline: '2026-08-28', photos: ['隐患照片01.jpg'] }] },
      { id: 'mt-demo-patrol-2', taskNo: 'ZLXJ20260824002', taskName: '钢支撑安装质量巡检', inspectionCategory: '质量', source: '系统自建', project: '深圳机场扩建工程', inspectionDate: '2026-08-24', deadline: '2026-08-24', status: '已完成', inspector: '陈监理', executor: '陈监理', itemCount: 6, hazardCount: 0, result: 'normal', normalPhotos: ['巡检照片01.jpg'] },
    ],
    attachmentInfo: '监理专项巡视记录.pdf\n巡视现场照片.jpg',
  },
  acceptance: {
    acceptanceDate: '2026-09-05 15:00', acceptanceResult: '合格', acceptanceDescription: '危大工程实体质量、安全设施和现场施工状态验收合格。',
    attachmentInfo: '危大工程验收现场照片01.jpg\n危大工程验收现场照片02.jpg',
  },
  controlPoints: {
    attachmentInfo: '管控要点检查记录.pdf\n现场检查照片.jpg',
  },
}

export function emptyCell(value) {
  if (value === 0) return '0'
  if (value === false) return '否'
  if (value === null || value === undefined || value === '') return '--'
  return String(value)
}

export function dangerWorkCount(row) {
  if (Array.isArray(row?.dangerWorks) && row.dangerWorks.length) return row.dangerWorks.length
  if (Array.isArray(row?.dangerWorkIds) && row.dangerWorkIds.length) return row.dangerWorkIds.length
  return 0
}
