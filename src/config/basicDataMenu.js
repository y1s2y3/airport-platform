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
    {
      key: 'bd-entity-breakdown',
      label: '实体工程分解',
      path: '/basic-data/entity-breakdown',
      description:
        '项目级维护单位工程→子单位工程→分部→子分部→分项，与质量验评实体工程目录树同源。',
      name: 'EntityBreakdown',
      component: 'EntityBreakdownView',
    },
    {
      key: 'bd-construction-location',
      label: '施工部位管理',
      path: '/basic-data/construction-location',
      description: '按实体工程结构树浏览；仅分项可挂接多级施工部位，上级节点可查询下级已挂部位。',
      name: 'ConstructionLocation',
      component: 'ConstructionLocationView',
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
