import assert from 'node:assert/strict'
import {existsSync,mkdirSync,writeFileSync} from 'node:fs'
import {createServer as netServer} from 'node:net'
import {resolve} from 'node:path'
import {chromium} from 'playwright'
import {createServer,preview} from 'vite'
const root=resolve(import.meta.dirname,'..'),built=process.argv.includes('--built'),mode=built?'built':'dev',base=built?'/personnel-preview/':'/',route='/coc-admin/daily-dispatch-check'
const output=resolve(root,'../outputs/inspection-personnel-rules',mode),checks=[],errors=[]
mkdirSync(output,{recursive:true})
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+iK1cAAAAASUVORK5CYII=','base64')
const pass=(name,value=true)=>{assert.ok(value,name);checks.push(name);console.log('PASS '+name)}
async function port(){const s=netServer();await new Promise((r,j)=>{s.once('error',j);s.listen(0,'127.0.0.1',r)});const p=s.address().port;await new Promise(r=>s.close(r));return p}
let server,browser,page
try{
 const p=await port();server=built?await preview({ configLoader: 'native', root,base,logLevel:'error',preview:{host:'127.0.0.1',port:p,strictPort:true,open:false}}):await createServer({ configLoader: 'native', root,base,logLevel:'error',server:{host:'127.0.0.1',port:p,strictPort:true,open:false}});if(!built)await server.listen()
 browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH||(existsSync(chromium.executablePath())?chromium.executablePath():'C:/Program Files/Google/Chrome/Application/chrome.exe')})
 async function open(account){const c=await browser.newContext({viewport:{width:1440,height:1000}});await c.addInitScript(account=>sessionStorage.setItem('web-login-session',JSON.stringify({account,at:Date.now()})),account);const pg=await c.newPage();pg.setDefaultTimeout(15000);pg.on('pageerror',e=>errors.push(e.message));await pg.goto('http://127.0.0.1:'+p+base+'#/');await pg.waitForURL(url=>url.hash==='#/workbench');await pg.goto('http://127.0.0.1:'+p+base+'#'+route);await pg.getByRole('tabpanel',{name:'每日检查',exact:true}).locator('tbody tr').first().waitFor();return pg}
 const daily=()=>page.getByRole('tabpanel',{name:'每日检查',exact:true}),first=()=>daily().locator('.el-table__body-wrapper tbody tr').first(),tableRow=()=>page.locator('.daily-inspection-table .el-table__body-wrapper tbody tr').first(),drawer=()=>page.locator('.daily-dispatch-drawer:visible')
 const duty=()=>drawer().getByTestId('project-duty'),manager=()=>drawer().getByTestId('project-manager')
 async function data(date){return page.evaluate(date=>new Promise((resolve,reject)=>{const q=indexedDB.open('airport-daily-dispatch-check-v1');q.onerror=()=>reject(q.error);q.onsuccess=()=>{const db=q.result,r=db.transaction('days').objectStore('days').get(date);r.onsuccess=()=>{db.close();resolve(r.result)};r.onerror=()=>reject(r.error)}}),date)}
 async function seed(){const date=(await first().locator('td').first().innerText()).trim();await page.evaluate(date=>new Promise((resolve,reject)=>{const q=indexedDB.open('airport-daily-dispatch-check-v1');q.onsuccess=()=>{const db=q.result,tx=db.transaction('days','readwrite'),r=tx.objectStore('days').get(date);r.onsuccess=()=>{const d=r.result;d.hq={headers:{focusDepartment:'',attendance:'',dispatcherId:'',dispatcher:'',departmentAttendance:''},rows:d.hq.rows.slice(0,2).map(row=>({projectId:row.projectId,projectName:row.projectName,unified:false})),note:'',version:0,firstSubmittedAt:'',updatedAt:'',operator:null};d.people={};d.dispatchDefaults={initializedAt:new Date().toISOString(),projectIds:[]};delete d.demoScenario;tx.objectStore('days').put(d)};tx.oncomplete=()=>{db.close();resolve()};tx.onabort=()=>reject(tx.error)};q.onerror=()=>reject(q.error)}),date);await daily().getByRole('button',{name:'刷新',exact:true}).click();return date}
 async function submitHq(){await page.locator('.daily-detail-footer').getByRole('button',{name:'保存',exact:true}).click();await page.waitForURL(u=>u.hash.split('?')[0]==='#'+route);await first().waitFor()}
 async function editHq(){await first().getByRole('button',{name:'统一调度检查填写',exact:true}).click();await page.locator('.daily-detail-footer').waitFor()}
 async function upload(scope){await scope.locator('input[type=file]').first().setInputFiles({name:'检查.png',mimeType:'image/png',buffer:png});await scope.locator('.ap-attach-item').first().waitFor()}
 async function start(scope,name='填写'){await scope.getByRole('button',{name,exact:true}).click();await scope.locator('form').waitFor()}
 async function save(scope){await scope.getByRole('button',{name:'保存',exact:true}).click();await scope.locator('form').waitFor({state:'hidden'})}
 const selected=scope=>scope.locator('.daily-user-picker .el-select__selected-item.el-select__placeholder').innerText()
 async function chooseOther(scope){const input=scope.locator('.daily-user-picker').getByRole('combobox');await input.focus();await input.press('ArrowDown');const pop=page.locator('.el-popper.daily-user-picker-dropdown:visible');const option=pop.getByRole('option').filter({hasNotText:'视频中心用户'}).first();const label=(await option.innerText()).trim();await option.click();await pop.waitFor({state:'hidden'});return label}
 async function projectEntry(){await first().getByRole('button',{name:'项目部检查填写',exact:true}).click();await tableRow().getByRole('button',{name:'填写项目部检查',exact:true}).click();await drawer().waitFor()}
 page=await open('videoAdmin');const date=await seed();await first().getByRole('button',{name:'统一调度检查填写',exact:true}).click();await page.locator('.daily-detail-footer').waitFor()
 pass('Dispatcher field is optional in the UI',await page.locator('.daily-header-form .daily-required').count()===0&&(await page.locator('.daily-header-form .daily-user-picker .el-select__placeholder').innerText()).trim()==='请选择人员（选填）')
 await page.screenshot({path:resolve(output,'dispatcher-optional.png'),fullPage:true,animations:'disabled'});await page.getByRole('textbox',{name:'重点调度部门',exact:true}).fill('选填回归');await submitHq();let day=await data(date)
 pass('HQ submits with no dispatcher and stores empty identity',day.hq.version===1&&day.hq.headers.dispatcherId===''&&day.hq.headers.dispatcher===''&&day.hq.headers.focusDepartment==='选填回归')
 await editHq();const dispatch=page.getByRole('combobox',{name:'安质部调度人员',exact:true});await dispatch.focus();await dispatch.press('ArrowDown');await page.locator('.el-popper.daily-user-picker-dropdown:visible').getByRole('option',{name:/安质部示例调度员/}).click();await submitHq();day=await data(date)
 pass('A chosen dispatcher still saves a valid department user',day.hq.headers.dispatcherId==='inspection-dispatch-demo'&&day.hq.headers.dispatcher==='安质部示例调度员')
 await editHq();const dispatchPicker=page.locator('.daily-header-form .daily-user-picker');await dispatchPicker.locator('.el-select').hover();await dispatchPicker.locator('.el-select__clear').click();await submitHq();day=await data(date)
 pass('Clearing a dispatcher clears its ID and name on submit',day.hq.headers.dispatcherId===''&&day.hq.headers.dispatcher==='')
 const hqSaved=JSON.stringify(day.hq);await first().waitFor();await projectEntry()
 await start(duty());await start(manager())
 pass('Both new forms default to the actual logged-in user',await selected(duty())==='视频中心用户'&&await selected(manager())==='视频中心用户')
 pass('Defaulting does not submit either form',!Object.keys((await data(date)).people).length);await page.screenshot({path:resolve(output,'both-current-user.png'),fullPage:true,animations:'disabled'})
 await duty().getByRole('textbox',{name:'正常检查说明',exact:true}).fill('值班当前用户');await manager().getByRole('textbox',{name:'正常检查说明',exact:true}).fill('经理未保存输入');await upload(duty());await save(duty())
 let saved=await data(date);const projectId=saved.hq.rows[0].projectId
 pass('Current user outside the project is a valid duty identity',saved.people[projectId].duty.userId==='u-004'&&saved.people[projectId].duty.operator.id==='u-004')
 pass('Duty submission preserves the other editor',await manager().getByRole('textbox',{name:'正常检查说明',exact:true}).inputValue()==='经理未保存输入'&&await selected(manager())==='视频中心用户')
 await upload(manager());await save(manager());saved=await data(date)
 pass('Manager also submits with the same current user',saved.people[projectId].manager.userId==='u-004'&&saved.people[projectId].manager.operator.id==='u-004')
 pass('Two project submissions preserve HQ content',JSON.stringify(saved.hq)===hqSaved)
 await start(duty(),'编辑');const otherLabel=await chooseOther(duty());await save(duty());saved=await data(date);const other=saved.people[projectId].duty
 pass('The default is editable and saves the chosen user',other.userId!=='u-004'&&otherLabel.startsWith(other.name)&&other.operator.id==='u-004')
 await start(duty(),'编辑');pass('Editing an existing form retains its saved identity',await selected(duty())===other.name);await duty().getByRole('button',{name:'取消',exact:true}).click();await drawer().getByRole('button',{name:'关闭',exact:true}).click();await drawer().waitFor({state:'hidden'})
 await tableRow().getByRole('button',{name:'填写项目部检查',exact:true}).click();await drawer().waitFor();await start(manager(),'编辑');pass('Saved cross-project current user continues to render on re-edit',await selected(manager())==='视频中心用户');await manager().getByRole('button',{name:'取消',exact:true}).click();await drawer().getByRole('button',{name:'关闭',exact:true}).click()
 for(const [account,name] of [['liufs','刘付生'],['wangqiang','']]){
  const previous=page;page=await open(account);await seed();await projectEntry();await start(duty());await start(manager())
  if(name)pass('A different login defaults both forms to that user',await selected(duty())===name&&await selected(manager())===name)
  else pass('An inactive login does not borrow another user identity',(await selected(duty())).includes('请选择人员')&&(await selected(manager())).includes('请选择人员'))
  await duty().getByRole('button',{name:'取消',exact:true}).click();await manager().getByRole('button',{name:'取消',exact:true}).click();await drawer().getByRole('button',{name:'关闭',exact:true}).click();await page.context().close();page=previous
 }
 pass('No unhandled browser errors',errors.length===0)
 writeFileSync(resolve(output,'verification.json'),JSON.stringify({mode,checks,errors,passed:true},null,2));console.log('Personnel rules ('+mode+'): '+checks.length+' checks passed')
}catch(e){if(page)await page.screenshot({path:resolve(output,'failure.png'),fullPage:true,animations:'disabled'}).catch(()=>{});writeFileSync(resolve(output,'failure.json'),JSON.stringify({message:e.message,stack:e.stack,checks,errors},null,2));throw e}
finally{await browser?.close();if(server?.close)await server.close();else if(server?.httpServer)await new Promise(r=>server.httpServer.close(r))}