/**
 * 劳务人员状态口径（实名制专业名词统一）
 *
 * 【在岗状态】人员在项目上的登记关系（原称「入退场」）：
 * - 在岗：已完成项目登记、尚未离场 = 计入在岗人数（原「已入场 / 在册」）
 * - 离场：已办理离场 = 不计入在岗人数（原「已退场 / 不在册」）
 *
 * 【进出场】当日考勤机刷脸形成的进出记录（对应原「上下班打卡」口径，产品用语统一为进出场）：
 * - 已进场：当日已进入工地（刷脸进场）
 * - 已出场：当日已离开工地（刷脸出场）
 *
 * 【在场】由当日进出场派生；仅对在岗人员计算，用于现场在场人数统计：
 * - 在场：当日已进场且尚未出场（有进场时间、无出场时间）
 * - 不在场：当日未进场，或已进场且已出场
 * - —：离场人员不适用在场状态（不计入在场人数）
 */

/** 人员实名制 · 在岗状态（原「入退场」） */
export const REALNAME_ENTRY_LABEL = '在岗状态'

export const REALNAME_ENTRY_STATUS = {
  ENTERED: '在岗',
  EXITED: '离场',
}

export const REALNAME_ENTRY_STATUS_OPTIONS = [
  REALNAME_ENTRY_STATUS.ENTERED,
  REALNAME_ENTRY_STATUS.EXITED,
]

/** 考勤 · 进出场 */
export const ATTENDANCE_ENTRY_LABEL = '进出场'

export const ATTENDANCE_ENTRY_STATUS = {
  ENTERED: '已进场',
  EXITED: '已出场',
}

export const ATTENDANCE_ENTRY_STATUS_OPTIONS = [
  ATTENDANCE_ENTRY_STATUS.ENTERED,
  ATTENDANCE_ENTRY_STATUS.EXITED,
]

/** 列头：进出场时间（原「上班/下班打卡」） */
export const ATTENDANCE_CLOCK_IN_LABEL = '进场时间'
export const ATTENDANCE_CLOCK_OUT_LABEL = '出场时间'

export const ONSITE_STATUS = {
  ON_SITE: '在场',
  OFF_SITE: '不在场',
}

export const ONSITE_STATUS_OPTIONS = [ONSITE_STATUS.ON_SITE, ONSITE_STATUS.OFF_SITE]

/** 离场人员不适用在场状态 */
export const REALNAME_ONSITE_NOT_APPLICABLE = '—'

export function isPersonOnSiteByPunch(clockIn, clockOut) {
  return Boolean(clockIn) && !clockOut
}

export function getOnSiteStatus(clockIn, clockOut) {
  return isPersonOnSiteByPunch(clockIn, clockOut)
    ? ONSITE_STATUS.ON_SITE
    : ONSITE_STATUS.OFF_SITE
}

/** 实名制 · 在场状态（离场不适用） */
export function getRealNameOnSiteStatus(entryStatus, clockIn, clockOut) {
  if (entryStatus === REALNAME_ENTRY_STATUS.EXITED) {
    return REALNAME_ONSITE_NOT_APPLICABLE
  }
  return getOnSiteStatus(clockIn, clockOut)
}

export function isRealNameActive(entryStatus) {
  return entryStatus === REALNAME_ENTRY_STATUS.ENTERED
}

export function isRealNamePersonOnSite(person) {
  return (
    isRealNameActive(person.entry_status) &&
    person.on_site_status === ONSITE_STATUS.ON_SITE
  )
}

export function realNameEntryStatusTagClass(status) {
  return status === REALNAME_ENTRY_STATUS.ENTERED ? 'ap-tag-enabled' : 'ap-tag-disabled'
}

export function attendanceEntryStatusTagClass(status) {
  return status === ATTENDANCE_ENTRY_STATUS.ENTERED ? 'ap-tag-enabled' : 'ap-tag-disabled'
}

export function onSiteStatusTagClass(status) {
  return status === ONSITE_STATUS.ON_SITE ? 'ap-tag-enabled' : 'ap-tag-draft'
}
