import assert from 'node:assert/strict'
import { createServer } from 'vite'
import { chromium } from 'playwright'
const server = await createServer({ configLoader:'native', logLevel:'error', server:{ host:'127.0.0.1',port:0,open:false } })
let browser
try {
 await server.listen()
 browser = await chromium.launch({ headless:true, channel:'msedge' })
 const page = await browser.newPage({viewport:{width:1440,height:1000}}), errors=[]
 page.on('pageerror', e=>errors.push(e.message))
 await page.goto(server.resolvedUrls.local[0]+'#/safety-inspection/check-items')
 const result=await page.evaluate(async()=>{
  const D=await import('/src/config/inspectionManagement.js')
  const P=await import('/src/composables/useInspectionPersonConfig.js')
  const S=await import('/src/composables/useMobileRectification.js')
  const W=await import('/src/utils/inspectionRectificationWorkflow.js')
  const PC=await import('/src/mock/personalCenter.js')
  const Q=await import('/src/mock/inspectionHazardQuery.js')
  const original=P.getProjectRectifierLabel('p-000','安全')
  const cfg=P.getInspectionPersonConfig('p-000','质量')
  P.saveInspectionPersonConfig('p-000',{...cfg,rectifierId:'quality-rectifier'},'质量')
  const isolation=P.getProjectRectifierLabel('p-000','安全')===original&&P.getProjectRectifierLabel('p-000','质量')!==original
  function create(id,category,grade){S.createMobileRectificationsFromTask({id,taskNo:id,inspectionCategory:category,inspectionCategories:[category],projectId:'p-000',project:'测试项目'},[{rectifyId:id,rectifyNo:id,desc:'流程测试',hazardLevel:grade,hazardCategory:category==='质量'?'材料质量':'安全管理',rectifyRequirement:'按要求整改',rectifyDeadline:'2026-12-31',photos:['隐患.jpg']}]);return S.getMobileRectification(id)}
  const outcomes=[]
  for(const [category,grade] of [['安全','Ⅰ重大隐患'],['其他','Ⅲ一般隐患'],['质量','B'],['质量','C'],['质量','A']]){
    const row=create('smoke-'+category+grade,category,grade),stages=[]
    const skipRejected=!S.submitManagerApproval(row.id,true,{approvalComment:'跳级'})
    while(W.currentWorkflowStep(row)){
      const stage=W.currentWorkflowStep(row).key;stages.push(stage)
      if(!S.submitInspectionWorkflowStep(row.id,stage,true,{date:'2026-11-16',comment:'同意',rectificationPhotos:['整改.jpg']}))throw Error('提交失败'+stage)
    }
    outcomes.push({category,grade,stages,skipRejected,closed:row.status==='已关闭',snapshot:row.manager})
  }
  const row=create('smoke-A-return','质量','A')
  const submit=(stage,pass=true)=>S.submitInspectionWorkflowStep(row.id,stage,pass,{date:'2026-11-16',comment:'检查意见',rectificationPhotos:['整改.jpg']})
  submit('rectify');submit('contractorAcceptance',false)
  const contractorReturn=row.status==='待整改'
  submit('rectify');submit('contractorAcceptance');submit('review');submit('directorAcceptance',false)
  const directorReturn=row.status==='待验收'
  submit('review');submit('directorAcceptance');submit('approval',false)
  const finalReturn=row.status==='待验收'&&!row.directorAcceptanceResult&&!row.reviewResult
  const pending=PC.personalTodoStore.todos.find(item=>item.rectifyId===row.id)
  const webFlow=Q.getInspectionHazardDetail(row.id).flow.map(item=>item.a)
  const { usePersonalTodoSubmit } = await import('/src/views/personalCenter/composables/usePersonalTodoSubmit.js')
  const handler = usePersonalTodoSubmit({ todo:{value:pending}, todoId:{value:pending.id}, goBack:()=>{} })
  handler.submitInspectionHandle({processDate:'2026-11-16',remark:'WEB复核通过',attachments:[],decision:'pass'}, {title:'监理复核',remarkLabel:'复核意见',pass:'通过',reject:'不通过'})
  const pcTransition = row.status === '待验收' && PC.personalTodoStore.todos.some(item=>item.rectifyId===row.id&&item.expectedWorkflowStage==='directorAcceptance')
  submit('directorAcceptance',false)
  return {categories:D.INSPECTION_CATEGORIES,isolation,outcomes,contractorReturn,directorReturn,finalReturn,pcTransition,pendingStage:pending.expectedWorkflowStage,webFlow,detailStages:W.workflowSteps(row).length,rowId:row.id}
 })
 assert.deepEqual(result.categories,['安全','质量','其他']);assert.ok(result.isolation)
 for(const row of result.outcomes){assert.ok(row.closed&&row.skipRejected);assert.equal(row.stages.length,row.grade==='A'?5:3)}
 assert.ok(result.contractorReturn&&result.directorReturn&&result.finalReturn&&result.pcTransition)
 assert.equal(result.pendingStage,'review');assert.equal(result.detailStages,5)
 console.log('PASS 质量人员独立，安全/其他/质量B/C三步、质量A五步，禁止跳级，三个退回分支与个人中心待办同步')
 await page.evaluate(async()=>{const {selectedProjectId}=await import('/src/composables/useCurrentProject.js');selectedProjectId.value='p-000';const {default:router}=await import('/src/router/index.js');await router.push('/safety-inspection/inspector-config')})
 await page.locator('.person-config-page .el-radio-button').filter({hasText:'质量'}).click()
 await page.getByText('施工单位项目经理（A级验收）',{exact:true}).waitFor()
 await page.getByText('监理单位项目总监（A级验收）',{exact:true}).waitFor()
 await page.evaluate(async id=>{const {default:router}=await import('/src/router/index.js');await router.push('/mobile/rectify/'+id+'/review')},result.rowId)
 await page.locator('.mh .mt').getByText('监理单位复核',{exact:true}).waitFor()
 assert.deepEqual(errors,[])
 console.log('PASS 人员配置及移动端详情展示质量A级五节点，浏览器无异常')
} finally {await browser?.close();await server.close()}
