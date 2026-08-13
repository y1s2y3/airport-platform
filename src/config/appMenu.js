/** APP 端功能菜单（角色授权 · APP功能） */
export const appMenu = [
  { key: 'app-workbench', label: '首页' },
  {
    key: 'app-labor',
    label: '人员实名制管理',
    children: [
      { key: 'app-labor-dashboard', label: '人员实名制看板' },
      { key: 'app-labor-realname', label: '人员实名制' },
      { key: 'app-labor-warning', label: '预警清单' },
    ],
  },
  {
    key: 'app-vehicle',
    label: '车辆管理',
    children: [
      { key: 'app-vehicle-dashboard', label: '车辆管理看板' },
      { key: 'app-vehicle-access', label: '进出场记录' },
      { key: 'app-vehicle-warning', label: '预警清单' },
      // 轨迹/电子围栏不在 App 端强制提供；有对接时以 PC 监管端为准
    ],
  },
  {
    key: 'app-safety-inspection',
    label: '巡检管理',
    children: [
      { key: 'app-mobile-tasks', label: '巡检管理(移动端)' },
      { key: 'app-mobile-message-center', label: '消息中心(移动端)' },
      { key: 'app-mobile-rectify', label: '整改复查(移动端)' },
    ],
  },
  {
    key: 'app-video',
    label: '视频监控',
    children: [
      { key: 'app-video-list', label: '视频预览' },
      { key: 'app-video-device', label: '设备台账' },
      { key: 'app-video-group', label: '分组管理' },
    ],
  },
  {
    key: 'app-coc',
    label: '调度后台管理',
    children: [
      { key: 'app-coc-daily-work', label: '每日施工作业' },
      { key: 'app-coc-notice', label: '任务单' },
      { key: 'app-coc-penalty', label: '处罚单' },
    ],
  },
  { key: 'app-profile', label: '个人中心' },
]
