/**
 * 个人中心 · 待办/已办/发起/抄送/通知 Mock（含共享响应式列表）
 */
import { reactive } from 'vue'
import {
  getWarningDetail,
  getProjectLabel,
  disposalTypeLabels,
  batchDisposeWarnings,
  markNotifyWarningRead,
} from './laborWarningList.js'

export const PROCESS_STATUS_OPTIONS = ['审批中', '已通过', '已驳回', '已撤回']
export const PROCESS_CATEGORY_OPTIONS = [
  '质量验评',
  '品牌报审',
  '样板管理',
  '材料进场',
  '设备进场',
  '巡检管理',
  '人员实名',
  '车辆管理',
  'COC调度',
]
export const READ_STATUS_OPTIONS = ['未读', '已读']
export const WARNING_CENTER_TYPE_OPTIONS = ['处置任务', '通知']
export const WARNING_CENTER_STATUS_OPTIONS = ['待处理', '已关闭', '未读', '已读']
export const NOTICE_MODULE_OPTIONS = [
  '待办通知',
  '环境监测',
  '质量验评',
  '品牌报审',
  '巡检管理',
  '人员实名',
  '系统通知',
]
export const INSPECTION_BIZ_TYPE_OPTIONS = ['巡检', '整改', '复查', '审批']

/** 处罚单待办业务状态 */
export const PENALTY_TODO_STATUS = {
  PROCESSING: '处理中',
  PENDING_ACCEPTANCE: '待验收',
  APPEALING: '申诉中',
}

/** 调度隐患待办业务类型 */
export const DISPATCH_HAZARD_TODO_BIZ = {
  RECTIFY: '隐患整改',
  ACCEPT: '隐患验收',
}

export function buildDispatchHazardApprovalFlow(todo) {
  const applyTime = todo?.applyTime || ''
  const hazard = todo?.hazard || {}
  const isAccept = todo?.bizType === DISPATCH_HAZARD_TODO_BIZ.ACCEPT
  if (isAccept) {
    return [
      {
        title: '问题截图登记隐患',
        time: hazard.uploadTime || applyTime,
        user: '系统',
        remark: '已生成调度隐患',
        status: 'done',
      },
      {
        title: '提交整改',
        time: applyTime,
        user: hazard.rectifier || '整改人',
        remark: hazard.rectifyRemark || '已提交整改结果',
        status: 'done',
      },
      {
        title: '安质部验收',
        time: '',
        user: '当前用户',
        remark: '待验收',
        status: 'current',
      },
      { title: '办结关闭', time: '', user: '系统', remark: '', status: 'pending' },
    ]
  }
  return [
    {
      title: '问题截图登记隐患',
      time: hazard.uploadTime || applyTime,
      user: '系统',
      remark: '已生成调度隐患',
      status: 'done',
    },
    {
      title: '提交整改',
      time: '',
      user: '当前用户',
      remark: '待整改',
      status: 'current',
    },
    {
      title: '安质部验收',
      time: '',
      user: '安质部',
      remark: '',
      status: 'pending',
    },
    { title: '办结关闭', time: '', user: '系统', remark: '', status: 'pending' },
  ]
}

/** 按业务状态生成审批过程 */
export function buildPenaltyApprovalFlow(todo) {
  const p = todo?.penalty || {}
  const applyTime = todo?.applyTime || '—'
  const issueTime = p.issueTime || applyTime
  if (todo?.bizStatus === PENALTY_TODO_STATUS.PROCESSING) {
    return [
      { title: '指挥部开具处罚单', time: applyTime, user: todo.applicant || '指挥部', remark: '已创建处罚单', status: 'done' },
      { title: '下发至责任单位/指派人', time: issueTime, user: 'COC调度室', remark: `指派人：${p.assignee || '—'}`, status: 'done' },
      { title: '接收人处理（上报结果 / 申诉）', time: '', user: p.assignee || '指派人', remark: '待处理', status: 'current' },
      { title: '验收 / 申诉复核', time: '', user: '验收人', remark: '待流转', status: 'pending' },
      { title: '办结关闭', time: '', user: '—', remark: '', status: 'pending' },
    ]
  }
  if (todo?.bizStatus === PENALTY_TODO_STATUS.PENDING_ACCEPTANCE) {
    return [
      { title: '指挥部开具处罚单', time: applyTime, user: todo.applicant || '指挥部', remark: '已创建处罚单', status: 'done' },
      { title: '下发至责任单位/指派人', time: issueTime, user: 'COC调度室', remark: `指派人：${p.assignee || '—'}`, status: 'done' },
      {
        title: '接收人上报结果',
        time: p.reportTime || applyTime,
        user: p.assignee || '指派人',
        remark: p.reportResult || '已提交上报',
        status: 'done',
      },
      { title: '验收人验收', time: '', user: p.acceptor || '验收人', remark: '待验收', status: 'current' },
      { title: '办结关闭', time: '', user: '—', remark: '', status: 'pending' },
    ]
  }
  if (todo?.bizStatus === PENALTY_TODO_STATUS.APPEALING) {
    return [
      { title: '指挥部开具处罚单', time: applyTime, user: todo.applicant || '指挥部', remark: '已创建处罚单', status: 'done' },
      { title: '下发至责任单位/指派人', time: issueTime, user: 'COC调度室', remark: `指派人：${p.assignee || '—'}`, status: 'done' },
      {
        title: '接收人提交申诉',
        time: p.appealTime || applyTime,
        user: p.assignee || '指派人',
        remark: p.appealReason || '已提交申诉',
        status: 'done',
      },
      { title: '指挥部复核申诉', time: '', user: '指挥部', remark: '待处理', status: 'current' },
      { title: '办结关闭', time: '', user: '—', remark: '', status: 'pending' },
    ]
  }
  return [
    { title: '提交申请', time: applyTime, user: todo?.applicant || '—', remark: '', status: 'done' },
    { title: '待审批', time: '', user: '—', remark: '当前节点', status: 'current' },
  ]
}

