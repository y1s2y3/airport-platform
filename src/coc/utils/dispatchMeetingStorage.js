import { COMMAND_MEETING_HISTORY, MOCK_NOTICE, AI_INTERCOM_RECORDS, DISPATCH_CURRENT_USER } from '../mock/data.js'
import { resolveExecutorDisplay } from './executorDisplay.js'

const NOTICE_KEY = 'coc-admin-dispatch-notices'
const PENALTY_KEY = 'coc-admin-dispatch-penalties'
const REMINDER_KEY = 'coc-admin-dispatch-reminders'
const MEETING_KEY = 'coc-admin-dispatch-meetings'
const SEED_FLAG = 'coc-admin-dispatch-seeded-v1'
const SNAPSHOT_PATCH_FLAG = 'coc-admin-dispatch-snapshot-v1'
const MEETING_DETAIL_PATCH_FLAG = 'coc-admin-dispatch-meeting-detail-v1'
const DOC_FIELDS_PATCH_FLAG = 'coc-admin-dispatch-doc-fields-v2'
const PENALTY_PENDING_PATCH_FLAG = 'coc-admin-penalty-pending-v1'
const PENALTY_APPEAL_PATCH_FLAG = 'coc-admin-penalty-appeal-v1'
const PENALTY_STATUS_PATCH_FLAG = 'coc-admin-penalty-status-v2'
const REMINDER_SEED_FLAG = 'coc-admin-dispatch-reminder-v1'
const REMINDER_STATUS_PATCH_FLAG = 'coc-admin-reminder-status-v1'
const NOTICE_STATUS_PATCH_FLAG = 'coc-admin-notice-status-v1'
const CHANGE_EVENT = 'coc-dispatch-meeting-change'

export const NOTICE_STATUSES = {
  PENDING: '待下发',
  ISSUED: '已下发',
  RECEIVED: '已接收',
  VOID: '已作废',
}

function migrateNoticeStatus(status) {
  if (status === '待签收' || status === '待确认') return NOTICE_STATUSES.PENDING
  if (status === '已闭环') return NOTICE_STATUSES.RECEIVED
  return status
}

const migrateReminderStatus = migrateNoticeStatus

export const PENALTY_STATUSES = {
  PENDING: '待下发',
  PROCESSING: '处理中',
  PENDING_ACCEPTANCE: '待验收',
  CLOSED: '已关闭',
  APPEALING: '申诉中',
}

function migratePenaltyStatus(status) {
  if (status === '已下发') return PENALTY_STATUSES.PROCESSING
  if (status === '待确认') return PENALTY_STATUSES.PENDING_ACCEPTANCE
  if (status === '已作废' || status === '已闭环') return PENALTY_STATUSES.CLOSED
  return status
}

function buildMonitorSnapshotMock({
  cameraName = '监控摄像头',
  stamp = '2026-06-12 10:15:32',
  hue = 20,
  markX = 470,
  markY = 138,
  markRx = 58,
  markRy = 44,
}) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="hsl(${hue}, 32%, 30%)"/>
        <stop offset="100%" stop-color="#141414"/>
      </linearGradient>
    </defs>
    <rect width="640" height="360" fill="url(#bg)"/>
    <rect x="0" y="0" width="640" height="28" fill="rgba(0,0,0,0.35)"/>
    <text x="12" y="18" fill="rgba(255,255,255,0.55)" font-size="11" font-family="sans-serif">深圳机场扩建工程 · 视频监控</text>
    <text x="320" y="172" text-anchor="middle" fill="rgba(255,255,255,0.28)" font-size="26" font-weight="700" font-family="sans-serif">监控画面</text>
    <text x="320" y="204" text-anchor="middle" fill="rgba(255,255,255,0.72)" font-size="14" font-family="sans-serif">${cameraName}</text>
    <ellipse cx="${markX}" cy="${markY}" rx="${markRx}" ry="${markRy}" fill="none" stroke="#f56c6c" stroke-width="3"/>
    <line x1="${markX - 40}" y1="${markY + 50}" x2="${markX + 20}" y2="${markY + 10}" stroke="#f56c6c" stroke-width="2"/>
    <text x="12" y="348" fill="rgba(255,255,255,0.78)" font-size="11" font-family="sans-serif">${stamp}</text>
  </svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

const NOTICE_SNAPSHOTS = {
  [MOCK_NOTICE.id]: buildMonitorSnapshotMock({
    cameraName: '3号塔吊球机',
    stamp: '2026-06-15 10:18:06',
    hue: 12,
    markX: 430,
    markY: 125,
  }),
  'GZ-20260615-002': buildMonitorSnapshotMock({
    cameraName: '捷运线通道枪机',
    stamp: '2026-06-15 10:20:41',
    hue: 28,
    markX: 360,
    markY: 160,
    markRx: 72,
    markRy: 36,
  }),
  'GZ-20260612-004': buildMonitorSnapshotMock({
    cameraName: '基坑全景枪机',
    stamp: '2026-06-12 10:18:22',
    hue: 18,
    markX: 500,
    markY: 150,
  }),
}

const PENALTY_SNAPSHOTS = {
  'CF-20260612-001': buildMonitorSnapshotMock({
    cameraName: '3号塔吊球机',
    stamp: '2026-06-12 10:15:32',
    hue: 10,
    markX: 455,
    markY: 120,
    markRx: 64,
    markRy: 48,
  }),
  'CF-20260612-002': buildMonitorSnapshotMock({
    cameraName: '基坑全景枪机',
    stamp: '2026-06-12 10:12:08',
    hue: 16,
    markX: 390,
    markY: 170,
  }),
  'CF-20260611-003': buildMonitorSnapshotMock({
    cameraName: 'T2主体通道枪机',
    stamp: '2026-06-11 16:40:15',
    hue: 32,
    markX: 280,
    markY: 190,
    markRx: 80,
    markRy: 40,
  }),
  'CF-20260610-004': buildMonitorSnapshotMock({
    cameraName: '钢筋加工场球机',
    stamp: '2026-06-10 11:05:47',
    hue: 22,
    markX: 520,
    markY: 145,
  }),
}

