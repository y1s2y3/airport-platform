export const settingsMenuGroups = [
  {
    key: 'sys-settings',
    label: '组织管理',
    icon: 'OfficeBuilding',
    children: [
      {
        key: 'sys-org',
        label: '组织架构',
        path: '/settings/org',
        description:
          '维护企业组织树，管理组织成员、岗位与组织信息，支持角色授权与数据权限配置。',
      },
      {
        key: 'sys-user',
        label: '用户管理',
        path: '/settings/user',
        description:
          '管理系统用户账号、基本信息、所属组织与角色绑定；支持启用/停用、密码重置及批量导入。',
      },
      {
        key: 'sys-role',
        label: '角色管理',
        path: '/settings/role',
        description:
          '按岗位/职责定义角色，配置角色与菜单、数据权限的对应关系，实现 RBAC 权限模型。',
      },
      {
        key: 'sys-position',
        label: '岗位管理',
        path: '/settings/position',
        description:
          '维护企业岗位编码、名称、级别与岗位职责，支持关联角色及岗位人数统计。',
      },
      {
        key: 'sys-menu',
        label: '菜单管理',
        path: '/settings/menu',
        description: '维护系统菜单树、路由与按钮级权限标识，支持动态菜单加载与多端菜单配置。',
      },
    ],
  },
  {
    key: 'sys-log',
    label: '日志管理',
    icon: 'Notebook',
    children: [
      {
        key: 'log-system',
        label: '系统日志',
        path: '/logs/system',
        description: '采集各微服务运行日志，支持按服务名称、日志级别与时间范围检索与详情查看。',
      },
      {
        key: 'log-login',
        label: '登录日志',
        path: '/logs/login',
        description: '记录用户登录时间、IP、终端、结果等，支持检索、导出，满足等保审计要求。',
      },
      {
        key: 'log-operation',
        label: '操作日志',
        path: '/logs/operation',
        description:
          '记录关键业务操作（增删改、审批、导出等），含操作人、时间、对象与结果，支持追溯与审计。',
      },
    ],
  },
]
