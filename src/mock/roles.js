import { ref } from 'vue'
import { migrateMenuIdsByLevel } from '../utils/menuPermissionTree'

export const roleLevelOptions = [
  { label: '全部', value: '' },
  { label: '指挥部', value: '指挥部' },
  { label: '项目', value: '项目' },
]

export const roleStatusOptions = [
  { label: '全部', value: '' },
  { label: '启用', value: '启用' },
  { label: '禁用', value: '禁用' },
]

export const roleSourceOptions = ['自定义角色', '系统角色']

const initialRoles = [
  {
    id: 'role-gm',
    name: '总经理岗位',
    level: '项目',
    status: '启用',
    source: '自定义角色',
    remark: '总经理岗位',
    sortOrder: 1,
    updatedBy: '系统管理员',
    updatedAt: '2025-11-26 15:00:35',
    webMenuIds: ['workbench', 'basic-data', 'coc-admin'],
    appMenuIds: ['app-workbench', 'app-coc'],
  },
  {
    id: 'role-company',
    name: '公司角色',
    level: '指挥部',
    status: '禁用',
    source: '自定义角色',
    remark: '',
    sortOrder: 2,
    updatedBy: '系统管理员',
    updatedAt: '2025-11-21 12:03:32',
    webMenuIds: ['workbench', 'sys-settings'],
    appMenuIds: ['app-workbench'],
  },
  {
    id: 'role-default',
    name: '公司默认角色',
    level: '指挥部',
    status: '启用',
    source: '系统角色',
    remark: '',
    sortOrder: 3,
    updatedBy: '系统管理员',
    updatedAt: '2025-03-18 10:53:38',
    webMenuIds: ['workbench'],
    appMenuIds: ['app-workbench', 'app-profile'],
  },
  {
    id: 'role-video',
    name: '视频角色',
    level: '项目',
    status: '启用',
    source: '自定义角色',
    remark: '视频监控相关权限',
    sortOrder: 4,
    updatedBy: '郭俊',
    updatedAt: '2025-10-08 09:12:18',
    webMenuIds: ['workbench', 'video-monitor'],
    appMenuIds: ['app-workbench', 'app-video'],
  },
  {
    id: 'role-admin',
    name: '系统管理员',
    level: '指挥部',
    status: '启用',
    source: '系统角色',
    remark: '平台全量管理权限',
    sortOrder: 0,
    updatedBy: '系统管理员',
    updatedAt: '2025-11-20 18:22:01',
    webMenuIds: [],
    appMenuIds: [],
  },
  {
    id: 'role-pm',
    name: '项目经理',
    level: '项目',
    status: '启用',
    source: '自定义角色',
    remark: '项目业务管理',
    sortOrder: 5,
    updatedBy: '系统管理员',
    updatedAt: '2025-09-15 14:30:00',
    webMenuIds: ['workbench', 'labor', 'vehicle', 'basic-data'],
    appMenuIds: ['app-workbench', 'app-labor', 'app-vehicle'],
  },
  {
    id: 'role-coc',
    name: 'COC调度员',
    level: '项目',
    status: '启用',
    source: '自定义角色',
    remark: 'COC调度指挥',
    sortOrder: 6,
    updatedBy: '郭俊',
    updatedAt: '2025-08-22 11:05:44',
    webMenuIds: ['workbench', 'coc-admin', 'video-monitor'],
    appMenuIds: ['app-workbench', 'app-coc', 'app-video'],
  },
  {
    id: 'role-labor',
    name: '劳务管理员',
    level: '项目',
    status: '启用',
    source: '自定义角色',
    remark: '',
    sortOrder: 7,
    updatedBy: '系统管理员',
    updatedAt: '2025-07-10 16:18:33',
    webMenuIds: ['workbench', 'labor'],
    appMenuIds: ['app-workbench', 'app-labor'],
  },
  {
    id: 'role-vehicle',
    name: '车辆管理员',
    level: '项目',
    status: '启用',
    source: '自定义角色',
    remark: '',
    sortOrder: 8,
    updatedBy: '系统管理员',
    updatedAt: '2025-06-28 10:40:12',
    webMenuIds: ['workbench', 'vehicle'],
    appMenuIds: ['app-workbench', 'app-vehicle'],
  },
  {
    id: 'role-bd',
    name: '基础数据维护员',
    level: '指挥部',
    status: '启用',
    source: '自定义角色',
    remark: '',
    sortOrder: 9,
    updatedBy: '系统管理员',
    updatedAt: '2025-05-16 09:55:27',
    webMenuIds: ['workbench', 'basic-data'],
    appMenuIds: ['app-workbench'],
  },
  {
    id: 'role-audit',
    name: '审计查看角色',
    level: '指挥部',
    status: '禁用',
    source: '自定义角色',
    remark: '只读审计',
    sortOrder: 10,
    updatedBy: '郭俊',
    updatedAt: '2025-04-02 13:20:08',
    webMenuIds: ['workbench', 'sys-log'],
    appMenuIds: ['app-workbench'],
  },
  {
    id: 'role-external',
    name: '外部协作',
    level: '项目',
    status: '启用',
    source: '自定义角色',
    remark: '外部单位受限权限',
    sortOrder: 11,
    updatedBy: '系统管理员',
    updatedAt: '2025-03-25 08:12:56',
    webMenuIds: ['workbench', 'labor-realname'],
    appMenuIds: ['app-workbench', 'app-labor-realname'],
  },
  {
    id: 'role-integration',
    name: '对接管理员',
    level: '指挥部',
    status: '启用',
    source: '系统角色',
    remark: '',
    sortOrder: 12,
    updatedBy: '系统管理员',
    updatedAt: '2025-02-14 17:45:30',
    webMenuIds: ['workbench', 'sys-integration'],
    appMenuIds: ['app-workbench'],
  },
]

