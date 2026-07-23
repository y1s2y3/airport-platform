import { PROJECT_SHORT_NAMES, HAZARD_REPORTERS } from '../coc/mock/data.js'

const HAZARD_TEMPLATES = [
  {
    hazardType: 'safety',
    description: '塔吊作业区警戒标识不足，临边防护缺失',
    hazardLevel: '较大',
  },
  {
    hazardType: 'quality',
    description: '钢筋绑扎间距偏差，保护层厚度不足',
    hazardLevel: '一般',
  },
  {
    hazardType: 'safety',
    description: '材料堆放占用消防通道，文明施工不到位',
    hazardLevel: '一般',
  },
  {
    hazardType: 'safety',
    description: '深基坑周边防护栏破损，警示灯未开启',
    hazardLevel: '较大',
  },
  {
    hazardType: 'quality',
    description: '混凝土浇筑振捣不充分，存在蜂窝麻面风险',
    hazardLevel: '一般',
  },
  {
    hazardType: 'safety',
    description: '高处作业人员未系安全带，安全网搭设不规范',
    hazardLevel: '重大',
  },
]

const PM_ATTENDEES = [
  '张某（项目经理）、李某（项目负责人）',
  '陈某（项目经理）、刘某（项目负责人）',
  '王某（项目经理）、赵某（项目负责人）',
  '周某（项目经理）、吴某（项目负责人）',
]

const DIRECTOR_ATTENDEES = [
  '王某（项目部长）',
  '赵某（项目副部长）',
  '孙某（项目部长）',
  '钱某（项目副部长）',
]

const ACCEPTOR_OPTIONS = ['吴检', '陈工', '王监理', '赵总监']

/** 演示用状态分布：待下发居多（会议解析默认） */
const RECTIFY_STATUSES = ['待下发', '待下发', '待整改', '待验收', '已关闭']

function buildSeedStatusLogs(status, uploadTime, projectName, meta = {}) {
  const register = {
    action: '登记',
    fromStatus: '',
    toStatus: '待下发',
    operator: '系统',
    operatorRole: '系统',
    remark: '监理解析自动生成隐患（待下发）',
    photos: [],
    time: uploadTime,
  }
  if (status === '待下发') return [register]

  const issueLog = {
    action: '下发',
    fromStatus: '待下发',
    toStatus: '待整改',
    operator: '监理用户',
    operatorRole: '监理',
    remark: `整改人：${meta.rectifier || '—'}；期限：${meta.hazardDeadline || '—'}；验收人：${meta.acceptor || '—'}`,
    photos: [],
    time: uploadTime,
  }
  if (status === '待整改') return [issueLog, register]

  const token = safeProjectFileToken(projectName)
  const submitLog = {
    action: '提交整改',
    fromStatus: '待整改',
    toStatus: '待验收',
    operator: '施工方用户',
    operatorRole: '施工方',
    remark: '已完成现场整改，整改措施已落实。',
    photos: [`${token}整改现场_01.jpg`],
    time: uploadTime,
  }
  if (status === '待验收') return [submitLog, issueLog, register]

  const acceptLog = {
    action: '验收通过',
    fromStatus: '待验收',
    toStatus: '已关闭',
    operator: '监理用户',
    operatorRole: '监理',
    remark: '现场核查整改到位，予以关闭。',
    photos: [],
    time: uploadTime,
  }
  return [acceptLog, submitLog, issueLog, register]
}

