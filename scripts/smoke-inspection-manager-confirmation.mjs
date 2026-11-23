import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { chromium } from 'playwright'
import { createServer } from 'vite'
import { read, utils } from 'xlsx'

const server = await createServer({ configLoader: 'native', logLevel: 'error', server: { host: '127.0.0.1', port: 0 } })
await server.listen()
const browser = await chromium.launch({ headless: true, channel: 'msedge' })
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 980 } })
  page.setDefaultTimeout(12000)
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto(server.resolvedUrls.local[0])
  const navigate = path => page.evaluate(async target => {
    const { default: router } = await import('/src/router/index.js')
    await router.push(target)
  }, path)

  const examples = await page.evaluate(async () => {
    const { selectedProjectId } = await import('/src/composables/useCurrentProject.js')
    const { personalTodoStore, personalStarted } = await import('/src/mock/personalCenter.js')
    const P = await import('/src/composables/useInspectionPersonConfig.js')
    selectedProjectId.value = 'p-000'
    const cfg = P.getInspectionPersonConfig('p-000')
    if (cfg.issueCcIds[0] !== cfg.managerId || cfg.completionCcIds.length) throw Error('抄送初始配置错误')
    P.saveInspectionPersonConfig('p-000', { ...cfg, completionCcIds: ['insp-002', 'insp-005'] })
    return Object.fromEntries(Object.entries({ todo: personalTodoStore.todos, done: personalTodoStore.done, started: personalStarted }).map(([tab, rows]) =>
      [tab, rows.find(row => row.detail?.managerConfirmationExample && row.inspectionBizType === '项目经理确认')?.id],
    ))
  })
  for (const [tab, id] of Object.entries(examples)) {
    assert.ok(id, tab)
    await navigate({ path: '/personal-center/todo/handle', query: { id, from: tab } })
    await page.locator('.inspection-stage-banner').getByText('项目经理确认', { exact: true }).waitFor()
    assert.equal(await page.locator('.block--action').count(), tab === 'todo' ? 1 : 0)
  }

  await navigate('/safety-inspection/task/create')
  await page.getByText('有隐患', { exact: true }).click()
  const confirmation = page.getByRole('radiogroup', { name: '是否需项目经理确认' })
  assert.equal(await confirmation.getByRole('radio', { name: '是', exact: true }).isChecked(), true)
  assert.equal(await page.locator('.hazard-row').filter({ hasText: '下发整改单抄送人' }).locator('.el-tag').count(), 1)
  assert.equal(await page.locator('.hazard-row').filter({ hasText: '整改单完成抄送人' }).locator('.el-tag').count(), 2)
  await page.getByText('巡检照片（选填）', { exact: true }).waitFor()

  await navigate('/mobile/tasks/create')
  await page.locator('.result-btn.hazard').click()
  assert.equal(await confirmation.getByRole('radio', { name: '是', exact: true }).isChecked(), true)
  await page.getByText('巡检照片（选填）', { exact: true }).waitFor()
  assert.equal(await page.locator('.form-row').filter({ hasText: '整改单完成抄送人' }).locator('.el-tag').count(), 2)

  const switchProject = () => page.evaluate(async () => {
    const { selectedProjectId } = await import('/src/composables/useCurrentProject.js')
    const { HQ_PROJECT_OPTION } = await import('/src/config/projectOptions.js')
    selectedProjectId.value = selectedProjectId.value === HQ_PROJECT_OPTION.id ? 'p-000' : HQ_PROJECT_OPTION.id
  })
  await switchProject()
  assert.equal(await confirmation.getByRole('radio', { name: '是', exact: true }).isChecked(), true)
  await navigate('/safety-inspection/task/create')
  await page.getByText('有隐患', { exact: true }).click()
  assert.equal(await confirmation.getByRole('radio', { name: '是', exact: true }).isChecked(), true)
  await switchProject()

  await page.evaluate(async () => {
    const R = await import('/src/composables/useMobileRectification.js')
    const PC = await import('/src/mock/personalCenter.js')
    const H = await import('/src/mock/inspectionHazardQuery.js')
    const U = await import('/src/mock/currentUser.js')
    const W = await import('/src/utils/inspectionRectificationWorkflow.js')
    const issueCcPersons = '赵工（项目安全负责人）、刘工（专职安全员）'
    const completionCcPersons = '刘工（专职安全员）'
    const task = { id: 'gate-task', taskNo: 'GATE-001', projectId: 'p-000', project: '飞行区跑道延长工程', inspector: '巡检测试人', inspectionCategory: '安全', submittedAt: '2026-07-28 08:05:00', requiresManagerConfirmation: true }
    const hazard = { desc: '机坪临边待核实', hazardCategory: '临边洞口', issueCcPersons, completionCcPersons }
    R.createMobileRectificationsFromTask(task, [
      { ...hazard, rectifyId: 'gate-yes', rectifyNo: 'GATE-YES' },
      { ...hazard, rectifyId: 'gate-no', rectifyNo: 'GATE-NO' },
    ])
    const check = (condition, message) => { if (!condition) throw Error(message) }
    const pending = PC.personalTodoStore.todos.find(row => row.rectifyId === 'gate-yes')
    const ledger = H.getInspectionHazard('gate-yes')
    check(pending.expectedWorkflowStage === 'managerConfirmation' && pending.assignee.includes('指挥部项目经理'), '没有向项目经理投递待办')
    check(ledger.status === '待整改' && ledger.issueDate === '' && ledger.inspector === task.inspector, '待确认台账字段错误')
    check(!PC.personalCc.some(row => row.rectifyId === 'gate-yes'), '整改单提前抄送')
    check(!R.submitInspectionWorkflowStep('gate-yes', 'rectify', true, { date: '2026-07-28', comment: '提前整改', rectificationPhotos: ['整改.jpg'] }), '允许绕过确认')
    U.setDemoActingUserId('insp-002')
    check(!R.submitInspectionWorkflowStep('gate-yes', 'managerConfirmation', true), '非项目经理可确认')
    U.clearDemoActingUserId()
    check(R.submitInspectionWorkflowStep('gate-no', 'managerConfirmation', false), '无法关闭非隐患')
    check(H.getInspectionHazard('gate-no').status === '已关闭' && !PC.personalTodoStore.todos.some(row => row.rectifyId === 'gate-no'), '非隐患仍留在待办')
    check(!PC.personalCc.some(row => row.rectifyId === 'gate-no') && !W.workflowFlowRecords(R.getMobileRectification('gate-no')).some(i => i.a === '下发整改单'), '非隐患错误下发')
    check(R.submitInspectionWorkflowStep('gate-yes', 'managerConfirmation', true), '无法确认隐患')
    check(H.getInspectionHazard('gate-yes').issueDate && PC.personalTodoStore.todos.some(row => row.rectifyId === 'gate-yes' && row.expectedWorkflowStage === 'rectify'), '确认后未下发')
    check(PC.personalCc.filter(row => row.rectifyId === 'gate-yes').length === 2, '下发抄送数量错误')
    for (const step of ['rectify', 'review', 'approval']) {
      check(R.submitInspectionWorkflowStep('gate-yes', step, true, { comment: '核查通过', rectificationPhotos: ['整改.jpg'] }), '确认后未接回原流程 ' + step)
    }
    check(PC.personalCc.filter(row => row.rectifyId === 'gate-yes').length === 3, '完成抄送数量错误')
    check(PC.personalTodoStore.done.some(row => row.rectifyId === 'gate-yes' && row.handleLabel === '确认为隐患'), '确认结果未进入已办')
    R.createMobileRectificationsFromTask({ ...task, requiresManagerConfirmation: false }, [{ ...hazard, issueCcPersons: '', rectifyId: 'gate-skip', rectifyNo: 'GATE-SKIP' }])
    check(H.getInspectionHazard('gate-skip').issueDate === '2026-07-28' && W.currentWorkflowStep(R.getMobileRectification('gate-skip')).key === 'rectify', '选择否未直接下发')
    R.createMobileRectificationsFromTask(
      { ...task, inspector: '巡检测试人乙', requiresManagerConfirmation: false },
      [{ ...hazard, issueCcPersons: '', rectifyId: 'gate-peer', rectifyNo: 'GATE-PEER' }],
    )
  })

  await navigate('/safety-inspection/hazard/rec-001')
  await page.locator('.ic').getByText('整改单下发日期', { exact: true }).waitFor()
  assert.equal(await page.getByText('本单登记时间', { exact: true }).count(), 0)
  await page.getByText('下发整改单', { exact: true }).waitFor()

  await navigate('/safety-inspection/hazard/gate-no')
  await page.getByText('指挥部项目经理确认：非隐患', { exact: true }).waitFor()
  assert.equal(await page.getByText('巡检测试人', { exact: true }).count() > 0, true)
  assert.equal(await page.getByText('项目经理审批', { exact: true }).count(), 0)

  async function selectDateRange(container, start, end) {
    await container.getByPlaceholder(start).fill('2026-07-01')
    await container.getByPlaceholder(end).fill('2026-07-31')
    await container.getByPlaceholder(end).press('Tab')
  }
  async function exportLedger(path, name, requiredColumns) {
    await navigate(path)
    await page.getByRole('button', { name: '导出', exact: true }).click()
    const dialog = page.getByRole('dialog', { name: '导出' + name })
    await selectDateRange(dialog, '开始日期', '结束日期')
    const downloadPromise = page.waitForEvent('download')
    await dialog.getByRole('button', { name: '导出 Excel', exact: true }).click()
    const download = await downloadPromise
    const workbook = read(await readFile(await download.path()))
    const rows = utils.sheet_to_json(workbook.Sheets[name])
    assert.ok(rows.length > 0)
    for (const column of requiredColumns) assert.ok(Object.hasOwn(rows[0], column), column)
    return rows
  }
  await navigate('/safety-inspection/hazard')
  await page.getByRole('combobox', { name: '巡检人', exact: true }).press('ArrowDown')
  await page.getByRole('option', { name: '巡检测试人', exact: true }).click()
  const table = page.locator('.hazard-table')
  await table.getByText('GATE-NO', { exact: true }).waitFor()
  assert.equal(await table.getByText('GATE-PEER', { exact: true }).count(), 0)
  await page.getByRole('option', { name: '巡检测试人乙', exact: true }).click()
  await table.getByText('GATE-PEER', { exact: true }).waitFor()
  assert.equal(await table.getByText('GATE-NO', { exact: true }).count(), 1)
  await page.keyboard.press('Escape')
  await selectDateRange(page.locator('.filter-bar'), '整改单下发开始日期', '整改单下发结束日期')
  await table.getByText('GATE-SKIP', { exact: true }).waitFor()
  assert.equal(await table.getByText('GATE-PEER', { exact: true }).count(), 1)
  assert.equal(await table.getByText('GATE-NO', { exact: true }).count(), 0)
  await page.getByRole('button', { name: '重置', exact: true }).click()
  await table.getByText('GATE-NO', { exact: true }).waitFor()

  const hazard = await exportLedger('/safety-inspection/hazard', '隐患清单台账', ['巡检人', '整改单下发日期'])
  assert.ok(hazard.some(row => row['整改单编号'] === 'GATE-SKIP'))
  assert.ok(!hazard.some(row => row['整改单编号'] === 'GATE-NO'))
  assert.ok(hazard.every(row => row['整改单下发日期'].startsWith('2026-07-')))
  const tasks = await exportLedger('/safety-inspection/task', '巡检任务台账', ['任务单编号', '巡检日期', '任务截止日期'])
  assert.ok(tasks.every(row => row['巡检日期'].startsWith('2026-07-')))
  assert.deepEqual(errors, [])
  console.log('PASS 项目级和指挥部级双端默认是、确认流转、抄送和台账导出')
} finally {
  await browser.close()
  await server.close()
}
