import assert from 'node:assert/strict'
import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { createServer } from 'vite'
import { chromium } from 'playwright'

const server = await createServer({ configLoader: 'native', logLevel: 'error', server: { host: '127.0.0.1', port: 0, open: false } })
let browser
const legacyKey = 'airport-inspection-person-config-by-category-v2'
const output = resolve(import.meta.dirname, '../../outputs/inspection-workflow-examples')
mkdirSync(output, { recursive: true })
try {
  await server.listen()
  browser = await chromium.launch({ headless: true, channel: 'msedge' })
  const context = await browser.newContext({ viewport: { width: 1440, height: 1050 } })
  const legacy = [
    { projectId: 'p-000', inspectionCategory: '安全', inspectorId: 'insp-001', rectifierId: 'insp-002', reviewerId: 'insp-003', managerId: 'manager-p-000' },
    { projectId: 'p-000', inspectionCategory: '其他', inspectorId: 'insp-004', rectifierId: 'insp-005', reviewerId: 'insp-006', managerId: 'manager-p-000' },
    { projectId: 'p-001', inspectionCategory: '其他', inspectorId: 'insp-004', rectifierId: 'insp-005', reviewerId: 'insp-006', managerId: 'manager-p-001' },
    { projectId: 'p-003', inspectionCategory: '安全', inspectorId: '', rectifierId: 'insp-002', reviewerId: 'insp-003', managerId: 'manager-p-003' },
    { projectId: 'p-003', inspectionCategory: '其他', inspectorId: 'insp-004', rectifierId: 'insp-005', reviewerId: 'insp-006', managerId: 'manager-p-003' },
  ]
  await context.addInitScript(({ key, data }) => {
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(data))
  }, { key: legacyKey, data: legacy })
  const page = await context.newPage(), errors = []
  page.on('pageerror', e => errors.push(e.message))
  await page.goto(server.resolvedUrls.local[0])
  const config = await page.evaluate(async () => {
    const P = await import('/src/composables/useInspectionPersonConfig.js')
    const a = P.getInspectionPersonConfig('p-000', '安全'), b = P.getInspectionPersonConfig('p-000', '其他')
    const checks = { sameObject: a === b, safetyPreferred: a.inspectorId === 'insp-001', otherFallback: P.getInspectionPersonConfig('p-001', '安全').inspectorId === 'insp-004', explicitBlankKept: !P.hasInspectionInspectorConfig('p-003', '其他') }
    const quality = JSON.stringify(P.getInspectionPersonConfig('p-000', '质量'))
    P.saveInspectionPersonConfig('p-000', { ...b, inspectorId: 'insp-007', rectifierId: 'insp-005', projectId: 'p-001', inspectionCategory: '质量' }, '其他')
    checks.canonicalIdentity = a.projectId === 'p-000' && a.inspectionCategory === '安全'
    checks.bidirectional = JSON.stringify(P.getInspectionPersonConfig('p-000', '安全').rectifierId) === JSON.stringify(['insp-005'])
    checks.qualityIndependent = JSON.stringify(P.getInspectionPersonConfig('p-000', '质量')) === quality
    return checks
  })
  assert.ok(Object.values(config).every(Boolean), JSON.stringify(config))
  await page.reload()
  const persisted = await page.evaluate(async () => {
    const P = await import('/src/composables/useInspectionPersonConfig.js')
    return { safety: P.getInspectionPersonConfig('p-000', '安全').inspectorId, other: P.getInspectionPersonConfig('p-000', '其他').inspectorId, groups: P.INSPECTION_PERSON_CONFIG_GROUPS.map(x => x.label) }
  })
  assert.deepEqual(persisted, { safety: 'insp-007', other: 'insp-007', groups: ['安全、其他', '质量'] })
  assert.deepEqual(await page.evaluate(key => JSON.parse(localStorage.getItem(key)), legacyKey), legacy)
  console.log('PASS 安全/其他共用、质量独立、旧配置迁移/空值保护/刷新持久化')
  await page.evaluate(async () => {
    const { selectedProjectId } = await import('/src/composables/useCurrentProject.js')
    selectedProjectId.value = 'p-000'
    const { default: router } = await import('/src/router/index.js')
    await router.push('/safety-inspection/inspector-config')
  })
  await page.locator('.person-config-page').waitFor()
  assert.equal(await page.locator('.person-config-page .el-radio-button').count(), 2)
  await page.screenshot({ path: resolve(output, 'shared-personnel.png'), fullPage: true })
  const examples = await page.evaluate(async () => {
    const S = await import('/src/composables/useMobileRectification.js')
    const W = await import('/src/utils/inspectionRectificationWorkflow.js')
    const PC = await import('/src/mock/personalCenter.js')
    return S.mobileRectificationRecords.filter(x => x.workflowExample && W.currentWorkflowStep(x)).map(row => {
      const step = W.currentWorkflowStep(row), todo = PC.personalTodoStore.todos.find(x => x.rectifyId === row.id && x.liveInspectionWorkflow)
      if (!todo || todo.expectedWorkflowStage !== step.key || todo.inspectionBizType !== step.biz) throw Error('待办节点不一致 ' + row.id)
      if (!row.hazardLevel || !row.rectifyRequirement || !row.inspector || !row.rectifier || !row.reviewer || !row.manager) throw Error('示例字段不完整')
      const steps = W.workflowSteps(row), index = steps.findIndex(x => x.key === step.key)
      if (row.workflowHistory.length !== index || !steps.slice(0, index).every(x => row[x.date] && row[x.note])) throw Error('前序记录不完整')
      if (!S.mobileWorkflowMessages.value.todo.some(x => x.recordId === row.id && x.workflowStage === step.key)) throw Error('缺少移动待办')
      return { id: row.id, todoId: todo.id, stage: step.key, label: step.label, no: row.rectifyNo, count: steps.length, category: row.inspectionCategory, grade: row.hazardLevel }
    })
  })
  assert.equal(examples.length, 8)
  assert.equal(examples.filter(x => x.category === '质量' && x.grade === 'A').length, 5)
  for (const row of examples) {
    await page.evaluate(async ({ todoId }) => { const { default: router } = await import('/src/router/index.js'); await router.push({ path: '/personal-center/todo/handle', query: { id: todoId, from: 'todo' } }) }, row)
    await page.locator('.inspection-stage-banner').waitFor()
    assert.ok((await page.locator('.inspection-stage-banner').innerText()).includes(row.label))
    assert.ok((await page.locator('.page-viewport').innerText()).includes(row.no))
    assert.ok((await page.locator('.block--action .block-title').innerText()).includes(row.label))
    if (['contractorAcceptance', 'directorAcceptance'].includes(row.stage)) {
      await page.locator('.block--action').scrollIntoViewIfNeeded()
      await page.screenshot({ path: resolve(output, `web-${row.stage}.png`), fullPage: true, animations: 'disabled' })
    }
    const action = row.stage === 'rectify' ? 'execute' : row.stage === 'approval' ? 'approval' : 'review'
    await page.evaluate(async ({ id, action }) => { const { default: router } = await import('/src/router/index.js'); await router.push(`/mobile/rectify/${id}/${action}`) }, { ...row, action })
    await page.locator('.page-viewport').waitFor()
    assert.ok((await page.locator('.page-viewport').innerText()).includes(row.no))
    if (action === 'review') assert.equal((await page.locator('.mh .mt').innerText()).trim(), row.label)
    if (['contractorAcceptance', 'directorAcceptance'].includes(row.stage)) {
      await page.locator('.sc.review').scrollIntoViewIfNeeded()
      await page.screenshot({ path: resolve(output, `mobile-${row.stage}.png`), fullPage: true, animations: 'disabled' })
    }
  }
  console.log('PASS 8个待办示例均可打开WEB/移动端详情，A级5节点、其余3节点，前序资料齐全')
  const readonly = await page.evaluate(async () => {
    const PC = await import('/src/mock/personalCenter.js')
    return ['整改', '施工验收', '复查', '总监验收', '审批'].map(type => {
      const done = PC.personalTodoStore.done.find(row => row.detail?.workflowExample && row.inspectionBizType === type)
      if (!done) throw Error('缺少已办示例 ' + type)
      return { id: done.id, no: done.detail.rectifyNo }
    })
  })
  for (const row of readonly) {
    await page.evaluate(async row => { const { default: router } = await import('/src/router/index.js'); await router.push({ path: '/personal-center/todo/handle', query: { id: row.id, from: 'done' } }) }, row)
    await page.locator('.inspection-stage-banner').waitFor()
    assert.equal(await page.locator('.block--action').count(), 0)
    assert.ok((await page.locator('.page-viewport').innerText()).includes(row.no))
  }
  console.log('PASS 五类已办详情均为只读且展示对应处理资料')
  await page.evaluate(async () => { const { default: router } = await import('/src/router/index.js'); await router.push('/personal-center') })
  await page.getByRole('textbox', { name: '请输入流程名称', exact: true }).fill('总监验收')
  await page.getByRole('button', { name: '搜索', exact: true }).click()
  await page.getByRole('button', { name: '处理', exact: true }).first().waitFor()
  assert.ok((await page.locator('.el-table__body-wrapper tbody').innerText()).includes('质量 · A · 监理单位项目总监验收'))
  await page.evaluate(async () => {
    const { selectedProjectId } = await import('/src/composables/useCurrentProject.js')
    const { HQ_PROJECT_OPTION } = await import('/src/config/projectOptions.js')
    selectedProjectId.value = HQ_PROJECT_OPTION.id
  })
  await page.locator('.el-table__empty-text').waitFor()
  await page.getByRole('textbox', { name: '请输入流程名称', exact: true }).fill('指挥部项目经理审批')
  await page.getByRole('button', { name: '搜索', exact: true }).click()
  await page.getByRole('button', { name: '处理', exact: true }).first().waitFor()
  assert.ok((await page.locator('.el-table__body-wrapper tbody').innerText()).includes('指挥部项目经理审批'))
  console.log('PASS 台账可按当前节点搜索，指挥部不展示项目级验收待办而保留最终审批')
  const results = await page.evaluate(async () => {
    const S = await import('/src/composables/useMobileRectification.js')
    const PC = await import('/src/mock/personalCenter.js')
    const W = await import('/src/utils/inspectionRectificationWorkflow.js')
    const id = 'inspection-example-quality-a-rectify', row = S.getMobileRectification(id), stages = []
    while (W.currentWorkflowStep(row)) {
      const step = W.currentWorkflowStep(row)
      if (S.submitInspectionWorkflowStep(id, 'invalid', true, { date: '2026-11-16', comment: '跳级' })) throw Error('允许跳级')
      const todo = PC.personalTodoStore.todos.find(x => x.rectifyId === id && x.liveInspectionWorkflow)
      if (!todo || todo.expectedWorkflowStage !== step.key) throw Error('当前待办未同步')
      S.submitInspectionWorkflowStep(id, step.key, true, { date: '2026-11-16', comment: '通过', rectificationPhotos: ['整改.jpg'] })
      stages.push(step.key)
    }
    return { stages, closed: row.status === '已关闭', noPending: !PC.personalTodoStore.todos.some(x => x.rectifyId === id && x.liveInspectionWorkflow), done: PC.personalTodoStore.done.filter(x => x.rectifyId === id).length }
  })
  assert.deepEqual(results.stages, ['rectify', 'contractorAcceptance', 'review', 'directorAcceptance', 'approval'])
  assert.ok(results.closed && results.noPending && results.done === 5)
  assert.deepEqual(errors, [])
  console.log('PASS 示例可实际办理五节点，待办转已办且最终审批后关闭，浏览器无异常')
} finally { await browser?.close(); await server.close() }
