import assert from 'node:assert/strict'
import {existsSync,mkdirSync,writeFileSync} from 'node:fs'
import {createServer as netServer} from 'node:net'
import {resolve} from 'node:path'
import {chromium} from 'playwright'
import {createServer,preview} from 'vite'
import {validateHq,validatePerson} from '../src/utils/dailyDispatchCheckRules.js'
import {hasPrototypeExampleParts} from '../src/mock/dailyDispatchCheckExamples.js'
const root=resolve(import.meta.dirname,'..'),built=process.argv.includes('--built'),mode=built?'built':'dev',base=built?'/cancel-examples-preview/':'/',route='/coc-admin/daily-dispatch-check'
const output=resolve(root,'../outputs/inspection-cancel-examples',mode),checks=[],errors=[];mkdirSync(output,{recursive:true})
const pass=(name,ok=true)=>{assert.ok(ok,name);checks.push(name);console.log('PASS '+name)}
async function port(){const s=netServer();await new Promise((r,j)=>{s.once('error',j);s.listen(0,'127.0.0.1',r)});const p=s.address().port;await new Promise(r=>s.close(r));return p}
let server,browser,page
try{
 const p=await port();server=built?await preview({ configLoader: 'native', root,base,logLevel:'error',preview:{host:'127.0.0.1',port:p,strictPort:true,open:false}}):await createServer({ configLoader: 'native', root,base,logLevel:'error',server:{host:'127.0.0.1',port:p,strictPort:true,open:false}});if(!built)await server.listen()
 browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH||(existsSync(chromium.executablePath())?chromium.executablePath():'C:/Program Files/Google/Chrome/Application/chrome.exe')})
 page=await browser.newPage({viewport:{width:1440,height:1000}});page.setDefaultTimeout(15000);page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())})
 const url=path=>'http://127.0.0.1:'+p+base+'#'+path,daily=()=>page.getByRole('tabpanel',{name:'每日检查',exact:true}),first=()=>daily().locator('.el-table__body-wrapper tbody tr').first()
 async function db(store,key){return page.evaluate(({store,key})=>new Promise((resolve,reject)=>{const q=indexedDB.open('airport-daily-dispatch-check-v1');q.onerror=()=>reject(q.error);q.onsuccess=()=>{const d=q.result,t=d.transaction(store),r=key==null?t.objectStore(store).getAll():t.objectStore(store).get(key);r.onsuccess=()=>{d.close();resolve(r.result)};r.onerror=()=>reject(r.error)}}),{store,key})}
 async function cancel(){await page.locator('.daily-detail-footer').getByRole('button',{name:'取消',exact:true}).click();await page.getByText('未保存内容',{exact:true}).waitFor();await page.getByRole('button',{name:'确认放弃',exact:true}).click();await page.waitForURL(u=>u.hash.split('?')[0]==='#'+route);await first().waitFor()}
 const business=day=>JSON.stringify({hq:day.hq,people:day.people})
 pass('HTTP 200',(await page.goto(url(route))).status()===200);await first().waitFor()
 const examples=(await db('days')).filter(hasPrototypeExampleParts)
 pass('Demo dates exist, including all four review dates',examples.length>=4&&['2026-10-24','2026-10-25','2026-10-26','2026-10-27'].every(date=>examples.some(day=>day.date===date)))
 for(const day of examples){assert.equal(validateHq(day.hq),'',day.date+' HQ');for(const [id,parts]of Object.entries(day.people))for(const [part,value]of Object.entries(parts))assert.equal(validatePerson(value),'',day.date+'/'+id+'/'+part)}
 pass('All generated examples satisfy current required text, identity, image format, size, and count validation')
 if(!built){const audit=await page.evaluate(async()=>{const {dailyDispatchRepository}=await import('/src/composables/useDailyDispatchCheck.js'),{inspectionSelectableUsers}=await import('/src/mock/inspectionPersonnel.js'),{exampleValidationErrors}=await import('/src/mock/dailyDispatchCheckExamples.js');return(await dailyDispatchRepository.listDays()).flatMap(day=>exampleValidationErrors(day,inspectionSelectableUsers).map(error=>({date:day.date,error}))) });pass('Example identities resolve to enabled users in the actual mock directory',audit.length===0)}
 const rangeBefore=await daily().locator('.el-range-input').evaluateAll(nodes=>nodes.map(n=>n.value))
 const size=daily().locator('.business-table-pagination').getByRole('combobox');await size.focus();await size.press('ArrowDown');const menu=await size.getAttribute('aria-controls');await page.locator('[id="'+menu+'"]').getByRole('option',{name:'20条/页',exact:true}).click()
 const jump=daily().locator('.el-pagination__jump input');await jump.fill('2');await jump.press('Enter');await daily().locator('.el-pager .is-active').filter({hasText:/^2$/}).waitFor()
 const date=(await first().locator('td').first().innerText()).trim(),original=await db('days',date),logs=await db('logs')
 await first().getByRole('button',{name:'统一调度检查填写',exact:true}).click();await page.locator('.daily-detail-footer').waitFor();await page.getByRole('textbox',{name:'重点调度部门',exact:true}).fill('取消后不保存的输入')
 pass('Unified editing holds its own lock',(await db('locks')).some(lock=>lock.key===date+':hq'))
 await cancel()
 pass('Cancel returns to the daily ledger, rather than the read-only date page',await page.getByRole('tab',{name:'每日检查',exact:true}).getAttribute('aria-selected')==='true'&&!await page.locator('.daily-dispatch-detail').count())
 pass('Cancel restores the date range',JSON.stringify(await daily().locator('.el-range-input').evaluateAll(nodes=>nodes.map(n=>n.value)))===JSON.stringify(rangeBefore))
 pass('Cancel restores page two and 20 rows',await daily().locator('.el-pager .is-active').innerText()==='2'&&(await daily().locator('.el-pagination__sizes').innerText()).includes('20'))
 pass('Cancel discards unsaved business changes and writes no audit entry',business(await db('days',date))===business(original)&&JSON.stringify(await db('logs'))===JSON.stringify(logs))
 pass('Cancel releases the unified lock',!(await db('locks')).some(lock=>lock.key===date+':hq'))
 const picker=daily().locator('.el-date-editor');await picker.hover();await picker.locator('.el-range__close-icon').click();await daily().getByRole('button',{name:'查询',exact:true}).click();await first().waitFor()
 await first().getByRole('button',{name:'统一调度检查填写',exact:true}).click();await page.locator('.daily-detail-footer').waitFor();await cancel()
 pass('A cleared date remains unrestricted after cancel',(await daily().locator('.el-range-input').evaluateAll(nodes=>nodes.map(n=>n.value))).every(v=>v===''))
 await page.goto(url(route+'/records/2026-10-25?entry=unified'));await page.locator('.daily-detail-footer').waitFor();const beforeSave=await db('days','2026-10-25')
 await page.locator('.daily-detail-footer').getByRole('button',{name:'保存',exact:true}).click();await page.waitForURL(u=>u.hash.split('?')[0]==='#'+route);await first().waitFor();let saved=await db('days','2026-10-25')
 pass('An existing problem-heavy HQ example resubmits without image validation failures',saved.hq.version===beforeSave.hq.version+1)
 pass('Resubmitting HQ preserves both personnel parts',JSON.stringify(saved.people)===JSON.stringify(beforeSave.people))
 await page.goto(url(route+'/records/2026-10-24?entry=project'));const row=page.locator('.daily-inspection-table .el-table__body-wrapper tbody tr').first();await row.getByRole('button',{name:'填写项目部检查',exact:true}).click();const drawer=page.locator('.daily-dispatch-drawer:visible'),duty=drawer.getByTestId('project-duty');await duty.getByRole('button',{name:'编辑',exact:true}).click();await duty.locator('form').waitFor();const beforePart=await db('days','2026-10-24'),projectId=beforePart.hq.rows[0].projectId
 await duty.getByRole('button',{name:'保存',exact:true}).click();await duty.locator('form').waitFor({state:'hidden'});saved=await db('days','2026-10-24')
 pass('An existing multi-problem duty example resubmits with every image present',saved.people[projectId].duty.version===beforePart.people[projectId].duty.version+1)
 pass('Duty submission preserves manager and HQ content',JSON.stringify(saved.people[projectId].manager)===JSON.stringify(beforePart.people[projectId].manager)&&JSON.stringify(saved.hq)===JSON.stringify(beforePart.hq))
 await drawer.getByRole('button',{name:'关闭',exact:true}).click();await page.goto(url(route+'/records/2026-10-25?entry=unified'));await page.locator('.daily-detail-footer').waitFor();await cancel()
 pass('Cancel from a direct entry without return state uses daily ledger defaults',(await daily().locator('.el-range-input').evaluateAll(nodes=>nodes.map(n=>n.value))).every(Boolean)&&(await daily().locator('.el-pagination__sizes').innerText()).includes('10'))
 await page.screenshot({path:resolve(output,'cancel-returned-ledger.png'),fullPage:true,animations:'disabled'})
 pass('No console or unhandled browser errors',errors.length===0)
 writeFileSync(resolve(output,'verification.json'),JSON.stringify({mode,exampleDates:examples.map(d=>d.date),checks,errors,passed:true},null,2));console.log('Cancel and examples ('+mode+'): '+checks.length+' checks passed; '+examples.length+' example dates audited')
}catch(e){await page?.screenshot({path:resolve(output,'failure.png'),fullPage:true}).catch(()=>{});writeFileSync(resolve(output,'failure.json'),JSON.stringify({message:e.message,stack:e.stack,checks,errors},null,2));throw e}
finally{await browser?.close();if(server?.close)await server.close();else if(server?.httpServer)await new Promise(r=>server.httpServer.close(r))}
