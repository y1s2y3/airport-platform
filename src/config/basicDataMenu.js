export const basicDataMenuGroup = {
  key: 'basic-data',
  label: '基础数据管理',
  icon: 'Collection',
  children: [
    {
      key: 'bd-project',
      label: '项目管理',
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
          description: '指挥部层级管理分包单位全生命周期：同步一期供应商库、履约台账、信用评分及退场联审。',
        },
      ],
    },
    {
      key: 'bd-engineering-library',
      label: '工程划分库',
      path: '/basic-data/engineering-library',
      description:
        '通过树结构统一维护单位工程、子单位工程、分部工程、子分部工程、分项工程；支持新增、编辑、停用、版本管理与 BIM 关联。',
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
