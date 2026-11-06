/**
 * 危大工程过程管控 · 演示记录生成（用户 2026-11-06：每个页签至少 3~5 条示例，避免点开空白）
 * 仅用于演示数据（demo ledger）初始化；不影响手工数据。
 */
import { getProjectPersonnel } from './laborRealName.js'
import { listMobileInspectionTasks } from './mobileInspectionTasks.js'
import { PROCESS_CONFIGS } from '../utils/majorHazardProcessConfig.js'

const TAB_COUNT = { scheme: 3, schemeDisclosure: 3, safetyDisclosure: 3, workerRegistration: 3, conditionAcceptance: 3, progress: 4, patrol: 3, acceptance: 3 }
const SUBMITTERS = ['张工', '王工', '刘工', '赵工']
const LOCATIONS = ['A 区基坑东侧', '2 号楼三层', '航站楼屋盖吊装区', '捷运线暗挖区间', '模板支撑作业面']
const TEAMS = ['模板班', '钢筋班', '土方班', '钢结构班', '普工班']

function dateMinus(base, days) {
  const d = new Date(base)
  d.setDate(d.getDate() - days)
  return d.toISOString().slice(0, 10)
}

function dateTimeMinus(base, days, hour = 9) {
  const day = dateMinus(base, days)
  return `${day} ${String(hour).padStart(2, '0')}:30`
}

function peopleOf(projectId) {
  try {
    const people = getProjectPersonnel(projectId) || []
    const active = people.filter((person) => person.entry_status === '在岗')
    return (active.length ? active : people)
  } catch {
    return []
  }
}

function taskPool(projectId) {
  try {
    const list = listMobileInspectionTasks() || []
    const own = list.filter((task) => (task.projectId || task.project_id) === projectId)
    return (own.length ? own : list).slice(0, 3)
  } catch {
    return []
  }
}

function walkFields(tabKey, record, context) {
  const config = PROCESS_CONFIGS[tabKey]
  const fields = (config?.fields || [])
  const { index, partName, people, tasks, day } = context
  fields.forEach((field) => {
    switch (field.key) {
      case 'schemeName':
        record.schemeName = `${partName}专项施工方案（第${index + 1}版）`
        break
      case 'schemeCode':
        record.schemeCode = `ZX${day.replace(/-/g, '')}${String(index + 1).padStart(3, '0')}`
        break
      case 'preparedBy':
      case 'siteManager':
        record[field.key] = SUBMITTERS[index % SUBMITTERS.length]
        break
      case 'discloser':
        record.discloser = SUBMITTERS[(index + 1) % SUBMITTERS.length]
        break
      case 'receiver':
        record.receiver = [people[(index + 2) % Math.max(1, people.length)]?.basic?.name, people[(index + 3) % Math.max(1, people.length)]?.basic?.name].filter(Boolean)
        if (!record.receiver.length) record.receiver = ['李华', '王芳']
        break
      case 'title':
        record.title = `${partName}安全技术交底（第${index + 1}次）`
        break
      case 'disclosureLocation':
        record.disclosureLocation = LOCATIONS[index % LOCATIONS.length]
        break
      case 'receivingSubcontractor':
        record.receivingSubcontractor = '深圳市政集团有限公司'
        break
      case 'workTeam':
        record.workTeam = TEAMS[index % TEAMS.length]
        break
      case 'disclosureContent':
        record.disclosureContent = '交底内容包括作业顺序、临边防护、机械操作要点及应急处置流程。'
        break
      case 'disclosureRemark':
        record.disclosureRemark = index === 0 ? '全体作业人员已签到确认。' : ''
        break
      case 'acceptanceResult':
        record.acceptanceResult = index === 2 ? '不合格' : '合格'
        break
      case 'acceptanceDescription':
        record.acceptanceDescription = index === 2 ? '局部防护栏杆缺失，整改后复验。' : '施工条件、人员资质与安全设施均已落实。'
        break
      case 'executionRate':
        record.executionRate = [30, 45, 58, 68][index % 4]
        break
      case 'progressDescription':
        record.progressDescription = ['土方分层开挖完成至第一道支撑。', '支撑体系搭设完成 60%。', '钢结构分片吊装完成 2 片。', '暗挖上台阶开挖支护完成。'][index % 4]
        break
      default:
        break
    }
  })
}

