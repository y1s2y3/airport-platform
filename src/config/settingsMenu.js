export const settingsMenuGroups = [
  {
    key: 'sys-settings',
    label: '系统设置',
    icon: 'Setting',
    children: [
      {
        key: 'sys-org',
        label: '组织结构',
        path: '/settings/org',
        description:
          '统一组织节点树：OA 系统用户、外部单位用户、其他用户作为根节点分类展示，支持 OA 同步与用户查询。',
      },
      {
        key: 'sys-user',
        label: '用户管理',
        path: '/settings/user',
        description:
          '管理系统用户账号、基本信息、所属组织与角色绑定；支持启用/停用、密码重置及批量导入。',
      },
      {
        key: 'sys-dept',
        label: '部门管理',
        path: '/settings/dept',
        description: '维护部门层级与人员归属，支持部门增删改、负责人设置，与组织架构树联动。',
      },
      {
        key: 'sys-role',
        label: '角色管理',
        path: '/settings/role',
        description:
          '按岗位/职责定义角色，配置角色与菜单、数据权限的对应关系，实现 RBAC 权限模型。',
      },
      {
        key: 'sys-permission',
        label: '权限管理',
        path: '/settings/permission',
        description:
          '细粒度配置功能权限与数据范围（本部门/本项目/全部），支持按角色批量授权与权限预览。',
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
    key: 'sys-integration',
    label: '系统对接',
    icon: 'Connection',
    children: [
      {
        key: 'integ-user',
        label: '第三方用户管理',
        path: '/integration/user',
        description:
          '对接外部系统（OA/一期平台等）的用户同步与映射，支持增量同步、冲突处理及手工维护。',
      },
      {
        key: 'integ-role',
        label: '第三方角色管理',
        path: '/integration/role',
        description: '维护第三方系统角色与平台角色的映射关系，确保跨系统权限一致。',
      },
      {
        key: 'integ-org',
        label: '第三方组织管理',
        path: '/integration/org',
        description: '同步或维护第三方组织数据，支持与平台组织结构对照、合并与差异处理。',
      },
      {
        key: 'integ-menu',
        label: '第三方菜单管理',
        path: '/integration/menu',
        description: '配置第三方系统菜单/功能入口与平台菜单的映射，实现单点登录后功能跳转。',
      },
    ],
  },
  {
    key: 'sys-log',
    label: '日志管理',
    icon: 'Notebook',
    children: [
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