function attachNoticeSnapshots(list) {
  return list.map((item) =>
    item.snapshot ? item : { ...item, snapshot: NOTICE_SNAPSHOTS[item.id] || '' },
  )
}

function attachPenaltySnapshots(list) {
  return list.map((item) =>
    item.snapshot ? item : { ...item, snapshot: PENALTY_SNAPSHOTS[item.id] || '' },
  )
}

function readList(key) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function writeList(key, list) {
  localStorage.setItem(key, JSON.stringify(list))
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT))
}

function defaultDeadline() {
  const d = new Date()
  d.setDate(d.getDate() + 7)
  return d.toISOString().slice(0, 10)
}

function buildNoticeContentText(fields) {
  const lines = [
    fields.cameraName ? `监控点位：${fields.cameraName}（${fields.cameraLocation || '—'}）` : '',
    `项目名称：${fields.project || '—'}`,
    `工作类型：${fields.workType || '—'}`,
    `工作要求：${fields.workRequirement || '—'}`,
    `执行人：${resolveExecutorDisplay(fields.executor || fields.executeDept)}`,
    `完成时限：${fields.deadline || '—'}`,
    fields.remark ? `备注：${fields.remark}` : '',
  ]
  return lines.filter(Boolean).join('\n\n')
}

function buildReminderContentText(fields) {
  const lines = [
    fields.cameraName ? `监控点位：${fields.cameraName}（${fields.cameraLocation || '—'}）` : '',
    `项目名称：${fields.project || '—'}`,
    `事项描述：${fields.matterDescription || '—'}`,
    `指派人：${fields.assignee || fields.executor || '—'}`,
    `完成时限：${fields.deadline || '—'}`,
  ]
  return lines.filter(Boolean).join('\n\n')
}

function buildPenaltyContentText(fields) {
  const lines = [
    fields.cameraName ? `监控点位：${fields.cameraName}（${fields.cameraLocation || '—'}）` : '',
    `项目名称：${fields.project || '—'}`,
    `事由：${fields.penaltyReason || '—'}`,
    `内容：${fields.penaltyContent || '—'}`,
  ]
  return lines.filter(Boolean).join('\n\n')
}

export function normalizeNoticeRecord(record = {}) {
  const workType =
    record.workType !== undefined && record.workType !== null
      ? record.workType
      : (record.type || '安全')
  const workRequirement = record.workRequirement || record.content || ''
  const rawExecutor =
    record.executor !== undefined && record.executor !== null
      ? record.executor
      : (record.executeDept || record.unit || '')
  const executor = rawExecutor ? resolveExecutorDisplay(rawExecutor) : ''
  const deadline = record.deadline || defaultDeadline()
  const remark = record.remark || ''
  const titleBase = workRequirement.trim().slice(0, 24) || record.title || '任务单'
  const contentFields = {
    project: record.project || '',
    workType,
    workRequirement,
    executor,
    executeDept: executor,
    deadline,
    remark,
    cameraName: record.cameraName,
    cameraLocation: record.cameraLocation,
  }
  return {
    ...record,
    workType,
    workRequirement,
    executor,
    executeDept: executor,
    deadline,
    remark,
    title: record.title || (titleBase.length >= 24 ? `${titleBase}…` : titleBase),
    project: record.project || '',
    type: workType,
    unit: executor,
    content:
      record.content?.includes('工作类型：') && record.content?.includes('项目名称：')
        ? record.content
        : buildNoticeContentText(contentFields),
    status: migrateNoticeStatus(record.status || NOTICE_STATUSES.PENDING),
    issueTime: record.issueTime ?? '—',
    issuer: record.issuer || DISPATCH_CURRENT_USER,
  }
}

export function normalizeReminderRecord(record = {}) {
  const matterDescription = record.matterDescription || record.content || ''
  const rawAssignee =
    record.assignee !== undefined && record.assignee !== null
      ? record.assignee
      : (record.executor || record.rectifier || '')
  const assignee = rawAssignee ? resolveExecutorDisplay(rawAssignee) : ''
  const deadline = record.deadline || defaultDeadline()
  const titleBase = matterDescription.trim().slice(0, 24) || record.title || '提示函'
  const contentFields = {
    project: record.project || '',
    matterDescription,
    assignee,
    executor: assignee,
    deadline,
    cameraName: record.cameraName,
    cameraLocation: record.cameraLocation,
  }
  return {
    ...record,
    matterDescription,
    assignee,
    executor: assignee,
    deadline,
    title: record.title || (titleBase.length >= 24 ? `${titleBase}…` : titleBase),
    project: record.project || '',
    docType: 'reminder',
    source: record.source || '后台录入',
    status: migrateReminderStatus(record.status || NOTICE_STATUSES.PENDING),
    issueTime: record.issueTime ?? '—',
    issuer: record.issuer || DISPATCH_CURRENT_USER,
    content:
      record.content?.includes('事项描述：') && record.content?.includes('项目名称：')
        ? record.content
        : buildReminderContentText(contentFields),
  }
}

