import { computed, unref, watch } from 'vue'
import { getHazardCategoryOptions, getHazardLevels, INSPECTION_CATEGORIES } from '../config/inspectionManagement'

import { getProjectRectifierLabel, getProjectReviewerLabel } from './useInspectionPersonConfig'
import { selectedProjectId } from './useCurrentProject'

/** 新表单单选，历史数组仅用于回显，不擅自选择复合分类中的第一项。 */
export function useInspectionCategoryForm(source) {
  const form = () => unref(source)
  const selectedCategory = computed({
    get: () => form().inspectionCategories?.length === 1 ? form().inspectionCategories[0] : '',
    set: (category) => {
      if (!INSPECTION_CATEGORIES.includes(category) || category === selectedCategory.value) return
      form().inspectionCategories = [category]
      if (form().checkConfig) form().checkConfig = []
      const categories = getHazardCategoryOptions(category).map(item => item.value)
      const levels = getHazardLevels(category)
      for (const hazard of form().hazardItems || []) {
        const project = form().projectId || form().project || selectedProjectId.value
        hazard.rectifyPerson = getProjectRectifierLabel(project, category)
        hazard.reviewPerson = getProjectReviewerLabel(project, category)
        if (!categories.includes(hazard.hazardCategory)) hazard.hazardCategory = ''
        if (!levels.includes(hazard.hazardLevel)) hazard.hazardLevel = ''
      }
    },
  })
  return { selectedCategory }
}

export function useInspectionHazardOptions(categorySource, hazardsSource) {
  const hazardCategoryOptions = computed(() => INSPECTION_CATEGORIES.includes(unref(categorySource)) ? getHazardCategoryOptions(unref(categorySource)) : [])
  const hazardLevelOptions = computed(() => INSPECTION_CATEGORIES.includes(unref(categorySource)) ? getHazardLevels(unref(categorySource)) : [])
  // 配置停用/调整后，未提交表单及时清理无效选项，历史已提交记录不受影响。
  watch(hazardCategoryOptions, options => {
    for (const hazard of unref(hazardsSource) || []) {
      if (hazard.hazardCategory && !options.some(item => item.value === hazard.hazardCategory)) hazard.hazardCategory = ''
    }
  })
  return { hazardCategoryOptions, hazardLevelOptions }
}
