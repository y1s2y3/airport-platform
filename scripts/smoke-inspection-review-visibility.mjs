import assert from 'node:assert/strict'
import {createServer} from 'vite'
import {chromium} from 'playwright'
const s=await createServer({configLoader:'native',logLevel:'error',server:{host:'127.0.0.1',port:0,open:false}});await s.listen()
const b=await chromium.launch({headless:true,channel:'msedge'})
try{
 const p=await b.newPage({viewport:{width:1440,height:1000}}),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto(s.resolvedUrls.local[0])
 await p.evaluate(async()=>{
  const S=await import('/src/composables/useMobileRectification.js'),C=await import('/src/composables/useCurrentProject.js'),U=await import('/src/mock/currentUser.js'),{default:r}=await import('/src/router/index.js')
  C.selectedProjectId.value='p-pump-002';U.clearDemoActingUserId();await r.push('/workbench')
 })
 await p.getByPlaceholder('请输入流程名称').waitFor()
 await p.evaluate(async()=>{
  const S=await import('/src/composables/useMobileRectification.js'),PC=await import('/src/mock/personalCenter.js')
  for(const id of ['inspection-example-quality-a-review','inspection-example-other-review']){
   const result=S.assignInspectionWorkflowStep(id,'review','insp-005',0)
   if(!result.ok)throw Error(result.message)
  }
  // 同时验证热更新遗漏投影时可以恢复：源记录保留，移除未指派的整改演示待办。
  const index=PC.personalTodoStore.todos.findIndex(x=>x.rectifyId==='inspection-example-quality-a-rectify')
  if(index>=0)PC.personalTodoStore.todos.splice(index,1)
 })
 for(const word of ['复查','复核']){
  await p.getByPlaceholder('请输入流程名称').fill(word)
  await p.getByRole('button',{name:'搜索',exact:true}).click()
  const text=await p.locator('.el-table__body').innerText()
  assert.ok(text.includes('A级质量问题监理复查'))
  assert.ok(text.includes('其他问题监理复核'))
 }
 await p.getByPlaceholder('请输入流程名称').fill('A级质量问题施工方整改')
 await p.getByRole('button',{name:'搜索',exact:true}).click()
 await p.locator('.el-table__body tr').filter({hasText:'A级质量问题施工方整改'}).getByRole('button',{name:'处理',exact:true}).click()
 await p.locator('.inspection-stage-banner').waitFor()
 assert.equal(await p.locator('.block--action').count(),1)
 assert.deepEqual(errors,[])
 console.log('PASS 2号雨水泵站工作台：无须刷新，质量A及其他复查指派后搜索即补齐；复查/复核均能查到；遗漏整改待办恢复且可办理')
}finally{await b.close();await s.close()}
