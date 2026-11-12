import assert from 'node:assert/strict'
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createHash } from 'node:crypto'
import JSZip from 'jszip'
import * as XLSX from 'xlsx'
import {
  buildDailyWorkExportRecords, buildDailyWorkExportPlan, dailyWorkExportStatistics,
  dailyWorkExportSummary, matchesDailyWorkKeyword,
} from '../src/coc/utils/dailyWorkExport.js'
import { buildDailyWorkExportPackage } from '../src/coc/utils/dailyWorkExportWorkbook.js'
import { DANGER_WORK_FIELDS, MAJOR_WORK_REGISTER_FIELDS } from '../src/coc/config/dailyWorkSchema.js'
import { exportRecord as row, exportFixtures, exportMarker, exportMajorRecord, exportMajorFixtures } from './fixtures/daily-work-export.mjs'

const checks = []
async function check(name, run) { await run(); checks.push(name); console.log('PASS ' + name) }
const select = (rows, sheet = 'night', date = '2026-06-30', keyword = '') => buildDailyWorkExportRecords(rows, { sheet, reportDate: date, keyword })
const templateData = readFileSync(new URL('../src/assets/daily-work-templates/export-plans.xlsx', import.meta.url))
const output = resolve(import.meta.dirname, '../../outputs/daily-work-package-export/unit-' + Date.now())
mkdirSync(output, { recursive: true })
const packageFor = (records, options = {}) => buildDailyWorkExportPackage(records, { dates: ['2026-06-30'], keyword: exportMarker, templateData, ...options })
const readWorkbook = data => XLSX.read(data, { type: 'array', cellStyles: true })
function effectiveCell(sheet, r, c) {
  const merge = (sheet['!merges'] || []).find(merge => r >= merge.s.r && r <= merge.e.r && c >= merge.s.c && c <= merge.e.c)
  return sheet[XLSX.utils.encode_cell(merge ? merge.s : { r, c })]?.v ?? ''
}

