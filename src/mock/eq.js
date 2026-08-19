/**
 * 设备进场 — V2.0 已合并至 mat.js，本文件仅作兼容转调
 * 路由保留，侧栏已下线；个人中心 eq_entry 待办仍可通过本模块审批
 */
import {
  ENTRY_TYPE,
  ENTRY_TYPE_LABEL,
  STATUS_LABEL,
  UNPACK_FIXED,
  createDefaultUnpackItems,
  statusTagType,
  isReviewingStatus,
  listEquipmentEntries as listEntries,
  getEquipmentEntryDetail as getEntryDetail,
  listLedger,
  getDashboard as getMatDashboard,
  buildHqDashboardByProject as buildMatHqDashboardByProject,
  listApprovedSamples,
  getApprovedSample,
  searchEntryBrands as listApprovedBrands,
  submitEntry,
  withdrawEntry,
  getRejectedMatAppsForCopy as getRejectedEntryForReopen,
  buildCopyPayloadFromRejectedMat,
  resubmitEntry,
  supervisorApproveEquipmentEntry as supervisorApproveEntry,
  listSelectableForInspect,
} from './mat.js'

/** 设备看板仅统计 entry_type=equipment */
export function getDashboard(projectId) {
  return getMatDashboard(projectId, { entry_type: 'equipment' })
}

/** 指挥部设备看板：对齐项目级字段（进场批次 / 审核中 / 已通过） */
export function buildHqDashboardByProject() {
  return buildMatHqDashboardByProject({ entry_type: 'equipment' }).map(
    ({ exited_count: _exited, material_exited_count: _mEx, equipment_exited_count: _eEx, ...row }) => row,
  )
}

export {
  ENTRY_TYPE,
  ENTRY_TYPE_LABEL,
  STATUS_LABEL,
  UNPACK_FIXED,
  createDefaultUnpackItems,
  statusTagType,
  isReviewingStatus,
  listEntries,
  getEntryDetail,
  listLedger,
  listApprovedSamples,
  getApprovedSample,
  listApprovedBrands,
  submitEntry,
  withdrawEntry,
  getRejectedEntryForReopen,
  buildCopyPayloadFromRejectedMat,
  resubmitEntry,
  supervisorApproveEntry,
  listSelectableForInspect,
}

/** 设备提交：强制 entry_type=equipment */
export function submitEquipmentEntry(payload) {
  return submitEntry({ ...payload, entry_type: 'equipment' })
}
