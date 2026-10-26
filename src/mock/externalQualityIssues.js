/**
 * 施工质量问题管理原型数据。
 * 字段取自用户提供的列表与详情截图，仅用于汇总页画面演示。
 */
export const externalQualityIssues = [
  {
    id: 'EQ-20261016-001',
    projectId: 'p-000',
    projectName: 'T2项目',
    sectionName: 'T2场道一标段',
    title: '集水井井口及外包尼龙网局部破损',
    issueType: '民航工程 / 场道附属工程',
    source: '随手拍',
    initiator: '系统管理员',
    finder: '李志钦',
    rectifier: '陈清云',
    reviewer: '刘国旗',
    createdAt: '2026-10-16 19:25:02',
    dueAt: '2026-10-23 19:09:56',
    status: '已完成',
    items: [
      {
        id: 'EQ-20261016-001-1',
        description: 'A5、A6堆载区个别集水井井口及外包尼龙网局部破损。',
        advice: '对A5、A6堆载区集水井外包尼龙网局部破损处及时修补，并做好成品保护。',
        attachments: ['IMG_20261016_154347.jpg'],
      },
    ],
    approvalLogs: [
      { stage: '发起人填写表单', person: '系统管理员', opinion: '提交', time: '2026-10-16 19:25:02' },
      { stage: '施工方整改', person: '陈清云', opinion: '已完成整改，请复核', time: '2026-10-19 09:43:15' },
      { stage: '监理方复核', person: '孙先群', opinion: '同意', time: '2026-10-19 12:42:42' },
      { stage: '项目部审核', person: '刘国旗', opinion: '同意。', time: '2026-10-20 14:09:11' },
      { stage: '安全质量管理部审批', person: '李佳01', opinion: '同意。', time: '2026-10-20 15:05:04' },
    ],
  },
  {
    id: 'EQ-20261022-002',
    projectId: 'p-000',
    projectName: 'T2项目',
    sectionName: 'T2场道一标段',
    title: '回填土含水量偏高',
    issueType: '民航工程 / 场道工程',
    source: '随手拍',
    initiator: '系统管理员',
    finder: '现场巡查人员',
    rectifier: '陈清云',
    reviewer: '刘国旗',
    createdAt: '2026-10-22 10:34:24',
    dueAt: '2026-10-26 18:00:00',
    status: '待整改',
    items: [
      {
        id: 'EQ-20261022-002-1',
        description: '局部回填土含水量偏高，现场压实质量需复核。',
        advice: '复核含水量并按施工要求处理后重新检测。',
        attachments: [],
      },
    ],
    approvalLogs: [
      { stage: '发起人填写表单', person: '系统管理员', opinion: '提交', time: '2026-10-22 10:34:24' },
    ],
  },
  {
    id: 'EQ-20261021-003',
    projectId: 'p-000',
    projectName: 'T2项目',
    sectionName: 'T2场道一标段',
    title: 'A6堆载区东侧临时防护不到位',
    issueType: '民航工程 / 场道附属工程',
    source: '随手拍',
    initiator: '系统管理员',
    finder: '现场巡查人员',
    rectifier: '陈清云',
    reviewer: '刘国旗',
    createdAt: '2026-10-21 09:09:53',
    dueAt: '2026-10-24 18:00:00',
    status: '待整改',
    items: [
      {
        id: 'EQ-20261021-003-1',
        description: '堆载区东侧局部临时防护不完整。',
        advice: '补齐临时防护并复核现场设置。',
        attachments: [],
      },
    ],
    approvalLogs: [
      { stage: '发起人填写表单', person: '系统管理员', opinion: '提交', time: '2026-10-21 09:09:53' },
    ],
  },
]
