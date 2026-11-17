import assert from 'node:assert/strict'
import {createServer} from 'vite'
import {chromium} from 'playwright'
const server=await createServer({configLoader:'native',logLevel:'error',server:{host:'127.0.0.1',port:0,open:false}});await server.listen()
const browser=await chromium.launch({headless:true,channel:'msedge'})
try{
 const p=await browser.newPage({viewport:{width:1440,height:1000}});await p.goto(server.resolvedUrls.local[0])
 await p.evaluate(async()=>{
 const S=await import('/src/composables/useMobileRectification.js'),U=await import('/src/mock/currentUser.js')
 U.setDemoActingUserId('insp-002')
 const r=S.assignInspectionWorkflowStep('inspection-example-quality-a-rectify','rectify','insp-005',0)
 if(!r.ok)throw Error(r.message)
 })
 await p.reload()
 const saved=await p.evaluate(async()=>{
 const S=await import('/src/composables/useMobileRectification.js'),PC=await import('/src/mock/personalCenter.js'),U=await import('/src/mock/currentUser.js'),C=await import('/src/composables/useCurrentProject.js')
 U.setDemoActingUserId('insp-002');C.selectedProjectId.value='p-000'
 const old=S.getMobileRectification('inspection-example-quality-a-rectify')
 if(old.workflowAssignees.rectify.id!=='insp-005'||!old.workflowHistory.some(x=>x.type==='assignment'))throw Error('指派历史被覆盖')
 if(S.submitRectification(old.id,{assignmentRevision:1,rectificationDate:'2026-11-17',rectificationNote:'旧人提交',rectificationPhotos:['照片.jpg']}))throw Error('恢复了原任务执行权')
 const sample=PC.personalTodoStore.todos.find(x=>x.detail?.workflowExample && x.processName==='隐患问题整改 · A级质量问题施工方整改')
 if(!sample || !PC.findPersonalTodo(sample.id))throw Error('A级整改演示仍不可见')
 const {default:r}=await import('/src/router/index.js');await r.push('/personal-center')
 return sample.detail.rectifyNo
 })
 await p.getByPlaceholder('请输入流程名称').fill('A级质量问题施工方整改')
 await p.getByRole('button',{name:'搜索',exact:true}).click()
 const row=p.locator('.el-table__body tr').filter({hasText:'A级质量问题施工方整改'})
 assert.equal(await row.count(),1)
 await row.getByRole('button',{name:'处理',exact:true}).click()
 await p.locator('.inspection-stage-banner').waitFor()
 assert.ok((await p.locator('.page-viewport').innerText()).includes(saved))
 assert.equal(await p.locator('.block--action').count(),1)
 console.log('PASS 复现A级整改已指派后的隐藏场景；刷新后补充独立可办理示例；原任务及指派历史保留、原人仍不可执行')
}finally{await browser.close();await server.close()}