function seedTodos() {
  return [
    {
      id: 'todo-brand-1',
      type: 'brand',
      sourceLabel: '品牌报审',
      category: '品牌报审',
      bizType: '监理审',
      brandApplicationId: 'PP-2026-002',
      brandNode: 'supervisor',
      processName: '品牌报审审批·防水卷材（PP-2026-002）',
      applicant: '张工',
      dept: '总包项目部',
      applyTime: '2026-07-20 11:00:00',
      detail: {
        project: 'T2航站区配套',
        applicationId: 'PP-2026-002',
        materialName: '防水卷材',
        materialType: '材料',
        specs: 'SBS-3mm',
        brands: '东方雨虹 / 科顺 / 雨中情',
        currentNode: '待监理审',
        usePart: '屋面',
      },
      approvalFlow: [
        {
          title: '施工提交报审',
          time: '2026-07-20 11:00:00',
          user: '张工',
          remark: '直接提交，进入审批中',
          status: 'done',
        },
        {
          title: '监理审批',
          time: '',
          user: '当前用户',
          remark: '待审批',
          status: 'current',
        },
        {
          title: '项目经理终审',
          time: '',
          user: '项目经理',
          remark: '待流转',
          status: 'pending',
        },
      ],
    },
    {
      id: 'todo-brand-2',
      type: 'brand',
      sourceLabel: '品牌报审',
      category: '品牌报审',
      bizType: '终审',
      brandApplicationId: 'PP-2026-003',
      brandNode: 'pm',
      processName: '品牌报审终审·钢筋（PP-2026-003）',
      applicant: '张工',
      dept: '总包项目部',
      applyTime: '2026-07-18 14:30:00',
      detail: {
        project: 'T2航站区配套',
        applicationId: 'PP-2026-003',
        materialName: '钢筋',
        materialType: '材料',
        specs: 'Φ12、Φ16',
        brands: '沙钢 / 河钢 / 宝钢',
        currentNode: '待项目经理审',
        usePart: '梁板',
      },
      brandCandidates: [
        { candidate_id: 'C-021', brand_name: '沙钢', manufacturer: '江苏沙钢集团有限公司' },
        { candidate_id: 'C-022', brand_name: '河钢', manufacturer: '河钢集团有限公司' },
        { candidate_id: 'C-023', brand_name: '宝钢', manufacturer: '中国宝武钢铁集团有限公司' },
      ],
      approvalFlow: [
        {
          title: '施工提交报审',
          time: '2026-07-18 14:30:00',
          user: '张工',
          remark: '提交钢筋品牌报审',
          status: 'done',
        },
        {
          title: '监理审批',
          time: '2026-07-19 09:00:00',
          user: '王监理',
          remark: '同意报审',
          status: 'done',
        },
        {
          title: '项目经理终审',
          time: '',
          user: '当前用户',
          remark: '待选定入选品牌',
          status: 'current',
        },
      ],
    },
    {
      id: 'todo-sample-1',
      type: 'sample',
      sourceLabel: '样板管理',
      category: '样板管理',
      bizType: '材料定样',
      sampleBizType: 'material',
      sampleApplicationId: 'MS-002',
      sampleNode: 'supervisor',
      processName: '材料定样审批·室内地砖 800×800（MS-002）',
      applicant: '施工-李工',
      dept: '总包项目部',
      applyTime: '2026-07-25 11:05:00',
      detail: {
        project: 'T2航站区配套',
        applicationId: 'MS-002',
        bizType: '材料定样',
        title: '室内地砖 800×800',
        usePart: '商业区公区',
        currentNode: '待监理审',
        briefing: '通体瓷砖 800×800；吸水率≤0.5%；耐磨等级 4 级。',
        indicatorDesc: '通体瓷砖 800×800；吸水率≤0.5%；耐磨等级 4 级。',
        supplier: '某陶瓷集团',
      },
      approvalFlow: [
        {
          title: '施工提交',
          time: '2026-07-25 11:05:00',
          user: '施工-李工',
          remark: '直接提交',
          status: 'done',
        },
        {
          title: '监理审批',
          time: '',
          user: '当前用户',
          remark: '待审批',
          status: 'current',
        },
        {
          title: '项目经理终审',
          time: '',
          user: '项目经理',
          remark: '待流转',
          status: 'pending',
        },
      ],
    },
    {
      id: 'todo-sample-2',
      type: 'sample',
      sourceLabel: '样板管理',
      category: '样板管理',
      bizType: '工序样板',
      sampleBizType: 'process',
      sampleApplicationId: 'PS-002',
      sampleNode: 'supervisor',
      processName: '工序样板审批·防水卷材铺贴样板（PS-002）',
      applicant: '施工-李工',
      dept: '总包项目部',
      applyTime: '2026-07-26 09:40:00',
      detail: {
        project: 'T2航站区配套',
        applicationId: 'PS-002',
        bizType: '工序样板',
        title: '防水卷材铺贴样板',
        usePart: '屋面防水层',
        currentNode: '待监理审',
        briefing: '搭接宽度、热熔顺序、节点加强。',
      },
      approvalFlow: [
        {
          title: '施工提交',
          time: '2026-07-26 09:40:00',
          user: '施工-李工',
          remark: '直接提交',
          status: 'done',
        },
        {
          title: '监理审批（终审）',
          time: '',
          user: '当前用户',
          remark: '待审批',
          status: 'current',
        },
      ],
    },
    {
      id: 'todo-sample-3',
      type: 'sample',
      sourceLabel: '样板管理',
      category: '样板管理',
      bizType: '材料定样',
      sampleBizType: 'material',
      sampleApplicationId: 'MS-003',
      sampleNode: 'pm',
      processName: '材料定样终审·铝单板幕墙（MS-003）',
      applicant: '施工-赵工',
      dept: '总包项目部',
      applyTime: '2026-07-20 14:10:00',
      detail: {
        project: '空侧捷运线',
        applicationId: 'MS-003',
        bizType: '材料定样',
        title: '铝单板幕墙',
        usePart: '连廊立面',
        currentNode: '待项目经理审',
        briefing: '氟碳喷涂铝单板 2.5mm；色号 RAL9006；板面平整度≤2mm。',
        indicatorDesc: '氟碳喷涂铝单板 2.5mm；色号 RAL9006；板面平整度≤2mm。',
        supplier: '某幕墙材料厂',
      },
      approvalFlow: [
        {
          title: '施工提交',
          time: '2026-07-20 14:10:00',
          user: '施工-赵工',
          remark: '直接提交',
          status: 'done',
        },
        {
          title: '监理审批',
          time: '2026-07-21 11:00:00',
          user: '监理用户',
          remark: '同意',
          status: 'done',
        },
        {
          title: '项目经理终审',
          time: '',
          user: '当前用户',
          remark: '待审批',
          status: 'current',
        },
      ],
    },
    {
      id: 'todo-asbuilt-1',
      type: 'asbuilt',
      sourceLabel: '实模一致验收',
      category: '实模一致验收',
      bizType: '监理审批',
      asbuiltAcceptanceId: 'AB-002',
      asbuiltNode: 'supervisor',
      processName: '实模一致验收·防水分项实模一致（同步）（AB-202608-002）',
      applicant: '施工-李工',
      dept: '总包项目部',
      applyTime: '2026-08-09 14:20:00',
      detail: {
        project: 'T2航站区配套',
        acceptanceId: 'AB-002',
        bizNo: 'AB-202608-002',
        title: '防水分项实模一致（同步）',
        compareUrl: 'https://example.com/asbuilt-compare/p-000/ab-002',
        nodePaths: '飞行区下穿通道单位工程 / 结构主体分部 / 防水分项',
        currentNode: '待监理审',
      },
      approvalFlow: [
        {
          title: '施工提交',
          time: '2026-08-09 14:20:00',
          user: '施工-李工',
          remark: '已提交',
          status: 'done',
        },
        {
          title: '监理审批',
          time: '',
          user: '',
          remark: '待办理',
          status: 'current',
        },
        {
          title: '指挥部项目经理终审',
          time: '',
          user: '',
          remark: '待流转',
          status: 'pending',
        },
      ],
    },
    {
      id: 'todo-2',
      type: 'common',
      sourceLabel: '巡检管理',
      category: '巡检管理',
      bizType: '计划复核',
      processName: '巡检计划复核·T2主体周检',
      applicant: '李想',
      dept: '安监部',
      applyTime: '2026-07-19 14:08:42',
      detail: {
        project: 'T2主体结构',
        planName: 'T2主体周检计划',
        summary: '周检计划编制完成，请复核后发布。',
      },
      approvalFlow: [
        { title: '编制计划', time: '2026-07-19 14:08:42', user: '李想', remark: '提交复核', status: 'done' },
        { title: '安监部复核', time: '', user: '当前用户', remark: '待复核', status: 'current' },
      ],
    },
    {
      id: 'todo-penalty-1',
      type: 'penalty',
      sourceLabel: '处罚单',
      category: 'COC调度',
      bizType: '处罚处理',
      bizStatus: PENALTY_TODO_STATUS.PROCESSING,
      penaltyId: 'CF-20260612-001',
      processName: '处罚单处理·塔吊警戒标识不足',
      applicant: 'COC调度室',
      dept: '指挥部调度中心',
      applyTime: '2026-06-12 10:15:00',
      penalty: {
        id: 'CF-20260612-001',
        project: '捷运线延长段',
        unit: '中建三局（捷运线施工总承包）',
        workType: '安全',
        penaltyReason: '安全',
        penaltyContent:
          '3号塔吊作业区警戒标识不足，存在人员误入风险。限期 24 小时内整改，逾期将按合同条款追加处罚并通报。',
        assignee: '李巡检（巡检工程师）',
        deadline: '2026-06-13',
        issueTime: '2026-06-12 10:15',
        source: '调度指挥会议',
        attachments: [],
      },
    },
    {
      id: 'todo-penalty-2',
      type: 'penalty',
      sourceLabel: '处罚单',
      category: 'COC调度',
      bizType: '处罚处理',
      bizStatus: PENALTY_TODO_STATUS.PROCESSING,
      penaltyId: 'CF-PENDING-001',
      processName: '处罚单处理·临边防护缺失限期整改',
      applicant: '监理部',
      dept: '工程监理部',
      applyTime: '2026-06-14 09:20:00',
      penalty: {
        id: 'CF-PENDING-001',
        project: '捷运线延长段',
        unit: '中建三局（捷运线施工总承包）',
        workType: '安全',
        penaltyReason: '安全',
        penaltyContent: '基坑周边临边防护缺失（较大隐患），要求今日内完成加固并提交闭环材料。',
        assignee: '王强（项目经理）',
        deadline: '2026-06-18',
        issueTime: '2026-06-14 09:20',
        source: '监理隐患清单',
        attachments: [],
      },
    },
    {
      id: 'todo-penalty-3',
      type: 'penalty',
      sourceLabel: '处罚单',
      category: 'COC调度',
      bizType: '处罚验收',
      bizStatus: PENALTY_TODO_STATUS.PENDING_ACCEPTANCE,
      penaltyId: 'CF-20260612-002',
      processName: '处罚单验收·混凝土养护措施不到位',
      applicant: '质量部',
      dept: '质量管理部',
      applyTime: '2026-06-12 16:30:00',
      penalty: {
        id: 'CF-20260612-002',
        project: '飞行区5号通道',
        unit: '中建八局',
        workType: '质量',
        penaltyReason: '质量',
        penaltyContent: '浇筑完成后未按规范覆盖养护，存在开裂风险，限期整改。',
        assignee: '陈磊（质量员）',
        deadline: '2026-06-15',
        issueTime: '2026-06-12 10:12',
        penaltyClause: '《文明施工管理办法》处罚条款',
        amount: '2000元',
        reportResult: '已完成覆盖养护整改，提交现场照片及养护记录。',
        acceptor: '陈工（监理工程师）',
        reportTime: '2026-06-12 16:30',
        source: '巡检对讲',
        attachments: [],
        reportAttachments: [],
      },
    },
    {
      id: 'todo-penalty-4',
      type: 'penalty',
      sourceLabel: '处罚单',
      category: 'COC调度',
      bizType: '处罚申诉',
      bizStatus: PENALTY_TODO_STATUS.APPEALING,
      penaltyId: 'CF-20260611-003',
      processName: '处罚单申诉处理·文明施工违规',
      applicant: '中建二局',
      dept: '总包项目部',
      applyTime: '2026-06-12 09:30:00',
      penalty: {
        id: 'CF-20260611-003',
        project: 'T2主体结构',
        unit: '中建二局',
        workType: '安全',
        penaltyReason: '安全',
        penaltyContent: '材料堆放占用消防通道，违反文明施工管理规定，处以违约金并限期清场。',
        assignee: '赵军（安全员）',
        deadline: '2026-06-14',
        issueTime: '2026-06-11 16:40',
        penaltyClause: '《文明施工管理办法》处罚条款',
        amount: '5000元',
        appealReason: '现场已按要求完成清场，处罚依据与事实不符，申请复核减免。',
        appealTime: '2026-06-12 09:30',
        source: '调度指挥会议',
        attachments: [],
        appealAttachments: [],
      },
    },
    {
      id: 'todo-dispatch-hazard-1',
      type: 'dispatch_hazard',
      sourceLabel: '调度隐患',
      category: 'COC调度',
      bizType: DISPATCH_HAZARD_TODO_BIZ.RECTIFY,
      hazardId: 'DHZ-SEED-000-P',
      processName: '调度隐患整改·塔吊作业区警戒标识不足',
      applicant: 'COC调度室',
      dept: '指挥部调度中心',
      applyTime: '2026-06-05 09:10:00',
      hazard: {
        id: 'DHZ-SEED-000-P',
        projectName: 'T2航站区配套',
        hazardType: 'safety',
        description: '塔吊作业区警戒标识不足，临边防护缺失',
        hazardLevel: '一般',
        rectifier: '李工',
        hazardDeadline: '2026-06-08',
        cameraName: '枪机-1',
        cameraLocation: '施工现场东侧',
        sourceType: 'live',
        source: '问题截图',
        uploadTime: '2026-06-05 09:10:00',
        rectifyStatus: '待整改',
      },
      approvalFlow: [],
    },
    {
      id: 'todo-dispatch-hazard-2',
      type: 'dispatch_hazard',
      sourceLabel: '调度隐患',
      category: 'COC调度',
      bizType: DISPATCH_HAZARD_TODO_BIZ.RECTIFY,
      hazardId: 'DHZ-SEED-001-P',
      processName: '调度隐患整改·混凝土浇筑振捣不充分',
      applicant: 'COC调度室',
      dept: '指挥部调度中心',
      applyTime: '2026-06-06 09:11:00',
      hazard: {
        id: 'DHZ-SEED-001-P',
        projectName: 'T1航站区配套',
        hazardType: 'quality',
        description: '混凝土浇筑振捣不充分，存在蜂窝麻面风险',
        hazardLevel: '较大',
        rectifier: '周质量',
        hazardDeadline: '2026-06-09',
        cameraName: '球机-2',
        cameraLocation: '作业面 B 区',
        sourceType: 'playback',
        source: '问题截图',
        uploadTime: '2026-06-06 09:11:00',
        rectifyStatus: '待整改',
      },
      approvalFlow: [],
    },
    {
      id: 'todo-dispatch-hazard-3',
      type: 'dispatch_hazard',
      sourceLabel: '调度隐患',
      category: 'COC调度',
      bizType: DISPATCH_HAZARD_TODO_BIZ.ACCEPT,
      hazardId: 'DHZ-SEED-000-R',
      processName: '调度隐患验收·混凝土浇筑振捣不充分',
      applicant: '王安全',
      dept: '总包项目部',
      applyTime: '2026-06-08 15:10:00',
      hazard: {
        id: 'DHZ-SEED-000-R',
        projectName: 'T2航站区配套',
        hazardType: 'quality',
        description: '混凝土浇筑振捣不充分，存在蜂窝麻面风险',
        hazardLevel: '较大',
        rectifier: '王安全',
        hazardDeadline: '2026-06-12',
        cameraName: '球机-1',
        cameraLocation: '作业面 B 区',
        sourceType: 'playback',
        source: '问题截图',
        uploadTime: '2026-06-08 10:10:00',
        rectifyStatus: '待验收',
        rectifyRemark: '已按规范整改并完成复测，请安质部验收',
        rectifyPhotos: ['T2航站区配套-整改照片-R-1.jpg', 'T2航站区配套-整改照片-R-2.jpg'],
      },
      approvalFlow: [],
    },
    {
      id: 'todo-dispatch-hazard-4',
      type: 'dispatch_hazard',
      sourceLabel: '调度隐患',
      category: 'COC调度',
      bizType: DISPATCH_HAZARD_TODO_BIZ.ACCEPT,
      hazardId: 'DHZ-SEED-001-R',
      processName: '调度隐患验收·材料堆放占用消防通道',
      applicant: '赵班长',
      dept: '总包项目部',
      applyTime: '2026-06-09 15:11:00',
      hazard: {
        id: 'DHZ-SEED-001-R',
        projectName: 'T1航站区配套',
        hazardType: 'safety',
        description: '材料堆放占用消防通道，文明施工不到位',
        hazardLevel: '重大',
        rectifier: '赵班长',
        hazardDeadline: '2026-06-13',
        cameraName: '枪机-2',
        cameraLocation: '临边通道',
        sourceType: 'meeting',
        source: '问题截图',
        uploadTime: '2026-06-09 10:11:00',
        rectifyStatus: '待验收',
        rectifyRemark: '已补齐防护并组织复查，现场照片已上传',
        rectifyPhotos: ['T1航站区配套-整改照片-R-1.jpg', 'T1航站区配套-整改照片-R-2.jpg'],
      },
      approvalFlow: [],
    },
    {
      id: 'todo-dispatch-hazard-5',
      type: 'dispatch_hazard',
      sourceLabel: '调度隐患',
      category: 'COC调度',
      bizType: DISPATCH_HAZARD_TODO_BIZ.RECTIFY,
      hazardId: 'DHZ-SEED-002-P',
      processName: '调度隐患整改·材料堆放占用消防通道',
      applicant: 'COC调度室',
      dept: '指挥部调度中心',
      applyTime: '2026-06-07 09:12:00',
      hazard: {
        id: 'DHZ-SEED-002-P',
        projectName: 'T1土地整备拆除',
        hazardType: 'safety',
        description: '材料堆放占用消防通道，文明施工不到位',
        hazardLevel: '重大',
        rectifier: '赵班长',
        hazardDeadline: '2026-06-10',
        cameraName: '枪机-3',
        cameraLocation: '临边通道',
        sourceType: 'live',
        source: '问题截图',
        uploadTime: '2026-06-07 09:12:00',
        rectifyStatus: '待整改',
      },
      approvalFlow: [],
    },
    {
      id: 'todo-dispatch-hazard-6',
      type: 'dispatch_hazard',
      sourceLabel: '调度隐患',
      category: 'COC调度',
      bizType: DISPATCH_HAZARD_TODO_BIZ.RECTIFY,
      hazardId: 'DHZ-SEED-003-P',
      processName: '调度隐患整改·模板拼缝不严',
      applicant: 'COC调度室',
      dept: '指挥部调度中心',
      applyTime: '2026-06-08 09:13:00',
      hazard: {
        id: 'DHZ-SEED-003-P',
        projectName: '二跑道FOD探测',
        hazardType: 'quality',
        description: '模板拼缝不严，局部漏浆',
        hazardLevel: '一般',
        rectifier: '赵班长',
        hazardDeadline: '2026-06-11',
        cameraName: '球机-4',
        cameraLocation: '屋面施工区',
        sourceType: 'playback',
        source: '问题截图',
        uploadTime: '2026-06-08 09:13:00',
        rectifyStatus: '待整改',
      },
      approvalFlow: [],
    },
    {
      id: 'todo-dispatch-hazard-7',
      type: 'dispatch_hazard',
      sourceLabel: '调度隐患',
      category: 'COC调度',
      bizType: DISPATCH_HAZARD_TODO_BIZ.ACCEPT,
      hazardId: 'DHZ-SEED-002-R',
      processName: '调度隐患验收·模板拼缝不严',
      applicant: '陈技术',
      dept: '总包项目部',
      applyTime: '2026-06-10 15:12:00',
      hazard: {
        id: 'DHZ-SEED-002-R',
        projectName: 'T1土地整备拆除',
        hazardType: 'quality',
        description: '模板拼缝不严，局部漏浆',
        hazardLevel: '一般',
        rectifier: '陈技术',
        hazardDeadline: '2026-06-14',
        cameraName: '球机-3',
        cameraLocation: '地下室负一层',
        sourceType: 'meeting',
        source: '问题截图',
        uploadTime: '2026-06-10 10:12:00',
        rectifyStatus: '待验收',
        rectifyRemark: '已按规范整改并完成复测，请安质部验收',
        rectifyPhotos: ['T1土地整备拆除-整改照片-R-1.jpg', 'T1土地整备拆除-整改照片-R-2.jpg'],
      },
      approvalFlow: [],
    },
  ]
}

