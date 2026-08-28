import { parseOneContact, isValidContactStorageFormat } from '../utils/contactValue'
import { listSysUsers } from './sysUsers'

/** 项目画像必填校验：项目名称、项目简称、项目经理 */
export function validateProjectPortraitRequired(data) {
  if (!String(data?.projectName || '').trim()) {
    return { ok: false, msg: '请填写项目名称' }
  }
  if (!String(data?.shortName || '').trim()) {
    return { ok: false, msg: '请填写项目简称' }
  }
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
