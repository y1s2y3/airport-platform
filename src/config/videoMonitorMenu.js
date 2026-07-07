import AdminVideoMonitorList from '../coc/admin/AdminVideoMonitorList.vue'
import NvrDeviceManageView from '../views/videoMonitor/NvrDeviceManageView.vue'

/** @type {import('vue').Component} */
const videoMonitorItems = [
  {
    key: 'video-monitor-list',
    name: 'VideoMonitorList',
    label: '监控列表',
    path: '/video-monitor/list',
    description: '按通道查看各项目监控摄像头，支持编辑名称、位置、在线状态及排序。',
    component: AdminVideoMonitorList,
  },
  {
    key: 'video-monitor-device',
    name: 'VideoMonitorDevice',
    label: '设备管理',
    path: '/video-monitor/device',
    description: '管理 NVR 录像机设备：注册、绑定项目、通道配置及在线状态维护。',
    component: NvrDeviceManageView,
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
