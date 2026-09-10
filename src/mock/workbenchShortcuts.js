/**
 * 工作台 · 常用功能入口
 * levels: 'both' | 'hq' | 'project'；pathByLevel 用于两级落地页不同
 */

export const workbenchShortcuts = [
  {
    key: 'personal-center',
    label: '个人中心',
    path: '/personal-center',
    icon: 'Notebook',
    levels: 'both',
    iconBg: '#f3e5f5',
    iconColor: '#8e24aa',
  },
  {
    key: 'safety-task',
    label: '巡检任务',
    path: '/safety-inspection/task',
    icon: 'DocumentChecked',
    levels: 'both',
    iconBg: '#e6f4ff',
    iconColor: '#1677ff',
  },
  {
    key: 'safety-hazard',
    label: '隐患清单',
    path: '/safety-inspection/hazard',
    icon: 'Warning',
    levels: 'both',
    iconBg: '#fff1f0',
    iconColor: '#e53935',
  },
  {
    key: 'qm-inspect',
    label: '质量验评',
    pathByLevel: {
      hq: '/qm/inspect/dashboard',
      project: '/qm/inspect/form-fill-deep',
    },
    labelByLevel: {
      hq: '质量验评看板',
      project: '实体工程验收',
    },
    icon: 'DataAnalysis',
    levels: 'both',
    iconBg: '#fff7e6',
    iconColor: '#fa8c16',
  },
  {
    key: 'brand',
    label: '品牌报审',
    pathByLevel: {
      hq: '/qm/quality-board/brand-stats',
      project: '/qm/brand/applications',
    },
    icon: 'Medal',
    levels: 'both',
    iconBg: '#f6ffed',
    iconColor: '#52c41a',
  },
  {
    key: 'mat-entry',
    label: '材料进场',
    pathByLevel: {
      hq: '/qm/mat/dashboard',
      project: '/qm/mat/applications',
    },
    icon: 'Box',
    levels: 'both',
    iconBg: '#e6f4ff',
    iconColor: '#1677ff',
  },
  {
    key: 'labor',
    label: '人员实名制',
    pathByLevel: {
      hq: '/labor/realname-stats',
      project: '/labor/realname',
    },
    icon: 'User',
    levels: 'both',
    iconBg: '#e8f5e9',
    iconColor: '#43a047',
  },
  {
    key: 'labor-warning',
    label: '预警清单',
    path: '/labor/warning-list',
    icon: 'Bell',
    levels: 'project',
    iconBg: '#fff7e6',
    iconColor: '#fa8c16',
  },
  {
    key: 'video-monitor',
    label: '视频监控',
    pathByLevel: {
      hq: '/video-monitor/stats',
      project: '/video-monitor/preview',
    },
    icon: 'VideoCamera',
    levels: 'both',
    iconBg: '#e0f7fa',
    iconColor: '#00acc1',
  },
  {
    key: 'coc-notice',
    label: '调度任务单',
    path: '/coc-admin/notice',
    icon: 'Connection',
    levels: 'hq',
    iconBg: '#fce4ec',
    iconColor: '#c2185b',
  },
  {
    key: 'machine-alert',
    label: '机械预警',
    pathByLevel: {
      hq: '/hq/machine-supervise/alert-record',
      project: '/machine-supervise/alert-record',
    },
    icon: 'WarnTriangleFilled',
    levels: 'both',
    iconBg: '#fff1f0',
    iconColor: '#e53935',
  },
]

/**
 * @param {boolean} isHq 当前是否指挥部层级
 * @returns {Array<{ key: string, label: string, path: string, icon: string, iconBg: string, iconColor: string }>}
 */
export function listWorkbenchShortcuts(isHq) {
  const level = isHq ? 'hq' : 'project'
  return workbenchShortcuts
    .filter((item) => item.levels === 'both' || item.levels === level)
    .map((item) => {
      const path =
        item.pathByLevel?.[level] ||
        item.path ||
        item.pathByLevel?.hq ||
        item.pathByLevel?.project ||
        '/'
      const label = item.labelByLevel?.[level] || item.label
      return {
        key: item.key,
        label,
        path,
        icon: item.icon,
        iconBg: item.iconBg,
        iconColor: item.iconColor,
      }
    })
}
