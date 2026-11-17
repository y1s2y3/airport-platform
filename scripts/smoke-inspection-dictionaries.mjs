import assert from 'node:assert/strict'
import { createServer } from 'vite'
import { chromium } from 'playwright'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const server = await createServer({ configLoader: 'native', root, logLevel: 'error', server: { host: '127.0.0.1', port: 0, open: false } })
let browser
const errors = []
try {
  await server.listen()
  browser = await chromium.launch({ headless: true, executablePath: existsSync(chromium.executablePath()) ? chromium.executablePath() : 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe' })
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
  page.setDefaultTimeout(12000)
  page.on('pageerror', e => errors.push(e.message))
  await page.goto(server.resolvedUrls.local[0] + '#/safety-inspection/inspection-types')
  async function navigate(path, projectId = 'hq') {
    await page.evaluate(async ({ path, projectId }) => {
      const { selectedProjectId } = await import('/src/composables/useCurrentProject.js')
      selectedProjectId.value = projectId
      const { default: router } = await import('/src/router/index.js')
      await router.push(path)
    }, { path, projectId })
  }
  await navigate('/safety-inspection/inspection-types')
  await page.getByRole('button', { name: '新增检查类型', exact: true }).click()
  await page.getByPlaceholder('请输入名称', { exact: true }).fill('联动回归检查')
  await page.getByRole('dialog').getByRole('button', { name: '保存', exact: true }).click()
  await page.locator('.dictionary-page .el-table__body-wrapper').getByText('联动回归检查', { exact: true }).waitFor()
  console.log('PASS 配置菜单可新增检查类型')

  const checks = await page.evaluate(async () => {
    const D = await import('/src/config/inspectionManagement.js')
    const { menuTree, filterMenuByLevel } = await import('/src/config/menu.js')
    const flatten = nodes => nodes.flatMap(n => [n, ...flatten(n.children || [])])
    const hq = flatten(filterMenuByLevel(menuTree, 'hq')), project = flatten(filterMenuByLevel(menuTree, 'project'))
    const keys = ['inspection-type-config', 'inspection-hazard-category-config']
    const results = {
      categories: D.INSPECTION_CATEGORIES,
      levels: D.INSPECTION_CATEGORIES.map(c => D.getHazardLevels(c)),
      numbers: D.INSPECTION_CATEGORIES.map(c => D.buildInspectionTaskNo(c, '2026-11-16', 1)),
      menus: keys.every(k => hq.some(n => n.key === k) && !project.some(n => n.key === k)),
      historicalType: D.normalizeInspectionType('已停用的历史检查类型') === '已停用的历史检查类型',
      newType: D.INSPECTION_TYPES.includes('联动回归检查'),
      qualityHasExamples: D.getHazardCategoryOptions('质量').length === 8,
    }
    for (const category of ['质量', '其他']) D.saveInspectionDictionary('hazards', { category, name: `${category}回归类别`, enabled: true, sort: 1 })
    let duplicateRejected = false
    try { D.saveInspectionDictionary('hazards', { category: '质量', name: '质量回归类别', enabled: true }) } catch { duplicateRejected = true }
    results.duplicateRejected = duplicateRejected
    results.noCrossCategory = D.getHazardCategoryOptions('安全').every(o => o.category === '安全')
    results.qualityValid = D.validateInspectionHazard({ hazardCategory: '质量回归类别', hazardLevel: 'A' }, '质量') === ''
    results.wrongLevelRejected = !!D.validateInspectionHazard({ hazardCategory: '质量回归类别', hazardLevel: 'Ⅰ重大隐患' }, '质量')
    results.wrongCategoryRejected = !!D.validateInspectionHazard({ hazardCategory: '质量回归类别', hazardLevel: 'Ⅰ重大隐患' }, '安全')
    const legacy = ['安全', '质量']
    results.legacyPreserved = D.formatInspectionCategories(legacy) === '安全、质量'
    const disabled = D.inspectionDictionaries.hazards.find(item => item.category === '质量')
    D.saveInspectionDictionary('hazards', { ...disabled, enabled: false })
    results.disabledRejected = !!D.validateInspectionHazard({ hazardCategory: disabled.name, hazardLevel: 'A' }, '质量')
    results.historyFilterKept = D.getHazardCategoryOptions('质量', true).some(item => item.value === disabled.name)
    D.saveInspectionDictionary('hazards', { ...disabled, enabled: true })
    return results
  })
  assert.deepEqual(checks.categories, ['安全', '质量', '其他'])
  assert.deepEqual(checks.levels[1], ['A', 'B', 'C'])
  assert.deepEqual(checks.levels[0], checks.levels[2])
  assert.deepEqual(checks.numbers, ['AQXJ20261116001', 'ZLXJ20261116001', 'QTXJ20261116001'])
  for (const [key, value] of Object.entries(checks)) if (typeof value === 'boolean') assert.equal(value, true, key)
  console.log('PASS 四类编号、两套等级、分类隔离、重复校验、停用规则、菜单层级、历史兼容')

  await page.reload()
  await page.locator('.dictionary-page h3').waitFor()
  assert.equal(await page.evaluate(async () => (await import('/src/config/inspectionManagement.js')).INSPECTION_TYPES.includes('联动回归检查')), true)
  console.log('PASS 刷新后配置保留')
  await navigate('/mobile/tasks/create', 'p-000')
  const mobile = page.locator('.mp')
  await mobile.getByRole('button', { name: '质量', exact: true }).click()
  assert.equal(await mobile.locator('.form-tags .tag-btn.active').filter({ hasText: /^(安全|质量|其他|其他)$/ }).count(), 1)
  await mobile.getByRole('button', { name: /有隐患/ }).click()
  const row = label => mobile.locator('.form-row').filter({ has: page.locator('.form-label', { hasText: label }) })
  assert.deepEqual(await row('隐患等级').locator('select option').allTextContents(), ['请选择隐患等级', 'A', 'B', 'C'])
  await row('隐患类别').locator('select').selectOption('质量回归类别')
  await row('隐患等级').locator('select').selectOption('A')
  await mobile.getByPlaceholder('请输入整改要求', { exact: true }).fill('保留的整改要求')
  await mobile.getByRole('button', { name: '其他', exact: true }).click()
  assert.equal(await page.getByRole('dialog', { name: '切换巡检分类', exact: true }).count(), 0)
  await page.waitForFunction(() => [...document.querySelectorAll('.mp select')].some(el => [...el.options].some(o => o.value === '其他回归类别')))
  assert.equal(await row('隐患等级').locator('select').inputValue(), '')
  assert.equal(await row('隐患类别').locator('select').inputValue(), '')
  assert.equal(await mobile.getByPlaceholder('请输入整改要求', { exact: true }).inputValue(), '保留的整改要求')
  console.log('PASS 移动端直接切换分类无弹窗、等级联动及保留其他输入')

  await row('隐患类别').locator('select').selectOption('其他回归类别')
  await row('隐患等级').locator('select').selectOption('Ⅲ一般隐患')
  await mobile.getByPlaceholder('请描述隐患情况...', { exact: true }).fill('其他回归隐患')
  await mobile.getByRole('button', { name: '否', exact: true }).click()
  await mobile.locator('.rectify-section input[type=date]').fill('2026-12-31')
  const chooser = page.waitForEvent('filechooser')
  await mobile.getByRole('button', { name: '+ 拍照', exact: true }).click()
  await (await chooser).setFiles({ name: '隐患.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+iK1cAAAAASUVORK5CYII=','base64') })
  await mobile.getByRole('button', { name: /提交巡检记录/ }).click()
  await page.waitForURL(url => url.hash === '#/mobile/tasks')
  const created = await page.evaluate(async () => {
    const { mobileInspectionTasks } = await import('/src/mock/mobileInspectionTasks.js')
    const { getMobileRectification } = await import('/src/composables/useMobileRectification.js')
    const { getInspectionHazardDetail } = await import('/src/mock/inspectionHazardQuery.js')
    const task = mobileInspectionTasks.find(item => item.hazardItems?.some(h => h.desc === '其他回归隐患'))
    const hazard = task.hazardItems[0], record = getMobileRectification(hazard.rectifyId)
    return { categories: task.inspectionCategories, no: task.taskNo, recordCategory: record.inspectionCategory, detail: getInspectionHazardDetail(record.id).hazard }
  })
  assert.deepEqual(created.categories, ['其他'])
  assert.ok(created.no.startsWith('QTXJ'))
  assert.equal(created.recordCategory, '其他')
  assert.equal(created.detail.category, '其他回归类别')
  assert.equal(created.detail.level, 'Ⅲ一般隐患')
  assert.equal(created.detail.rectifyRequirement, '保留的整改要求')
  console.log('PASS 其他巡检实际提交及整改单/WEB详情数据贯通')

  await navigate('/safety-inspection/check-items')
  await page.locator('.category-tabs .el-radio-button').filter({ hasText: '其他' }).click()
  await page.locator('.category-panel .panel-header').getByRole('button', { name: '新增', exact: true }).click()
  await page.getByPlaceholder('请输入分类名称', { exact: true }).fill('其他测试检查分类')
  await page.getByRole('dialog').getByRole('button', { name: '确定', exact: true }).click()
  await page.locator('.cat-item').filter({ hasText: '其他测试检查分类' }).click()
  await page.getByRole('button', { name: '新增检查项', exact: true }).click()
  await page.getByPlaceholder('请输入检查项内容', { exact: true }).fill('现场降尘措施检查')
  await page.getByRole('dialog').getByRole('button', { name: '确定', exact: true }).click()
  await page.locator('.items-panel').getByText('现场降尘措施检查', { exact: true }).waitFor()
  console.log('PASS 新分类下可以维护检查项')
  const qualityTaskId = await page.evaluate(async () => {
    const { addPlan } = await import('/src/composables/useInspectionPlan.js')
    const { mobileInspectionTasks } = await import('/src/mock/mobileInspectionTasks.js')
    addPlan({ name: '质量联动下发测试', inspectionCategories: ['质量'], inspectionCategory: '质量', inspectionType: '联动回归检查', projects: ['T2航站区配套'], projectIds: ['p-000'], checkConfig: [{ categoryId: 'cat-q1', itemIds: ['item-q1-1'] }], deadlineDate: '2026-12-31', ccPersons: [] })
    return mobileInspectionTasks.find(item => item.taskName === '质量联动下发测试').id
  })
  await navigate(`/mobile/tasks/${qualityTaskId}/execute`, 'p-000')
  await page.locator('.mp').getByRole('button', { name: /有隐患/ }).click()
  const executeRow = label => page.locator('.hazard-card .form-row').filter({ has: page.locator('.form-label', { hasText: label }) })
  assert.deepEqual(await executeRow('隐患等级').locator('select option').allTextContents(), ['请选择隐患等级', 'A', 'B', 'C'])
  const executeCategories = await executeRow('隐患类别').locator('select option').allTextContents()
  assert.ok(executeCategories.includes('质量回归类别'))
  assert.ok(executeCategories.includes('材料质量'))
  assert.equal(executeCategories.includes('扬尘防治'), false)
  console.log('PASS 下发质量任务继承分类，执行时仅展示质量类别与A/B/C')

  await navigate('/safety-inspection/plan/create')
  await page.locator('.plan-form .el-radio').filter({ hasText: '其他' }).click()
  await page.getByRole('button', { name: '选择检查项', exact: true }).click()
  assert.equal(await page.getByRole('dialog').getByRole('tab').count(), 1)
  assert.match(await page.getByRole('dialog').getByRole('tab').innerText(), /其他/)
  await page.getByRole('dialog').locator('.sel-left-cat').filter({ hasText: '其他测试检查分类' }).locator('.sel-cat-count').click()
  await page.getByRole('dialog').getByText('现场降尘措施检查', { exact: true }).waitFor()
  await page.getByRole('dialog').getByRole('button', { name: '取消', exact: true }).click()
  console.log('PASS WEB任务下发单选与检查项范围隔离')
  await navigate('/safety-inspection/plan/plan-003/edit')
  assert.equal(await page.locator('.plan-form input[type=radio]:checked').count(), 0)
  await page.getByPlaceholder('如：雨季临时用电检查', { exact: true }).waitFor()
  console.log('PASS 历史复合分类编辑不擅自预选其中一类')
  await navigate('/safety-inspection/task/create', 'p-000')
  await page.locator('.inspection-create-page').waitFor()
  assert.equal(await page.getByRole('combobox', { name: '请选择巡检分类', exact: true }).count(), 1)
  console.log('PASS WEB新增巡检采用单选分类')
  await page.getByRole('combobox', { name: '请选择巡检分类', exact: true }).focus()
  await page.getByRole('combobox', { name: '请选择巡检分类', exact: true }).press('ArrowDown')
  await page.getByRole('option', { name: '质量', exact: true }).click()
  await page.locator('.inspection-create-page .el-radio').filter({ hasText: '有隐患' }).click()
  await page.getByRole('combobox', { name: '隐患1等级', exact: true }).focus()
  await page.getByRole('combobox', { name: '隐患1等级', exact: true }).press('ArrowDown')
  const levelInput = page.getByRole('combobox', { name: '隐患1等级', exact: true })
  const levelOptions = page.locator(`[id="${await levelInput.getAttribute('aria-controls')}"]`)
  assert.deepEqual(await levelOptions.getByRole('option').allTextContents(), ['A', 'B', 'C'])
  await page.keyboard.press('Escape')
  console.log('PASS WEB自建质量巡检等级联动')
  await navigate('/safety-inspection/hazard-categories', 'p-000')
  await page.getByText('仅工程指挥部可维护巡检配置', { exact: true }).waitFor()
  assert.equal(await page.getByRole('button', { name: '新增隐患类别', exact: true }).count(), 0)
  assert.deepEqual(errors, [])
  console.log('PASS 项目级配置入口禁止维护，浏览器无未处理异常')

  const builtUrl = new URL('../release/机场工程项目管理平台v2.html', import.meta.url).href
  if (existsSync(new URL(builtUrl))) {
    await page.goto(builtUrl + '#/safety-inspection/inspection-types')
    await page.getByRole('button', { name: '新增检查类型', exact: true }).waitFor()
    await page.goto(builtUrl + '#/safety-inspection/hazard-categories')
    await page.locator('.dictionary-page h3').getByText('隐患类别配置', { exact: true }).waitFor()
    assert.equal(await page.locator('.dictionary-page .category-tabs input[type=radio]').count(), 3)
    for (const [category, count] of [['质量', 8], ['其他', 6], ['其他', 6]]) {
      await page.locator('.dictionary-page .category-tabs .el-radio-button').filter({ hasText: category }).click()
      assert.equal(await page.locator('.dictionary-page .el-table__body-wrapper tbody tr').count(), count)
    }
    await page.goto(builtUrl + '#/mobile/tasks/create')
    await page.locator('.mp').getByRole('button', { name: '质量', exact: true }).click()
    await page.locator('.mp').getByRole('button', { name: /有隐患/ }).click()
    const levelRow = page.locator('.hazard-item-row .form-row').filter({ has: page.locator('.form-label', { hasText: '隐患等级' }) })
    assert.deepEqual(await levelRow.locator('select option').allTextContents(), ['请选择隐患等级', 'A', 'B', 'C'])
    await levelRow.locator('select').selectOption('A')
    await page.locator('.mp').getByPlaceholder('请输入整改要求', { exact: true }).fill('双击版保留输入')
    await page.locator('.mp').getByRole('button', { name: '其他', exact: true }).click()
    assert.equal(await page.getByRole('dialog', { name: '切换巡检分类', exact: true }).count(), 0)
    assert.equal(await levelRow.locator('select').inputValue(), '')
    assert.equal(await page.locator('.mp').getByPlaceholder('请输入整改要求', { exact: true }).inputValue(), '双击版保留输入')
    assert.deepEqual(errors, [])
    console.log('PASS 双击版HTML配置菜单、等级联动及直接切换无弹窗')
  }
} finally {
  await browser?.close()
  await server.close()
}
