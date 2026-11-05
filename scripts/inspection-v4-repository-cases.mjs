/** Runs in an isolated browser context so IndexedDB transactions are real. */
export async function repositoryCases() {
  const { createDailyDispatchRepository, lockKey } = await import('/src/mock/dailyDispatchCheck.js')
  const R = await import('/src/utils/dailyDispatchCheckRules.js')
  const checks = []
  const ok = (name, value) => { if (!value) throw new Error(name); checks.push(name) }
  async function rejected(name, action) { let failed = false; try { await action() } catch { failed = true } ok(name, failed) }
  const clock = { value: new Date(2026, 9, 29, 12).getTime() }, date = R.localDate(new Date(clock.value))
  const projects = [{ id: 'A', projectName: '项目A', hidden: false, dispatchTag: true }, { id: 'B', projectName: '项目B', hidden: false, dispatchTag: false }, { id: 'H', projectName: '隐藏项目', hidden: true, dispatchTag: true }]
  const users = [{ id: 'dispatch', name: '安质部用户', status: true, scope: 'dispatch' }, { id: 'disabled-dispatch', name: '停用安质部用户', status: false, scope: 'dispatch' }, { id: 'member', name: '项目成员', status: true, scope: 'A' }, { id: 'memberB', name: '项目B成员', status: true, scope: 'B' }, { id: 'disabled', name: '停用人员', status: false, scope: 'A' }]
  const databaseName = 'inspection-v4-check-' + crypto.randomUUID()
  const repo = createDailyDispatchRepository({ databaseName, getProjects: () => projects, getUsers: scope => scope === 'dispatch' ? users.filter(u => u.scope === 'dispatch') : users, now: () => clock.value })
  const owner = { id: 'writer', name: '验证用户', loginAccount: 'inspection-test' }, another = { id: 'writer2', name: '另一个用户' }
  const image = { name: '现场.svg', url: 'data:image/svg+xml;base64,PHN2Zy8+', size: 6 }
  const issue = value => ({ text: value, images: [image] })
  const hq = async () => { const lock = await repo.acquire(lockKey(date), owner); const day = await repo.prepareHq(date, lock, owner); const draft = R.hqDraftForEditing(day); draft.headers.dispatcherId = 'dispatch'; draft.headers.dispatcher = '安质部用户'; return { lock, day, draft } }
  const saveHq = session => repo.submit({ date, content: R.hqPayload(session.draft), version: session.draft.version, lock: session.lock, operator: owner })
  const partContent = (id = 'member') => ({ userId: id, check: { ...R.emptyCheck(), type: 'normal', normalText: R.NORMAL_PROJECT_TEXT, normalImages: [image] } })
  await repo.ensure(); let days = await repo.listDays(), current = await repo.getDay(date)
  ok('最近30天包含空白日期且日期唯一', days.length === 30 && new Set(days.map(d => d.date)).size === 30)
  ok('新日默认只含未隐藏项目且不预建检查正文', current.hq.rows.map(r => r.projectId).join() === 'A,B' && current.hq.rows.every(r => !r.safety && !r.quality && !r.camera) && !Object.keys(current.people).length)
  ok('生成和只读均不初始化标签', !current.dispatchDefaults)
  await rejected('无锁不能初始化', () => repo.prepareHq(date, { token: 'wrong' }, owner))
  const first = await hq()
  ok('本次临时预填排除隐藏项目', first.day.hqPrefillProjectIds.join() === 'A')
  ok('默认值只出现在未保存副本', first.draft.rows[0].safety.type === 'normal' && !first.day.hq.rows[0].safety && !first.day.hq.version && !first.day.hq.updatedAt && !(await repo.getLogs()).length)
  await rejected('同部分第二个用户受编辑锁保护', () => repo.acquire(lockKey(date), another))
  const recoveryKey=lockKey(R.offsetDate(date,-15)),recovery=await repo.acquire(recoveryKey,owner)
  await rejected('同账号新标签没有恢复令牌也不能抢占',()=>repo.acquire(recoveryKey,owner))
  await rejected('错误恢复令牌不能接管占用',()=>repo.acquire(recoveryKey,owner,{resumeToken:'wrong'}))
  await rejected('不同用户不能使用原令牌恢复占用',()=>repo.acquire(recoveryKey,another,{resumeToken:recovery.token}))
  const resumed=await repo.acquire(recoveryKey,owner,{resumeToken:recovery.token})
  ok('刷新恢复原子更换令牌并保留账号',resumed.token!==recovery.token&&resumed.owner.id===owner.id)
  await repo.release(recovery);await rejected('旧令牌释放不影响刷新后的新占用',()=>repo.acquire(recoveryKey,another));await repo.release(resumed)
  const partKey=lockKey(date,'B','manager'),partLease=await repo.acquire(partKey,owner)
  await rejected('项目部独立占用不使用统一调度恢复令牌',()=>repo.acquire(partKey,owner,{resumeToken:partLease.token}));await repo.release(partLease)
  const raceKey=lockKey(R.offsetDate(date,-16)),race=await Promise.allSettled([repo.acquire(raceKey,owner),repo.acquire(raceKey,another)])
  ok('同时申请同日统一调度仅一人成功且另一人有占用错误码',race.filter(r=>r.status==='fulfilled').length===1&&race.find(r=>r.status==='rejected').reason.code==='DAILY_EDIT_OCCUPIED')
  await repo.release(race.find(r=>r.status==='fulfilled').value)

  await repo.release(first.lock); projects[0].dispatchTag = false; projects[1].dispatchTag = true
  const changed = await hq()
  ok('取消重进按当前标签重新预填', changed.day.hqPrefillProjectIds.join() === 'B' && !changed.draft.rows[0].unified && changed.draft.rows[1].unified)
  await repo.release(changed.lock); projects[0].dispatchTag = true; projects[1].dispatchTag = false
  const session = await hq()
  session.draft.rows = session.draft.rows.filter(r => r.projectId !== 'B'); session.draft.scopeChanges.removedIds = ['B']
  let saved = await saveHq(session)
  ok('正常默认直接保存即为有效结果', R.dayStats(saved).safetyQuality === 0 && R.dayStats(saved).camera === 0 && saved.hq.version === 1)
  ok('移除空白关系不删除基础项目', saved.hq.rows.length === 1 && !!saved.removedRows.B && projects.some(p => p.id === 'B'))
  const logs = await repo.getLogs()
  ok('日志保存真实前后值及操作账号', logs.at(-1).before.rows.length === 2 && logs.at(-1).after.rows.length === 1 && logs.at(-1).operator.id === owner.id)
  const stale = await hq(), stalePeople = JSON.stringify(stale.day.people)
  saved = await repo.ensureProject(date, 'B'); await repo.ensureProject(date, 'B')
  ok('项目部选择按ID恢复且重复操作不重复行', saved.hq.rows.length === 2 && saved.hq.rows[1].projectName === '项目B' && (await repo.getDay(date)).hq.rows.length === 2)
  const lockB = await repo.acquire(lockKey(date, 'B', 'duty'), another)
  const bContent = partContent('memberB')
  await repo.submit({ date, projectId: 'B', part: 'duty', content: bContent, version: 0, lock: lockB, operator: another })
  stale.draft.note = '并发保留项目行'
  stale.draft.people = { B: { duty: { name: '恶意覆盖' } } }; stale.draft.rows[0].duty = { name: '恶意覆盖' }
  saved = await saveHq(stale)
  ok('旧统一调度数组不覆盖新补入共享项目行', saved.hq.rows.some(r => r.projectId === 'B'))
  ok('统一调度只读查询值未回写项目部', saved.people.B.duty.name === '项目B成员' && JSON.stringify(saved.people) !== stalePeople && !saved.hq.rows[0].duty)
  const malicious = await hq(); malicious.draft.rows = malicious.draft.rows.filter(r => r.projectId !== 'B'); malicious.draft.scopeChanges.removedIds = ['B']
  await rejected('保存时重新核查最新人员记录保护删除', () => saveHq(malicious))
  ok('失败事务保留所有项目与业务版本', (await repo.getDay(date)).hq.version === saved.hq.version && (await repo.getDay(date)).hq.rows.length === 2)
  await repo.release(malicious.lock)
  await rejected('隐藏项目不能自动补入', () => repo.ensureProject(date, 'H'))
  const stateBefore = await repo.getDay(date)
  const dutyLock = await repo.acquire(lockKey(date, 'A', 'duty'), owner), managerLock = await repo.acquire(lockKey(date, 'A', 'manager'), another)
  await rejected('停用人员不能保存', () => repo.submit({ date, projectId: 'A', part: 'duty', content: partContent('disabled'), version: 0, lock: dutyLock, operator: owner }))
  await rejected('不存在的系统用户不能保存', () => repo.submit({ date, projectId: 'A', part: 'duty', content: partContent('unknown-user'), version: 0, lock: dutyLock, operator: owner }))
  const content = partContent(); content.check.type = 'problem'; content.check.problems = Array.from({ length: 10 }, (_, i) => ({ text: '问题' + i, images: Array.from({ length: 9 }, () => ({ ...image })) })); content.check.other = '未激活分支'; content.check.otherImages = [image]
  saved = await repo.submit({ date, projectId: 'A', part: 'duty', content, version: 0, lock: dutyLock, operator: owner })
  ok('10条问题各9张可保存且没有总9张限制', R.personImages(saved.people.A.duty).length === 90)
  ok('保存只保存激活分支', !saved.people.A.duty.check.other && !saved.people.A.duty.check.normalImages)
  await repo.submit({ date, projectId: 'A', part: 'manager', content: partContent(), version: 0, lock: managerLock, operator: another })
  saved = await repo.getDay(date)
  ok('两个项目部部分独立锁与独立保存', saved.people.A.duty.check.problems.length === 10 && saved.people.A.manager.check.type === 'normal')
  ok('人员业务身份与操作账号分别保存', saved.people.A.manager.userId === 'member' && saved.people.A.manager.operator.id === another.id)
  const crossLock = await repo.acquire(lockKey(date, 'A', 'duty'), owner)
  saved = await repo.submit({ date, projectId: 'A', part: 'duty', content: { userId: 'memberB', check: R.clone(saved.people.A.duty.check) }, version: saved.people.A.duty.version, lock: crossLock, operator: owner })
  ok('合法跨项目启用用户可保存且保留检查正文', saved.people.A.duty.userId === 'memberB' && saved.people.A.duty.name === '项目B成员' && saved.people.A.duty.check.problems.length === 10)
  ok('项目部问题不并入两项问题统计', R.dayStats(saved).safetyQuality === 0 && R.dayStats(saved).camera === 0)
  ok('项目部保存不改统一调度正文', JSON.stringify(saved.hq) === JSON.stringify(stateBefore.hq))
  const s = await hq(); s.draft.rows[0].unified = false; s.draft.rows[0].safety = { ...R.emptyCheck(), type: '' }; s.draft.rows[0].quality = { ...R.emptyCheck(), type: '' }; s.draft.rows[0].camera = { ...R.emptyCheck(), type: '' }; s.draft.rows[0].personnel = { type: '', text: '' }; saved = await saveHq(s)
  ok('曾保存业务的项目行永久保留删除保护', !!R.deletionReason(null, {}, saved.hq.rows[0]))
  const badUser = await hq(); badUser.draft.headers.dispatcherId = 'member'
  await rejected('表头不能绕过安质部范围', () => saveHq(badUser)); await repo.release(badUser.lock)
  const expired = await hq(); clock.value += 121000
  await rejected('过期会话拒绝保存且不覆盖', () => saveHq(expired)); await repo.release(expired.lock)
  const wrongVersion = await hq(); wrongVersion.draft.version--
  await rejected('过期版本拒绝保存', () => saveHq(wrongVersion)); await repo.release(wrongVersion.lock)
  const old = days.find(d => d.hq.version && Object.values(d.people).some(p => p.duty))
  const upgraded = await repo.getDay(old.date), upgradedPart = upgraded.people[old.hq.rows[0].projectId].duty, migrationLock = await repo.acquire(lockKey(old.date, old.hq.rows[0].projectId, 'duty'), owner)
  ok('现有记录统一使用当前项目部结构', upgradedPart.schemaVersion === 4)
  const resaved = await repo.submit({ date: old.date, projectId: old.hq.rows[0].projectId, part: 'duty', content: partContent(), version: upgradedPart.version, lock: migrationLock, operator: owner })
  ok('当前结构记录可正常编辑且不覆盖统一调度', resaved.people[old.hq.rows[0].projectId].duty.version === upgradedPart.version + 1 && JSON.stringify(resaved.hq) === JSON.stringify(upgraded.hq))
  const snapshotBefore = cloneLocal((await repo.getDay(date)).hq.rows.find(r => r.projectId === 'A'))
  function cloneLocal(v) { return JSON.parse(JSON.stringify(v)) }
  projects[0].hidden = true; projects[0].projectName = '新项目名'
  saved = await repo.getDay(date)
  ok('隐藏和改名不重写历史快照或记录', JSON.stringify(saved.hq.rows.find(r => r.projectId === 'A')) === JSON.stringify(snapshotBefore) && saved.people.A.duty.check.problems.length === 10)
  const historicalLock = await repo.acquire(lockKey(date, 'A', 'manager'), owner)
  await repo.submit({ date, projectId: 'A', part: 'manager', content: partContent(), version: 1, lock: historicalLock, operator: owner })
  ok('隐藏历史项目仍可按已有关系编辑', (await repo.getDay(date)).people.A.manager.version === 2)
  const badRelation = await repo.acquire(lockKey(date, 'H', 'duty'), owner)
  await rejected('不可借保存新增隐藏项目', () => repo.submit({ date, projectId: 'H', part: 'duty', content: partContent(), version: 0, lock: badRelation, operator: owner })); await repo.release(badRelation)
  // Construct the migration edge case explicitly; ordinary demo records may already have user IDs.
  const legacyFixture = R.clone(await repo.getDay(date))
  legacyFixture.date = R.offsetDate(date, -40)
  delete legacyFixture.hq.headers.dispatcherId
  legacyFixture.hq.headers.dispatcher = '仅姓名旧调度员'
  const legacyOpen = indexedDB.open(databaseName, 1)
  const legacyDb = await new Promise((resolve, reject) => { legacyOpen.onsuccess = () => resolve(legacyOpen.result); legacyOpen.onerror = () => reject(legacyOpen.error) })
  await new Promise((resolve, reject) => { const tx = legacyDb.transaction('days', 'readwrite'); tx.objectStore('days').put(legacyFixture); tx.oncomplete = resolve; tx.onabort = () => reject(tx.error) })
  legacyDb.close()
  const legacyDay = await repo.getDay(legacyFixture.date)
  ok('保留仅姓名的既有记录供只读查询', !!legacyDay?.hq.headers.dispatcher)
  const legacyLock = await repo.acquire(lockKey(legacyDay.date), owner)
  const legacyBefore = await repo.getDay(legacyDay.date), legacyDraft = R.hqDraftForEditing(legacyBefore), legacyLogs = JSON.stringify(await repo.getLogs())
  const submitLegacy = () => repo.submit({ date: legacyDay.date, content: R.hqPayload(legacyDraft), version: legacyDraft.version, lock: legacyLock, operator: owner })
  ok('调度人员留空不阻止其他有效内容校验', !R.validateHq(legacyDraft, legacyBefore.hq))
  legacyDraft.headers.dispatcherId = 'disabled-dispatch'
  await rejected('旧记录重选停用安质部用户不能保存', submitLegacy)
  legacyDraft.headers.dispatcherId = 'member'
  await rejected('旧记录重选非安质部用户不能保存', submitLegacy)
  ok('拒绝保存不改原姓名正文项目部或日志', JSON.stringify(await repo.getDay(legacyDay.date)) === JSON.stringify(legacyBefore) && JSON.stringify(await repo.getLogs()) === legacyLogs)
  await rejected('保存校验失败仍保留原有效编辑占用', () => repo.acquire(lockKey(legacyDay.date), another))
  legacyDraft.headers.dispatcherId = 'dispatch'
  const rebound = await submitLegacy()
  ok('重新选择后由有效用户ID生成姓名快照', rebound.hq.headers.dispatcherId === 'dispatch' && rebound.hq.headers.dispatcher === '安质部用户')
  ok('重新选择保留项目部与已有统一调度内容', JSON.stringify(rebound.people) === JSON.stringify(legacyBefore.people) && rebound.hq.note === legacyBefore.hq.note && rebound.hq.firstSubmittedAt === legacyBefore.hq.firstSubmittedAt)
  const clearLock = await repo.acquire(lockKey(legacyDay.date), owner), clearDraft = R.hqDraftForEditing(rebound)
  clearDraft.headers.dispatcherId = ''; clearDraft.headers.dispatcher = '不能残留的姓名'
  const cleared = await repo.submit({ date: legacyDay.date, content: R.hqPayload(clearDraft), version: clearDraft.version, lock: clearLock, operator: owner })
  ok('已选调度人员清空后允许保存且ID姓名一起清空', cleared.hq.headers.dispatcherId === '' && cleared.hq.headers.dispatcher === '' && JSON.stringify(cleared.people) === JSON.stringify(rebound.people))
  const blankLock = await repo.acquire(lockKey(legacyDay.date), owner), blankDraft = R.hqDraftForEditing(cleared)
  blankDraft.headers.dispatcherId = '   '; blankDraft.headers.dispatcher = '旧姓名'
  const blankSaved = await repo.submit({ date: legacyDay.date, content: R.hqPayload(blankDraft), version: blankDraft.version, lock: blankLock, operator: owner })
  ok('空白调度ID按未选择保存而不是姓名文本', blankSaved.hq.headers.dispatcherId === '' && blankSaved.hq.headers.dispatcher === '')
  const beforeGrowth = await repo.getDay(date); projects[1].dispatchTag = true; clock.value = new Date(2026, 9, 30, 12).getTime(); await repo.ensure(); const nextDate = R.localDate(new Date(clock.value)), nextLock = await repo.acquire(lockKey(nextDate), owner), next = await repo.prepareHq(nextDate, nextLock, owner)
  ok('新日期按新未隐藏范围生成并读取新标签', next.hq.rows.map(r => r.projectId).join() === 'B' && next.hqPrefillProjectIds.join() === 'B')
  ok('新日期生成不倒改历史范围', JSON.stringify((await repo.getDay(date)).hq.rows) === JSON.stringify(beforeGrowth.hq.rows)); await repo.release(nextLock)
  await repo.close()
  const { exampleValidationErrors } = await import('/src/mock/dailyDispatchCheckExamples.js')
  const repairName='inspection-example-repair-'+crypto.randomUUID(), fixtureDate='2026-10-24'
  const fixtureUsers=scope=>scope==='dispatch'?users.filter(u=>u.scope==='dispatch'):users
  const repairRepo=createDailyDispatchRepository({databaseName:repairName,getProjects:()=>[{id:'A',projectName:'项目A'},{id:'B',projectName:'项目B'}],getUsers:fixtureUsers,now:()=>clock.value})
  const fixture=R.clone(await repairRepo.getDay(fixtureDate));fixture.hq.rows[0].safety={...R.emptyCheck(),type:'problem',problems:[{text:'旧示例问题',images:[]}]};fixture.people.A.duty.check.problems[1].images=[];fixture.people.A.duty.userId='';fixture.people.A.duty.name='旧示例姓名'
  fixture.people.B.manager.operator=owner;fixture.people.B.manager.check={...R.emptyCheck(),type:'problem',problems:[{text:'人工历史问题保留',images:[]}]}
  const db=await new Promise((resolve,reject)=>{const q=indexedDB.open(repairName);q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error)})
  const writeFixture=(value,clearReview=false)=>new Promise((resolve,reject)=>{const tx=db.transaction(['days','meta'],'readwrite');tx.objectStore('days').put(value);tx.objectStore('meta').delete('example-validation-v1:'+value.date);if(clearReview)tx.objectStore('meta').delete('full-review-v1:'+value.date);tx.oncomplete=resolve;tx.onabort=()=>reject(tx.error)})
  await writeFixture(fixture)
  const held=await repairRepo.acquire(lockKey(fixtureDate,'A','duty'),owner)
  ok('示例补齐遇到有效项目锁时整日延后',JSON.stringify(await repairRepo.getDay(fixtureDate))===JSON.stringify(fixture))
  await repairRepo.release(held)
  const repaired=await repairRepo.getDay(fixtureDate)
  ok('旧示例缺图和姓名关联按当前规则补齐',exampleValidationErrors(repaired,fixtureUsers).length===0&&repaired.hq.rows[0].safety.problems[0].images.length===1&&repaired.people.A.duty.userId==='dispatch')
  ok('示例修正保留同日人工填写及原检查统计',JSON.stringify(repaired.people.B.manager)===JSON.stringify(fixture.people.B.manager)&&JSON.stringify(R.dayStats(repaired))===JSON.stringify(R.dayStats(fixture)))
  const backup=await new Promise(resolve=>{const q=db.transaction('meta').objectStore('meta').get('before-example-validation-v1:'+fixtureDate);q.onsuccess=()=>resolve(q.result)})
  ok('旧示例补齐前有完整备份',JSON.stringify(backup.value)===JSON.stringify(fixture))
  ok('示例补齐仅推进所属版本并保留业务时间',repaired.hq.version===fixture.hq.version+1&&repaired.people.A.duty.version===fixture.people.A.duty.version+1&&repaired.hq.updatedAt===fixture.hq.updatedAt&&repaired.people.A.duty.firstSubmittedAt===fixture.people.A.duty.firstSubmittedAt)
  await repairRepo.ensure();ok('再次读取不重复补图或改版本且不产生业务日志',JSON.stringify(await repairRepo.getDay(fixtureDate))===JSON.stringify(repaired)&&(await repairRepo.getLogs()).length===0)
  const manual=R.clone(repaired);manual.hq.operator=owner;manual.hq.note='人工填写的正式正文';await writeFixture(manual,true)
  ok('缺少示例初始化标记也不会覆盖人工日期记录',JSON.stringify(await repairRepo.getDay(fixtureDate))===JSON.stringify(manual))
  db.close();await repairRepo.close()
  { // Current project source failures use only the previous day's project identities.
  const fallbackName='inspection-project-fallback-'+crypto.randomUUID(), warnings=[]
  let catalogFailure=false, tagFailure=false, visibilityFailure=false, emptyCatalog=false
  const fallClock={value:new Date(2026,10,10,12).getTime()}, startDate=R.localDate(new Date(fallClock.value))
  const fallbackRepo=createDailyDispatchRepository({databaseName:fallbackName,now:()=>fallClock.value,getUsers:fixtureUsers,onWarning:message=>warnings.push(message),
    getProjects:()=>{if(catalogFailure)throw new Error('upstream unavailable');return emptyCatalog?[]:projects.map(p=>({...p,hidden:visibilityFailure&&p.id==='A'?undefined:false}))},
    getDispatchProjectIds:()=>{if(tagFailure)throw new Error('tag unavailable');return ['A']}})
  let original=await fallbackRepo.getDay(startDate), editLock=await fallbackRepo.acquire(lockKey(startDate),owner)
  const ready=await fallbackRepo.prepareHq(startDate,editLock,owner), draft=R.hqDraftForEditing(ready)
  ok('正常标签仍带出勾选及原有四项正常预填',draft.rows[0].unified&&draft.rows[0].personnel.type==='normal'&&R.CHECK_FIELDS.every(k=>draft.rows[0][k].type==='normal'))
  original=await fallbackRepo.submit({date:startDate,content:R.hqPayload(draft),version:draft.version,lock:editLock,operator:owner})
  const staffLock=await fallbackRepo.acquire(lockKey(startDate,'A','duty'),owner)
  original=await fallbackRepo.submit({date:startDate,projectId:'A',part:'duty',content:partContent(),version:0,lock:staffLock,operator:owner})
  const originalSaved=JSON.stringify(original), auditBefore=JSON.stringify(await fallbackRepo.getLogs())
  catalogFailure=true;tagFailure=true;fallClock.value+=86400000
  const nextDate=R.localDate(new Date(fallClock.value)), next=await fallbackRepo.getDay(nextDate)
  ok('项目源失败采用昨日清单及名称',next.projectSource.kind==='yesterday'&&next.projectSource.date===startDate&&next.hq.rows.map(r=>r.projectId).join()===original.hq.rows.map(r=>r.projectId).join()&&next.hq.rows.every(r=>r.projectName===original.hq.rows.find(p=>p.projectId===r.projectId).projectName))
  ok('昨日回退不复制检查正文人员图片或勾选',next.hq.version===0&&!Object.keys(next.people).length&&next.hq.rows.every(r=>!r.unified&&!r.personnel&&!r.safety&&!r.quality&&!r.camera&&!r.remark))
  ok('昨日回退有明确降级提示',warnings.some(m=>m.includes('昨日项目清单')))
  editLock=await fallbackRepo.acquire(lockKey(nextDate),owner)
  const unavailable=await fallbackRepo.prepareHq(nextDate,editLock,owner), unavailableDraft=R.hqDraftForEditing(unavailable)
  ok('上游调度标签异常默认全部否且不捏造正常结果',unavailable.hqPrefillProjectIds.length===0&&unavailableDraft.rows.every(r=>r.unified===false&&!r.personnel&&!r.safety&&!r.quality&&!r.camera))
  await fallbackRepo.release(editLock)
  ok('异常读取不覆盖昨日已保存内容及审计',JSON.stringify(await fallbackRepo.getDay(startDate))===originalSaved&&JSON.stringify(await fallbackRepo.getLogs())===auditBefore)
  const fallbackDb=await new Promise((resolve,reject)=>{const q=indexedDB.open(fallbackName);q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error)})
  await new Promise((resolve,reject)=>{const tx=fallbackDb.transaction('days','readwrite');tx.objectStore('days').delete(nextDate);tx.oncomplete=resolve;tx.onabort=()=>reject(tx.error)})
  fallClock.value+=86400000;const brokenDate=R.localDate(new Date(fallClock.value))
  let sourceError;try{await fallbackRepo.ensure()}catch(e){sourceError=e}
  ok('当前及昨日都不可用明确报重大数据异常',sourceError?.code==='DAILY_PROJECT_SOURCE_UNAVAILABLE'&&sourceError.message.includes('当前及昨日项目清单均不可用'))
  const absent=await new Promise(resolve=>{const q=fallbackDb.transaction('days').objectStore('days').get(brokenDate);q.onsuccess=()=>resolve(q.result)})
  ok('二次失败不生成空表冒充成功',!absent)
  catalogFailure=false;emptyCatalog=true
  const zero=await fallbackRepo.getDay(brokenDate)
  ok('有效空项目清单不误当接口失败',zero.hq.rows.length===0&&!zero.projectSource)
  ok('数据恢复后可重试且已有记录保持不变',JSON.stringify(await fallbackRepo.getDay(startDate))===originalSaved)
  emptyCatalog=false;visibilityFailure=true;tagFailure=false;fallClock.value+=86400000
  const allDate=R.localDate(new Date(fallClock.value)), all=await fallbackRepo.getDay(allDate)
  ok('仅隐藏配置异常显示全部授权来源项目',all.projectSource.kind==='all'&&all.hq.rows.length===projects.length&&warnings.some(m=>m.includes('隐藏配置读取异常')))
  editLock=await fallbackRepo.acquire(lockKey(allDate),owner)
  const kept=R.hqDraftForEditing(await fallbackRepo.prepareHq(allDate,editLock,owner))
  ok('降级项目范围仍保留正常标签预填及二态值',kept.rows[0].unified===true&&kept.rows[0].safety.type==='normal'&&kept.rows.slice(1).every(r=>r.unified===false))
  await fallbackRepo.release(editLock);fallbackDb.close();await fallbackRepo.close()
  }
  return checks
}