const inspectionBaseDetails = {
  巡检: {
    processName: '巡检任务执行·AQXJ20260804001',
    applicant: '系统',
    detail: {
      project: '飞行区跑道延长工程',
      inspectionCategory: '安全',
      planNo: 'AQXJ20260801001',
      taskNo: 'AQXJ20260804001',
      planName: '8月第1周安全巡检',
      planType: '周检',
      source: '任务推送',
      status: '待执行',
      currentNode: '巡检人执行',
      executor: '监理',
      inspector: '监理',
      companions: ['刘工（安全员）'],
      deadline: '2026-08-04 18:00:00',
      inspectionDate: '2026-08-04',
      checkItems: ['临时用电配电箱检查', '临边防护设施检查', '消防器材有效期检查'],
      inspectionResult: '',
      normalPhotos: [],
      hazardItems: [],
      summary: '执行临时用电及临边防护专项巡检，逐项填写检查结果。',
    },
  },
  整改: {
    processName: '隐患整改·ZG202608001',
    applicant: '陈工（监理工程师）',
    detail: {
      project: 'T3航站楼扩建工程',
      inspectionCategory: '安全',
      taskNo: 'AQXJ20260803002',
      rectifyNo: 'ZG202608001',
      currentNode: '整改人整改',
      status: '待整改',
      hazard: '配电箱箱门未可靠接地，临时用电标识缺失。',
      hazardPhotos: ['隐患照片1.jpg'],
      rectifier: '王工（项目安全员）',
      reviewer: '陈工（监理工程师）',
      deadline: '2026-08-05 17:30:00',
      summary: '请补齐接地连接和安全标识，整改后上传现场照片。',
    },
  },
  复查: {
    processName: '隐患整改复查·ZG202608002',
    applicant: '王工（项目安全员）',
    detail: {
      project: '飞行区跑道延长工程',
      inspectionCategory: '质量',
      taskNo: 'ZLXJ20260803003',
      rectifyNo: 'ZG202608002',
      currentNode: '复查人复查',
      status: '待复查',
      hazard: '混凝土结构外观存在蜂窝麻面，修补记录不完整。',
      hazardPhotos: ['混凝土缺陷现场照片.jpg'],
      rectifier: '周工（施工单位）',
      reviewer: '刘工（专业监理）',
      deadline: '2026-08-05 12:00:00',
      rectificationDate: '2026-08-04',
      rectificationPhotos: ['整改完成照片1.jpg', '修补记录.jpg'],
      rectificationNote: '已完成缺陷修补和养护，并补齐施工记录。',
      summary: '整改人已完成修补并提交资料，等待现场复查。',
    },
  },
  审批: {
    processName: '项目经理审批·ZG202607007',
    applicant: '陈工（监理工程师）',
    rectifyId: 'rec-007',
    detail: {
      project: '飞行区跑道延长工程',
      inspectionCategory: '安全',
      taskNo: 'AQXJ20260730001',
      rectifyNo: 'ZG202607007',
      currentNode: '项目经理审批',
      status: '已复查',
      hazard: '临边防护栏杆局部缺失。',
      hazardPhotos: ['临边防护隐患照片.jpg'],
      rectifier: '王工（项目安全员）',
      reviewer: '陈工（监理工程师）',
      manager: '赵经理（项目经理）',
      deadline: '2026-07-31 18:00:00',
      rectificationDate: '2026-07-30',
      rectificationPhotos: ['临边防护整改后照片.jpg'],
      rectificationNote: '已恢复缺失栏杆并加固连接节点。',
      reviewDate: '2026-07-30',
      reviewResult: '通过',
      reviewComment: '整改到位，同意提交项目经理审批。',
      summary: '复查已通过，等待项目经理审批；审批通过后流程关闭。',
    },
  },
}

const inspectionStepMeta = [
  ['巡检', '巡检任务执行', '监理'],
  ['整改', '整改人整改', '整改人'],
  ['复查', '复查人复查', '复查人'],
  ['审批', '项目经理审批', '项目经理'],
  ['关闭', '流程关闭', '系统'],
]

function buildInspectionFlow(bizType, mode = 'todo') {
  const currentIndex = inspectionStepMeta.findIndex(([key]) => key === bizType)
  return inspectionStepMeta.map(([key, title, user], index) => {
    if (mode === 'closed' || (mode === 'done' && index <= currentIndex)) {
      return { title, time: `2026-08-0${Math.min(index + 1, 5)} 10:20:00`, user, remark: '已完成', status: 'done' }
    }
    if (mode === 'done' && index === currentIndex + 1) {
      return { title, time: '', user, remark: '待处理', status: 'current' }
    }
    if (index < currentIndex) {
      return { title, time: `2026-08-0${index + 1} 10:20:00`, user, remark: '已完成', status: 'done' }
    }
    if (index === currentIndex) return { title, time: '', user, remark: '待处理', status: 'current' }
    return { title, time: '', user, remark: '待流转', status: 'pending' }
  })
}

