import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { chromium } from 'playwright'
import { createServer } from 'vite'
import { read, utils } from 'xlsx'
import JSZip from 'jszip'

const server = await createServer({ configLoader: 'native', logLevel: 'error', server: { host: '127.0.0.1', port: 0 } })
await server.listen()
const browser = await chromium.launch({ headless: true, channel: 'msedge' })
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 980 } })
  page.setDefaultTimeout(12000)
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto(server.resolvedUrls.local[0])
  const fixture = await page.evaluate(async () => {
    const { selectedProjectId } = await import('/src/composables/useCurrentProject.js')
    const { addMobileInspectionTask } = await import('/src/mock/mobileInspectionTasks.js')
    const { checkCategoryTree } = await import('/src/composables/useInspectionPlan.js')
    const {
      createMobileRectificationsFromTask, getMobileRectification, submitInspectionWorkflowStep,
    } = await import('/src/composables/useMobileRectification.js')
    selectedProjectId.value = 'p-000'
    const imageUrl = document.createElement('canvas').toDataURL('image/png')
    const image = name => ({ name, url: imageUrl })
    const hazardItems = [
      { rectifyId: 'export-order-a', rectifyNo: 'EXPORT-ORDER-A', desc: '第一条隐患说明', photos: [image('隐患甲.png')], rectifyRequirement: '及时修复防护栏', hazardCategory: '临边洞口', hazardLevel: 'Ⅲ一般隐患', rectifyDeadline: '2026-08-02', hasRectify: true, issueCcPersons: '张工、刘工', completionCcPersons: '王工' },
      { rectifyId: 'export-order-b', rectifyNo: 'EXPORT-ORDER-B', desc: '第二条隐患说明', photos: [image('隐患乙.png')], hazardCategory: '施工用电', hazardLevel: 'Ⅲ一般隐患', hasRectify: true },
    ]
    const checkGroup = checkCategoryTree.find(group => group.inspectionCategory === '安全' && group.items.length)
    const task = addMobileInspectionTask({
      id: 'export-full-task', taskNo: 'EXPORT-FULL-TASK', taskName: '巡检详情导出测试', projectId: 'p-000', project: '飞行区跑道延长工程',
      source: '任务下发', inspectionCategory: '安全', deadline: '2026-08-02', inspectionDate: '2026-07-28',
      submittedAt: '2026-07-28 10:00:00', inspector: '巡检测试员', executor: '巡检测试员', companions: ['同行甲', '同行乙'],
      status: '已完成', result: 'hazard', normalPhotos: [image('巡检现场.png')], hazardItems, hasRectify: true,
      processRemark: '现场检查过程说明', isMajorHazardPatrol: '是', majorHazardProjectName: '实际巡视项目示例', majorHazardName: '危大工程示例',
      checkConfig: [{ categoryId: checkGroup.id, itemIds: [checkGroup.items[0].id] }],
    })
    const relatedTask = {
      projectId: task.projectId, project: task.project, source: task.source,
      inspectionCategory: task.inspectionCategory, inspectionDate: task.inspectionDate,
      inspector: task.inspector, status: '已完成',
    }
    addMobileInspectionTask({ ...relatedTask, taskNo: 'EXPORT-NO-HAZARD', result: 'normal', hazardItems: [] })
    addMobileInspectionTask({ ...relatedTask, taskNo: 'EXPORT-SINGLE-HAZARD', result: 'hazard', hazardItems: [
      { desc: '唯一一条隐患', hazardCategory: '临边洞口', hazardLevel: 'Ⅲ一般隐患', photos: ['未关联隐患.jpg'] },
    ] })
    createMobileRectificationsFromTask(task, hazardItems)
    createMobileRectificationsFromTask({ ...task, requiresManagerConfirmation: true }, [{
      ...hazardItems[1], rectifyId: 'export-order-pending', rectifyNo: 'EXPORT-ORDER-PENDING', photos: ['未下发隐患.jpg'],
    }])
    const step = (name, pass, comment, photos = []) => {
      const ok = submitInspectionWorkflowStep('export-order-a', name, pass, { date: '2026-07-29', comment, rectificationPhotos: photos })
      if (!ok) throw Error('测试任务未转入 ' + name)
    }
    step('rectify', true, '第一次整改说明', [image('首次整改.png')])
    getMobileRectification('export-order-a').workflowHistory.push({
      stage: 'review', type: 'assignment', label: '监理单位复核', from: '李工', to: '黄工', actor: '李工', date: '2026-07-29 10:00:00',
    })
    step('review', false, '第一次退回意见')
    step('rectify', true, '第二次整改说明', [image('再次整改.png')])
    step('review', true, '复查通过意见')
    step('approval', true, '审批通过并关闭')
    createMobileRectificationsFromTask({ ...task, inspectionCategory: '质量', inspectionCategories: ['质量'] }, [{
      ...hazardItems[0], rectifyId: 'export-quality-a', rectifyNo: 'EXPORT-QUALITY-A', hazardLevel: 'A', hazardCategory: '结构实体质量',
    }])
    for (const [stage, note] of [
      ['rectify', '实体整改说明'], ['contractorAcceptance', '施工单位验收意见示例'],
      ['review', '监理单位复查示例'], ['directorAcceptance', '监理单位总监验收意见示例'],
      ['approval', '指挥部经理验收意见示例'],
    ]) {
      const ok = submitInspectionWorkflowStep('export-quality-a', stage, true, {
        date: '2026-07-30', comment: note, rectificationPhotos: [image('实体整改.png')],
      })
      if (!ok) throw Error('质量 A 级未转入 ' + stage)
    }
    return { checkLabel: checkGroup.items[0].label }
  })

  async function download(path, name, dateBasis) {
    await page.evaluate(async target => {
      const { default: router } = await import('/src/router/index.js')
      await router.push(target)
    }, path)
    await page.getByRole('button', { name: '导出', exact: true }).click()
    const dialog = page.getByRole('dialog', { name: '导出' + name })
    if (dateBasis) {
      await dialog.getByRole('combobox', { name: '日期依据', exact: true }).press('ArrowDown')
      await page.getByRole('option', { name: dateBasis, exact: true }).click()
    }
    await dialog.getByPlaceholder('开始日期').fill('2026-07-28')
    await dialog.getByPlaceholder('结束日期').fill('2026-07-28')
    await dialog.getByPlaceholder('结束日期').press('Tab')
    const delivered = page.waitForEvent('download')
    await dialog.getByRole('button', { name: '导出 Excel', exact: true }).click()
    const file = await delivered
    assert.match(file.suggestedFilename(), /\.zip$/)
    const archive = await JSZip.loadAsync(await readFile(await file.path()))
    const [workbookEntry] = archive.file(/\.xlsx$/)
    const bookFile = await workbookEntry.async('nodebuffer')
    const book = read(bookFile)
    const sheet = book.Sheets[name]
    const rows = utils.sheet_to_json(sheet, { defval: '' })
    const style = await (await JSZip.loadAsync(bookFile)).file('xl/styles.xml').async('string')
    assert.match(style, /wrapText="1"/)
    if (name === '隐患清单台账') assert.match(style, /<name val="宋体"\/>/)
    return { archive, sheet, rows }
  }

  const tasks = await download('/safety-inspection/task', '巡检任务台账')
  const taskIndex = tasks.rows.findIndex(row => row['任务单编号'] === 'EXPORT-FULL-TASK')
  assert.ok(taskIndex >= 0)
  const [task, continuation] = tasks.rows.slice(taskIndex, taskIndex + 2)
  const [headers] = utils.sheet_to_json(tasks.sheet, { header: 1 })
  for (const removed of ['巡检人', '实际巡视项目', '提交时间', '巡检说明', '是否逾期']) {
    assert.ok(!headers.includes(removed), removed)
  }
  const commonColumnCount = headers.indexOf('隐患序号')
  assert.ok(commonColumnCount > 0)
  const taskRow = taskIndex + 1
  const taskMerges = tasks.sheet['!merges'].filter(({ s }) => s.r === taskRow)
  assert.deepEqual(taskMerges, Array.from({ length: commonColumnCount }, (_, c) => ({
    s: { r: taskRow, c }, e: { r: taskRow + 1, c },
  })))
  for (const name of headers.slice(0, commonColumnCount)) assert.equal(continuation[name], '')
  assert.equal(task['同行人'], '同行甲、同行乙')
  assert.equal(task['执行人'], '巡检测试员')
  assert.equal(task['检查项数量'], 1)
  assert.ok(task['检查项明细'].includes(fixture.checkLabel))
  assert.equal(task['危大工程名称'], '危大工程示例')
  assert.equal(task['隐患序号'], 1)
  assert.equal(task['隐患类别'], '临边洞口')
  assert.equal(task['隐患等级'], 'Ⅲ一般隐患')
  assert.equal(task['隐患说明'], '第一条隐患说明')
  assert.equal(task['整改要求'], '及时修复防护栏')
  assert.equal(task['整改截止日期'], '2026-08-02')
  assert.equal(task['下发整改单抄送人'], '张工、刘工')
  assert.equal(task['整改单完成抄送人'], '王工')
  assert.equal(continuation['隐患序号'], 2)
  assert.equal(continuation['隐患说明'], '第二条隐患说明')
  assert.equal(task['关联整改单编号'], 'EXPORT-ORDER-A')
  assert.equal(task['关联整改单状态'], '已关闭')
  assert.equal(continuation['关联整改单编号'], 'EXPORT-ORDER-B')
  assert.ok(tasks.archive.file(task['巡检照片']))
  assert.match(task['隐患照片'], /隐患甲\.png$/)
  assert.match(continuation['隐患照片'], /隐患乙\.png$/)
  assert.ok(tasks.archive.file(task['隐患照片']))
  assert.ok(tasks.archive.file(continuation['隐患照片']))
  for (const [number, description] of [['EXPORT-NO-HAZARD', ''], ['EXPORT-SINGLE-HAZARD', '唯一一条隐患']]) {
    const index = tasks.rows.findIndex(row => row['任务单编号'] === number)
    assert.ok(index >= 0, number)
    assert.equal(tasks.rows[index]['隐患说明'], description)
    assert.ok(tasks.sheet['!merges'].every(({ s, e }) => index + 1 < s.r || index + 1 > e.r))
  }

  const orders = await download('/safety-inspection/hazard', '隐患清单台账', '隐患登记日期')
  const [orderHeaders] = utils.sheet_to_json(orders.sheet, { header: 1 })
  assert.deepEqual(orderHeaders, [
    '整改单编号', '巡检任务单编号', '项目名称', '巡检分类', '巡检人', '整改单下发日期', '整改人', '复查人',
    '状态', '当前流程节点', '截止日期', '关闭日期', '隐患类别', '隐患等级', '整改要求', '隐患说明', '隐患照片',
    '整改日期', '整改说明', '整改照片', '复查日期', '复查结果', '复查意见', '审批人', '审批状态', '审批日期', '审批意见',
  ])
  assert.equal(orders.sheet['!merges'], undefined)
  const full = orders.rows.filter(row => row['整改单编号'] === 'EXPORT-ORDER-A')
  assert.equal(full.length, 1)
  const [order] = full
  assert.equal(order['当前流程节点'], '流程结束')
  assert.equal(order['整改说明'], '第二次整改说明')
  assert.equal(order['复查意见'], '复查通过意见')
  assert.equal(order['审批意见'], '审批通过并关闭')
  assert.equal(order['整改单下发日期'], '2026-07-28')
  assert.ok(orders.archive.file(order['隐患照片']))
  assert.ok(orders.archive.file(order['整改照片']))
  assert.equal(orders.archive.file(/再次整改\.png$/).length, 1)
  assert.equal(orders.archive.file(/首次整改\.png$/).length, 0)
  assert.ok(orders.rows.some(row => row['整改单编号'] === 'EXPORT-ORDER-PENDING' && !row['整改单下发日期']))
  const quality = orders.rows.find(row => row['整改单编号'] === 'EXPORT-QUALITY-A')
  assert.equal(quality['审批意见'], '指挥部经理验收意见示例')
  assert.equal(quality['审批日期'], '2026-07-30')

  for (const [path, node] of [
    ['/safety-inspection/hazard/export-order-a', '流程结束'],
    ['/mobile/rectify/export-order-a', '流程结束'],
    ['/safety-inspection/hazard/export-order-pending', '指挥部项目经理确认'],
    ['/mobile/rectify/export-order-pending', '指挥部项目经理确认'],
  ]) {
    await page.evaluate(async target => {
      const { default: router } = await import('/src/router/index.js')
      await router.push(target)
    }, path)
    const scope = page.locator(path.startsWith('/mobile') ? '.rectify-basic-info .field' : '.ic')
    await scope.filter({ hasText: '当前流程节点' }).getByText(node, { exact: true }).waitFor()
  }
  assert.deepEqual(errors, [])
  console.log('PASS 巡检单逐条隐患和详情列，整改单 27 列模板与照片，Web 和移动端详情节点')
} finally {
  await browser.close()
  await server.close()
}
