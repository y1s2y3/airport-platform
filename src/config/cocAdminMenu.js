import AdminScreenshotList from '../coc/admin/AdminScreenshotList.vue'
import AdminDispatchNoticeList from '../coc/admin/AdminDispatchNoticeList.vue'
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
  },
  {
    key: 'coc-admin-notice',
    name: 'CocAdminNotice',
    label: '告知单',
    path: '/coc-admin/notice',
    roles: ['安质部', '项目经理', '施工'],
    description:
      '管理远程调度产生的告知单：创建、下发、签收、整改反馈与闭环台账，支持从截图/会议一键生成。',
    component: AdminDispatchNoticeList,
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
      '管理巡检仪设备注册、绑定项目/人员、在线状态及与调度对讲的关联配置。',
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
    label: '监理会议纪要',
    path: '/coc-admin/supervision-meeting',
    roles: ['COC调度室'],
    description: '上传监理会议纪要，根据标题识别归档安全质量隐患数据。',
    component: SupervisionMeetingMinutesView,
  },
]

export const cocAdminMenuGroup = {
  key: 'coc-admin',
  label: 'COC后台管理',
  icon: 'Connection',
  children: cocAdminItems.map(({ key, label, path, description }) => ({
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
