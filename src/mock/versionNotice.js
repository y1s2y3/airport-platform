/**
 * 版本通知（指挥部 · 系统管理）
 *
 * 业务口径：
 * - 指挥部统一登记各机型（运行端）已发布的版本，供两级查看最新版本与强制更新要求
 * - 机型候选值（用户 2026-10-14 确认）：安卓 / IOS / 融合通讯
 * - 是否强制更新：是＝该机型低于此版本必须升级后方可继续使用；否＝可稍后自行升级
 * - 下载地址为演示占位地址，不请求真实下载服务
 */
import { ref } from 'vue'

/** 机型（运行端）候选值 */
export const VERSION_DEVICE_OPTIONS = ['安卓', 'IOS', '融合通讯']

/** 是否强制更新 */
export const VERSION_FORCE_UPDATE_OPTIONS = [
  { label: '是', value: true },
  { label: '否', value: false },
]

export function forceUpdateLabel(value) {
  return value ? '是' : '否'
}

export function forceUpdateTagType(value) {
  return value ? 'danger' : 'info'
}

const initialVersionNotices = [
  {
    id: 'vn-001',
    version_no: 'v2.11.1.26',
    device_model: '安卓',
    download_url: '/download/建管APP-v2.11.1.26.apk',
    force_update: true,
    release_time: '2026-10-14',
  },
  {
    id: 'vn-002',
    version_no: 'v2.11.1.25',
    device_model: '安卓',
    download_url: '/download/建管APP-v2.11.1.25.apk',
    force_update: false,
    release_time: '2026-10-13',
  },
  {
    id: 'vn-003',
    version_no: 'v2.11.1.25',
    device_model: 'IOS',
    download_url: 'https://apps.apple.com/app/id0000000001',
    force_update: false,
    release_time: '2026-10-13',
  },
  {
    id: 'vn-004',
    version_no: 'v2.11.1.25',
    device_model: '融合通讯',
    download_url: '/download/融合通讯终端-v2.11.1.25.apk',
    force_update: false,
    release_time: '2026-10-13',
  },
  {
    id: 'vn-005',
    version_no: 'v2.11.1.21',
    device_model: '安卓',
    download_url: '/download/建管APP-v2.11.1.21.apk',
    force_update: false,
    release_time: '2026-10-13',
  },
  {
    id: 'vn-006',
    version_no: 'v2.11.1.20',
    device_model: 'IOS',
    download_url: '',
    force_update: false,
    release_time: '2026-10-12',
  },
  {
    id: 'vn-007',
    version_no: 'v2.11.1.20',
    device_model: '融合通讯',
    download_url: '/download/融合通讯终端-v2.11.1.20.apk',
    force_update: false,
    release_time: '2026-10-12',
  },
  {
    id: 'vn-008',
    version_no: 'v2.11.1.12',
    device_model: '安卓',
    download_url: '/download/建管APP-v2.11.1.12.apk',
    force_update: true,
    release_time: '2026-10-09',
  },
]

export const versionNoticeList = ref(initialVersionNotices.map((item) => ({ ...item })))

let versionIdSeq = initialVersionNotices.length + 100

export function listVersionNotices() {
  return versionNoticeList.value
}

export function getVersionNotice(id) {
  return versionNoticeList.value.find((item) => item.id === id) || null
}

export function createEmptyVersionNotice() {
  return {
    version_no: '',
    device_model: '',
    download_url: '',
    force_update: false,
    release_time: '',
  }
}

export function cloneVersionNotice(record) {
  return { ...record }
}

export function saveVersionNotice(payload, id) {
  const data = {
    version_no: String(payload.version_no || '').trim(),
    device_model: payload.device_model || '',
    download_url: String(payload.download_url || '').trim(),
    force_update: Boolean(payload.force_update),
    release_time: payload.release_time || '',
  }
  if (id) {
    const idx = versionNoticeList.value.findIndex((item) => item.id === id)
    if (idx < 0) return { ok: false, msg: '该版本记录不存在' }
    versionNoticeList.value[idx] = { ...versionNoticeList.value[idx], ...data, id }
    return { ok: true, data: versionNoticeList.value[idx] }
  }
  const created = { ...data, id: `vn-${++versionIdSeq}` }
  versionNoticeList.value.unshift(created)
  return { ok: true, data: created }
}

export function removeVersionNotice(id) {
  const idx = versionNoticeList.value.findIndex((item) => item.id === id)
  if (idx < 0) return { ok: false, msg: '该版本记录不存在' }
  versionNoticeList.value.splice(idx, 1)
  return { ok: true }
}
