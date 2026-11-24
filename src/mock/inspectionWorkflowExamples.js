import { buildInspectionTaskNo } from '../config/inspectionManagement.js'
import { getConfiguredPersonLabel, getProjectInspectorLabel, getProjectRectifierLabel, getProjectReviewerLabel, getProjectApproverLabel } from '../composables/useInspectionPersonConfig.js'
import { workflowSteps, rectifyNamePrefix, rectificationProcessName, INSPECTION_VOID_APPROVER } from '../utils/inspectionRectificationWorkflow.js'

/** 个人中心只展示这 8 个整改流程示例名称。 */
export const INSPECTION_WORKFLOW_EXAMPLE_NAMES = [
  ...[['rectify'], ['contractorAcceptance'], ['review'], ['directorAcceptance'], ['approval'], ['departmentConfirmation']].map(([key]) => rectificationProcessName({ inspectionCategory: '质量', hazardLevel: 'A' }, key)),
  rectificationProcessName({ inspectionCategory: '安全' }, 'rectify'),
  rectificationProcessName({ inspectionCategory: '其他' }, 'review'),
  rectificationProcessName({ inspectionCategory: '安全' }, 'approval'),
  ...['安全', '其他'].map(inspectionCategory => rectificationProcessName({ inspectionCategory, hazardLevel: 'Ⅰ重大隐患' }, 'departmentConfirmation')),
]

