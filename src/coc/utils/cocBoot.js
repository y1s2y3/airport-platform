import { FOCUS_PROJECT_ID, HQ_SELECTION_ID, getProjectShortName } from '../mock/data.js'

const VIEW_MODES = new Set(['hq', 'project', 'dispatch'])

function readEnvBoot() {
  try {
    // vite define 在构建时注入
    if (typeof __COC_BOOT__ === 'undefined') return {}
    const raw = __COC_BOOT__
    if (typeof raw === 'string') return JSON.parse(raw)
    return raw && typeof raw === 'object' ? raw : {}
  } catch {
    return {}
  }
}

function readUrlBoot() {
  const params = new URLSearchParams(window.location.search)
  const hash = window.location.hash || ''
  const hashQuery = hash.includes('?') ? hash.slice(hash.indexOf('?') + 1) : ''
  const hashParams = new URLSearchParams(hashQuery)
  const out = {}
  const view = params.get('view') || hashParams.get('view')
  const projectId = params.get('project') || hashParams.get('project')
  if (view) out.view = view
  if (projectId) out.projectId = projectId
  return out
}

/** 解析 COC 大屏初始视图：hq | project | dispatch */
export function resolveCocBootConfig() {
  const env = readEnvBoot()
  const url = readUrlBoot()
  const view = url.view || env.view || 'hq'
  const projectId = url.projectId || env.projectId || FOCUS_PROJECT_ID
  return {
    view: VIEW_MODES.has(view) ? view : 'hq',
    projectId,
  }
}

export function createCocInitialState(boot = resolveCocBootConfig()) {
  if (boot.view === 'hq') {
    return {
      selectedProjectId: HQ_SELECTION_ID,
      homeProjectDispatchId: null,
      homeProjectDispatchLabel: '',
      homeProjectDispatchDeviceId: null,
    }
  }

  const label = getProjectShortName(boot.projectId)
  if (boot.view === 'dispatch') {
    return {
      selectedProjectId: boot.projectId,
      homeProjectDispatchId: boot.projectId,
      homeProjectDispatchLabel: label,
      homeProjectDispatchDeviceId: null,
    }
  }

  return {
    selectedProjectId: boot.projectId,
    homeProjectDispatchId: null,
    homeProjectDispatchLabel: '',
    homeProjectDispatchDeviceId: null,
  }
}
