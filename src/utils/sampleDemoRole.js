/**
 * 样板管理 Demo 角色（施工 / 监理 / 项目经理）
 * 用于侧栏审批菜单显隐与办理节点校验
 */
import { ref, computed } from 'vue'

const STORAGE_KEY = 'sample-demo-role'

export const SAMPLE_DEMO_ROLE_OPTIONS = [
  { value: 'contractor', label: '施工' },
  { value: 'supervisor', label: '监理' },
  { value: 'pm', label: '项目经理' },
]

function readStored() {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    if (SAMPLE_DEMO_ROLE_OPTIONS.some((o) => o.value === v)) return v
  } catch {
    /* ignore */
  }
  return 'contractor'
}

export const sampleDemoRole = ref(readStored())

export function setSampleDemoRole(role) {
  if (!SAMPLE_DEMO_ROLE_OPTIONS.some((o) => o.value === role)) return
  sampleDemoRole.value = role
  try {
    localStorage.setItem(STORAGE_KEY, role)
  } catch {
    /* ignore */
  }
}

export const sampleDemoRoleLabel = computed(() => {
  return SAMPLE_DEMO_ROLE_OPTIONS.find((o) => o.value === sampleDemoRole.value)?.label || '施工'
})

/** 审批菜单：监理、项目经理可见 */
export function canSeeSampleApproveMenu(role = sampleDemoRole.value) {
  return role === 'supervisor' || role === 'pm'
}

/** 办理节点：监理审 / 项目经理审 */
export function canApproveSampleNode(node, role = sampleDemoRole.value) {
  if (node === 'supervisor') return role === 'supervisor'
  if (node === 'pm') return role === 'pm'
  return false
}

export const SAMPLE_APPROVE_MENU_KEYS = new Set([
  'sample-material-approve',
  'sample-process-approve',
])