export function normalizePenaltyRecord(record = {}) {
  const penaltyReason = record.penaltyReason || record.title || ''
  const penaltyContent = record.penaltyContent || record.content || ''
  const penaltyClause = record.penaltyClause || ''
  const amount = record.amount || ''
  const titleBase = penaltyReason.trim().slice(0, 24) || '处罚单'
  const contentFields = {
    project: record.project || '',
    unit: record.unit || record.executeDept || '',
    penaltyReason,
    penaltyContent,
    cameraName: record.cameraName,
    cameraLocation: record.cameraLocation,
  }
  return {
    ...record,
    penaltyReason,
    penaltyContent,
    penaltyClause,
    amount,
    title: record.title || (titleBase.length >= 24 ? `${titleBase}…` : titleBase),
    project: record.project || '',
    unit: record.unit || record.executeDept || '',
    handler: record.handler || DISPATCH_CURRENT_USER,
    source: record.source || '后台录入',
    status: migratePenaltyStatus(record.status || PENALTY_STATUSES.PENDING),
    issueTime: record.issueTime ?? '—',
    content:
      record.content?.includes('事由：') && record.content?.includes('项目名称：')
        ? record.content
        : buildPenaltyContentText(contentFields),
    appealReason: record.appealReason || '',
    appealAttachments: Array.isArray(record.appealAttachments) ? record.appealAttachments : [],
    appealTime: record.appealTime || '',
    reportResult: record.reportResult || '',
    reportTime: record.reportTime || '',
    acceptedTime: record.acceptedTime || '',
    acceptedBy: record.acceptedBy || '',
    closedTime: record.closedTime || record.voidedAt || '',
    closedBy: record.closedBy || '',
    appealResolution: record.appealResolution || '',
  }
}

export function emptyNoticeRecord() {
  return normalizeNoticeRecord({
    id: '',
    workType: '',
    workRequirement: '',
    workSource: '后台录入',
    executor: '',
    executeDept: '',
    deadline: defaultDeadline(),
    remark: '',
    status: NOTICE_STATUSES.PENDING,
    issueTime: '—',
    snapshot: '',
  })
}

export function emptyReminderRecord() {
  return normalizeReminderRecord({
    id: '',
    project: '',
    matterDescription: '',
    assignee: '',
    deadline: defaultDeadline(),
    issueTime: '—',
    status: NOTICE_STATUSES.PENDING,
    source: '后台录入',
    snapshot: '',
  })
}

export function emptyPenaltyRecord() {
  return normalizePenaltyRecord({
    id: '',
    project: '',
    unit: '',
    penaltyReason: '',
    penaltyContent: '',
    penaltyClause: '',
    amount: '',
    issueTime: '—',
    status: PENALTY_STATUSES.PENDING,
    source: '后台录入',
    snapshot: '',
    blackBoardSynced: false,
    blackBoardMonth: '',
    blackBoardId: '',
    appealReason: '',
    appealAttachments: [],
    appealTime: '',
    reportResult: '',
    reportTime: '',
  })
}

function buildNoticeSeed() {
  return attachNoticeSnapshots([
    normalizeNoticeRecord({
      id: MOCK_NOTICE.id,
      project: MOCK_NOTICE.project,
      workType: MOCK_NOTICE.type || '安全',
      workRequirement: MOCK_NOTICE.description,
      workSource: '调度指挥会议',
      executeDept: MOCK_NOTICE.unit,
      deadline: MOCK_NOTICE.deadline,
      ledgerHandling: '纳入任务单台账',
      remark: '',
      issueTime: MOCK_NOTICE.issueTime,
      issuer: MOCK_NOTICE.issuer,
      status: NOTICE_STATUSES.ISSUED,
    }),
    normalizeNoticeRecord({
      id: 'GZ-20260615-002',
      project: '捷运线延长段',
      workType: '质量',
      workRequirement:
        '根据现场抽检视频对讲记录，告知：1 项分部分项验收未通过，须组织复检；2 名特种作业人员证件即将过期，须 7 日内换证。',
      workSource: '现场抽检对讲',
      executor: '王强（项目经理）',
      executeDept: '王强（项目经理）',
      deadline: '2026-06-18',
      issueTime: '—',
      issuer: '质量部',
      status: NOTICE_STATUSES.PENDING,
    }),
    normalizeNoticeRecord({
      id: 'GZ-20260614-003',
      project: '飞行区5号通道',
      workType: '质量',
      workRequirement: '飞行区通道混凝土浇筑前须完成质量交底及样板确认，请责任单位签收并反馈执行计划。',
      workSource: '调度指挥会议',
      executor: '张安全（安监专员）',
      executeDept: '张安全（安监专员）',
      deadline: '2026-06-17',
      issueTime: '2026-06-14 14:00',
      issuer: DISPATCH_CURRENT_USER,
      status: NOTICE_STATUSES.ISSUED,
    }),
    normalizeNoticeRecord({
      id: 'GZ-20260612-004',
      project: '捷运线延长段',
      workType: '安全',
      workRequirement: '基坑周边临边防护缺失，要求今日内完成加固并上传整改照片。',
      workSource: '安质管控对讲',
      executor: '李巡检（巡检工程师）',
      executeDept: '李巡检（巡检工程师）',
      deadline: '2026-06-13',
      issueTime: '2026-06-12 10:18',
      issuer: '安监部',
      status: NOTICE_STATUSES.RECEIVED,
      receivedTime: '2026-06-12 14:30',
      receivedBy: '李巡检（巡检工程师）',
    }),
  ])
}

function buildPenaltyPendingRecords() {
  return [
    normalizePenaltyRecord({
      id: 'CF-PENDING-001',
      project: '捷运线延长段',
      unit: '中建三局（捷运线施工总承包）',
      penaltyReason: '临边防护缺失限期整改',
      penaltyContent: '基坑周边临边防护缺失（较大隐患），要求今日内完成加固并提交闭环材料。',
      handler: DISPATCH_CURRENT_USER,
      issueTime: '—',
      status: PENALTY_STATUSES.PENDING,
      source: '监理隐患清单',
    }),
    normalizePenaltyRecord({
      id: 'CF-PENDING-002',
      project: 'T2主体结构',
      unit: '中建二局',
      penaltyReason: '动火作业手续不全',
      penaltyContent: '现场动火作业未办理完整审批手续，责令停工整改并处以违约金。',
      handler: '安监部',
      issueTime: '—',
      status: PENALTY_STATUSES.PENDING,
      source: '调度指挥会议',
    }),
  ]
}