await check('20:00含、次日07:00不含，只接触端点和零时长均排除', () => {
  const records = [
    row('touch20', '2026-06-30', '19:00', '20:00'),
    row('begin20', '2026-06-30', '20:00', '20:01'),
    row('end07', '2026-07-01', '06:59', '07:00'),
    row('begin07', '2026-07-01', '07:00', '08:00'),
    row('zero', '2026-06-30', '22:00', '22:00'),
  ]
  assert.deepEqual(select(records).map(r => r.workContent), ['begin20', 'end07'])
})
await check('跨20:00和07:00仅判断重叠，整段原时间保留', () => {
  const records = [row('eve', '2026-06-30', '18:00', '21:00'), row('dawn', '2026-07-01', '06:30', '08:00')]
  assert.deepEqual(select(records).map(r => [r.startTime, r.endTime]), records.map(r => [r.startTime, r.endTime]))
})
await check('当日凌晨归前夜，所选D日夜间只查D和D+1', () => {
  const records = [
    row('old', '2026-06-30', '00:00', '06:00'), row('eve', '2026-06-30', '21:00', '23:00'),
    row('dawn', '2026-07-01', '00:00', '08:00'), row('future', '2026-07-01', '20:00', '21:00'),
  ]
  assert.deepEqual(select(records).map(r => r.workContent), ['eve', 'dawn'])
  assert.deepEqual(select(records, 'night', '2026-06-29').map(r => r.workContent), ['old'])
})
await check('D日无台账记录也可导出次日凌晨，保留原施工日期', () => {
  const record = row('dawn', '2026-07-01', '00:00', '08:00')
  assert.strictEqual(select([record])[0], record)
  assert.equal(select([record])[0].reportDate, '2026-07-01')
})
await check('危险作业查全天，包含凌晨、白天和晚间，不纳入普通作业或次日记录', () => {
  const records = [
    row('dawn', '2026-06-30', '00:00', '06:00'), row('day', '2026-06-30', '07:00', '18:00'),
    row('eve', '2026-06-30', '20:00', '23:59'), row('next', '2026-07-01', '00:00', '06:00'),
    row('ordinary', '2026-06-30', '08:00', '23:00', { dangerWorkCategory: '不涉及危险作业' }),
  ]
  assert.deepEqual(select(records, 'danger').map(r => r.workContent), ['dawn', 'day', 'eve'])
})
await check('夜间包含普通作业，不依赖类别夜间作业或旧isNight标识', () => {
  const record = row('ordinary', '2026-06-30', '20:00', '21:00', { dangerWorkCategory: '不涉及危险作业', isNight: false })
  assert.strictEqual(select([record])[0], record)
  assert.equal(select([record], 'danger').length, 0)
})
await check('危险作业分类沿用既有规则，不涉及、空值和无等不计入', () => {
  for (const dangerWorkCategory of ['不涉及危险作业', '不涉及', '/', '—', '-', '无', '', null]) {
    assert.equal(select([row('no', '2026-06-30', '20:00', '21:00', { dangerWorkCategory })], 'danger').length, 0)
  }
})
await check('扩大日期后保留五个关键词条件，匹配不受分页影响', () => {
  for (const field of ['projectName', 'contractor', 'workArea', 'dangerWorkCategory', 'leadUnit']) {
    const record = row(field, '2026-07-01', '00:00', '06:00', { [field]: '唯一匹配值' })
    assert.strictEqual(select([record], 'night', '2026-06-30', ' 唯一匹配值 ')[0], record)
  }
  assert.equal(matchesDailyWorkKeyword(exportFixtures[0], '不存在'), false)
  assert.equal(select(Array.from({ length: 22 }, (_, i) => row(String(i), '2026-06-30', '21:00', '22:00'))).length, 22)
})
await check('跨月、跨年、闰日和夏令时切换日的夜间归属正确', () => {
  for (const [date, next] of [['2026-06-30', '2026-07-01'], ['2026-12-31', '2027-01-01'], ['2028-02-29', '2028-03-01'], ['2026-10-31', '2026-11-01']]) {
    const record = row('dawn', next, '00:00', '08:00')
    assert.strictEqual(select([record], 'night', date)[0], record)
  }
})
await check('无效、倒序、跨自然日及施工日期不符的源记录不推测修复', () => {
  const records = [
    row('backward', '2026-06-30', '22:00', '06:00'), row('invalid-hour', '2026-06-30', '24:00', '24:30'),
    row('invalid-minute', '2026-06-30', '20:60', '22:00'), row('missing', '2026-06-30', '20:00', '22:00', { startTime: '' }),
    row('cross-day', '2026-06-30', '22:00', '23:00', { endTime: '2026-07-01 06:00' }),
    row('bad-date', '2026-02-30', '20:00', '23:00'),
  ]
  assert.deepEqual(select(records), [])
  assert.deepEqual(select(records, 'danger'), [])
})
await check('秒级正交集可纳入且不改写原格式', () => {
  const record = row('seconds', '2026-07-01', '06:59:59', '07:00:01')
  assert.strictEqual(select([record])[0], record)
})
await check('至少选择一天、至少一种表，非法日期和旧昼间参数不能导出', () => {
  assert.equal(buildDailyWorkExportPlan(exportFixtures, { dates: [] }).ok, false)
  assert.equal(buildDailyWorkExportPlan(exportFixtures, { dates: ['2026-02-30'] }).ok, false)
  assert.equal(buildDailyWorkExportPlan(exportFixtures, { dates: ['2026-06-30'], sheets: [] }).ok, false)
  assert.equal(buildDailyWorkExportPlan(exportFixtures, { dates: ['2026-06-30'], sheets: ['day'] }).ok, false)
  assert.deepEqual(select(exportFixtures, 'day'), [])
  assert.deepEqual(select(exportFixtures, 'night', ''), [])
})
await check('多日去重排序，一日一文件，每份最多三张Sheet，默认全选', () => {
  const plan = buildDailyWorkExportPlan([], { dates: ['2026-07-01', '2026-06-30', '2026-07-01'] })
  assert.equal(plan.fileCount, 2); assert.equal(plan.sheetCount, 6)
  assert.deepEqual(plan.files.map(f => f.date), ['2026-06-30', '2026-07-01'])
  assert.deepEqual(plan.files[0].sheets.map(s => s.name), ['夜间作业', '危险作业', '危大工程'])
})
await check('夜间统计全部行和项目，仅危险子集参与危险作业与类别统计', () => {
  const records = select(exportFixtures, 'night', '2026-06-30', exportMarker)
  assert.deepEqual(dailyWorkExportStatistics(records), {
    projectCount: 3, workCount: 5, dangerProjectCount: 2, dangerWorkCount: 3,
    categories: ['动火作业', '高处作业'], categoryCount: 2,
  })
  assert.ok(!dailyWorkExportSummary('2026-06-30', 'night', dailyWorkExportStatistics(records)).includes('不涉及危险作业'))
})
await check('普通作业单独夜间导出，作业总数不为零、危险类别为零', () => {
  const records = [exportFixtures[0]]
  const s = dailyWorkExportStatistics(records)
  assert.equal(s.workCount, 1); assert.equal(s.projectCount, 1)
  assert.equal(s.dangerWorkCount, 0); assert.equal(s.dangerProjectCount, 0); assert.equal(s.categoryCount, 0)
})
await check('冻结的原数组和所有字段均不被取数、统计或分组修改', () => {
  const records = Object.freeze(exportFixtures.map(record => Object.freeze({ ...record })))
  const before = JSON.stringify(records)
  buildDailyWorkExportPlan(records, { dates: ['2026-06-30', '2026-07-01'] })
  assert.equal(JSON.stringify(records), before)
})

