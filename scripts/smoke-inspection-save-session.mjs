import assert from 'node:assert/strict'
import {existsSync,mkdirSync,writeFileSync} from 'node:fs'
import {resolve} from 'node:path'
import {createServer as netServer} from 'node:net'
import {chromium} from 'playwright'
import {createServer,preview} from 'vite'
const root=resolve(import.meta.dirname,'..'),built=process.argv.includes('--built'),mode=built?'built':'dev',base=built?'/save-session-preview/':'/',route='/coc-admin/daily-dispatch-check',out=resolve(root,'../outputs/inspection-save-session',mode)
mkdirSync(out,{recursive:true});const checks=[],errors=[],pass=(name,ok=true)=>{assert.ok(ok,name);checks.push(name);console.log('PASS '+name)}
async function freePort(){const s=netServer();await new Promise((r,j)=>{s.once('error',j);s.listen(0,'127.0.0.1',r)});const n=s.address().port;await new Promise(r=>s.close(r));return n}
let server,browser,context,p1,p2
try{
 const port=await freePort();server=built?await preview({ configLoader: 'native', root,base,logLevel:'error',preview:{host:'127.0.0.1',port,strictPort:true,open:false}}):await createServer({ configLoader: 'native', root,base,logLevel:'error',server:{host:'127.0.0.1',port,strictPort:true,open:false}});if(!built)await server.listen()
 browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH||(existsSync(chromium.executablePath())?chromium.executablePath():'C:/Program Files/Google/Chrome/Application/chrome.exe')});context=await browser.newContext({viewport:{width:1440,height:1000}})
 const url=path=>'http://127.0.0.1:'+port+base+'#'+path,daily=p=>p.getByRole('tabpanel',{name:'每日检查',exact:true}),rows=p=>daily(p).locator('.el-table__body-wrapper tbody tr'),footer=p=>p.locator('.daily-detail-footer'),field=p=>p.getByRole('textbox',{name:'重点调度部门',exact:true})
 const dateRow=(p,date)=>rows(p).filter({has:p.locator('td:first-child').getByText(date,{exact:true})})
 function listen(p){p.setDefaultTimeout(15000);p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text())});p.on('dialog',d=>d.accept())}
 async function open(account){const p=await context.newPage();listen(p);await p.addInitScript(account=>sessionStorage.setItem('web-login-session',JSON.stringify({account,at:Date.now()})),account);await p.addInitScript(()=>{window.sawUnifiedEditor=false;new MutationObserver(()=>{if(document.querySelector('.daily-detail-footer'))window.sawUnifiedEditor=true}).observe(document,{childList:true,subtree:true})});await p.goto(url('/'));await p.waitForURL(u=>u.hash==='#/workbench');await p.goto(url(route));await rows(p).first().waitFor();return p}
 async function db(p,store,key){return p.evaluate(({store,key})=>new Promise((r,j)=>{const q=indexedDB.open('airport-daily-dispatch-check-v1');q.onerror=()=>j(q.error);q.onsuccess=()=>{const d=q.result,t=d.transaction(store),v=key==null?t.objectStore(store).getAll():t.objectStore(store).get(key);v.onsuccess=()=>{d.close();r(v.result)};v.onerror=()=>j(v.error)}}),{store,key})}
 async function put(p,store,value){await p.evaluate(({store,value})=>new Promise((r,j)=>{const q=indexedDB.open('airport-daily-dispatch-check-v1');q.onsuccess=()=>{const d=q.result,t=d.transaction(store,'readwrite');t.objectStore(store).put(value);t.oncomplete=()=>{d.close();r()};t.onabort=()=>j(t.error)}}),{store,value})}
 async function ledger(p){await p.waitForURL(u=>u.hash.split('?')[0]==='#'+route);await rows(p).first().waitFor()}
 async function enter(p,date){await dateRow(p,date).getByRole('button',{name:'统一调度检查填写',exact:true}).click()}
 async function decide(p,keep=false){await p.getByText('未保存内容',{exact:true}).waitFor();await p.getByRole('button',{name:keep?'继续填写':'确认放弃',exact:true}).click()}
 async function cancel(p){await footer(p).getByRole('button',{name:'取消',exact:true}).click();await decide(p);await ledger(p)}
 p1=await open('liufs');p2=await open('videoAdmin');const dates=await rows(p1).locator('td:first-child').allTextContents(),date1=dates[0].trim(),date2=dates[1].trim(),date3=dates[2].trim()
 const fixture=await db(p1,'days',date1);fixture.hq.headers.focusDepartment='已保存的部门';fixture.hq.version=Math.max(1,fixture.hq.version);fixture.hq.firstSubmittedAt=date1+'T08:00:00.000Z';fixture.hq.updatedAt=fixture.hq.firstSubmittedAt;fixture.hq.operator={id:'u-001',name:'刘付生'};await put(p1,'days',fixture)
 await enter(p1,date1);await footer(p1).waitFor();const firstLock=(await db(p1,'locks')).find(l=>l.key===date1+':hq')
 pass('The first user enters only after acquiring the date lease',firstLock?.owner.id==='u-001'&&await field(p1).inputValue()==='已保存的部门')
 pass('The app tab identifies unified filling rather than a detail page',await p1.locator('.page-tabs').getByRole('tab',{name:/统一调度检查填写/}).count()===1)
 pass('All save controls use the new label',await footer(p1).getByRole('button',{name:'保存',exact:true}).count()===1&&await p1.getByRole('button',{name:'提交',exact:true}).count()===0)
 await enter(p2,date1);await p2.getByText(/当前内容正在由.*填写.*已返回每日检查台账/).waitFor();await ledger(p2)
 pass('A second user is warned and returned to the daily ledger',await p2.getByText(/当前内容正在由.*填写.*已返回每日检查台账/).count()>0)
 pass('A denied user never sees the unified form or obtains the token',await p2.evaluate(()=>!window.sawUnifiedEditor)&&(await db(p1,'locks')).find(l=>l.key===date1+':hq').token===firstLock.token)
 const popupPromise=p1.waitForEvent('popup');await p1.evaluate(()=>window.open(location.href,'_blank'));const copy=await popupPromise;listen(copy);await ledger(copy)
 pass('A copied same-user tab cannot steal a live editing session',(await db(p1,'locks')).find(l=>l.key===date1+':hq').token===firstLock.token&&await footer(copy).count()===0);await copy.close()
 await enter(p2,date2);await footer(p2).waitFor();pass('Different dates may be edited concurrently',(await db(p1,'locks')).filter(l=>l.key.endsWith(':hq')).length===2);await cancel(p2)
 await dateRow(p2,date1).getByRole('button',{name:'查看详情',exact:true}).click();await p2.getByRole('heading',{name:'COC调度会检查记录表详情',exact:true}).waitFor()
 pass('Viewing uses the single canonical read-only detail page',await footer(p2).count()===0&&await p2.getByRole('button',{name:'保存',exact:true}).count()===0)
 await field(p1).fill('待保留输入');await p1.getByRole('button',{name:'返回',exact:true}).evaluate(el=>{el.click();el.click()});await p1.getByText('未保存内容',{exact:true}).waitFor();pass('Repeated Back opens a single unsaved confirmation',await p1.locator('.daily-dispatch-confirm:visible').count()===1);await p1.screenshot({path:resolve(out,'unsaved-confirm.png'),animations:'disabled'})
 await decide(p1,true);pass('Continue editing preserves inputs and the lease',await field(p1).inputValue()==='待保留输入'&&(await db(p1,'locks')).find(l=>l.key===date1+':hq').token===firstLock.token)
 await p1.locator('.page-tabs').getByRole('button',{name:'关闭标签 统一调度检查填写',exact:true}).click();await decide(p1,true)
 pass('Canceling a tab close preserves its label and current edit',await p1.locator('.page-tabs').getByRole('tab',{name:/统一调度检查填写/}).count()===1&&await field(p1).inputValue()==='待保留输入')
 await p1.locator('.page-tabs').getByRole('tab',{name:/统一调度检查填写/}).click();pass('Re-selecting the current tab retains the entry query',new URL(p1.url()).hash.includes('entry=unified')&&await footer(p1).count()===1)
 const logsBefore=await db(p1,'logs');await cancel(p1);pass('Cancel discards unsaved values, releases the lease, and does not save',JSON.stringify(await db(p1,'logs'))===JSON.stringify(logsBefore)&&(await db(p1,'days',date1)).hq.headers.focusDepartment==='已保存的部门'&&!(await db(p1,'locks')).some(l=>l.key===date1+':hq'))
 await enter(p1,date1);await footer(p1).waitFor();await field(p1).fill('刷新前未保存');const reloadToken=(await db(p1,'locks')).find(l=>l.key===date1+':hq').token
 await p1.reload();await footer(p1).waitFor();const refreshed=(await db(p1,'locks')).find(l=>l.key===date1+':hq')
 pass('Reload abandons unsaved input and restores saved values',await field(p1).inputValue()==='已保存的部门')
 pass('Reload immediately reacquires only its abandoned same-user lease',refreshed.owner.id==='u-001'&&refreshed.token!==reloadToken)
 await field(p1).fill('保存后的部门');await p1.locator('.daily-inspection-table .el-table__body-wrapper tbody tr').first().getByRole('button',{name:/填写|编辑/}).first().click();const drawer=p1.locator('.daily-dispatch-drawer:visible');await drawer.waitFor();await drawer.locator('.daily-drawer-unified .el-checkbox').click();assert.equal(await drawer.getByRole('checkbox',{name:'抽屉当日统一调度',exact:true}).isChecked(),true)
 for(const label of ['人员履职','安全检查情况','质量检查情况','摄像头检查情况']){const input=drawer.getByRole('combobox',{name:label,exact:true});await input.focus();await input.press('ArrowDown');const id=await input.getAttribute('aria-controls');await p1.locator('[id="'+id+'"]').getByRole('option',{name:'正常',exact:true}).click()}
 await drawer.getByRole('button',{name:'应用到当前表单',exact:true}).click();await drawer.waitFor({state:'hidden'});const version=(await db(p1,'days',date1)).hq.version,logsCount=(await db(p1,'logs')).length
 await footer(p1).getByRole('button',{name:'保存',exact:true}).evaluate(el=>{el.click();el.click()});await ledger(p1);const saved=await db(p1,'days',date1)
 pass('Save immediately returns to the daily ledger without a discard prompt',await p1.getByText('未保存内容',{exact:true}).count()===0&&saved.hq.headers.focusDepartment==='保存后的部门')
 pass('A rapid double save writes exactly one version and audit entry',saved.hq.version===version+1&&(await db(p1,'logs')).length===logsCount+1)
 pass('The returned ledger shows updated inspection states',await dateRow(p1,date1).locator('.daily-result-normal').count()===3)
 await p2.getByText('保存后的部门',{exact:true}).waitFor();pass('The other viewer refreshes the same canonical detail after saving');await p1.goBack();await ledger(p1);pass('Browser Back does not reopen the completed filling session',await footer(p1).count()===0)
 await enter(p1,date1);await footer(p1).waitFor();await p1.getByRole('button',{name:'返回',exact:true}).click();await decide(p1);await ledger(p1);pass('Confirmed Back also releases the date lease',!(await db(p1,'locks')).some(l=>l.key===date1+':hq'))
 await enter(p1,date1);await footer(p1).waitFor();let expiring=(await db(p1,'locks')).find(l=>l.key===date1+':hq');expiring.expiresAt=Date.now()-1;await put(p1,'locks',expiring)
 await p2.getByRole('button',{name:'返回',exact:true}).click();await ledger(p2);await enter(p2,date1);await footer(p2).waitFor();const newOwner=(await db(p2,'locks')).find(l=>l.key===date1+':hq')
 await p1.reload();await ledger(p1);pass('Reload cannot reclaim a token now held by another user',await footer(p1).count()===0&&newOwner.owner.id==='u-004'&&(await db(p2,'locks')).find(l=>l.key===date1+':hq').token===newOwner.token);await cancel(p2)
 const invalid=await db(p1,'days',date3);invalid.hq.version=Math.max(1,invalid.hq.version);invalid.hq.firstSubmittedAt=date3+'T08:00:00.000Z';invalid.hq.operator={id:'u-001',name:'刘付生'};invalid.hq.rows[0].safety={schemaVersion:4,type:'problem',problems:[{text:'历史问题缺图',images:[]}]};await put(p1,'days',invalid)
 await enter(p1,date3);await footer(p1).waitFor();await field(p1).fill('失败时保留输入');await footer(p1).getByRole('button',{name:'保存',exact:true}).click();await p1.locator('.daily-detail-section > .daily-validation-error').waitFor()
 pass('Failed validation retains the form, input, version, and lease',await field(p1).inputValue()==='失败时保留输入'&&(await db(p1,'days',date3)).hq.version===invalid.hq.version&&(await db(p1,'locks')).some(l=>l.key===date3+':hq'))
 await cancel(p1);pass('No console or unhandled browser errors',errors.length===0)
 await p1.screenshot({path:resolve(out,'returned-ledger.png'),fullPage:true,animations:'disabled'});writeFileSync(resolve(out,'verification.json'),JSON.stringify({mode,checks,errors,passed:true},null,2));console.log('Save session ('+mode+'): '+checks.length+' checks passed')
}catch(e){await p1?.screenshot({path:resolve(out,'failure.png'),fullPage:true}).catch(()=>{});writeFileSync(resolve(out,'failure.json'),JSON.stringify({message:e.message,stack:e.stack,checks,errors},null,2));throw e}
finally{await browser?.close();if(server?.close)await server.close();else if(server?.httpServer)await new Promise(r=>server.httpServer.close(r))}
