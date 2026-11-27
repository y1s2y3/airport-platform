import { computed, reactive, ref, watch } from 'vue'
import { getHazardCategoryFilterOptions, getHazardLevels, hasInspectionCategory, matchesHazardCategoryFilter } from '../config/inspectionManagement'
import { isInspectionRectificationOverdue, isWithinInspectionDateRange } from '../utils/inspectionLedgerDates'
import { useFilterVisibility } from './useFilterVisibility'

export const isOverdue = isInspectionRectificationOverdue

/** 列表只显示姓名，岗位放在 title 提示里，避免窄列逐字换行。 */
export function personShort(value) {
  const text = String(value || '').trim()
  if (!text) return '--'
  return text.replace(/[（(].*?[)）]/g, '').trim() || text
}

export const HAZARD_FILTER_FIELDS = [
  { key: 'keyword', label: '搜索框' },
  { key: 'category', label: '巡检分类' },
  { key: 'hazardCategory', label: '隐患类别' },
  { key: 'status', label: '整改状态' },
  { key: 'hazardLevel', label: '隐患等级' },
  { key: 'overdue', label: '是否逾期' },
  { key: 'inspectors', label: '登记人' },
  { key: 'rectifiers', label: '整改人' },
  { key: 'reviewers', label: '复查人' },
  { key: 'issueRange', label: '整改单下发日期' },
]

/** 关键词默认搜索单号、项目与隐患说明；大屏明细没有单号列时可只搜可见内容。 */
const DEFAULT_KEYWORD_FIELDS = ['rectifyNo', 'taskNo', 'project', 'desc']

export function useInspectionHazardLedger(scopedRows, scope, options = {}) {
  const keywordFields = options.keywordFields || DEFAULT_KEYWORD_FIELDS
  const createFilters = () => ({ keyword: '', category: '', hazardCategory: '', hazardLevel: '', status: '', overdue: '', inspectors: [], rectifiers: [], reviewers: [], issueRange: null })
  const nodeFilter = ref('')
  const filterForm = reactive(createFilters())
  const personOptionsOf = (field) => [...new Set(scopedRows.value.map(row => row[field]).filter(Boolean))].sort((a, b) => personShort(a).localeCompare(personShort(b), 'zh-CN'))
  const inspectors = computed(() => personOptionsOf('inspector'))
  const rectifiers = computed(() => personOptionsOf('rectifier'))
  const reviewers = computed(() => personOptionsOf('reviewer'))
  watch(scope, handleReset)

  const hazardCategoryOptions = computed(() => getHazardCategoryFilterOptions(filterForm.category))
  const hazardLevelOptions = computed(() => {
    const levels = getHazardLevels(filterForm.category)
    const legacyLevels = scopedRows.value
      .filter(row => row.legacyCocInspection && (!filterForm.category || row.inspectionCategory === filterForm.category))
      .map(row => row.hazardLevel)
      .filter(Boolean)
    return [...new Set([...levels, ...legacyLevels])]
  })
  watch(() => filterForm.category, () => { filterForm.hazardCategory = ''; filterForm.hazardLevel = '' })

  const { visible: hazardFilterVisible, isVisible: isHazardFilterVisible, clearHidden: clearHiddenHazardFilters } = useFilterVisibility('inspection-hazard-filters', HAZARD_FILTER_FIELDS)
  function applyHazardFilterVisibility() {
    clearHiddenHazardFilters(filterForm, { inspectors: [], rectifiers: [], reviewers: [], issueRange: null })
  }

  function handleReset() {
    Object.assign(filterForm, createFilters())
    nodeFilter.value = ''
  }

  const filteredData = computed(() => {
    return scopedRows.value.filter(d => {
      if (filterForm.inspectors.length && !filterForm.inspectors.includes(d.inspector)) return false
      if (filterForm.rectifiers.length && !filterForm.rectifiers.includes(d.rectifier)) return false
      if (filterForm.reviewers.length && !filterForm.reviewers.includes(d.reviewer)) return false
      if (!isWithinInspectionDateRange(d.issueDate, filterForm.issueRange)) return false
      if (filterForm.category && !hasInspectionCategory(d.inspectionCategories || d.inspectionCategory, filterForm.category)) return false
      if (!matchesHazardCategoryFilter(d, filterForm.hazardCategory)) return false
      if (filterForm.hazardLevel && d.hazardLevel !== filterForm.hazardLevel) return false
      if (filterForm.status && d.status !== filterForm.status) return false
      if (nodeFilter.value && d.currentNode !== nodeFilter.value) return false
      if (filterForm.overdue && isOverdue(d) !== (filterForm.overdue === '是')) return false
      if (filterForm.keyword) {
        const kw = filterForm.keyword
        if (!keywordFields.some(field => String(d[field] || '').includes(kw))) return false
      }
      return true
    })
  })

  return {
    filterForm, nodeFilter, hazardCategoryOptions, hazardLevelOptions,
    inspectors, rectifiers, reviewers, filteredData, handleReset,
    hazardFilterVisible, isHazardFilterVisible, applyHazardFilterVisibility,
  }
}