function commonRecord(tabKey, context) {
  const { index, partId, partName, day, offset } = context
  const config = PROCESS_CONFIGS[tabKey]
  const recordDate = dateMinus(new Date(), Math.max(0, offset + index * 2))
  return {
    id: `mh-demo-${tabKey}-${partId}-${index + 1}`,
    partId,
    partName,
    status: '已完成',
    date: recordDate,
    responsible: SUBMITTERS[index % SUBMITTERS.length],
    content: `${partName}${config?.label || tabKey}示例记录 ${index + 1}`,
    createdBy: SUBMITTERS[index % SUBMITTERS.length],
    createdAt: `${recordDate} 09:30:00`,
    attachmentInfo: index === 0 ? `${config?.label || '过程'}资料.pdf\n现场照片${index + 1}.jpg` : '',
    result: '',
    _demoDay: day,
  }
}

function buildForTab(tabKey, context) {
  const count = TAB_COUNT[tabKey] || 3
  const { people, tasks, partName } = context
  const records = []
  for (let index = 0; index < count; index += 1) {
    const record = commonRecord(tabKey, { ...context, index })
    walkFields(tabKey, record, { ...context, index })

    if (tabKey === 'workerRegistration') {
      const person = people[index % Math.max(1, people.length)]
      if (person) {
        record.personId = person.id
        record.workerName = person.basic?.name || ''
        record.phone = person.basic?.phone || ''
        record.idNumber = person.basic?.id_number || ''
        record.employer = person.unit?.unit_name || '中建土方工程有限公司'
        record.jobType = person.unit?.work_type || '建筑工人'
        record.workerType = person.unit?.personnel_category || '建筑工人'
        record.entryDate = dateMinus(new Date(), 20 + index)
        record.isSpecialWorker = person.is_special ? '是' : '否'
        record.certificateNo = person.cert_no || ''
        record.certificateExpiry = person.unit?.cert_valid_to || ''
        record.personIds = [person.id]
        record.content = `${record.workerName}（${record.jobType}）作业人员登记`
        record.status = '已完成'
      }
      record.attachmentInfo = ''
    }

    if (tabKey === 'progress') {
      const danger = tasks[index % Math.max(1, tasks.length)] || null
      record.dangerWorks = [{
        id: `mh-demo-danger-${index + 1}`,
        report_date: record.date,
        danger_work_category: ['基坑作业', '高处作业', '起重吊装'][index % 3],
        work_area: LOCATIONS[index % LOCATIONS.length],
        work_content: `${partName}${['土方开挖', '支撑搭设', '构件吊装'][index % 3]}`,
        contractor: '深圳市政集团有限公司',
      }]
      record.dangerWorkIds = record.dangerWorks.map((item) => item.id)
      record.executionRate = [30, 45, 58, 68][index % 4]
    }

    if (tabKey === 'patrol') {
      const task = tasks[index % Math.max(1, tasks.length)]
      record.inspectionTaskIds = task ? [task.id] : []
      record.inspectionTasks = task ? [{ id: task.id, taskNo: task.taskNo, taskName: task.taskName }] : []
      record.inspectionTaskCount = task ? 1 : 0
      record.inspectionTaskNo = task?.taskNo || '--'
      record.inspectionTaskName = task?.taskName || `${partName}现场巡视`
      record.inspectionDate = record.date
      record.inspectors = task?.executor || task?.inspector || '王安全'
      record.hazardCount = task?.hazardCount ?? 0
      record.attachmentInfo = ''
    }

    if (tabKey === 'conditionAcceptance' || tabKey === 'acceptance') {
      record.result = record.acceptanceResult || '合格'
    }

    records.push(record)
  }
  return records.sort((a, b) => b.date.localeCompare(a.date))
}

/** 为一个施工部位生成 9 个页签的演示记录（管控要点走清单级勾选，不在其中） */
export function buildDemoTabRecords(projectId, part, offset = 0) {
  const people = peopleOf(projectId)
  const tasks = taskPool(projectId)
  const result = {}
  Object.keys(PROCESS_CONFIGS).forEach((tabKey) => {
    if (tabKey === 'controlPoints') return
    result[tabKey] = buildForTab(tabKey, {
      projectId,
      partId: part.id,
      partName: part.name || '施工部位',
      offset,
      day: part.startDate || new Date().toISOString().slice(0, 10),
      people,
      tasks,
    })
  })
  return result
}
