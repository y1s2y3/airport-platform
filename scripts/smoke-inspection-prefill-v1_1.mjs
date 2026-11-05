import assert from 'node:assert/strict'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createServer as createNetServer } from 'node:net'
import { chromium } from 'playwright'
import { createServer } from 'vite'

const root = resolve(import.meta.dirname, '..')
const output = resolve(root, '../outputs/inspection-prefill-v1.1')
mkdirSync(output, { recursive: true })
const checks = [], errors = [], route = '/coc-admin/daily-dispatch-check'
function pass(name, value = true) { assert.ok(value, name); checks.push(name); console.log('PASS ' + name) }
async function freePort() { const probe = createNetServer(); await new Promise((r,j) => { probe.once('error',j); probe.listen(0,'127.0.0.1',r) }); const port=probe.address().port; await new Promise(r=>probe.close(r)); return port }
let server, browser, context, page
try {
  const port = await freePort()
  server = await createServer({ root, configLoader: 'native', logLevel: 'error', server: { host:'127.0.0.1', port, strictPort:true, open:false } }); await server.listen()
  browser = await chromium.launch({ headless:true, executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || (existsSync(chromium.executablePath()) ? chromium.executablePath() : 'C:/Program Files/Google/Chrome/Application/chrome.exe') })
  context = await browser.newContext({ viewport:{width:1440,height:1050} })
  await context.addInitScript(() => sessionStorage.setItem('web-login-session',JSON.stringify({account:'liufs',at:Date.now()})))
  page = await context.newPage(); page.setDefaultTimeout(15000)
  page.on('pageerror',error=>errors.push(error.message)); page.on('console',message=>{if(message.type()==='error') errors.push(message.text())})
  await page.goto('http://127.0.0.1:'+port+'/#'+route)
  const daily = () => page.getByRole('tabpanel',{name:'每日检查',exact:true})
  const ledgerRows = () => daily().locator('.el-table__body-wrapper tbody tr')
  await ledgerRows().first().waitFor()
  const repository = await page.evaluate(async () => (await import('/scripts/inspection-prefill-v1_1-cases.mjs')).prefillRepositoryCases())
  pass('Native IndexedDB scenario matrix S1-S8 passes',Object.values(repository.scenarios).length===8 && Object.values(repository.scenarios).every(Boolean))
  const date = (await ledgerRows().first().locator('td').first().innerText()).trim()
  const projects = await page.evaluate(async date => {
    const { projectList } = await import('/src/mock/projectBasicInfo.js')
    const { updateProjectDispatchTag } = await import('/src/composables/useProjectDispatchTags.js')
    const { dailyDispatchRepository:repo } = await import('/src/composables/useDailyDispatchCheck.js')
    const R = await import('/src/utils/dailyDispatchCheckRules.js')
    const choices=projectList.filter(project=>!project.hidden).slice(0,4).map(project=>({id:project.id,name:project.projectName||project.shortName}))
    if(choices.length<4)throw new Error('The prefill UI fixture needs four existing visible projects')
    for(const project of projectList)updateProjectDispatchTag(project.id,choices.slice(0,2).some(choice=>choice.id===project.id))
    const old=await repo.getDay(date), fixture={...old,hq:R.emptyDay(date,choices.slice(0,3).map(choice=>({id:choice.id,projectName:choice.name}))).hq,people:{},demo:false}
    delete fixture.dispatchDefaults; delete fixture.demoScenario
    await new Promise((resolve,reject)=>{const q=indexedDB.open('airport-daily-dispatch-check-v1');q.onsuccess=()=>{const db=q.result,tx=db.transaction('days','readwrite');tx.objectStore('days').put(fixture);tx.oncomplete=()=>{db.close();resolve()};tx.onabort=()=>reject(tx.error)};q.onerror=()=>reject(q.error)})
    window.prefillProbe={preparations:0,tagReads:0}
    const actual=repo.prepareHq;repo.prepareHq=async(...args)=>{window.prefillProbe.preparations++;return actual(...args)}
    const get=Storage.prototype.getItem;Storage.prototype.getItem=function(key){if(key==='airport-project-dispatch-tags-v1')window.prefillProbe.tagReads++;return get.call(this,key)}
    return choices
  },date)
  await daily().getByRole('button',{name:'刷新',exact:true}).click()
  const footer=()=>page.locator('.daily-detail-footer')
  const drawer=()=>page.locator('.daily-dispatch-drawer:visible')
  const row=project=>page.locator('.daily-inspection-table .el-table__body-wrapper tbody tr').filter({has:page.getByText(project.name,{exact:true})})
  const checkbox=project=>row(project).getByRole('checkbox',{name:project.name+'当日统一调度',exact:true})
  const normal=async project=>(await checkbox(project).isChecked())&&(await row(project).locator('td').allTextContents()).slice(2,6).every(text=>text.includes('正常'))
  const blank=async project=>!(await checkbox(project).isChecked())&&(await row(project).locator('td').allTextContents()).slice(2,6).every(text=>!text.includes('正常'))
  const heading=()=>page.getByRole('textbox',{name:'重点调度部门',exact:true})
  async function probe(){return page.evaluate(()=>({...window.prefillProbe}))}
  async function stored(){return page.evaluate(date=>new Promise((resolve,reject)=>{const q=indexedDB.open('airport-daily-dispatch-check-v1');q.onsuccess=()=>{const db=q.result,tx=db.transaction(['days','locks'],'readonly'),day=tx.objectStore('days').get(date),locks=tx.objectStore('locks').getAll();tx.oncomplete=()=>{db.close();resolve({day:day.result,locks:locks.result})};tx.onabort=()=>reject(tx.error)};q.onerror=()=>reject(q.error)}),date)}
  async function enter(){await ledgerRows().filter({has:page.locator('td:first-child').getByText(date,{exact:true})}).getByRole('button',{name:'统一调度检查填写',exact:true}).click();await footer().waitFor();await row(projects[0]).waitFor()}
  async function decide(keep=false){await page.locator('.daily-dispatch-confirm:visible').getByRole('button',{name:keep?'继续填写':'确认放弃',exact:true}).click()}
  async function leave(){await footer().getByRole('button',{name:'取消',exact:true}).click();await decide();await ledgerRows().first().waitFor()}
  async function setTags(ids){await page.evaluate(async ids=>{const {projectList}=await import('/src/mock/projectBasicInfo.js');const {updateProjectDispatchTag}=await import('/src/composables/useProjectDispatchTags.js');for(const project of projectList)updateProjectDispatchTag(project.id,ids.includes(project.id))},ids)}
  await enter()
  pass('S1 UI: the current A/B tags prefill four normal fields',await normal(projects[0])&&await normal(projects[1])&&await blank(projects[2]))
  await page.screenshot({path:resolve(output,'01-initial-prefill-v1.1.png'),fullPage:true,animations:'disabled'})
  await heading().fill('本次应当放弃的部门');await leave();await enter()
  pass('S2 UI: reentry rebuilds normal defaults and discards manual inputs',await normal(projects[0])&&await normal(projects[1])&&await heading().inputValue()==='')
  await heading().fill('同会话保留的部门')
  await row(projects[0]).getByRole('button',{name:'填写检查',exact:true}).click();await drawer().waitFor()
  await drawer().getByRole('textbox',{name:'项目备注',exact:true}).fill('同会话保留的项目备注')
  await drawer().getByRole('button',{name:'应用到当前表单',exact:true}).click();await drawer().waitFor({state:'hidden'})
  await setTags([projects[1].id,projects[2].id]);const beforeSessionActions=await probe()
  await row(projects[0]).getByRole('button',{name:'填写检查',exact:true}).click();await drawer().waitFor()
  pass('S9 UI: reopening the drawer retains the applied project draft',await drawer().getByRole('textbox',{name:'项目备注',exact:true}).inputValue()==='同会话保留的项目备注')
  await drawer().getByRole('button',{name:'关闭项目检查抽屉',exact:true}).click();await drawer().waitFor({state:'hidden'})
  await row(projects[1]).getByRole('button',{name:'填写检查',exact:true}).click();await drawer().waitFor();await drawer().getByRole('button',{name:'关闭项目检查抽屉',exact:true}).click();await drawer().waitFor({state:'hidden'})
  await page.getByRole('button',{name:'刷新内容',exact:true}).click()
  await footer().getByRole('button',{name:'取消',exact:true}).click();await decide(true)
  const afterSessionActions=await probe()
  pass('S9 UI: drawer actions, project switching, refresh and Continue do not reread tags',afterSessionActions.preparations===beforeSessionActions.preparations&&afterSessionActions.tagReads===beforeSessionActions.tagReads)
  pass('S9 UI: upstream changes during editing do not overwrite manual or prefilled values',await heading().inputValue()==='同会话保留的部门'&&(await row(projects[0]).textContent()).includes('同会话保留的项目备注')&&await normal(projects[0])&&await normal(projects[1])&&await blank(projects[2]))
  await page.screenshot({path:resolve(output,'02-same-session-draft-v1.1.png'),fullPage:true,animations:'disabled'})
  await leave();let storage=await stored()
  pass('S2/S9 UI: confirmed abandonment removes the lease and persists no draft/cache',storage.day.hq.version===0&&storage.day.hq.note===''&&!storage.day.dispatchDefaults&&!storage.day.hqPrefillProjectIds&&!storage.locks.some(lock=>lock.key===date+':hq'))
  await enter()
  pass('S3 UI: the next entry applies B/C and leaves A unfilled',await blank(projects[0])&&await normal(projects[1])&&await normal(projects[2])&&await heading().inputValue()==='')
  await page.evaluate(date=>{const original=IDBObjectStore.prototype.put;window.restorePrefillPut=()=>{IDBObjectStore.prototype.put=original};IDBObjectStore.prototype.put=function(value,...args){if(this.name==='days'&&value.date===date)throw new Error('模拟保存失败');return original.call(this,value,...args)}},date)
  await footer().getByRole('button',{name:'保存',exact:true}).click();await page.getByText('模拟保存失败',{exact:true}).waitFor()
  await page.evaluate(()=>window.restorePrefillPut())
  storage=await stored();pass('S4 UI: a failed save retains the editor and leaves HQ unsaved',await footer().isVisible()&&storage.day.hq.version===0&&!storage.day.hq.firstSubmittedAt)
  await leave();await setTags([projects[0].id]);await enter()
  pass('S4 UI: reentry after a failed save still uses the newest tags',await normal(projects[0])&&await blank(projects[1])&&await blank(projects[2]))
  await heading().fill('已经成功保存的部门');await footer().getByRole('button',{name:'保存',exact:true}).click();await ledgerRows().first().waitFor()
  storage=await stored();pass('S5 UI: a successful page save persists the HQ first-save state',storage.day.hq.version===1&&!!storage.day.hq.firstSubmittedAt)
  await setTags([projects[2].id]);const beforeSavedEntry=await probe();await enter();const afterSavedEntry=await probe()
  pass('S5 UI: saved content is preserved without reading changed upstream tags',afterSavedEntry.tagReads===beforeSavedEntry.tagReads&&await normal(projects[0])&&await blank(projects[2])&&await heading().inputValue()==='已经成功保存的部门')
  await row(projects[2]).locator('label.el-checkbox').click()
  pass('S7 UI: manually checking an existing project never fills normal results',await checkbox(projects[2]).isChecked()&&(await row(projects[2]).locator('td').allTextContents()).slice(2,6).every(text=>!text.includes('正常')))
  await page.getByRole('button',{name:'添加项目',exact:true}).click();const add=page.getByRole('dialog',{name:'添加项目',exact:true})
  await add.getByRole('combobox',{name:'添加项目名称',exact:true}).click();await page.getByRole('option',{name:projects[3].name,exact:true}).click();await add.getByRole('button',{name:'添加',exact:true}).click();await row(projects[3]).waitFor()
  pass('S7 UI: adding a project creates no automatic check results',await blank(projects[3])&&(await probe()).tagReads===afterSavedEntry.tagReads)
  await leave();await page.getByRole('tab',{name:'检查统计',exact:true}).click()
  pass('The renamed statistics tab is available and the former label is absent',await page.getByRole('tabpanel',{name:'检查统计',exact:true}).isVisible()&&await page.getByRole('tab',{name:'检查总表',exact:true}).count()===0)
  await page.screenshot({path:resolve(output,'03-statistics-v1.1.png'),fullPage:true,animations:'disabled'})
  pass('No unhandled browser or console errors',errors.length===0)
  const result={checks,repository,scenarios:{...repository.scenarios,S9:true},errors,storageFailures:'Native IndexedDB failures were injected; no real backend is connected.'}
  writeFileSync(resolve(output,'verification.json'),JSON.stringify(result,null,2)+'\n')
  console.log('Prefill v1.1: '+checks.length+' UI checks; '+repository.checks.length+' native repository checks; S1-S9 passed')
} catch(error) {
  await page?.screenshot({path:resolve(output,'failure-v1.1.png'),fullPage:true}).catch(()=>{})
  throw error
} finally {
  await context?.close();await browser?.close();if(server)await server.close()
}
