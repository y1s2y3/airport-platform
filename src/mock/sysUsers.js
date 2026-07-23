import { ref } from 'vue'
import { COC_PROJECT_OPTIONS } from '../config/projectOptions'
import { getProjectOrgNodeId } from './orgStructure'

export const userStatusOptions = [
  { label: '全部', value: '' },
  { label: '启用', value: 'enabled' },
  { label: '停用', value: 'disabled' },
]

const initialUsers = [
  {
    id: 'u-001',
    name: '刘付生',
    loginAccount: 'liufs',
    phone: '13899999999',
    email: '13899999999@qq.com',
    gender: '男',
    status: true,
    remark: '',
    orgId: 'org-plan',
    positions: ['pos-3'],
  },
  {
    id: 'u-002',
    name: '李畅',
    loginAccount: 'qianglong',
    phone: '14469074474',
    email: 'yang21@example.net',
    gender: '男',
    status: true,
    remark: '',
    orgId: 'org-finance',
    positions: [],
  },
  {
    id: 'u-003',
    name: '陈静',
    loginAccount: 'chenjing',
    phone: '13600138890',
    email: 'chenjing@szairport.com',
    gender: '女',
    status: true,
    remark: '办公室联络人',
    orgId: 'org-office',
    positions: ['pos-1'],
  },
  {
    id: 'u-004',
    name: '视频中心用户',
    loginAccount: 'videoAdmin',
    phone: '13888888888',
    email: '13888888888@163.com',
    gender: '男',
    status: true,
    remark: '',
    orgId: 'org-plan',
    positions: ['pos-4'],
  },
  {
    id: 'u-005',
    name: '姚远东',
    loginAccount: 'yaoyuandong',
    phone: '13900133302',
    email: 'yaoyuandong@szairport.com',
    gender: '男',
    status: true,
    remark: '',
    orgId: 'org-plan',
    positions: ['pos-3'],
  },
  {
    id: 'u-006',
    name: '王强',
    loginAccount: 'wangqiang',
    phone: '13700132210',
    email: 'wangqiang@szairport.com',
    gender: '男',
    status: false,
    remark: '',
    orgId: 'org-public',
    positions: [],
  },
  {
    id: 'u-007',
    name: '刘文强',
    loginAccount: 'liuwenqiang',
    phone: '13800131201',
    email: 'liuwenqiang@szairport.com',
    gender: '男',
    status: true,
    remark: '系统管理员',
    orgId: 'org-hq',
    positions: [],
  },
]

const PROJECT_USER_TEMPLATES = [
  { suffix: '项目经理', positionKey: 0 },
  { suffix: '工程师', positionKey: 1 },
  { suffix: '安全员', positionKey: 2 },
]

function seedProjectSysUsers() {
  COC_PROJECT_OPTIONS.slice(0, 12).forEach((project, index) => {
    const orgId = `${getProjectOrgNodeId(project.id)}-dept-0`
    PROJECT_USER_TEMPLATES.forEach((staff, staffIndex) => {
      initialUsers.push({
        id: `u-proj-${project.id}-${staffIndex}`,
        name: `${project.label}${staff.suffix}`,
        loginAccount: `pm_${project.id}_${staffIndex}`,
        phone: `139${String(index).padStart(2, '0')}${String(staffIndex).padStart(2, '0')}0001`,
        email: `pm_${project.id}_${staffIndex}@szairport.com`,
        gender: staffIndex === 0 ? '男' : '女',
        status: true,
        remark: '',
        orgId,
        projectId: project.id,
        positions: [`pos-proj-${project.id}-dept-${staff.positionKey}`],
      })
    })
  })
}

seedProjectSysUsers()

export const sysUserRecords = ref(initialUsers.map((item) => ({ ...item, positions: [...item.positions] })))

let userIdSeq = 100

export function listSysUsers() {
  return sysUserRecords.value
}

export function getSysUser(id) {
  return sysUserRecords.value.find((item) => item.id === id) || null
}

export function createEmptySysUser() {
  return {
    name: '',
    loginAccount: '',
    phone: '',
    email: '',
    gender: '男',
    status: true,
    remark: '',
    orgId: '',
    positions: [''],
  }
}

export function cloneSysUser(user) {
  return {
    ...user,
    positions: user.positions?.length ? [...user.positions] : [''],
  }
}

export function saveSysUser(payload, id) {
  const data = {
    ...payload,
    positions: (payload.positions || []).filter(Boolean),
  }
  if (id) {
    const idx = sysUserRecords.value.findIndex((item) => item.id === id)
    if (idx < 0) return null
    sysUserRecords.value[idx] = { ...sysUserRecords.value[idx], ...data, id }
    return sysUserRecords.value[idx]
  }
  const created = { ...data, id: `u-${++userIdSeq}` }
  sysUserRecords.value.unshift(created)
  return created
}

export function deleteSysUser(id) {
  const idx = sysUserRecords.value.findIndex((item) => item.id === id)
  if (idx < 0) return false
  sysUserRecords.value.splice(idx, 1)
  return true
}

export function toggleSysUserStatus(id, status) {
  const user = getSysUser(id)
  if (!user) return false
  user.status = status
  return true
}

/** 兼容 rbac 模块 */
export const sysUserList = sysUserRecords.value
