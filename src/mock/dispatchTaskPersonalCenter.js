import { getDispatchNoticeRecords } from '../coc/utils/dispatchMeetingStorage.js'
import { projectTaskProcesses } from '../coc/utils/dispatchTaskWorkflow.js'
import { listSysUsers } from './sysUsers.js'

/** 个人流程记录只是任务单的投影，回复与时间始终从任务单读取。 */
export function installDispatchTaskPersonalCenter(store) {
  let syncing = false
  function reconcile(list, expected) {
    const byId = new Map(expected.map(item => [item.id, item]))
    for (let index = list.length - 1; index >= 0; index -= 1) {
      const item = list[index]
      if (item.type !== 'dispatch_notice') continue
      const next = byId.get(item.id)
      if (!next) list.splice(index, 1)
      else { Object.assign(item, next); byId.delete(item.id) }
    }
    list.unshift(...byId.values())
  }
  function sync() {
    if (syncing) return
    syncing = true
    try {
      const users = listSysUsers(), projections = getDispatchNoticeRecords().map(task => projectTaskProcesses(task, users))
      reconcile(store.todos, projections.flatMap(item => item.todos))
      reconcile(store.done, projections.flatMap(item => item.done))
    } finally { syncing = false }
  }
  sync()
  window.addEventListener('coc-dispatch-meeting-change', sync)
  window.addEventListener('storage', event => {
    if (event.key === 'coc-admin-dispatch-notices' || event.key === null) sync()
  })
  return sync
}
