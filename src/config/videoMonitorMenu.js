import VideoPreviewView from '../views/videoMonitor/VideoPreviewView.vue'
import DeviceLedgerView from '../views/videoMonitor/DeviceLedgerView.vue'
import DeviceGroupManageView from '../views/videoMonitor/DeviceGroupManageView.vue'

/** @type {import('vue').Component} */
const videoMonitorItems = [
  {
    key: 'video-monitor-preview',
    name: 'VideoMonitorPreview',
    label: '视频预览',
    path: '/video-monitor/preview',
    description: '项目级视频预览：视频列表检索与多画面宫格预览。',
    component: VideoPreviewView,
  },
  {
    key: 'video-monitor-ledger',
    name: 'VideoMonitorLedger',
    label: '设备台账',
    path: '/video-monitor/device-ledger',
    description: '项目级设备台账：设备统计、检索筛选、接入与维护。',
    component: DeviceLedgerView,
  },
  {
    key: 'video-monitor-group',
    name: 'VideoMonitorGroup',
    label: '分组管理',
    path: '/video-monitor/group',
    description: '项目级设备分组：维护分组目录，并向分组添加/移除设备。',
    component: DeviceGroupManageView,
  },
]

export const videoMonitorMenuGroup = {
  key: 'video-monitor',
  label: '视频监控',
  icon: 'VideoCamera',
  children: videoMonitorItems.map(({ key, label, path, description }) => ({
    key,
    label,
    path,
    description,
  })),
}

export const videoMonitorRoutes = videoMonitorItems

export function getVideoMonitorItem(key) {
  return videoMonitorItems.find((item) => item.key === key) || null
}
