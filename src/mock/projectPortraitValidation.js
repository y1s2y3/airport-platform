import { parseOneContact, isValidContactStorageFormat } from '../utils/contactValue'
import { listSysUsers } from './sysUsers'
import { projectList } from './projectBasicInfo'
import {
  normalizeConstructionProjectCode,
  validateConstructionProjectCode,
  validateSingleProjectCode,
  validateSpecialtyProjectCode,
} from '../utils/projectCodeFields'

/** 项目级代号（需求变更 CR-07）：建设项目代号 4 位、单项工程代号 2 位数字、专业工程代号 4 位 */
export function normalizeEngineeringCode(value) {
  return normalizeConstructionProjectCode(value)
}

/** 项目画像必填校验：项目名称、项目简称、所属组织、项目编码、是否隐藏、三项代号、项目经理 */
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

  // 建设项目代号（原「工程代号」）：4 位大写字母或数字、全系统唯一
  const constructionCheck = validateConstructionProjectCode(data?.constructionProjectCode)
  if (!constructionCheck.ok) {
    return { ok: false, msg: constructionCheck.msg }
  }
  const selfId = String(data?.id || '')
  const duplicated = projectList.some(
    (item) =>
      item.id !== selfId
      && normalizeConstructionProjectCode(item.constructionProjectCode) === constructionCheck.code,
  )
  if (duplicated) {
    return { ok: false, msg: '建设项目代号已存在，请更换' }
  }
  data.constructionProjectCode = constructionCheck.code

  // 单项工程代号：2 位数字
  const singleCheck = validateSingleProjectCode(data?.singleProjectCode)
  if (!singleCheck.ok) {
    return { ok: false, msg: singleCheck.msg }
  }
  data.singleProjectCode = singleCheck.code

  // 专业工程代号：4 位大写字母或数字
  const specialtyCheck = validateSpecialtyProjectCode(data?.specialtyProjectCode)
  if (!specialtyCheck.ok) {
    return { ok: false, msg: specialtyCheck.msg }
  }
  data.specialtyProjectCode = specialtyCheck.code

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
