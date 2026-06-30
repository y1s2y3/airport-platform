import { HQ_SELECTION_ID, PROJECT_NAMES, PROJECT_SHORT_NAMES } from '../coc/mock/data.js'

export const HQ_PROJECT_OPTION = {
  id: HQ_SELECTION_ID,
  label: '工程指挥部',
}

/** 与 COC 项目列表一致：工程指挥部 + 各项目（简称展示，全称为副标题） */
export const COC_PROJECT_OPTIONS = PROJECT_NAMES.map((name, i) => ({
  id: `p-${String(i).padStart(3, '0')}`,
  label: PROJECT_SHORT_NAMES[i] || name,
  fullName: name,
}))

export const DEFAULT_PROJECT_ID = HQ_SELECTION_ID