function buildInspectionExample(bizType, listType, index) {
  const base = inspectionBaseDetails[bizType]
  const isClosed = listType === 'done' && bizType === '审批'
  const suffix = listType === 'todo' ? 'todo' : listType === 'done' ? 'done' : 'started'
  const detail = { ...base.detail }
  if (listType === 'done' && bizType === '巡检') {
    Object.assign(detail, {
      inspectionResult: 'normal',
      normalPhotos: ['巡检现场照片1.jpg', '巡检现场照片2.jpg'],
      processResult: '完成巡检',
      inspectionDate: '2026-08-01',
      status: '已完成',
    })
  }
  if (listType === 'done' && bizType === '整改') {
    Object.assign(detail, {
      rectificationDate: '2026-08-02',
      rectificationPhotos: ['配电箱整改照片1.jpg'],
      rectificationNote: '已补设接地连接和临时用电标识。',
      processResult: '提交整改',
      status: '待复查',
    })
  }
  if (listType === 'done' && bizType === '复查') {
    Object.assign(detail, {
      reviewDate: '2026-08-03',
      reviewResult: '通过',
      reviewComment: '现场复查合格，同意提交项目经理审批。',
      processResult: '复查通过',
      status: '已复查',
    })
  }
  if (listType === 'done' && bizType === '审批') {
    Object.assign(detail, {
      status: '已关闭',
      closeDate: '2026-08-04',
      approvalDate: '2026-08-04',
      approvalResult: '通过',
      approvalComment: '复查结论真实有效，同意关闭整改单。',
    })
  }
  return {
    id: `inspection-${suffix}-${index + 1}`,
    type: 'inspection',
    sourceLabel: '巡检管理',
    category: '巡检管理',
    bizType,
    inspectionBizType: bizType,
    rectifyId: base.rectifyId,
    processName: base.processName,
    applicant: listType === 'started' ? '当前用户' : base.applicant,
    dept: '工程管理部',
    applyTime: `2026-08-0${Math.min(index + 1, 4)} 09:30:00`,
    status: listType === 'started' ? (isClosed ? '已通过' : '审批中') : undefined,
    handleTime: listType === 'done' ? `2026-08-0${Math.min(index + 1, 4)} 15:20:00` : undefined,
    handleLabel: listType === 'done' ? `${bizType}已处理` : undefined,
    endTime: isClosed ? '2026-08-04 15:20:00' : '',
    detail,
    approvalFlow: buildInspectionFlow(bizType, isClosed ? 'closed' : listType === 'done' ? 'done' : 'todo'),
  }
}

const inspectionTodoExamples = INSPECTION_BIZ_TYPE_OPTIONS.map((type, index) =>
  buildInspectionExample(type, 'todo', index),
)
const inspectionDoneExamples = INSPECTION_BIZ_TYPE_OPTIONS.map((type, index) =>
  buildInspectionExample(type, 'done', index),
)
const inspectionStartedExamples = INSPECTION_BIZ_TYPE_OPTIONS.map((type, index) =>
  buildInspectionExample(type, 'started', index),
)

/** 人员实名制项目简称（演示口径） */
const LABOR_PROJECT_SHORT_NAME = {
  'p-000': 'T2项目',
  'p-001': 'T1项目',
  'p-003': '三跑道扩建',
  'p-004': '综合配套区',
  'p-005': '捷运延长段',
}

/** 预警中心处理人假数据（直接写姓名） */
const WARNING_CENTER_HANDLER = {
  'w-001': '王建国',
  'w-002': '李安全',
  'w-003': '郑经理',
  'w-004': '陈监理',
  'w-005': '赵敏',
  'w-006': '黄丽',
  'w-008': '刘洋',
  'w-009': '孙涛',
  'w-010': '周杰',
  'w-013': '吴敏',
  'w-017': '马超',
}

function getLaborProjectShortName(projectId) {
  if (!projectId) return '—'
  if (LABOR_PROJECT_SHORT_NAME[projectId]) return LABOR_PROJECT_SHORT_NAME[projectId]
  const full = getProjectLabel(projectId) || ''
  return full.replace(/工程$/, '') || projectId
}

/**
 * 人员实名制预警 → 预警中心归一化条目
 * @param {'pending'|'closed'|'notify'} kind
 */
function buildLaborWarningCenterItem(warningId, kind, extra = {}) {
  const w = getWarningDetail(warningId)
  if (!w) return null
  const projectName = getLaborProjectShortName(w.project_id)
  const description = `${w.rule_label}：${w.name}。${w.trigger_reason}`
  const handler = WARNING_CENTER_HANDLER[warningId] || '李安全'

  if (kind === 'notify') {
    if (w.handle_mode !== '通知') return null
    const read =
      w.status === '已读' || extra.readStatus === '已读' ? '已读' : '未读'
    return {
      id: extra.id || `wc-notify-${warningId}`,
      module: '人员实名',
      projectName,
      description,
      handler,
      warnType: '通知',
      status: read,
      time: w.triggered_at,
      laborWarningId: w.id,
      readStatus: read,
      dismissed: false,
    }
  }

  if (w.handle_mode === '通知') return null
  if (kind === 'pending') {
    if (w.status !== '待处理') return null
    if (w.handle_mode !== '手动处理' && w.handle_mode !== '系统自动关闭') return null
    return {
      id: `wc-task-${warningId}`,
      module: '人员实名',
      projectName,
      description,
      handler,
      warnType: '处置任务',
      status: '待处理',
      time: w.triggered_at,
      laborWarningId: w.id,
      dismissed: false,
    }
  }

  // closed
  if (w.status !== '已关闭') return null
  const closeRec = [...(w.disposal_records || [])].reverse().find((r) => r.type === 'close' || r.type === 'auto_close')
  const closeHandler =
    closeRec?.operator && closeRec.operator !== '系统' ? closeRec.operator : handler
  return {
    id: `wc-task-done-${warningId}`,
    module: '人员实名',
    projectName,
    description,
    handler: closeHandler,
    warnType: '处置任务',
    status: '已关闭',
    time: w.closed_at || w.triggered_at,
    laborWarningId: w.id,
    dismissed: false,
  }
}

/**
 * 预警中心种子：任务类（待处理/已关闭）+ 通知类（未读/已读）
 * 不含「任务触发同步通知」重复条，避免与任务类双挂
 */
export function seedLaborWarningCenter() {
  const pendingIds = ['w-002', 'w-005', 'w-009', 'w-017', 'w-004', 'w-008']
  const closedIds = ['w-001', 'w-003']
  const notifySpecs = [
    { id: 'wc-notify-w-006', warningId: 'w-006', readStatus: '未读' },
    { id: 'wc-notify-w-010', warningId: 'w-010', readStatus: '未读' },
    { id: 'wc-notify-w-013', warningId: 'w-013', readStatus: '已读' },
  ]
  return [
    ...pendingIds.map((id) => buildLaborWarningCenterItem(id, 'pending')),
    ...closedIds.map((id) => buildLaborWarningCenterItem(id, 'closed')),
    ...notifySpecs.map((s) =>
      buildLaborWarningCenterItem(s.warningId, 'notify', { id: s.id, readStatus: s.readStatus }),
    ),
  ].filter(Boolean)
}

/**
 * 人员实名制预警 → 个人中心待办/已办（已迁出至预警中心，保留函数供兼容，默认不再写入待办）
 * @param {'todo'|'done'} listType
 */
function buildLaborWarningProcess(warningId, listType = 'todo') {
  const w = getWarningDetail(warningId)
  if (!w) return null
  if (w.handle_mode === '通知') return null
  if (listType === 'todo') {
    if (w.status !== '待处理') return null
    if (w.handle_mode !== '手动处理' && w.handle_mode !== '系统自动关闭') return null
  }
  if (listType === 'done') {
    if (w.handle_mode !== '手动处理' || w.status !== '已关闭') return null
  }

  const project = getProjectLabel(w.project_id) || w.project_id || '—'
  const timeline = (w.disposal_records || []).map((r) => ({
    title: disposalTypeLabels[r.type] || r.type,
    time: r.time,
    user: r.operator,
    remark: r.content + (r.attachments?.length ? `（附件：${r.attachments.join('、')}）` : ''),
    status: 'done',
  }))
  if (listType === 'todo') {
    const isAuto = w.handle_mode === '系统自动关闭'
    timeline.push({
      title: isAuto ? '引导处理' : '责任人处置',
      time: '',
      user: '当前用户',
      remark: isAuto
        ? '待前往人员实名制引导处理（条件满足后次日自动关闭）'
        : '待处理并关闭（预警清单详情）',
      status: 'current',
    })
  }
  return {
    id: `${listType === 'done' ? 'done' : 'todo'}-labor-warning-${warningId}`,
    type: 'labor_warning',
    sourceLabel: '人员实名制',
    category: '人员实名',
    bizType: '预警处置',
    laborWarningId: w.id,
    processName: `人员预警·${w.rule_label}（${w.warning_no}）`,
    applicant: '系统',
    dept: '人员实名制管理',
    applyTime: w.triggered_at,
    handleTime: listType === 'done' ? w.closed_at || w.triggered_at : undefined,
    handleLabel: listType === 'done' ? '处置并关闭' : undefined,
    detail: {
      project,
      warningNo: w.warning_no,
      ruleLabel: w.rule_label,
      ruleKey: w.rule_key,
      status: w.status,
      handleMode: w.handle_mode,
      triggerReason: w.trigger_reason,
      name: w.name,
      personnelNo: w.personnel_no,
      personnelId: w.personnel_id,
      unitName: w.unit_name,
      workType: w.work_type,
      currentLevel: w.current_level,
      closedAt: w.closed_at,
      summary: w.trigger_reason,
      disposalTimeline: w.disposal_records || [],
    },
    approvalFlow: timeline,
  }
}

/**
 * @deprecated 人员预警已迁至预警中心；保留空实现兼容旧调用
 */
export function seedLaborWarningTodos() {
  return []
}

/** @deprecated 人员预警已迁至预警中心 */
export function seedLaborWarningDone() {
  return []
}

/**
 * @deprecated 人员预警通知已迁至预警中心；保留空实现兼容旧调用
 */
export function seedLaborWarningNotices() {
  return []
}