await check('危大工程按独立起止时间与D日正交集取数，含此前已开始的跨日作业', () => {
  const selected = select(exportMajorFixtures, 'major')
  assert.deepEqual(selected.map(record => record.majorWorkContent), ['危大跨多日', '危大当日', '危大跨次日'])
  assert.strictEqual(selected[0], exportMajorFixtures[0])
  assert.equal(selected[0].majorStartTime, '2026-06-29 09:00')
  assert.equal(selected[0].majorEndTime, '2026-07-02 18:00')
  assert.equal(select([row('仅危险作业', '2026-06-30', '08:00', '18:00')], 'major').length, 0)
})
await check('危大取数保留关键词，类别匹配危大类别，不读取普通作业起止时间', () => {
  const source = exportMajorRecord('独立时间', '2026-06-29 23:00', '2026-06-30 01:00', {
    reportDate: '2026-06-29', startTime: '2026-06-29 08:00', endTime: '2026-06-29 09:00',
  })
  for (const keyword of ['基坑开挖工程', source.projectName, source.contractor, source.leadUnit]) {
    assert.strictEqual(select([source], 'major', '2026-06-30', keyword)[0], source)
  }
  assert.deepEqual(select([source], 'major', '2026-06-30', '不匹配'), [])
})
await check('危大跨月年及秒级重叠正确，缺失无效时间和零时长排除', () => {
  const seconds = exportMajorRecord('秒级', '2026-12-31 23:59:59', '2027-01-01 00:00:01')
  assert.strictEqual(select([seconds], 'major', '2027-01-01')[0], seconds)
  for (const [start, end] of [['', '2026-06-30 18:00'], ['2026-06-30 08:00', ''],
    ['2026-06-30 12:00', '2026-06-30 12:00'], ['2026-06-30 18:00', '2026-06-30 08:00'],
    ['2026-02-30 08:00', '2026-06-30 18:00'], ['2026-06-30 24:00', '2026-07-01 01:00']]) {
    assert.deepEqual(select([exportMajorRecord('无效', start, end)], 'major'), [])
  }
})

