import assert from 'node:assert/strict'
import test from 'node:test'
import { dailyCardStatuses } from '../src/utils/dailyDispatchCardStatus.js'
import { emptyDay, emptyCheck, dayStats } from '../src/utils/dailyDispatchCheckRules.js'

const projects = [{ id: 'a', projectName: 'A' }, { id: 'b', projectName: 'B' }]
function day(type = 'normal') {
  const value = emptyDay('2026-10-29', projects)
  value.hq.version = 1
  for (const row of value.hq.rows) {
    row.unified = true
    row.personnel = { type, text: type === 'other' ? '人员另行安排' : '' }
    for (const field of ['safety', 'quality', 'camera']) row[field] = { ...emptyCheck(), type, other: type === 'other' ? '专项检查说明' : '' }
  }
  return value
}
const keys = (value, field) => dailyCardStatuses(value).find(group => group.key === field).states.map(state => state.key)

test('card dimensions keep personnel, combined safety/quality and camera order', () => {
  const groups = dailyCardStatuses(day())
  assert.deepEqual(groups.map(group => group.key), ['personnel', 'safetyQuality', 'camera'])
  assert.ok(groups.every(group => group.labelLines.join('') === group.label))
})
test('all normal results show one normal status', () => assert.ok(dailyCardStatuses(day()).every(group => group.states.length === 1 && group.states[0].key === 'normal')))
test('all other results show one other status', () => assert.ok(dailyCardStatuses(day('other')).every(group => group.states.length === 1 && group.states[0].key === 'other')))
test('one valid quality issue takes priority over normal and other safety/quality results', () => {
  const value = day('other')
  value.hq.rows[0].safety = { type: 'normal' }
  value.hq.rows[1].quality = { type: 'problem', problems: [{ text: '有效质量问题' }, { text: ' ' }] }
  assert.deepEqual(keys(value, 'safetyQuality'), ['problem'])
})
test('one valid camera issue takes priority over other and unfilled cameras', () => {
  const value = day('other')
  delete value.hq.rows[0].camera
  value.hq.rows[1].camera = { type: 'problem', problems: [{ text: '摄像头遮挡' }] }
  assert.deepEqual(keys(value, 'camera'), ['problem'])
})
test('normal and other remain mixed rather than claiming all normal or all other', () => {
  const value = day()
  value.hq.rows[1].personnel = { type: 'other', text: '暂由替班人员履职' }
  value.hq.rows[1].safety = { type: 'other', other: '另有检查说明' }
  assert.deepEqual(keys(value, 'personnel'), ['normal', 'other'])
  assert.deepEqual(keys(value, 'safetyQuality'), ['normal', 'other'])
})
test('partial normal results retain an explicit empty marker', () => {
  const value = day()
  delete value.hq.rows[1].camera
  assert.deepEqual(keys(value, 'camera'), ['normal', 'empty'])
})
test('unsubmitted default normals do not become valid card statuses', () => {
  const value = day()
  value.hq.version = 0
  assert.ok(dailyCardStatuses(value).every(group => group.states[0].key === 'empty'))
})
test('empty or missing day returns empty markers', () => {
  for (const value of [undefined, {}, emptyDay('2026-10-29', [])]) assert.ok(dailyCardStatuses(value).every(group => group.states[0].label === '—'))
})
test('no selected dispatch projects leaves every card dimension empty', () => {
  const value = day()
  value.hq.rows.forEach(row => { row.unified = false })
  assert.ok(dailyCardStatuses(value).every(group => group.states[0].key === 'empty'))
})
test('non-dispatch project issues never affect card summaries', () => {
  const value = day()
  value.hq.rows[1].unified = false
  value.hq.rows[1].camera = { type: 'problem', problems: [{ text: '不计入本日调度范围' }] }
  assert.deepEqual(keys(value, 'camera'), ['normal'])
})
test('project duty and manager results never override dispatch summaries', () => {
  const value = day()
  value.people.a = { duty: { firstSubmittedAt: 'saved', check: { type: 'problem', problems: [{ text: '项目部检查' }] } } }
  assert.deepEqual(keys(value, 'safetyQuality'), ['normal'])
})
test('empty issue descriptions do not create a found-problem status', () => {
  const value = day()
  value.hq.rows[0].camera = { type: 'problem', problems: [{ text: ' ' }] }
  assert.deepEqual(keys(value, 'camera'), ['normal', 'empty'])
})
test('empty other text does not become a valid other result', () => {
  const value = day('other')
  value.hq.rows[0].personnel.text = ' '
  assert.deepEqual(keys(value, 'personnel'), ['other', 'empty'])
})
test('historic personnel tick remains historic without conversion to normal', () => {
  const value = day()
  value.hq.rows.forEach(row => { row.personnel = { type: 'ok' } })
  assert.deepEqual(keys(value, 'personnel'), ['legacy'])
})
test('historic string issues use the existing valid-issue compatibility rule', () => {
  const value = day()
  value.hq.rows[0].safety = { type: 'problem', problems: ['现场围挡缺失', ' '] }
  assert.deepEqual(keys(value, 'safetyQuality'), ['problem'])
})
test('card projection leaves every saved value and numeric statistic unchanged', () => {
  const value = day()
  value.hq.rows[0].camera = { type: 'problem', problems: [{ text: '问题', images: [{ id: 'attachment' }] }] }
  const saved = structuredClone(value), stats = dayStats(value)
  dailyCardStatuses(value)
  assert.deepEqual(value, saved)
  assert.deepEqual(dayStats(value), stats)
})