/** 质量验评专用待办（置顶；与业务任务 id 对齐，可点处理进审批/整改页） */
export function seedQmInspectTodos() {
  return [
    {
      id: 'todo-qm-1',
      type: 'qm_inspect',
      sourceLabel: '质量验评',
      category: '质量验评',
      bizType: '检验批验收',
      processName: '检验批验收审批·YS-2026-001 三层梁板钢筋',
      applicant: '张工',
      dept: '总包项目部',
      applyTime: '2026-07-15 10:30:00',
      qmTaskId: 'tk-001',
      approvePath: '/qm/inspect/batch/approve',
      detail: {
        project: 'T2航站区配套',
        taskNo: 'YS-2026-001',
        nodeName: '三层梁板钢筋检验批-轴1~5',
        specialty: '结构',
        summary: '检验批已提交报验，请按本系统配置的审批链完成审批。',
      },
      approvalFlow: [
        { title: '施工报验', time: '2026-07-15 10:30:00', user: '张工', remark: '提交报验', status: 'done' },
        { title: '一级审批人', time: '', user: '当前用户', remark: '待审批', status: 'current' },
        { title: '二级审批人', time: '', user: '—', remark: '', status: 'pending' },
      ],
    },
    {
      id: 'todo-qm-2',
      type: 'qm_inspect',
      sourceLabel: '质量验评',
      category: '质量验评',
      bizType: '单位工程验收',
      processName: '单位工程验收审批·DW-2026-002',
      applicant: '李工',
      dept: '总包项目部',
      applyTime: '2026-07-16 14:20:00',
      qmTaskId: 'tk-unit-2',
      approvePath: '/qm/inspect/unit/approve',
      detail: {
        project: 'T2航站区配套',
        taskNo: 'DW-2026-002',
        nodeName: '机电单位工程',
        specialty: '机电',
        summary: '单位工程验收已提交，等待审批。',
      },
      approvalFlow: [
        { title: '施工报验', time: '2026-07-16 14:20:00', user: '李工', remark: '提交报验', status: 'done' },
        { title: '一级审批人', time: '', user: '当前用户', remark: '待审批', status: 'current' },
      ],
    },
    {
      id: 'todo-qm-3',
      type: 'qm_inspect',
      sourceLabel: '质量验评',
      category: '质量验评',
      bizType: '分项工程验收',
      processName: '分项工程验收审批·YS-2026-007 模板分项',
      applicant: '王工',
      dept: '总包项目部',
      applyTime: '2026-07-17 09:10:00',
      qmTaskId: 'tk-007',
      approvePath: '/qm/inspect/part/approve',
      detail: {
        project: 'T2航站区配套',
        taskNo: 'YS-2026-007',
        nodeName: '模板分项工程',
        specialty: '结构',
        summary: '分项工程已报验，请在个人中心完成审批。',
      },
      approvalFlow: [
        { title: '施工报验', time: '2026-07-17 09:10:00', user: '王工', remark: '提交报验', status: 'done' },
        { title: '一级审批人', time: '', user: '当前用户', remark: '待审批', status: 'current' },
      ],
    },
    {
      id: 'todo-qm-rectify-1',
      type: 'qm_rectify',
      sourceLabel: '质量验评',
      category: '质量验评',
      bizType: '整改复验',
      processName: '验评整改·ZG-2026-002 柱钢筋机械连接',
      applicant: '张工',
      dept: '总包项目部',
      applyTime: '2026-07-12 17:00:00',
      qmRectifyId: 'rc-002',
      qmTaskId: 'tk-003',
      rectifyPath: '/qm/inspect/rectify/detail',
      detail: {
        project: 'T2航站区配套',
        taskNo: 'YS-2026-003',
        rectifyNo: 'ZG-2026-002',
        nodeName: '柱钢筋机械连接抽检',
        specialty: '结构',
        summary: '审批驳回后已生成整改单，请填写整改措施、上传整改后影像并提交复验。',
      },
      approvalFlow: [
        { title: '审批驳回', time: '2026-07-12 17:00:00', user: '王监理', remark: '柱钢筋机械连接抽检不合格', status: 'done' },
        { title: '整改执行', time: '', user: '当前用户', remark: '待提交整改', status: 'current' },
        { title: '复验判定', time: '', user: '监理工程师', remark: '', status: 'pending' },
      ],
    },
  ]
}

export function seedQmInspectDone() {
  return [
    {
      id: 'done-qm-1',
      type: 'qm_inspect',
      sourceLabel: '质量验评',
      category: '质量验评',
      bizType: '检验批验收',
      processName: '检验批验收审批·YS-2026-008（已办）',
      applicant: '张工',
      dept: '总包项目部',
      applyTime: '2026-07-08 10:00:00',
      handleTime: '2026-07-09 16:20:00',
      handleLabel: '审批通过',
      qmTaskId: 'tk-008',
      approvePath: '/qm/inspect/batch/approve',
      detail: {
        project: 'T2航站区配套',
        taskNo: 'YS-2026-008',
        summary: '检验批审批已通过（演示已办）。',
      },
      approvalFlow: [
        { title: '施工报验', time: '2026-07-08 10:00:00', user: '张工', remark: '提交', status: 'done' },
        { title: '一级审批人', time: '2026-07-09 16:20:00', user: '当前用户', remark: '通过', status: 'done' },
      ],
    },
  ]
}

export function seedQmInspectStarted() {
  return [
    {
      id: 'start-qm-1',
      type: 'qm_inspect',
      sourceLabel: '质量验评',
      category: '质量验评',
      bizType: '检验批验收',
      processName: '检验批验收·YS-2026-001（我发起）',
      status: '审批中',
      applicant: '当前用户',
      dept: '总包项目部',
      applyTime: '2026-07-15 10:30:00',
      endTime: '',
      qmTaskId: 'tk-001',
      detail: {
        project: 'T2航站区配套',
        taskNo: 'YS-2026-001',
        summary: '本人提交的检验批报验，审批进行中。',
      },
      approvalFlow: [
        { title: '施工报验', time: '2026-07-15 10:30:00', user: '当前用户', remark: '已提交', status: 'done' },
        { title: '一级审批人', time: '', user: '审批人', remark: '待审批', status: 'current' },
      ],
    },
  ]
}

/** 共享响应式：预警中心（人员实名制任务类 + 通知类） */
export const personalWarningCenterStore = reactive({
  items: seedLaborWarningCenter(),
})

/** 共享响应式：待办 / 已办（人员预警已迁出至预警中心） */
export const personalTodoStore = reactive({
  todos: [
    ...seedQmInspectTodos(),
    ...inspectionTodoExamples,
    ...seedTodos(),
  ],
  done: [
    ...seedQmInspectDone(),
    ...inspectionDoneExamples,
    {
      id: 'done-1',
      type: 'common',
      sourceLabel: '巡检管理',
      category: '巡检管理',
      bizType: '整改验收',
      processName: '隐患整改验收·塔吊警戒区',
      applicant: '王强',
      dept: '总包项目部',
      applyTime: '2026-07-10 11:20:00',
      handleTime: '2026-07-11 16:45:22',
      handleLabel: '验收通过',
      detail: {
        project: '捷运线延长段',
        nodeName: '3号塔吊警戒区隐患整改',
        summary: '警戒标识已补齐并完成现场复核，申请验收关闭。',
      },
      approvalFlow: [
        { title: '提交整改验收', time: '2026-07-10 11:20:00', user: '王强', remark: '提交验收申请', status: 'done' },
        { title: '安监验收', time: '2026-07-11 16:45:22', user: '当前用户', remark: '现场复核通过', status: 'done' },
        { title: '办结关闭', time: '2026-07-11 16:45:22', user: '系统', remark: '流程已关闭', status: 'done' },
      ],
    },
    {
      id: 'done-dispatch-hazard-1',
      type: 'dispatch_hazard',
      sourceLabel: '调度隐患',
      category: 'COC调度',
      bizType: DISPATCH_HAZARD_TODO_BIZ.ACCEPT,
      hazardId: 'DHZ-SEED-000-C',
      processName: '调度隐患验收·材料堆放占用消防通道',
      applicant: '赵班长',
      dept: '总包项目部',
      applyTime: '2026-06-09 14:10:00',
      handleTime: '2026-06-10 10:30:00',
      handleLabel: '验收通过',
      hazard: {
        id: 'DHZ-SEED-000-C',
        projectName: 'T2航站区配套',
        hazardType: 'safety',
        description: '材料堆放占用消防通道，文明施工不到位',
        hazardLevel: '重大',
        rectifier: '赵班长',
        hazardDeadline: '2026-06-11',
        cameraName: '枪机-1',
        cameraLocation: '临边通道',
        sourceType: 'meeting',
        source: '问题截图',
        uploadTime: '2026-06-08 11:10:00',
        rectifyStatus: '已关闭',
        rectifyRemark: '已补齐防护并组织复查，现场照片已上传',
        rectifyPhotos: ['T2航站区配套-整改照片-C-1.jpg', 'T2航站区配套-整改照片-C-2.jpg'],
      },
      approvalFlow: [],
    },
    {
      id: 'done-dispatch-hazard-2',
      type: 'dispatch_hazard',
      sourceLabel: '调度隐患',
      category: 'COC调度',
      bizType: DISPATCH_HAZARD_TODO_BIZ.RECTIFY,
      hazardId: 'DHZ-SEED-001-C',
      processName: '调度隐患整改·防水卷材搭接宽度不足',
      applicant: '李工',
      dept: '总包项目部',
      applyTime: '2026-06-10 09:11:00',
      handleTime: '2026-06-10 16:20:00',
      handleLabel: '提交整改',
      hazard: {
        id: 'DHZ-SEED-001-C',
        projectName: 'T1航站区配套',
        hazardType: 'quality',
        description: '防水卷材搭接宽度不足，阴阳角未做附加层',
        hazardLevel: '重大',
        rectifier: '李工',
        hazardDeadline: '2026-06-14',
        cameraName: '球机-2',
        cameraLocation: '地下室负一层',
        sourceType: 'live',
        source: '问题截图',
        uploadTime: '2026-06-09 11:11:00',
        rectifyStatus: '已关闭',
        rectifyRemark: '已按规范整改并完成复测，请安质部验收',
        rectifyPhotos: ['T1航站区配套-整改照片-C-1.jpg', 'T1航站区配套-整改照片-C-2.jpg'],
      },
      approvalFlow: [],
    },
    {
      id: 'done-2',
      type: 'common',
      sourceLabel: '质量验评',
      category: '质量验评',
      bizType: '计划变更',
      processName: '验收计划变更·空侧捷运线',
      applicant: '赵敏',
      dept: '计划部',
      applyTime: '2026-07-12 08:15:33',
      handleTime: '2026-07-12 17:02:10',
      handleLabel: '审批通过',
      detail: {
        project: '空侧捷运线',
        planName: 'YS-2026-015 验收计划',
        summary: '因工序交叉调整，申请将计划完成日期顺延 3 天。',
      },
      approvalFlow: [
        { title: '提交变更', time: '2026-07-12 08:15:33', user: '赵敏', remark: '提交计划变更', status: 'done' },
        { title: '计划部复核', time: '2026-07-12 17:02:10', user: '当前用户', remark: '同意变更', status: 'done' },
      ],
    },
  ],
})