function cloneRole(role) {
  return {
    ...role,
    webMenuIds: migrateMenuIdsByLevel(role.webMenuIds || [], role.level),
    appMenuIds: migrateMenuIdsByLevel(role.appMenuIds || [], role.level),
  }
}

export const roleRecords = ref(initialRoles.map(cloneRole))

let roleIdSeq = 200

function nowText() {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

export function listRoles() {
  return roleRecords.value
}

export function getRole(id) {
  return roleRecords.value.find((item) => item.id === id) || null
}

export function createEmptyRole() {
  return {
    name: '',
    level: '',
    status: '启用',
    source: '自定义角色',
    remark: '',
    sortOrder: 0,
    updatedBy: '系统管理员',
    updatedAt: nowText(),
    webMenuIds: [],
    appMenuIds: [],
  }
}

export function cloneRoleRecord(role) {
  return cloneRole(role)
}

export function saveRole(payload, id) {
  const data = {
    ...payload,
    webMenuIds: migrateMenuIdsByLevel(payload.webMenuIds || [], payload.level),
    appMenuIds: migrateMenuIdsByLevel(payload.appMenuIds || [], payload.level),
    updatedAt: nowText(),
    updatedBy: '系统管理员',
  }
  if (id) {
    const idx = roleRecords.value.findIndex((item) => item.id === id)
    if (idx < 0) return null
    const existing = roleRecords.value[idx]
    roleRecords.value[idx] = {
      ...existing,
      ...data,
      id,
      source: existing.source === '系统角色' ? '系统角色' : data.source,
    }
    return roleRecords.value[idx]
  }
  const created = { ...data, id: `role-${++roleIdSeq}` }
  roleRecords.value.unshift(created)
  return created
}

export function deleteRole(id) {
  const role = getRole(id)
  if (!role) return { ok: false, message: '角色不存在' }
  if (role.source === '系统角色') return { ok: false, message: '系统角色不可删除' }
  const idx = roleRecords.value.findIndex((item) => item.id === id)
  roleRecords.value.splice(idx, 1)
  return { ok: true }
}

export function toggleRoleStatus(id) {
  const role = getRole(id)
  if (!role) return false
  role.status = role.status === '启用' ? '禁用' : '启用'
  role.updatedAt = nowText()
  return true
}

/** 兼容旧导出 */
export const roleList = roleRecords.value