/** 每个节点使用独立整改单，处理一个示例不会改变另一个节点的演示状态。 */
export function createInspectionWorkflowExamples() {
  const now = new Date()
  const day = offset => {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset, 12)
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  }
  const cases = [
    { key: 'quality-a', category: '质量', level: 'A', hazardCategory: '结构实体质量', hazard: '跑道道面混凝土强度检测结果未达到设计要求', requirement: '暂停相关部位后续施工，复核检测报告，按批准方案处理并补充实体检测和验收资料。' },
    { key: 'safety', category: '安全', level: 'Ⅲ一般隐患', stages: ['rectify', 'approval'], hazardCategory: '临边洞口', hazard: '跑道施工区域临边防护栏杆连接不牢固', requirement: '加固栏杆连接节点，补齐警示标识，复核防护设置后提交现场照片。' },
    { key: 'other', category: '其他', level: 'Ⅲ一般隐患', stages: ['review'], hazardCategory: '现场通行', hazard: '施工临时通道指引标识缺失，人员车辆通行路线不明确', requirement: '补齐通行指引标识，明确人车分流路线并组织现场确认。' },
    { key: 'safety-major', category: '安全', level: 'Ⅰ重大隐患', stages: ['departmentConfirmation'], hazardCategory: '起重吊装', hazard: '重大隐患演示：起重吊装作业区域存在重大安全隐患', requirement: '停止相关作业，落实隔离和整改措施，验收合格后恢复作业。' },
    { key: 'other-major', category: '其他', level: 'Ⅰ重大隐患', stages: ['departmentConfirmation'], hazardCategory: '现场通行', hazard: '重大隐患演示：施工通道存在重大通行隐患', requirement: '封控相关通道、消除隐患，验收后恢复通行。' },
    { key: 'quality-a-done', category: '质量', level: 'A', closed: true, hidden: true, hazardCategory: '结构实体质量', hazard: '跑道道面平整度复测合格，整改资料已完成归档', requirement: '补齐整改与各级验收资料，完成审批并关闭整改单（仅补已办记录）。' },
    { key: 'safety-done', category: '安全', level: 'Ⅲ一般隐患', closed: true, hidden: true, hazardCategory: '临边洞口', hazard: '跑道施工区域临边防护栏杆已加固并复核', requirement: '完成整改、复核与审批并关闭整改单（仅补已办记录）。' },
    { key: 'void-approval', category: '安全', level: 'Ⅲ一般隐患', stages: ['voidApproval'], voidPending: true, hazardCategory: '临边洞口', hazard: '作废审批演示：同一处临边防护隐患被重复登记', requirement: '经现场复核为重复登记，申请作废本整改单。' },
    { key: 'other-done', category: '其他', level: 'Ⅲ一般隐患', closed: true, hidden: true, hazardCategory: '现场通行', hazard: '施工临时通道指引标识已补齐并复核', requirement: '完成整改、复核与审批并关闭整改单（仅补已办记录）。' },
  ]
  return cases.flatMap((example, groupIndex) => {
    const projectId = 'p-000'
    const base = {
      workflowExample: true, initiatorId: 'u-proj-' + projectId, projectId, project: '飞行区跑道延长工程',
      inspectionCategory: example.category, inspectionCategories: [example.category],
      inspectionType: '部门检查', source: '任务推送', taskNo: buildInspectionTaskNo(example.category, day(-2), 901 + groupIndex),
      hazardCategory: example.hazardCategory, hazardLevel: example.level, hazard: example.hazard,
      rectifyRequirement: example.requirement, hazardPhotos: [`${example.key}-隐患现场.jpg`, `${example.key}-检查依据.jpg`],
      inspector: getProjectInspectorLabel(projectId, example.category),
      rectifier: getProjectRectifierLabel(projectId, example.category),
      reviewer: getProjectReviewerLabel(projectId, example.category),
      manager: getProjectApproverLabel(projectId, example.category),
      contractorManager: getConfiguredPersonLabel(projectId, example.category, 'contractorManagerId'),
      director: getConfiguredPersonLabel(projectId, example.category, 'directorId'),
      projectDepartmentHead: getConfiguredPersonLabel(projectId, example.category, 'departmentHeadId'),
      registeredAt: day(-2) + ' 09:00:00',
      issuedAt: `${day(-2)} 09:00:00`, deadline: day(3), overdue: false,
    }
    // 作废审批示例：整改单已提交作废申请，等待指挥部安全和整改负责人审批。
    if (example.voidPending) {
      const requestedAt = `${day(-1)} 10:00:00`
      const record = {
        ...base,
        id: `inspection-example-${example.key}`,
        rectifyNo: `ZG${day(-2).replaceAll('-', '')}91`,
        workflowHistory: [{ stage: 'voidRequest', label: '申请作废整改单', actor: base.inspector, date: requestedAt, comment: '同一隐患重复登记，申请作废' }],
        voidRequest: { status: 'pending', reason: '同一隐患重复登记，申请作废', requestedAt, applicant: base.inspector, approver: INSPECTION_VOID_APPROVER },
        status: '待整改',
        currentNode: '指挥部安全和整改负责人审批',
        applicant: base.inspector,
        applyDate: requestedAt,
      }
      record.rectifyNamePrefix = rectifyNamePrefix(record)
      record.rectifyProcessName = '整改单作废审批'
      return [record]
    }

    const steps = workflowSteps(base)
    return (example.closed ? ['closed'] : (example.stages || steps.map(step => step.key))).map((stage, stageIndex) => {
      const record = { ...base, id: `inspection-example-${example.key}-${stage}`, rectifyNo: `ZG${day(-2).replaceAll('-', '')}${groupIndex + 1}${String(stageIndex + 1).padStart(2, '0')}`, workflowHistory: [], exampleHidden: Boolean(example.hidden), exampleAllowedProcessNames: INSPECTION_WORKFLOW_EXAMPLE_NAMES }
      const currentIndex = example.closed ? steps.length : steps.findIndex(step => step.key === stage)
      for (const [index, step] of steps.entries()) {
        if (index >= currentIndex) break
        const comment = {
          rectify: '已按整改要求完成现场处理，复测结果及整改照片已提交。',
          contractorAcceptance: '施工单位项目经理已核对方案执行、实体检测及整改资料，验收通过。',
          review: '监理已现场核查整改结果，复核通过，资料与现场一致。',
          directorAcceptance: '项目总监已核验监理复核依据及实体质量，验收通过。',
          approval: '整改及各级验收资料齐全，项目经理验收通过。',
          departmentConfirmation: '项目部长确认整改和验收结果，同意关闭整改单。',
        }[step.key]
        record[step.date] = day(-1)
        record[step.note] = comment
        if (step.result) record[step.result] = '通过'
        if (step.key === 'rectify') {
          record.rectificationPhotos = [`${example.key}-整改完成.jpg`, `${example.key}-复测记录.jpg`]
          record.submitDate = day(-1)
        }
        record.workflowHistory.push({ stage: step.key, label: step.label, actor: step.actor, date: day(-1), comment, result: '通过' })
      }
      const current = steps[currentIndex]
      record.status = current?.status || '已关闭'
      record.currentNode = current?.label || '流程结束'
      record.applicant = currentIndex ? steps[currentIndex - 1].actor : record.inspector
      record.applyDate = `${day(current ? 0 : -2)} 09:00:00`
      record.closeDate = current ? '' : day(-1)
      record.rectifyNamePrefix = rectifyNamePrefix(record)
      record.rectifyProcessName = rectificationProcessName(record, current?.key || 'approval')
      return record
    })
  })
}
