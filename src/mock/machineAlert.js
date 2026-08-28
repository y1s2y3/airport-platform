/**
 * 机械设备监管 · 预警记录（共享 mock，供业务页与个人中心预警中心回写）
 */
import { ref } from 'vue'
import { nowStr } from '../utils/datetime.js'
import { notifyBizAlertDisposed } from './warningCenterBizHook.js'

/** 与个人中心演示条目绑定的机械预警 id */
export const WC_DEMO_MACHINE_ALERT_ID = 'alt-001'

export const machineAlerts = ref([
  {
    id: 'alt-001',
    alertTime: '2026-07-16 08:56:23',
    alertType: '塔吊预警',
    content: '塔吊起力矩预警，请及时处理',
    deviceName: '塔吊QTZ160（#1）',
    region: '施工A区',
    level: '重大预警',
    status: '未处置',
    project_id: 'p-000',
    project: '飞行区跑道延长工程',
  },
  {
    id: 'alt-002',
    alertTime: '2026-07-16 07:30:15',
    alertType: '塔吊预警',
    content: '塔吊风力超限预警',
    deviceName: '塔吊QTZ80（#7）',
    region: '堆场区',
    level: '重大预警',
    status: '未处置',
    project_id: 'p-003',
    project: '新货运站建设工程',
  },
  {
    id: 'alt-003',
    alertTime: '2026-07-15 17:20:00',
    alertType: '升降机预警',
    content: '升降机载重超限预警',
    deviceName: '升降机SC200（#2）',
    region: '施工B区',
    level: '较大预警',
    status: '已处置',
    result: '现场已处置',
    remark: '超载人员已疏散',
    handler: '李工',
    handleTime: '2026-07-15 17:45:00',
    project_id: 'p-000',
    project: '飞行区跑道延长工程',
  },
  {
    id: 'alt-004',
    alertTime: '2026-07-15 14:10:30',
    alertType: '塔吊预警',
    content: '塔吊倾角异常预警',
    deviceName: '塔吊QTZ160（#1）',
    region: '施工A区',
    level: '重大预警',
    status: '已处置',
    result: '误报',
    remark: '传感器临时波动',
    handler: '王工',
    handleTime: '2026-07-15 14:30:00',
    project_id: 'p-000',
    project: '飞行区跑道延长工程',
  },
  {
    id: 'alt-005',
    alertTime: '2026-07-14 10:05:00',
    alertType: '桩基预警',
    content: '桩基施工深度超限',
    deviceName: '桩基钻孔机#5',
    region: '跑道区',
    level: '较大预警',
    status: '未处置',
    project_id: 'p-000',
    project: '飞行区跑道延长工程',
  },
  {
    id: 'alt-006',
    alertTime: '2026-07-14 09:30:00',
    alertType: '升降机预警',
    content: '升降机人数超限预警',
    deviceName: '升降机SC200（#4）',
    region: '基础区',
    level: '较大预警',
    status: '已处置',
    result: '现场已处置',
    remark: '超员已劝离',
    handler: '张工',
    handleTime: '2026-07-14 10:00:00',
    project_id: 'p-003',
    project: '新货运站建设工程',
  },
  {
    id: 'alt-007',
    alertTime: '2026-07-13 16:45:20',
    alertType: '复合地基预警',
    content: '复合地基电流异常',
    deviceName: '复合地基桩机#3',
    region: '基坑区',
    level: '一般预警',
    status: '未处置',
    project_id: 'p-001',
    project: 'T3航站楼扩建工程',
  },
  {
    id: 'alt-008',
    alertTime: '2026-07-13 08:00:00',
    alertType: '塔吊预警',
    content: '塔吊起重力矩超限',
    deviceName: '塔吊QTZ160（#1）',
    region: '施工A区',
    level: '重大预警',
    status: '已处置',
    result: '现场已处置',
    remark: '已调整起重参数',
    handler: '王工',
    handleTime: '2026-07-13 09:15:00',
    project_id: 'p-000',
    project: '飞行区跑道延长工程',
  },
])

export function getMachineAlertById(id) {
  return machineAlerts.value.find((row) => String(row.id) === String(id)) || null
}

/**
 * 处置机械预警记录
 * @returns {object|null}
 */
export function disposeMachineAlert(
  id,
  { result = '已处置', remark = '', handler = '系统' } = {},
) {
  const row = getMachineAlertById(id)
  if (!row || row.status === '已处置') return null
  row.status = '已处置'
  row.result = result
  row.remark = remark
  row.handler = handler
  row.handleTime = nowStr()
  notifyBizAlertDisposed('machine', id, {
    operator: handler,
    disposalResult: result === '误报' ? '误报' : '已处置',
    disposalNote: remark || '',
  })
  return row
}
