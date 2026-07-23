export const basicDataMenuGroup = {
  key: 'basic-data',
  label: '基础数据管理',
  icon: 'Collection',
  children: [
    {
      key: 'bd-project-info',
      label: '项目基础信息',
      path: '/basic-data/project/info',
      description: '指挥部层级维护全部项目基础信息，支持按项目列表查看详情及参建单位信息。',
    },
    {
      key: 'bd-subcontractor',
      label: '分包单位管理',
      path: '/basic-data/project/subcontractor',
      description: '按项目维护分包单位登记信息：安全生产许可、项目负责人、安全管理人员及资质证书。',
    },
  ],
}

export function flattenMenuLeaves(items = []) {
  const leaves = []
  for (const item of items) {
    if (item.path) leaves.push(item)
    else if (item.children?.length) leaves.push(...flattenMenuLeaves(item.children))
  }
  return leaves
}

export const basicDataRoutes = flattenMenuLeaves(basicDataMenuGroup.children)
