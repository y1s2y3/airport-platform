/**
 * 设备进场管理 — 一级菜单（位于材料进场管理之后）
 * 对齐 feature-list-mat 设备到场能力；菜单名按产品定稿「设备进场管理」
 * 审批走个人中心待办，无独立审批菜单
 */
export const eqMenuGroup = {
  key: 'eq-entry-mgmt',
  label: '设备进场管理',
  icon: 'SetUp',
  children: [
    {
      key: 'eq-dashboard',
      label: '设备进场看板',
      path: '/qm/eq/dashboard',
      description: '进场批次、品牌一致率、待审/已通过等。',
      name: 'EqDashboard',
      component: 'EqDashboardView',
    },
    {
      key: 'eq-ledger',
      label: '设备进场台账',
      path: '/qm/eq/ledger',
      description: '本项目全量设备进场台账，支持筛选与抽查（项目级）。',
      name: 'EqLedger',
      component: 'EqLedgerView',
    },
    {
      key: 'eq-application',
      label: '设备进场申请',
      path: '/qm/eq/applications',
      description: '施工新建设备进场验收；含开箱清单；审批在个人中心待办。',
      name: 'EqApplication',
      component: 'EqApplicationListView',
    },
  ],
}

export const eqExtraRoutes = [
  {
    key: 'eq-application-edit',
    path: '/qm/eq/applications/edit',
    name: 'EqApplicationEdit',
    label: '新建设备进场',
    component: 'EqApplicationEditView',
    sidebarKey: 'eq-application',
  },
  {
    key: 'eq-application-detail',
    path: '/qm/eq/applications/detail',
    name: 'EqApplicationDetail',
    label: '设备进场详情',
    component: 'EqApplicationDetailView',
    sidebarKey: 'eq-application',
  },
]

function flattenMenuLeaves(items = []) {
  const leaves = []
  for (const item of items) {
    if (item.path) leaves.push(item)
    else if (item.children?.length) leaves.push(...flattenMenuLeaves(item.children))
  }
  return leaves
}

export const eqRoutes = [...flattenMenuLeaves(eqMenuGroup.children), ...eqExtraRoutes]

export const eqViewLoaders = {
  EqDashboardView: () => import('../views/quality/eq/EqDashboardView.vue'),
  EqLedgerView: () => import('../views/quality/eq/EqLedgerView.vue'),
  EqApplicationListView: () => import('../views/quality/eq/EqApplicationListView.vue'),
  EqApplicationEditView: () => import('../views/quality/eq/EqApplicationEditView.vue'),
  EqApplicationDetailView: () => import('../views/quality/eq/EqApplicationDetailView.vue'),
}
