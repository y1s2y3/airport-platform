import { getCurrentUserSnapshot, demoActingUserId } from '../../mock/currentUser.js'
import { hydrateWebSession, webLoginAccount } from '../../mock/webSession.js'
import { listSysUsers } from '../../mock/sysUsers.js'
import { getOrgInfo, getOrgPositions } from '../../mock/orgStructure.js'

export function taskUserLabel(user) {
  const org = getOrgInfo(user.orgId)
  const positions = getOrgPositions(user.orgId).filter(position => (user.positions || []).includes(position.id)).map(position => position.name)
  const context = [org?.orgName, ...positions].filter(Boolean).join('-')
  return context ? `${user.name}（${context}）` : user.name
}

export function dispatchTaskOperator() {
  if (!webLoginAccount.value) hydrateWebSession()
  const users = listSysUsers(), account = webLoginAccount.value
  const snapshot = getCurrentUserSnapshot()
  const user = account ? users.find(item => item.loginAccount === account && item.status === true)
    : demoActingUserId.value ? users.find(item => item.id === demoActingUserId.value && item.status === true)
      : users.find(item => item.status === true && (item.id === snapshot.id || item.name === snapshot.name)) || snapshot
  return user ? { id: user.id, name: user.name, label: taskUserLabel(user) } : { id: '', name: '', label: '' }
}

export function dispatchTaskUserOptions() {
  return listSysUsers().filter(user => user.status === true).map(user => ({ value: taskUserLabel(user), label: taskUserLabel(user), userId: user.id }))
}
