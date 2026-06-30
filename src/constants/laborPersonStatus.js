/**
 * 劳务人员状态口径
 *
 * 人员实名制 · 入退场：
 * - 已入场：完成入场登记，尚未办理退场
 * - 已退场：已办理退场/离职
 *
 * 考勤 · 进出场：
 * - 已进场：当日已进入工地（闸机/打卡）
 * - 已出场：当日已离开工地
 *
 * 在场（实时考勤）：
 * - 在场：当日已打上班卡，且未打下班卡
 * - 不在场：未打上班卡，或已打下班卡
 */

/** 人员实名制 · 入退场 */
export const REALNAME_ENTRY_LABEL = '入退场'

export const REALNAME_ENTRY_STATUS = {
  ENTERED: '已入场',
  EXITED: '已退场',
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

export const ONSITE_STATUS = {
  ON_SITE: '在场',
  OFF_SITE: '不在场',
}

export const ONSITE_STATUS_OPTIONS = [ONSITE_STATUS.ON_SITE, ONSITE_STATUS.OFF_SITE]

export function isPersonOnSiteByPunch(clockIn, clockOut) {
  return Boolean(clockIn) && !clockOut
}

export function getOnSiteStatus(clockIn, clockOut) {
  return isPersonOnSiteByPunch(clockIn, clockOut)
    ? ONSITE_STATUS.ON_SITE
    : ONSITE_STATUS.OFF_SITE
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
