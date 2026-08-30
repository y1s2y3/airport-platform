/** APP 端功能菜单（角色授权 · APP功能） */
export const appMenu = [
  { key: 'app-workbench', label: '首页', levels: 'both' },
  {
    key: 'app-jg-app',
    label: '建管APP',
    levels: 'project',
    children: [
      { key: 'app-jg-login', label: '登录', levels: 'project' },
      { key: 'app-jg-personal', label: '个人中心', levels: 'project' },
      { key: 'app-jg-biz', label: '业务功能', levels: 'project' },
      { key: 'app-jg-mine', label: '我的', levels: 'project' },
      { key: 'app-jg-video', label: '视频中心', levels: 'project' },
    ],
  },
  {
    key: 'app-labor',
    label: '人员实名制管理',
    levels: 'both',
    children: [
      { key: 'app-labor-dashboard', label: '人员实名制看板', levels: 'both' },
      { key: 'app-labor-realname', label: '人员实名制', levels: 'both' },
      { key: 'app-labor-warning', label: '预警清单', levels: 'both' },
      { key: 'app-labor-mobile-personal-center', label: '个人中心（移动端）', levels: 'both' },
    ],
  },
  {
    key: 'app-vehicle',
    label: '车辆管理',
    levels: 'both',
    children: [
      { key: 'app-vehicle-dashboard', label: '车辆管理看板', levels: 'both' },
      { key: 'app-vehicle-access', label: '进出场记录', levels: 'project' },
      { key: 'app-vehicle-warning', label: '预警清单', levels: 'project' },
      // 轨迹/电子围栏不在 App 端强制提供；有对接时以 PC 监管端为准
    ],
  },
  {
    key: 'app-safety-inspection',
    label: '巡检管理',
    levels: 'both',
    children: [
      { key: 'app-mobile-tasks', label: '巡检管理(移动端)', levels: 'both' },
      { key: 'app-mobile-message-center', label: '消息中心(移动端)', levels: 'both' },
      { key: 'app-mobile-rectify', label: '整改复查(移动端)', levels: 'project' },
    ],
  },
  {
    key: 'app-video',
    label: '视频监控',
    levels: 'project',
    children: [
      { key: 'app-video-list', label: '视频预览', levels: 'project' },
      { key: 'app-video-device', label: '设备台账', levels: 'project' },
      { key: 'app-video-group', label: '分组管理', levels: 'project' },
    ],
  },
  {
    key: 'app-coc',
    label: '调度后台管理',
    levels: 'both',
    children: [
      { key: 'app-coc-daily-work', label: '每日施工作业', levels: 'both' },
      { key: 'app-coc-notice', label: '任务单', levels: 'both' },
      { key: 'app-coc-penalty', label: '处罚单', levels: 'both' },
    ],
  },
  {
    key: 'app-mat-entry',
    label: '材料设备进场',
    levels: 'project',
    children: [
      { key: 'app-mobile-mat-entry', label: '进场申请', path: '/mobile/mat/entry', levels: 'project' },
      { key: 'app-mobile-mat-exit', label: '退场登记', path: '/mobile/mat/exit', levels: 'project' },
    ],
  },
  { key: 'app-profile', label: '个人中心', levels: 'both' },
]
