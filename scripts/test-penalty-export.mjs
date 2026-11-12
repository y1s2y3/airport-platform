import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import JSZip from 'jszip'
import { buildPenaltyDocx, penaltyDocumentFields, penaltyIssueDate, penaltySupplementAttachments } from '../src/coc/utils/penaltyDocx.js'
import { penaltyTemplateKey, penaltyResponsibleUnit, filterPenaltyRecords } from '../src/coc/utils/penaltyLedger.js'

const root = resolve(import.meta.dirname, '..'), checks = []
const filenames = { processing: 'processing.docx', pendingAcceptance: 'pending-acceptance.docx', closed: 'closed.docx' }
const source = {
  id: 'CF-TEST-001', project: '测试项目 & 项目名称', status: '处理中', issueTime: '2026/11/10 10:15:30',
  penaltyContent: '处罚事由含 & < > 字符。\n第二行保持换行。', penaltyClause: '合同第18条',
  amount: '5000元', reportResult: '已整改并上报', acceptRemark: '验收复核通过', attachments: [],
}
async function check(name, fn) { await fn(); checks.push(name); console.log('PASS ' + name) }
const template = key => readFileSync(resolve(root, 'src/assets/penalty-templates', filenames[key]))
const decode = xml => xml.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')

await check('三类状态选择对应模板，待下发及申诉中不导出', () => {
  assert.equal(penaltyTemplateKey(source), 'processing')
  assert.equal(penaltyTemplateKey({ status: '待验收' }), 'pendingAcceptance')
  assert.equal(penaltyTemplateKey({ status: '已关闭', closeType: 'acceptance' }), 'closed')
  assert.equal(penaltyTemplateKey({ status: '已关闭', closeType: 'appeal' }), 'closed')
  assert.equal(penaltyTemplateKey({ status: '待下发' }), null)
  assert.equal(penaltyTemplateKey({ status: '申诉中' }), null)
})
await check('手动关闭或无法确认关闭性质的历史记录不冒用非手动关闭模板', () => {
  assert.equal(penaltyTemplateKey({ status: '已关闭', closeType: 'manual', acceptedTime: '2026-11-10' }), null)
  assert.equal(penaltyTemplateKey({ status: '已关闭', closedTime: '2026-11-10' }), null)
  assert.equal(penaltyTemplateKey({ status: '已关闭', acceptedTime: '2026-11-10' }), 'closed')
  assert.equal(penaltyTemplateKey({ status: '已关闭', appealResolution: '通过' }), 'closed')
})
await check('责任单位只取关联项目施工单位，支持ID、全称、简称及空格兼容', () => {
  const projects = [{ id: 'p-1', projectName: '项目完整名称', shortName: 'T1 项目', contractorUnit: '关联施工单位' }]
  assert.equal(penaltyResponsibleUnit({ project: '项目完整名称', unit: '旧单位' }, projects), '关联施工单位')
  assert.equal(penaltyResponsibleUnit({ project: 'T1项目' }, projects), '关联施工单位')
  assert.equal(penaltyResponsibleUnit({ projectId: 'p-1', project: '历史别名' }, projects), '关联施工单位')
  assert.equal(penaltyResponsibleUnit({ project: '其他项目', unit: '旧单位' }, projects), '')
  assert.equal(penaltyResponsibleUnit({ project: 'T1项目' }, [...projects, { ...projects[0], id: 'p-2' }]), '')
})
await check('关键词、状态和责任单位条件组合生效且不改源记录', () => {
  const projects = [{ projectName: source.project, contractorUnit: '施工甲' }]
  const rows = Object.freeze([Object.freeze({ ...source }), Object.freeze({ ...source, id: 'other', status: '待验收', project: '其他' })])
  const before = JSON.stringify(rows)
  assert.equal(filterPenaltyRecords(rows, { keyword: '处罚事由', status: '处理中', unit: '施工甲' }, projects).length, 1)
  assert.equal(filterPenaltyRecords(rows, { unit: '旧单位' }, projects).length, 0)
  assert.equal(JSON.stringify(rows), before)
})
await check('下发日期只输出年月日且空值不伪造当前日期', () => {
  assert.equal(penaltyIssueDate('2026/1/2 10:15:30'), '2026-01-02')
  assert.equal(penaltyIssueDate('2026-11-10T10:15:30'), '2026-11-10')
  assert.equal(penaltyIssueDate('--'), '--')
})
await check('金额去除重复元后缀并保留零值，验收说明不借用申诉意见', () => {
  assert.equal(penaltyDocumentFields(source).金额, '5000')
  assert.equal(penaltyDocumentFields({ ...source, amount: 0 }).金额, '0')
  assert.equal(penaltyDocumentFields({ appealResolveRemark: '申诉意见' }).验收说明, '--')
})
await check('附件只合并补充附件和现场图，按URL去重，不混入上报或申诉附件', () => {
  const result = penaltySupplementAttachments({ attachments: [{ name: '图1', url: 'data:image/png;a' }], snapshot: 'data:image/png;a', reportAttachments: [{ name: '上报', url: 'other' }] })
  assert.equal(result.length, 1)
  assert.equal(result[0].url, 'data:image/png;a')
  assert.equal(result[0].name, '图1')
})

