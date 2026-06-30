import { COMMAND_MEETING_HISTORY, MOCK_NOTICE, AI_INTERCOM_RECORDS } from '../mock/data.js'

const NOTICE_KEY = 'coc-admin-dispatch-notices'
const PENALTY_KEY = 'coc-admin-dispatch-penalties'
const MEETING_KEY = 'coc-admin-dispatch-meetings'
const SEED_FLAG = 'coc-admin-dispatch-seeded-v1'
const SNAPSHOT_PATCH_FLAG = 'coc-admin-dispatch-snapshot-v1'
const MEETING_DETAIL_PATCH_FLAG = 'coc-admin-dispatch-meeting-detail-v1'
const CHANGE_EVENT = 'coc-dispatch-meeting-change'

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

export function emptyNoticeRecord() {
  return {
    id: '',
    title: '',
    project: '',
    type: '安全',
    unit: '',
    deadline: defaultDeadline(),
    issueTime: new Date().toLocaleString('zh-CN', { hour12: false }),
    issuer: '调度值班',
    status: '已下发',
    source: '后台录入',
    content: '',
    snapshot: '',
  }
}

export function emptyPenaltyRecord() {
  return {
    id: '',
    title: '',
    project: '',
    unit: '',
    handler: '工程管理部',
    issueTime: new Date().toLocaleString('zh-CN', { hour12: false }),
    status: '已下发',
    source: '后台录入',
    amount: '—',
    content: '',
    snapshot: '',
    blackBoardSynced: false,
    blackBoardMonth: '',
    blackBoardId: '',
  }
}

function buildNoticeSeed() {
  return attachNoticeSnapshots([
    {
      id: MOCK_NOTICE.id,
      title: '安全质量告知单',
      project: MOCK_NOTICE.project,
      type: MOCK_NOTICE.type,
      unit: MOCK_NOTICE.unit,
      deadline: MOCK_NOTICE.deadline,
      issueTime: MOCK_NOTICE.issueTime,
      issuer: MOCK_NOTICE.issuer,
      status: '已下发',
      source: '调度指挥会议',
      content: `告知事项：${MOCK_NOTICE.description}\n\n整改要求：责任单位须于 ${MOCK_NOTICE.deadline} 前完成整改并上传闭环照片。`,
    },
    {
      id: 'GZ-20260615-002',
      title: '现场抽检告知单',
      project: '捷运线延长段',
      type: '质量',
      unit: '中建三局（捷运线施工总承包）',
      deadline: '2026-06-18',
      issueTime: '2026-06-15 10:20',
      issuer: '质量部',
      status: '已下发',
      source: '现场抽检对讲',
      content:
        '根据现场抽检视频对讲记录，告知：1 项分部分项验收未通过，须组织复检；2 名特种作业人员证件即将过期，须 7 日内换证。',
    },
    {
      id: 'GZ-20260614-003',
      title: '复检通知告知单',
      project: '飞行区5号通道',
      type: '质量',
      unit: '中建八局',
      deadline: '2026-06-17',
      issueTime: '2026-06-14 14:00',
      issuer: '调度值班',
      status: '待签收',
      source: '调度指挥会议',
      content: '飞行区通道混凝土浇筑前须完成质量交底及样板确认，请责任单位签收并反馈执行计划。',
    },
    {
      id: 'GZ-20260612-004',
      title: '临边防护整改告知单',
      project: '捷运线延长段',
      type: '安全',
      unit: '中建三局（捷运线施工总承包）',
      deadline: '2026-06-13',
      issueTime: '2026-06-12 10:18',
      issuer: '安监部',
      status: '已闭环',
      source: '安质管控对讲',
      content: '基坑周边临边防护缺失，要求今日内完成加固并上传整改照片。',
    },
  ])
}

