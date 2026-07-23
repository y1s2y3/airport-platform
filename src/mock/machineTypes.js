/**
 * 机械类型维护（项目级共享 Mock）
 */
import { reactive } from 'vue'

export const machineTypeList = reactive([
  { name: '塔吊', attr: '大型设备' },
  { name: '升降机', attr: '大型设备' },
  { name: '桩基机械', attr: '大型设备' },
  { name: '复合地基机械', attr: '大型设备' },
])

export const machineAttrOptions = ['大型设备', '中型设备', '小型设备']

export function listMachineTypes() {
  return machineTypeList
}

export function addMachineType(name, attr = '大型设备') {
  const n = String(name || '').trim()
  if (!n) return { ok: false, msg: '请输入类型名称' }
  if (machineTypeList.some((t) => t.name === n)) return { ok: false, msg: '该类型已存在' }
  machineTypeList.push({ name: n, attr })
  return { ok: true }
}

export function removeMachineType(index) {
  if (index < 0 || index >= machineTypeList.length) return { ok: false, msg: '类型不存在' }
  machineTypeList.splice(index, 1)
  return { ok: true }
}