function buildPenaltySeed() {
  return attachPenaltySnapshots([
    ...buildPenaltyPendingRecords(),
    normalizePenaltyRecord({
      id: 'CF-20260612-001',
      project: '捷运线延长段',
      unit: '中建三局（捷运线施工总承包）',
      penaltyReason: '塔吊警戒标识不足',
      penaltyContent:
        '3号塔吊作业区警戒标识不足，存在人员误入风险。限期 24 小时内整改，逾期将按合同条款追加处罚并通报。',
      handler: '工程管理部',
      issueTime: '2026-06-12 10:15',
      status: PENALTY_STATUSES.PROCESSING,
      source: '调度指挥会议',
    }),
    normalizePenaltyRecord({
      id: 'CF-20260612-002',
      project: '飞行区5号通道',
      unit: '中建八局',
      penaltyReason: '混凝土养护措施不到位',
      penaltyContent: '浇筑完成后未按规范覆盖养护，存在开裂风险，限期整改。',
      penaltyClause: '《文明施工管理办法》处罚条款',
      amount: '2000元',
      handler: '质量部',
      issueTime: '2026-06-12 10:12',
      status: PENALTY_STATUSES.PENDING_ACCEPTANCE,
      reportResult: '已完成覆盖养护整改，提交现场照片及养护记录。',
      reportTime: '2026-06-12 16:30',
      source: '巡检对讲',
    }),
    normalizePenaltyRecord({
      id: 'CF-20260611-003',
      project: 'T2主体结构',
      unit: '中建二局',
      penaltyReason: '文明施工违规',
      penaltyContent: '材料堆放占用消防通道，违反文明施工管理规定，处以违约金并限期清场。',
      penaltyClause: '《文明施工管理办法》处罚条款',
      amount: '5000元',
      handler: '工程管理部',
      issueTime: '2026-06-11 16:40',
      status: PENALTY_STATUSES.APPEALING,
      source: '调度指挥会议',
      appealReason: '现场已按要求完成清场，处罚依据与事实不符，申请复核减免。',
      appealAttachments: [
        { name: '清场整改照片_20260612.jpg' },
        { name: '文明施工自查报告.pdf' },
      ],
      appealTime: '2026-06-12 09:30',
    }),
    normalizePenaltyRecord({
      id: 'CF-20260610-004',
      project: '钢筋加工场',
      unit: '中铁建工',
      penaltyReason: '高处作业违规',
      penaltyContent: '高处作业人员未系安全带，现场立即停工整改，并对责任单位处以违约金。',
      penaltyClause: '《建设工程施工合同》违约处罚条款',
      amount: '3000元',
      handler: '安监部',
      issueTime: '2026-06-10 11:05',
      status: PENALTY_STATUSES.CLOSED,
      reportResult: '已停工整改并完成安全带佩戴专项交底。',
      reportTime: '2026-06-10 15:20',
      acceptedTime: '2026-06-10 17:00',
      acceptedBy: '安监部',
      source: '安质管控对讲',
    }),
  ])
}

const DEFAULT_ATTENDEES = [
  '指挥部调度席',
  '工程管理部对讲席',
  '张安全（捷运线基坑巡检）',
  '李巡检（塔吊作业区）',
  '赵军（钢筋加工场）',
  '陈磊（航站区主体）',
]

function buildRecordingFilename(item) {
  const stamp = String(item.startTime || '')
    .replace(/[-:\s]/g, '')
    .slice(0, 12)
  return `调度指挥会议录音_${stamp || 'demo'}.m4a`
}

function buildMeetingTranscript(index = 0) {
  const offset = index % AI_INTERCOM_RECORDS.length
  return AI_INTERCOM_RECORDS.map((line, idx) => ({
    ...line,
    time: line.time || `${String(9 + Math.floor((idx + offset) / 6)).padStart(2, '0')}:${String(((idx + offset) * 7) % 60).padStart(2, '0')}`,
  }))
}

export function buildSummaryMinutes(item, transcript = []) {
  const attendeeText = (item.attendees || DEFAULT_ATTENDEES.slice(0, item.joinedCount)).join('、') || '—'
  const paragraphs = [
    `本次「${item.title}」于 ${item.startTime || '—'} 召开，时长 ${item.duration || '—'}，由 ${item.host || '—'} 主持，共 ${item.joinedCount ?? 0} 人入会、${item.pendingCount ?? 0} 人未入会。`,
    item.summary
      ? `会议重点：${item.summary}`
      : '会议围绕在建项目安全质量管控开展视频调度与现场核查。',
  ]

  const speechLines = transcript.filter((line) => ['speech', 'handheld', 'web'].includes(line.role))
  if (speechLines.length) {
    const highlights = speechLines.slice(0, 4).map((line) => `${line.speaker}：${line.content}`)
    paragraphs.push(`过程要点：${highlights.join('；')}。`)
  }

  paragraphs.push(
    `参会人员包括 ${attendeeText}。会后需按决议事项推进隐患整改闭环，未入会终端须补录说明并归档至 COC 平台。`,
  )

  return paragraphs.join('\n\n')
}

function enrichMeetingRecord(item, index = 0) {
  const transcript = item.transcript?.length ? item.transcript : buildMeetingTranscript(index)
  const legacyMinutes =
    !item.minutes ||
    String(item.minutes).includes('一、会议概况') ||
    (String(item.minutes).startsWith('【') && String(item.minutes).includes('】会议纪要'))
  return {
    ...item,
    summary: item.summary || '',
    minutes: legacyMinutes
      ? buildSummaryMinutes({ ...item, transcript }, transcript)
      : item.minutes,
    transcript,
    hasRecording: item.hasRecording ?? true,
    recordingFilename: item.recordingFilename || buildRecordingFilename(item),
    recordingLocalPath: item.recordingLocalPath || '',
  }
}

