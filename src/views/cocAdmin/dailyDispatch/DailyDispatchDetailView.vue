<script setup>
import { computed, nextTick, onMounted, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { useRoute, useRouter, onBeforeRouteLeave, onBeforeRouteUpdate } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowLeft, Calendar, Connection, Close, Edit, Plus, Refresh } from '@element-plus/icons-vue'
import { useCurrentProject } from '../../../composables/useCurrentProject.js'
import { dailyDispatchRepository as repo, dailyProjectOptions, dispatchOperator, DAILY_BASE } from '../../../composables/useDailyDispatchCheck.js'
import { defaultInspectionUser } from '../../../mock/inspectionPersonnel.js'
import { createDailyUnifiedEditSession } from '../../../composables/dailyUnifiedEditSession.js'
import { ledgerReturnLocation } from '../../../composables/dailyDispatchLedgerNavigation.js'
import { DAILY_CHANGE_EVENT, lockKey } from '../../../mock/dailyDispatchCheck.js'
import { clone, emptyPerson, emptyRow, emptyCheck, PART_LABELS, FIELD_LABELS, CHECK_FIELDS, personFilled, isLegacyCheck, isLegacyPerson, deletionReason, validateField, validateHq, personErrors, checkErrors, problemText, formatTime, hqDraftForEditing, hqPayload, NORMAL_PROJECT_TEXT, dayStats } from '../../../utils/dailyDispatchCheckRules.js'
import CheckFieldEditor from './CheckFieldEditor.vue'
import DailyCheckImages from './DailyCheckImages.vue'
import DailyCheckDialog from './DailyCheckDialog.vue'
import DailyPrototypeNote from './DailyPrototypeNote.vue'
import DailyUserPicker from './DailyUserPicker.vue'
import DailyCheckContent from './DailyCheckContent.vue'
import DailyReadField from './DailyReadField.vue'
import DailyCheckStatus from './DailyCheckStatus.vue'
import DailyInspectionTable from './DailyInspectionTable.vue'
import './daily-dispatch-theme.css'
const route = useRoute(), router = useRouter(), { selectedProjectId, isHqSelected } = useCurrentProject()
const date = computed(() => String(route.params.date || ''))
const entry = computed(() => ['unified', 'project'].includes(route.query.entry) ? route.query.entry : route.query.mode === 'edit' ? 'unified' : 'detail')
const day = ref(null), loading = ref(false), saving = ref(false), error = ref(''), projectId = ref(''), projectBusy = ref(false)
const projectTable = ref(null), unifiedSession = createDailyUnifiedEditSession(repo)
const hqDraft = ref(null), hqLock = ref(null), hqOperator = ref(null), hqLost = ref(false), initialRows = ref([]), hqError = ref('')
const editors = reactive({ duty: null, manager: null }), partBusy = reactive({ duty: false, manager: false }), partErrors = reactive({ duty: {}, manager: {} })
const partValidated = reactive({ duty: false, manager: false })
for (const part of Object.keys(PART_LABELS)) watch(() => editors[part]?.draft, draft => {
  if (draft && partValidated[part]) partErrors[part] = personErrors(draft)
}, { deep: true })
const addVisible = ref(false), addId = ref(''), drawerVisible = ref(false), drawerRow = ref(null), drawerBase = ref(''), drawerTab = ref('unified'), drawerErrors = ref({})
const hasEditing = computed(() => !!hqDraft.value || !!editors.duty || !!editors.manager)
const activeHq = computed(() => hqDraft.value || day.value?.hq)
const headers = [{ key: 'focusDepartment', label: '重点调度部门' }, { key: 'attendance', label: '参会情况' }, { key: 'dispatcher', label: '安质部调度人员' }, { key: 'departmentAttendance', label: '各部门参会情况' }]
const remainingProjects = computed(() => dailyProjectOptions().filter(p => !p.hidden && !activeHq.value?.rows.some(r => r.projectId === p.id)))
const title = computed(() => entry.value === 'unified' ? '统一调度检查填写' : entry.value === 'project' ? '项目部检查填写' : 'COC调度会检查记录表详情')
let timer, loadSequence = 0, starting = false, leavePending = null
const confirm = (message, title = '未保存内容') => ElMessageBox.confirm(message, title, { customClass: 'daily-dispatch-confirm', type: 'warning', confirmButtonText: '确认放弃', cancelButtonText: '继续填写' })
function person(part, id = projectId.value) { return day.value?.people?.[id]?.[part] || emptyPerson() }
function partCheck(part) { return (editors[part]?.draft || person(part)).check }
function problemCount(check) { return Array.isArray(check?.problems) ? check.problems.filter(problemText).length : 0 }
function mergeLatest(latest) {
  const pagination = projectTable.value?.getPagination()
  day.value = latest
  if (pagination) nextTick(() => projectTable.value?.restorePagination(pagination))
  if (hqDraft.value) for (const row of latest.hq.rows) if (!hqDraft.value.scopeChanges.removedIds.includes(row.projectId) && !hqDraft.value.rows.some(r => r.projectId === row.projectId)) hqDraft.value.rows.push(clone(row))
}
async function load() {
  const sequence = ++loadSequence
  loading.value = true
  try { const value = await repo.getDay(date.value); if (sequence === loadSequence) { mergeLatest(value); error.value = '' } } catch (e) { if (sequence === loadSequence) error.value = e.message } finally { if (sequence === loadSequence) loading.value = false }
}
async function startHq() {
  if (!isHqSelected.value || hqDraft.value || saving.value || starting) return
  starting = true; loading.value = true
  let lock, denied = false
  try {
    const operator = dispatchOperator(); lock = await unifiedSession.acquire(lockKey(date.value), operator)
    day.value = await repo.prepareHq(date.value, lock, operator)
    hqDraft.value = hqDraftForEditing(day.value); initialRows.value = clone(hqDraft.value.rows)
    hqLock.value = lock; hqOperator.value = operator; hqLost.value = false; hqError.value = ''
  } catch (e) { if (lock) await unifiedSession.release(lock).catch(() => {}); denied = true; ElMessage.warning(e.code === 'DAILY_EDIT_OCCUPIED' ? e.message + '，已返回每日检查台账。' : e.message) } finally { loading.value = false; starting = false }
  if (denied) await returnToDailyLedger()
}
async function cancelHq() {
  if (saving.value) return
  try { await unifiedSession.release(hqLock.value); hqDraft.value = null; hqLock.value = null; hqLost.value = false; drawerVisible.value = false; hqError.value = '' } catch (e) { ElMessage.error(e.message); throw e }
}
async function returnToDailyLedger() {
  const target = ledgerReturnLocation(route.query.returnTo, DAILY_BASE)
  await router.replace({ ...target, query: { ...target.query, tab: 'daily' } })
}
async function submitHq() {
  if (saving.value || hqLost.value || !hqDraft.value) return
  const invalid = validateHq(hqDraft.value, day.value.hq)
  hqError.value = invalid || ''
  if (invalid) return ElMessage.warning(invalid)
  saving.value = true
  let saved = false
  try {
    day.value = await repo.submit({ date: date.value, content: hqPayload(hqDraft.value), version: hqDraft.value.version, lock: hqLock.value, operator: hqOperator.value })
    unifiedSession.finish(hqLock.value); hqDraft.value = null; hqLock.value = null; drawerVisible.value = false; saved = true; ElMessage.success('统一调度检查已保存')
  } catch (e) { if (['DAILY_EDIT_EXPIRED', 'DAILY_EDIT_CONFLICT'].includes(e.code)) hqLost.value = true; ElMessage.error(e.message) } finally { saving.value = false }
  if (saved) await returnToDailyLedger()
}
async function selectProject(id) {
  if (!id || projectBusy.value || (id === projectId.value && drawerVisible.value)) return
  if (!await confirmLeaveParts()) return
  projectBusy.value = true
  try {
    await releaseParts()
    const included = day.value.hq.rows.some(row => row.projectId === id)
    mergeLatest(included ? await repo.getDay(date.value) : await repo.ensureProject(date.value, id))
    const row = day.value.hq.rows.find(row => row.projectId === id)
    if (!row) throw new Error('该项目不在当日检查范围中')
    projectId.value = id; drawerRow.value = clone(row); drawerTab.value = 'project'; drawerVisible.value = true
    return true
  } catch (e) { ElMessage.error(e.message); return false } finally { projectBusy.value = false }
}
async function startPart(part) {
  if (!projectId.value || editors[part] || partBusy[part] || isLegacyPerson(person(part))) return
  partBusy[part] = true
  let lock
  try {
    const operator = dispatchOperator(); lock = await repo.acquire(lockKey(date.value, projectId.value, part), operator)
    mergeLatest(await repo.getDay(date.value))
    const draft = clone(person(part))
    if (!draft.version) {
      draft.check = { ...emptyCheck(), type: 'normal', normalText: NORMAL_PROJECT_TEXT }
      const selected = defaultInspectionUser(projectId.value, part, operator)
      draft.userId = selected?.id || ''; draft.name = selected?.name || ''
    }
    editors[part] = { draft, lock, operator, lost: false }; partErrors[part] = {}; partValidated[part] = false
  } catch (e) { if (lock) await repo.release(lock).catch(() => {}); ElMessage.warning(e.message) } finally { partBusy[part] = false }
}
async function cancelPart(part) { if (partBusy[part]) return; await repo.release(editors[part]?.lock); editors[part] = null; partErrors[part] = {}; partValidated[part] = false }
async function submitPart(part) {
  const editor = editors[part]
  if (!editor || editor.lost || partBusy[part]) return
  partValidated[part] = true
  partErrors[part] = personErrors(editor.draft)
  if (Object.keys(partErrors[part]).length) return ElMessage.warning(Object.values(partErrors[part])[0])
  partBusy[part] = true
  try { mergeLatest(await repo.submit({ date: date.value, projectId: projectId.value, part, content: { userId: editor.draft.userId, check: clone(editor.draft.check) }, version: editor.draft.version, lock: editor.lock, operator: editor.operator })); editors[part] = null; partErrors[part] = {}; partValidated[part] = false; ElMessage.success(PART_LABELS[part] + '已保存') } catch (e) { ElMessage.error(e.message) } finally { partBusy[part] = false }
}
function openRow(row) {
  if (entry.value === 'project') return selectProject(row.projectId)
  drawerRow.value = { ...clone(row), personnel: clone(row.personnel || { type: '', text: '' }), remark: clone(row.remark || { text: '', images: [] }) }
  for (const key of CHECK_FIELDS) drawerRow.value[key] = clone(row[key] || emptyCheck())
  drawerBase.value = JSON.stringify(drawerRow.value); drawerTab.value = 'unified'; drawerErrors.value = {}; drawerVisible.value = true
}
async function closeDrawer(done) {
  if (entry.value === 'project') {
    if (!await confirmLeaveParts('关闭抽屉')) return
    await releaseParts()
  }
  if (hqDraft.value && JSON.stringify(drawerRow.value) !== drawerBase.value) { try { await confirm('抽屉中有尚未应用的修改，关闭后将放弃。是否继续？') } catch { return } }
  done()
}
function applyRow() {
  if (!hqDraft.value || hqLost.value) return
  const errors = {}
  for (const key of ['personnel', ...CHECK_FIELDS, 'remark']) {
    if (isLegacyCheck(drawerRow.value[key]) && drawerRow.value[key]?.type !== 'problem') continue
    if (CHECK_FIELDS.includes(key)) { const value = checkErrors(drawerRow.value[key]); if (Object.keys(value).length) errors[key] = value }
    else { const value = validateField(key, drawerRow.value[key]); if (value) errors[key] = value }
  }
  drawerErrors.value = errors
  if (Object.keys(errors).length) { drawerTab.value = 'unified'; return ElMessage.warning('请完善当前项目的检查内容') }
  const changed = JSON.stringify(drawerRow.value) !== drawerBase.value
  const index = hqDraft.value.rows.findIndex(r => r.projectId === drawerRow.value.projectId)
  if (index >= 0) hqDraft.value.rows[index] = { ...clone(drawerRow.value), ...(changed ? { _manualEdited: true } : {}) }
  drawerVisible.value = false; ElMessage.info('已应用到本页，页面保存后生效')
}
async function removeRow(row) {
  if (!hqDraft.value || hqLost.value) return
  try {
    const latest = await repo.getDay(date.value); mergeLatest(latest)
    const reason = deletionReason(row, latest.people[row.projectId], latest.hq.rows.find(r => r.projectId === row.projectId), initialRows.value.find(r => r.projectId === row.projectId))
    if (reason) return ElMessage.warning(reason)
    await ElMessageBox.confirm('确认从当日表单移除“' + row.projectName + '”？仅有未保存初始值的项目可以移除，项目基础资料不变。', '删除项目行', { customClass: 'daily-dispatch-confirm', type: 'warning', confirmButtonText: '确认删除', cancelButtonText: '取消' })
    hqDraft.value.rows = hqDraft.value.rows.filter(r => r.projectId !== row.projectId)
    if (!hqDraft.value.scopeChanges.removedIds.includes(row.projectId)) hqDraft.value.scopeChanges.removedIds.push(row.projectId)
    hqDraft.value.scopeChanges.addedIds = hqDraft.value.scopeChanges.addedIds.filter(id => id !== row.projectId)
  } catch (e) { if (!['cancel', 'close'].includes(e)) ElMessage.error(e.message) }
}
async function addRow() {
  const project = remainingProjects.value.find(p => p.id === addId.value)
  if (!project) return ElMessage.warning('请选择尚未纳入的未隐藏项目')
  if (entry.value === 'project') {
    if (await selectProject(project.id)) { addVisible.value = false; addId.value = '' }
    return
  }
  if (!hqDraft.value) return
  const historical = day.value.removedRows?.[project.id]
  hqDraft.value.rows.push(historical ? clone(historical) : emptyRow(project))
  hqDraft.value.scopeChanges.removedIds = hqDraft.value.scopeChanges.removedIds.filter(id => id !== project.id)
  if (!day.value.hq.rows.some(r => r.projectId === project.id) && !hqDraft.value.scopeChanges.addedIds.includes(project.id)) hqDraft.value.scopeChanges.addedIds.push(project.id)
  addVisible.value = false; addId.value = ''
}
async function confirmLeaveParts(action = '切换项目') {
  if (partBusy.duty || partBusy.manager || saving.value || starting) { ElMessage.warning('正在处理，请稍后操作'); return false }
  if (!editors.duty && !editors.manager) return true
  try { await confirm(`当前项目有未保存内容，${action}后将放弃本次修改。是否继续？`); return true } catch { return false }
}
async function releaseParts() { await Promise.all(['duty', 'manager'].map(cancelPart)) }
async function leave() {
  if (leavePending) return leavePending
  leavePending = (async () => {
    if (saving.value || partBusy.duty || partBusy.manager || starting || projectBusy.value) { ElMessage.warning('正在处理，请稍后离开'); return false }
    if (hasEditing.value) { try { await confirm('当前有未保存内容，离开后将放弃本次修改。是否继续？') } catch { return false } }
    try { await cancelHq(); await releaseParts(); return true } catch { return false }
  })()
  try { return await leavePending } finally { leavePending = null }
}
onBeforeRouteLeave(async () => {
  const allowed = await leave()
  if (!allowed && selectedProjectId.value !== 'hq') selectedProjectId.value = 'hq'
  return allowed
})
onBeforeRouteUpdate(async (to, from) => to.fullPath === from.fullPath || await leave())
async function initialize() { day.value = null; projectId.value = ''; if (!isHqSelected.value) return router.replace('/workbench'); await load(); if (entry.value === 'unified') { if (day.value) await startHq(); else { ElMessage.warning(error.value || '检查记录暂不可用'); await returnToDailyLedger() } } if (day.value && entry.value === 'project' && route.query.projectId) await selectProject(String(route.query.projectId)) }
watch(() => route.fullPath, initialize)
async function onSaved(event) { if (event.detail?.date === date.value) await load() }
function beforeUnload(event) { if (hasEditing.value) { event.preventDefault(); event.returnValue = '' } }
async function renewLocks() {
  if (hqLock.value && !hqLost.value) try { await repo.renew(hqLock.value) } catch (e) { hqLost.value = true; ElMessage.error(e.message) }
  for (const part of ['duty', 'manager']) if (editors[part] && !editors[part].lost) try { await repo.renew(editors[part].lock) } catch (e) { if (editors[part]) editors[part].lost = true; ElMessage.error(e.message) }
}
onMounted(() => { initialize(); window.addEventListener(DAILY_CHANGE_EVENT, onSaved); window.addEventListener('beforeunload', beforeUnload); timer = setInterval(renewLocks, 30000) })
onBeforeUnmount(() => { loadSequence++; clearInterval(timer); window.removeEventListener(DAILY_CHANGE_EVENT, onSaved); window.removeEventListener('beforeunload', beforeUnload); unifiedSession.release(hqLock.value).catch(() => {}); for (const part of ['duty', 'manager']) repo.release(editors[part]?.lock).catch(() => {}) })
</script>

