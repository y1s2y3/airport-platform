import { HQ_SELECTION_ID, COC_PROJECT_OPTIONS } from './projectCatalog.js'

export { COC_PROJECT_OPTIONS, HQ_SELECTION_ID }

export const HQ_PROJECT_OPTION = {
  id: HQ_SELECTION_ID,
  label: '工程指挥部',
}

/** 与 COC 项目列表一致：工程指挥部 + 各项目（简称展示，全称为副标题） */
export const DEFAULT_PROJECT_ID = HQ_SELECTION_ID
