import { projectTree, getProjectLabel, getDefaultProjectId } from './laborRealName.js'
import { getProjectTrackJump } from './laborWarningConfig.js'

export { projectTree, getProjectLabel, getDefaultProjectId, getProjectTrackJump }

/** 人员轨迹：平台仅提供按项目跳转至自有系统，不做统一轨迹回放 */
export function listProjectTrackJumpConfigs() {
  return (projectTree[0]?.children || []).map((item) => {
    const jump = getProjectTrackJump(item.id)
    return {
      projectId: item.id,
      projectName: item.label.replace(/\(\d+\)$/, ''),
      ...jump,
    }
  })
}
