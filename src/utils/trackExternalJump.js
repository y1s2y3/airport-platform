import { ElMessage } from 'element-plus'
import { getProjectTrackJump } from '../mock/laborPersonnelTrack'
import { getProjectVehicleTrackCapability } from '../mock/vehicleManagement'
import { getDefaultProjectId } from '../mock/laborRealName'
import { selectedProjectId } from '../composables/useCurrentProject'

/** 侧栏「人员轨迹 / 车辆轨迹监管」：点击后直接外链，不进入中间页 */
export const TRACK_EXTERNAL_MENU_KEYS = new Set(['labor-personnel-track', 'vehicle-track'])

function resolveProjectId() {
  const id = selectedProjectId.value
  if (!id || id === 'hq') return getDefaultProjectId()
  return id
}

/**
 * 打开指定 URL（指挥部轨迹系统列表「跳转」）
 * @param {string} url
 * @param {string} [systemName]
 */
export function openTrackExternalByUrl(url, systemName = '') {
  const href = String(url || '').trim()
  if (!href) {
    ElMessage.warning('未配置系统地址，无法跳转')
    return false
  }
  window.open(href, '_blank', 'noopener,noreferrer')
  ElMessage.success(`正在打开「${systemName || '轨迹系统'}」`)
  return true
}

/**
 * @param {'labor' | 'vehicle'} kind
 * @param {string} [projectId] 指定项目；缺省取当前选中项目
 * @param {{ requireEnabled?: boolean }} [opts] 列表跳转传 requireEnabled:false（有 URL 即可）
 * @returns {boolean} 是否已打开外链
 */
export function openTrackExternalByKind(kind, projectId, opts = {}) {
  const requireEnabled = opts.requireEnabled !== false
  const pid = projectId || resolveProjectId()
  const cfg =
    kind === 'vehicle'
      ? getProjectVehicleTrackCapability(pid)
      : getProjectTrackJump(pid)

  const hasUrl = Boolean(String(cfg?.url || '').trim())
  const ok = requireEnabled ? Boolean(cfg?.enabled && hasUrl) : hasUrl

  if (!ok) {
    ElMessage.warning(
      kind === 'vehicle'
        ? '当前项目未配置车辆定位系统跳转地址，请联系指挥部在「车辆轨迹配置」中维护'
        : '当前项目未配置轨迹系统跳转地址，请联系指挥部在「实名制配置」中维护',
    )
    return false
  }

  return openTrackExternalByUrl(
    cfg.url,
    cfg.systemName || (kind === 'vehicle' ? '项目车辆定位系统' : '项目轨迹系统'),
  )
}

export function openTrackExternalByMenuKey(menuKey) {
  if (menuKey === 'vehicle-track') return openTrackExternalByKind('vehicle')
  if (menuKey === 'labor-personnel-track') return openTrackExternalByKind('labor')
  return false
}
