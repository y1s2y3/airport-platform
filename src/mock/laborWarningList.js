import { getWarningRuleLabel } from './laborWarningConfig.js'
import {
  projectTree,
  getProjectLabel,
  getDefaultProjectId,
  getPersonnelDetail,
  maskIdCard,
} from './laborRealName.js'

export { projectTree, getProjectLabel, getDefaultProjectId }

export const warningStatusOptions = ['待处理', '已关闭', '未读', '已读']
export const handleModeOptions = ['手动处理', '系统自动关闭', '通知']

/** 各预警规则默认处置方式（对齐 Word PRD 规则清单） */
export const warningHandleModeMap = {
  noLevel3Education: '系统自动关闭',
  specialCertMissing: '系统自动关闭',
  workOver12h: '手动处理',
  ageLimit: '系统自动关闭',
  elderlyReminder: '通知',
  idCardExpired: '通知',
  absentDays: '手动处理',
  managerAttendance: '手动处理',
  blacklistEntry: '系统自动关闭',
}

/** 各预警类型处置方法说明 */
export const warningHandleGuideMap = {
  noLevel3Education:
    '本预警为系统自动关闭类型。请在人员实名制中补录三级安全教育信息；只要存在教育记录（不校验是否合格/类型），次日定时任务将自动关闭预警，无需人工关闭操作。',
  specialCertMissing:
    '本预警为系统自动关闭类型。请在人员实名制中关注特种作业操作证；ROMA/一期回写有效证书及有效期后，次日定时任务校验通过即自动关闭，无需人工关闭操作。',
  elderlyReminder:
    '本预警为通知类型。超过设定年龄时在施工方端提示，需做好工人健康情况排查工作，不强制要求退场。状态为未读/已读，无需关闭，不参与分级上报；详情只读。',
  workOver12h:
    '本预警需手动处理。请核实连续作业情况，督促人员休息并规范进出场；在下方填写处置说明，确认整改完成后点击「处置并关闭」，可上传相关证明材料。',
  ageLimit:
    '本预警为系统自动关闭类型。人员年龄低于设定下限时触发；请联系闸机系统更新人员信息或办理退场。次日定时任务检测：年龄信息正确（经 ROMA 回写）或人员退场后，自动关闭预警，无需人工关闭操作。',
  idCardExpired:
    '本预警为通知类型。人员身份证已过期时提示相关责任人关注换证与信息更新。状态为未读/已读，无需关闭，不参与分级上报；详情只读。',
  absentDays:
    '本预警需手动处理。请联系参建单位核实未出勤原因（请假、退场、漏记进出场等），督促整改；填写处置说明后关闭预警，可上传考勤补录或请假证明。',
  managerAttendance:
    '本预警需手动处理。请督促参建单位落实管理人员月度出勤要求（当月出勤天数不少于配置阈值）；填写整改措施及结果后关闭预警，可上传考勤统计表等附件。',
  blacklistEntry:
    '本预警为系统自动关闭类型。平台不做闸机强制拦截；请联系闸机系统办理退场或确认是否误录入。次日定时任务检测：人员移出黑名单或人员退场（离场）后，自动关闭预警，无需人工关闭操作。',
}

export function getWarningHandleGuide(rule_key) {
  return warningHandleGuideMap[rule_key] || '请根据预警类型落实相应处置措施。'
}

/**
 * 个人中心 / 详情「处置预警」弹窗文案（对齐 Word PRD 6.10 提示文字表）
 * 占位符：#姓名#、#身份证号（脱敏）#
 */
export const autoCloseActionPromptTemplates = {
  noLevel3Education:
    '#姓名#未按要求录入三级教育，请前往人员实名制页面补录信息；有教育记录后，次日将自动关闭预警。',
  specialCertMissing:
    '#姓名#特种作业证书缺失/过期，请联系闸机系统更新人员信息；信息回写后，次日将自动关闭预警。',
  ageLimit:
    '#姓名#年龄低于16周岁，请联系闸机系统更新人员信息或办理退场；条件满足后，次日将自动关闭预警。',
  blacklistEntry:
    '#姓名#，身份证号:#身份证号（脱敏）#，属于指挥部规定黑名单人员，请联系闸机系统办理退场或确认是否误录入；引导处理到位后，次日将自动关闭预警。',
}

