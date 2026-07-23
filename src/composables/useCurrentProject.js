import { ref, computed, watch } from 'vue'
import { DEFAULT_PROJECT_ID, COC_PROJECT_OPTIONS, HQ_PROJECT_OPTION } from '../config/projectOptions'
import { getProjectLabel as getLaborProjectLabel, getDefaultProjectId } from '../mock/laborRealName'

/** 劳务/实名制模块已有 mock 明细数据的项目 ID */
export const LABOR_MOCK_PROJECT_IDS = ['p-000', 'p-001', 'p-003', 'p-004', 'p-005']

export const selectedProjectId = ref(DEFAULT_PROJECT_ID)

export function hasLaborMockData(projectId = selectedProjectId.value) {
  return !!projectId && projectId !== HQ_PROJECT_OPTION.id && LABOR_MOCK_PROJECT_IDS.includes(projectId)
}

/**
 * 解析劳务模块当前项目 ID。
 * 不再静默回落到 p-000：无 mock 的项目返回原 ID，由页面空态处理。
 */
export function resolveLaborProjectId(projectId = selectedProjectId.value) {
  if (!projectId || projectId === HQ_PROJECT_OPTION.id) return ''
  return projectId
}

export function getHeaderProjectLabel(projectId = selectedProjectId.value) {
  if (projectId === HQ_PROJECT_OPTION.id) return HQ_PROJECT_OPTION.label
  const found = COC_PROJECT_OPTIONS.find((item) => item.id === projectId)
  if (found?.label) return found.label
  return getLaborProjectLabel(projectId) || projectId || ''
}

export function useCurrentProject() {
  const laborProjectId = computed(() => resolveLaborProjectId(selectedProjectId.value))
  const projectLabel = computed(() => {
    const id = laborProjectId.value
    if (!id) return ''
    return getLaborProjectLabel(id) || getHeaderProjectLabel(id)
  })
  const headerProjectLabel = computed(() => getHeaderProjectLabel(selectedProjectId.value))
  const isHqSelected = computed(() => selectedProjectId.value === HQ_PROJECT_OPTION.id)
  const laborHasMock = computed(() => hasLaborMockData(laborProjectId.value))

  return {
    selectedProjectId,
    laborProjectId,
    projectLabel,
    headerProjectLabel,
    isHqSelected,
    laborHasMock,
  }
}

/** 指挥部层级用页面内项目树；项目层级用顶部项目选择器（劳务模块） */
export function useLaborProjectScope() {
  const { laborProjectId, projectLabel, isHqSelected } = useCurrentProject()
  const treeProjectId = ref(getDefaultProjectId())

  const scopeProjectId = computed(() =>
    isHqSelected.value ? treeProjectId.value : laborProjectId.value,
  )
  const scopeProjectLabel = computed(() => {
    const id = scopeProjectId.value
    if (!id) return ''
    return getLaborProjectLabel(id) || getHeaderProjectLabel(id)
  })
  const scopeHasMock = computed(() => hasLaborMockData(scopeProjectId.value))

  watch(laborProjectId, (id) => {
    if (!isHqSelected.value && id) treeProjectId.value = id
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
    scopeHasMock,
    onTreeNodeClick,
  }
}

/**
 * 质量验评 scope：直接使用顶栏真实项目 ID，不走劳务白名单 remap。
 */
export function useQmProjectScope() {
  const { selectedProjectId: sel, isHqSelected, headerProjectLabel } = useCurrentProject()
  const treeProjectId = ref(DEFAULT_PROJECT_ID)

  const scopeProjectId = computed(() => {
    if (isHqSelected.value) return treeProjectId.value
    if (!sel.value || sel.value === HQ_PROJECT_OPTION.id) return DEFAULT_PROJECT_ID
    return sel.value
  })
  const scopeProjectLabel = computed(() => {
    if (isHqSelected.value) {
      const found = COC_PROJECT_OPTIONS.find((p) => p.id === treeProjectId.value)
      return found?.label || getHeaderProjectLabel(treeProjectId.value)
    }
    return headerProjectLabel.value
  })

  watch(sel, (id) => {
    if (!isHqSelected.value && id && id !== HQ_PROJECT_OPTION.id) {
      treeProjectId.value = id
    }
  })

  function onTreeNodeClick(data) {
    if (!data?.id || data.id === 'hq') return
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

/**
 * 车辆模块 scope：顶栏真实项目 ID，不走劳务 remap。
 */
export function useVehicleProjectScope() {
  const { selectedProjectId: sel, isHqSelected, headerProjectLabel } = useCurrentProject()
  const treeProjectId = ref(DEFAULT_PROJECT_ID)

  const scopeProjectId = computed(() => {
    if (isHqSelected.value) return treeProjectId.value
    if (!sel.value || sel.value === HQ_PROJECT_OPTION.id) return DEFAULT_PROJECT_ID
    return sel.value
  })
  const scopeProjectLabel = computed(() => {
    if (isHqSelected.value) {
      const found = COC_PROJECT_OPTIONS.find((p) => p.id === treeProjectId.value)
      return found?.label || getHeaderProjectLabel(treeProjectId.value)
    }
    return headerProjectLabel.value
  })

  watch(sel, (id) => {
    if (!isHqSelected.value && id && id !== HQ_PROJECT_OPTION.id) {
      treeProjectId.value = id
    }
  })

  function onTreeNodeClick(data) {
    if (!data?.id || data.id === 'hq') return
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
