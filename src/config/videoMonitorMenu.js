import VideoMonitorStatsView from '../views/videoMonitor/VideoMonitorStatsView.vue'
import VideoPreviewView from '../views/videoMonitor/VideoPreviewView.vue'
import DeviceLedgerView from '../views/videoMonitor/DeviceLedgerView.vue'
import DeviceGroupManageView from '../views/videoMonitor/DeviceGroupManageView.vue'
import OfflineNotifyConfigView from '../views/videoMonitor/OfflineNotifyConfigView.vue'

/** @type {import('vue').Component} */
const videoMonitorItems = [
  {
    key: 'video-monitor-stats',
    name: 'VideoMonitorStats',
    label: '视频监控统计',
    path: '/video-monitor/stats',
    description:
      '指挥部级视频监控统计：按项目汇总摄像头总数、在线/离线数量、超15日离线数量及离线预警未处置数量。',
    component: VideoMonitorStatsView,
  },
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
  {
    key: 'video-monitor-offline-notify',
    name: 'VideoMonitorOfflineNotify',
    label: '离线通知配置',
    path: '/video-monitor/offline-notify',
    description:
      '项目级视频离线分级通知：按离线天数配置通知岗位与通知人员，默认一天/一周/一月，支持增删改。',
    component: OfflineNotifyConfigView,
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