<template>
  <div v-if="isHqSelected && (entry !== 'unified' || hqDraft)" v-loading="loading" class="qm-page daily-dispatch-detail">
    <div class="page-card daily-detail-heading">
      <div class="page-header">
        <div class="page-breadcrumb">调度中心 / 每日调度检查 / {{ title }}</div>
        <div class="title-row daily-detail-title-row">
          <el-button :icon="ArrowLeft" link @click="entry === 'unified' ? returnToDailyLedger() : router.push(ledgerReturnLocation(route.query.returnTo, DAILY_BASE))">返回</el-button>
          <h1 class="page-title">{{ title }}</h1>
          <span class="daily-heading-date" :aria-label="`检查日期：${date}`"><el-icon aria-hidden="true"><Calendar /></el-icon><time :datetime="date">{{ date }}</time></span>
          <DailyPrototypeNote />
        </div>
      </div>
      <div class="daily-heading-actions"><el-button :icon="Refresh" :disabled="starting" @click="load">刷新内容</el-button></div>
    </div>
    <el-alert v-if="error" :title="error" type="error" :closable="false" show-icon /><el-alert v-if="hqLost" title="编辑会话已失效，本次不能保存。请返回台账后重新进入填写。" type="error" :closable="false" show-icon />
    <template v-if="day && entry !== 'project'">
      <section class="page-card daily-detail-section"><h2 class="daily-section-title">基本信息</h2><el-descriptions :column="2" border class="daily-header-form"><el-descriptions-item v-for="field in headers" :key="field.key"><template #label>{{ field.label }}</template><template v-if="hqDraft"><template v-if="field.key === 'dispatcher'"><DailyUserPicker v-model="hqDraft.headers.dispatcherId" scope="dispatch" label="安质部调度人员" :disabled="hqLost" placeholder="请选择人员（选填）" @selected="hqDraft.headers.dispatcher = $event?.name || ''" /></template><el-input v-else v-model="hqDraft.headers[field.key]" :aria-label="field.label" :placeholder="`请输入${field.label}`" maxlength="200" :disabled="hqLost" /></template><span v-else>{{ day.hq.headers[field.key] || '--' }}</span></el-descriptions-item></el-descriptions><p v-if="hqError" class="daily-validation-error" role="alert">{{ hqError }}</p></section>
      <section class="page-card daily-detail-section daily-inspection-summary-section">
        <div class="daily-section-toolbar">
          <div class="daily-summary-heading">
            <h2 class="daily-section-title">检查情况</h2>
            <div class="daily-stats-summary" aria-label="当日项目检查统计">
              <span class="daily-stats-item"><span class="daily-stats-label">项目总数：</span><span class="daily-stats-value">{{ activeHq.rows.length }}</span></span>
              <span class="daily-stats-item"><span class="daily-stats-label">当日统一调度项目数：</span><span class="daily-stats-value">{{ hqDraft ? activeHq.rows.filter(r => r.unified).length : dayStats(day).unified ?? '--' }}</span></span>
            </div>
          </div>
          <el-button v-if="hqDraft" :icon="Plus" :disabled="hqLost" @click="addVisible = true">添加项目</el-button>
        </div>
        <DailyInspectionTable :rows="activeHq.rows" :people="day.people" :editing="!!hqDraft" :disabled="hqLost" @open="openRow" @remove="removeRow" @unified="(row, value) => row.unified = value" />
      </section>
      <section class="page-card daily-detail-section daily-overall-note"><h2 class="daily-section-title">备注</h2><el-input v-if="hqDraft" v-model="hqDraft.note" type="textarea" :autosize="{ minRows: 3, maxRows: 8 }" maxlength="500" show-word-limit placeholder="请输入当日整体备注（选填）" aria-label="当日整体备注" :disabled="hqLost" /><p v-else class="daily-read-text">{{ day.hq.note || '--' }}</p></section>
      <div v-if="hqDraft" class="page-card daily-detail-footer"><el-button :disabled="saving" @click="returnToDailyLedger">取消</el-button><el-button type="primary" :loading="saving" :disabled="hqLost" @click="submitHq">保存</el-button></div>
    </template>
    <section v-if="day && entry === 'project'" class="page-card daily-detail-section daily-inspection-summary-section">
      <div class="daily-section-toolbar">
        <div class="daily-summary-heading"><h2 class="daily-section-title">检查情况</h2><div class="daily-stats-summary"><span>项目总数：{{ day.hq.rows.length }}</span><span>值班人员已填写：{{ day.hq.rows.filter(row => personFilled(day.people[row.projectId]?.duty)).length }}</span><span>项目经理已填写：{{ day.hq.rows.filter(row => personFilled(day.people[row.projectId]?.manager)).length }}</span></div></div>
        <el-button :icon="Plus" :disabled="projectBusy" @click="addVisible = true">添加项目</el-button>
      </div>
      <DailyInspectionTable ref="projectTable" :rows="day.hq.rows" :people="day.people" :disabled="projectBusy" project-only @open="openRow" />
    </section>
    <DailyCheckDialog v-model="addVisible" title="添加项目" width="600px"><el-form label-position="top"><el-form-item label="项目名称"><el-select v-model="addId" filterable placeholder="请选择未隐藏项目" aria-label="添加项目名称"><el-option v-for="project in remainingProjects" :key="project.id" :label="project.projectName" :value="project.id" /></el-select></el-form-item></el-form><template #footer><el-button @click="addVisible = false">取消</el-button><el-button type="primary" @click="addRow">添加</el-button></template></DailyCheckDialog>
    <el-drawer v-model="drawerVisible" size="var(--daily-drawer-width)" append-to-body class="daily-dispatch-drawer" modal-class="daily-dispatch-drawer-overlay" :with-header="false" :close-on-click-modal="!hasEditing" :before-close="closeDrawer" destroy-on-close>
      <template v-if="drawerRow">
        <div class="daily-drawer-topbar">
          <h2 class="daily-drawer-project-name">{{ drawerRow.projectName }}</h2>
          <el-button :icon="Close" link aria-label="关闭项目检查抽屉" class="daily-drawer-close" @click="closeDrawer(() => drawerVisible = false)" />
        </div>
        <p class="daily-drawer-context" :class="{ 'daily-drawer-project-date': entry === 'project' }"><el-icon aria-hidden="true"><Calendar /></el-icon><span>检查日期：</span><strong>{{ date }}</strong></p>
        <div v-if="entry !== 'project'" class="daily-drawer-context daily-drawer-unified"><el-icon aria-hidden="true"><Connection /></el-icon><span>当日统一调度：</span><el-checkbox v-if="hqDraft" v-model="drawerRow.unified" :disabled="hqLost" aria-label="抽屉当日统一调度" /><strong v-else>{{ drawerRow.unified ? '是' : '否' }}</strong></div>
        <div v-if="entry === 'project'" class="daily-drawer-project-scroll">
            <div class="daily-drawer-project-fields daily-drawer-edit-form">
              <DailyReadField v-for="(label, part) in PART_LABELS" :key="part" :label="label" :expand-when="!!editors[part]" :expand-on-error="!!editors[part]?.lost || Object.keys(partErrors[part]).length > 0" class="daily-drawer-edit-group daily-project-part" :data-testid="`project-${part}`">
                <template #summary><DailyCheckStatus :status="partCheck(part)?.type" /><span v-if="!partCheck(part)?.type" class="daily-read-empty">--</span></template>
                <template #actions><el-button v-if="!editors[part] && !isLegacyPerson(person(part))" link type="primary" :icon="Edit" :loading="partBusy[part]" @click="startPart(part)">{{ personFilled(person(part)) ? '编辑' : '填写' }}</el-button></template>
                <el-alert v-if="editors[part]?.lost" type="error" title="编辑会话已失效，请取消后重新进入。" :closable="false" />
                <el-form v-if="editors[part]" label-position="top" :disabled="editors[part].lost || partBusy[part]" class="daily-project-part-form">
                  <el-form-item label="姓名" required :error="partErrors[part].name"><DailyUserPicker v-model="editors[part].draft.userId" :scope="projectId" :label="label + '姓名'" :show-invalid-hint="false" @selected="editors[part].draft.name = $event?.name || ''" /></el-form-item>
                  <el-form-item label="项目检查情况" required><CheckFieldEditor v-model="editors[part].draft.check" person :label="label" :errors="partErrors[part]" /></el-form-item>
                  <el-form-item v-if="['normal', 'other'].includes(editors[part].draft.check.type)" label="检查情况截图" required :error="partErrors[part].images"><DailyCheckImages v-if="editors[part].draft.check.type === 'normal'" v-model="editors[part].draft.check.normalImages" required /><DailyCheckImages v-else v-model="editors[part].draft.check.otherImages" required /></el-form-item>
                  <div class="daily-part-actions"><el-button :disabled="partBusy[part]" @click="cancelPart(part)">取消</el-button><el-button type="primary" :loading="partBusy[part]" @click="submitPart(part)">保存</el-button></div>
                </el-form>
                <template v-else><dl class="daily-read-person-meta"><div><dt>姓名</dt><dd>{{ person(part).name || '--' }}</dd></div><div><dt>最近更新时间</dt><dd>{{ formatTime(person(part).updatedAt) }}</dd></div></dl><DailyCheckContent :value="person(part)" person :show-status="false" /></template>
              </DailyReadField>
            </div>
        </div>
        <el-tabs v-else v-model="drawerTab" class="daily-drawer-tabs">
          <el-tab-pane label="统一调度检查情况" name="unified">
            <div v-if="!hqDraft" class="daily-drawer-read-fields">
              <DailyCheckContent v-for="key in ['personnel', ...CHECK_FIELDS]" :key="key" :value="drawerRow[key]" :personnel="key === 'personnel'" :label="FIELD_LABELS[key]" detail />
              <DailyReadField label="备注" :collapsible="!!(drawerRow.remark.text?.trim() || drawerRow.remark.images?.length)" :show-body="!!(drawerRow.remark.text?.trim() || drawerRow.remark.images?.length)">
                <template #summary><span v-if="!drawerRow.remark.text?.trim() && !drawerRow.remark.images?.length" class="daily-read-empty">--</span></template>
                <p v-if="drawerRow.remark.text?.trim()" class="daily-read-note-text">{{ drawerRow.remark.text }}</p>
                <DailyCheckImages v-if="drawerRow.remark.images?.length" :model-value="drawerRow.remark.images" readonly />
              </DailyReadField>
            </div>
            <el-form v-else label-position="top" class="daily-drawer-edit-form">
              <DailyReadField v-for="key in ['personnel', ...CHECK_FIELDS]" :key="key" :label="FIELD_LABELS[key]" :expand-on-error="Boolean(drawerErrors[key])" class="daily-drawer-edit-group">
                <template #summary><DailyCheckStatus :status="drawerRow[key]?.type" :count="drawerRow[key]?.type === 'problem' ? problemCount(drawerRow[key]) : undefined" /></template>
                <el-form-item class="daily-state-field" :error="typeof drawerErrors[key] === 'string' ? drawerErrors[key] : ''">
                  <template v-if="!isLegacyCheck(drawerRow[key])"><CheckFieldEditor v-model="drawerRow[key]" :kind="key === 'personnel' ? 'personnel' : 'check'" :label="FIELD_LABELS[key]" :errors="typeof drawerErrors[key] === 'object' ? drawerErrors[key] : {}" /></template>
                  <template v-else-if="key === 'personnel'"><DailyCheckContent :value="drawerRow[key]" personnel /></template>
                  <DailyCheckContent v-else :value="drawerRow[key]" />
                  <span v-if="isLegacyCheck(drawerRow[key])" class="page-tip">旧格式内容保留，不进行自动转换。</span>
                </el-form-item>
              </DailyReadField>
              <DailyReadField label="备注" :expand-on-error="Boolean(drawerErrors.remark)" class="daily-drawer-edit-group">
                <el-form-item class="daily-drawer-remark" :error="drawerErrors.remark || ''">
                  <el-input v-model="drawerRow.remark.text" type="textarea" :rows="3" maxlength="100" aria-label="项目备注" />
                  <DailyCheckImages v-model="drawerRow.remark.images" />
                </el-form-item>
              </DailyReadField>
            </el-form>
          </el-tab-pane>
          <el-tab-pane label="项目部检查情况" name="project">
            <div class="daily-drawer-project-fields">
              <DailyReadField v-for="(label, part) in PART_LABELS" :key="part" :label="label" class="daily-drawer-person">
                <dl class="daily-read-person-meta">
                  <div><dt>姓名</dt><dd :class="{ 'daily-read-empty': !person(part, drawerRow.projectId).name }">{{ person(part, drawerRow.projectId).name || '--' }}</dd></div>
                  <div><dt>最近更新时间</dt><dd :class="{ 'daily-read-empty': !person(part, drawerRow.projectId).updatedAt }">{{ formatTime(person(part, drawerRow.projectId).updatedAt) }}</dd></div>
                </dl>
                <DailyCheckContent :value="person(part, drawerRow.projectId)" person detail label="项目检查情况" />
              </DailyReadField>
            </div>
          </el-tab-pane>
        </el-tabs>
      </template>
      <template v-if="hqDraft" #footer><el-button @click="closeDrawer(() => drawerVisible = false)">取消</el-button><el-button v-if="hqDraft" type="primary" :disabled="hqLost" @click="applyRow">应用到当前表单</el-button></template>
      <template v-else-if="entry === 'project'" #footer><el-button @click="closeDrawer(() => drawerVisible = false)">关闭</el-button></template>
    </el-drawer>
  </div>
  <div v-else-if="isHqSelected" v-loading="true" class="qm-page page-card daily-dispatch-admission" aria-label="正在检查填写占用" />
