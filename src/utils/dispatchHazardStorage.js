import { getScreenshotRecords } from '../coc/utils/videoStorage.js'
import { PROJECT_SHORT_NAMES } from '../coc/mock/data.js'
import { getDispatchHazardTypeLabel, isDispatchHazardType } from '../config/dispatchHazardTypes.js'

const DISPATCH_HAZARD_KEY = 'coc-admin-dispatch-hazards-v7'

export const DISPATCH_HAZARD_RECTIFY_STATUSES = ['待整改', '待验收', '待复查', '已关闭']
export const DISPATCH_HAZARD_RECTIFY_STATUS_DEFAULT = '待整改'

export const DISPATCH_HAZARD_ACTOR_ROLES = {
  CONTRACTOR: '施工方',
  SAFETY: '安质部',
  SYSTEM: '系统',
}

function readList(key, fallback = []) {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return [...fallback]
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : [...fallback]
  } catch {
    return [...fallback]
  }
}

function writeList(key, list) {
  localStorage.setItem(key, JSON.stringify(list))
}

function hazardNow() {
  return new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-')
}

/** Demo 占位截图（SVG data URI），便于详情页展示 */
function buildPlaceholderSnapshot({ title = '问题截图', subtitle = '', hue = 210 } = {}) {
  const safeTitle = String(title).slice(0, 18).replace(/[<>&]/g, '')
  const safeSub = String(subtitle).slice(0, 24).replace(/[<>&]/g, '')
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="hsl(${hue},28%,28%)"/>
      <stop offset="100%" stop-color="hsl(${hue + 20},32%,16%)"/>
    </linearGradient>
  </defs>
  <rect width="640" height="360" fill="url(#g)"/>
  <rect x="24" y="24" width="592" height="312" rx="8" fill="none" stroke="rgba(255,255,255,0.25)" stroke-width="2"/>
  <text x="320" y="160" text-anchor="middle" fill="#e8eef7" font-size="28" font-family="Microsoft YaHei, sans-serif">${safeTitle}</text>
  <text x="320" y="205" text-anchor="middle" fill="#aeb6c2" font-size="16" font-family="Microsoft YaHei, sans-serif">${safeSub}</text>
</svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

/** 整改照片展示地址：支持 url / dataURL / 文件名（文件名用占位缩略图） */
export function resolveDispatchHazardPhotoSrc(photo, index = 0) {
  if (photo == null || photo === '') return ''
  if (typeof photo === 'object') {
    if (photo.url) return String(photo.url)
    return resolveDispatchHazardPhotoSrc(photo.name || '', index)
  }
  const str = String(photo)
  if (/^(data:|https?:|blob:)/i.test(str)) return str
  const label = str.replace(/\.[a-z0-9]+$/i, '').slice(-18) || `照片${index + 1}`
  return buildPlaceholderSnapshot({
    title: '整改照片',
    subtitle: label,
    hue: 150 + ((index * 37) % 140),
  })
}

export function resolveDispatchHazardPhotoName(photo, index = 0) {
  if (photo == null || photo === '') return `整改照片-${index + 1}`
  if (typeof photo === 'object') return photo.name || `整改照片-${index + 1}`
  const str = String(photo)
  if (/^(data:|blob:)/i.test(str)) return `整改照片-${index + 1}`
  return str
}

export function createDispatchHazardRegisterLog(time = hazardNow(), remark = '问题截图登记生成隐患') {
  return {
    action: '登记',
    fromStatus: '',
    toStatus: DISPATCH_HAZARD_RECTIFY_STATUS_DEFAULT,
    operator: '系统',
    operatorRole: DISPATCH_HAZARD_ACTOR_ROLES.SYSTEM,
    remark,
    photos: [],
    time,
  }
}

function appendStatusLog(logs, entry) {
  return [entry, ...(Array.isArray(logs) ? logs : [])]
}

/** 演示用登记人（历史数据无该字段时按 id 稳定分配，保证列表/筛选有值）。 */
const DISPATCH_REGISTRANTS = ['张明（调度值班员）', '李强（安全值班员）', '王海（质量值班员）', '刘洋（调度值班员）']
function pickDispatchRegistrant(key = '') {
  let hash = 0
  for (const ch of String(key)) hash = (hash * 31 + ch.charCodeAt(0)) % 997
  return DISPATCH_REGISTRANTS[hash % DISPATCH_REGISTRANTS.length]
}

/** 旧等级（重大/较大/一般）映射到巡检体系；质量类映射为 A/B/C。 */
const DISPATCH_HAZARD_LEVEL_MAP = { 重大: 'Ⅰ重大隐患', 较大: 'Ⅱ重点关注的一般隐患', 一般: 'Ⅲ一般隐患' }
const DISPATCH_HAZARD_QUALITY_LEVEL_MAP = { 重大: 'A', 较大: 'B', 一般: 'C', A: 'A', B: 'B', C: 'C' }
export function normalizeDispatchHazardLevel(level, hazardType) {
  const text = String(level || '').trim()
  if (!text) return hazardType === 'quality' ? 'C' : 'Ⅲ一般隐患'
  if (hazardType === 'quality') return DISPATCH_HAZARD_QUALITY_LEVEL_MAP[text] || text
  return DISPATCH_HAZARD_LEVEL_MAP[text] || text
}

/** 当前流程节点：与巡检口径一致。 */
/** 流程记录：与巡检一致（登记隐患 → 下发整改单 → 整改 → 复查 → 审批 → 当前节点/流程结束）。 */
/** 质量 A 级 / Ⅰ重大隐患走扩展流程（含项目部长确认）。 */
export function isExtendedDispatchHazard(row) {
  const level = String(row?.hazardLevel || '')
  return (row?.hazardType === 'quality' && level === 'A') || level === 'Ⅰ重大隐患'
}

export function dispatchHazardFlowRecords(row) {
  if (!row) return []
  const logs = Array.isArray(row.statusLogs) ? [...row.statusLogs].reverse() : []
  const findLog = (actions) => logs.filter((log) => actions.includes(log.action)).at(-1) || null
  const submit = findLog(['提交整改'])
  const reviewPass = findLog(['复查通过'])
  const reviewFail = findLog(['复查不通过'])
  const approvePass = findLog(['审批通过', '验收通过'])
  const approveFail = findLog(['审批不通过', '验收驳回'])
  const confirmPass = findLog(['确认通过', '项目部长确认通过'])
  const extended = isExtendedDispatchHazard(row)
  const approvalLabel = row.hazardType === 'quality' || row.hazardLevel === 'Ⅰ重大隐患' ? '指挥部项目经理确认' : '项目经理审批'
  const steps = [{ label: '施工单位整改', log: submit }]
  if (extended) {
    steps.push({
      label: '施工单位项目经理验收',
      log: row.contractorAcceptanceDate
        ? { operator: row.contractorManager || '施工单位项目经理', time: row.contractorAcceptanceDate, remark: row.contractorAcceptanceComment, result: row.contractorAcceptanceResult }
        : null,
    })
  }
  steps.push({ label: '监理工程师复核', log: reviewFail || reviewPass, rejected: Boolean(reviewFail) })
  if (extended) {
    steps.push({
      label: '监理总监验收',
      log: row.directorAcceptanceDate
        ? { operator: row.director || '监理单位项目总监', time: row.directorAcceptanceDate, remark: row.directorAcceptanceComment, result: row.directorAcceptanceResult }
        : null,
    })
  }
  steps.push({ label: approvalLabel, log: approveFail || approvePass, rejected: Boolean(approveFail) })
  if (extended) steps.push({ label: '项目部长确认', log: confirmPass })
  const records = [
    { label: '登记隐患', actor: row.registrant || '系统', date: row.uploadTime || '', comment: '问题截图登记生成隐患' },
    { label: '下发整改单', actor: row.registrant || '系统', date: row.uploadTime || '', comment: '' },
  ]
  const closed = row.rectifyStatus === '已关闭'
  const currentLabel = row.currentNode || dispatchHazardCurrentNode(row)
  for (const step of steps) {
    if (step.log) {
      records.push({
        label: step.rejected ? `${step.label}（不通过）` : step.label,
        actor: step.log.operator,
        date: step.log.time,
        comment: step.log.remark,
        rejected: step.rejected,
      })
      continue
    }
    if (closed) { records.push({ label: step.label, actor: '', date: '', comment: '已完成' }); continue }
    if (step.label === currentLabel) {
      const actor = ({ 施工单位整改: row.rectifier, 监理单位复核: row.reviewer, 施工单位项目经理验收: row.contractorManager, 监理单位项目总监验收: row.director }[step.label]) || '项目经理'
      records.push({ label: step.label, actor, date: '', comment: '当前节点', current: true })
    } else {
      records.push({ label: step.label, actor: '', date: '', comment: '待办理', pending: true })
    }
  }
  if (closed) {
    const lastTime = (confirmPass || approvePass || reviewPass || submit)?.time || row.directorAcceptanceDate || row.contractorAcceptanceDate || ''
    records.push({ label: '流程关闭', actor: '', date: lastTime, comment: '整改单已关闭' })
  }
  return records
}

export function dispatchHazardCurrentNode(rowOrStatus, hazardType, hazardLevel) {
  const row = typeof rowOrStatus === 'object' && rowOrStatus ? rowOrStatus : null
  const status = typeof rowOrStatus === 'string' ? rowOrStatus : row?.rectifyStatus
  const type = row ? row.hazardType : hazardType
  const level = row ? row.hazardLevel : hazardLevel
  const extended = (type === 'quality' && String(level || '') === 'A') || ['Ⅰ重大隐患', '重大'].includes(String(level || ''))
  const logs = Array.isArray(row?.statusLogs) ? row.statusLogs : []
  const hasSubmit = logs.some((log) => log.action === '提交整改')
  const reviewPass = logs.some((log) => log.action === '复查通过')
  const approved = logs.some((log) => log.action === '审批通过')
  const confirmed = logs.some((log) => log.action === '确认通过' || log.action === '项目部长确认通过')
  if (status === '待整改') {
    if (extended && hasSubmit && !row?.contractorAcceptanceDate) return '施工单位项目经理验收'
    return '施工单位整改'
  }
  if (status === '待验收') {
    if (extended && reviewPass && !row?.directorAcceptanceDate) return '监理总监验收'
    return '监理工程师复核'
  }
  if (status === '待复查') {
    if (extended && approved && !confirmed) return '项目部长确认'
    return '指挥部项目经理确认'
  }
  if (status === '已关闭') return '流程关闭'
  return '施工单位整改'
}

export function emptyDispatchHazard(row = {}) {
  const rectifyStatus = DISPATCH_HAZARD_RECTIFY_STATUSES.includes(row.rectifyStatus)
    ? row.rectifyStatus
    : DISPATCH_HAZARD_RECTIFY_STATUS_DEFAULT
  const uploadTime = row.uploadTime || ''
  const statusLogs = Array.isArray(row.statusLogs)
    ? row.statusLogs
    : uploadTime
      ? [createDispatchHazardRegisterLog(uploadTime)]
      : []
  return {
    id: row.id || '',
    screenshotId: row.screenshotId || '',
    projectId: row.projectId || '',
    projectName: row.projectName || '',
    source: row.source || '问题截图',
    hazardType: ['safety', 'quality', 'other'].includes(row.hazardType) ? row.hazardType : 'safety',
    description: row.description || '',
    hazardLevel: normalizeDispatchHazardLevel(row.hazardLevel, row.hazardType || 'safety'),
    hazardCategory: row.hazardCategory || ((row.hazardType || 'safety') === 'quality' ? '结构实体质量' : '安全管理'),
    rectifyRequirement: row.rectifyRequirement || '',
    reviewer: row.reviewer || '',
    contractorManager: row.contractorManager || '',
    contractorAcceptanceDate: row.contractorAcceptanceDate || '',
    contractorAcceptanceResult: row.contractorAcceptanceResult || '',
    contractorAcceptanceComment: row.contractorAcceptanceComment || '',
    director: row.director || '',
    directorAcceptanceDate: row.directorAcceptanceDate || '',
    directorAcceptanceResult: row.directorAcceptanceResult || '',
    directorAcceptanceComment: row.directorAcceptanceComment || '',
    issueCcPersons: row.issueCcPersons || '',
    completionCcPersons: row.completionCcPersons || '',
    hazardPhotos: Array.isArray(row.hazardPhotos) ? row.hazardPhotos : [],
    currentNode: dispatchHazardCurrentNode(row),
    rectifier: row.rectifier || '',
    hazardDeadline: row.hazardDeadline || '',
    cameraName: row.cameraName || '',
    cameraLocation: row.cameraLocation || '',
    sourceType: row.sourceType || '',
    snapshot: row.snapshot || '',
    rectifyStatus,
    rectifyRemark: row.rectifyRemark || '',
    rectifyPhotos: Array.isArray(row.rectifyPhotos) ? row.rectifyPhotos : [],
    statusLogs,
    uploadTime,
    registrant: row.registrant || pickDispatchRegistrant(row.id),
  }
}

function mapScreenshotToHazard(ss) {
  if (!isDispatchHazardType(ss.docType)) return null
  const hazardType = ss.docType
  const snapshot =
    ss.snapshot ||
    buildPlaceholderSnapshot({
      title: `${getDispatchHazardTypeLabel(hazardType)}隐患截图`,
      subtitle: ss.cameraName || ss.projectName || '',
      hue: hazardType === 'quality' ? 145 : 18,
    })
  return emptyDispatchHazard({
    id: `DHZ-${ss.id}`,
    screenshotId: ss.id,
    projectName: ss.projectName || '',
    source: '问题截图',
    hazardType,
    description: ss.description || '',
    hazardLevel: ss.hazardLevel || '一般',
    hazardCategory: ss.hazardCategory || '',
    rectifyRequirement: ss.rectifyRequirement || '',
    reviewer: ss.reviewer || '',
    issueCcPersons: ss.issueCcPersons || '',
    completionCcPersons: ss.completionCcPersons || '',
    hazardPhotos: Array.isArray(ss.hazardPhotos) ? ss.hazardPhotos : [],
    registrant: ss.registrant || '',
    rectifier: ss.rectifier || '',
    hazardDeadline: ss.hazardDeadline || '',
    cameraName: ss.cameraName || '',
    cameraLocation: ss.cameraLocation || '',
    sourceType: ss.sourceType || '',
    snapshot,
    uploadTime: ss.createdAt || hazardNow(),
    statusLogs: [createDispatchHazardRegisterLog(ss.createdAt || hazardNow())],
  })
}

function buildSeedStatusLogs({ status, hazardType, hazardLevel, uploadTime, submitTime, closeTime, remark = '', photos = [] }) {
  const register = createDispatchHazardRegisterLog(uploadTime)
  if (status === '待整改') return [register]

  const submitLog = {
    action: '提交整改',
    fromStatus: '待整改',
    toStatus: '待验收',
    operator: '项目用户',
    operatorRole: DISPATCH_HAZARD_ACTOR_ROLES.CONTRACTOR,
    remark: remark || '现场已按要求整改完毕，请验收',
    photos,
    time: submitTime || uploadTime,
  }
  if (status === '待验收') return [submitLog, register]

  const reviewLog = {
    action: '复查通过',
    fromStatus: '待验收',
    toStatus: '待复查',
    operator: '吴工（巡检员）',
    operatorRole: '监理',
    remark: '现场复核通过，资料与现场一致',
    photos: [],
    time: closeTime || submitTime || uploadTime,
  }
  if (status === '待复查') {
    const extended = (hazardType === 'quality' && hazardLevel === 'A') || hazardLevel === 'Ⅰ重大隐患'
    if (!extended) return [reviewLog, submitLog, register]
    const approveLog = {
      action: '审批通过',
      fromStatus: '待复查',
      toStatus: '待复查',
      operator: '项目经理',
      operatorRole: DISPATCH_HAZARD_ACTOR_ROLES.SAFETY,
      remark: '审批通过，提交项目部长确认',
      photos: [],
      time: closeTime || submitTime || uploadTime,
    }
    return [approveLog, reviewLog, submitLog, register]
  }

  const extended = (hazardType === 'quality' && hazardLevel === 'A') || hazardLevel === 'Ⅰ重大隐患'
  const acceptLog = {
    action: extended ? '审批通过' : '验收通过',
    fromStatus: '待复查',
    toStatus: '已关闭',
    operator: '项目用户',
    operatorRole: DISPATCH_HAZARD_ACTOR_ROLES.SAFETY,
    remark: '现场复核通过，资料齐全',
    photos: [],
    time: closeTime || submitTime || uploadTime,
  }
  const logs = [acceptLog, reviewLog, submitLog, register]
  if (extended) {
    logs.unshift({
      action: '确认通过',
      fromStatus: '已关闭',
      toStatus: '已关闭',
      operator: '何部长（项目部长）',
      operatorRole: '项目部长',
      remark: '确认整改与验收结果，同意关闭整改单',
      photos: [],
      time: closeTime || submitTime || uploadTime,
    })
  }
  return logs
}

function buildSeedFromScreenHazards() {
  const safetyTemplates = [
    '塔吊作业区警戒标识不足，临边防护缺失',
    '深基坑周边防护栏破损，警示灯未开启',
    '材料堆放占用消防通道，文明施工不到位',
    '高处作业人员未系安全带，安全网搭设不规范',
    '配电箱未上锁，临电线路私拉乱接',
    '脚手架连墙件缺失，作业层脚手板未满铺',
    '动火作业未办理许可，灭火器配备不足',
    '基坑上下通道未设置防滑踏步',
  ]
  const qualityTemplates = [
    '钢筋绑扎间距偏差，保护层厚度不足',
    '混凝土浇筑振捣不充分，存在蜂窝麻面风险',
    '防水卷材搭接宽度不足，阴阳角未做附加层',
    '模板拼缝不严，局部漏浆',
    '预埋件定位偏移，影响后续安装',
    '砌体灰缝不饱满，墙体垂直度超差',
    '屋面找坡不到位，局部积水',
    '钢结构焊缝外观质量不合格',
  ]
  const rectifiers = ['李工', '周质量', '王安全', '赵班长', '陈技术', '刘施工']
  const levels = ['一般', '较大', '重大']
  const sourceTypes = ['live', 'playback', 'meeting']
  const locations = ['施工现场东侧', '作业面 B 区', '临边通道', '塔吊回转半径内', '地下室负一层', '屋面施工区']
  const statusDefs = [
    { status: '待整改', prefix: 'P' },
    { status: '待验收', prefix: 'R' },
    { status: '待复查', prefix: 'R' },
    { status: '已关闭', prefix: 'C' },
  ]

  const rows = []

  // 项目级：每个项目每种状态各 1 条
  PROJECT_SHORT_NAMES.forEach((projectName, projectIndex) => {
    statusDefs.forEach((def, statusIndex) => {
      const type = (projectIndex + statusIndex) % 2 === 0 ? 'safety' : 'quality'
      const templates = type === 'safety' ? safetyTemplates : qualityTemplates
      const description = templates[(projectIndex + statusIndex) % templates.length]
      const normalizedLevel = normalizeDispatchHazardLevel(levels[(projectIndex + statusIndex) % levels.length], type)
      const extended = (type === 'quality' && normalizedLevel === 'A') || normalizedLevel === 'Ⅰ重大隐患'
      const hasContractor = extended && ['待验收', '待复查', '已关闭'].includes(def.status)
      const hasDirector = extended && ['待复查', '已关闭'].includes(def.status)
      const day = 5 + ((projectIndex + statusIndex * 3) % 24)
      const meetingDate = `2026-06-${String(day).padStart(2, '0')}`
      const uploadTime = `${meetingDate} ${String(9 + statusIndex).padStart(2, '0')}:${String(10 + (projectIndex % 50)).padStart(2, '0')}:00`
      const submitTime = `${meetingDate} ${String(14 + statusIndex).padStart(2, '0')}:${String(20 + (projectIndex % 40)).padStart(2, '0')}:00`
      const closeTime = `${addSeedDays(meetingDate, 1)} ${String(10 + statusIndex).padStart(2, '0')}:30:00`
      const photos =
        def.status === '待整改'
          ? []
          : [`${projectName}-整改照片-${def.prefix}-1.jpg`, `${projectName}-整改照片-${def.prefix}-2.jpg`]
      const remark =
        def.status === '待整改'
          ? ''
          : type === 'safety'
            ? '已补齐防护并组织复查，现场照片已上传'
            : '已按规范整改并完成复测，请安质部验收'

      rows.push(
        emptyDispatchHazard({
          id: `DHZ-SEED-${String(projectIndex).padStart(3, '0')}-${def.prefix}`,
          projectId: `p-${String(projectIndex).padStart(3, '0')}`,
          projectName,
          source: '问题截图',
          hazardType: type,
          description,
          hazardLevel: normalizedLevel,
          rectifier: rectifiers[(projectIndex + statusIndex) % rectifiers.length],
          reviewer: type === 'safety' ? '吴工（巡检员）' : '黄工（专业监理工程师）',
          hazardDeadline: addSeedDays(meetingDate, 3 + statusIndex),
          cameraName: type === 'safety' ? `枪机-${(projectIndex % 8) + 1}` : `球机-${(projectIndex % 6) + 1}`,
          cameraLocation: locations[(projectIndex + statusIndex) % locations.length],
          sourceType: sourceTypes[(projectIndex + statusIndex) % sourceTypes.length],
          snapshot: buildPlaceholderSnapshot({
            title: type === 'quality' ? '质量隐患截图' : '安全隐患截图',
            subtitle: `${projectName} · ${description.slice(0, 12)}`,
            hue: type === 'quality' ? 140 + projectIndex * 3 : 12 + projectIndex * 4,
          }),
          uploadTime,
          rectifyStatus: def.status,
          contractorAcceptanceDate: hasContractor ? `${meetingDate} 16:00:00` : '',
          contractorAcceptanceResult: hasContractor ? '通过' : '',
          contractorAcceptanceComment: hasContractor ? '施工单位项目经理验收通过，提交监理复核' : '',
          directorAcceptanceDate: hasDirector ? `${meetingDate} 17:00:00` : '',
          directorAcceptanceResult: hasDirector ? '通过' : '',
          directorAcceptanceComment: hasDirector ? '总监验收通过，提交项目经理审批' : '',
          rectifyRemark: remark,
          rectifyPhotos: photos,
          statusLogs: buildSeedStatusLogs({
            status: def.status,
            hazardType: type,
            hazardLevel: normalizeDispatchHazardLevel(levels[(projectIndex + statusIndex) % levels.length], type),
            uploadTime,
            submitTime,
            closeTime,
            remark,
            photos,
          }),
        }),
      )
    })
  })


  const flowDemoBase = {
    projectId: 'p-000',
    projectName: PROJECT_SHORT_NAMES[0],
    source: '问题截图',
    hazardType: 'quality',
    hazardCategory: '结构实体质量',
    hazardLevel: 'A',
    description: '流程节点示例：施工单位项目经理验收',
    rectifyRequirement: '完成整改后由施工单位项目经理验收',
    rectifier: '刘施工',
    reviewer: '黄工（专业监理工程师）',
    contractorManager: '林工（施工单位项目经理）',
    director: '郑总监（监理单位项目总监）',
    hazardDeadline: '2026-12-05',
    cameraName: '球机-1',
    cameraLocation: '作业面 B 区',
    sourceType: 'live',
    uploadTime: '2026-11-24 09:00:00',
    registrant: '李强（安全值班员）',
  }
  rows.push(emptyDispatchHazard({
    ...flowDemoBase,
    id: 'DHZ-FLOW-CONTRACTOR',
    rectifyStatus: '待整改',
    rectifyRemark: '已按规范完成整改，提交项目经理验收',
    rectifyPhotos: ['流程示例-整改照片-1.jpg'],
    statusLogs: [
      { action: '提交整改', fromStatus: '待整改', toStatus: '待整改', operator: '项目用户', operatorRole: DISPATCH_HAZARD_ACTOR_ROLES.CONTRACTOR, remark: '已按规范完成整改，提交项目经理验收', photos: ['流程示例-整改照片-1.jpg'], time: '2026-11-24 10:00:00' },
      createDispatchHazardRegisterLog('2026-11-23 09:00:00'),
    ],
  }))
  rows.push(emptyDispatchHazard({
    ...flowDemoBase,
    id: 'DHZ-FLOW-DIRECTOR',
    description: '流程节点示例：监理总监验收',
    hazardLevel: 'A',
    rectifyStatus: '待验收',
    rectifyRemark: '已按规范完成整改并复测',
    rectifyPhotos: ['流程示例-整改照片-2.jpg'],
    contractorAcceptanceDate: '2026-11-24 11:00:00',
    contractorAcceptanceResult: '通过',
    contractorAcceptanceComment: '施工单位项目经理验收通过，提交监理复核',
    statusLogs: [
      { action: '复查通过', fromStatus: '待验收', toStatus: '待复查', operator: '黄工（专业监理工程师）', operatorRole: '监理', remark: '监理复核通过，提交总监验收', photos: [], time: '2026-11-24 15:00:00' },
      { action: '提交整改', fromStatus: '待整改', toStatus: '待验收', operator: '项目用户', operatorRole: DISPATCH_HAZARD_ACTOR_ROLES.CONTRACTOR, remark: '已按规范完成整改并复测', photos: ['流程示例-整改照片-2.jpg'], time: '2026-11-24 10:00:00' },
      createDispatchHazardRegisterLog('2026-11-23 09:00:00'),
    ],
  }))

  return rows
}

function addSeedDays(dateStr, days) {
  const d = new Date(`${dateStr}T00:00:00`)
  d.setDate(d.getDate() + days)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function syncFromScreenshots(list) {
  const screenshots = getScreenshotRecords().filter(item => isDispatchHazardType(item.docType))
  let changed = false
  const next = [...list]
  screenshots.forEach((ss) => {
    const mapped = mapScreenshotToHazard(ss)
    if (!mapped) return
    const idx = next.findIndex((item) => item.screenshotId === ss.id || item.id === mapped.id)
    if (idx < 0) {
      next.unshift(mapped)
      changed = true
      return
    }
    // 保留整改状态，仅回写截图侧可变更字段
    const prev = next[idx]
    const rectifier = ss.rectifier || prev.rectifier
    const reviewer = ss.reviewer || prev.reviewer
    if (rectifier !== prev.rectifier || reviewer !== prev.reviewer) changed = true
    next[idx] = emptyDispatchHazard({
      ...prev,
      projectName: ss.projectName || prev.projectName,
      description: ss.description || prev.description,
      hazardLevel: ss.hazardLevel || prev.hazardLevel,
      rectifier,
      reviewer,
      hazardDeadline: ss.hazardDeadline || prev.hazardDeadline,
      cameraName: ss.cameraName || prev.cameraName,
      cameraLocation: ss.cameraLocation || prev.cameraLocation,
      sourceType: ss.sourceType || prev.sourceType,
      snapshot: ss.snapshot || prev.snapshot,
      hazardType: ss.docType,
      source: '问题截图',
      screenshotId: ss.id,
    })
  })
  return { list: next, changed }
}

function ensureSeed() {
  const raw = localStorage.getItem(DISPATCH_HAZARD_KEY)
  if (raw == null) {
    const seeded = buildSeedFromScreenHazards()
    const { list } = syncFromScreenshots(seeded)
    writeList(DISPATCH_HAZARD_KEY, list)
    return list
  }
  try {
    const parsed = JSON.parse(raw)
    return (Array.isArray(parsed) ? parsed : []).map((row) => emptyDispatchHazard(row))
  } catch {
    return []
  }
}

export function getDispatchHazards() {
  let list = ensureSeed().map((row) => emptyDispatchHazard(row))
  const synced = syncFromScreenshots(list)
  if (synced.changed) {
    writeList(DISPATCH_HAZARD_KEY, synced.list)
    list = synced.list
  }
  return list
    .map((row) => emptyDispatchHazard(row))
    .sort((a, b) => String(b.uploadTime).localeCompare(String(a.uploadTime)))
}

export function getDispatchHazardsByProject(projectName) {
  if (!projectName) return getDispatchHazards()
  return getDispatchHazards().filter((item) => item.projectName === projectName)
}

/** 大屏问题截图登记隐患时写入调度隐患清单 */
export function upsertDispatchHazardFromScreenshot(screenshot) {
  if (!isDispatchHazardType(screenshot?.docType)) {
    return null
  }
  const list = getDispatchHazards()
  const mapped = mapScreenshotToHazard(screenshot)
  const idx = list.findIndex(
    (item) => item.screenshotId === screenshot.id || item.id === mapped.id,
  )
  if (idx >= 0) {
    const prev = list[idx]
    list[idx] = emptyDispatchHazard({
      ...prev,
      ...mapped,
      rectifier: mapped.rectifier || prev.rectifier,
      reviewer: mapped.reviewer || prev.reviewer,
      rectifyStatus: prev.rectifyStatus,
      rectifyRemark: prev.rectifyRemark,
      rectifyPhotos: prev.rectifyPhotos,
      statusLogs: prev.statusLogs?.length ? prev.statusLogs : mapped.statusLogs,
    })
  } else {
    list.unshift(mapped)
  }
  writeList(DISPATCH_HAZARD_KEY, list)
  return list[idx >= 0 ? idx : 0]
}

function updateDispatchHazardRecord(id, updater) {
  const list = getDispatchHazards()
  const idx = list.findIndex((item) => item.id === id)
  if (idx < 0) return null
  const base = emptyDispatchHazard(list[idx])
  const patch = updater(base) || base
  const merged = { ...base, ...patch }
  // 防止局部更新丢失隐患类型/等级：始终以原记录为兜底
  merged.hazardType = base.hazardType
  merged.hazardLevel = base.hazardLevel
  const next = emptyDispatchHazard(merged)
  next.hazardType = base.hazardType
  next.hazardLevel = base.hazardLevel
  list[idx] = next
  writeList(DISPATCH_HAZARD_KEY, list)
  return next
}

export function submitDispatchHazardRectify(id, payload = {}) {
  return updateDispatchHazardRecord(id, (row) => {
    if (row.rectifyStatus !== '待整改') return row
    const time = hazardNow()
    const photos = Array.isArray(payload.photos) ? payload.photos.filter(Boolean) : []
    const photoLabels = photos.map((item, index) => resolveDispatchHazardPhotoName(item, index))
    const remark = String(payload.remark || '').trim()
    const log = {
      action: '提交整改',
      fromStatus: '待整改',
      toStatus: '待验收',
      operator: payload.operator || '施工方用户',
      operatorRole: payload.operatorRole || DISPATCH_HAZARD_ACTOR_ROLES.CONTRACTOR,
      remark,
      photos: photoLabels,
      time,
    }
    return {
      ...row,
      rectifyStatus: isExtendedDispatchHazard({ ...row, hazardType: row.hazardType, hazardLevel: row.hazardLevel }) ? '待整改' : '待验收',
      rectifyRemark: remark,
      rectifyPhotos: photos,
      statusLogs: appendStatusLog(row.statusLogs, log),
    }
  })
}

/** 监理复查：待验收 → 待复查（通过）/ 待整改（驳回）。 */
/** 施工单位项目经理验收：扩展流程在提交整改后、监理复核前。 */
export function acceptDispatchContractor(id, { pass = true, remark = "" } = {}) {
  return updateDispatchHazardRecord(id, (row) => {
    if (!isExtendedDispatchHazard(row) || row.rectifyStatus !== '待整改') return row
    const hasSubmit = (row.statusLogs || []).some((log) => log.action === '提交整改')
    if (!hasSubmit || row.contractorAcceptanceDate) return row
    const time = hazardNow()
    const log = {
      action: pass ? '施工验收通过' : '施工验收不通过',
      fromStatus: '待整改',
      toStatus: pass ? '待验收' : '待整改',
      operator: row.contractorManager || '施工单位项目经理',
      operatorRole: DISPATCH_HAZARD_ACTOR_ROLES.CONTRACTOR,
      remark: remark || (pass ? '施工单位项目经理验收通过，提交监理复核' : '验收不通过，退回继续整改'),
      photos: [],
      time,
    }
    return {
      ...row,
      rectifyStatus: pass ? '待验收' : '待整改',
      contractorAcceptanceDate: time,
      contractorAcceptanceResult: pass ? '通过' : '不通过',
      contractorAcceptanceComment: remark,
      statusLogs: appendStatusLog(row.statusLogs, log),
    }
  })
}

/** 监理单位项目总监验收：扩展流程在监理复核通过后、项目经理审批前。 */
export function acceptDispatchDirector(id, { pass = true, remark = "" } = {}) {
  return updateDispatchHazardRecord(id, (row) => {
    if (!isExtendedDispatchHazard(row) || row.rectifyStatus !== '待验收') return row
    const reviewPass = (row.statusLogs || []).some((log) => log.action === '复查通过')
    if (!reviewPass || row.directorAcceptanceDate) return row
    const time = hazardNow()
    const log = {
      action: pass ? '总监验收通过' : '总监验收不通过',
      fromStatus: '待验收',
      toStatus: pass ? '待复查' : '待整改',
      operator: row.director || '监理单位项目总监',
      operatorRole: '监理',
      remark: remark || (pass ? '总监验收通过，提交项目经理审批' : '验收不通过，退回继续整改'),
      photos: [],
      time,
    }
    return {
      ...row,
      rectifyStatus: pass ? '待复查' : '待整改',
      directorAcceptanceDate: time,
      directorAcceptanceResult: pass ? '通过' : '不通过',
      directorAcceptanceComment: remark,
      statusLogs: appendStatusLog(row.statusLogs, log),
    }
  })
}

export function reviewDispatchHazard(id, { pass = true, remark = '', photos = [] } = {}) {
  const list = readList(DISPATCH_HAZARD_KEY, buildSeedFromScreenHazards())
  const index = list.findIndex((item) => item.id === id)
  if (index < 0) return null
  const row = emptyDispatchHazard(list[index])
  if (row.rectifyStatus !== '待验收') return row
  const now = hazardNow()
  const log = {
    action: pass ? '复查通过' : '复查不通过',
    fromStatus: '待验收',
    toStatus: pass ? '待复查' : '待整改',
    operator: '监理单位',
    operatorRole: DISPATCH_HAZARD_ACTOR_ROLES.SAFETY,
    remark: remark || (pass ? '监理已复核整改结果，同意进入审批' : '整改不到位，退回继续整改'),
    photos: Array.isArray(photos) ? photos : [],
    time: now,
  }
  const next = emptyDispatchHazard({ ...row, rectifyStatus: log.toStatus, rectifyRemark: log.remark, rectifyPhotos: log.photos, statusLogs: [log, ...(row.statusLogs || [])] })
  list[index] = next
  writeList(DISPATCH_HAZARD_KEY, list)
  return next
}

/** 项目经理审批：待复查 → 已关闭（通过）/ 待整改（驳回）；兼容历史「待验收」直接关闭。 */
export function approveDispatchHazard(id, { pass = true, remark = '', photos = [] } = {}) {
  const list = readList(DISPATCH_HAZARD_KEY, buildSeedFromScreenHazards())
  const index = list.findIndex((item) => item.id === id)
  if (index < 0) return null
  const row = emptyDispatchHazard(list[index])
  if (!['待复查', '待验收'].includes(row.rectifyStatus)) return row
    const extended = (String(row.hazardType) === 'quality' && String(row.hazardLevel) === 'A') || String(row.hazardLevel) === 'Ⅰ重大隐患'
  if (pass && (row.statusLogs || []).some((log) => log.action === '审批通过')) return row
  const now = hazardNow()
  const reopen = pass && extended
  const log = {
    action: pass ? '审批通过' : '审批不通过',
    fromStatus: row.rectifyStatus,
    toStatus: !pass ? '待整改' : reopen ? '待复查' : '已关闭',
    operator: '项目经理',
    operatorRole: DISPATCH_HAZARD_ACTOR_ROLES.SAFETY,
    remark: remark || (pass ? (reopen ? '审批通过，提交项目部长确认' : '资料齐全，同意关闭') : '退回继续整改'),
    photos: Array.isArray(photos) ? photos : [],
    time: now,
  }
  const next = emptyDispatchHazard({ ...row, rectifyStatus: log.toStatus, rectifyRemark: log.remark, rectifyPhotos: log.photos, statusLogs: [log, ...(row.statusLogs || [])] })
  list[index] = next
  writeList(DISPATCH_HAZARD_KEY, list)
  return next
}

/** 项目部长确认：仅扩展流程（质量A / Ⅰ重大）在审批通过后可用。 */
export function confirmDispatchHazard(id, { pass = true, remark = '', photos = [] } = {}) {
  const list = readList(DISPATCH_HAZARD_KEY, buildSeedFromScreenHazards())
  const index = list.findIndex((item) => item.id === id)
  if (index < 0) return null
  const row = emptyDispatchHazard(list[index])
  const extended = isExtendedDispatchHazard(row)
  const approved = (row.statusLogs || []).some((log) => log.action === '审批通过')
  if (!extended || row.rectifyStatus !== '待复查' || !approved) return row
  const now = hazardNow()
  const log = {
    action: pass ? '确认通过' : '确认不通过',
    fromStatus: '待复查',
    toStatus: pass ? '已关闭' : '待整改',
    operator: '项目部长',
    operatorRole: '项目部长',
    remark: remark || (pass ? '确认整改与验收结果，同意关闭' : '确认不通过，退回继续整改'),
    photos: Array.isArray(photos) ? photos : [],
    time: now,
  }
  const next = emptyDispatchHazard({ ...row, rectifyStatus: log.toStatus, statusLogs: [log, ...(row.statusLogs || [])] })
  list[index] = next
  writeList(DISPATCH_HAZARD_KEY, list)
  return next
}

export function acceptDispatchHazard(id, payload = {}) {
  return updateDispatchHazardRecord(id, (row) => {
    if (row.rectifyStatus !== '待验收') return row
    const time = hazardNow()
    const remark = String(payload.remark || '').trim() || '现场核查整改到位，予以关闭'
    const log = {
      action: '验收通过',
      fromStatus: '待验收',
      toStatus: '已关闭',
      operator: payload.operator || '安质部用户',
      operatorRole: payload.operatorRole || DISPATCH_HAZARD_ACTOR_ROLES.SAFETY,
      remark,
      photos: [],
      time,
    }
    return {
      ...row,
      rectifyStatus: '已关闭',
      statusLogs: appendStatusLog(row.statusLogs, log),
    }
  })
}

export function rejectDispatchHazard(id, payload = {}) {
  return updateDispatchHazardRecord(id, (row) => {
    if (row.rectifyStatus !== '待验收') return row
    const time = hazardNow()
    const remark = String(payload.remark || '').trim()
    const log = {
      action: '验收驳回',
      fromStatus: '待验收',
      toStatus: '待整改',
      operator: payload.operator || '安质部用户',
      operatorRole: payload.operatorRole || DISPATCH_HAZARD_ACTOR_ROLES.SAFETY,
      remark,
      photos: [],
      time,
    }
    return {
      ...row,
      rectifyStatus: '待整改',
      statusLogs: appendStatusLog(row.statusLogs, log),
    }
  })
}