/** 兼容旧引用 */
export const personalTodos = personalTodoStore.todos
export const personalDone = personalTodoStore.done

/** 我发起的 */
export const personalStarted = reactive([
  ...seedQmInspectStarted(),
  ...inspectionStartedExamples,
  {
    id: 'start-1',
    type: 'common',
    sourceLabel: '施工填报',
    category: 'COC调度',
    bizType: '作业填报',
    processName: '每日施工作业填报确认',
    status: '审批中',
    applicant: '当前用户',
    dept: '工程管理部',
    applyTime: '2026-07-19 08:00:12',
    endTime: '',
    detail: {
      project: 'T2主体结构',
      summary: '2026-07-19 日施工作业内容确认，请项目经理审核。',
    },
    approvalFlow: [
      { title: '提交填报', time: '2026-07-19 08:00:12', user: '当前用户', remark: '已提交', status: 'done' },
      { title: '项目经理确认', time: '', user: '李经理', remark: '待确认', status: 'current' },
    ],
  },
  {
    id: 'start-2',
    type: 'common',
    sourceLabel: '巡检管理',
    category: '巡检管理',
    bizType: '整改申请',
    processName: '安全隐患整改申请·电缆敷设',
    status: '已通过',
    applicant: '当前用户',
    dept: '安监部',
    applyTime: '2026-07-08 10:22:05',
    endTime: '2026-07-09 15:40:18',
    detail: {
      project: '飞行区供电配套',
      summary: '电缆敷设区临边防护缺失，申请下发整改并跟踪闭环。',
    },
    approvalFlow: [
      { title: '提交申请', time: '2026-07-08 10:22:05', user: '当前用户', remark: '提交整改申请', status: 'done' },
      { title: '安监审批', time: '2026-07-09 11:10:00', user: '安监负责人', remark: '同意下发', status: 'done' },
      { title: '办结', time: '2026-07-09 15:40:18', user: '系统', remark: '已通过', status: 'done' },
    ],
  },
])

/** 热更新/办理后若缺失，补回质量验评 / 人员实名制预警假数据（不重复插入） */
export function ensureQmPersonalCenterSeeds() {
  for (const row of [...seedQmInspectTodos()].reverse()) {
    if (!personalTodoStore.todos.some((t) => t.id === row.id)) {
      personalTodoStore.todos.unshift(row)
    }
  }
  for (const row of seedQmInspectDone()) {
    if (!personalTodoStore.done.some((t) => t.id === row.id)) {
      personalTodoStore.done.unshift(row)
    }
  }
  for (const row of seedQmInspectStarted()) {
    if (!personalStarted.some((t) => t.id === row.id)) {
      personalStarted.unshift(row)
    }
  }
}

/**
 * 补齐预警中心种子（热更新/办理后缺失时不重复插入；已有条目同步描述/项目简称等展示字段）
 */
export function ensureLaborWarningCenterSeeds() {
  for (const row of [...seedLaborWarningCenter()].reverse()) {
    const existing = personalWarningCenterStore.items.find((t) => t.id === row.id)
    if (!existing) {
      personalWarningCenterStore.items.unshift(row)
      continue
    }
    existing.module = row.module
    existing.projectName = row.projectName
    existing.description = row.description
    existing.warnType = row.warnType
    // 未关闭前，同步演示处理人姓名
    if (existing.status === '待处理' || existing.status === '未读' || existing.status === '已读') {
      if (existing.status !== '已读' || existing.warnType === '通知') {
        existing.handler = row.handler
      }
    }
    // 兼容旧种子状态名
    if (existing.status === '待处置') existing.status = '待处理'
    if (existing.status === '已处置') existing.status = '已关闭'
  }
}

/** @deprecated 请改用 ensureLaborWarningCenterSeeds */
export function ensureLaborPersonalCenterSeeds() {
  ensureLaborWarningCenterSeeds()
}

/** 预警中心列表（未消除） */
export function listPersonalWarningCenter() {
  ensureLaborWarningCenterSeeds()
  return personalWarningCenterStore.items.filter((row) => !row.dismissed)
}

/** 批量已读：仅「通知」且状态为「未读」的条目（同步业务预警） */
export function markWarningCenterRead(ids) {
  const idSet = new Set((ids || []).map(String))
  let n = 0
  for (const row of personalWarningCenterStore.items) {
    if (!idSet.has(String(row.id))) continue
    if (row.dismissed) continue
    if (row.warnType !== '通知') continue
    if (row.status !== '未读') continue
    row.status = '已读'
    row.readStatus = '已读'
    if (row.laborWarningId) markNotifyWarningRead(row.laborWarningId)
    n += 1
  }
  return n
}

/**
 * 批量处置预警：弹窗填报说明+附件后，
 * 仅「待处理」处置任务关闭为「已关闭」（同步业务预警，不软删）
 */
export function batchDisposeWarningCenter(ids, { content, attachments = [], operator = '张明' } = {}) {
  const idSet = new Set((ids || []).map(String))
  const targets = personalWarningCenterStore.items.filter(
    (row) =>
      idSet.has(String(row.id)) &&
      !row.dismissed &&
      row.warnType === '处置任务' &&
      row.status === '待处理' &&
      row.laborWarningId,
  )
  if (!targets.length) return 0

  const warningIds = targets.map((row) => row.laborWarningId)
  batchDisposeWarnings(warningIds, { content, attachments, operator })

  const now = new Date().toLocaleString('zh-CN', { hour12: false })
  let n = 0
  for (const row of targets) {
    row.status = '已关闭'
    row.handler = operator
    row.time = now
    n += 1
  }
  return n
}

/** @deprecated 请改用 batchDisposeWarningCenter */
export function dismissWarningCenter(ids) {
  return batchDisposeWarningCenter(ids, { content: '批量处置并关闭' })
}

/**
 * 业务侧处置关闭后，同步预警中心任务类为「已关闭」
 */
export function markWarningCenterDisposed(laborWarningId, handler = '张明') {
  if (!laborWarningId) return null
  const now = new Date().toLocaleString('zh-CN', { hour12: false })
  const row = personalWarningCenterStore.items.find(
    (item) =>
      !item.dismissed &&
      item.laborWarningId === laborWarningId &&
      item.warnType === '处置任务' &&
      (item.status === '待处理' || item.status === '待处置'),
  )
  if (!row) return null
  row.status = '已关闭'
  row.handler = handler || '张明'
  row.time = now
  return row
}

/** 抄送我的 */
export const personalCc = reactive([
  {
    id: 'cc-1',
    type: 'qm_inspect',
    sourceLabel: '质量验评',
    category: '质量验评',
    bizType: '分部验收',
    processName: '分部工程验收·主体结构',
    projectName: 'T2航站区配套',
    applicant: '陈志明',
    dept: '工程管理部',
    readStatus: '未读',
    applyTime: '2026-07-17 13:26:40',
    endTime: '',
    qmTaskId: 'tk-001',
    approvePath: '/qm/inspect/batch/approve',
    detail: {
      project: 'T2航站区配套',
      nodeName: '主体结构分部验收',
      specialty: '结构',
      summary: '主体结构分部验收材料已齐备，抄送相关责任人知悉。',
    },
    approvalFlow: [
      { title: '提交验收', time: '2026-07-17 13:26:40', user: '陈志明', remark: '提交分部验收', status: 'done' },
      { title: '监理组织验收', time: '', user: '监理工程师', remark: '进行中', status: 'current' },
      { title: '建设单位确认', time: '', user: '建设方代表', remark: '', status: 'pending' },
    ],
  },
  {
    id: 'cc-2',
    type: 'common',
    sourceLabel: '巡检管理',
    category: '巡检管理',
    bizType: '任务抄送',
    processName: '夜间巡检任务抄送',
    projectName: '空侧捷运线',
    applicant: '刘海峰',
    dept: '安监部',
    readStatus: '已读',
    applyTime: '2026-07-15 22:10:00',
    endTime: '2026-07-16 06:05:00',
    detail: {
      project: '空侧捷运线',
      planName: '夜间巡检任务 2026-07-15',
      summary: '夜间巡检已完成，重点关注临边防护与临时用电，抄送相关责任人。',
    },
    approvalFlow: [
      { title: '下发巡检任务', time: '2026-07-15 22:10:00', user: '刘海峰', remark: '抄送知悉', status: 'done' },
      { title: '巡检执行', time: '2026-07-16 03:20:00', user: '巡检组', remark: '已完成巡检', status: 'done' },
      { title: '任务关闭', time: '2026-07-16 06:05:00', user: '系统', remark: '已办结', status: 'done' },
    ],
  },
])

export function findPersonalTodo(id) {
  return personalTodoStore.todos.find((item) => item.id === id) || null
}

/** 按来源查找个人中心流程记录 */
export function findPersonalProcess(id, from = 'todo') {
  const key = String(id || '')
  if (!key) return null
  if (from === 'done') return personalTodoStore.done.find((item) => item.id === key) || null
  if (from === 'started') return personalStarted.find((item) => item.id === key) || null
  if (from === 'cc') return personalCc.find((item) => item.id === key) || null
  return findPersonalTodo(key)
}

