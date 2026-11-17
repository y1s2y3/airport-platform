import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { chromium } from 'playwright';
const s=await createServer({configLoader:'native',logLevel:'error',server:{host:'127.0.0.1',port:0,open:false}});await s.listen();
const b=await chromium.launch({headless:true,channel:'msedge'});
try{
 const p=await b.newPage({viewport:{width:1440,height:1050}});const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto(s.resolvedUrls.local[0]);
 await p.evaluate(async()=>{
 const P=await import('/src/composables/useInspectionPersonConfig.js');
 P.saveInspectionPersonConfig('p-000',{...P.getInspectionPersonConfig('p-000'),rectifierId:['insp-002','insp-005'],reviewerId:['insp-003','insp-006']});
 const C=await import('/src/composables/useCurrentProject.js');C.selectedProjectId.value='p-000';
 });
 for(const path of ['/mobile/tasks/create','/mobile/tasks/mt-001/execute']){
 await p.evaluate(async path=>{const {default:r}=await import('/src/router/index.js');await r.push(path)},path);
 await p.locator('.result-btn.hazard').click();
 const selects=p.locator('.person-multi-select');await selects.first().waitFor();
 assert.equal(await selects.count(),path.endsWith('/create')?3:2);
 for(const select of (await selects.all()).slice(0,2)) assert.equal(await select.locator('.el-tag').count(),2);
 await selects.first().click();
 const option=p.locator('.el-select-dropdown:visible .el-select-dropdown__item').filter({hasText:'郑工'});await option.click();
 assert.equal(await selects.first().locator('.el-tag').count(),3);
 await p.keyboard.press('Escape');
 await selects.first().locator('.el-tag__close').first().click();
 assert.equal(await selects.first().locator('.el-tag').count(),2);
 }
 assert.deepEqual(errors,[]);console.log('PASS 新建/执行自动带出全部配置人员，可下拉增选和删除，浏览器无异常');
}finally{await b.close();await s.close()}
