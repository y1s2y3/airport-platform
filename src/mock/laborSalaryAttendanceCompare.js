import { REALNAME_ENTRY_STATUS } from '../constants/laborPersonStatus.js'
import { projectTree, getProjectLabel, getProjectPersonnel } from './laborRealName.js'
import { getPersonStats } from './laborAttendanceStats.js'
import { getAttendanceDetailsByMonth } from './laborAttendanceDetail.js'

export { projectTree, getProjectLabel }

export const compareStatusOptions = ['正常', '有考勤无薪资', '有薪资无考勤', '异常']

function hashSeed(str) {
  let h = 0
  for (let i = 0; i < str.length; i += 1) h = (h * 31 + str.charCodeAt(i)) % 9973
  return h
}

function buildPersonCompare(projectId, person, month) {
  const stats = getPersonStats(projectId).find((row) => row.name === person.basic.name)
  const attendanceDays = stats ? Number(stats.attendanceDays) : hashSeed(`${person.id}-${month}`) % 22
  const salaryPaid = hashSeed(`${person.id}-${month}-salary`) % 10 !== 0
  const hasAttendance = attendanceDays > 0

  let compareStatus = '正常'
  if (hasAttendance && !salaryPaid) compareStatus = '有考勤无薪资'
  else if (!hasAttendance && salaryPaid) compareStatus = '有薪资无考勤'
  else if (!hasAttendance && !salaryPaid) compareStatus = '异常'

  return {
    id: `${projectId}-${person.id}-${month}`,
    projectId,
    personnelId: person.id,
    personnelNo: person.basic.personnelNo,
    name: person.basic.name,
    unitName: person.unit.unitName,
    workType: person.unit.workType,
    month,
    attendanceDays,
    salaryAmount: salaryPaid ? `${1800 + (hashSeed(person.id) % 12) * 200}` : '0',
    salaryPaid,
    hasAttendance,
    compareStatus,
  }
}

export function getProjectSalaryCompareRows(projectId, month) {
  const personnel = getProjectPersonnel(projectId).filter((p) => p.entryStatus === REALNAME_ENTRY_STATUS.ENTERED)
  return personnel.map((person) => buildPersonCompare(projectId, person, month))
}

export function getHqProjectCompareSummary(month) {
  return projectTree[0].children.map((node) => {
    const rows = getProjectSalaryCompareRows(node.id, month)
    const warningCount = rows.filter((r) => r.compareStatus !== '正常').length
    const salaryPaidCount = rows.filter((r) => r.salaryPaid).length
    const attendanceNormalCount = rows.filter((r) => r.hasAttendance && r.salaryPaid).length
    return {
      id: node.id,
      projectId: node.id,
      projectName: node.label,
      month,
      personnelCount: rows.length,
      salaryPaidCount,
      attendanceNormalCount,
      warningCount,
    }
  })
}

export function getPersonMonthlyAttendanceDetails(projectId, personnelId, month) {
  const person = getProjectPersonnel(projectId).find((p) => p.id === personnelId)
  if (!person) return []
  const all = getAttendanceDetailsByMonth(projectId, month)
  return all.filter((row) => row.name === person.basic.name)
}

export function compareStatusTagClass(status) {
  if (status === '正常') return 'ap-tag-enabled'
  if (status === '有考勤无薪资') return 'ap-tag-high'
  if (status === '有薪资无考勤') return 'ap-tag-medium'
  return 'ap-tag-disabled'
}
