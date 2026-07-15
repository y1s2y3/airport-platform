import AdminScreenshotList from '../coc/admin/AdminScreenshotList.vue'
import AdminDailyWorkEntry from '../coc/admin/AdminDailyWorkEntry.vue'
import AdminDispatchNoticeList from '../coc/admin/AdminDispatchNoticeList.vue'
import AdminDispatchReminderList from '../coc/admin/AdminDispatchReminderList.vue'
import AdminDispatchPenaltyList from '../coc/admin/AdminDispatchPenaltyList.vue'
import AdminDispatchMeetingList from '../coc/admin/AdminDispatchMeetingList.vue'
import AdminDispatchRedBlackList from '../coc/admin/AdminDispatchRedBlackList.vue'
import PatrolDeviceManageView from '../views/cocAdmin/PatrolDeviceManageView.vue'
import SmartHelmetManageView from '../views/cocAdmin/SmartHelmetManageView.vue'
import SupervisionMeetingMinutesView from '../views/cocAdmin/SupervisionMeetingMinutesView.vue'

/** @type {import('vue').Component} */
const cocAdminItems = [
  {
    key: 'coc-admin-screenshot',
    name: 'CocAdminScreenshot',
    label: '问题截图',
    path: '/coc-admin/screenshot',
    roles: ['COC调度室'],
    description: '保存问题截图及相关字段。',
    component: AdminScreenshotList,
    hiddenInMenu: true,
  },
  {
    key: 'coc-admin-daily-work',
    name: 'CocAdminDailyWork',
    label: '每日施工作业',
    path: '/coc-admin/daily-work',
    roles: ['COC调度室', '项目经理', '施工'],
    description: '',
    component: AdminDailyWorkEntry,
  },
  {
    key: 'coc-admin-notice',
    name: 'CocAdminNotice',
    label: '任务单',
    path: '/coc-admin/notice',
    roles: ['安质部', '项目经理', '施工'],
    description:
      '管理远程调度产生的任务单：创建、下发、签收、整改反馈与闭环台账，支持从截图/会议一键生成。',
    component: AdminDispatchNoticeList,
  },
  {
    key: 'coc-admin-reminder',
    name: 'CocAdminReminder',
    label: '提示函',
    path: '/coc-admin/reminder',
    roles: ['安质部', '项目经理', '施工'],
    description:
      '管理远程调度产生的提示函：创建、下发、签收与闭环，支持从截图/调度会一键生成。',
    component: AdminDispatchReminderList,
  },
  {
    key: 'coc-admin-penalty',
    name: 'CocAdminPenalty',
    label: '处罚单',
    path: '/coc-admin/penalty',
    roles: ['安质部', '项目经理', '施工'],
    description:
      '管理处罚单全流程：开具、申诉、复核、缴纳凭证上传与归档；支持与红黑榜、隐患库联动勾选。',
    component: AdminDispatchPenaltyList,
  },
  {
    key: 'coc-admin-meeting',
    name: 'CocAdminMeeting',
    label: '会议记录',
    path: '/coc-admin/meeting',
    roles: ['安质部', '项目经理', '施工'],
    description:
      '记录调度会议/监理例会纪要，支持AI语音转写、安全质量内容自动摘取及与项目关联检索。',
    component: AdminDispatchMeetingList,
    hiddenInMenu: true,
  },
  {
    key: 'coc-admin-redblack',
    name: 'CocAdminRedBlack',
    label: '黑红榜单',
    path: '/coc-admin/red-black',
    roles: ['安质部', '项目经理', '施工'],
    description:
      '维护项目红榜/黑榜展示，支持从隐患库、处罚单直接勾选入榜，按期（如 2026年第6期）汇总展示与历史追溯。',
    component: AdminDispatchRedBlackList,
  },
  {
    key: 'coc-admin-patrol-device',
    name: 'CocAdminPatrolDevice',
    label: '巡检仪管理',
    path: '/coc-admin/patrol-device',
    roles: ['COC调度室'],
    description:
      '管理巡检仪设备注册、绑定项目及项目下人员；在线状态由设备自动上报。',
    component: PatrolDeviceManageView,
  },
  {
    key: 'coc-admin-smart-helmet',
    name: 'CocAdminSmartHelmet',
    label: '智能安全帽管理',
    path: '/coc-admin/smart-helmet',
    roles: ['COC调度室'],
    description:
      '管理智能安全帽设备台账、绑定人员、在线/定位状态，支撑远程调度与现场抽检。',
    component: SmartHelmetManageView,
  },
  {
    key: 'coc-admin-supervision-meeting',
    name: 'CocAdminSupervisionMeeting',
    label: '监理会议管理',
    path: '/coc-admin/supervision-meeting',
    roles: ['COC调度室', '监理', '施工'],
    description:
      '项目层级按模版上传监理例会纪要并解析隐患；施工方提交整改、监理验收；企业级只读查看。',
    component: SupervisionMeetingMinutesView,
  },
]

export const cocAdminMenuGroup = {
  key: 'coc-admin',
  label: 'COC后台管理',
  icon: 'Connection',
  children: cocAdminItems
    .filter((item) => !item.hiddenInMenu)
    .map(({ key, label, path, description }) => ({
      key,
      label,
      path,
      description,
    })),
}

export const cocAdminRoutes = cocAdminItems

export function getCocAdminItem(key) {
  return cocAdminItems.find((item) => item.key === key) || null
}