function deadlineFrom(baseDate, days) {
  const d = new Date(baseDate)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

function formatUploadTime(meetingDate, hour, minute) {
  return `${meetingDate} ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

function safeProjectFileToken(name) {
  return String(name || '项目').replace(/[\\/:*?"<>|]/g, '_')
}

/**
 * 为 COC 全部项目生成监理会议及解析隐患 mock 数据。
 */
export function buildSupervisionMeetingSeed() {
  const meetings = []
  const hazards = []
  let hazardSeq = 1

  PROJECT_SHORT_NAMES.forEach((projectName, index) => {
    const projectId = `p-${String(index).padStart(3, '0')}`
    const projectDept = `${projectName}项目部`
    const fileToken = safeProjectFileToken(projectName)
    const day = 5 + (index % 24)
    const meetingDate = `2026-06-${String(day).padStart(2, '0')}`
    const meetingId = `SM-${String(index + 1).padStart(3, '0')}`
    const hazardCount = 1 + (index % 3)
    const parsedAt = formatUploadTime(meetingDate, 15 + (index % 6), 10 + (index % 50))

    meetings.push({
      id: meetingId,
      projectId,
      projectDept,
      projectName,
      meetingDate,
      pmAttendees: PM_ATTENDEES[index % PM_ATTENDEES.length],
      directorAttendees: DIRECTOR_ATTENDEES[index % DIRECTOR_ATTENDEES.length],
      minutesWord: `${fileToken}监理例会纪要_${meetingDate.replace(/-/g, '')}.docx`,
      minutesPdf: `${fileToken}监理例会纪要_${meetingDate.replace(/-/g, '')}.pdf`,
      signInPhoto: index % 5 === 0 ? '' : `${fileToken}监理例会签到表_${meetingDate.replace(/-/g, '')}.jpg`,
      meetingPhoto: index % 7 === 0 ? '' : `${fileToken}监理例会现场_${meetingDate.replace(/-/g, '')}.jpg`,
      remark: '',
      parseStatus: 'success',
      parsedAt,
      hazardCount,
      uploadTime: formatUploadTime(meetingDate, 16 + (index % 4), 20 + (index % 40)),
    })

    for (let h = 0; h < hazardCount; h += 1) {
      const template = HAZARD_TEMPLATES[(index + h) % HAZARD_TEMPLATES.length]
      const uploadTime = formatUploadTime(meetingDate, 17 + (index % 3), 5 + h * 8)
      const rectifyStatus = RECTIFY_STATUSES[(index + h) % RECTIFY_STATUSES.length]
      const pendingIssue = rectifyStatus === '待下发'
      const rectifier = pendingIssue ? '' : HAZARD_REPORTERS[(index + h) % HAZARD_REPORTERS.length]
      const hazardDeadline = pendingIssue ? '' : deadlineFrom(meetingDate, 5 + h * 3)
      const acceptor = pendingIssue ? '' : ACCEPTOR_OPTIONS[(index + h) % ACCEPTOR_OPTIONS.length]
      hazards.push({
        id: `SHZ-${String(hazardSeq).padStart(3, '0')}`,
        meetingId,
        projectId,
        projectName,
        source: '监理解析',
        hazardType: template.hazardType,
        description: template.description,
        hazardLevel: template.hazardLevel,
        rectifier,
        hazardDeadline,
        acceptor,
        rectifyStatus,
        rectifyRemark: ['待验收', '已关闭'].includes(rectifyStatus)
          ? '已完成现场整改，整改措施已落实。'
          : '',
        rectifyPhotos: ['待验收', '已关闭'].includes(rectifyStatus)
          ? [`${fileToken}整改现场_01.jpg`]
          : [],
        statusLogs: buildSeedStatusLogs(rectifyStatus, uploadTime, projectName, {
          rectifier,
          hazardDeadline,
          acceptor,
        }),
        uploadTime,
      })
      hazardSeq += 1
    }

    // 部分项目追加一条「未召开」记录，便于演示 skipped 状态
    if (index % 6 === 1) {
      const skipDay = Math.max(1, day - 7)
      const skipDate = `2026-06-${String(skipDay).padStart(2, '0')}`
      meetings.push({
        id: `SM-S${String(index + 1).padStart(3, '0')}`,
        projectId,
        projectDept,
        projectName,
        meetingDate: skipDate,
        pmAttendees: '',
        directorAttendees: '',
        minutesWord: '',
        minutesPdf: '',
        signInPhoto: '',
        meetingPhoto: '',
        remark: `因${['暴雨', '台风', '交叉施工', '人员调配', '设备检修'][index % 5]}未召开，改期至 ${meetingDate}`,
        parseStatus: 'skipped',
        parsedAt: '',
        hazardCount: 0,
        uploadTime: formatUploadTime(skipDate, 9, 30),
      })
    }
  })

  return { meetings, hazards }
}

const seed = buildSupervisionMeetingSeed()
export const defaultSupervisionMeetings = seed.meetings
export const defaultSupervisionHazards = seed.hazards
