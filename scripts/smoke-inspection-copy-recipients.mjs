import assert from 'node:assert/strict'
import {createServer} from 'vite'
import {chromium} from 'playwright'
const server=await createServer({configLoader:'native',logLevel:'error',server:{host:'127.0.0.1',port:0,open:false}});await server.listen()
const browser=await chromium.launch({headless:true,channel:'msedge'})
try{
 const page=await browser.newPage({viewport:{width:1440,height:1050}}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(server.resolvedUrls.local[0])
 await page.evaluate(async()=>{const {default:r}=await import('/src/router/index.js');await r.push('/mobile/tasks/create')})
 await page.locator('.result-btn.hazard').click()
 const row=page.locator('.form-row').filter({has:page.getByText('整改单完成抄送人',{exact:true})})
 assert.equal(await row.locator('.required-mark').count(),0)
 assert.equal(await row.locator('.el-tag').count(),0)
 await row.locator('.el-select').click()
 await page.locator('.el-select-dropdown:visible .el-select-dropdown__item').filter({hasText:'赵工（项目安全负责人）'}).click()
 await page.locator('.el-select-dropdown:visible .el-select-dropdown__item').filter({hasText:'周工（质量工程师）'}).click()
 await page.keyboard.press('Escape')
 assert.equal(await row.locator('.el-tag').count(),2)
 await page.evaluate(async()=>{
 const S=await import('/src/composables/useMobileRectification.js'),PC=await import('/src/mock/personalCenter.js'),U=await import('/src/mock/currentUser.js'),H=await import('/src/mock/inspectionHazardQuery.js')
 const task={id:'cc-test',taskNo:'CC-TEST',inspectionCategory:'安全',projectId:'p-000',project:'飞行区跑道延长工程'}
 S.createMobileRectificationsFromTask(task,[{rectifyId:'cc-empty',desc:'不选抄送人',issueCcPersons:'',completionCcPersons:''},{rectifyId:'cc-multi',desc:'多选抄送人',ccPersons:'赵工（项目安全负责人）、周工（质量工程师）'}])
 const check=(v,m)=>{if(!v)throw Error(m)}
 check(!!S.getMobileRectification('cc-empty'),'抄送留空未生成整改单')
 check(!PC.personalCc.some(x=>x.rectifyId==='cc-empty'),'空抄送生成了消息')
 check(PC.personalCc.filter(x=>x.rectifyId==='cc-multi').length===2,'多选未生成两份抄送')
 U.setDemoActingUserId('insp-005');check(S.mobileWorkflowMessages.value.copied.some(x=>x.recordId==='cc-multi'),'接收人未收到抄送')
 U.setDemoActingUserId('insp-002');check(!S.mobileWorkflowMessages.value.copied.some(x=>x.recordId==='cc-multi'),'无关人员看到抄送')
 check(H.getInspectionHazardDetail('cc-multi').ccPersons.includes('周工'),'WEB详情抄送丢失')
 S.submitRectification('cc-multi',{rectificationDate:'2026-11-17',rectificationNote:'整改完成',rectificationPhotos:['整改.jpg']})
 check(PC.personalCc.filter(x=>x.rectifyId==='cc-multi').length===2,'流转产生重复抄送')
 })
 assert.deepEqual(errors,[])
 console.log('PASS 抄送人非必填、多选、留空可生成单据、指定人员收件、无关人员隔离、详情展示和流转不重复')
}finally{await browser.close();await server.close()}
