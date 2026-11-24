// 隐患抽检暂停展示；既有抽检、通知和全面复查记录继续保留。
export const SHOW_HAZARD_SAMPLING = false

export function isHazardSamplingIndicatorVisible(id) {
  return SHOW_HAZARD_SAMPLING || (id !== 'sampling_coop_supervisor' && id !== 'sampling_coop_construction')
}
