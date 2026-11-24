import assert from 'node:assert/strict'
import { createServer } from 'vite'
import { chromium } from 'playwright'

const server = await createServer({ configLoader: 'native', logLevel: 'error', server: { host: '127.0.0.1', port: 0, open: false } })
await server.listen()
const browser = await chromium.launch({ headless: true, channel: 'msedge' })
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1030 } })
  page.setDefaultTimeout(15000)
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto(server.resolvedUrls.local[0])
  const ids = await page.evaluate(async () => {
    const tasks = await import('/src/mock/mobileInspectionTasks.js')
    const workflows = await import('/src/composables/useMobileRectification.js')
    const { selectedProjectId } = await import('/src/composables/useCurrentProject.js')
    const users = await import('/src/mock/currentUser.js')
    const { currentWorkflowStep } = await import('/src/utils/inspectionRectificationWorkflow.js')
    const { default: router } = await import('/src/router/index.js')
    selectedProjectId.value = 'p-000'
    const hazard = { rectifyId: 'void-smoke-record', rectifyNo: 'ZG-VOID-SMOKE', hazardCategory: '临边洞口', hazardLevel: 'Ⅲ一般隐患', desc: '作废审批回归测试', photos: ['隐患.jpg'] }
    const sibling = { ...hazard, rectifyId: 'void-smoke-sibling', rectifyNo: 'ZG-VOID-SIBLING' }
    const task = tasks.addMobileInspectionTask({ id: 'void-smoke-task', taskNo: 'AQXJ-VOID-SMOKE', taskName: '作废关联巡检单', projectId: 'p-000', project_id: 'p-000', project: '飞行区跑道延长工程', status: '已完成', result: 'hazard', inspectionCategory: '安全', hazardItems: [hazard, sibling] })
    workflows.createMobileRectificationsFromTask(task, task.hazardItems)
    if (workflows.requestInspectionVoid(hazard.rectifyId, ' ')) throw Error('空原因通过')
    users.setDemoActingUserId('insp-005')
    if (workflows.requestInspectionVoid(hazard.rectifyId, '非下发人')) throw Error('非下发人可申请')
    users.clearDemoActingUserId()
    const submit = (key, pass) => workflows.submitInspectionWorkflowStep(hazard.rectifyId, key, pass, { comment: '核验', rectificationPhotos: ['整改.jpg'] })
    if (!submit('rectify', true) || !workflows.requestInspectionVoid(hazard.rectifyId, '第一次申请') || submit('review', true)) throw Error('未暂停原复核')
    if (submit('voidApproval', true)) throw Error('项目人员能够审批作废')
    selectedProjectId.value = 'hq'
    if (!submit('voidApproval', false) || currentWorkflowStep(workflows.getMobileRectification(hazard.rectifyId))?.key !== 'review') throw Error('作废审批不通过未恢复原节点')
    selectedProjectId.value = 'p-000'
    await router.push('/personal-center?tab=started')
    return { record: hazard.rectifyId, rectifyNo: hazard.rectifyNo }
  })
  const startedRow = page.locator('.el-table__body-wrapper tr').filter({ hasText: '作废审批回归测试' })
  await page.getByPlaceholder('请输入流程名称').fill(ids.rectifyNo)
  await page.getByRole('button', { name: '搜索', exact: true }).click()
  await startedRow.getByRole('button', { name: '作废', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('button', { name: '提交申请', exact: true }).click()
  await dialog.getByText('请填写作废理由', { exact: true }).waitFor()
  await dialog.getByPlaceholder('请填写作废理由').fill('整改单重复登记，应作废')
  await dialog.getByRole('button', { name: '提交申请', exact: true }).click()
  await startedRow.getByText('作废审批中', { exact: true }).waitFor()
  await page.evaluate(async id => {
    const { getMobileRectification } = await import('/src/composables/useMobileRectification.js')
    const { selectedProjectId } = await import('/src/composables/useCurrentProject.js')
    const { personalTodoStore } = await import('/src/mock/personalCenter.js')
    const { listMobileInspectionTasks } = await import('/src/mock/mobileInspectionTasks.js')
    const { listInspectionHazards } = await import('/src/mock/inspectionHazardQuery.js')
    if (!listMobileInspectionTasks().some(task => task.id === 'void-smoke-task') || !listInspectionHazards().some(row => row.id === id)) throw Error('审批前移出台账')
    selectedProjectId.value = 'hq'
    const approverTodo = personalTodoStore.todos.find(row => row.rectifyId === id && row.expectedWorkflowStage === 'voidApproval')
    if (!approverTodo || !getMobileRectification(id).voidRequest || !approverTodo.assignee.includes('指挥部安全和整改负责人')) throw Error('没有生成审批待办')
    const { default: router } = await import('/src/router/index.js')
    await router.push({ path: '/personal-center/todo/handle', query: { id: approverTodo.id, from: 'todo' } })
  }, ids.record)
  await page.getByText('整改单重复登记，应作废', { exact: true }).first().waitFor()
  await page.getByRole('textbox', { name: '请填写作废审批意见' }).fill('重复单据，同意作废')
  await page.getByRole('button', { name: '提交', exact: true }).click()
  await page.evaluate(async id => {
    const { getMobileRectification } = await import('/src/composables/useMobileRectification.js')
    const { personalStarted, personalTodoStore } = await import('/src/mock/personalCenter.js')
    const { selectedProjectId } = await import('/src/composables/useCurrentProject.js')
    const { getMobileInspectionTask, listMobileInspectionTasks } = await import('/src/mock/mobileInspectionTasks.js')
    const { listInspectionHazards } = await import('/src/mock/inspectionHazardQuery.js')
    if (getMobileRectification(id).status !== '已作废') throw Error('整改单状态错误')
    if (personalTodoStore.todos.some(row => row.rectifyId === id)) throw Error('作废后待办未撤销')
    if (!getMobileInspectionTask('void-smoke-task') || listMobileInspectionTasks().some(task => task.id === 'void-smoke-task')) throw Error('巡检单未正确移出台账或丢失存档')
    const hazards = listInspectionHazards()
    if (hazards.some(row => row.id === id) || !hazards.some(row => row.id === 'void-smoke-sibling')) throw Error('作废影响同一次巡检关联的其他整改单')
    const started = personalStarted.find(row => row.rectifyId === id)
    if (started?.status !== '已作废') throw Error('发起记录未更新')
    selectedProjectId.value = 'p-000'
    const { default: router } = await import('/src/router/index.js')
    await router.push({ path: '/personal-center', query: { tab: 'started' } })
  }, ids.record)
  await startedRow.getByText('已作废', { exact: true }).waitFor()
  assert.equal(await startedRow.getByRole('button', { name: '作废', exact: true }).count(), 0)
  await startedRow.getByRole('button', { name: '详情', exact: true }).click()
  await page.getByText('重复单据，同意作废', { exact: true }).first().waitFor()
  assert.equal(await page.getByRole('button', { name: '提交', exact: true }).count(), 0)
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.getByText('整改单重复登记，应作废', { exact: true }).first().waitFor()
  assert.deepEqual(errors, [])
  console.log('PASS 发起人申请、指挥部审批、拒绝恢复、通过移出台账、我的发起保留只读记录和刷新持久化')
} finally {
  await browser.close()
  await server.close()
}
