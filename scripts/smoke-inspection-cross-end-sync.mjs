import assert from 'node:assert/strict'
import { createServer } from 'vite'
import { chromium } from 'playwright'
const server = await createServer({ configLoader: 'native', logLevel: 'error', server: { host: '127.0.0.1', port: 0, open: false } })
await server.listen()
const browser = await chromium.launch({ headless: true, channel: 'msedge' })
try {
 const page = await browser.newPage({ viewport: { width: 1440, height: 1050 } })
 const errors = []; page.on('pageerror', e => errors.push(e.message))
 await page.goto(server.resolvedUrls.local[0])
 const result = await page.evaluate(async () => {
  const P = await import('/src/composables/useInspectionPlan.js')
  const T = await import('/src/mock/mobileInspectionTasks.js')
  const PC = await import('/src/mock/personalCenter.js')
  const S = await import('/src/composables/useMobileRectification.js')
  const W = await import('/src/utils/inspectionRectificationWorkflow.js')
  const H = await import('/src/mock/inspectionHazardQuery.js')
  const C = await import('/src/composables/useInspectionPersonConfig.js')
  const D = await import('/src/config/inspectionManagement.js')
  const { usePersonalTodoSubmit } = await import('/src/views/personalCenter/composables/usePersonalTodoSubmit.js')
  const { ref } = await import('/node_modules/.vite/deps/vue.js')
  const { default: router } = await import('/src/router/index.js')
  const check = (ok, message) => { if (!ok) throw Error(message) }
  function makeTask(name, category = '安全') {
   const { id, planNo, ...template } = P.planData[0]
   P.addPlan({ ...template, name, projects: ['飞行区跑道延长工程'], projectIds: ['p-000'], inspectionCategory: category, inspectionCategories: [category] })
   const task = T.mobileInspectionTasks.find(x => x.taskName === name)
   check(!!task, '任务未生成')
   const todo = PC.personalTodoStore.todos.find(x => x.inspectionTaskId === task.id)
   check(!!todo, '未生成个人待办')
   return { task, todo }
  }
  const first = makeTask('核查WEB全部正常')
  const submit = ({todo}, form) => usePersonalTodoSubmit({ todo: ref(todo), todoId: ref(todo.id), goBack: () => {} }).submitInspectionHandle({ decision: 'pass', remark: '', companions: [], requiresManagerConfirmation: '否', isMajorHazardPatrol: '否', ...form }, { title: '巡检', pass: '完成巡检', reject: '退回' })
  submit(first, { inspectionResult: 'normal', attachments: [{name:'巡检.jpg'}] })
  check(first.task.status === '已完成' && first.task.result === 'normal', 'WEB完成未同步移动端')
  check(!PC.personalTodoStore.todos.some(x => x.inspectionTaskId === first.task.id), 'WEB提交未清理待办')
  check(PC.personalTodoStore.done.filter(x => x.inspectionTaskId === first.task.id).length === 1, '已办不唯一')
  submit(first, { inspectionResult: 'normal', attachments: [{name:'巡检.jpg'}] })
  check(PC.personalTodoStore.done.filter(x => x.inspectionTaskId === first.task.id).length === 1, '过期表单重复办理')
  const mobile = makeTask('核查移动端完成')
  T.updateMobileInspectionTask(mobile.task.id, { status: '已完成', result: 'normal', normalPhotos: ['照片.jpg'], inspDate: '2026-11-17', submittedAt: '2026-11-17 08:12:34' })
  check(!PC.personalTodoStore.todos.some(x => x.inspectionTaskId === mobile.task.id), '移动完成未清理WEB待办')
  check(PC.personalTodoStore.done.some(x => x.inspectionTaskId === mobile.task.id && x.detail.inspectionDate === '2026-11-17'), '移动完成未同步已办资料')
  const categories = [['安全','Ⅲ一般隐患'], ['其他','Ⅲ一般隐患'], ['质量','B'], ['质量','A']]
  for (const [category, grade] of categories) {
   const {task,todo} = makeTask('核查隐患' + category + grade, category)
   const hazard = { hazardCategory: D.getHazardCategoryOptions(category)[0].value, hazardLevel: grade, rectifyRequirement: '按规范整改', desc: '核查隐患', photos: [{name:'隐患.jpg'}], rectifier: '整改甲、整改乙', reviewer: '复核甲、复核乙', rectifyDeadline: '2026-11-20' }
   submit({todo}, { inspectionResult: 'hazard', attachments: [], hazardItems: [hazard, {...hazard}] })
   const rows = S.mobileRectificationRecords.filter(x => x.taskNo === task.taskNo)
   check(rows.length === 2, '每条隐患未各生成一份整改单 ' + category)
   const row = rows[0], issued = W.workflowFlowRecords(row)[0].d
   check(row.rectifier === hazard.rectifier && row.reviewer === hazard.reviewer, '多人丢失')
   const parity = () => {
    check(JSON.stringify(H.getInspectionHazardDetail(row.id).flow) === JSON.stringify(W.workflowFlowRecords(row)), 'WEB移动流程历史不一致')
    check(W.workflowFlowRecords(row)[0].d === issued, '下发时间变化')
    const pending = PC.personalTodoStore.todos.filter(x => x.rectifyId === row.id && x.liveInspectionWorkflow)
    check(pending.length === (W.currentWorkflowStep(row) ? 1 : 0), '节点待办不唯一')
   }
   parity()
   const step = (key, pass = true) => { check(S.submitInspectionWorkflowStep(row.id,key,pass,{date:'2026-11-17',comment:'核查意见',rectificationPhotos:['整改.jpg']}), '节点提交失败 '+key); parity() }
   step('rectify')
   if (grade === 'A') step('contractorAcceptance')
   step('review', false)
   check(PC.personalTodoStore.todos.find(x => x.rectifyId === row.id).approvalFlow.some(x => x.title.includes('不通过')), '个人待办丢失退回历史')
   step('rectify')
   if (grade === 'A') step('contractorAcceptance')
   step('review')
   if (grade === 'A') step('directorAcceptance')
   step('approval',false)
   step('review')
   if (grade === 'A') step('directorAcceptance')
   check(row.status !== '已关闭', '审批前错误关闭')
   step('approval')
   check(row.status === '已关闭', '最终未关闭')
  }
  const cfg = C.getInspectionPersonConfig('p-000')
  C.saveInspectionPersonConfig('p-000',{...cfg,rectifierId:['insp-002','insp-005'],reviewerId:['insp-003','insp-006']})
  const ui = makeTask('核查WEB多人UI')
  await router.push({path:'/personal-center/todo/handle',query:{id:ui.todo.id,from:'todo'}})
  return { todoId: ui.todo.id }
 })
 await page.locator('.inspection-stage-banner').waitFor()
 await page.getByText('有隐患', {exact:true}).click()
 const multi = page.locator('.person-multi-select')
 assert.equal(await multi.count(),4)
 assert.equal(await multi.locator('.el-tag').count(),5)
 assert.deepEqual(errors,[])
 console.log('PASS 计划生成待办；WEB与移动提交双向同步；过期提交拦截；两隐患两单；安全/其他/质量B/A退回再通过；真实时间/历史/节点一致；WEB多人默认带出')
} finally { await browser.close(); await server.close() }
