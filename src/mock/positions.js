import { ref } from 'vue'

export const positionLevelOptions = [
  { label: '全部', value: '' },
  { label: '公司', value: '公司' },
  { label: '项目', value: '项目' },
]

export const positionSourceOptions = ['系统自建', '外部同步']

const initialPositions = [
  {
    id: 'pos-001',
    code: 'POS-TEST-001',
    name: '测试岗位',
    level: '项目',
    source: '系统自建',
    headcount: 1,
    duty: '用于系统功能测试验证',
    roleId: 'role-default',
  },
  {
    id: 'pos-002',
    code: 'POS-SZ-002',
    name: '深圳分公司员工岗',
    level: '公司',
    source: '系统自建',
    headcount: 2,
    duty: '负责深圳分公司日常业务协调与执行',
    roleId: 'role-company',
  },
  {
    id: 'pos-003',
    code: 'POS-GM-003',
    name: '总经理岗位',
    level: '项目',
    source: '系统自建',
    headcount: 1,
    duty: '统筹项目重大决策与资源调配',
    roleId: 'role-gm',
  },
  {
    id: 'pos-004',
    code: 'POS-OFFICE-004',
    name: '办公室主任',
    level: '公司',
    source: '系统自建',
    headcount: 1,
    duty: '统筹办公室日常事务',
    roleId: 'role-default',
  },
  {
    id: 'pos-005',
    code: 'POS-PLAN-005',
    name: '规划建设部经理',
    level: '项目',
    source: '系统自建',
    headcount: 1,
    duty: '重大项目推进统筹',
    roleId: 'role-company',
  },
  {
    id: 'pos-006',
    code: 'POS-VIDEO-006',
    name: '项目推进岗',
    level: '项目',
    source: '系统自建',
    headcount: 1,
    duty: '重大项目日常推进',
    roleId: 'role-video',
  },
  {
    id: 'pos-007',
    code: 'POS-SAFE-007',
    name: '安全质量管理员',
    level: '项目',
    source: '系统自建',
    headcount: 1,
    duty: '安全与质量监督管理',
    roleId: 'role-company',
  },
  {
    id: 'pos-008',
    code: 'POS-COC-008',
    name: 'COC调度岗',
    level: '项目',
    source: '系统自建',
    headcount: 2,
    duty: 'COC调度指挥与远程协调',
    roleId: 'role-coc',
  },
  {
    id: 'pos-009',
    code: 'POS-LABOR-009',
    name: '劳务管理岗',
    level: '项目',
    source: '系统自建',
    headcount: 0,
    duty: '劳务实名制与考勤管理',
    roleId: 'role-labor',
  },
  {
    id: 'pos-010',
    code: 'POS-VEH-010',
    name: '车辆管理岗',
    level: '项目',
    source: '系统自建',
    headcount: 1,
    duty: '车辆进出场与轨迹监管',
    roleId: 'role-vehicle',
  },
  {
    id: 'pos-011',
    code: 'POS-BD-011',
    name: '基础数据维护岗',
    level: '公司',
    source: '系统自建',
    headcount: 1,
    duty: '项目信息管理与工程划分库维护',
    roleId: 'role-bd',
  },
  {
    id: 'pos-012',
    code: 'POS-FIN-012',
    name: '财务审核岗',
    level: '公司',
    source: '系统自建',
    headcount: 0,
    duty: '财务相关审批与复核',
    roleId: '',
  },
  {
    id: 'pos-013',
    code: 'POS-HR-013',
    name: '人力资源岗',
    level: '公司',
    source: '系统自建',
    headcount: 2,
    duty: '人员招聘、培训与组织关系管理',
    roleId: 'role-default',
  },
  {
    id: 'pos-014',
    code: 'POS-AUDIT-014',
    name: '审计查看岗',
    level: '公司',
    source: '系统自建',
    headcount: 1,
    duty: '审计数据只读查看',
    roleId: 'role-audit',
  },
  {
    id: 'pos-015',
    code: 'POS-EXT-015',
    name: '外部协作岗',
    level: '项目',
    source: '系统自建',
    headcount: 3,
    duty: '外部单位受限业务协作',
    roleId: 'role-external',
  },
  {
    id: 'pos-016',
    code: 'POS-INT-016',
    name: '系统对接岗',
    level: '公司',
    source: '系统自建',
    headcount: 1,
    duty: '第三方系统对接与同步维护',
    roleId: 'role-integration',
  },
  {
    id: 'pos-017',
    code: 'POS-PM-017',
    name: '项目经理岗',
    level: '项目',
    source: '系统自建',
    headcount: 2,
    duty: '项目进度、质量、安全统筹管理',
    roleId: 'role-pm',
  },
  {
    id: 'pos-018',
    code: 'POS-ADMIN-018',
    name: '系统管理岗',
    level: '公司',
    source: '系统自建',
    headcount: 1,
    duty: '平台配置与权限管理',
    roleId: 'role-admin',
  },
  {
    id: 'pos-019',
    code: 'POS-DOC-019',
    name: '综合文秘岗',
    level: '公司',
    source: '系统自建',
    headcount: 1,
    duty: '文稿起草与会议组织',
    roleId: 'role-default',
  },
  {
    id: 'pos-020',
    code: 'POS-PUBLIC-020',
    name: '公共区管理岗',
    level: '项目',
    source: '系统自建',
    headcount: 0,
    duty: '公共区日常运维管理',
    roleId: '',
  },
  {
    id: 'pos-021',
    code: 'POS-LOGISTICS-021',
    name: '后勤服务岗',
    level: '项目',
    source: '系统自建',
    headcount: 1,
    duty: '后勤保障与综合服务',
    roleId: 'role-default',
  },
]

export const positionRecords = ref(initialPositions.map((item) => ({ ...item })))

let positionIdSeq = 100

export function listPositions() {
  return positionRecords.value
}

export function getPosition(id) {
  return positionRecords.value.find((item) => item.id === id) || null
}

export function createEmptyPosition() {
  return {
    code: '',
    name: '',
    level: '',
    source: '系统自建',
    headcount: 0,
    duty: '',
    roleId: '',
  }
}

export function clonePosition(position) {
  return { ...position }
}

export function savePosition(payload, id) {
  const data = {
    ...payload,
    headcount: Number(payload.headcount) || 0,
    roleId: payload.roleId || '',
  }
  if (id) {
    const idx = positionRecords.value.findIndex((item) => item.id === id)
    if (idx < 0) return null
    positionRecords.value[idx] = { ...positionRecords.value[idx], ...data, id }
    return positionRecords.value[idx]
  }
  const created = { ...data, id: `pos-${++positionIdSeq}` }
  positionRecords.value.unshift(created)
  return created
}

export function deletePosition(id) {
  const idx = positionRecords.value.findIndex((item) => item.id === id)
  if (idx < 0) return false
  positionRecords.value.splice(idx, 1)
  return true
}

export function syncPositions() {
  return positionRecords.value.length
}
