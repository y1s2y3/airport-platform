import { PROJECT_SHORT_NAMES } from '../coc/mock/data.js'

function escapeHtml(text = '') {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** 演示用图片预览（签到表 / 会议现场） */
function demoImageDataUrl(title = '附件预览', subtitle = '演示附件预览') {
  const t = escapeHtml(title)
  const s = escapeHtml(subtitle)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="640">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#f7f8fa"/>
      <stop offset="100%" stop-color="#e8eef5"/>
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#bg)"/>
  <rect x="40" y="40" width="880" height="560" rx="18" fill="#fff" stroke="#dcdfe6"/>
  <rect x="40" y="40" width="880" height="72" rx="18" fill="#91003d"/>
  <rect x="40" y="88" width="880" height="24" fill="#91003d"/>
  <text x="480" y="86" text-anchor="middle" fill="#fff" font-size="26" font-family="Microsoft YaHei, sans-serif">${t}</text>
  <text x="480" y="320" text-anchor="middle" fill="#303133" font-size="28" font-family="Microsoft YaHei, sans-serif">${s}</text>
  <text x="480" y="368" text-anchor="middle" fill="#909399" font-size="16" font-family="Microsoft YaHei, sans-serif">深圳机场扩建工程 · 监理会议演示附件</text>
  <text x="480" y="540" text-anchor="middle" fill="#c0c4cc" font-size="14" font-family="Microsoft YaHei, sans-serif">点击可预览 · Mock Data</text>
</svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

/** 演示用文档/清单预览页（HTML，详情点击可预览） */
function demoHtmlPreviewDataUrl({ title, projectName, meetingDate, bodyLines = [], tableRows = [] }) {
  const rowsHtml = tableRows.length
    ? `<table>
        <thead><tr><th>隐患类型</th><th>隐患描述</th><th>隐患等级</th><th>备注</th></tr></thead>
        <tbody>
          ${tableRows
            .map(
              (r) =>
                `<tr><td>${escapeHtml(r.type)}</td><td>${escapeHtml(r.desc)}</td><td>${escapeHtml(r.level)}</td><td>${escapeHtml(r.remark || '—')}</td></tr>`,
            )
            .join('')}
        </tbody>
      </table>`
    : ''
  const linesHtml = bodyLines.map((line) => `<p>${escapeHtml(line)}</p>`).join('')
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${escapeHtml(title)}</title>
  <style>
    body{margin:0;padding:32px;font-family:"Microsoft YaHei",sans-serif;color:#303133;background:#f5f7fa}
    .card{max-width:880px;margin:0 auto;background:#fff;border:1px solid #ebeef5;border-radius:12px;padding:28px 32px;box-shadow:0 8px 24px rgba(0,0,0,.04)}
    .brand{color:#91003d;font-size:13px;letter-spacing:.08em;margin-bottom:8px}
    h1{margin:0 0 16px;font-size:22px}
    .meta{color:#606266;font-size:14px;line-height:1.8;margin-bottom:20px}
    p{line-height:1.8;margin:0 0 10px;color:#303133}
    table{width:100%;border-collapse:collapse;margin-top:12px;font-size:13px}
    th,td{border:1px solid #ebeef5;padding:10px 12px;text-align:left}
    th{background:#fbf5f6;color:#91003d}
    .foot{margin-top:24px;color:#909399;font-size:12px}
  </style></head><body><div class="card">
    <div class="brand">深圳机场扩建工程信息化平台</div>
    <h1>${escapeHtml(title)}</h1>
    <div class="meta">项目：${escapeHtml(projectName)}<br/>召开日期：${escapeHtml(meetingDate)}</div>
    ${linesHtml}
    ${rowsHtml}
    <div class="foot">演示数据 · 仅供预览展示</div>
  </div></body></html>`
  return `data:text/html;charset=utf-8,${encodeURIComponent(html)}`
}

const HAZARD_TEMPLATES = [
  {
    hazardType: 'safety',
    description: '塔吊作业区警戒标识不足，临边防护缺失',
    hazardLevel: '较大',
    remark: '东侧塔吊回转半径范围内',
  },
  {
    hazardType: 'quality',
    description: '钢筋绑扎间距偏差，保护层厚度不足',
    hazardLevel: '一般',
    remark: '抽检点位 3# 梁板',
  },
  {
    hazardType: 'safety',
    description: '材料堆放占用消防通道，文明施工不到位',
    hazardLevel: '一般',
    remark: '需当日清运',
  },
  {
    hazardType: 'safety',
    description: '深基坑周边防护栏破损，警示灯未开启',
    hazardLevel: '较大',
    remark: '夜班已临时封堵',
  },
  {
    hazardType: 'quality',
    description: '混凝土浇筑振捣不充分，存在蜂窝麻面风险',
    hazardLevel: '一般',
    remark: '待养护期复核',
  },
  {
    hazardType: 'safety',
    description: '高处作业人员未系安全带，安全网搭设不规范',
    hazardLevel: '重大',
    remark: '已口头要求停工整改',
  },
  {
    hazardType: 'quality',
    description: '防水卷材搭接宽度不足，阴阳角未做附加层',
    hazardLevel: '较大',
    remark: '屋面 B 区',
  },
  {
    hazardType: 'safety',
    description: '配电箱未上锁，临电线路私拉乱接',
    hazardLevel: '较大',
    remark: '施工区二级箱',
  },
]

const PM_ATTENDEES = [
  '张伟（项目经理）、李强（项目负责人）',
  '陈磊（项目经理）、刘洋（项目负责人）',
  '王勇（项目经理）、赵军（项目负责人）',
  '周杰（项目经理）、吴涛（项目负责人）',
  '郑鹏（项目经理）、孙超（项目负责人）',
]

const DIRECTOR_ATTENDEES = [
  '王海（项目部长）、赵敏（项目副部长）',
  '孙磊（项目部长）',
  '钱勇（项目副部长）',
  '周芳（项目部长）、吴刚（项目副部长）',
  '郑凯（项目部长）',
]

const RECTIFIERS = ['施工员-刘洋', '安全员-周强', '质量员-陈晨', '班组长-赵磊', '技术员-孙浩']
const ACCEPTORS = ['专业监理-李工', '总监理-王工', '安全监理-张工', '质量监理-赵工']

/** 演示用状态：导入默认待整改，部分已关闭 */
const RECTIFY_STATUSES = ['待整改', '待整改', '待整改', '已关闭', '待整改', '已关闭']

function addDays(dateStr, days) {
  const d = new Date(`${dateStr}T00:00:00`)
  d.setDate(d.getDate() + days)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function buildSeedStatusLogs(status, uploadTime, closerName = '指挥部用户') {
  const register = {
    action: '登记',
    fromStatus: '',
    toStatus: '待整改',
    operator: '系统',
    operatorRole: '系统',
    remark: '本周隐患清单导入，默认待整改',
    photos: [],
    time: uploadTime,
  }
  if (status !== '已关闭') return [register]

  const closeLog = {
    action: '确认关闭',
    fromStatus: '待整改',
    toStatus: '已关闭',
    operator: closerName,
    operatorRole: '指挥部',
    remark: '现场复核通过，确认关闭',
    photos: [],
    time: uploadTime,
  }
  return [closeLog, register]
}

function formatUploadTime(meetingDate, hour, minute) {
  return `${meetingDate} ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

function safeProjectFileToken(name) {
  return String(name || '项目').replace(/[\\/:*?"<>|]/g, '_')
}

function buildHazardRowsForPreview(startIndex, count) {
  return Array.from({ length: count }, (_, h) => {
    const template = HAZARD_TEMPLATES[(startIndex + h) % HAZARD_TEMPLATES.length]
    return {
      type: template.hazardType === 'quality' ? '质量' : '安全',
      desc: template.description,
      level: template.hazardLevel,
      remark: template.remark || '',
    }
  })
}

/**
 * 为 COC 全部项目生成监理会议及隐患清单 mock 数据（含可点击预览附件）。
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
    const hazardCount = 2 + (index % 3)
    const parsedAt = formatUploadTime(meetingDate, 15 + (index % 6), 10 + (index % 50))
    const usePdfMinutes = index % 4 === 2
    const minutesName = usePdfMinutes
      ? `${fileToken}监理例会纪要_${meetingDate.replace(/-/g, '')}.pdf`
      : `${fileToken}监理例会纪要_${meetingDate.replace(/-/g, '')}.docx`
    const weeklyName = `${fileToken}本周隐患清单_${meetingDate.replace(/-/g, '')}.xlsx`
    const previewRows = buildHazardRowsForPreview(index, hazardCount)

    const minutesFileUrl = demoHtmlPreviewDataUrl({
      title: '监理例会纪要（演示）',
      projectName,
      meetingDate,
      bodyLines: [
        `一、会议主持：${DIRECTOR_ATTENDEES[index % DIRECTOR_ATTENDEES.length]}`,
        `二、参会人员：${PM_ATTENDEES[index % PM_ATTENDEES.length]}`,
        '三、本周施工进展：主体施工按计划推进，重点关注临边防护与质量通病治理。',
        '四、下周工作安排：完成隐患闭环销项，加强夜间施工巡查与资料归档。',
        '五、其他事项：请各参建单位按隐患清单时限完成整改并反馈。',
      ],
    })

    const weeklyHazardListUrl = demoHtmlPreviewDataUrl({
      title: '本周隐患清单（演示）',
      projectName,
      meetingDate,
      bodyLines: ['以下为按模板导入的本周隐患清单预览：'],
      tableRows: previewRows,
    })

    const hasSignIn = index % 5 !== 0
    const hasMeetingPhoto = index % 7 !== 0
    const remarkPool = [
      '',
      '会后同步至项目群，要求 48 小时内反馈整改计划。',
      '重点跟踪重大隐患销项，指挥部下周抽查。',
      '',
    ]

    meetings.push({
      id: meetingId,
      projectId,
      projectDept,
      projectName,
      meetingDate,
      pmAttendees: PM_ATTENDEES[index % PM_ATTENDEES.length],
      directorAttendees: DIRECTOR_ATTENDEES[index % DIRECTOR_ATTENDEES.length],
      minutesFile: minutesName,
      minutesWord: usePdfMinutes ? '' : minutesName,
      minutesPdf: usePdfMinutes ? minutesName : '',
      minutesFileUrl,
      weeklyHazardList: weeklyName,
      weeklyHazardListUrl,
      signInPhoto: hasSignIn ? `${fileToken}监理例会签到表_${meetingDate.replace(/-/g, '')}.jpg` : '',
      signInPhotoUrl: hasSignIn
        ? demoImageDataUrl(`${projectName} · 签到表`, `召开日期 ${meetingDate}`)
        : '',
      meetingPhoto: hasMeetingPhoto
        ? `${fileToken}监理例会现场_${meetingDate.replace(/-/g, '')}.jpg`
        : '',
      meetingPhotoUrl: hasMeetingPhoto
        ? demoImageDataUrl(`${projectName} · 会议现场`, '监理例会影像资料')
        : '',
      remark: remarkPool[index % remarkPool.length],
      parseStatus: 'success',
      parsedAt,
      hazardCount,
      uploadTime: formatUploadTime(meetingDate, 16 + (index % 4), 20 + (index % 40)),
    })

    for (let h = 0; h < hazardCount; h += 1) {
      const template = HAZARD_TEMPLATES[(index + h) % HAZARD_TEMPLATES.length]
      const uploadTime = formatUploadTime(meetingDate, 17 + (index % 3), 5 + h * 8)
      const rectifyStatus = RECTIFY_STATUSES[(index + h) % RECTIFY_STATUSES.length]
      const rectifier = RECTIFIERS[(index + h) % RECTIFIERS.length]
      const acceptor = ACCEPTORS[(index + h) % ACCEPTORS.length]
      const hazardDeadline = addDays(meetingDate, 3 + (h % 5))
      hazards.push({
        id: `SHZ-${String(hazardSeq).padStart(3, '0')}`,
        meetingId,
        projectId,
        projectName,
        source: '清单导入',
        hazardType: template.hazardType,
        description: template.description,
        hazardLevel: template.hazardLevel,
        remark: template.remark || '',
        rectifier,
        hazardDeadline,
        acceptor,
        rectifyStatus,
        rectifyRemark: rectifyStatus === '已关闭' ? '现场复核通过，资料齐全' : '',
        rectifyPhotos: [],
        statusLogs: buildSeedStatusLogs(rectifyStatus, uploadTime, '指挥部安质专责'),
        uploadTime,
      })
      hazardSeq += 1
    }

    // 部分项目追加第二条会议（稍早日期），丰富列表
    if (index % 3 === 0) {
      const earlierDate = addDays(meetingDate, -7)
      const earlierId = `SM-${String(index + 1).padStart(3, '0')}B`
      const earlierCount = 1 + (index % 2)
      const earlierRows = buildHazardRowsForPreview(index + 3, earlierCount)
      const earlierMinutes = `${fileToken}监理例会纪要_${earlierDate.replace(/-/g, '')}.docx`
      const earlierWeekly = `${fileToken}本周隐患清单_${earlierDate.replace(/-/g, '')}.xlsx`
      meetings.push({
        id: earlierId,
        projectId,
        projectDept,
        projectName,
        meetingDate: earlierDate,
        pmAttendees: PM_ATTENDEES[(index + 1) % PM_ATTENDEES.length],
        directorAttendees: DIRECTOR_ATTENDEES[(index + 1) % DIRECTOR_ATTENDEES.length],
        minutesFile: earlierMinutes,
        minutesWord: earlierMinutes,
        minutesPdf: '',
        minutesFileUrl: demoHtmlPreviewDataUrl({
          title: '监理例会纪要（演示）',
          projectName,
          meetingDate: earlierDate,
          bodyLines: [
            '一、回顾上周隐患整改完成情况。',
            '二、通报本周危大工程旁站记录。',
            '三、强调雨季施工防汛与用电安全。',
          ],
        }),
        weeklyHazardList: earlierWeekly,
        weeklyHazardListUrl: demoHtmlPreviewDataUrl({
          title: '本周隐患清单（演示）',
          projectName,
          meetingDate: earlierDate,
          bodyLines: ['以下为按模板导入的本周隐患清单预览：'],
          tableRows: earlierRows,
        }),
        signInPhoto: `${fileToken}监理例会签到表_${earlierDate.replace(/-/g, '')}.jpg`,
        signInPhotoUrl: demoImageDataUrl(`${projectName} · 签到表`, `召开日期 ${earlierDate}`),
        meetingPhoto: `${fileToken}监理例会现场_${earlierDate.replace(/-/g, '')}.jpg`,
        meetingPhotoUrl: demoImageDataUrl(`${projectName} · 会议现场`, '监理例会影像资料'),
        remark: '例会资料已归档。',
        parseStatus: 'success',
        parsedAt: formatUploadTime(earlierDate, 14, 20),
        hazardCount: earlierCount,
        uploadTime: formatUploadTime(earlierDate, 15, 5),
      })

      for (let h = 0; h < earlierCount; h += 1) {
        const template = HAZARD_TEMPLATES[(index + h + 2) % HAZARD_TEMPLATES.length]
        const uploadTime = formatUploadTime(earlierDate, 15, 30 + h * 5)
        hazards.push({
          id: `SHZ-${String(hazardSeq).padStart(3, '0')}`,
          meetingId: earlierId,
          projectId,
          projectName,
          source: '清单导入',
          hazardType: template.hazardType,
          description: template.description,
          hazardLevel: template.hazardLevel,
          remark: template.remark || '上周遗留跟进',
          rectifier: RECTIFIERS[(index + h + 1) % RECTIFIERS.length],
          hazardDeadline: addDays(earlierDate, 5),
          acceptor: ACCEPTORS[(index + h + 1) % ACCEPTORS.length],
          rectifyStatus: '已关闭',
          rectifyRemark: '已闭环',
          rectifyPhotos: [],
          statusLogs: buildSeedStatusLogs('已关闭', uploadTime),
          uploadTime,
        })
        hazardSeq += 1
      }
    }

    // 部分项目追加「未召开」记录
    if (index % 6 === 1) {
      const skipDate = addDays(meetingDate, -7)
      meetings.push({
        id: `SM-S${String(index + 1).padStart(3, '0')}`,
        projectId,
        projectDept,
        projectName,
        meetingDate: skipDate,
        pmAttendees: '',
        directorAttendees: '',
        minutesFile: '',
        minutesWord: '',
        minutesPdf: '',
        minutesFileUrl: '',
        weeklyHazardList: '',
        weeklyHazardListUrl: '',
        signInPhoto: '',
        signInPhotoUrl: '',
        meetingPhoto: '',
        meetingPhotoUrl: '',
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
