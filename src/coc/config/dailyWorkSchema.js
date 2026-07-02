/**
 * 字段标准来源：建设工程指挥部施工作业统计表
 * 左表：危险作业统计（A-O）；右表：危大工程统计（Q-X）
 * 示例 Sheet：2026.6.30
 */

export const DAILY_WORK_SHEET_HINT = '2026.6.30'

/** 危险作业侧字段（列 A-O） */
export const DANGER_WORK_FIELDS = [
  { key: 'leadUnit', label: '*管理单位', required: true, col: 'A', span: 24 },
  { key: 'projectName', label: '施工项目名称', required: false, col: 'B', span: 24 },
  { key: 'contractor', label: '*施工单位', required: true, col: 'C', span: 24 },
  { key: 'workArea', label: '*施工区域', required: true, col: 'D', span: 12 },
  { key: 'workContent', label: '当日施工具体内容', required: false, col: 'E', span: 12 },
  { key: 'dangerWorkCategory', label: '*危险作业作业类别', required: true, col: 'F', span: 12 },
  { key: 'startTime', label: '*作业开始时间', required: true, col: 'G', span: 12, type: 'datetime' },
  { key: 'endTime', label: '*作业结束时间', required: true, col: 'H', span: 12, type: 'datetime' },
  { key: 'ownerProjectManager', label: '*建设单位项目负责人及手机号', required: true, col: 'I', span: 24 },
  { key: 'ownerSafetyManager', label: '*建设单位现场安全监管人及手机号', required: true, col: 'J', span: 24 },
  { key: 'contractorProjectManager', label: '*施工单位项目负责人及手机号', required: true, col: 'K', span: 24 },
  { key: 'contractorSafetyManager', label: '*施工单位现场安全监管人及手机号', required: true, col: 'L', span: 24 },
  { key: 'supervisorProjectManager', label: '监理单位项目负责人及手机号', required: false, col: 'M', span: 24 },
  { key: 'supervisorSafetyManager', label: '监理单位现场安全监管人及手机号', required: false, col: 'N', span: 24 },
  { key: 'dangerControlMeasures', label: '*风险管控措施', required: true, col: 'O', span: 24, type: 'textarea' },
]

/** 危大工程侧字段（列 Q-X） */
export const MAJOR_PROJECT_FIELDS = [
  { key: 'majorWorkContent', label: '施工具体内容', required: false, col: 'Q', span: 24, type: 'textarea' },
  { key: 'majorProjectCategory', label: '*危大工程作业类别', required: true, col: 'R', span: 12 },
  { key: 'majorStartTime', label: '*作业开始时间', required: true, col: 'S', span: 12, type: 'datetime' },
  { key: 'majorEndTime', label: '*作业结束时间', required: true, col: 'T', span: 12, type: 'datetime' },
  { key: 'majorOwnerSafetyManager', label: '*建设单位现场安全监管人及手机号', required: true, col: 'U', span: 24 },
  { key: 'majorContractorSafetyManager', label: '*施工单位现场安全监管人及手机号', required: true, col: 'V', span: 24 },
  { key: 'majorSupervisorSafetyManager', label: '监理单位现场安全监管人及手机号', required: false, col: 'W', span: 24 },
  { key: 'majorControlMeasures', label: '*风险管控措施', required: true, col: 'X', span: 24, type: 'textarea' },
]

export const DANGER_WORK_CATEGORY_OPTIONS = [
  '动火作业',
  '高处作业',
  '动土作业',
  '吊装作业',
  '有限空间作业',
  '夜间作业',
  '临时用电作业',
  '不涉及危险作业',
]

export const MAJOR_PROJECT_CATEGORY_OPTIONS = [
  '深基坑',
  '高支模',
  '起重吊装',
  '脚手架工程',
  '暗挖工程',
  '不停航施工',
  '模板工程及支撑体系',
  '拆除工程',
  '其他危大工程',
]

export const DAILY_WORK_HEADER_ROW = 5
export const DAILY_WORK_DATA_START_ROW = 6

/** Excel 列号 → 字段 key */
export const EXCEL_COL_MAP = {
  1: 'leadUnit',
  2: 'projectName',
  3: 'contractor',
  4: 'workArea',
  5: 'workContent',
  6: 'dangerWorkCategory',
  7: 'startTime',
  8: 'endTime',
  9: 'ownerProjectManager',
  10: 'ownerSafetyManager',
  11: 'contractorProjectManager',
  12: 'contractorSafetyManager',
  13: 'supervisorProjectManager',
  14: 'supervisorSafetyManager',
  15: 'dangerControlMeasures',
  17: 'majorWorkContent',
  18: 'majorProjectCategory',
  19: 'majorStartTime',
  20: 'majorEndTime',
  21: 'majorOwnerSafetyManager',
  22: 'majorContractorSafetyManager',
  23: 'majorSupervisorSafetyManager',
  24: 'majorControlMeasures',
}

export function emptyDailyWorkRecord(reportDate = '') {
  return {
    reportDate,
    leadUnit: '深圳机场集团/建设工程指挥部',
    projectName: '',
    contractor: '',
    workArea: '',
    workContent: '',
    dangerWorkCategory: '',
    startTime: '',
    endTime: '',
    ownerProjectManager: '',
    ownerSafetyManager: '',
    contractorProjectManager: '',
    contractorSafetyManager: '',
    supervisorProjectManager: '',
    supervisorSafetyManager: '',
    dangerControlMeasures: '',
    majorWorkContent: '',
    majorProjectCategory: '',
    majorStartTime: '',
    majorEndTime: '',
    majorOwnerSafetyManager: '',
    majorContractorSafetyManager: '',
    majorSupervisorSafetyManager: '',
    majorControlMeasures: '',
  }
}