function buildMeetingSeed() {
  return COMMAND_MEETING_HISTORY.slice(0, 10).map((item, index) =>
    enrichMeetingRecord(
      {
        id: item.id,
        title: item.title,
        startTime: item.startTime,
        duration: item.duration,
        host: item.host,
        attendees: DEFAULT_ATTENDEES.slice(0, Math.max(3, item.joinedCount)),
        joinedCount: item.joinedCount,
        pendingCount: item.pendingCount,
        summary: item.summary,
      },
      index,
    ),
  )
}

function ensureMeetingDetailPatch() {
  if (localStorage.getItem(MEETING_DETAIL_PATCH_FLAG)) return
  const list = readList(MEETING_KEY)
  if (!list.length) {
    localStorage.setItem(MEETING_DETAIL_PATCH_FLAG, '1')
    return
  }
  writeList(
    MEETING_KEY,
    list.map((item, index) => enrichMeetingRecord(item, index)),
  )
  localStorage.setItem(MEETING_DETAIL_PATCH_FLAG, '1')
}

function ensureDispatchDocFieldsPatch() {
  if (localStorage.getItem(DOC_FIELDS_PATCH_FLAG)) return
  const notices = readList(NOTICE_KEY)
  const penalties = readList(PENALTY_KEY)
  if (notices.length) writeList(NOTICE_KEY, notices.map((item) => normalizeNoticeRecord(item)))
  if (penalties.length) writeList(PENALTY_KEY, penalties.map((item) => normalizePenaltyRecord(item)))
  localStorage.setItem(DOC_FIELDS_PATCH_FLAG, '1')
}

function ensurePenaltyPendingPatch() {
  if (localStorage.getItem(PENALTY_PENDING_PATCH_FLAG)) return
  const list = readList(PENALTY_KEY)
  const pendingRecords = buildPenaltyPendingRecords()
  pendingRecords.forEach((record) => {
    const index = list.findIndex((item) => item.id === record.id)
    if (index >= 0) list[index] = { ...list[index], ...record, status: '待下发', issueTime: '—' }
    else list.unshift(record)
  })
  writeList(PENALTY_KEY, list)
  localStorage.setItem(PENALTY_PENDING_PATCH_FLAG, '1')
}

function ensurePenaltyAppealPatch() {
  if (localStorage.getItem(PENALTY_APPEAL_PATCH_FLAG)) return
  const list = readList(PENALTY_KEY)
  if (!list.length) {
    localStorage.setItem(PENALTY_APPEAL_PATCH_FLAG, '1')
    return
  }
  const appealSample = normalizePenaltyRecord({
    id: 'CF-APPEAL-001',
    project: 'T2主体结构',
    unit: '中建二局',
    penaltyReason: '文明施工违规',
    penaltyContent: '材料堆放占用消防通道，违反文明施工管理规定，处以违约金并限期清场。',
    penaltyClause: '《文明施工管理办法》处罚条款',
    amount: '5000元',
    handler: '工程管理部',
    issueTime: '2026-06-11 16:40',
    status: '申诉中',
    source: '调度指挥会议',
    appealReason: '现场已按要求完成清场，处罚依据与事实不符，申请复核减免。',
    appealAttachments: [
      { name: '清场整改照片_20260612.jpg' },
      { name: '文明施工自查报告.pdf' },
    ],
    appealTime: '2026-06-12 09:30',
  })
  const appealIndex = list.findIndex((item) => item.id === appealSample.id)
  if (appealIndex >= 0) list[appealIndex] = { ...list[appealIndex], ...appealSample }
  else list.unshift(appealSample)

  const legacyIndex = list.findIndex((item) => item.id === 'CF-20260611-003')
  if (legacyIndex >= 0 && list[legacyIndex].status !== '申诉中') {
    list[legacyIndex] = normalizePenaltyRecord({
      ...list[legacyIndex],
      status: '申诉中',
      appealReason: '已提交整改说明，认为处罚金额偏高，申请复核。',
      appealAttachments: [{ name: '整改说明及现场照片.zip' }],
      appealTime: '2026-06-12 10:15',
    })
  }

  writeList(PENALTY_KEY, list)
  localStorage.setItem(PENALTY_APPEAL_PATCH_FLAG, '1')
}

function ensurePenaltyStatusPatch() {
  if (localStorage.getItem(PENALTY_STATUS_PATCH_FLAG)) return
  const list = readList(PENALTY_KEY)
  if (!list.length) {
    localStorage.setItem(PENALTY_STATUS_PATCH_FLAG, '1')
    return
  }
  writeList(
    PENALTY_KEY,
    list.map((item) => normalizePenaltyRecord(item)),
  )
  localStorage.setItem(PENALTY_STATUS_PATCH_FLAG, '1')
}

function buildReminderSeed() {
  return [
    normalizeReminderRecord({
      id: 'TS-20260613-001',
      project: '捷运线延长段',
      matterDescription: '塔吊作业区临边防护与警示标识需限期复查，请组织落实并反馈闭环情况。',
      assignee: '王强（项目经理）',
      deadline: '2026-06-20',
      issueTime: '2026-06-13 09:10',
      issuer: DISPATCH_CURRENT_USER,
      status: NOTICE_STATUSES.ISSUED,
      source: '远程调度',
    }),
    normalizeReminderRecord({
      id: 'TS-20260615-002',
      project: 'T2主体结构',
      matterDescription: '2 名特种作业人员证件即将过期，请 7 日内完成换证并上传闭环材料。',
      assignee: '王强（项目经理）',
      deadline: '2026-06-21',
      issueTime: '—',
      issuer: '质量部',
      status: NOTICE_STATUSES.PENDING,
      source: '后台录入',
    }),
    normalizeReminderRecord({
      id: 'TS-20260614-003',
      project: '飞行区5号通道',
      matterDescription: '通道口建材堆放占用消防通道，请立即清场并设置警示标识。',
      assignee: '张安全（安监专员）',
      deadline: '2026-06-15',
      issueTime: '2026-06-12 11:08',
      issuer: DISPATCH_CURRENT_USER,
      status: NOTICE_STATUSES.ISSUED,
      source: '远程调度',
    }),
    normalizeReminderRecord({
      id: 'TS-20260612-004',
      project: '捷运线延长段',
      matterDescription: '基坑周边警示标识需补充完善，请 3 日内完成整改反馈。',
      assignee: '李巡检（巡检工程师）',
      deadline: '2026-06-13',
      issueTime: '2026-06-12 10:18',
      issuer: '安监部',
      status: NOTICE_STATUSES.RECEIVED,
      receivedTime: '2026-06-12 14:30',
      receivedBy: '李巡检（巡检工程师）',
      source: '远程调度',
    }),
  ]
}