export function finishPersonalTodo(id, handleLabel) {
  const idx = personalTodoStore.todos.findIndex((item) => item.id === id)
  if (idx < 0) return null
  const [row] = personalTodoStore.todos.splice(idx, 1)
  const now = new Date().toLocaleString('zh-CN', { hour12: false })
  const flow = row.type === 'inspection' && Array.isArray(row.approvalFlow)
    ? row.approvalFlow.map((step) => ({ ...step }))
    : Array.isArray(row.approvalFlow)
    ? row.approvalFlow.map((step) =>
        step.status === 'current' || step.status === 'pending'
          ? {
              ...step,
              status: 'done',
              time: step.time || now,
              user: step.user || '当前用户',
              remark: step.remark || handleLabel || '已处理',
            }
          : step,
      )
    : row.type === 'penalty'
      ? [
          ...buildPenaltyApprovalFlow(row)
            .filter((s) => s.status === 'done')
            .map((s) => ({ ...s })),
          {
            title: handleLabel || '已处理',
            time: now,
            user: '当前用户',
            remark: handleLabel || '',
            status: 'done',
          },
          { title: '办结关闭', time: now, user: '系统', remark: '流程已关闭', status: 'done' },
        ]
      : row.type === 'dispatch_hazard'
        ? [
            ...buildDispatchHazardApprovalFlow(row)
              .filter((s) => s.status === 'done')
              .map((s) => ({ ...s })),
            {
              title: handleLabel || '已处理',
              time: now,
              user: '当前用户',
              remark: handleLabel || '',
              status: 'done',
            },
            { title: '办结关闭', time: now, user: '系统', remark: '流程已关闭', status: 'done' },
          ]
      : []
  personalTodoStore.done.unshift({
    id: `done-${row.id}-${Date.now()}`,
    type: row.type || 'common',
    sourceLabel: row.sourceLabel,
    category: row.category,
    bizType: row.bizType || row.inspectionBizType,
    processName: row.processName,
    applicant: row.applicant,
    dept: row.dept,
    applyTime: row.applyTime,
    handleTime: now,
    handleLabel,
    detail: row.detail,
    penalty: row.penalty,
    penaltyId: row.penaltyId,
    bizStatus: row.bizStatus,
    brandApplicationId: row.brandApplicationId,
    brandNode: row.brandNode,
    brandCandidates: row.brandCandidates,
    sampleBizType: row.sampleBizType,
    sampleApplicationId: row.sampleApplicationId,
    sampleNode: row.sampleNode,
    asbuiltAcceptanceId: row.asbuiltAcceptanceId,
    asbuiltNode: row.asbuiltNode,
    matEntryId: row.matEntryId,
    eqEntryId: row.eqEntryId,
    laborWarningId: row.laborWarningId,
    inspectionBizType: row.inspectionBizType,
    rectifyId: row.rectifyId,
    approvalFlow: flow,
  })
  return row
}

/** —— 品牌报审：审批入口仅个人中心待办 —— */
let brandTodoSeq = 10

function removeOpenBrandTodos(applicationId, { onlyNode } = {}) {
  for (let i = personalTodoStore.todos.length - 1; i >= 0; i -= 1) {
    const t = personalTodoStore.todos[i]
    if (t.type !== 'brand' || t.brandApplicationId !== applicationId) continue
    if (onlyNode && t.brandNode !== onlyNode) continue
    personalTodoStore.todos.splice(i, 1)
  }
}

function buildBrandTodo(payload) {
  const node = payload.brandNode === 'pm' ? 'pm' : 'supervisor'
  const isPm = node === 'pm'
  brandTodoSeq += 1
  return {
    id: `todo-brand-${brandTodoSeq}`,
    type: 'brand',
    sourceLabel: '品牌报审',
    category: '品牌报审',
    bizType: isPm ? '终审' : '监理审',
    brandApplicationId: payload.applicationId,
    brandNode: node,
    processName: isPm
      ? `品牌报审终审·${payload.materialName}（${payload.applicationId}）`
      : `品牌报审审批·${payload.materialName}（${payload.applicationId}）`,
    applicant: payload.applicantName || '当前用户',
    dept: payload.dept || '总包项目部',
    applyTime: payload.applyTime || '',
    detail: {
      project: payload.projectLabel || payload.projectId || '—',
      applicationId: payload.applicationId,
      materialName: payload.materialName || '—',
      materialType: payload.materialType || '—',
      specs: payload.specsText || '—',
      brands: payload.brandsText || '—',
      currentNode: isPm ? '待项目经理审' : '待监理审',
      usePart: payload.usePart || '',
    },
    brandCandidates: payload.candidates || [],
    approvalFlow: isPm
      ? [
          {
            title: '施工提交报审',
            time: payload.applyTime || '',
            user: payload.applicantName || '施工',
            remark: '直接提交',
            status: 'done',
          },
          {
            title: '监理审批',
            time: payload.supervisorTime || '',
            user: payload.supervisorName || '监理',
            remark: '同意报审',
            status: 'done',
          },
          {
            title: '项目经理终审',
            time: '',
            user: '当前用户',
            remark: '待选定入选品牌',
            status: 'current',
          },
        ]
      : [
          {
            title: '施工提交报审',
            time: payload.applyTime || '',
            user: payload.applicantName || '施工',
            remark: '直接提交，进入审批中',
            status: 'done',
          },
          {
            title: '监理审批',
            time: '',
            user: '当前用户',
            remark: '待审批',
            status: 'current',
          },
          {
            title: '项目经理终审',
            time: '',
            user: '项目经理',
            remark: '待流转',
            status: 'pending',
          },
        ],
  }
}

/** 新建/重提：生成监理待办（会清掉该单未办品牌待办） */
export function createBrandSupervisorTodo(payload) {
  if (!payload?.applicationId) return null
  removeOpenBrandTodos(payload.applicationId)
  const row = buildBrandTodo({ ...payload, brandNode: 'supervisor' })
  personalTodoStore.todos.unshift(row)
  return row
}

/** 监理同意后：生成项目经理终审待办（不清监理待办，由个人中心办结） */
export function createBrandPmTodo(payload) {
  if (!payload?.applicationId) return null
  removeOpenBrandTodos(payload.applicationId, { onlyNode: 'pm' })
  const row = buildBrandTodo({ ...payload, brandNode: 'pm' })
  personalTodoStore.todos.unshift(row)
  return row
}

/** 撤回等：丢弃该报审单未办待办 */
export function discardBrandTodos(applicationId) {
  if (!applicationId) return
  removeOpenBrandTodos(applicationId)
}

/** —— 样板管理：个人中心待办 + 模块内审批列表 —— */
let sampleTodoSeq = 20

function removeOpenSampleTodos(bizType, applicationId, { onlyNode } = {}) {
  for (let i = personalTodoStore.todos.length - 1; i >= 0; i -= 1) {
    const t = personalTodoStore.todos[i]
    if (t.type !== 'sample') continue
    if (t.sampleBizType !== bizType || t.sampleApplicationId !== applicationId) continue
    if (onlyNode && t.sampleNode !== onlyNode) continue
    personalTodoStore.todos.splice(i, 1)
  }
}

function buildSampleTodo(payload) {
  const node = payload.sampleNode === 'pm' ? 'pm' : 'supervisor'
  const isPm = node === 'pm'
  const isMaterial = payload.bizType === 'material'
  const isProcess = payload.bizType === 'process'
  const bizLabel = isMaterial ? '材料定样' : '工序样板'
  sampleTodoSeq += 1

  const supervisorFlow = isProcess
    ? [
        {
          title: '施工提交',
          time: payload.applyTime || '',
          user: payload.applicantName || '施工',
          remark: '直接提交',
          status: 'done',
        },
        {
          title: '监理审批（终审）',
          time: '',
          user: '当前用户',
          remark: '待审批',
          status: 'current',
        },
      ]
    : [
        {
          title: '施工提交',
          time: payload.applyTime || '',
          user: payload.applicantName || '施工',
          remark: '直接提交',
          status: 'done',
        },
        {
          title: '监理审批',
          time: '',
          user: '当前用户',
          remark: '待审批',
          status: 'current',
        },
        {
          title: '项目经理终审',
          time: '',
          user: '项目经理',
          remark: '待流转',
          status: 'pending',
        },
      ]

  return {
    id: `todo-sample-${sampleTodoSeq}`,
    type: 'sample',
    sourceLabel: '样板管理',
    category: '样板管理',
    bizType: bizLabel,
    sampleBizType: payload.bizType,
    sampleApplicationId: payload.applicationId,
    sampleNode: node,
    processName: isPm
      ? `${bizLabel}终审·${payload.title}（${payload.applicationId}）`
      : `${bizLabel}审批·${payload.title}（${payload.applicationId}）`,
    applicant: payload.applicantName || '当前用户',
    dept: payload.dept || '总包项目部',
    applyTime: payload.applyTime || '',
    detail: {
      project: payload.projectLabel || payload.projectId || '—',
      applicationId: payload.applicationId,
      bizType: bizLabel,
      title: payload.title || '—',
      usePart: payload.usePart || '—',
      currentNode: isPm ? '待项目经理审' : isProcess ? '待监理审（终审）' : '待监理审',
      briefing: payload.briefing || '',
      indicatorDesc: payload.indicatorDesc || payload.briefing || '',
      supplier: payload.supplier || '',
      effectImages: payload.effectImages || [],
      approvalFiles: payload.approvalFiles || [],
    },
    approvalFlow: isPm
      ? [
          {
            title: '施工提交',
            time: payload.applyTime || '',
            user: payload.applicantName || '施工',
            remark: '直接提交',
            status: 'done',
          },
          {
            title: '监理审批',
            time: payload.supervisorTime || '',
            user: payload.supervisorName || '监理',
            remark: '同意',
            status: 'done',
          },
          {
            title: '项目经理终审',
            time: '',
            user: '当前用户',
            remark: '待审批',
            status: 'current',
          },
        ]
      : supervisorFlow,
  }
}

export function createSampleSupervisorTodo(payload) {
  if (!payload?.applicationId || !payload?.bizType) return null
  removeOpenSampleTodos(payload.bizType, payload.applicationId)
  const row = buildSampleTodo({ ...payload, sampleNode: 'supervisor' })
  personalTodoStore.todos.unshift(row)
  return row
}

export function createSamplePmTodo(payload) {
  if (!payload?.applicationId || !payload?.bizType) return null
  // 监理节点已办结：清掉该单监理待办，再挂项目经理待办
  removeOpenSampleTodos(payload.bizType, payload.applicationId, { onlyNode: 'supervisor' })
  removeOpenSampleTodos(payload.bizType, payload.applicationId, { onlyNode: 'pm' })
  const row = buildSampleTodo({ ...payload, sampleNode: 'pm' })
  personalTodoStore.todos.unshift(row)
  return row
}

export function discardSampleTodos(bizType, applicationId) {
  if (!bizType || !applicationId) return
  removeOpenSampleTodos(bizType, applicationId)
}

/**
 * 模块审批办理后：将该单对应节点未办待办移入已办（双入口同步）
 */
export function finishSampleOpenTodos(bizType, applicationId, node, handleLabel) {
  if (!bizType || !applicationId) return
  const ids = personalTodoStore.todos
    .filter(
      (t) =>
        t.type === 'sample' &&
        t.sampleBizType === bizType &&
        t.sampleApplicationId === applicationId &&
        (!node || t.sampleNode === node),
    )
    .map((t) => t.id)
  ids.forEach((id) => finishPersonalTodo(id, handleLabel))
}

/** —— 材料进场：仅个人中心监理待办 —— */
let matEntryTodoSeq = 30

function removeOpenMatEntryTodos(entryId) {
  for (let i = personalTodoStore.todos.length - 1; i >= 0; i -= 1) {
    const t = personalTodoStore.todos[i]
    if (t.type !== 'mat_entry') continue
    if (t.matEntryId !== entryId) continue
    personalTodoStore.todos.splice(i, 1)
  }
}

