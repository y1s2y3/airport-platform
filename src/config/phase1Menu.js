/**
 * 一期系统菜单跳转清单（单一事实源）
 *
 * 字段说明：
 * - key       唯一标识（p1- 前缀，用于菜单 key / 路由 name / 权限树）
 * - label     二期侧栏展示名（与一期页面标题保持一致，便于对照）
 * - hashPath  一期 hash 内路径（不含域名与 #），跳转地址由 buildPhase1Url 拼接
 * - verified  2026-10-21 线上实测状态：true=已渲染；false=依赖模型/低代码加载或需再核（菜单上加「待核」提示）
 *
 * 结构说明：
 * - parent    归属的二期一级菜单 key
 * - attachTo  可选：挂到该一级下**已有**的二级分组里（不新建分组）
 * - levels    层级可见性：'both' | 'hq' | 'project'（缺省 both）
 * - roles     可见角色（定稿 35 角色的角色ID，如 'HQ-02'）；缺省/空数组 = 全部登录用户（GN-01）
 * - catalog   可选：该分组收敛为「聚合页」（'system' | 'payment' | 'archive'），侧栏只留 1 个入口
 * - item.roles 单项覆盖分组权限（如「变更技术审核」只给设计/安质）
 *
 * 角色口径：`output/系统角色清单（定稿）.md`（2026-10-12 冻结，35 个系统登录角色）。
 * 授权明细与聚合方案见：`调研记录/06、一期对接/一期入口角色授权与聚合方案_清单.md`
 */

/** 定稿角色简称（聚合页/占位页展示用；完整定义见角色清单） */
/** 角色口径（2026-10-22 用户定稿·简化方案）
 *  指挥部：运维人员=系统所有功能；领导=业务所有功能+COC；安质部/设计部/项目部/其他=业务所有功能；
 *          档案室=质量管控相关+档案管理相关；指挥部角色覆盖「指挥部+项目」两个层级。
 *  项目：监理领导/监理人员/施工领导/施工管理人员=项目级所有权限。
 */
export const PHASE1_ROLE_LABELS = {
  '指挥部运维人员': '指挥部运维人员',
  '指挥部领导': '指挥部领导',
  '安质部/设计部/项目部/指挥部其他用户': '安质部/设计部/项目部/指挥部其他用户',
  '档案室': '档案室',
  '监理领导': '监理领导',
  '监理人员': '监理人员',
  '施工领导': '施工领导',
  '施工管理人员': '施工管理人员',
}

/** 业务类角色（可见业务所有功能，不含系统管理） */
export const PHASE1_BUSINESS_ROLES = ['指挥部运维人员', '指挥部领导', '安质部/设计部/项目部/指挥部其他用户', '监理领导', '监理人员', '施工领导', '施工管理人员']

/** 全部角色（业务 + 档案室：质量管控相关、档案管理相关） */
export const PHASE1_ALL_ROLES = [
  '指挥部运维人员',
  '指挥部领导',
  '安质部/设计部/项目部/指挥部其他用户',
  '档案室',
  '监理领导',
  '监理人员',
  '施工领导',
  '施工管理人员',
]

/**
 * 原型演示角色 → 定稿角色映射（仅原型演示用；正式系统按 35 角色直接授权）
 * 目的：不改动原型既有 9 个演示角色数据，也能演示「按角色过滤一期入口」。
 */
export const PHASE1_ROLE_MAP = {
  'role-admin': ['指挥部运维人员'],
  'role-company': ['指挥部领导', '安质部/设计部/项目部/指挥部其他用户'],
  'role-default': ['安质部/设计部/项目部/指挥部其他用户'],
  'role-bd': ['安质部/设计部/项目部/指挥部其他用户'],
  'role-integration': ['指挥部运维人员'],
  'role-pm': ['施工领导', '安质部/设计部/项目部/指挥部其他用户'],
  'role-labor': ['施工管理人员', '安质部/设计部/项目部/指挥部其他用户'],
  'role-video': ['监理人员', '安质部/设计部/项目部/指挥部其他用户'],
  'role-vehicle': ['监理人员', '安质部/设计部/项目部/指挥部其他用户'],
  'role-coc': ['监理人员', '安质部/设计部/项目部/指挥部其他用户'],
}

/** 聚合页定义（侧栏只留 1 个入口，页内按角色过滤卡片） */
export const PHASE1_CATALOGS = {}