</template>
<style scoped>
.daily-detail-heading, .daily-section-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
.daily-detail-title-row { gap: 12px; flex-wrap: wrap; }
.daily-heading-project { display: inline-flex; align-items: center; min-width: 0; max-width: min(360px, 34vw); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--ap-text-secondary, #606266); font-size: 14px; font-weight: 400; line-height: 20px; }
.daily-heading-project-separator { margin-right: 8px; flex-shrink: 0; }
.daily-heading-project-name { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.daily-heading-date { display: inline-flex; align-items: center; gap: 6px; padding-left: 14px; border-left: 1px solid var(--ap-border); color: var(--ap-text-secondary, #606266); font-size: 14px; font-weight: 400; line-height: 20px; white-space: nowrap; font-variant-numeric: tabular-nums; }
.daily-heading-date .el-icon { font-size: 14px; }
.daily-summary-heading { display: flex; flex-direction: column; align-items: flex-start; gap: 8px; min-width: 0; }
.daily-stats-summary { display: flex; flex-wrap: wrap; align-items: baseline; column-gap: 24px; row-gap: 6px; font-size: 14px; line-height: 20px; }
.daily-stats-item { display: inline-flex; align-items: baseline; white-space: nowrap; }
.daily-stats-label { color: var(--ap-text-secondary, #606266); font-weight: 400; }
.daily-stats-value { color: var(--ap-text, #303133); font-weight: 500; font-variant-numeric: tabular-nums; }
.daily-inspection-summary-section > .daily-section-toolbar { margin-bottom: 2px; }
.daily-heading-actions { display: flex; gap: 8px; flex-wrap: wrap; }
.daily-heading-actions .el-button + .el-button { margin-left: 0; }
.daily-detail-section { display: flex; flex-direction: column; gap: 14px; min-width: 0; }
.daily-section-title { font-size: 16px; font-weight: 600; margin: 0; color: var(--ap-text); }
.daily-header-form :deep(.el-descriptions__table) { table-layout: fixed; }
.daily-header-form :deep(.el-descriptions__label) { width: 14%; }
.daily-header-form :deep(.el-descriptions__content) { overflow-wrap: anywhere; }
.daily-header-form :deep(.el-descriptions__content:nth-child(2)) { width: 26%; }
.daily-header-form :deep(.el-descriptions__content:nth-child(4)) { width: 46%; }
.daily-header-form :deep(.daily-user-picker .el-select) { min-width: 0; }
.daily-header-form :deep(.el-descriptions__cell) { padding: 12px 14px; }
.daily-required, .daily-validation-error { color: var(--el-color-danger); }
.daily-validation-error { font-size: 12px; margin: 0; }
.daily-read-text { white-space: pre-wrap; overflow-wrap: anywhere; line-height: 1.7; margin: 0; }
.daily-overall-note .daily-read-text { font-size: 14px; }
.daily-overall-note :deep(.el-textarea__inner) { font-size: 14px; }
.daily-detail-footer { display: flex; justify-content: flex-end; gap: 12px; position: sticky; bottom: 0; z-index: 5; box-shadow: 0 -3px 12px rgba(0,0,0,.04); }
.daily-detail-footer .el-button + .el-button { margin-left: 0; }
.daily-part-actions { display: flex; justify-content: flex-end; gap: 8px; }
.daily-project-picker-section { padding-top: 12px; padding-bottom: 12px; gap: 0; container: daily-project-picker / inline-size; }
.daily-project-picker-form { display: flex; align-items: center; flex-wrap: wrap; }
.daily-project-picker-form :deep(.el-form-item) { margin-bottom: 0; margin-right: 0; align-items: center; }
.daily-project-picker-form :deep(.el-form-item__label) { margin-bottom: 0; }
.daily-project-picker-form :deep(.el-select) { width: min(520px, 48cqw); max-width: 100%; min-width: 0; }
.daily-project-picker-form :deep(.el-form-item__content) { min-width: 0; }
.daily-project-card { flex-shrink: 0; }
.daily-project-card > .daily-section-toolbar { min-height: 32px; padding-bottom: 12px; border-bottom: 1px solid var(--ap-border); }
.daily-project-card-body { display: flex; flex-direction: column; gap: 14px; min-width: 0; font-size: 14px; container: daily-project-layout / inline-size; }
.daily-project-form { display: flex; flex-direction: column; gap: 20px; width: 100%; min-width: 0; }
.daily-project-form-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); align-items: start; column-gap: 24px; row-gap: 20px; min-width: 0; }
.daily-project-form :deep(.el-form-item) { min-width: 0; margin-bottom: 0; }
.daily-project-form :deep(.el-form-item__content) { min-width: 0; width: 100%; }
.daily-project-form :deep(.el-form-item__label) { font-size: 14px; line-height: 22px; font-weight: 400; margin-bottom: 8px; }
.daily-project-form :deep(.daily-user-picker) { max-width: none; width: 100%; }
.daily-project-form :deep(.el-select), .daily-project-form :deep(.dispatch-check-field > .el-select) { width: 100%; min-width: 0; max-width: 100%; }
.daily-project-form :deep(.daily-problem-heading label) { font-size: 14px; }
.daily-project-form :deep(.el-form-item__error) { position: static; padding-top: 4px; }
.daily-project-issues { min-width: 0; }
.daily-project-form .daily-part-actions { margin-top: 2px; padding-top: 16px; border-top: 1px solid var(--ap-border); }
.daily-project-readonly { display: flex; flex-direction: column; gap: 16px; min-width: 0; }
.daily-project-read-meta { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px 24px; margin: 0; }
.daily-project-read-meta > div { display: flex; align-items: baseline; gap: 12px; min-width: 0; }
.daily-project-read-meta dt, .daily-project-read-label { flex-shrink: 0; font-size: 14px; line-height: 22px; color: var(--ap-text-secondary); }
.daily-project-read-meta dd { min-width: 0; margin: 0; line-height: 22px; overflow-wrap: anywhere; }
.daily-project-read-result { display: flex; align-items: flex-start; gap: 12px; min-width: 0; border-top: 1px solid var(--ap-border); padding-top: 14px; }
.daily-project-read-result > .daily-check-content { flex: 1 1 auto; }
@container daily-project-layout (max-width: 700px) {
  .daily-project-form-grid, .daily-project-read-meta { grid-template-columns: minmax(0, 1fr); }
}
@container daily-project-layout (max-width: 440px) {
  .daily-project-read-result { flex-direction: column; gap: 6px; }
}
.daily-detail-section :deep(.el-select) { min-width: 260px; max-width: 100%; }
.daily-project-picker-section :deep(.el-select), .daily-project-form :deep(.el-select) { min-width: 0; }
@media (max-width: 800px) { .daily-header-form :deep(.el-descriptions__cell) { padding: 8px; } }
</style>
<style>
.daily-dispatch-drawer.el-drawer { --daily-drawer-width: 30%; min-width: min(360px, calc(100vw - 32px)); max-width: calc(100vw - 32px); max-height: 100dvh; }
.daily-dispatch-drawer-overlay.el-overlay { background-color: rgba(0, 0, 0, .28); }
.daily-dispatch-drawer .el-drawer__header, .daily-dispatch-drawer .el-drawer__footer { flex: 0 0 auto; }
.daily-dispatch-drawer .el-drawer__header { margin-bottom: 0; padding: 16px 20px; border-bottom: 1px solid var(--ap-border); overflow-wrap: anywhere; }
.daily-dispatch-drawer .el-drawer__body { display: flex; flex-direction: column; overflow: hidden; min-height: 0; padding: 0; }
.daily-dispatch-drawer .daily-drawer-topbar { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; flex: 0 0 auto; border-bottom: 1px solid var(--ap-border); padding: 16px 20px; }
.daily-dispatch-drawer .daily-drawer-project-name { margin: 0; font-size: 17px; font-weight: 600; line-height: 1.5; overflow-wrap: anywhere; color: var(--ap-text); }
.daily-dispatch-drawer .daily-drawer-close { flex-shrink: 0; margin-top: 0; }
.daily-dispatch-drawer .daily-drawer-context { flex: 0 0 auto; margin: 0; padding: 15px 20px 0; color: var(--ap-text-secondary); }
.daily-dispatch-drawer .daily-drawer-project-date { padding-bottom: 5px; }
.daily-dispatch-drawer .daily-drawer-tabs { display: flex; flex-direction: column; flex: 1 1 auto; min-height: 0; overflow: hidden; margin: 0 20px; }
.daily-dispatch-drawer .daily-drawer-tabs > .el-tabs__header { flex: 0 0 auto; margin: 0; }
.daily-dispatch-drawer .daily-drawer-project-scroll { flex: 1 1 auto; margin: 0 20px; }
.daily-dispatch-drawer .daily-drawer-project-scroll,
.daily-dispatch-drawer .daily-drawer-tabs > .el-tabs__content { flex: 1 1 auto; min-height: 0; overflow-y: auto; overflow-x: hidden; overscroll-behavior: contain; padding: 12px 2px 20px 0; scrollbar-width: thin; scrollbar-color: var(--el-border-color-dark, #c3c8d0) transparent; }
.daily-dispatch-drawer .daily-drawer-tabs > .el-tabs__content::-webkit-scrollbar { width: 6px; }
.daily-dispatch-drawer .daily-drawer-tabs > .el-tabs__content::-webkit-scrollbar-track { background: transparent; }
.daily-dispatch-drawer .daily-drawer-tabs > .el-tabs__content::-webkit-scrollbar-thumb { background: var(--el-border-color-dark, #c3c8d0); border-radius: 6px; }
.daily-dispatch-drawer .daily-drawer-tabs > .el-tabs__content::-webkit-scrollbar-thumb:hover { background: var(--el-text-color-placeholder, #a7aeb9); }
.daily-dispatch-drawer .el-drawer__footer { border-top: 1px solid var(--ap-border); padding: 12px 20px; }
.daily-dispatch-drawer .el-form-item { margin-bottom: 18px; }
.daily-dispatch-drawer .el-form-item__label { margin-bottom: 6px; line-height: 20px; }
.daily-dispatch-drawer .el-form-item__content { min-width: 0; }
/* Editable groups use the same collapsible section component as read-only groups. */
.daily-dispatch-drawer .daily-drawer-edit-form { display: flex; flex-direction: column; gap: 12px; min-width: 0; }
.daily-dispatch-drawer .daily-drawer-edit-form > .daily-drawer-edit-group { width: 100%; box-sizing: border-box; }
.daily-dispatch-drawer .daily-drawer-edit-group > .daily-read-field-body > .el-form-item { margin: 0; min-width: 0; }
.daily-dispatch-drawer .daily-drawer-edit-group > .daily-read-field-body > .el-form-item > .el-form-item__content { display: flex; flex-direction: column; align-items: stretch; gap: 10px; min-width: 0; }
.daily-dispatch-drawer .daily-drawer-edit-form .dispatch-check-field > .el-select { width: 100%; max-width: 100%; }
.daily-dispatch-drawer .daily-drawer-edit-form .dispatch-problem-input { gap: 8px; padding: 12px; background: var(--ap-bg-soft); }
.daily-dispatch-drawer .daily-drawer-edit-form .daily-problem-heading label { font-size: 14px; font-weight: 500; color: var(--ap-text); }
.daily-dispatch-drawer .daily-drawer-edit-form .daily-image-label { font-size: 13px; line-height: 20px; }
.daily-dispatch-drawer .daily-drawer-edit-form .el-form-item__error { position: static; padding: 0; line-height: 18px; }
.daily-dispatch-drawer .daily-drawer-edit-form .el-input__count { background: transparent; }
.daily-dispatch-drawer .daily-drawer-edit-form .ap-attach-grid { gap: 8px; }
.daily-dispatch-drawer .daily-drawer-edit-form .ap-attach-hint { margin-top: 6px; }
.daily-person-descriptions { --daily-person-label-width: 132px; }
.daily-person-descriptions .el-descriptions__table { table-layout: fixed; width: 100%; }
.daily-person-descriptions .el-descriptions__label.el-descriptions__cell { width: var(--daily-person-label-width); vertical-align: top; font-weight: 500; }
.daily-person-descriptions .el-descriptions__content.el-descriptions__cell { overflow-wrap: anywhere; }
@media (max-width: 480px) {
  .daily-person-descriptions { --daily-person-label-width: 112px; }
  .daily-dispatch-drawer .el-drawer__header { padding: 14px 16px; }
  .daily-dispatch-drawer .daily-drawer-topbar { padding: 14px 16px; }
  .daily-dispatch-drawer .daily-drawer-context { padding-left: 16px; padding-right: 16px; }
  .daily-dispatch-drawer .daily-drawer-project-scroll,
  .daily-dispatch-drawer .daily-drawer-tabs { margin-left: 16px; margin-right: 16px; }
  .daily-dispatch-drawer .el-drawer__footer { padding: 12px 16px; }
}
/* Consistent read-only hierarchy and spacing across the two tabs. */
.daily-dispatch-drawer .daily-drawer-read-fields,
.daily-dispatch-drawer .daily-drawer-project-fields { display: flex; flex-direction: column; gap: 12px; min-width: 0; }
.daily-dispatch-drawer .daily-read-note-text { margin: 0; color: var(--ap-text); white-space: pre-wrap; overflow-wrap: anywhere; font-size: 14px; line-height: 1.65; }
.daily-dispatch-drawer .daily-read-empty { color: var(--ap-text-muted); }
.daily-dispatch-drawer .daily-drawer-project-fields .daily-read-person-meta { display: grid; grid-template-columns: minmax(0, 1fr); gap: 8px; margin: 0 0 12px; font-size: 14px; }
.daily-dispatch-drawer .daily-drawer-project-fields .daily-read-person-meta > div { display: grid; grid-template-columns: 90px minmax(0, 1fr); gap: 12px; align-items: baseline; }
.daily-dispatch-drawer .daily-drawer-project-fields .daily-read-person-meta dt { color: var(--ap-text-secondary); font-size: 13px; }
.daily-dispatch-drawer .daily-drawer-project-fields .daily-read-person-meta dd { margin: 0; font-size: 14px; color: var(--ap-text); overflow-wrap: anywhere; }
.daily-dispatch-drawer .daily-drawer-project-fields .daily-read-person-meta dd.daily-read-empty { color: var(--ap-text-muted); }
.daily-dispatch-drawer .daily-drawer-project-fields .daily-read-field { margin: 0; }
.daily-dispatch-drawer .daily-drawer-project-fields .daily-read-field .daily-read-field { width: 100%; max-width: 100%; box-sizing: border-box; border: 0; border-top: 1px solid var(--ap-border); border-radius: 0; margin-top: 8px; }
.daily-dispatch-drawer .daily-drawer-project-fields .daily-read-field .daily-read-field > .daily-read-field-header { background: transparent; }
.daily-dispatch-drawer .daily-drawer-project-fields .daily-read-field .daily-read-field > .daily-read-field-header .daily-read-field-toggle { display: grid; grid-template-columns: 90px minmax(0, 1fr) auto; column-gap: 12px; width: 100%; padding: 10px 0; }
.daily-dispatch-drawer .daily-drawer-project-fields .daily-read-field .daily-read-field > .daily-read-field-header .daily-read-field-title { font-size: 13px; font-weight: 400; line-height: 22px; color: var(--ap-text-secondary); }
.daily-dispatch-drawer .daily-drawer-project-fields .daily-read-field .daily-read-field > .daily-read-field-header .daily-read-field-summary { min-width: 0; font-size: 14px; }
.daily-dispatch-drawer .daily-drawer-project-fields .daily-read-field .daily-read-field > .daily-read-field-body { width: 100%; padding: 4px 0 2px; box-sizing: border-box; }
@media (max-width: 480px) { .daily-dispatch-drawer .daily-drawer-project-fields .daily-read-field .daily-read-field > .daily-read-field-header .daily-read-field-toggle { grid-template-columns: 76px minmax(0, 1fr) auto; column-gap: 10px; } }
/* Keep all drawer typography inside the teleported drawer, not other pages. */
.daily-dispatch-drawer.el-drawer { --el-font-size-base: 14px; font-family: var(--el-font-family, 'Microsoft YaHei', sans-serif); font-size: 14px; font-weight: 400; line-height: 22px; }
.daily-dispatch-drawer .el-tabs__item, .daily-dispatch-drawer .el-form-item__label, .daily-dispatch-drawer .el-select__placeholder, .daily-dispatch-drawer .el-input__inner, .daily-dispatch-drawer .el-textarea__inner { font-size: 14px; }
.daily-dispatch-drawer .daily-drawer-context { display: flex; align-items: center; gap: 6px; font-size: 13px; line-height: 20px; }
.daily-dispatch-drawer .daily-drawer-context .el-icon { font-size: 14px; flex: 0 0 auto; }
.daily-dispatch-drawer .daily-drawer-context strong { font-weight: 500; font-variant-numeric: tabular-nums; color: var(--ap-text); }
.daily-dispatch-drawer .daily-drawer-unified { margin: 0; padding-top: 8px; padding-bottom: 8px; }
.daily-dispatch-drawer .daily-drawer-unified .el-checkbox { height: auto; white-space: normal; }
.daily-dispatch-drawer .daily-drawer-unified .el-checkbox__label { font-size: 14px; }
.daily-dispatch-drawer .daily-project-part > .daily-read-field-header .daily-read-field-toggle { padding-right: 6px; gap: 6px; }
.daily-dispatch-drawer .daily-project-part > .daily-read-field-header .daily-read-field-summary { margin-left: auto; flex-shrink: 0; }
.daily-dispatch-drawer .daily-project-part > .daily-read-field-header .daily-read-field-actions { padding-right: 6px; }
.daily-dispatch-drawer .daily-project-part-form .el-form-item { margin-bottom: 16px; }
.daily-dispatch-drawer .daily-project-part-form .el-form-item__error { position: static; padding-top: 4px; }
.daily-dispatch-drawer .daily-project-part-form :is(.el-input__inner, .el-textarea__inner, .el-select__selected-item, .el-form-item__label) { font-size: 14px; }
</style>