function buildMatEntryTodo(payload) {
  matEntryTodoSeq += 1
  return {
    id: `todo-mat-${matEntryTodoSeq}`,
    type: 'mat_entry',
    sourceLabel: '材料设备进场管理',
    category: '材料设备进场',
    bizType: '进场审批',
    matEntryId: payload.entryId,
    processName: `材料进场审批·${payload.materialName}（${payload.entryId}）`,
    applicant: payload.applicantName || '当前用户',
    dept: payload.dept || '总包项目部',
    applyTime: payload.applyTime || '',
    detail: {
      project: payload.projectLabel || payload.projectId || '—',
      entryId: payload.entryId,
      materialName: payload.materialName || '—',
      brandName: payload.brandName || '—',
      sampleId: payload.sampleId || '—',
      quantity: payload.quantity || '—',
      currentNode: '审核中',
    },
    approvalFlow: [
      {
        title: '施工提交进场',
        time: payload.applyTime || '',
        user: payload.applicantName || '施工',
        remark: '直接提交，进入审核中',
        status: 'done',
      },
      {
        title: '监理审批',
        time: '',
        user: '当前用户',
        remark: '待审批',
        status: 'current',
      },
    ],
  }
}

export function createMatEntrySupervisorTodo(payload) {
  if (!payload?.entryId) return null
  removeOpenMatEntryTodos(payload.entryId)
  const row = buildMatEntryTodo(payload)
  personalTodoStore.todos.unshift(row)
  return row
}

export function discardMatEntryTodos(entryId) {
  if (!entryId) return
  removeOpenMatEntryTodos(entryId)
}

/** —— 设备进场：仅个人中心监理待办 —— */
let eqEntryTodoSeq = 40

function removeOpenEqEntryTodos(entryId) {
  for (let i = personalTodoStore.todos.length - 1; i >= 0; i -= 1) {
    const t = personalTodoStore.todos[i]
    if (t.type !== 'eq_entry') continue
    if (t.eqEntryId !== entryId) continue
    personalTodoStore.todos.splice(i, 1)
  }
}

function buildEqEntryTodo(payload) {
  eqEntryTodoSeq += 1
  return {
    id: `todo-eq-${eqEntryTodoSeq}`,
    type: 'eq_entry',
    sourceLabel: '材料设备进场管理',
    category: '材料设备进场',
    bizType: '进场审批',
    eqEntryId: payload.entryId,
    processName: `设备进场审批·${payload.equipmentName}（${payload.entryId}）`,
    applicant: payload.applicantName || '当前用户',
    dept: payload.dept || '总包项目部',
    applyTime: payload.applyTime || '',
    detail: {
      project: payload.projectLabel || payload.projectId || '—',
      entryId: payload.entryId,
      equipmentName: payload.equipmentName || '—',
      brandName: payload.brandName || '—',
      sampleId: payload.sampleId || '—',
      quantity: payload.quantity || '—',
      currentNode: '审核中',
    },
    approvalFlow: [
      {
        title: '施工提交设备进场',
        time: payload.applyTime || '',
        user: payload.applicantName || '施工',
        remark: '直接提交，进入审核中',
        status: 'done',
      },
      {
        title: '监理审批',
        time: '',
        user: '当前用户',
        remark: '待审批',
        status: 'current',
      },
    ],
  }
}

export function createEqEntrySupervisorTodo(payload) {
  if (!payload?.entryId) return null
  removeOpenEqEntryTodos(payload.entryId)
  const row = buildEqEntryTodo(payload)
  personalTodoStore.todos.unshift(row)
  return row
}

export function discardEqEntryTodos(entryId) {
  if (!entryId) return
  removeOpenEqEntryTodos(entryId)
}

/** —— 实模一致验收：仅个人中心待办（监理 → 指挥部项目经理） —— */
let asbuiltTodoSeq = 50

function removeOpenAsbuiltTodos(acceptanceId, { onlyNode } = {}) {
  for (let i = personalTodoStore.todos.length - 1; i >= 0; i -= 1) {
    const t = personalTodoStore.todos[i]
    if (t.type !== 'asbuilt' || t.asbuiltAcceptanceId !== acceptanceId) continue
    if (onlyNode && t.asbuiltNode !== onlyNode) continue
    personalTodoStore.todos.splice(i, 1)
  }
}

function buildAsbuiltTodo(payload) {
  const node = payload.asbuiltNode === 'pm' ? 'pm' : 'supervisor'
  const isPm = node === 'pm'
  asbuiltTodoSeq += 1
  return {
    id: `todo-asbuilt-${asbuiltTodoSeq}`,
    type: 'asbuilt',
    sourceLabel: '实模一致验收',
    category: '实模一致验收',
    bizType: isPm ? '项目经理终审' : '监理审批',
    asbuiltAcceptanceId: payload.acceptanceId,
    asbuiltNode: node,
    processName: `实模一致验收·${payload.title || ''}（${payload.bizNo || payload.acceptanceId}）`,
    applicant: payload.applicantName || '当前用户',
    dept: payload.dept || '总包项目部',
    applyTime: payload.applyTime || '',
    detail: {
      project: payload.projectLabel || payload.projectId || '—',
      acceptanceId: payload.acceptanceId,
      bizNo: payload.bizNo || '—',
      title: payload.title || '—',
      compareUrl: payload.compareUrl || '—',
      nodePaths: payload.nodePaths || '—',
      currentNode: isPm ? '待项目经理终审' : '待监理审',
      supervisorTime: payload.supervisorTime || '',
      supervisorName: payload.supervisorName || '',
    },
    approvalFlow: isPm
      ? [
          {
            title: '施工提交',
            time: payload.applyTime || '',
            user: payload.applicantName || '施工方',
            remark: '已提交',
            status: 'done',
          },
          {
            title: '监理审批',
            time: payload.supervisorTime || '',
            user: payload.supervisorName || '监理',
            remark: '已通过',
            status: 'done',
          },
          {
            title: '指挥部项目经理终审',
            time: '',
            user: '',
            remark: '待办理',
            status: 'current',
          },
        ]
      : [
          {
            title: '施工提交',
            time: payload.applyTime || '',
            user: payload.applicantName || '施工方',
            remark: '已提交',
            status: 'done',
          },
          {
            title: '监理审批',
            time: '',
            user: '',
            remark: '待办理',
            status: 'current',
          },
          {
            title: '指挥部项目经理终审',
            time: '',
            user: '',
            remark: '待流转',
            status: 'pending',
          },
        ],
  }
}

export function createAsbuiltSupervisorTodo(payload) {
  if (!payload?.acceptanceId) return null
  removeOpenAsbuiltTodos(payload.acceptanceId)
  const row = buildAsbuiltTodo({ ...payload, asbuiltNode: 'supervisor' })
  personalTodoStore.todos.unshift(row)
  return row
}

export function createAsbuiltPmTodo(payload) {
  if (!payload?.acceptanceId) return null
  removeOpenAsbuiltTodos(payload.acceptanceId, { onlyNode: 'supervisor' })
  removeOpenAsbuiltTodos(payload.acceptanceId, { onlyNode: 'pm' })
  const row = buildAsbuiltTodo({ ...payload, asbuiltNode: 'pm' })
  personalTodoStore.todos.unshift(row)
  return row
}

export function discardAsbuiltTodos(acceptanceId) {
  if (!acceptanceId) return
  removeOpenAsbuiltTodos(acceptanceId)
}

export function finishAsbuiltOpenTodos(acceptanceId, handleLabel) {
  if (!acceptanceId) return
  const ids = personalTodoStore.todos
    .filter((t) => t.type === 'asbuilt' && t.asbuiltAcceptanceId === acceptanceId)
    .map((t) => t.id)
  ids.forEach((id) => finishPersonalTodo(id, handleLabel))
}

/** 通知信息（人员预警已迁出至预警中心） */
export const personalNotices = [
  {
    id: 'nt-qm-1',
    module: '质量验评',
    title: '检验批验收待办提醒',
    content: '您有检验批验收审批待办：YS-2026-001 三层梁板钢筋，项目：T2航站区配套，请到「我的待办」处理。',
    time: '2026-07-15 10:35:00',
    readStatus: '未读',
  },
  {
    id: 'nt-qm-2',
    module: '质量验评',
    title: '验评整改待办提醒',
    content: '您有验评整改待办：ZG-2026-002 柱钢筋机械连接，请填写整改措施并提交复验。',
    time: '2026-07-12 17:05:00',
    readStatus: '未读',
  },
  {
    id: 'nt-1',
    module: '待办通知',
    title: '流程待办企业微信通知',
    content: '您有一条检验批验收审批待办，项目：T2航站区配套，请及时处理。2026-07-18 09:32',
    time: '2026-07-18 09:32:20',
    readStatus: '已读',
  },
  {
    id: 'nt-brand-1',
    module: '品牌报审',
    title: '品牌报审待办提醒',
    content: '您有品牌报审待办：防水卷材（PP-2026-002）待监理审、钢筋（PP-2026-003）待项目经理终审，请及时处理。',
    time: '2026-07-20 11:05:00',
    readStatus: '未读',
  },
  {
    id: 'nt-2',
    module: '环境监测',
    title: '环境告警',
    content: 'T2主体施工区扬尘瞬时值超标，请现场复核并落实降尘措施。',
    time: '2026-07-17 16:18:07',
    readStatus: '未读',
  },
  {
    id: 'nt-3',
    module: '质量验评',
    title: '验收计划逾期提醒',
    content: '计划 YS-2026-003 计划完成日期已过，请关注执行进度。',
    time: '2026-07-16 10:05:33',
    readStatus: '已读',
  },
  {
    id: 'nt-4',
    module: '巡检管理',
    title: '隐患整改到期提醒',
    content: '隐患单 YH-2026-021 整改期限将至，请督促责任单位闭环。',
    time: '2026-07-15 08:40:11',
    readStatus: '未读',
  },
  {
    id: 'nt-5',
    module: '系统通知',
    title: '系统维护公告',
    content: '本周六 02:00-04:00 进行系统例行维护，期间部分功能可能短暂不可用。',
    time: '2026-07-14 18:00:00',
    readStatus: '已读',
  },
]

/**
 * 兼容：人员预警已迁至预警中心，流程中心待办不再返回人员预警
 */
export function listLaborPersonalTodos() {
  return []
}

/** 兼容：人员预警已迁至预警中心 */
export function listLaborPersonalDone() {
  return []
}

/** 兼容：人员预警通知已迁至预警中心，消息提醒不再返回 */
export function listLaborPersonalNotices() {
  return []
}

/** 兼容：本期预警流程无发起态 */
export function listLaborPersonalStarted() {
  return []
}

/** 兼容：本期预警流程无抄送态 */
export function listLaborPersonalCc() {
  return []
}