function buildPenaltySeed() {
  return attachPenaltySnapshots([
    {
      id: 'CF-20260612-001',
      title: '塔吊警戒标识不足处罚单',
      project: '捷运线延长段',
      unit: '中建三局（捷运线施工总承包）',
      handler: '工程管理部',
      issueTime: '2026-06-12 10:15',
      status: '已下发',
      source: '调度指挥会议',
      amount: '—',
      content:
        '3号塔吊作业区警戒标识不足，存在人员误入风险。限期 24 小时内整改，逾期将按合同条款追加处罚并通报。',
    },
    {
      id: 'CF-20260612-002',
      title: '临边防护缺失限期整改处罚单',
      project: '捷运线延长段',
      unit: '中建三局（捷运线施工总承包）',
      handler: '调度值班',
      issueTime: '2026-06-12 10:12',
      status: '待确认',
      source: '巡检对讲',
      amount: '—',
      content: '基坑周边临边防护缺失（较大隐患），要求今日内完成加固并提交闭环材料。',
    },
    {
      id: 'CF-20260611-003',
      title: '文明施工违规处罚单',
      project: 'T2主体结构',
      unit: '中建二局',
      handler: '工程管理部',
      issueTime: '2026-06-11 16:40',
      status: '处理中',
      source: '调度指挥会议',
      amount: '5000元',
      content: '材料堆放占用消防通道，违反文明施工管理规定，处以违约金并限期清场。',
    },
    {
      id: 'CF-20260610-004',
      title: '高处作业违规处罚单',
      project: '钢筋加工场',
      unit: '中铁建工',
      handler: '安监部',
      issueTime: '2026-06-10 11:05',
      status: '已下发',
      source: '安质管控对讲',
      amount: '3000元',
      content: '高处作业人员未系安全带，现场立即停工整改，并对责任单位处以违约金。',
    },
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

export function ensureDispatchMeetingSeed() {
  if (localStorage.getItem(SEED_FLAG)) {
    ensureDispatchDocSnapshots()
    ensureMeetingDetailPatch()
    return
  }
  writeList(NOTICE_KEY, buildNoticeSeed())
  writeList(PENALTY_KEY, buildPenaltySeed())
  writeList(MEETING_KEY, buildMeetingSeed())
  localStorage.setItem(SEED_FLAG, '1')
  localStorage.setItem(SNAPSHOT_PATCH_FLAG, '1')
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
  const issueTime = payload.createdAt || new Date().toLocaleString('zh-CN', { hour12: false })
  return {
    id: createDocId('GZ'),
    title: '视频监控告知单',
    project: payload.projectName || '',
    type: '安全',
    unit: payload.unit || '责任单位',
    deadline: payload.deadline || defaultDeadline(),
    issueTime,
    issuer: payload.issuer || '调度值班',
    status: '已下发',
    source: '视频截屏',
    snapshot: payload.snapshot || '',
    cameraName: payload.cameraName || '',
    cameraLocation: payload.cameraLocation || '',
    content: [
      `监控点位：${payload.cameraName || '—'}（${payload.cameraLocation || '—'}）`,
      `问题描述：${payload.description || ''}`,
      `整改责任人：${payload.rectifier || '—'}`,
      payload.deadline ? `整改期限：${payload.deadline}` : '',
    ]
      .filter(Boolean)
      .join('\n\n'),
  }
}

function buildScreenshotPenaltyRecord(payload) {
  const issueTime = payload.createdAt || new Date().toLocaleString('zh-CN', { hour12: false })
  return {
    id: createDocId('CF'),
    title: '视频监控处罚单',
    project: payload.projectName || '',
    unit: payload.unit || '责任单位',
    handler: payload.rectifier || '调度值班',
    issueTime,
    status: '已下发',
    source: '视频截屏',
    amount: payload.amount || '—',
    snapshot: payload.snapshot || '',
    cameraName: payload.cameraName || '',
    cameraLocation: payload.cameraLocation || '',
    content: [
      `监控点位：${payload.cameraName || '—'}（${payload.cameraLocation || '—'}）`,
      `问题描述：${payload.description || ''}`,
      `整改责任人：${payload.rectifier || '—'}`,
      payload.amount && payload.amount !== '—' ? `处罚金额：${payload.amount}` : '',
    ]
      .filter(Boolean)
      .join('\n\n'),
  }
}

export function saveDispatchDocFromScreenshot(docType, payload) {
  if (docType === 'penalty') {
    return saveDispatchPenaltyRecord(buildScreenshotPenaltyRecord(payload))
  }
  if (docType === 'notice') {
    return saveDispatchNoticeRecord(buildScreenshotNoticeRecord(payload))
  }
  return null
}

export function saveDispatchNoticeRecord(payload) {
  ensureDispatchMeetingSeed()
  const record = {
    ...emptyNoticeRecord(),
    ...payload,
    id: payload.id || createDocId('GZ'),
  }
  const list = readList(NOTICE_KEY)
  const index = list.findIndex((item) => item.id === record.id)
  if (index >= 0) list[index] = { ...list[index], ...record }
  else list.unshift(record)
  writeList(NOTICE_KEY, list)
  return record
}

export function saveDispatchPenaltyRecord(payload) {
  ensureDispatchMeetingSeed()
  const record = {
    ...emptyPenaltyRecord(),
    ...payload,
    id: payload.id || createDocId('CF'),
  }
  const list = readList(PENALTY_KEY)
  const index = list.findIndex((item) => item.id === record.id)
  if (index >= 0) list[index] = { ...list[index], ...record }
  else list.unshift(record)
  writeList(PENALTY_KEY, list)
  return record
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
  const list = readList(PENALTY_KEY)
  const index = list.findIndex((item) => item.id === id)
  if (index < 0) return null
  list[index] = {
    ...list[index],
    status: '已作废',
    voidedAt: new Date().toLocaleString('zh-CN', { hour12: false }),
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
