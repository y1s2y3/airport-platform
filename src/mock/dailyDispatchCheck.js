import { ledgerSummary } from '../utils/dailyDispatchLedgerQuery.js'
import { REVIEW_DATES, upgradeInspectionDay, fullReviewExample } from './dailyDispatchUpgrade.js'
/**
 * 浏览器原型仓储：IndexedDB 事务仅演示同浏览器同源标签页的锁/版本/审计。
 * 生产接入时以同名异步 API 替换；服务端必须重新执行权限、原子锁及版本校验。
 */
import { canPopulateExample, createExampleDay, canPopulateReviewExample, hasPrototypeExampleParts, repairExampleDay, exampleValidationErrors } from './dailyDispatchCheckExamples.js'
import { clone, emptyDay, emptyPerson, localDate, offsetDate, deletionReason, validateHq, validatePerson, instructionText, emptyRow, activeCheck, isLegacyCheck, CHECK_FIELDS, text, rowHasContent, hqHasBeenSaved } from '../utils/dailyDispatchCheckRules.js'

export const DAILY_DB_NAME = 'airport-daily-dispatch-check-v1'
export const DAILY_CHANGE_EVENT = 'daily-dispatch-check:changed'
export const LOCK_TTL = 120000 // 仅用于原型演示，不是正式业务超时规范
const request = (req) => new Promise((resolve, reject) => { req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error) })
const uid = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`
export const lockKey = (date, projectId = '', part = 'hq') => part === 'hq' ? `${date}:hq` : `${date}:${projectId}:${part}`

export function createDailyDispatchRepository({ databaseName = DAILY_DB_NAME, getProjects = () => [], getDispatchProjectIds = null, getUsers = () => [], onWarning = () => {}, indexedDB = globalThis.indexedDB, now = () => Date.now(), onChange = () => {} } = {}) {
  let dbPromise
  let initializing
  function open() {
    if (!indexedDB) return Promise.reject(new Error('当前环境不支持本地演示存储，请使用支持 IndexedDB 的浏览器'))
    if (!dbPromise) dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(databaseName, 1)
      req.onupgradeneeded = () => {
        const db = req.result
        db.createObjectStore('days', { keyPath: 'date' })
        db.createObjectStore('locks', { keyPath: 'key' })
        db.createObjectStore('logs', { keyPath: 'id', autoIncrement: true })
        db.createObjectStore('meta', { keyPath: 'key' })
      }
      req.onsuccess = () => { req.result.onversionchange = () => req.result.close(); resolve(req.result) }
      req.onerror = () => { dbPromise = null; reject(req.error) }
      req.onblocked = () => reject(new Error('本地存储升级被旧标签页阻塞，请关闭旧页面后重试'))
    })
    return dbPromise
  }
  async function transaction(names, mode, action) {
    const db = await open()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(names, mode)
      const stores = Object.fromEntries(names.map((n) => [n, tx.objectStore(n)]))
      let result, failure
      tx.oncomplete = () => resolve(result)
      tx.onabort = () => reject(failure || tx.error || new Error('本地保存失败，内容尚未保存，请重试'))
      tx.onerror = () => { /* onabort 统一报告，不能把失败当作成功 */ }
      Promise.resolve().then(() => action(stores)).then((value) => { result = value }).catch((error) => { failure = error; tx.abort() })
    })
  }
  const timestamp = () => new Date(now()).toISOString()
  function readProjectScope() {
    let catalog
    try {
      catalog = getProjects()
      if (!Array.isArray(catalog) || catalog.some(p => !p || !text(p.id)) || new Set(catalog.map(p => p.id)).size !== catalog.length) throw new Error('Invalid project list')
    } catch { return { projects: null, catalog: null } }
    try {
      if (catalog.some(p => typeof p.hidden !== 'boolean')) throw new Error('Visibility unavailable')
      return { projects: catalog.filter(p => !p.hidden), catalog, kind: 'current' }
    } catch { return { projects: catalog, catalog, kind: 'all' } }
  }
  async function createDay(date, days, scope, warnings) {
    let projects = scope.projects, source
    if (projects === null) {
      const previousDate = offsetDate(date, -1), previous = await request(days.get(previousDate))
      const rows = previous?.hq?.rows
      if (!Array.isArray(rows) || rows.some(row => !row || !text(row.projectId)) || new Set(rows.map(row => row.projectId)).size !== rows.length) {
        throw Object.assign(new Error('项目数据异常：当前及昨日项目清单均不可用，暂无法生成检查表，请重试或联系管理员。'), { code: 'DAILY_PROJECT_SOURCE_UNAVAILABLE' })
      }
      // Reuse only yesterday's membership and names, never its checks, people, images or dispatch flags.
      projects = rows.map(row => ({ id: row.projectId, projectName: row.projectName }))
      source = { kind: 'yesterday', date: previousDate }
      warnings.add('项目数据读取失败，已使用昨日项目清单。')
    } else if (scope.kind === 'all') {
      source = { kind: 'all' }
      warnings.add('项目隐藏配置读取异常，已显示全部项目。')
    }
    return { ...emptyDay(date, projects, timestamp()), ...(source ? { projectSource: source } : {}) }
  }
  function seedDay(date, scenario, projects) {
    const day = { ...emptyDay(date, projects.slice(0, 5), timestamp()), demo: true }
    if (scenario === 3) return day
    const time = `${date}T09:30:00.000Z`
    const operator = { id: 'demo-operator', name: '演示填写人', loginAccount: 'demo.dispatch' }
    Object.assign(day.hq, { version: 1, firstSubmittedAt: time, updatedAt: time, operator })
    Object.assign(day.hq.headers, { focusDepartment: '安质部、项目管理部（模拟）', attendance: '施工、监理人员参会（模拟）', dispatcher: '李佳（模拟）', departmentAttendance: '按实际参会情况记录（模拟）' })
    day.hq.rows.slice(0, 2).forEach((r) => {
      r.unified = true
      if (scenario === 2 && r === day.hq.rows[1]) return
      r.personnel = { type: 'ok', text: '' }; r.safety = { type: '', problems: [], other: '' }; r.quality = { type: '', problems: [], other: '' }; r.camera = { type: '', problems: [], other: '' }
      for (const k of ['safety', 'quality', 'camera']) r[k].type = 'normal'
    })
    if (scenario === 0 && day.hq.rows[0]) {
      day.hq.rows[0].safety = { type: 'problem', problems: ['临边防护缺失，需补设防护栏（模拟）', '作业区域材料堆放不整齐（模拟）'], other: '' }
      day.hq.rows[0].camera = { type: 'problem', problems: ['东侧摄像头画面遮挡（模拟）'], other: '' }
      if (day.hq.rows[2]) day.hq.rows[2].safety = { type: 'problem', problems: ['非统一调度项目的检查记录，不计入本日统计（模拟）'], other: '' }
      if (day.hq.rows[3]) day.hq.rows[3].camera = { type: 'other', problems: [], other: '已停工，暂不具备现场检查条件（模拟）' }
      const projectId = day.hq.rows[0].projectId
      const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="480" height="240"><rect width="480" height="240" fill="#f3f4f6"/><rect x="24" y="24" width="432" height="192" rx="8" fill="white" stroke="#8f0045"/><text x="48" y="80" font-size="24" fill="#8f0045">原型演示截图</text><text x="48" y="126" font-size="18" fill="#646a73">仅供附件上传、预览与导出验证</text><text x="48" y="174" font-size="18" fill="#646a73">不代表真实项目现场</text></svg>'
      if (getUsers(projectId).some(user => user.status === true)) day.people[projectId] = { duty: { ...emptyPerson(), schemaVersion: 1, name: '张工（模拟）', text: '施工、监理值班人员在岗，已检查现场防护（模拟）', images: [{ name: '原型演示截图.svg', url: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`, size: svg.length, kind: 'image' }], version: 1, firstSubmittedAt: time, updatedAt: time, operator } }
    }
    return repairExampleDay(upgradeInspectionDay(day, getUsers), getUsers)
  }
  async function ensure() {
    if (initializing) return initializing
    const scope = readProjectScope(), warnings = new Set()
    initializing = transaction(['days', 'meta', 'locks'], 'readwrite', async ({ days, meta, locks }) => {
      const today = localDate(new Date(now()))
      const seed = await request(meta.get('initialized'))
      if (!seed && scope.projects) {
        for (let i = 4; i >= 1; i--) {
          const date = offsetDate(today, -i)
          if (!await request(days.get(date))) await request(days.put(seedDay(date, 4 - i, scope.projects)))
        }
        await request(meta.put({ key: 'initialized', value: true }))
      }
      const last = await request(meta.get('lastAutoDate'))
      let date = last?.value && last.value < today ? offsetDate(last.value, 1) : today
      while (date <= today) {
        if (!await request(days.get(date))) await request(days.put(await createDay(date, days, scope, warnings)))
        date = offsetDate(date, 1)
      }
      await request(meta.put({ key: 'lastAutoDate', value: today }))
      // Populate the prototype's 30-day review window once, without replacing any existing data.
      if (scope.projects && !await request(meta.get('v4ReviewWindow'))) {
        for (let i = 29; i >= 0; i--) {
          const date = offsetDate(today, -i)
          if (!await request(days.get(date))) await request(days.put({ ...await createDay(date, days, scope, warnings), demo: true }))
        }
        await request(meta.put({ key: 'v4ReviewWindow', value: true }))
      }
      if (scope.projects && !await request(meta.get('v4ExtraExamples'))) {
        const occupied = await request(locks.getAll())
        for (let index = 0; index < 8; index++) {
          const date = offsetDate(today, -5 - index), day = await request(days.get(date))
          if (canPopulateExample(day) && !occupied.some(lock => lock.key.startsWith(date + ':') && lock.expiresAt > now())) await request(days.put(createExampleDay(day, index, getUsers)))
        }
        await request(meta.put({ key: 'v4ExtraExamples', value: true }))
      }
      // Upgrade and explicit review fixtures are atomic and defer while a date is being edited.
      const activeLocks = await request(locks.getAll())
      const allDays = await request(days.getAll())
      if (scope.projects) for (const targetDate of REVIEW_DATES) if (!allDays.some(d => d.date === targetDate)) allDays.push(await createDay(targetDate, days, scope, warnings))
      for (const original of allDays) {
        if (activeLocks.some(lock => lock.key.startsWith(original.date + ':') && lock.expiresAt > now())) continue
        const exampleKey = 'full-review-v1:' + original.date
        const fillExample = !!scope.projects && REVIEW_DATES.includes(original.date) && !await request(meta.get(exampleKey)) && canPopulateReviewExample(original)
        let upgraded = upgradeInspectionDay(original, getUsers)
        if (fillExample) upgraded = fullReviewExample(upgraded, scope.catalog, getUsers)
        const validationKey = 'example-validation-v1:' + original.date
        if (hasPrototypeExampleParts(upgraded) && !await request(meta.get(validationKey))) {
          const repaired = repairExampleDay(upgraded, getUsers)
          if (JSON.stringify(repaired) !== JSON.stringify(upgraded)) {
            const backupKey = 'before-example-validation-v1:' + original.date
            if (!await request(meta.get(backupKey))) await request(meta.put({ key: backupKey, value: clone(original), at: timestamp() }))
          }
          upgraded = repaired
          if (!exampleValidationErrors(upgraded, getUsers).length) await request(meta.put({ key: validationKey, value: true }))
        }
        if (JSON.stringify(upgraded) !== JSON.stringify(original)) {
          const backupKey = 'before-current-format:' + original.date
          if (!await request(meta.get(backupKey))) await request(meta.put({ key: backupKey, value: clone(original), at: timestamp() }))
          if (!fillExample) {
            if (JSON.stringify(upgraded.hq) !== JSON.stringify(original.hq)) upgraded.hq.version = original.hq.version ? original.hq.version + 1 : 0
            for (const [id, parts] of Object.entries(upgraded.people || {})) for (const part of ['duty','manager']) if (parts[part] && JSON.stringify(parts[part]) !== JSON.stringify(original.people?.[id]?.[part])) parts[part].version = original.people?.[id]?.[part]?.version ? original.people[id][part].version+1 : 0
          }
          await request(days.put(upgraded))
        }
        if (fillExample) await request(meta.put({ key: exampleKey, value: true }))
      }
    }).then(value => { for (const message of warnings) onWarning(message); return value }).finally(() => { initializing = null })
    return initializing
  }
  async function listDays() {
    await ensure()
    return transaction(['days'], 'readonly', async ({ days }) => (await request(days.getAll())).sort((a, b) => b.date.localeCompare(a.date)))
  }
  async function listLedgerSummaries() {
    await ensure()
    // Scan local records one at a time; retain only compact display fields in the ledger.
    // This is frontend pagination over IndexedDB, not a service-side paginated endpoint.
    return transaction(['days'], 'readonly', ({ days }) => new Promise((resolve, reject) => {
      const rows = [], cursor = days.openCursor(null, 'prev')
      cursor.onerror = () => reject(cursor.error)
      cursor.onsuccess = () => {
        try {
          if (!cursor.result) return resolve(rows)
          rows.push(ledgerSummary(cursor.result.value))
          cursor.result.continue()
        } catch (error) { reject(error) }
      }
    }))
  }
  async function getDay(date) {
    await ensure()
    return transaction(['days'], 'readonly', async ({ days }) => {
      const day = await request(days.get(date))
      if (!day) throw new Error('该日期尚无检查记录，不支持手动补建历史记录')
      return day
    })
  }
  async function prepareHq(date, lock, operator) {
    await ensure()
    return transaction(['days', 'locks', 'meta'], 'readwrite', async ({ days, locks, meta }) => {
      const current = await request(locks.get(lockKey(date)))
      if (!current || current.token !== lock?.token || current.expiresAt <= now() || current.owner.id !== operator?.id) throw new Error('编辑锁已失效，未初始化调度默认值')
      const day = await request(days.get(date))
      if (!day) throw new Error('检查记录不存在')
      if (hqHasBeenSaved(day.hq)) return day
      if (Object.prototype.hasOwnProperty.call(day, 'dispatchDefaults')) {
        // Retire the old cache without touching business sections, membership, save times or audit.
        delete day.dispatchDefaults
        // Preserve the old cache's protection against factory demo regeneration on review dates.
        // This existing fixture marker is never used to decide whether HQ has been saved.
        if (REVIEW_DATES.includes(date)) await request(meta.put({ key: 'full-review-v1:' + date, value: true }))
        await request(days.put(day))
      }
      const included = new Set(day.hq.rows.map(row => row.projectId))
      let projectIds = []
      try {
        const scope = readProjectScope(), visible = new Set((scope.projects || []).map(project => project.id))
        const ids = getDispatchProjectIds ? getDispatchProjectIds() : (scope.catalog || []).filter(project => project.dispatchTag === true).map(project => project.id)
        if (!Array.isArray(ids)) throw new Error('Dispatch tags unavailable')
        projectIds = [...new Set(ids.filter(id => included.has(id) && visible.has(id)))]
      } catch { /* Missing or invalid upstream values leave every initial checkbox false. */ }
      // Session-only input for hqDraftForEditing. Never put this returned object into IndexedDB.
      return { ...day, hqPrefillProjectIds: projectIds }
    })
  }
  async function acquire(key, owner, { resumeToken = '' } = {}) {
    return transaction(['locks'], 'readwrite', async ({ locks }) => {
      const old = await request(locks.get(key))
      if (old && old.expiresAt > now() && !(key.endsWith(':hq') && resumeToken && old.token === resumeToken && old.owner.id === owner.id)) {
        const error = new Error(`当前内容正在由${old.owner.name || '其他用户'}填写`)
        error.code = 'DAILY_EDIT_OCCUPIED'
        throw error
      }
      const lock = { key, owner: clone(owner), token: uid(), expiresAt: now() + LOCK_TTL }
      await request(locks.put(lock))
      return lock
    })
  }
  async function renew(lock) {
    return transaction(['locks'], 'readwrite', async ({ locks }) => {
      const current = await request(locks.get(lock.key))
      if (!current || current.token !== lock.token || current.expiresAt <= now()) throw Object.assign(new Error('编辑会话已过期或被占用，请保留当前内容并重新读取最新记录'), { code: 'DAILY_EDIT_EXPIRED' })
      current.expiresAt = now() + LOCK_TTL
      await request(locks.put(current))
      return current
    })
  }
  async function release(lock) {
    if (!lock) return
    return transaction(['locks'], 'readwrite', async ({ locks }) => {
      const current = await request(locks.get(lock.key))
      if (current?.token === lock.token) await request(locks.delete(lock.key))
    })
  }
  const projectById = id => getProjects().find(p => p.id === id)
  function addSharedProject(day, projectId) {
    if (day.hq.rows.some(r => r.projectId === projectId)) return
    const project = projectById(projectId)
    if (!project || project.hidden) throw new Error('只能选择未隐藏的已有项目')
    day.hq.rows.push(day.removedRows?.[projectId] || emptyRow(project))
    if (day.removedRows) delete day.removedRows[projectId]
  }
  async function ensureProject(date, projectId) {
    await ensure()
    const result = await transaction(['days'], 'readwrite', async ({ days }) => {
      const current = await request(days.get(date))
      if (!current) throw new Error('检查记录不存在')
      // A saved date owns its membership and name snapshots, independently of current master visibility.
      if (current.hq.rows.some(row => row.projectId === projectId)) return { day: current, added: false }
      const project = projectById(projectId)
      if (!project || project.hidden) throw new Error('当前新增选择只能使用未隐藏项目')
      addSharedProject(current, projectId)
      await request(days.put(current))
      return { day: current, added: true }
    })
    if (result.added) onChange({ date, projectId, part: 'scope' })
    return result.day
  }
  function selectedUser(id, scope) {
    const user = getUsers(scope).find(u => u.id === id && u.status === true)
    if (!user) throw new Error(scope === 'dispatch' ? '请选择安全质量管理部的启用人员' : '请选择启用的系统用户')
    return user
  }
  async function submit({ date, projectId = '', part = 'hq', content, version, lock, operator }) {
    if (!['hq', 'duty', 'manager'].includes(part)) throw new Error('填写部分无效')
    if (!content || !operator?.id) throw new Error('保存参数无效')
    const saved = await transaction(['days', 'locks', 'logs'], 'readwrite', async ({ days, locks, logs }) => {
      const key = lockKey(date, projectId, part)
      const currentLock = await request(locks.get(key))
      if (!currentLock || currentLock.token !== lock?.token || currentLock.expiresAt <= now() || currentLock.owner.id !== operator.id) throw Object.assign(new Error('编辑占用已失效，请返回台账后重新进入填写'), { code: 'DAILY_EDIT_EXPIRED' })
      const day = await request(days.get(date))
      if (!day) throw new Error('检查记录不存在')
      const before = clone(part === 'hq' ? day.hq : day.people[projectId]?.[part] || emptyPerson())
      if (before.version !== version) throw Object.assign(new Error('内容版本已更新，请返回台账后重新进入填写'), { code: 'DAILY_EDIT_CONFLICT' })
      if (part !== 'hq' && before.firstSubmittedAt && before.schemaVersion !== 4) throw new Error('记录结构已更新，请刷新后重新进入编辑')
      const error = part === 'hq' ? validateHq(content, before) : validatePerson(content)
      if (error) throw new Error(error)
      let next
      if (part === 'hq') {
        const headers = Object.fromEntries(['focusDepartment', 'attendance', 'departmentAttendance'].map(k => [k, text(content.headers[k])]))
        const dispatcherId = text(content.headers.dispatcherId)
        const user = dispatcherId ? selectedUser(dispatcherId, 'dispatch') : null
        headers.dispatcherId = user?.id || ''; headers.dispatcher = user?.name || ''
        // Scope changes are explicit ID operations. A stale page never deletes newly joined rows.
        const operations = content.scopeChanges || { addedIds: [], removedIds: [] }
        if (!Array.isArray(operations.addedIds) || !Array.isArray(operations.removedIds)) throw new Error('项目范围变更格式无效')
        for (const id of new Set(operations.addedIds)) addSharedProject(day, id)
        for (const id of new Set(operations.removedIds)) {
          const row = day.hq.rows.find(r => r.projectId === id)
          if (!row) continue
          const reason = deletionReason(null, day.people[id], row)
          if (reason) throw new Error(row.projectName + '：' + reason + '，请刷新最新项目内容')
          day.removedRows ||= {}; day.removedRows[id] = clone(row)
          day.hq.rows = day.hq.rows.filter(r => r.projectId !== id)
        }
        for (const incoming of content.rows) {
          if (operations.removedIds.includes(incoming.projectId)) continue
          const row = day.hq.rows.find(r => r.projectId === incoming.projectId)
          if (!row) throw new Error('该项目不在当日范围中，请先添加项目')
          const previouslySubmitted = row.hasSubmittedContent || rowHasContent(row)
          row.unified = !!incoming.unified
          for (const k of ['personnel', ...CHECK_FIELDS, 'remark']) {
            if (incoming[k] == null) continue
            if (row[k] == null && (CHECK_FIELDS.includes(k) || k === 'personnel') && !incoming[k]?.type) continue
            if (row[k] == null && k === 'remark' && !text(incoming[k].text) && !incoming[k].images?.length) continue
            // Unchanged legacy values stay byte-for-byte equivalent; never infer a new branch.
            if (JSON.stringify(row[k]) === JSON.stringify(incoming[k])) continue
            if (isLegacyCheck(incoming[k]) || incoming[k]?.type === 'ok') throw new Error('记录结构已更新，请刷新后重新进入编辑')
            row[k] = CHECK_FIELDS.includes(k) ? activeCheck(incoming[k]) : k === 'personnel' ? { type: incoming[k].type || '', text: incoming[k].type === 'other' ? text(incoming[k].text) : '' } : { text: text(incoming[k].text), images: clone(incoming[k].images || []) }
          }
          if (previouslySubmitted || rowHasContent(row)) row.hasSubmittedContent = true
        }
        next = { ...clone(before), headers, note: content.note, rows: day.hq.rows }
      } else {
        addSharedProject(day, projectId)
        const user = selectedUser(content.userId, projectId)
        next = { schemaVersion: 4, userId: user.id, name: user.name, check: activeCheck(content.check) }
      }
      const at = timestamp()
      Object.assign(next, { version: before.version + 1, firstSubmittedAt: before.firstSubmittedAt || at, updatedAt: at, operator: clone(operator) })
      if (part === 'hq') day.hq = next
      else { day.people[projectId] ||= {}; day.people[projectId][part] = next }
      await request(days.put(day))
      await request(logs.add({ date, projectId, part, at, operator: clone(operator), before: clone(before), after: clone(next) }))
      await request(locks.delete(key))
      return day
    })
    onChange({ date, projectId, part })
    return saved
  }
  return { ensure, listDays, listLedgerSummaries, getDay, prepareHq, ensureProject, acquire, renew, release, submit,
    getLogs: () => transaction(['logs'], 'readonly', ({ logs }) => request(logs.getAll())),
    close: async () => { if (dbPromise) (await dbPromise).close(); dbPromise = null },
  }
}