function ensureReminderSeedPatch() {
  if (localStorage.getItem(REMINDER_SEED_FLAG)) return
  const list = readList(REMINDER_KEY)
  if (!list.length) writeList(REMINDER_KEY, buildReminderSeed())
  localStorage.setItem(REMINDER_SEED_FLAG, '1')
}

function ensureReminderStatusPatch() {
  if (localStorage.getItem(REMINDER_STATUS_PATCH_FLAG)) return
  const list = readList(REMINDER_KEY)
  if (list.length) {
    writeList(
      REMINDER_KEY,
      list.map((item) => {
        const normalized = normalizeReminderRecord(item)
        const status = migrateReminderStatus(item.status)
        return {
          ...normalized,
          status,
          issueTime:
            status === NOTICE_STATUSES.PENDING && (!item.issueTime || item.issueTime === '—')
              ? '—'
              : normalized.issueTime,
        }
      }),
    )
  }
  localStorage.setItem(REMINDER_STATUS_PATCH_FLAG, '1')
}

function ensureNoticeStatusPatch() {
  if (localStorage.getItem(NOTICE_STATUS_PATCH_FLAG)) return
  const list = readList(NOTICE_KEY)
  if (list.length) {
    writeList(
      NOTICE_KEY,
      list.map((item) => {
        const normalized = normalizeNoticeRecord(item)
        const status = migrateNoticeStatus(item.status)
        return {
          ...normalized,
          status,
          issueTime:
            status === NOTICE_STATUSES.PENDING && (!item.issueTime || item.issueTime === '—')
              ? '—'
              : normalized.issueTime,
        }
      }),
    )
  }
  localStorage.setItem(NOTICE_STATUS_PATCH_FLAG, '1')
}

export function ensureDispatchMeetingSeed() {
  if (localStorage.getItem(SEED_FLAG)) {
    ensureDispatchDocSnapshots()
    ensureMeetingDetailPatch()
    ensureDispatchDocFieldsPatch()
    ensurePenaltyPendingPatch()
    ensurePenaltyAppealPatch()
    ensurePenaltyStatusPatch()
    ensureReminderSeedPatch()
    ensureNoticeStatusPatch()
    ensureReminderStatusPatch()
    return
  }
  writeList(NOTICE_KEY, buildNoticeSeed())
  writeList(PENALTY_KEY, buildPenaltySeed())
  writeList(REMINDER_KEY, buildReminderSeed())
  writeList(MEETING_KEY, buildMeetingSeed())
  localStorage.setItem(SEED_FLAG, '1')
  localStorage.setItem(SNAPSHOT_PATCH_FLAG, '1')
  localStorage.setItem(REMINDER_SEED_FLAG, '1')
}

function ensureDispatchDocSnapshots() {
  if (localStorage.getItem(SNAPSHOT_PATCH_FLAG)) return
  const notices = attachNoticeSnapshots(readList(NOTICE_KEY))
  const penalties = attachPenaltySnapshots(readList(PENALTY_KEY))
  writeList(NOTICE_KEY, notices)
  writeList(PENALTY_KEY, penalties)
  localStorage.setItem(SNAPSHOT_PATCH_FLAG, '1')
}

export function getDispatchNoticeRecords() {
  ensureDispatchMeetingSeed()
  return readList(NOTICE_KEY)
}

export function getDispatchPenaltyRecords() {
  ensureDispatchMeetingSeed()
  return readList(PENALTY_KEY)
}

export function getDispatchReminderRecords() {
  ensureDispatchMeetingSeed()
  return readList(REMINDER_KEY)
}

export function getDispatchMeetingRecords() {
  ensureDispatchMeetingSeed()
  return readList(MEETING_KEY)
}

export function getDispatchMeetingRecord(id) {
  return getDispatchMeetingRecords().find((item) => item.id === id) || null
}

export function saveDispatchMeetingRecord(payload) {
  ensureDispatchMeetingSeed()
  const base = {
    id: payload.id || createDocId('HY'),
    title: payload.title || '调度指挥会议',
    startTime: payload.startTime || new Date().toLocaleString('zh-CN', { hour12: false }),
    duration: payload.duration || '—',
    host: payload.host || '指挥部调度席',
    attendees: payload.attendees || [],
    joinedCount: payload.joinedCount ?? 0,
    pendingCount: payload.pendingCount ?? 0,
    summary: payload.summary || '',
    transcript: payload.transcript || [],
    recordingFilename: payload.recordingFilename || '',
    recordingLocalPath: payload.recordingLocalPath || '',
    hasRecording: Boolean(payload.hasRecording),
  }
  const record = enrichMeetingRecord({
    ...base,
    minutes: payload.minutes || buildSummaryMinutes(base, base.transcript),
  })
  const list = readList(MEETING_KEY)
  list.unshift(record)
  writeList(MEETING_KEY, list)
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: { type: 'meeting', record } }))
  return record
}

function createDocId(prefix) {
  const date = new Date()
  const ymd = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('')
  const seq = String(Math.floor(Math.random() * 900) + 100)
  return `${prefix}-${ymd}-${seq}`
}

