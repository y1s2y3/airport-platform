export const dispatchApprovalPassed = log => ['审批通过', '验收通过'].includes(log?.action)

export function getDispatchHazardDetailLogs(record) {
  const logs = record?.statusLogs || []
  const findLog = (...actions) => logs.find(log => actions.includes(log.action)) || null
  return {
    rectification: findLog('提交整改'),
    review: findLog('复查通过', '复查不通过'),
    approval: findLog('审批通过', '审批不通过', '验收通过', '验收驳回'),
    confirmation: findLog('确认通过', '项目部长确认通过'),
  }
}
