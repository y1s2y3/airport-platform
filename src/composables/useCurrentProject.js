import { ref, computed, watch } from 'vue'
import { DEFAULT_PROJECT_ID, COC_PROJECT_OPTIONS, HQ_PROJECT_OPTION } from '../config/projectOptions'
import { getProjectLabel as getLaborProjectLabel, getDefaultProjectId } from '../mock/laborRealName'

/** 劳务/实名制模块已有 mock 数据的项目 ID */
const LABOR_PROJECT_IDS = ['p-000', 'p-001', 'p-003', 'p-004', 'p-005']

export const selectedProjectId = ref(DEFAULT_PROJECT_ID)

export function resolveLaborProjectId(projectId = selectedProjectId.value) {
  if (projectId && projectId !== HQ_PROJECT_OPTION.id && LABOR_PROJECT_IDS.includes(projectId)) {
    return projectId
  }
  return 'p-000'
}

export function getHeaderProjectLabel(projectId = selectedProjectId.value) {
  if (projectId === HQ_PROJECT_OPTION.id) return HQ_PROJECT_OPTION.label
  const found = COC_PROJECT_OPTIONS.find((item) => item.id === projectId)
  return found?.label || getLaborProjectLabel(resolveLaborProjectId(projectId))
}

export function useCurrentProject() {
  const laborProjectId = computed(() => resolveLaborProjectId(selectedProjectId.value))
  const projectLabel = computed(() => getLaborProjectLabel(laborProjectId.value))
  const headerProjectLabel = computed(() => getHeaderProjectLabel(selectedProjectId.value))
  const isHqSelected = computed(() => selectedProjectId.value === HQ_PROJECT_OPTION.id)

  return {
    selectedProjectId,
    laborProjectId,
    projectLabel,
    headerProjectLabel,
    isHqSelected,
  }
}

/** 指挥部层级用页面内项目树；项目层级用顶部项目选择器 */
export function useLaborProjectScope() {
  const { laborProjectId, projectLabel, isHqSelected } = useCurrentProject()
  const treeProjectId = ref(getDefaultProjectId())

  const scopeProjectId = computed(() =>
    isHqSelected.value ? treeProjectId.value : laborProjectId.value,
  )
  const scopeProjectLabel = computed(() =>
    isHqSelected.value ? getLaborProjectLabel(treeProjectId.value) : projectLabel.value,
  )

  watch(laborProjectId, (id) => {
    if (!isHqSelected.value) treeProjectId.value = id
  })

  function onTreeNodeClick(data) {
    if (data.id === 'hq') return
    treeProjectId.value = data.id
  }

  return {
    isHqSelected,
    treeProjectId,
    scopeProjectId,
    scopeProjectLabel,
    onTreeNodeClick,
  }
}
