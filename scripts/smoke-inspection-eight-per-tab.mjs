import assert from 'node:assert/strict'
import { createServer } from 'vite'
import { chromium } from 'playwright'
const server=await createServer({configLoader:'native',logLevel:'error',server:{host:'127.0.0.1',port:0,open:false}});await server.listen()
const browser=await chromium.launch({headless:true,channel:'msedge'})
try{
 const p=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto(server.resolvedUrls.local[0])
 const cases=await p.evaluate(async()=>{
 const PC=await import('/src/mock/personalCenter.js'),E=await import('/src/mock/inspectionWorkflowExamples.js'),W=await import('/src/utils/inspectionRectificationWorkflow.js'),C=await import('/src/composables/useCurrentProject.js')
 C.selectedProjectId.value='p-000'
 const result=[]
 for(const [from,rows] of [['todo',PC.personalTodoStore.todos],['done',PC.personalTodoStore.done],['started',PC.personalStarted]]){
  for(const name of E.INSPECTION_WORKFLOW_EXAMPLE_NAMES){
   const matches=rows.filter(x=>x.processName===name && x.detail?.workflowExample)
   if(matches.length!==1)throw Error(from+' '+name+' 数量='+matches.length)
   const row=matches[0]
   if(from==='done'){
    const key=row.id.split('-').at(-1),step=W.workflowSteps(row.detail).find(s=>s.key===key)
    if(!row.detail[step.date]||!row.detail[step.note])throw Error('已办缺少本节点完成资料 '+name)
    if(W.currentWorkflowStep(row.detail)?.key===key)throw Error('已办仍停留本节点 '+name)
   }
   result.push({from,id:row.id,name,no:row.detail.rectifyNo})
  }
 }
 if(PC.personalTodoStore.todos.filter(x=>x.type==='inspection'&&x.inspectionBizType==='巡检').length!==3)throw Error('执行示例不为3')
 return result
 })
 for(const row of cases){
 await p.evaluate(async row=>{const {default:r}=await import('/src/router/index.js');await r.push({path:'/personal-center/todo/handle',query:{id:row.id,from:row.from}})},row)
 await p.locator('.inspection-stage-banner').waitFor()
 assert.ok((await p.locator('.page-viewport').innerText()).includes(row.no))
 assert.equal(await p.locator('.block--action').count(),row.from==='todo'?1:0)
 }
 assert.deepEqual(errors,[])
 console.log('PASS 待办、已办和发起示例各节点完整，详情可打开，巡检执行仍为3条')
}finally{await browser.close();await server.close()}