/** 是否为可「去处理」跳转实名制的系统自动关闭类（待处理） */
export function isAutoCloseGuidable(warning) {
  return (
    !!warning &&
    warning.handle_mode === '系统自动关闭' &&
    warning.status === '待处理' &&
    !!autoCloseActionPromptTemplates[warning.rule_key]
  )
}

/** 生成自动关闭类处置弹窗提示（替换姓名 / 脱敏证件号） */
export function getAutoCloseActionPrompt(warning) {
  if (!warning) return ''
  const tpl = autoCloseActionPromptTemplates[warning.rule_key]
  if (!tpl) return ''
  const name = warning.name || '—'
  let idMasked = '—'
  if (warning.rule_key === 'blacklistEntry') {
    const person = getPersonnelDetail(warning.personnel_id)
    idMasked =
      person?.basic?.id_number ||
      maskIdCard(person?.basic?.id_number_raw || '') ||
      '—'
  }
  return tpl.replace(/#姓名#/g, name).replace(/#身份证号（脱敏）#/g, idMasked)
}

export const warningStatusTagClass = {
  待处理: 'ap-tag-high',
  已关闭: 'ap-tag-enabled',
  未读: 'ap-tag-medium',
  已读: 'ap-tag-low',
}

const ruleConfigSnapshot = {
  workOver12h: { hours: 12 },
  ageLimit: { minAge: 16 },
  elderlyReminder: { maleAge: 65, femaleAge: 60 },
  absentDays: { days: 3 },
  managerAttendance: { days: 20 },
}

function buildWarning({
  id,
  rule_key,
  project_id,
  personnel_id,
  personnel_no,
  name,
  unit_name,
  work_type,
  status,
  current_level = 1,
  triggered_at,
  closed_at = '',
  trigger_reason,
  disposal_records,
}) {
  const handle_mode = warningHandleModeMap[rule_key] || '手动处理'
  return {
    id,
    warning_no: `WARN-${id.replace('w-', '').toUpperCase()}`,
    rule_key,
    rule_label: getWarningRuleLabel(rule_key, ruleConfigSnapshot[rule_key]),
    project_id,
    personnel_id,
    personnel_no,
    name,
    unit_name,
    work_type,
    handle_mode,
    status,
    current_level,
    triggered_at,
    closed_at,
    trigger_reason,
    disposal_records,
  }
}

const warningList = [
  buildWarning({
    id: 'w-001',
    rule_key: 'noLevel3Education',
    project_id: 'p-000',
    personnel_id: 'rn-p-000-0003',
    personnel_no: 'RN-P-000-0003',
    name: '王芳',
    unit_name: '深圳市政集团有限公司',
    work_type: '普工',
    status: '已关闭',
    current_level: 1,
    triggered_at: '2026-06-25 09:12:00',
    closed_at: '2026-06-26 14:30:00',
    trigger_reason: '人员已办理入场登记，系统未查询到三级安全教育记录。',
    disposal_records: [
      { time: '2026-06-25 09:12:00', type: 'trigger', operator: '系统', content: '触发未进行入场三级教育预警' },
      { time: '2026-06-26 14:28:00', type: 'auto_close', operator: '系统', content: '检测到已录入三级安全教育信息（培训日期：2026-06-26，结果：合格），预警自动关闭' },
      { time: '2026-06-26 14:30:00', type: 'close', operator: '系统', content: '预警状态变更为已关闭' },
    ],
  }),
  buildWarning({
    id: 'w-002',
    rule_key: 'workOver12h',
    project_id: 'p-000',
    personnel_id: 'rn-p-000-0001',
    personnel_no: 'RN-P-000-0001',
    name: '张强',
    unit_name: '中建三局第一建设工程有限责任公司',
    work_type: '钢筋工',
    status: '待处理',
    current_level: 2,
    triggered_at: '2026-06-29 21:05:00',
    trigger_reason: '2026-06-29 进场 07:02，截至 21:05 未出场，连续作业时长 14 小时，超过阈值 12 小时。',
    disposal_records: [
      { time: '2026-06-29 21:05:00', type: 'trigger', operator: '系统', content: '触发连续工作超12小时预警' },
      { time: '2026-06-30 09:00:00', type: 'escalate', operator: '系统', content: '超 1 天未处置，自动上报至一级责任人（总监理）' },
      { time: '2026-07-02 09:00:00', type: 'escalate', operator: '系统', content: '超 3 天未处置，自动上报至二级责任人（项目经理）' },
    ],
  }),
  buildWarning({
    id: 'w-003',
    rule_key: 'specialCertMissing',
    project_id: 'p-001',
    personnel_id: 'rn-p-001-0004',
    personnel_no: 'RN-P-001-0004',
    name: '赵磊',
    unit_name: '中建三局第一建设工程有限责任公司',
    work_type: '特种-电工',
    status: '已关闭',
    current_level: 1,
    triggered_at: '2026-06-20 08:00:00',
    closed_at: '2026-06-22 11:20:00',
    trigger_reason: '特种作业人员未上传有效特种作业操作证，或证书已过期。',
    disposal_records: [
      { time: '2026-06-20 08:00:00', type: 'trigger', operator: '系统', content: '触发特种作业证书缺失/过期预警' },
      { time: '2026-06-22 11:18:00', type: 'auto_close', operator: '系统', content: '检测到已上传特种作业操作证（证号 T4403002023001234，有效期至 2027-08-15），预警自动关闭' },
      { time: '2026-06-22 11:20:00', type: 'close', operator: '系统', content: '预警状态变更为已关闭' },
    ],
  }),
  buildWarning({
    id: 'w-004',
    rule_key: 'blacklistEntry',
    project_id: 'p-003',
    personnel_id: 'p-003-8',
    personnel_no: 'RN-P-003-0008',
    name: '吴敏',
    unit_name: '广东建工集团有限公司',
    work_type: '普工',
    status: '待处理',
    current_level: 1,
    triggered_at: '2026-06-28 06:45:00',
    trigger_reason:
      '每日定时扫描：人员在岗且证件号命中全平台劳务黑名单，生成黑名单人员进场预警（二期不做强制拦截，系统自动关闭类）。',
    disposal_records: [
      { time: '2026-06-28 06:45:00', type: 'trigger', operator: '系统', content: '触发黑名单人员进场预警' },
      {
        time: '2026-06-29 00:05:00',
        type: 'escalate',
        operator: '系统',
        content: '超 1 天未关闭，自动上报至一级责任人（仍待移出黑名单或退场后次日自动关闭）',
      },
    ],
  }),
  buildWarning({
    id: 'w-005',
    rule_key: 'absentDays',
    project_id: 'p-000',
    personnel_id: 'rn-p-000-0006',
    personnel_no: 'RN-P-000-0006',
    name: '陈静',
    unit_name: '中建三局第一建设工程有限责任公司',
    work_type: '安全员',
    status: '待处理',
    current_level: 1,
    triggered_at: '2026-06-29 00:00:00',
    trigger_reason: '在岗人员连续 3 天（2026-06-27 至 2026-06-29）无考勤记录。',
    disposal_records: [
      { time: '2026-06-29 00:00:00', type: 'trigger', operator: '系统', content: '触发连续3天未出勤预警' },
    ],
  }),
  buildWarning({
    id: 'w-006',
    rule_key: 'elderlyReminder',
    project_id: 'p-005',
    personnel_id: 'rn-p-005-0010',
    personnel_no: 'RN-P-005-0010',
    name: '老马',
    unit_name: '中铁建工集团有限公司',
    work_type: '普工',
    status: '未读',
    current_level: 1,
    triggered_at: '2026-06-27 08:30:00',
    closed_at: '',
    trigger_reason: '男性人员年龄 66 岁，超过高龄提醒阈值（65 岁），已通知施工方端排查健康情况。',
    disposal_records: [
      { time: '2026-06-27 08:30:00', type: 'trigger', operator: '系统', content: '触发高龄提醒（男65岁/女60岁），已向施工方推送提示（通知类，无需关闭）' },
    ],
  }),
  buildWarning({
    id: 'w-008',
    rule_key: 'ageLimit',
    project_id: 'p-004',
    personnel_id: 'p-004-5',
    personnel_no: 'RN-P-004-0005',
    name: '刘洋',
    unit_name: '深圳市政集团有限公司',
    work_type: '普工',
    status: '待处理',
    current_level: 1,
    triggered_at: '2026-06-15 10:00:00',
    closed_at: '',
    trigger_reason: '人员年龄 15 岁，低于实名制年龄下限 16 周岁。',
    disposal_records: [
      { time: '2026-06-15 10:00:00', type: 'trigger', operator: '系统', content: '触发实名制年龄低于16周岁预警' },
    ],
  }),
  buildWarning({
    id: 'w-009',
    rule_key: 'managerAttendance',
    project_id: 'p-003',
    personnel_id: 'rn-p-003-0006',
    personnel_no: 'RN-P-003-0006',
    name: '陈静',
    unit_name: '中建三局第一建设工程有限责任公司',
    work_type: '安全员',
    status: '待处理',
    current_level: 1,
    triggered_at: '2026-06-29 08:00:00',
    trigger_reason: '管理人员 6 月出勤 15 天，少于配置阈值 20 天。',
    disposal_records: [
      { time: '2026-06-29 08:00:00', type: 'trigger', operator: '系统', content: '触发管理人员考勤不达标，每月出勤少于20天预警' },
    ],
  }),
  buildWarning({
    id: 'w-010',
    rule_key: 'idCardExpired',
    project_id: 'p-000',
    personnel_id: 'rn-p-000-0005',
    personnel_no: 'RN-P-000-0005',
    name: '刘洋',
    unit_name: '广东建工集团有限公司',
    work_type: '特种-焊工',
    status: '未读',
    current_level: 1,
    triggered_at: '2026-06-28 00:00:00',
    trigger_reason: '身份证有效期已过期，已通知相关责任人关注换证。',
    disposal_records: [
      { time: '2026-06-28 00:00:00', type: 'trigger', operator: '系统', content: '触发身份证过期提醒（通知类，无需关闭）' },
    ],
  }),
  buildWarning({
    id: 'w-011',
    rule_key: 'noLevel3Education',
    project_id: 'p-001',
    personnel_id: 'rn-p-001-0007',
    personnel_no: 'RN-P-001-0007',
    name: '孙伟',
    unit_name: '中铁建工集团有限公司',
    work_type: '架子工',
    status: '已关闭',
    triggered_at: '2026-06-18 08:20:00',
    closed_at: '2026-06-19 16:45:00',
    trigger_reason: '人员在岗，实名制档案中无三级安全教育记录。',
    disposal_records: [
      { time: '2026-06-18 08:20:00', type: 'trigger', operator: '系统', content: '触发未进行入场三级教育预警' },
      { time: '2026-06-19 16:43:00', type: 'auto_close', operator: '系统', content: '检测到已录入三级安全教育（2026-06-19，4学时，合格），预警自动关闭' },
      { time: '2026-06-19 16:45:00', type: 'close', operator: '系统', content: '预警状态变更为已关闭' },
    ],
  }),
  buildWarning({
    id: 'w-012',
    rule_key: 'specialCertMissing',
    project_id: 'p-003',
    personnel_id: 'rn-p-003-0007',
    personnel_no: 'RN-P-003-0007',
    name: '周杰',
    unit_name: '中铁建工集团有限公司',
    work_type: '特种-架子工',
    status: '已关闭',
    triggered_at: '2026-06-10 07:30:00',
    closed_at: '2026-06-11 09:15:00',
    trigger_reason: '特种作业人员架子工证书已于 2026-06-09 到期，系统未查询到有效证书。',
    disposal_records: [
      { time: '2026-06-10 07:30:00', type: 'trigger', operator: '系统', content: '触发特种作业证书缺失/过期预警' },
      { time: '2026-06-11 09:13:00', type: 'auto_close', operator: '系统', content: '检测到已更新特种作业操作证（证号 T4403002024009012，有效期至 2028-06-08），预警自动关闭' },
      { time: '2026-06-11 09:15:00', type: 'close', operator: '系统', content: '预警状态变更为已关闭' },
    ],
  }),
  buildWarning({
    id: 'w-013',
    rule_key: 'elderlyReminder',
    project_id: 'p-000',
    personnel_id: 'rn-p-000-0011',
    personnel_no: 'RN-P-000-0011',
    name: '李大姐',
    unit_name: '深圳市政集团有限公司',
    work_type: '普工',
    status: '已读',
    triggered_at: '2026-06-26 07:55:00',
    closed_at: '',
    trigger_reason: '女性人员年龄 61 岁，超过高龄提醒阈值（60 岁），已通知施工方端排查健康情况。',
    disposal_records: [
      { time: '2026-06-26 07:55:00', type: 'trigger', operator: '系统', content: '触发高龄提醒（男65岁/女60岁），已向施工方推送提示（通知类，无需关闭）' },
    ],
  }),
  buildWarning({
    id: 'w-014',
    rule_key: 'noLevel3Education',
    project_id: 'p-004',
    personnel_id: 'rn-p-004-0003',
    personnel_no: 'RN-P-004-0003',
    name: '黄斌',
    unit_name: '广东建工集团有限公司',
    work_type: '混凝土工',
    status: '已关闭',
    triggered_at: '2026-06-22 10:00:00',
    closed_at: '2026-06-23 11:30:00',
    trigger_reason: '新入场人员未完成三级安全教育登记。',
    disposal_records: [
      { time: '2026-06-22 10:00:00', type: 'trigger', operator: '系统', content: '触发未进行入场三级教育预警' },
      { time: '2026-06-23 11:28:00', type: 'auto_close', operator: '系统', content: '检测到已补录三级安全教育（2026-06-23，6学时，合格），预警自动关闭' },
      { time: '2026-06-23 11:30:00', type: 'close', operator: '系统', content: '预警状态变更为已关闭' },
    ],
  }),
  buildWarning({
    id: 'w-015',
    rule_key: 'specialCertMissing',
    project_id: 'p-005',
    personnel_id: 'rn-p-005-0004',
    personnel_no: 'RN-P-005-0004',
    name: '赵磊',
    unit_name: '中建三局第一建设工程有限责任公司',
    work_type: '特种-电工',
    status: '已关闭',
    triggered_at: '2026-06-24 08:00:00',
    closed_at: '2026-06-24 15:20:00',
    trigger_reason: '电工岗位人员未上传特种作业操作证附件。',
    disposal_records: [
      { time: '2026-06-24 08:00:00', type: 'trigger', operator: '系统', content: '触发特种作业证书缺失/过期预警' },
      { time: '2026-06-24 15:18:00', type: 'auto_close', operator: '系统', content: '检测到已上传电工操作证（证号 T4403002023001234，有效期至 2027-08-15），预警自动关闭' },
      { time: '2026-06-24 15:20:00', type: 'close', operator: '系统', content: '预警状态变更为已关闭' },
    ],
  }),
  buildWarning({
    id: 'w-016',
    rule_key: 'elderlyReminder',
    project_id: 'p-003',
    personnel_id: 'rn-p-003-0011',
    personnel_no: 'RN-P-003-0011',
    name: '老周',
    unit_name: '中铁建工集团有限公司',
    work_type: '钢筋工',
    status: '未读',
    triggered_at: '2026-06-30 06:40:00',
    closed_at: '',
    trigger_reason: '男性人员年龄 66 岁，超过高龄提醒阈值（65 岁），已通知施工方端排查健康情况。',
    disposal_records: [
      { time: '2026-06-30 06:40:00', type: 'trigger', operator: '系统', content: '触发高龄提醒（男65岁/女60岁），已向施工方推送提示（通知类，无需关闭）' },
    ],
  }),
  buildWarning({
    id: 'w-017',
    rule_key: 'noLevel3Education',
    project_id: 'p-000',
    personnel_id: 'p-000-9',
    personnel_no: 'RN-P-000-0009',
    name: '郑伟',
    unit_name: '中建三局第一建设工程有限责任公司',
    work_type: '普工',
    status: '待处理',
    triggered_at: '2026-06-30 09:00:00',
    trigger_reason: '人员在岗，尚未录入三级安全教育记录，等待补录后系统自动关闭。',
    disposal_records: [
      { time: '2026-06-30 09:00:00', type: 'trigger', operator: '系统', content: '触发未进行入场三级教育预警' },
    ],
  }),
]

export function getProjectWarnings(project_id) {
  if (!project_id || project_id === 'hq') {
    return warningList.map((item) => ({ ...item }))
  }
  return warningList.filter((item) => item.project_id === project_id).map((item) => ({ ...item }))
}

export function getWarningDetail(id) {
  const found = warningList.find((item) => item.id === id)
  return found ? { ...found, disposal_records: [...found.disposal_records] } : null
}

export function getProjectPendingCount(project_id) {
  return getProjectWarnings(project_id).filter((item) => item.status === '待处理').length
}

export function getWarningStats(project_id) {
  const list = getProjectWarnings(project_id)
  return {
    total: list.length,
    pending: list.filter((item) => item.status === '待处理').length,
    closed: list.filter((item) => item.status === '已关闭').length,
    manual: list.filter((item) => item.handle_mode === '手动处理' && item.status === '待处理').length,
  }
}

function isNotifyStatus(status) {
  return status === '未读' || status === '已读'
}

export function handleWarning(id, { content, operator = '当前用户', close = false, attachments = [] }) {
  const item = warningList.find((row) => row.id === id)
  if (!item) return null
  if (item.status === '已关闭' || isNotifyStatus(item.status)) return item
  if (item.handle_mode !== '手动处理') return item

  const now = new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-')
  const record = {
    time: now,
    type: close ? 'close' : 'handle',
    operator,
    content,
  }
  if (attachments.length) {
    record.attachments = attachments.map((file) => (typeof file === 'string' ? file : file.name))
  }
  item.disposal_records.push(record)
  if (close) {
    item.status = '已关闭'
    item.closed_at = now
  } else if (item.status !== '待处理') {
    item.status = '待处理'
  }
  return { ...item, disposal_records: [...item.disposal_records] }
}

/**
 * 批量处置关单：仅「待处理」的处置任务（手动/自动关闭类）→「已关闭」
 * 与详情处置一致写入说明与附件
 */
export function batchDisposeWarnings(
  ids,
  { content, operator = '当前用户', attachments = [] } = {},
) {
  const idSet = new Set((ids || []).map(String))
  const now = new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-')
  const attachNames = (attachments || []).map((file) =>
    typeof file === 'string' ? file : file.name,
  )
  let n = 0
  for (const item of warningList) {
    if (!idSet.has(String(item.id))) continue
    if (item.status !== '待处理') continue
    if (item.handle_mode !== '手动处理' && item.handle_mode !== '系统自动关闭') continue
    const record = {
      time: now,
      type: 'close',
      operator,
      content: content || '批量处置并关闭',
    }
    if (attachNames.length) record.attachments = attachNames
    item.disposal_records.push(record)
    item.status = '已关闭'
    item.closed_at = now
    n += 1
  }
  return n
}

/** 通知类标为已读（同步业务预警状态） */
export function markNotifyWarningRead(id) {
  const item = warningList.find((row) => row.id === id)
  if (!item || item.handle_mode !== '通知') return null
  if (item.status === '已读') return item
  item.status = '已读'
  return item
}

export const disposalTypeLabels = {
  trigger: '触发预警',
  escalate: '分级上报',
  handle: '人工处置',
  auto_close: '系统自动关闭',
  close: '关闭预警',
}

export const disposalTypeTagClass = {
  trigger: 'ap-tag-high',
  escalate: 'ap-tag-medium',
  handle: 'ap-tag-low',
  auto_close: 'ap-tag-enabled',
  close: 'ap-tag-enabled',
}
