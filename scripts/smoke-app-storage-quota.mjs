import assert from 'node:assert/strict'
import {createServer} from 'vite'
import {chromium} from 'playwright'
const server=await createServer({configLoader:'native',logLevel:'error',server:{host:'127.0.0.1',port:0,open:false}});await server.listen()
const browser=await chromium.launch({headless:true,channel:'msedge'})
try{
 for(const legacy of [false,true]){
 const context=await browser.newContext({viewport:{width:1440,height:1000}})
 await context.addInitScript(legacy=>{
  window.quotaStacks=[];window.failures=[];window.addEventListener('unhandledrejection',event=>window.failures.push(event.reason?.stack || String(event.reason)));
  sessionStorage.setItem('jg-app-session',JSON.stringify({account:'admin'}))
  const original=Storage.prototype.setItem
  window.restoreStorageWrites=()=>{Storage.prototype.setItem=original}
  if(legacy)original.call(localStorage,'airport-major-hazard-manual-v3',JSON.stringify({'p-000':{standardLibraryVersion:'old',identifications:[{id:'keep-user-record',status:'草稿'}],ledgers:[],plans:[],demoSeeded:true}}))
  window.originalMajorHazardCache=localStorage.getItem('airport-major-hazard-manual-v3')
  Storage.prototype.setItem=function(key,value){if(this===localStorage && ['airport-major-hazard-manual-v3','airport-inspection-patrol-tasks-v1'].includes(key)){ window.quotaStacks.push(new Error().stack); throw new DOMException('模拟用户本地缓存已满','QuotaExceededError') };return original.call(this,key,value)}
 },legacy)
 const p=await context.newPage(),errors=[];p.on('pageerror',e=>{errors.push(e.message);console.log(e.stack)})
 p.on('console',m=>{if(['error','warn'].includes(m.type()))console.log(m.type()+': '+m.text())}); await p.goto(server.resolvedUrls.local[0]+'#/app/personal')
 try { await p.getByText('消息中心',{exact:true}).first().waitFor({timeout:5000}) } catch(e) { console.log(await p.evaluate(()=>window.quotaStacks.slice(-5)));console.log((await p.locator('body').innerText()).slice(0,6000)); throw e }
 assert.ok((await p.locator('body').innerText()).includes('业务功能'))
 const checked=await p.evaluate(async legacy=>{
 const M=await import('/src/utils/majorHazardManualStorage.js')
 const data=M.ensureMajorHazardData('p-000')
 const kept=!legacy || data.identifications.some(x=>x.id==='keep-user-record')
 let manualSaveFailed=false
 try{M.saveCategory('p-000',{id:'quota-test',name:'存储测试'})}catch(e){manualSaveFailed=e.name==='QuotaExceededError'}
 const unchanged=localStorage.getItem('airport-major-hazard-manual-v3')===window.originalMajorHazardCache
 window.restoreStorageWrites()
 M.saveCategory('p-000',{id:'recovered-save',name:'空间恢复后保存'})
 const recovered=JSON.parse(localStorage.getItem('airport-major-hazard-manual-v3'))['p-000'].categories.some(x=>x.id==='recovered-save')
 return {kept,manualSaveFailed,unchanged,recovered}
 },legacy)
 assert.deepEqual(checked,{kept:true,manualSaveFailed:true,unchanged:true,recovered:true})
 assert.deepEqual(errors,[])
 console.log('PASS '+(legacy?'已有旧缓存':'空缓存')+'写入配额异常：APP首页正常、原数据保留、主动保存失败不误报成功')
 await context.close()
 }
}finally{await browser.close();await server.close()}