for (const [key, status, extra] of [['processing', '处理中', {}], ['pendingAcceptance', '待验收', {}], ['closed', '已关闭', { closeType: 'acceptance' }]]) {
  await check(key + '原模板增量填充、项目名称、分run字段及换行正确', async () => {
    const record = Object.freeze({ ...source, status, ...extra })
    const before = JSON.stringify(record), bytes = template(key), baseline = await JSZip.loadAsync(bytes)
    const result = await buildPenaltyDocx(record, bytes)
    const generated = await JSZip.loadAsync(result.data), xml = await generated.file('word/document.xml').async('string'), plain = decode(xml)
    assert.ok(plain.includes('2026-11-10'))
    assert.ok(!plain.includes('10:15:30'))
    assert.ok(plain.includes('项目名称：' + source.project))
    assert.ok(plain.includes('处罚事由含 & < > 字符。'))
    assert.ok(xml.includes('<w:br/>'))
    assert.ok(!plain.includes('注意只取到日期'))
    assert.ok(!plain.includes('#{'))
    assert.ok(plain.includes('发包人（签字盖章）：'))
    if (key === 'processing') assert.ok(!plain.includes(source.penaltyClause) && !plain.includes(source.reportResult))
    else assert.ok(plain.includes(source.penaltyClause) && plain.includes('违约金5000元，' + source.reportResult) && !plain.includes('元元'))
    assert.equal(plain.includes(source.acceptRemark), key === 'closed')
    for (const path of Object.keys(baseline.files)) {
      if (baseline.files[path].dir || path === 'word/document.xml') continue
      assert.deepEqual(await generated.file(path).async('uint8array'), await baseline.file(path).async('uint8array'), path)
    }
    assert.equal(JSON.stringify(record), before)
    assert.match(result.fileName, /^违约处罚通知单_CF-TEST-001_/)
  })
}
await check('图片使用嵌入型关系、PNG内容类型与单倍行距，其他包条目保持原字节', async () => {
  const bytes = template('processing'), baseline = await JSZip.loadAsync(bytes)
  const png = new Uint8Array(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aB5kAAAAASUVORK5CYII=', 'base64'))
  const result = await buildPenaltyDocx({ ...source, attachments: [{ name: '图片 & 1.png', url: 'test' }] }, bytes, { images: [{ name: '图片 & 1.png', data: png, width: 1, height: 1 }] })
  const generated = await JSZip.loadAsync(result.data), xml = await generated.file('word/document.xml').async('string')
  assert.equal((xml.match(/<wp:inline\b/g) || []).length, 1)
  assert.ok(!xml.includes('<wp:anchor'))
  assert.ok(xml.includes('w:line="240" w:lineRule="auto"'))
  assert.ok((await generated.file('word/_rels/document.xml.rels').async('string')).includes('rIdPenaltyImage1'))
  assert.ok((await generated.file('[Content_Types].xml').async('string')).includes('ContentType="image/png"'))
  assert.deepEqual(await generated.file('word/media/penalty-attachment-1.png').async('uint8array'), png)
  for (const path of Object.keys(baseline.files)) {
    if (baseline.files[path].dir || ['word/document.xml', 'word/_rels/document.xml.rels', '[Content_Types].xml'].includes(path)) continue
    assert.deepEqual(await generated.file(path).async('uint8array'), await baseline.file(path).async('uint8array'), path)
  }
})
await check('模板不支持的状态或附件缺失明确失败，不产生假成功文件', async () => {
  await assert.rejects(buildPenaltyDocx({ ...source, status: '待下发' }, template('processing')), /没有对应/)
  await assert.rejects(buildPenaltyDocx({ ...source, attachments: [{ name: '图', url: 'test' }] }, template('processing')), /处理不完整/)
})
console.log(`\n${checks.length} penalty export checks passed.`)
