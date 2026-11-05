/** These cases use native IndexedDB in an isolated browser origin. */
export async function prefillRepositoryCases() {
  const { createDailyDispatchRepository, lockKey, LOCK_TTL } = await import('/src/mock/dailyDispatchCheck.js')
  const R = await import('/src/utils/dailyDispatchCheckRules.js')
  const checks = [], scenarios = {}
  const ok = (name, value) => { if (!value) throw new Error(name); checks.push(name) }
  async function reject(name, action) { let failure; try { await action() } catch (error) { failure = error } ok(name, !!failure); return failure }
  const databaseName = 'inspection-prefill-v1.1-' + crypto.randomUUID()
  const clock = { value: new Date(2026, 10, 20, 12).getTime() }, date = R.localDate(new Date(clock.value))
  const owner = { id: 'prefill-writer', name: '预填验证用户', loginAccount: 'prefill-test' }
  const projects = ['A', 'B', 'C', 'H'].map(id => ({ id, projectName: '项目' + id, hidden: id === 'H' }))
  let selected = ['A', 'B', 'H'], tagReads = 0, unavailable = false, invalidTags = false
  const users = [{ id: 'staff', name: '项目人员', status: true }]
  const repo = createDailyDispatchRepository({ databaseName, now: () => clock.value,
    getProjects: () => projects.map(project => ({ ...project })), getUsers: () => users,
    getDispatchProjectIds: () => { tagReads++; if (unavailable) throw new Error('tag failure'); return invalidTags ? {} : [...selected] } })
  let db
  const request = query => new Promise((resolve, reject) => { query.onsuccess = () => resolve(query.result); query.onerror = () => reject(query.error) })
  const read = (store, key) => request(db.transaction(store).objectStore(store).get(key))
  const write = (store, value) => new Promise((resolve, reject) => { const tx = db.transaction(store, 'readwrite'); tx.objectStore(store).put(value); tx.oncomplete = resolve; tx.onabort = () => reject(tx.error) })
  const enter = async (target = date) => { const lock = await repo.acquire(lockKey(target), owner); const day = await repo.prepareHq(target, lock, owner); return { target, lock, day, draft: R.hqDraftForEditing(day) } }
  const save = session => repo.submit({ date: session.target, content: R.hqPayload(session.draft), version: session.draft.version, lock: session.lock, operator: owner })
  const normal = row => row?.unified === true && row.personnel?.type === 'normal' && R.CHECK_FIELDS.every(key => row[key]?.type === 'normal')
  const blank = row => row?.unified === false && !row.personnel?.type && R.CHECK_FIELDS.every(key => !row[key]?.type)
  const row = (session, id) => session.draft.rows.find(item => item.projectId === id)
  try {
    await repo.ensure()
    db = await request(indexedDB.open(databaseName))
    const original = await read('days', date), originalLogs = JSON.stringify(await repo.getLogs())
    let session = await enter()
    ok('S1: A/B receive true plus all four normal defaults', normal(row(session, 'A')) && normal(row(session, 'B')) && blank(row(session, 'C')))
    ok('S1: hidden or out-of-scope tags do not create projects', !row(session, 'H') && session.day.hqPrefillProjectIds.join() === 'A,B')
    ok('S1: entering does not persist prefill, save markers, timestamps or audit', JSON.stringify(await read('days', date)) === JSON.stringify(original) && JSON.stringify(await repo.getLogs()) === originalLogs)
    scenarios.S1 = true
    session.draft.note = 'discarded overall note'; row(session, 'A').personnel = { type: 'other', text: 'discarded manual text' }
    await repo.release(session.lock); session = await enter()
    ok('S2: abandoning and reentering with unchanged tags builds a fresh normal draft', normal(row(session, 'A')) && normal(row(session, 'B')) && session.draft.note === '')
    ok('S2: unchanged tags are still reread for the next entry', tagReads === 2)
    scenarios.S2 = true
    await repo.release(session.lock); selected = ['B', 'C']; session = await enter()
    ok('S3: B/C replace A/B on the next unsaved entry', blank(row(session, 'A')) && normal(row(session, 'B')) && normal(row(session, 'C')))
    scenarios.S3 = true
    session.draft.note = 'x'.repeat(501)
    await reject('S4: failed validation rejects the transaction', () => save(session))
    ok('S4: validation failure does not mark HQ as saved', !R.hqHasBeenSaved((await read('days', date)).hq))
    await repo.release(session.lock); selected = ['A', 'C']; session = await enter()
    ok('S4: a validation failure still permits fresh tags on reentry', normal(row(session, 'A')) && blank(row(session, 'B')) && normal(row(session, 'C')))
    const originalPut = IDBObjectStore.prototype.put
    try {
      IDBObjectStore.prototype.put = function (value, ...args) { if (this.name === 'days' && value.date === date) throw new DOMException('forced storage failure', 'QuotaExceededError'); return originalPut.call(this, value, ...args) }
      await reject('S4: a native IndexedDB write failure aborts saving', () => save(session))
    } finally { IDBObjectStore.prototype.put = originalPut }
    ok('S4: write failure preserves HQ, audit and lease atomically', JSON.stringify(await read('days', date)) === JSON.stringify(original) && JSON.stringify(await repo.getLogs()) === originalLogs && (await read('locks', lockKey(date)))?.token === session.lock.token)
    await repo.release(session.lock); selected = ['B']; session = await enter()
    ok('S4: write failure does not prevent another fresh prefill', blank(row(session, 'A')) && normal(row(session, 'B')) && blank(row(session, 'C')))
    scenarios.S4 = true
    session.draft.note = 'persisted HQ note'
    let saved = await save(session), savedBytes = JSON.stringify(saved.hq), readsBefore = tagReads
    selected = ['A', 'C']; session = await enter()
    ok('S5: only a successful HQ transaction sets the first-save state', saved.hq.version === 1 && !!saved.hq.firstSubmittedAt)
    ok('S5: saved HQ is cloned without reading or applying changed tags', tagReads === readsBefore && !session.day.hqPrefillProjectIds && JSON.stringify({ ...session.draft, scopeChanges: undefined }) === JSON.stringify({ ...saved.hq, scopeChanges: undefined }))
    const cleared = row(session, 'B'); cleared.personnel = { type: '', text: '' }; for (const key of R.CHECK_FIELDS) cleared[key] = R.emptyCheck()
    saved = await save(session); selected = ['B']; session = await enter()
    ok('S5: explicitly cleared and resaved fields stay empty despite an enabled tag', row(session, 'B').unified && !row(session, 'B').personnel.type && R.CHECK_FIELDS.every(key => !row(session, 'B')[key].type) && saved.hq.version === 2 && tagReads === readsBefore)
    await repo.release(session.lock)
    scenarios.S5 = true
    const secondDate = R.offsetDate(date, -20)
    const staffLock = await repo.acquire(lockKey(secondDate, 'A', 'duty'), owner)
    const image = { name: 'fixture.svg', url: 'data:image/svg+xml;base64,PHN2Zy8+', size: 6 }
    await repo.submit({ date: secondDate, projectId: 'A', part: 'duty', content: { userId: 'staff', check: { ...R.emptyCheck(), type: 'normal', normalText: R.NORMAL_PROJECT_TEXT, normalImages: [image] } }, version: 0, lock: staffLock, operator: owner })
    const peopleBytes = JSON.stringify((await read('days', secondDate)).people)
    selected = ['A', 'B']; session = await enter(secondDate); await repo.release(session.lock); selected = ['C']; session = await enter(secondDate)
    ok('S6: saved project staff does not suppress fresh HQ defaults', normal(row(session, 'C')) && blank(row(session, 'A')) && !R.hqHasBeenSaved(session.day.hq))
    ok('S6: HQ preparation leaves the independent staff record byte-equivalent', JSON.stringify((await read('days', secondDate)).people) === peopleBytes)
    await repo.release(session.lock)
    scenarios.S6 = true
    readsBefore = tagReads; session = await enter(); row(session, 'C').unified = true
    const extra = { id: 'D', projectName: 'new project D', hidden: false }; projects.push(extra)
    session.draft.rows.push(R.emptyRow(extra)); session.draft.scopeChanges.addedIds.push('D'); row(session, 'D').unified = true
    ok('S7: manual selection and adding a project do not backfill checks', !row(session, 'C').safety && !row(session, 'D').safety && tagReads === readsBefore)
    saved = await save(session)
    ok('S7: saving those manual changes does not synthesize normal fields', saved.hq.rows.find(item => item.projectId === 'D').unified && !saved.hq.rows.find(item => item.projectId === 'D').safety)
    scenarios.S7 = true
    projects.find(item => item.id === 'A').hidden = true; selected = ['A', 'C']; session = await enter(secondDate)
    ok('S8: newly hidden historical projects remain linked and are not freshly initialized', row(session, 'A').projectName === '项目A' && blank(row(session, 'A')) && normal(row(session, 'C')))
    ok('S8: hiding a project preserves saved HQ membership and independent staff data', (await read('days', date)).hq.rows.some(item => item.projectId === 'A') && JSON.stringify((await read('days', secondDate)).people) === peopleBytes)
    await repo.release(session.lock)
    scenarios.S8 = true
    const membershipBefore = (await read('days', secondDate)).hq.rows.map(item => item.projectId).join()
    projects.find(item => item.id === 'H').hidden = false; selected = ['C', 'D', 'H']; session = await enter(secondDate)
    ok('Range: newly visible or tagged projects are not inserted by prefill', session.draft.rows.map(item => item.projectId).join() === membershipBefore && !row(session, 'H') && !row(session, 'D') && normal(row(session, 'C')))
    await repo.release(session.lock)
    ok('Range: entering and abandoning keep the persisted project membership unchanged', (await read('days', secondDate)).hq.rows.map(item => item.projectId).join() === membershipBefore)
    const explicitlyAdded = await repo.ensureProject(secondDate, 'H')
    ok('Range: only the explicit add operation expands the list without saving HQ', explicitlyAdded.hq.rows.some(item => item.projectId === 'H') && !R.hqHasBeenSaved(explicitlyAdded.hq))
    session = await enter(secondDate)
    ok('Range: next-entry prefill is limited to the explicitly expanded membership', normal(row(session, 'H')) && normal(row(session, 'C')) && !row(session, 'D'))
    await repo.release(session.lock)
    const oldDate = R.offsetDate(date, -19), legacy = await read('days', oldDate)
    legacy.dispatchDefaults = { projectIds: ['A'], initializedBy: owner, initializedAt: 'old-entry' }; await write('days', legacy)
    session = await enter(oldDate)
    ok('Compatibility: old persisted hits are retired rather than restored', !session.day.dispatchDefaults && normal(row(session, 'C')) && blank(row(session, 'A')))
    const retired = await read('days', oldDate)
    ok('Compatibility: retirement only removes cache metadata', !('dispatchDefaults' in retired) && !('hqPrefillProjectIds' in retired) && JSON.stringify(retired.hq) === JSON.stringify(legacy.hq) && JSON.stringify(retired.people) === JSON.stringify(legacy.people))
    await repo.release(session.lock)
    const reviewDate = '2026-10-24', review = { ...R.emptyDay(reviewDate, projects), demo: true, dispatchDefaults: { projectIds: ['A'] } }
    await write('days', review)
    await new Promise((resolve, reject) => { const tx = db.transaction('meta', 'readwrite'); tx.objectStore('meta').delete('full-review-v1:' + reviewDate); tx.oncomplete = resolve; tx.onabort = () => reject(tx.error) })
    session = await enter(reviewDate); await repo.release(session.lock)
    ok('Compatibility: retired demo caches cannot trigger a fake successful HQ save', !R.hqHasBeenSaved((await repo.getDay(reviewDate)).hq) && !(await read('days', reviewDate)).dispatchDefaults)
    unavailable = true; session = await enter(secondDate)
    ok('Unavailable tags: every current checkbox and check remains blank/false', session.draft.rows.every(blank))
    await repo.release(session.lock); unavailable = false; invalidTags = true; session = await enter(secondDate)
    ok('Invalid tag responses also produce a temporary empty selection', session.day.hqPrefillProjectIds.length === 0 && session.draft.rows.every(blank))
    await repo.release(session.lock); invalidTags = false
    session = await enter(secondDate); const readsAtExpiry = tagReads; clock.value += LOCK_TTL + 1
    await reject('Expired leases cannot mark a section as saved', () => save(session))
    await reject('Expired leases cannot prepare another draft', () => repo.prepareHq(secondDate, session.lock, owner))
    ok('Expired lease handling preserves unsaved HQ and does not read more tags', !R.hqHasBeenSaved((await read('days', secondDate)).hq) && tagReads === readsAtExpiry)
    return { checks, scenarios, tagReads }
  } finally { db?.close(); await repo.close() }
}
