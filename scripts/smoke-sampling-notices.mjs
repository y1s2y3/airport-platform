import assert from 'node:assert/strict'
import { chromium } from 'playwright'
import { createServer } from 'vite'
import { SHOW_HAZARD_SAMPLING } from '../src/config/hazardSamplingVisibility.js'

async function checkHiddenSampling(web, app) {
  await web.getByPlaceholder('请输入消息名称').waitFor()
  await app.getByPlaceholder('搜索通知标题、内容').waitFor()
  assert.equal(await web.getByText('隐患抽检', { exact: true }).count(), 0)
  for (const page of [web, app]) {
    assert.equal(await page.getByText(/下发(?:抽检|全面复查)任务提醒/).count(), 0)
    const notices = await page.evaluate(async () => {
      const { listLaborPersonalNotices, NOTICE_MODULE_OPTIONS } = await import('/src/mock/personalCenter.js')
      const { listSamplingTaskNotices, SAMPLING_NOTICE_MODULE } = await import('/src/mock/hazardSamplingNotices.js')
      return {
        visible: listLaborPersonalNotices().some(notice => notice.module === SAMPLING_NOTICE_MODULE),
        filter: NOTICE_MODULE_OPTIONS.includes(SAMPLING_NOTICE_MODULE),
        original: listSamplingTaskNotices().length,
      }
    })
    assert.equal(notices.visible, false)
    assert.equal(notices.filter, false)
    assert.ok(notices.original > 0)
  }

  const paths = ['/hazard-issues/tasks', '/hazard-issues/sampling', '/hazard-issues/review',
    '/hazard-issues/sampling-task/EX-OLD', '/hazard-issues/sampling/history',
    '/safety-inspection/hazard/rec-001?from=sampling-task']
  for (const project of ['hq', 'p-000']) {
    const urls = await web.evaluate(async ({ paths, project }) => {
      const { default: router } = await import('/src/router/index.js')
      const { selectedProjectId } = await import('/src/composables/useCurrentProject.js')
      const { flattenMenuLeaves, menuTree } = await import('/src/config/menu.js')
      const leaves = flattenMenuLeaves(menuTree)
      if (leaves.some(item => item.key.startsWith('hazard-sampling-'))) throw new Error('抽检入口仍出现在菜单中')
      selectedProjectId.value = project
      const urls = []
      for (const path of paths) {
        await router.push(path)
        urls.push(router.currentRoute.value.fullPath)
      }
      return urls
    }, { paths, project })
    assert.deepEqual(urls, paths.map(() => '/hazard-issues/summary'))
    await web.getByRole('columnheader', { name: '整改状态', exact: true }).first().waitFor()
    assert.equal(await web.getByText('抽查结果', { exact: true }).count(), 0)
    assert.equal(await web.locator('.sampling-status-filter').count(), 0)
  }

  await web.evaluate(async () => {
    const { default: router } = await import('/src/router/index.js')
    await router.push('/safety-inspection/hazard/rec-001')
  })
  await web.getByText('隐患信息', { exact: true }).waitFor()
  await web.getByText('流程记录', { exact: true }).waitFor()
  assert.equal(await web.getByText(/抽查记录|隐患抽检/).count(), 0)

  await web.evaluate(async () => {
    const { WEEKLY_SECTION_ORDER } = await import('/src/mock/weeklyReport.js')
    if (WEEKLY_SECTION_ORDER.includes('cocSampling') || !WEEKLY_SECTION_ORDER.includes('cocHazard')) {
      throw new Error('周报的抽检章节隐藏或调度隐患章节保留失败')
    }
    const { default: router } = await import('/src/router/index.js')
    await router.push('/screen-style')
  })
  const screen = web.locator('.screen-style-app')
  await screen.getByText('巡检隐患闭环', { exact: true }).waitFor()
  assert.equal(await screen.getByText(/抽检|全面复查/).count(), 0)

  await web.evaluate(async () => {
    const { default: router } = await import('/src/router/index.js')
    await router.push('/coc?view=dispatch')
  })
  const dispatch = web.locator('.hazard-side-panel')
  await dispatch.getByRole('columnheader', { name: '整改状态', exact: true }).waitFor()
  assert.equal(await dispatch.getByText('抽查结果', { exact: true }).count(), 0)
  await dispatch.getByRole('button', { name: '更多', exact: true }).click()
  await web.locator('.more-dialog-toolbar').getByPlaceholder('编号／隐患内容').waitFor()
  assert.equal(await web.locator('.more-table').getByText('抽查结果', { exact: true }).count(), 0)
}

async function checkVisibleSampling(web, app, plan) {
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
}

const server = await createServer({ configLoader: 'native', logLevel: 'error', server: { host: '127.0.0.1', port: 0 } })
await server.listen()
const browser = await chromium.launch({ headless: true, channel: 'msedge' })
try {
  const context = await browser.newContext()
  if (!SHOW_HAZARD_SAMPLING) {
    await context.addInitScript(() => sessionStorage.setItem('airport-personal-center-filters:/workbench',
      JSON.stringify({ notice: { noticeModule: '隐患抽检' } })))
  }
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
  if (SHOW_HAZARD_SAMPLING) {
    await checkVisibleSampling(web, app, plan)
  } else {
    await checkHiddenSampling(web, app)
  }
  assert.deepEqual(errors, [])
  console.log('PASS 隐患抽检通知和可见性检查')
} finally {
  await browser.close()
  await server.close()
}
