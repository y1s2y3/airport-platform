import assert from 'node:assert/strict'
import { chromium } from 'playwright'
import { createServer } from 'vite'

const server = await createServer({ configLoader: 'native', logLevel: 'error', server: { host: '127.0.0.1', port: 0 } })
await server.listen()
const browser = await chromium.launch({ headless: true, channel: 'msedge' })
try {
  const context = await browser.newContext()
  const [web, app] = await Promise.all([context.newPage(), context.newPage()])
  const errors = []
  for (const page of [web, app]) {
    page.setDefaultTimeout(12000)
    page.on('pageerror', error => errors.push(error.message))
    await page.goto(server.resolvedUrls.local[0])
  }
  const plan = await web.evaluate(async () => {
    const H = await import('/src/utils/hazardIssueSummary.js')
    const { getSamplingPeople } = await import('/src/mock/samplingPeople.js')
    const projectId = 'p-000'
    const projectKey = H.getCurrentHazardIssueProjectKey(projectId)
    const group = H.getHazardIssueRows().filter(row => row.projectKey === projectKey && row.source === 'inspection' && row.registeredAt)
    const dates = group.map(row => row.registeredAt.slice(0, 10)).sort()
    const [inspector, reviewer] = getSamplingPeople(projectKey)
    if (group.length < 2 || !reviewer) throw Error('测试项目缺少抽检数据')
    const { selectedProjectId } = await import('/src/composables/useCurrentProject.js')
    selectedProjectId.value = projectId
    const { default: router } = await import('/src/router/index.js')
    await router.push('/workbench?tab=notice')
    return { projectId, projectKey, rowId: group[0].id, dates: [dates[0], dates.at(-1)], inspector: inspector.id, reviewer: reviewer.id }
  })
  await app.evaluate(async plan => {
    const { selectedProjectId } = await import('/src/composables/useCurrentProject.js')
    selectedProjectId.value = plan.projectId
    const { loginApp } = await import('/src/mock/appSession.js')
    loginApp({ account: plan.inspector, password: 'demo' })
    const { default: router } = await import('/src/router/index.js')
    await router.push('/app/personal?tab=notice')
  }, plan)
  for (const page of [web, app]) {
    await page.getByText('指挥部下发抽检任务提醒（示例）', { exact: true }).waitFor()
    await page.getByText('抽检人下发全面复查任务提醒（示例）', { exact: true }).waitFor()
  }
  const example = web.locator('.el-table__body tr').filter({ hasText: '指挥部下发抽检任务提醒（示例）' })
  await example.getByRole('button', { name: '详情', exact: true }).click()
  const dialog = web.getByRole('dialog', { name: '指挥部下发抽检任务提醒（示例）' })
  await dialog.getByText(/下发人.*接收人.*任务编号/).waitFor()
  const appExample = app.locator('.message-card').filter({ hasText: '指挥部下发抽检任务提醒（示例）' })
  await appExample.getByText('已读', { exact: true }).waitFor()
  await dialog.getByRole('button', { name: '关闭', exact: true }).last().click()

  const issued = await web.evaluate(async plan => {
    const S = await import('/src/mock/hazardSampling.js')
    const H = await import('/src/utils/hazardIssueSummary.js')
    const { selectedProjectId } = await import('/src/composables/useCurrentProject.js')
    selectedProjectId.value = 'hq'
    const row = H.getHazardIssueRows().find(item => item.id === plan.rowId)
    const input = { result: '不合格', note: '现场防护不合格', dates: plan.dates, percent: 100, assigneeId: plan.inspector }
    const before = S.sampling.value.tasks.length
    S.submitReview(row, 'hq', { ...input, dispatch: false })
    if (S.sampling.value.tasks.length !== before) throw Error('选择不下发时创建了任务')
    const result = S.submitReview(row, 'hq', { ...input, dispatch: true, submissionId: 'notice-hq' })
    S.submitReview(row, 'hq', { ...input, dispatch: true, submissionId: 'notice-hq' })
    if (S.sampling.value.tasks.length !== before + 1) throw Error('重复提交创建了任务')
    return result.task.id
  }, plan)
  const appIssued = app.locator('.message-card').filter({ hasText: issued })
  await appIssued.getByText('指挥部下发抽检任务提醒', { exact: true }).waitFor()
  await appIssued.getByText('未读', { exact: true }).waitFor()
  assert.equal(await appIssued.count(), 1)

  const follow = await web.evaluate(async ({ plan, issued }) => {
    const S = await import('/src/mock/hazardSampling.js')
    const H = await import('/src/utils/hazardIssueSummary.js')
    const N = await import('/src/mock/hazardSamplingNotices.js')
    const { selectedProjectId } = await import('/src/composables/useCurrentProject.js')
    selectedProjectId.value = plan.projectId
    S.projectSamplingRole.value = 'supervisor'
    const row = H.getHazardIssueRows().find(item => item.id === plan.rowId)
    const result = S.submitReview(row, 'supervisor', { result: '不合格', note: '需要全面复查', dispatch: true, reviewAssigneeId: plan.reviewer }, issued)
    const mine = id => N.listSamplingTaskNotices({ account: id }).filter(item => item.id.endsWith(':' + issued) || item.id.endsWith(':' + result.followTaskCreated.id))
    if (mine(plan.inspector).length !== 1 || !mine(plan.inspector)[0].id.endsWith(issued)) throw Error('抽检人收件错误')
    if (mine(plan.reviewer).length !== 1 || !mine(plan.reviewer)[0].id.endsWith(result.followTaskCreated.id)) throw Error('复查人收件错误')
    S.samplingPersonId.value = plan.reviewer
    return result.followTaskCreated.id
  }, { plan, issued })
  await web.locator('.el-table__body tr').filter({ hasText: follow }).getByText('抽检人下发全面复查任务提醒', { exact: true }).waitFor()
  assert.equal(await app.locator('.message-card').filter({ hasText: follow }).count(), 0)
  await app.evaluate(async plan => {
    const { loginApp } = await import('/src/mock/appSession.js')
    loginApp({ account: plan.reviewer, password: 'demo' })
  }, plan)
  await app.locator('.message-card').filter({ hasText: follow }).getByText('抽检人下发全面复查任务提醒', { exact: true }).waitFor()
  assert.equal(await appIssued.count(), 0)
  assert.deepEqual(errors, [])
  console.log('PASS 双端两条示例、两次下发、跨页通知与已读同步、收件人隔离、重复提交及未下发处理')
} finally {
  await browser.close()
  await server.close()
}