function buildScreenshotNoticeRecord(payload) {
  return normalizeNoticeRecord({
    id: createDocId('GZ'),
    project: payload.projectName || '',
    workType: payload.workType || '',
    workRequirement: payload.workRequirement || payload.description || '',
    executor: payload.executor || payload.executeDept || payload.rectifier || '',
    deadline: payload.deadline || defaultDeadline(),
    remark: payload.remark || '',
    issueTime: '—',
    issuer: payload.issuer || DISPATCH_CURRENT_USER,
    status: NOTICE_STATUSES.PENDING,
    snapshot: payload.snapshot || '',
    cameraName: payload.cameraName || '',
    cameraLocation: payload.cameraLocation || '',
  })
}

function buildScreenshotReminderRecord(payload) {
  return normalizeReminderRecord({
    id: createDocId('TS'),
    project: payload.projectName || '',
    matterDescription: payload.matterDescription || payload.description || '',
    assignee: payload.assignee || payload.executor || payload.rectifier || '',
    deadline: payload.deadline || defaultDeadline(),
    issueTime: '—',
    issuer: payload.issuer || DISPATCH_CURRENT_USER,
    status: NOTICE_STATUSES.PENDING,
    snapshot: payload.snapshot || '',
    cameraName: payload.cameraName || '',
    cameraLocation: payload.cameraLocation || '',
  })
}

function buildScreenshotPenaltyRecord(payload) {
  return normalizePenaltyRecord({
    id: createDocId('CF'),
    project: payload.projectName || '',
    unit: payload.unit || '',
    penaltyReason: payload.penaltyReason || '',
    penaltyContent: payload.penaltyContent || payload.description || '',
    handler: DISPATCH_CURRENT_USER,
    issueTime: '—',
    status: PENALTY_STATUSES.PENDING,
    source: '视频截屏',
    snapshot: payload.snapshot || '',
    cameraName: payload.cameraName || '',
    cameraLocation: payload.cameraLocation || '',
  })
}

export function saveDispatchDocFromScreenshot(docType, payload) {
  if (docType === 'penalty') {
    return saveDispatchPenaltyRecord(buildScreenshotPenaltyRecord(payload))
  }
  if (docType === 'reminder') {
    return saveDispatchReminderRecord(buildScreenshotReminderRecord(payload))
  }
  if (docType === 'notice') {
    return saveDispatchNoticeRecord(buildScreenshotNoticeRecord(payload))
  }
  return null
}

export function saveDispatchNoticeRecord(payload) {
  ensureDispatchMeetingSeed()
  const record = normalizeNoticeRecord({
    ...emptyNoticeRecord(),
    ...payload,
    id: payload.id || createDocId('GZ'),
  })
  const list = readList(NOTICE_KEY)
  const index = list.findIndex((item) => item.id === record.id)
  if (index >= 0) list[index] = { ...list[index], ...record }
  else list.unshift(record)
  writeList(NOTICE_KEY, list)
  return record
}

export function saveDispatchPenaltyRecord(payload) {
  ensureDispatchMeetingSeed()
  const record = normalizePenaltyRecord({
    ...emptyPenaltyRecord(),
    ...payload,
    id: payload.id || createDocId('CF'),
  })
  const list = readList(PENALTY_KEY)
  const index = list.findIndex((item) => item.id === record.id)
  if (index >= 0) list[index] = { ...list[index], ...record }
  else list.unshift(record)
  writeList(PENALTY_KEY, list)
  return record
}

export function saveDispatchReminderRecord(payload) {
  ensureDispatchMeetingSeed()
  const record = normalizeReminderRecord({
    ...emptyReminderRecord(),
    ...payload,
    id: payload.id || createDocId('TS'),
  })
  const list = readList(REMINDER_KEY)
  const index = list.findIndex((item) => item.id === record.id)
  if (index >= 0) list[index] = { ...list[index], ...record }
  else list.unshift(record)
  writeList(REMINDER_KEY, list)
  return record
}

export function issueDispatchNoticeRecord(id) {
  const list = readList(NOTICE_KEY)
  const index = list.findIndex((item) => item.id === id)
  if (index < 0) return null
  if (list[index].status !== NOTICE_STATUSES.PENDING) return list[index]
  list[index] = {
    ...list[index],
    status: NOTICE_STATUSES.ISSUED,
    issueTime: new Date().toLocaleString('zh-CN', { hour12: false }),
    issuer: list[index].issuer || DISPATCH_CURRENT_USER,
  }
  writeList(NOTICE_KEY, list)
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: { type: 'notice', record: list[index] } }))
  return list[index]
}

export function receiveDispatchNoticeRecord(id, receivedBy = '') {
  const list = readList(NOTICE_KEY)
  const index = list.findIndex((item) => item.id === id)
  if (index < 0) return null
  if (list[index].status !== NOTICE_STATUSES.ISSUED) return list[index]
  const executor = list[index].executor || list[index].executeDept || ''
  list[index] = {
    ...list[index],
    status: NOTICE_STATUSES.RECEIVED,
    receivedTime: new Date().toLocaleString('zh-CN', { hour12: false }),
    receivedBy: receivedBy || executor,
  }
  writeList(NOTICE_KEY, list)
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: { type: 'notice', record: list[index] } }))
  return list[index]
}

export function voidDispatchNoticeRecord(id) {
  const list = readList(NOTICE_KEY)
  const index = list.findIndex((item) => item.id === id)
  if (index < 0) return null
  list[index] = {
    ...list[index],
    status: '已作废',
    voidedAt: new Date().toLocaleString('zh-CN', { hour12: false }),
  }
  writeList(NOTICE_KEY, list)
  return list[index]
}

export function voidDispatchPenaltyRecord(id) {
  return closeDispatchPenaltyRecord(id)
}

export function closeDispatchPenaltyRecord(id, closedBy = DISPATCH_CURRENT_USER) {
  const list = readList(PENALTY_KEY)
  const index = list.findIndex((item) => item.id === id)
  if (index < 0) return null
  if (list[index].status === PENALTY_STATUSES.CLOSED) return list[index]
  const now = new Date().toLocaleString('zh-CN', { hour12: false })
  list[index] = {
    ...list[index],
    status: PENALTY_STATUSES.CLOSED,
    closedTime: now,
    closedBy,
  }
  writeList(PENALTY_KEY, list)
  return list[index]
}

