export const engineeringLibraryTypes = {
  unit: {
    key: 'unit',
    title: '单位工程库',
    itemLabel: '单位工程',
    parentLabel: null,
    codePrefix: 'DW',
    menuKey: 'bd-engineering-library',
    path: '/basic-data/engineering-library',
    description:
      '通过树结构统一维护单位工程、子单位工程、分部工程、子分部工程、分项工程；支持新增、编辑、停用、版本管理与 BIM 关联。',
  },
  subUnit: {
    key: 'subUnit',
    title: '子单位工程库',
    itemLabel: '子单位工程',
    parentLabel: '单位工程',
    codePrefix: 'ZDW',
    menuKey: 'bd-sub-unit',
    path: '/basic-data/sub-unit',
    description:
      '统一管理子单位工程基础信息，支持新增、编辑、查询和停用；通过编号关联BIM模型；版本管理保留历史变更，禁止删除已生效或已引用数据。',
  },
  division: {
    key: 'division',
    title: '分部工程库',
    itemLabel: '分部工程',
    parentLabel: '子单位工程',
    codePrefix: 'FB',
    menuKey: 'bd-division',
    path: '/basic-data/division',
    description:
      '统一管理分部工程基础信息，支持新增、编辑、查询和停用；通过编号关联BIM模型；版本管理保留历史变更，禁止删除已生效或已引用数据。',
  },
  subDivision: {
    key: 'subDivision',
    title: '子分部工程库',
    itemLabel: '子分部工程',
    parentLabel: '分部工程',
    codePrefix: 'ZFB',
    menuKey: 'bd-sub-division',
    path: '/basic-data/sub-division',
    description:
      '统一管理子分部工程基础信息，支持新增、编辑、查询和停用；通过编号关联BIM模型；版本管理保留历史变更，禁止删除已生效或已引用数据。',
  },
  subItem: {
    key: 'subItem',
    title: '分项工程库',
    itemLabel: '分项工程',
    parentLabel: '子分部工程',
    codePrefix: 'FX',
    menuKey: 'bd-sub-item',
    path: '/basic-data/sub-item',
    description:
      '统一管理分项工程基础信息，支持新增、编辑、查询和停用；通过编号关联BIM模型；版本管理保留历史变更，禁止删除已生效或已引用数据。',
  },
}

export const libraryStatusOptions = ['已启用', '已停用', '草稿']

export function getLibraryConfig(typeKey) {
  return engineeringLibraryTypes[typeKey] || engineeringLibraryTypes.unit
}

export function getLibraryTypeByPath(path) {
  if (path === '/basic-data/engineering-library') return 'unit'
  return Object.values(engineeringLibraryTypes).find((item) => item.path === path)?.key || 'unit'
}

export const engineeringTypeOrder = ['project', 'unit', 'subUnit', 'division', 'subDivision', 'subItem']

export const engineeringChildTypeMap = {
  project: 'unit',
  unit: 'subUnit',
  subUnit: 'division',
  division: 'subDivision',
  subDivision: 'subItem',
}

export const engineeringTypeLabels = {
  project: '项目',
  unit: '单位工程',
  subUnit: '子单位工程',
  division: '分部工程',
  subDivision: '子分部工程',
  subItem: '分项工程',
}
