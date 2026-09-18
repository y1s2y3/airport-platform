/** APP 端功能菜单（角色授权 · APP功能） */
export const appMenu = [
  { key: 'app-workbench', label: '首页', icon: 'Monitor', levels: 'both' },
  {
    key: 'app-jg-app',
    label: '建管APP',
    icon: 'Cellphone',
    levels: 'project',
    children: [
      { key: 'app-jg-login', label: '登录', icon: 'Unlock', levels: 'project' },
      { key: 'app-jg-personal', label: '个人中心', icon: 'Notebook', levels: 'project' },
      { key: 'app-jg-biz', label: '业务功能', icon: 'SuitcaseLine', levels: 'project' },
      { key: 'app-jg-mine', label: '我的', icon: 'User', levels: 'project' },
      { key: 'app-jg-video', label: '视频中心', icon: 'VideoCamera', levels: 'project' },
    ],
  },
  {
    key: 'app-labor',
    label: '人员实名制管理',
    icon: 'User',
    levels: 'both',
    children: [
      { key: 'app-labor-dashboard', label: '人员实名制看板', icon: 'Compass', levels: 'both' },
      { key: 'app-labor-realname', label: '人员实名制', icon: 'Document', levels: 'both' },
      { key: 'app-labor-warning', label: '预警清单', icon: 'Bell', levels: 'both' },
      { key: 'app-labor-mobile-personal-center', label: '个人中心（移动端）', icon: 'Iphone', levels: 'both' },
    ],
  },
  {
    key: 'app-vehicle',
    label: '车辆管理',
    icon: 'Van',
    levels: 'both',
    children: [
      { key: 'app-vehicle-dashboard', label: '车辆管理看板', icon: 'DataAnalysis', levels: 'both' },
      { key: 'app-vehicle-access', label: '进出场记录', icon: 'Switch', levels: 'project' },
      { key: 'app-vehicle-warning', label: '预警清单', icon: 'Bell', levels: 'project' },
      // 轨迹/电子围栏不在 App 端强制提供；有对接时以 PC 监管端为准
    ],
  },
  {
    key: 'app-safety-inspection',
    label: '巡检管理',
    icon: 'View',
    levels: 'both',
    children: [
      { key: 'app-mobile-tasks', label: '巡检管理(移动端)', icon: 'Cellphone', levels: 'both' },
      { key: 'app-mobile-message-center', label: '消息中心(移动端)', icon: 'ChatLineRound', levels: 'both' },
      { key: 'app-mobile-rectify', label: '整改复查(移动端)', icon: 'RefreshRight', levels: 'project' },
    ],
  },
  {
    key: 'app-major-hazard-management',
    label: '危大工程管理',
    icon: 'Warning',
    levels: 'project',
    children: [
      { key: 'app-major-hazard-dictionary', label: '危大字典配置', icon: 'Notebook', levels: 'project' },
      { key: 'app-major-hazard-identification', label: '危大辨识', icon: 'DocumentChecked', levels: 'project' },
      { key: 'app-major-hazard-list', label: '危大清单', icon: 'Notebook', levels: 'project' },
      { key: 'app-major-hazard-calendar', label: '危大工程日历', icon: 'Calendar', levels: 'project' },
    ],
  },
  {
    key: 'app-video',
    label: '视频监控',
    icon: 'VideoCamera',
    levels: 'project',
    children: [
      { key: 'app-video-list', label: '视频预览', icon: 'VideoPlay', levels: 'project' },
      { key: 'app-video-device', label: '设备台账', icon: 'Files', levels: 'project' },
      { key: 'app-video-group', label: '分组管理', icon: 'Folder', levels: 'project' },
    ],
  },
  {
    key: 'app-coc',
    label: '调度后台管理',
    icon: 'Headset',
    levels: 'both',
    children: [
      { key: 'app-coc-daily-work', label: '每日施工作业', icon: 'Sunrise', levels: 'both' },
      { key: 'app-coc-notice', label: '任务单', icon: 'Tickets', levels: 'both' },
      { key: 'app-coc-penalty', label: '处罚单', icon: 'Tickets', levels: 'both' },
    ],
  },
  {
    key: 'app-mat-entry',
    label: '材料设备进场',
    icon: 'ShoppingBag',
    levels: 'project',
    children: [
      { key: 'app-mobile-mat-entry', label: '进场申请', icon: 'Iphone', path: '/mobile/mat/entry', levels: 'project' },
      { key: 'app-mobile-mat-exit', label: '退场登记', icon: 'Phone', path: '/mobile/mat/exit', levels: 'project' },
    ],
  },
  { key: 'app-profile', label: '个人中心', icon: 'Notebook', levels: 'both' },
]
