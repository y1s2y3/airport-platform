import { HQ_SELECTION_ID } from './projectCatalog.js'
import { buildCocProjectOptions } from '../mock/projectBasicInfo.js'

export { HQ_SELECTION_ID }

export const HQ_PROJECT_OPTION = {
  id: HQ_SELECTION_ID,
  label: '工程指挥部',
}

/** 与项目信息管理台账一致（启动时快照；顶栏请用 buildCocProjectOptions 保持 hidden 联动） */
export const COC_PROJECT_OPTIONS = buildCocProjectOptions()

/** 与 COC 项目列表一致：工程指挥部 + 各项目（简称展示，全称为副标题） */
export const DEFAULT_PROJECT_ID = HQ_SELECTION_ID

export { buildCocProjectOptions }