export const PHASE1_MENU_GROUPS = [
  /* ========================= 项目管控 ========================= */
  {
    key: 'p1g-project-plan',
    label: '项目计划',
    icon: 'Calendar',
    parent: 'project-control',
    roles: PHASE1_BUSINESS_ROLES,
    items: [
      { key: 'p1-plan-fill', label: '项目计划填报', hashPath: '/progress/ProjectPlanAdd', verified: true },
      { key: 'p1-plan-overview', label: '项目管控一览表', hashPath: '/ProjectPlan/ProjectPlanOverview', verified: true },
      { key: 'p1-plan-period', label: '期间计划总览', hashPath: '/ProjectPlan/PeriodPlanOverview', verified: true },
      { key: 'p1-plan-stat', label: '进度统计分析', hashPath: '/StatisticalAnalysisProgress', verified: true },
      { key: 'p1-plan-template', label: '项目计划模板', hashPath: '/ProjectPlan/ProjectPlanTemplate', verified: true },
    ],
  },
  {
    key: 'p1g-permit',
    label: '报建管理',
    icon: 'Document',
    parent: 'project-control',
    roles: PHASE1_BUSINESS_ROLES,
    items: [
      { key: 'p1-permit-progress', label: '报批报建进度管理', hashPath: '/ConstructionAppProgress', verified: true },
      { key: 'p1-permit-stat', label: '报批报建统计分析', hashPath: '/sub_StatisticalAnalysisBJ', verified: false },
    ],
  },
  {
    key: 'p1g-design',
    label: '设计管理',
    icon: 'EditPen',
    parent: 'project-control',
    roles: PHASE1_BUSINESS_ROLES,
    items: [
      { key: 'p1-design-committee', label: '工程技术委员会评审', hashPath: '/designManage/CommitteeReview', verified: true },
      { key: 'p1-design-progress', label: '设计进度管理', hashPath: '/designManage/progress', verified: true },
      { key: 'p1-design-archive', label: '设计图档管理', hashPath: '/designManage/archives', verified: true },
      { key: 'p1-design-result', label: '设计成果审核', hashPath: '/designManage/result', verified: true },
      { key: 'p1-design-stat', label: '设计成果统计', hashPath: '/designManage/statist', verified: true },
      { key: 'p1-design-control', label: '受控管理', hashPath: '/designManage/DesignControlledManagement', verified: true },
      { key: 'p1-design-compare', label: '图模比对', hashPath: '/designManage/result/comparison', verified: false },
    ],
  },
  {
    key: 'p1g-construction-progress',
    label: '施工进度',
    icon: 'TrendCharts',
    parent: 'project-control',
    roles: PHASE1_BUSINESS_ROLES,
    items: [
      { key: 'p1-con-master', label: '施工总体计划报审', hashPath: '/progress/construction/masterPlan', verified: true },
      { key: 'p1-con-week-plan', label: '施工周计划报审', hashPath: '/progress/construction/plan', verified: true },
      { key: 'p1-con-week-progress', label: '施工周进度报审', hashPath: '/progress/construction/scheduling', verified: true },
      { key: 'p1-con-deviation', label: '进度偏差对比', hashPath: '/ProgressDeviationAnalysis', verified: true },
      { key: 'p1-con-model-link', label: '模型构件关联', hashPath: '/ModelConstructionAssociation', verified: true },
      { key: 'p1-con-bim-sim', label: 'BIM 进度模拟', hashPath: '/BIMProgressPage', verified: false },
      { key: 'p1-work-report', label: '施工作业填报', hashPath: '/progress/constructionWork', verified: true },
    ],
  },
  {
    key: 'p1g-change',
    label: '变更管理',
    icon: 'Operation',
    parent: 'project-control',
    roles: PHASE1_BUSINESS_ROLES,
    items: [
      { key: 'p1-change-apply', label: '工程变更申请', hashPath: '/alteration/negotiationForm', verified: true },
      { key: 'p1-change-tech', label: '变更技术审核', hashPath: '/alteration/technicalReview', verified: true },
      { key: 'p1-change-approval', label: '变更立项申请', hashPath: '/alteration/projectApproval', verified: true },
      { key: 'p1-change-budget', label: '变更预算报审/审核', hashPath: '/alteration/budgetReview', verified: true },
      { key: 'p1-change-ledger', label: '变更管理台账', hashPath: '/alteration/ledger', verified: true },
    ],
  },
  {
    key: 'p1g-investment',
    label: '投资管理',
    icon: 'TrendCharts',
    parent: 'project-control',
    roles: PHASE1_BUSINESS_ROLES,
    items: [
      { key: 'p1-invest-plan', label: '投资计划报审', hashPath: '/investment/plan', verified: true },
      { key: 'p1-invest-progress', label: '投资进度报审', hashPath: '/investment/progress', verified: true },
      { key: 'p1-invest-bill', label: '工程量清单导入', hashPath: '/investment/bill', verified: true },
      { key: 'p1-invest-deviation', label: '投资偏差对比', hashPath: '/investment/deviation_comparison', verified: true },
      { key: 'p1-invest-annual', label: '年度投资计划录入', hashPath: '/investment/AnnualPlan', verified: true },
      { key: 'p1-invest-fill', label: '投资数据填报', hashPath: '/investment/InvestmentFill', verified: true },
    ],
  },
  {
    key: 'p1g-payment',
    label: '一期支付管理',
    icon: 'Wallet',
    parent: 'project-control',
    roles: PHASE1_BUSINESS_ROLES,
    items: [
      { key: 'p1-pay-guarantee-in', label: '保函收取', hashPath: '/CollectionOfGuaranteeLetter', verified: true },
      { key: 'p1-pay-guarantee-out', label: '保函退还', hashPath: '/ReturnOfGuaranteeLetter', verified: true },
      { key: 'p1-pay-plan', label: '用款计划审批', hashPath: '/disbursementScheduleApprove', verified: true },
      { key: 'p1-pay-apply', label: '财务支付申请', hashPath: '/FinancialApplicationApproval', verified: true },
      { key: 'p1-pay-ledger', label: '财务支付台账', hashPath: '/FinancialPaymentLedger', verified: true },
      { key: 'p1-pay-stat', label: '财务支付统计', hashPath: '/FinancialPaymentManagement/statistics', verified: true },
      { key: 'p1-pay-fund-plan', label: '资金计划填报', hashPath: '/FinancialPaymentManagement/FundsPlanFiling', verified: false },
      { key: 'p1-pay-month-ledger', label: '月度资金计划台账', hashPath: '/FinancialPaymentManagement/MonthlyFundLedger', verified: true },
    ],
  },
  {
    key: 'p1g-contract',
    label: '合同管理',
    icon: 'Notebook',
    parent: 'project-control',
    roles: PHASE1_BUSINESS_ROLES,
    items: [
      { key: 'p1-contract-info', label: '合同信息', hashPath: '/contract/contractInform', verified: false },
      { key: 'p1-contract-party', label: '合同相对方管理', hashPath: '/contract/contractCounterparty', verified: true },
      { key: 'p1-contract-std', label: '标准合同库与合同内审', hashPath: '/sub_app_wp/application/2019585385776025602', verified: false },
    ],
  },
  {
    key: 'p1g-archive',
    label: '资料档案',
    icon: 'FolderOpened',
    parent: 'project-control',
    roles: PHASE1_ALL_ROLES,
    items: [
      { key: 'p1-archive-pre', label: '预归档管理', hashPath: '/DocumentManagement/PreArchiving', verified: true },
      { key: 'p1-archive-filing', label: '归档管理', hashPath: '/DocumentManagement/filing', verified: true },
      { key: 'p1-archive-doc', label: '文档管理', hashPath: '/DocumentManagement/Document', verified: true },
      { key: 'p1-archive-borrow', label: '借阅领用及技术归档', hashPath: '/sub_app_wp/application/1945408310995849217', verified: false },
      { key: 'p1-progress-archive', label: '施工深化图档管理', hashPath: '/progress/archives', verified: true },
      { key: 'p1-progress-result', label: '施工深化成果审核', hashPath: '/progress/result', verified: true },
    ],
  },
  {
    key: 'p1g-bim',
    label: 'BIM 平台',
    icon: 'Upload',
    parent: 'project-control',
    roles: PHASE1_BUSINESS_ROLES,
    items: [
      { key: 'p1-bim-view', label: 'BIM 模型查看', hashPath: '/BIM', verified: false },
      { key: 'p1-bim-upload', label: '模型上传', hashPath: '/BIMModelUpload', verified: true },
      { key: 'p1-bim-gather', label: '模型集管理', hashPath: '/modelGather', verified: true },
      { key: 'p1-bim-scene', label: '模型场景管理', hashPath: '/sceneManage', verified: true },
    ],
  },

  /* ========================= 安全质量 ========================= */
  {
    key: 'p1g-tech',
    label: '技术专项',
    icon: 'Notebook',
    parent: 'security-quality',
    roles: PHASE1_ALL_ROLES,
    items: [
      { key: 'p1-tech-scheme', label: '技术专项方案', hashPath: '/technology/technologyManage', verified: true },
      { key: 'p1-tech-stat', label: '技术专项统计', hashPath: '/technology/technologyStatic', verified: true },
    ],
  },
  {
    key: 'p1g-quality-inspect',
    label: '施工质量巡检',
    icon: 'DataAnalysis',
    parent: 'security-quality',
    roles: PHASE1_ALL_ROLES,
    items: [
      { key: 'p1-qa-plan', label: '巡检计划管理', hashPath: '/QualityAssurance/InspectionPlanManagement', verified: true },
      { key: 'p1-qa-task', label: '施工质量巡检管理', hashPath: '/QualityAssurance/InspectionTaskManagement', verified: true },
      { key: 'p1-qa-problem', label: '施工质量问题管理', hashPath: '/QualityAssurance/QualityProblem', verified: true },
      { key: 'p1-qa-stat', label: '质量统计', hashPath: '/QualityAssurance/QualityStatistics', verified: true },
    ],
  },
  {
    key: 'p1g-work-report',
    label: '施工作业（附）',
    parent: 'security-quality',
    roles: PHASE1_BUSINESS_ROLES,
    attachTo: 'work-manage',
    items: [
      { key: 'p1-work-photo', label: '工程形象照片', hashPath: '/progress/engineeringPhoto', verified: true },
    ],
  },

  /* ========================= 智慧工地 ========================= */
  {
    key: 'p1g-env',
    label: '环境监测',
    icon: 'Sunrise',
    parent: 'smart-site',
    roles: PHASE1_BUSINESS_ROLES,
    items: [
      { key: 'p1-env-board', label: '环境看板', hashPath: '/environmentalBoard', verified: false },
      { key: 'p1-env-history', label: '环境历史数据', hashPath: '/historicalData', verified: true },
      { key: 'p1-env-threshold', label: '阈值设置', hashPath: '/environmentSettings', verified: true },
      { key: 'p1-env-config', label: '数据配置', hashPath: '/dataConfiguration', verified: true },
    ],
  },
  {
    key: 'p1g-power',
    label: '用电监测',
    icon: 'Lightning',
    parent: 'smart-site',
    roles: PHASE1_BUSINESS_ROLES,
    items: [{ key: 'p1-power-history', label: '用电历史数据', hashPath: '/powerManage/historicalData', verified: true }],
  },
  {
    key: 'p1g-child-site',
    label: '智慧工地子系统',
    icon: 'Link',
    parent: 'smart-site',
    roles: PHASE1_BUSINESS_ROLES,
    items: [{ key: 'p1-child-site', label: '子系统配置与跳转', hashPath: '/childSite', verified: true }],
  },

  /* ========================= 综合办公 ========================= */
  {
    key: 'p1g-task',
    label: '督办任务',
    icon: 'Tickets',
    parent: 'office',
    roles: PHASE1_BUSINESS_ROLES,
    items: [
      { key: 'p1-task-mine', label: '我的任务', hashPath: '/myTaskManage', verified: true },
      { key: 'p1-task-all', label: '全部任务', hashPath: '/taskList', verified: true },
      { key: 'p1-task-stat', label: '任务统计', hashPath: '/statisticalLedger', verified: false },
      { key: 'p1-task-analysis', label: '统计分析', hashPath: '/taskStatisticalAnalysis', verified: false },
    ],
  },
  {
    key: 'p1g-office',
    label: '个人办公',
    icon: 'Memo',
    parent: 'office',
    roles: PHASE1_BUSINESS_ROLES,
    items: [
      { key: 'p1-office-todo', label: '待办事项', hashPath: '/backlog', verified: true },
      { key: 'p1-office-msg', label: '消息中心', hashPath: '/massageCenter', verified: true },
      { key: 'p1-office-cc', label: '抄送', hashPath: '/office/circulation', verified: true },
    ],
  },
  {
    key: 'p1g-form',
    label: '常用表单',
    icon: 'Document',
    parent: 'office',
    roles: PHASE1_BUSINESS_ROLES,
    items: [
      { key: 'p1-form-contact', label: '工作联系单', hashPath: '/communicate/workConnect', verified: true },
      { key: 'p1-form-account', label: '账号开通联系单', hashPath: '/communicate/accountActivation', verified: true },
      { key: 'p1-form-receive', label: '往来文函-收文', hashPath: '/communicate/officialLetters/receive', verified: true },
      { key: 'p1-form-send', label: '往来文函-发文', hashPath: '/communicate/officialLetters/send', verified: true },
      { key: 'p1-form-seal', label: '指挥部用章审批', hashPath: '/communicate/SealApproval', verified: true },
      { key: 'p1-form-duty', label: '值班申请', hashPath: '/sub_app_wp/application/1958359240317865986', verified: false },
      { key: 'p1-form-minutes', label: '纪要及周月报', hashPath: '/sub_app_wp/application/1958360697213554690', verified: false },
    ],
  },
  {
    key: 'p1g-news',
    label: '新闻公告',
    icon: 'Bell',
    parent: 'office',
    roles: PHASE1_BUSINESS_ROLES,
    items: [
      { key: 'p1-news-manage', label: '新闻公告维护', hashPath: '/generalManagement/NewsAnnouncement', verified: true },
      { key: 'p1-news-publish', label: '公共信息发布', hashPath: '/generalManagement/publicInformationRelease', verified: true },
      { key: 'p1-news-duty-import', label: '值班表导入', hashPath: '/GeneralManagement/DutyScheduleImport', verified: true },
      { key: 'p1-news-seal', label: '电子签章', hashPath: '/generalManagement/sealConfig', verified: true },
    ],
  },

  /* ========================= 数据看板 ========================= */
  {
    key: 'p1g-board',
    label: 'BIM系统看板',
    icon: 'DataAnalysis',
    parent: 'data-board',
    roles: PHASE1_BUSINESS_ROLES,
    items: [
      { key: 'p1-board-entry', label: '看板数据录入', hashPath: '/DataBoard/DataEntry', verified: true },
      { key: 'p1-board-screen', label: '数据大屏', hashPath: '/bigScreenTest', verified: false },
      { key: 'p1-board-bigscreen', label: '大屏看板', hashPath: '/screenBoard', verified: false },
    ],
  },

  /* ========================= 系统管理 ========================= */
  {
    key: 'p1g-system',
    label: 'BIM系统管理',
    icon: 'Setting',
    parent: 'sys-admin',
    roles: ['指挥部运维人员'],
    levels: 'hq',
    items: [
      { key: 'p1-sys-user', label: '用户管理', hashPath: '/system/user', verified: true },
      { key: 'p1-sys-menu', label: '菜单管理', hashPath: '/system/menu', verified: true },
      { key: 'p1-sys-role', label: '角色管理', hashPath: '/system/rbac/role', verified: true },
      { key: 'p1-sys-func', label: '功能权限', hashPath: '/system/rbac/function', verified: true },
      { key: 'p1-sys-dir', label: '目录树管理', hashPath: '/system/directoryTree', verified: true },
      { key: 'p1-sys-appver', label: 'APP 版本管理', hashPath: '/system/AppVersion', verified: true },
      { key: 'p1-sys-board-config', label: '看板统计分析配置', hashPath: '/system/statisticalAnalysis/homeConfig', verified: true },
      { key: 'p1-sys-msg', label: '消息中心配置', hashPath: '/system/messageCenter/message', verified: false },
      { key: 'p1-sys-flow', label: '流程中心', hashPath: '/system/flowCenter/userTask', verified: false },
      { key: 'p1-sys-audit', label: '审计日志', hashPath: '/system/audit/logs', verified: false },
      { key: 'p1-sys-config', label: '系统配置', hashPath: '/system/config/general', verified: false },
      { key: 'p1-sys-lowcode', label: '低代码应用中心', hashPath: '/sub_app_wp/appCenter', verified: false },
    ],
  },
]

/** 拍平为一期跳转项列表（供校验/聚合页/统计） */
export function flattenPhase1Items(groups = PHASE1_MENU_GROUPS) {
  return groups.reduce((acc, group) => {
    for (const item of group.items || []) {
      acc.push({
        ...item,
        groupKey: group.key,
        groupLabel: group.label,
        groupCatalog: group.catalog || '',
        roles: item.roles || group.roles || [],
      })
    }
    return acc
  }, [])
}

/** 一期跳转项总数（用于自检输出） */
export const PHASE1_ITEM_COUNT = flattenPhase1Items().length

/** 某聚合页包含的一期条目（按 catalog 归属） */
export function listCatalogItems(catalogKey) {
  return flattenPhase1Items(PHASE1_MENU_GROUPS).filter((item) => item.groupCatalog === catalogKey)
}
