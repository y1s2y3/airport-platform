import assert from 'node:assert/strict'
import { chromium } from 'playwright'
import { createServer } from 'vite'

const server = await createServer({ configLoader: 'native', logLevel: 'error', server: { host: '127.0.0.1', port: 0 } })
await server.listen()
const browser = await chromium.launch({ headless: true, channel: 'msedge' })
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
  const errors = []
  page.setDefaultTimeout(12000)
  page.on('pageerror', error => errors.push(error.message))
  await page.goto(server.resolvedUrls.local[0])
  await page.evaluate(async () => {
    const { selectedProjectId } = await import('/src/composables/useCurrentProject.js')
    selectedProjectId.value = 'p-000'
  })
  const copyRecipients = await page.evaluate(async () => {
    const config = await import('/src/composables/useInspectionPersonConfig.js')
    config.saveInspectionPersonConfig('p-000', {
      ...config.getInspectionPersonConfig('p-000'),
      issueCcIds: ['insp-002', 'insp-005'],
      completionCcIds: ['insp-003'],
    })
    return config.getInspectionCopyDefaults('p-000')
  })
  assert.match(copyRecipients.issueCcPersons, /、/)
  assert.ok(copyRecipients.completionCcPersons)
  assert.notEqual(copyRecipients.issueCcPersons, copyRecipients.completionCcPersons)
  const copyFieldLabels = [
    ['下发整改单抄送人', copyRecipients.issueCcPersons],
    ['整改单完成抄送人', copyRecipients.completionCcPersons],
  ]
  const navigate = path => page.evaluate(async target => {
    const { default: router } = await import('/src/router/index.js')
    await router.push(target)
  }, path)
  const imageData = await page.evaluate(() => document.createElement('canvas').toDataURL('image/png').split(',')[1])
  const photo = {
    name: '现场.png',
    mimeType: 'image/png',
    buffer: Buffer.from(imageData, 'base64'),
  }
  const deadline = '2026-12-05'
  const latestTask = desc => page.evaluate(async description => {
    const { mobileInspectionTasks } = await import('/src/mock/mobileInspectionTasks.js')
    return mobileInspectionTasks.find(task => task.hazardItems?.some(item => item.desc === description))
  }, desc)
  async function pickFirst(label) {
    const select = page.getByRole('combobox', { name: label, exact: true })
    await select.press('ArrowDown')
    const listId = await select.getAttribute('aria-controls')
    await page.locator(`[id="${listId}"]`).getByRole('option').first().click()
  }
  async function assertPhotoGroups(addInspectionPhoto) {
    const inspection = page.getByText('巡检照片', { exact: true }).locator('..').locator('img')
    const hazard = page.getByText('隐患照片', { exact: true }).locator('..').locator('img')
    await hazard.waitFor()
    if (addInspectionPhoto) {
      await inspection.waitFor()
      assert.match(await inspection.getAttribute('src'), /^data:image\/png;/)
      assert.equal(await inspection.evaluate(img => img.decode().then(() => img.naturalWidth)), 300)
    } else {
      assert.equal(await inspection.count(), 0)
    }
    assert.equal(await hazard.evaluate(img => img.decode().then(() => img.naturalWidth)), 300)
  }
  async function assertRectificationDetail(base, id, addInspectionPhoto) {
    await navigate(base + id)
    const photos = page.getByText('巡检照片', { exact: true }).locator('..')
    if (addInspectionPhoto) {
      const image = photos.locator('img')
      await image.waitFor()
      assert.equal(await image.getAttribute('src'), 'data:image/png;base64,' + imageData)
      assert.equal(await image.evaluate(img => img.decode().then(() => img.naturalWidth)), 300)
    } else {
      await photos.getByText('未上传', { exact: true }).waitFor()
      assert.equal(await photos.locator('img').count(), 0)
    }
    for (const [label, recipients] of copyFieldLabels) {
      await page.getByText(label, { exact: true }).locator('..').getByText(recipients, { exact: true }).waitFor()
    }
  }
  async function chooseMobilePhoto(label) {
    const chooser = page.waitForEvent('filechooser')
    await page.getByRole('button', { name: label, exact: true }).click()
    await (await chooser).setFiles(photo)
  }
  const confirmation = page.getByRole('radiogroup', { name: '是否需项目经理确认' })
  async function setConfirmation(needsConfirmation) {
    assert.equal(await confirmation.getByRole('radio', { name: '是', exact: true }).isChecked(), true)
    if (!needsConfirmation) await confirmation.getByText('否', { exact: true }).click()
  }

  for (const isMobile of [false, true]) {
    for (const addInspectionPhoto of [false, true]) {
      const needsConfirmation = !addInspectionPhoto
      const desc = (isMobile ? '移动端' : 'WEB') + (addInspectionPhoto ? '双照片测试' : '选填留空测试')
      await navigate(isMobile ? '/mobile/tasks/create' : '/safety-inspection/task/create')
      const submit = isMobile ? page.getByRole('button', { name: /提交巡检记录/ }) : page.getByRole('button', { name: '提交', exact: true })

      if (isMobile) {
        await page.locator('.form-row').filter({ hasText: '危大工程现场巡视' }).getByRole('button', { name: '否', exact: true }).click()
        if (!addInspectionPhoto) {
          await page.locator('.result-btn.ok').click()
          await submit.click()
          await page.getByText('全部正常时请至少上传一张巡检照片', { exact: true }).last().waitFor()
        }
        await page.locator('.result-btn.hazard').click()
        await setConfirmation(needsConfirmation)
        const hazard = page.locator('.hazard-item-row')
        await hazard.locator('select').nth(0).selectOption({ index: 1 })
        await hazard.locator('select').nth(1).selectOption({ index: 1 })
        await hazard.getByPlaceholder('请描述隐患情况...').fill(desc)
        await hazard.getByPlaceholder('请输入整改要求').fill('补齐现场防护')
        await hazard.locator('input[type=date]').fill(deadline)
        await page.getByText('巡检照片（选填）', { exact: true }).waitFor()
        if (addInspectionPhoto) {
          await chooseMobilePhoto('上传巡检照片')
          await page.locator('.mobile-inspection-photo-upload img[alt="现场.png"]').waitFor()
        }
        await submit.click()
        await page.getByText(/请至少上传一张隐患照片/).last().waitFor()
        await chooseMobilePhoto('上传隐患照片')
      } else {
        if (!addInspectionPhoto) {
          await page.getByText('全部正常', { exact: true }).click()
          await submit.click()
          await page.getByText('全部正常时请至少上传一张巡检照片', { exact: true }).last().waitFor()
        }
        await page.getByText('有隐患', { exact: true }).click()
        await setConfirmation(needsConfirmation)
        await pickFirst('隐患1类别')
        await pickFirst('隐患1等级')
        await page.getByRole('textbox', { name: '隐患1说明', exact: true }).fill(desc)
        await page.getByRole('textbox', { name: '隐患1整改要求', exact: true }).fill('补齐现场防护')
        const input = page.getByPlaceholder('请选择整改截止日期')
        await input.fill(deadline)
        await input.press('Tab')
        const inspectionPhotos = page.locator('.el-form-item').filter({ hasText: '巡检照片（选填）' })
        await inspectionPhotos.getByText('上传巡检照片', { exact: true }).waitFor()
        if (addInspectionPhoto) {
          await inspectionPhotos.locator('input[type=file]').setInputFiles(photo)
          await inspectionPhotos.locator('.thumb-card').waitFor()
        }
        await submit.click()
        await page.getByText(/请至少上传一张隐患照片/).last().waitFor()
        const hazardPhotos = page.locator('.hazard-row').filter({ hasText: '上传隐患照片' })
        await hazardPhotos.locator('input[type=file]').setInputFiles(photo)
        await hazardPhotos.locator('.thumb-card').waitFor()
      }

      await submit.click()
      await page.waitForURL(isMobile ? '**/#/mobile/tasks' : '**/#/safety-inspection/task')
      const task = await latestTask(desc)
      assert.equal(task.requiresManagerConfirmation, needsConfirmation)
      const issued = await page.evaluate(async id => {
        const { getMobileRectification } = await import('/src/composables/useMobileRectification.js')
        const { currentWorkflowStep } = await import('/src/utils/inspectionRectificationWorkflow.js')
        const { personalTodoStore } = await import('/src/mock/personalCenter.js')
        const record = getMobileRectification(id)
        return {
          date: record.issuedAt,
          stage: currentWorkflowStep(record).key,
          todo: personalTodoStore.todos.find(row => row.rectifyId === id)?.expectedWorkflowStage,
        }
      }, task.hazardItems[0].rectifyId)
      const expectedStage = needsConfirmation ? 'managerConfirmation' : 'rectify'
      assert.equal(Boolean(issued.date), !needsConfirmation)
      assert.equal(issued.stage, expectedStage)
      assert.equal(issued.todo, expectedStage)
      assert.equal(task.normalPhotos.length, addInspectionPhoto ? 1 : 0)
      assert.equal(task.hazardItems[0].photos.length, 1)
      await navigate((isMobile ? '/mobile/tasks/' : '/safety-inspection/task/') + task.id)
      const confirmationRow = page.locator(isMobile ? '.sc-row' : '.result-field').filter({ hasText: '是否需项目经理确认' })
      await confirmationRow.getByText(needsConfirmation ? '是' : '否', { exact: true }).waitFor()
      await assertPhotoGroups(addInspectionPhoto)
      await navigate((isMobile ? '/safety-inspection/task/' : '/mobile/tasks/') + task.id)
      await assertPhotoGroups(addInspectionPhoto)
      for (const [label, recipients] of copyFieldLabels) {
        const copyRows = page.locator(isMobile ? '.hazard-item .hazard-desc' : '.rectify-card .sc-row')
        await copyRows.filter({ hasText: label }).filter({ hasText: recipients }).waitFor()
      }
      const rectifyId = task.hazardItems[0].rectifyId
      await assertRectificationDetail('/safety-inspection/hazard/', rectifyId, addInspectionPhoto)
      await assertRectificationDetail('/mobile/rectify/', rectifyId, addInspectionPhoto)
    }
    const detailsBase = isMobile ? '/mobile/tasks/' : '/safety-inspection/task/'
    await navigate(detailsBase + 'mt-002')
    await page.locator(isMobile ? '.sc-row' : '.result-field').filter({ hasText: '是否需项目经理确认' })
      .getByText('未记录', { exact: true }).waitFor()
    await navigate(detailsBase + 'mt-003')
    await page.getByText(/全部正常/).last().waitFor()
    assert.equal(await page.getByText('是否需项目经理确认', { exact: true }).count(), 0)
  }
  const example = await page.evaluate(async () => {
    const { listInspectionHazards } = await import('/src/mock/inspectionHazardQuery.js')
    const row = listInspectionHazards().find(item => item.rectifyNo === 'ZG202608021')
    const { getInspectionTaskForRectification } = await import('/src/mock/mobileInspectionTasks.js')
    return { hazardId: row.id, taskId: getInspectionTaskForRectification(row).id }
  })
  await navigate('/safety-inspection/task/' + example.taskId)
  await page.getByText('巡检照片', { exact: true }).locator('..').getByText('未上传', { exact: true }).waitFor()
  await navigate('/safety-inspection/hazard/' + example.hazardId)
  await page.getByText('巡检照片', { exact: true }).locator('..').getByText('未上传', { exact: true }).waitFor()
  for (const [label] of copyFieldLabels) {
    await page.getByText(label, { exact: true }).locator('..').getByText('未设置', { exact: true }).waitFor()
  }
  await navigate('/mobile/tasks/mt-001/execute')
  await page.locator('.major-hazard-row').getByRole('button', { name: '否', exact: true }).click()
  await page.locator('.result-btn.hazard').click()
  await setConfirmation(false)
  const executionHazard = page.locator('.hazard-area-inner .hazard-card')
  await executionHazard.locator('select').nth(0).selectOption({ index: 1 })
  await executionHazard.locator('select').nth(1).selectOption({ index: 1 })
  await executionHazard.getByPlaceholder('请描述隐患情况...').fill('移动端任务执行双照片')
  await executionHazard.getByPlaceholder('请输入整改要求').fill('完成防护措施')
  await executionHazard.locator('input[type=date]').fill(deadline)
  await chooseMobilePhoto('上传巡检照片')
  await page.locator('.mobile-inspection-photo-upload img[alt="现场.png"]').waitFor()
  await chooseMobilePhoto('上传隐患照片')
  await page.getByRole('button', { name: /提交检查结果/ }).click()
  await page.waitForURL('**/#/mobile/tasks/mt-001')
  await assertPhotoGroups(true)
  await navigate('/safety-inspection/task/mt-001')
  await assertPhotoGroups(true)
  const doneId = await page.evaluate(async () => {
    const { personalTodoStore } = await import('/src/mock/personalCenter.js')
    return personalTodoStore.done.find(item => item.inspectionTaskId === 'mt-001')?.id
  })
  assert.ok(doneId, '未生成巡检已办')
  await navigate({ path: '/personal-center/todo/handle', query: { id: doneId, from: 'done' } })
  await assertPhotoGroups(true)
  const rectificationId = (await latestTask('移动端任务执行双照片')).hazardItems[0].rectifyId
  const rectifyTodoId = await page.evaluate(async id => {
    const { personalTodoStore } = await import('/src/mock/personalCenter.js')
    return personalTodoStore.todos.find(row => row.rectifyId === id)?.id
  }, rectificationId)
  assert.ok(rectifyTodoId, '未生成个人整改待办')
  await navigate({ path: '/personal-center/todo/handle', query: { id: rectifyTodoId, from: 'todo' } })
  await page.getByText('巡检照片', { exact: true }).locator('..').locator('img').waitFor()
  for (const [label, recipients] of copyFieldLabels) {
    await page.getByText(label, { exact: true }).locator('..').getByText(recipients, { exact: true }).waitFor()
  }
  assert.deepEqual(errors, [])
  console.log('PASS Web 和移动端新建、移动端执行：隐患照片必填、巡检照片选填，双端巡检、隐患及个人中心详情回显巡检照片和两类抄送人')
} finally {
  await browser.close()
  await server.close()
}
