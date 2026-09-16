import { parseOneContact, isValidContactStorageFormat } from '../utils/contactValue'
import { listSysUsers } from './sysUsers'
import { projectList } from './projectBasicInfo'

const ENGINEERING_CODE_RE = /^[A-Z0-9]{4}$/

/** 工程代号：必填、恰好 4 位大写英文或数字、全系统唯一 */
export function normalizeEngineeringCode(value) {
  return String(value ?? '')
    .replace(/[^A-Za-z0-9]/g, '')
    .toUpperCase()
    .slice(0, 4)
}

/** 项目画像必填校验：项目名称、项目简称、所属组织、项目编码、是否隐藏、工程代号、项目经理 */
export function validateProjectPortraitRequired(data) {
  if (!String(data?.projectName || '').trim()) {
    return { ok: false, msg: '请填写项目名称' }
  }
  if (!String(data?.shortName || '').trim()) {
    return { ok: false, msg: '请填写项目简称' }
  }
  if (!String(data?.belongOrgId || '').trim()) {
    return { ok: false, msg: '请选择所属组织' }
  }
  if (!String(data?.projectEncode || '').trim()) {
    return { ok: false, msg: '请填写项目编码' }
  }
  if (typeof data?.hidden !== 'boolean') {
    return { ok: false, msg: '请选择是否隐藏' }
  }

  const engineeringCode = normalizeEngineeringCode(data?.engineeringCode)
  if (!engineeringCode) {
    return { ok: false, msg: '请填写工程代号' }
  }
  if (!ENGINEERING_CODE_RE.test(engineeringCode)) {
    return { ok: false, msg: '工程代号须为4位英文或数字' }
  }
  const selfId = String(data?.id || '')
  const duplicated = projectList.some(
    (item) =>
      item.id !== selfId
      && normalizeEngineeringCode(item.engineeringCode) === engineeringCode,
  )
  if (duplicated) {
    return { ok: false, msg: '工程代号已存在，请更换' }
  }
  data.engineeringCode = engineeringCode

  const manager = parseOneContact(data?.projectManagerContact)
  if (!manager.name || !manager.phone) {
    return { ok: false, msg: '请选择项目经理（项目负责人）' }
  }
  if (!isValidContactStorageFormat(data?.projectManagerContact)) {
    return { ok: false, msg: '项目经理联系方式须使用「姓名 / 电话」格式，不可粘连填写' }
  }
  if (!listSysUsers().find(
    (user) => user.status !== false && user.name === manager.name && user.phone === manager.phone,
  )) {
    return { ok: false, msg: '项目经理须从系统用户中选择' }
  }
  return { ok: true, msg: '' }
}
