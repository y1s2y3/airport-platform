import { ElMessage } from 'element-plus'
import { useRouter } from 'vue-router'
import { useCurrentProject } from './useCurrentProject'

/**
 * 项目级用户只能访问当前顶栏选中项目的数据。
 * @param {{ field?: string, redirectName?: string, warningMessage?: string }} options
 */
export function useProjectScopeGuard(options = {}) {
  const {
    field = 'id',
    redirectName = 'ProjectBasicInfo',
    warningMessage = '无权查看或编辑其他项目',
  } = options
  const router = useRouter()
  const { isHqSelected, laborProjectId } = useCurrentProject()

  function assertProjectScope(source) {
    if (isHqSelected.value) return true
    const value = source?.[field]
    if (value && value === laborProjectId.value) return true
    ElMessage.warning(warningMessage)
    router.replace({ name: redirectName })
    return false
  }

  function canAccessProjectId(targetId) {
    if (isHqSelected.value) return true
    return targetId === laborProjectId.value
  }

  return { assertProjectScope, canAccessProjectId, isHqSelected, laborProjectId }
}