const result = await packageFor([...exportFixtures, ...exportMajorFixtures])
const workbook = readWorkbook(result.data)
writeFileSync(resolve(output, result.fileName), result.data)
await check('实际xlsx含三张命名Sheet，夜间与全天危险作业的数量分别为5和4', () => {
  assert.equal(result.ok, true)
  assert.equal(result.fileName, '每日施工作业_2026-06-30.xlsx')
  assert.deepEqual(workbook.SheetNames, ['夜间作业', '危险作业', '危大工程'])
  assert.equal(XLSX.utils.decode_range(workbook.Sheets['夜间作业']['!ref']).e.r, 7)
  assert.equal(XLSX.utils.decode_range(workbook.Sheets['危险作业']['!ref']).e.r, 6)
})
await check('新模板保留16列表头，所有15个业务字段逐行原值，合并项目名可回填还原', () => {
  const sheet = workbook.Sheets['夜间作业']
  assert.equal(sheet.A2.v, '序号')
  assert.equal(sheet.G2.v, '*危险作业作业类别')
  assert.equal(sheet.P2.v, '*风险管控措施')
  const expectedIds = ['普通晚间', '次日普通', '晚间动火', '次日动火', '晚间高处']
  for (let i = 0; i < expectedIds.length; i++) {
    const record = exportFixtures.find(record => record.workContent === expectedIds[i])
    DANGER_WORK_FIELDS.forEach((field, index) => assert.equal(effectiveCell(sheet, i + 2, index + 1), record[field.key] ?? '', field.key))
  }
})
await check('同一项目的序号、项目名称合并，项目分组后统计仍按实际作业行数', () => {
  const sheet = workbook.Sheets['夜间作业']
  const refs = sheet['!merges'].map(m => XLSX.utils.encode_range(m))
  for (const ref of ['A3:A4', 'B3:B4', 'C3:C4', 'A5:A6', 'C5:C6', 'A8:P8']) assert.ok(refs.includes(ref), ref)
  assert.equal(sheet.A3.v, 1); assert.equal(sheet.A5.v, 2); assert.equal(sheet.A7.v, 3)
})
await check('夜间原始次日时间08:00完整保留，标题和统计统一使用起始日6月30日', () => {
  const sheet = workbook.Sheets['夜间作业']
  assert.equal(sheet.H6.v, '2026-07-01 00:00'); assert.equal(sheet.I6.v, '2026-07-01 08:00')
  assert.ok(sheet.A1.v.includes('6月30日20:00-次日07:00'))
  assert.equal(sheet.A8.v, '6月30日夜间作业计划：3个项目共计5项作业，其中危险作业2个项目3项，涉及动火作业、高处作业等2个类别。（备注：数据来源为各项目所报危险作业计划，实际危险作业可能与计划有出入，需晚上指挥部研判会时与各项目部进一步确认。）')
})
await check('危险作业末行统计只依据本Sheet，类别去重且列出实际名称', () => {
  const sheet = workbook.Sheets['危险作业']
  assert.equal(sheet.A7.v, '6月30日危险作业：2个项目共计4项危险作业，涉及动火作业、高处作业、临时用电作业等3个类别。（备注：数据来源为各项目所报危险作业计划，实际危险作业可能有所调整。）')
  assert.ok(sheet.A1.v.includes('6月30日00:00-24:00'))
})
await check('危大12列全部从登记段原值导出，按项目合并且不残留示例或新增统计尾行', () => {
  const sheet = workbook.Sheets['危大工程']
  assert.equal(sheet.A1.v, '3建设工程指挥部6月30日危大工程计划统计表（计划施工日期：6月30日00:00-24:00）')
  assert.equal(sheet['!ref'], 'A1:L5')
  const selected = exportMajorFixtures.slice(0, 3)
  for (let r = 0; r < selected.length; r++) {
    MAJOR_WORK_REGISTER_FIELDS.forEach((field, c) => assert.equal(effectiveCell(sheet, r + 2, c + 1), selected[r][field.key] ?? '', field.key))
  }
  const merges = sheet['!merges'].map(merge => XLSX.utils.encode_range(merge))
  assert.ok(merges.includes('A3:A4')); assert.ok(merges.includes('C3:C4'))
  assert.ok(!JSON.stringify(sheet).includes('模板示例'))
  assert.ok(!JSON.stringify(sheet).includes('三跑道扩建机场工程（软基工程）'))
  assert.equal(sheet.G3.v, '2026-06-29 09:00'); assert.equal(sheet.H3.v, '2026-07-02 18:00')
  assert.equal(sheet.A6, undefined)
})
await check('空危大结果保留标题及12列表头，不回落其他日期或保留模板示例', async () => {
  const exported = await packageFor(exportMajorFixtures, { sheets: ['major'], dates: ['2026-06-01'] })
  const sheet = readWorkbook(exported.data).Sheets['危大工程']
  assert.equal(sheet['!ref'], 'A1:L2'); assert.ok(sheet.A1.v.startsWith('1建设工程指挥部6月1日'))
  assert.equal(sheet.A3, undefined); assert.equal(sheet.L2.v, '*风险管控措施')
})
await check('危大记录参与导出后所有原始字段及数组不变', async () => {
  const frozen = Object.freeze(exportMajorFixtures.map(record => Object.freeze({ ...record })))
  const before = JSON.stringify(frozen)
  await packageFor(frozen, { sheets: ['major'] })
  assert.equal(JSON.stringify(frozen), before)
})
await check('模板字体边框等样式和主题字节保留，列宽保留，筛选范围不含统计尾行', async () => {
  const original = await JSZip.loadAsync(templateData), zip = await JSZip.loadAsync(result.data)
  for (const name of ['xl/styles.xml', 'xl/theme/theme1.xml']) assert.equal(await zip.file(name).async('string'), await original.file(name).async('string'))
  const source = await original.file('xl/worksheets/sheet1.xml').async('string'), generated = await zip.file('xl/worksheets/sheet1.xml').async('string')
  assert.equal(generated.match(/<cols>[\s\S]*?<\/cols>/)[0], source.match(/<cols>[\s\S]*?<\/cols>/)[0])
  assert.ok(generated.includes('<autoFilter ref="A2:P7"/>'))
  assert.equal(zip.file('xl/sharedStrings.xml'), null)
})
await check('关键词导致空结果仍输出所选两张实际表，统计为0且不残留模板作业', async () => {
  const empty = await packageFor(exportFixtures, { keyword: '完全不匹配', sheets: ['night', 'danger'] })
  const w = readWorkbook(empty.data)
  for (const name of w.SheetNames) {
    assert.equal(w.Sheets[name]['!ref'], 'A1:P3')
    assert.ok(w.Sheets[name].A3.v.includes('0个项目共计0项'))
    assert.ok(!JSON.stringify(w.Sheets[name]).includes('袖阀'))
  }
  writeFileSync(resolve(output, '空结果.xlsx'), empty.data)
})
await check('七种表单组合的标题均按实际输出顺序连续编号，反向勾选不改变规定顺序', async () => {
  for (let mask = 1; mask < 8; mask++) {
    const sheets = ['night', 'danger', 'major'].filter((key, index) => mask & (1 << index))
    const exported = await packageFor([...exportFixtures, ...exportMajorFixtures], { sheets: [...sheets].reverse() })
    const w = readWorkbook(exported.data), zip = await JSZip.loadAsync(exported.data)
    assert.deepEqual(w.SheetNames, ['夜间作业', '危险作业', '危大工程'].filter((key, index) => mask & (1 << index)))
    assert.equal(Object.keys(zip.files).filter(name => /^xl\/worksheets\/sheet\d+\.xml$/.test(name)).length, sheets.length)
    assert.ok((await zip.file('xl/workbook.xml').async('string')).includes('activeTab="0"'))
    w.SheetNames.forEach((name, index) => assert.ok(w.Sheets[name].A1.v.startsWith((index + 1) + '建设工程指挥部6月30日'), name))
    const expectedSheets = ['night', 'danger', 'major'].filter(key => sheets.includes(key))
    assert.deepEqual(exported.files[0].sheets.map(sheet => sheet.key), expectedSheets)
  }
})
await check('同项目管理单位不同时不合并该字段，其他原文、空值、公式样文本和XML字符保留', async () => {
  const values = [row('一', '2026-06-30', '20:00', '21:00', { leadUnit: '单位一', workContent: '=SUM(A1:A2)', ownerSafetyManager: '张三/13800000000,李四/13900000000' }),
    row('二', '2026-06-30', '21:00', '22:00', { leadUnit: '单位二', workContent: '  原文<&>\\n换行  ', supervisorProjectManager: '', dangerControlMeasures: '_x0041_' })]
  const r = await packageFor(values, { keyword: '', sheets: ['night'] }), sheet = readWorkbook(r.data).Sheets['夜间作业']
  assert.equal(sheet.B3.v, '单位一'); assert.equal(sheet.B4.v, '单位二')
  assert.ok(!sheet['!merges'].some(m => XLSX.utils.encode_range(m) === 'B3:B4'))
  assert.equal(sheet.F3.v, values[0].workContent); assert.equal(sheet.F3.t, 's'); assert.equal(sheet.F3.f, undefined)
  assert.equal(sheet.F4.v, values[1].workContent); assert.equal(sheet.P4.v, '_x0041_')
  assert.equal(sheet.K3.v, values[0].ownerSafetyManager); assert.equal(sheet.N4?.v ?? '', '')
})
await check('多日生成多份xlsx组成ZIP，各日期统计独立且夜间使用各自起始日期', async () => {
  const multi = await packageFor(exportFixtures, { dates: ['2026-07-01', '2026-06-30'], sheets: ['night', 'danger'] })
  const zip = await JSZip.loadAsync(multi.data)
  assert.equal(multi.mimeType, 'application/zip'); assert.equal(multi.fileCount, 2); assert.equal(multi.sheetCount, 4)
  assert.deepEqual(Object.keys(zip.files), ['每日施工作业_2026-06-30.xlsx', '每日施工作业_2026-07-01.xlsx'])
  for (const date of ['2026-06-30', '2026-07-01']) {
    const w = readWorkbook(await zip.file('每日施工作业_' + date + '.xlsx').async('uint8array'))
    assert.deepEqual(w.SheetNames, ['夜间作业', '危险作业'])
    const sheet = w.Sheets['夜间作业'], last = XLSX.utils.decode_range(sheet['!ref']).e.r + 1
    assert.ok(sheet['A' + last].v.startsWith(date === '2026-06-30' ? '6月30日夜间' : '7月1日夜间'))
  }
  writeFileSync(resolve(output, multi.fileName), multi.data)
})
await check('长文本保持全文并按需增加行高，超过当前页的所有记录均导出', async () => {
  const text = '完整保留风险措施。'.repeat(30)
  const records = Array.from({ length: 21 }, (_, i) => row(String(i), '2026-06-30', '20:00', '22:00', { dangerControlMeasures: text }))
  const r = await packageFor(records, { sheets: ['night'] }), w = readWorkbook(r.data)
  assert.equal(w.Sheets['夜间作业'].P23.v, text)
  assert.ok(w.Sheets['夜间作业'].A24.v.includes('21项作业'))
  const xml = await (await JSZip.loadAsync(r.data)).file('xl/worksheets/sheet1.xml').async('string')
  assert.ok(Number(xml.match(/<row r="3" ht="([\d.]+)"/)[1]) > 100)
})
await check('模板资产仍与用户源文件的已核对SHA256一致', () => {
  assert.equal(createHash('sha256').update(templateData).digest('hex'), '1787ac679527a94fe082a9efd1b0ba4d222597c9cbf9db91c5867d0b12cef641')
})
writeFileSync(resolve(output, 'verification.json'), JSON.stringify({ passed: checks.length, checks }, null, 2))
console.log(JSON.stringify({ passed: checks.length, output }))
