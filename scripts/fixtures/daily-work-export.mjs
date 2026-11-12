import { emptyDailyWorkRecord } from '../../src/coc/config/dailyWorkSchema.js'

export const exportMarker = '导出验算'
export function exportRecord(id, date, start, end, overrides = {}) {
  return {
    ...emptyDailyWorkRecord(date), id: 'export-qa-' + id,
    leadUnit: '导出验算管理单位', projectName: '导出验算甲项目', contractor: '导出验算施工单位',
    workArea: '验证区域', workContent: id, dangerWorkCategory: '动火作业',
    startTime: `${date} ${start}`, endTime: `${date} ${end}`,
    ownerProjectManager: '测试建设负责人/13800000001', ownerSafetyManager: '测试建设安全员/13800000002',
    contractorProjectManager: '测试施工负责人/13800000003', contractorSafetyManager: '测试施工安全员/13800000004',
    supervisorProjectManager: '测试监理负责人/13800000005', supervisorSafetyManager: '测试监理安全员/13800000006',
    dangerControlMeasures: '按原有措施落实交底、监护及验收；导出不改写字段。',
    source: 'manual', createdAt: '2026-11-11T00:00:00.000Z', ...overrides,
  }
}

export const exportFixtures = [
  exportRecord('普通晚间', '2026-06-30', '18:00', '21:00', { projectName: '导出验算普通项目', dangerWorkCategory: '不涉及危险作业' }),
  exportRecord('晚间动火', '2026-06-30', '20:00', '23:59'),
  exportRecord('次日动火', '2026-07-01', '00:00', '08:00'),
  exportRecord('晚间高处', '2026-06-30', '21:00', '23:00', { projectName: '导出验算乙项目', dangerWorkCategory: '高处作业' }),
  exportRecord('次日普通', '2026-07-01', '06:00', '08:00', { projectName: '导出验算普通项目', dangerWorkCategory: '不涉及危险作业' }),
  exportRecord('全天用电', '2026-06-30', '08:00', '09:00', { projectName: '导出验算乙项目', dangerWorkCategory: '临时用电作业' }),
  exportRecord('触及20点', '2026-06-30', '19:00', '20:00', { projectName: '导出验算乙项目' }),
  exportRecord('次日白天', '2026-07-01', '07:00', '08:00'),
  exportRecord('其他筛选条件', '2026-06-30', '21:00', '23:00', { projectName: '其他项目', leadUnit: '其他管理单位', contractor: '其他施工单位' }),
]

export function exportMajorRecord(id, startTime, endTime, overrides = {}) {
  return exportRecord(id, startTime.slice(0, 10), '', '', {
    dangerWorkCategory: '', startTime: '', endTime: '',
    majorWorkContent: id, majorProjectCategory: '基坑开挖工程', majorStartTime: startTime, majorEndTime: endTime,
    majorOwnerSafetyManager: '危大建设安全员/13800000101',
    majorContractorSafetyManager: '危大施工安全员/13800000102, 第二名施工安全员/13800000103',
    majorSupervisorSafetyManager: '危大监理安全员/13800000104',
    majorControlMeasures: '危大登记原措施<&>；不得裁剪原起止时间。', ...overrides,
  })
}

export const exportMajorFixtures = [
  exportMajorRecord('危大跨多日', '2026-06-29 09:00', '2026-07-02 18:00'),
  exportMajorRecord('危大当日', '2026-06-30 08:00', '2026-06-30 16:00'),
  exportMajorRecord('危大跨次日', '2026-06-30 20:00', '2026-07-01 07:00', { projectName: '导出验算危大乙项目', majorProjectCategory: '模板支撑体系' }),
  exportMajorRecord('危大结束触边', '2026-06-29 08:00', '2026-06-30 00:00'),
  exportMajorRecord('危大开始触边', '2026-07-01 00:00', '2026-07-01 08:00'),
]