export function issueDispatchReminderRecord(id) {
  const list = readList(REMINDER_KEY)
  const index = list.findIndex((item) => item.id === id)
  if (index < 0) return null
  if (list[index].status !== NOTICE_STATUSES.PENDING) return list[index]
  list[index] = {
    ...list[index],
    status: NOTICE_STATUSES.ISSUED,
    issueTime: new Date().toLocaleString('zh-CN', { hour12: false }),
    issuer: list[index].issuer || DISPATCH_CURRENT_USER,
  }
  writeList(REMINDER_KEY, list)
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: { type: 'reminder', record: list[index] } }))
  return list[index]
}

export function receiveDispatchReminderRecord(id, receivedBy = '') {
  const list = readList(REMINDER_KEY)
  const index = list.findIndex((item) => item.id === id)
  if (index < 0) return null
  if (list[index].status !== NOTICE_STATUSES.ISSUED) return list[index]
  const assignee = list[index].assignee || list[index].executor || ''
  list[index] = {
    ...list[index],
    status: NOTICE_STATUSES.RECEIVED,
    receivedTime: new Date().toLocaleString('zh-CN', { hour12: false }),
    receivedBy: receivedBy || assignee,
  }
  writeList(REMINDER_KEY, list)
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: { type: 'reminder', record: list[index] } }))
  return list[index]
}

export function voidDispatchReminderRecord(id) {
  const list = readList(REMINDER_KEY)
  const index = list.findIndex((item) => item.id === id)
  if (index < 0) return null
  list[index] = {
    ...list[index],
    status: NOTICE_STATUSES.VOID,
    voidedAt: new Date().toLocaleString('zh-CN', { hour12: false }),
  }
  writeList(REMINDER_KEY, list)
  return list[index]
}

export function issueDispatchPenaltyRecord(id) {
  const list = readList(PENALTY_KEY)
  const index = list.findIndex((item) => item.id === id)
  if (index < 0) return null
  if (list[index].status !== PENALTY_STATUSES.PENDING) return list[index]
  list[index] = {
    ...list[index],
    status: PENALTY_STATUSES.PROCESSING,
    issueTime: new Date().toLocaleString('zh-CN', { hour12: false }),
  }
  writeList(PENALTY_KEY, list)
  return list[index]
}

export function submitPenaltyRecipientReport(id, payload = {}) {
  const list = readList(PENALTY_KEY)
  const index = list.findIndex((item) => item.id === id)
  if (index < 0) return null
  if (list[index].status !== PENALTY_STATUSES.PROCESSING) return list[index]
  list[index] = {
    ...list[index],
    status: PENALTY_STATUSES.PENDING_ACCEPTANCE,
    penaltyClause: payload.penaltyClause || list[index].penaltyClause || '',
    amount: payload.amount || list[index].amount || '',
    reportResult: payload.reportResult || '',
    reportTime: new Date().toLocaleString('zh-CN', { hour12: false }),
  }
  writeList(PENALTY_KEY, list)
  return list[index]
}

export function acceptPenaltyRecord(id, acceptedBy = DISPATCH_CURRENT_USER) {
  const list = readList(PENALTY_KEY)
  const index = list.findIndex((item) => item.id === id)
  if (index < 0) return null
  if (list[index].status !== PENALTY_STATUSES.PENDING_ACCEPTANCE) return list[index]
  const now = new Date().toLocaleString('zh-CN', { hour12: false })
  list[index] = {
    ...list[index],
    status: PENALTY_STATUSES.CLOSED,
    acceptedTime: now,
    acceptedBy,
    closedTime: now,
    closedBy: acceptedBy,
  }
  writeList(PENALTY_KEY, list)
  return list[index]
}

export function submitPenaltyAppeal(id, payload = {}) {
  const list = readList(PENALTY_KEY)
  const index = list.findIndex((item) => item.id === id)
  if (index < 0) return null
  if (list[index].status !== PENALTY_STATUSES.PROCESSING) return list[index]
  list[index] = {
    ...list[index],
    status: PENALTY_STATUSES.APPEALING,
    appealReason: payload.appealReason || '',
    appealAttachments: Array.isArray(payload.appealAttachments) ? payload.appealAttachments : [],
    appealTime: new Date().toLocaleString('zh-CN', { hour12: false }),
    appealResolution: '',
  }
  writeList(PENALTY_KEY, list)
  return list[index]
}

export function resolvePenaltyAppeal(id, approved, resolvedBy = DISPATCH_CURRENT_USER) {
  const list = readList(PENALTY_KEY)
  const index = list.findIndex((item) => item.id === id)
  if (index < 0) return null
  if (list[index].status !== PENALTY_STATUSES.APPEALING) return list[index]
  const now = new Date().toLocaleString('zh-CN', { hour12: false })
  if (approved) {
    list[index] = {
      ...list[index],
      status: PENALTY_STATUSES.CLOSED,
      appealResolution: '通过',
      closedTime: now,
      closedBy: resolvedBy,
    }
  } else {
    list[index] = {
      ...list[index],
      status: PENALTY_STATUSES.PROCESSING,
      appealResolution: '驳回',
    }
  }
  writeList(PENALTY_KEY, list)
  return list[index]
}

export function markPenaltyBlackBoardSync(penaltyId, month, blackBoardId) {
  const list = readList(PENALTY_KEY)
  const index = list.findIndex((item) => item.id === penaltyId)
  if (index < 0) return null
  list[index] = {
    ...list[index],
    blackBoardSynced: true,
    blackBoardMonth: month,
    blackBoardId,
  }
  writeList(PENALTY_KEY, list)
  return list[index]
}

export { CHANGE_EVENT as DISPATCH_MEETING_CHANGE_EVENT }
