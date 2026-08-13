import { projectTree, getProjectLabel, getDefaultProjectId } from './laborRealName.js'
import {
  getProjectTrackJump,
  listConfiguredPersonnelTrackSystems as listConfiguredFromStore,
} from './laborWarningConfig.js'

export { projectTree, getProjectLabel, getDefaultProjectId, getProjectTrackJump }

/** 人员轨迹：平台仅提供按项目跳转至自有系统，不做统一轨迹回放 */
export function listProjectTrackJumpConfigs() {
  return (projectTree[0]?.children || []).map((item) => {
    const jump = getProjectTrackJump(item.id)
    return {
      project_id: item.id,
      project_name: item.label.replace(/\(\d+\)$/, ''),
      ...jump,
    }
  })
}

/** 指挥部 · 人员轨迹系统：有 URL 即展示（含停用） */
export function listConfiguredPersonnelTrackSystems() {
  const nameMap = Object.fromEntries(
    (projectTree[0]?.children || []).map((item) => [
      item.id,
      String(item.label || '').replace(/\(\d+\)$/, ''),
    ]),
  )
  return listConfiguredFromStore()
    .map((row) => ({
      ...row,
      project_name: nameMap[row.project_id] || row.project_id,
    }))
    .sort((a, b) => String(a.project_name).localeCompare(String(b.project_name), 'zh-CN'))
}
