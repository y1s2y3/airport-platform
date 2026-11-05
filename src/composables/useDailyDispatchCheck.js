import { ElMessage } from 'element-plus'
import { inspectionSelectableUsers } from '../mock/inspectionPersonnel.js'
import { projectList } from '../mock/projectBasicInfo.js'
import { projectDispatchTag, readProjectDispatchTags } from './useProjectDispatchTags.js'
import { listSysUsers } from '../mock/sysUsers.js'
import { getCurrentUserSnapshot } from '../mock/currentUser.js'
import { webLoginAccount, hydrateWebSession } from '../mock/webSession.js'
import { createDailyDispatchRepository, DAILY_CHANGE_EVENT } from '../mock/dailyDispatchCheck.js'

const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('airport-daily-dispatch-check') : null
function notify(detail) { window.dispatchEvent(new CustomEvent(DAILY_CHANGE_EVENT, { detail })) }
if (channel) channel.onmessage = ({ data }) => notify(data)
export const dailyDispatchRepository = createDailyDispatchRepository({
  getUsers: inspectionSelectableUsers,
  onWarning: message => ElMessage.warning(message),
  getDispatchProjectIds: () => { const tags = readProjectDispatchTags(); return projectList.filter(project => !project.hidden && tags[project.id] === true).map(project => project.id) },
  getProjects: () => projectList.map((project) => ({ ...project, dispatchTag: projectDispatchTag(project.id) })),
  onChange: (detail) => { notify(detail); channel?.postMessage(detail) },
})
export function dispatchOperator() {
  if (!webLoginAccount.value) hydrateWebSession()
  const account = webLoginAccount.value
  const user = account ? listSysUsers().find(item => item.loginAccount === account && item.status === true) : getCurrentUserSnapshot()
  if (!user) return { id: `web:${account}`, name: account, loginAccount: account }
  return { id: user.id, name: user.name, loginAccount: account || user.loginAccount }
}
export const DAILY_BASE = '/coc-admin/daily-dispatch-check'
export const dailyProjectOptions = () => projectList.map((p) => ({ id: p.id, projectName: p.projectName || p.shortName, hidden: p.hidden }))
