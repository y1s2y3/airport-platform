<script setup>
import { ref, computed, inject, watch } from 'vue'
import { ElMessage } from 'element-plus'
import {
  DISPATCH_DOC_TICKET_LIST,
  DISPATCH_CURRENT_USER,
  buildProjects,
  buildPenaltyDraft,
  buildReminderDraft,
  buildSamplingNoticeDraft,
} from '../../../mock/data.js'
import {
  saveDispatchNoticeRecord,
  saveDispatchPenaltyRecord,
  saveDispatchReminderRecord,
} from '../../../utils/dispatchMeetingStorage.js'
import { buildExecutorOptions } from '../../../utils/executorDisplay.js'
import DispatchDraggablePanel from './DispatchDraggablePanel.vue'
import DispatchHqPanelTitle from './DispatchHqPanelTitle.vue'

const dispatchHqUi = inject('dispatchHqUi', false)

const ADMIN_MENU_ROOT = 'COC后台管理'
const ADMIN_MENU_NOTICE = '任务单'
const ADMIN_MENU_REMINDER = '提示函'
const ADMIN_MENU_PENALTY = '处罚单'

const props = defineProps({
  device: { type: Object, required: true },
  videoProject: { type: Object, default: null },
  compact: { type: Boolean, default: true },
})

const DOC_POPPER_CLASS = 'screenshot-mark-popper'

const projectOptions = computed(() =>
  buildProjects().map((p) => p.shortName || p.name),
)

const executorOptions = computed(() => buildExecutorOptions())

function defaultDeadline() {
  const d = new Date()
  d.setDate(d.getDate() + 7)
  return d.toISOString().slice(0, 10)
}

function resolveProjectName() {
  return props.videoProject?.shortName || props.videoProject?.name || ''
}

function createNoticeDraft() {
  const draft = buildSamplingNoticeDraft(props.device)
  const projectName = resolveProjectName()
  if (projectName) draft.project = projectName
  return draft
}

function createReminderDraft() {
  const draft = buildReminderDraft(props.device)
  const projectName = resolveProjectName()
  if (projectName) draft.project = projectName
  return draft
}

function createPenaltyDraft() {
  const draft = buildPenaltyDraft(props.device)
  const projectName = resolveProjectName()
  if (projectName) draft.project = projectName
  return draft
}

const docTab = ref('notice')
const listDialogOpen = ref(false)
const dialogDocTab = ref('all')
const docTabOptions = [
  { value: 'notice', label: '任务单' },
  { value: 'reminder', label: '提示函' },
  { value: 'penalty', label: '处罚单' },
]
const dialogTabOptions = [
  { value: 'all', label: '全部' },
  { value: 'notice', label: '任务单' },
  { value: 'reminder', label: '提示函' },
  { value: 'penalty', label: '处罚单' },
]
const noticeDraft = ref(createNoticeDraft())
const reminderDraft = ref(createReminderDraft())
const penaltyDraft = ref(createPenaltyDraft())

watch(
  () => [props.device?.id, props.videoProject?.id],
  () => {
    noticeDraft.value = createNoticeDraft()
    reminderDraft.value = createReminderDraft()
    penaltyDraft.value = createPenaltyDraft()
  },
)

const DOC_TYPE_LABELS = {
  notice: '任务单',
  reminder: '提示函',
  penalty: '处罚单',
}

const dialogList = computed(() => {
  if (dialogDocTab.value === 'all') return DISPATCH_DOC_TICKET_LIST
  const type = DOC_TYPE_LABELS[dialogDocTab.value]
  return DISPATCH_DOC_TICKET_LIST.filter((t) => t.docType === type)
})

const docSubjectLabel = computed(() => {
  if (dialogDocTab.value === 'notice') return '工作要求'
  if (dialogDocTab.value === 'reminder') return '事项描述'
  if (dialogDocTab.value === 'penalty') return '事由'
  return '工作要求/事由'
})

function docSubjectText(row) {
  if (row.docType === '任务单') return row.workRequirement || row.title || '—'
  if (row.docType === '提示函') return row.matterDescription || row.title || '—'
  return row.penaltyReason || row.title || '—'
}

const ticketStatusMap = {
  待下发: 'draft',
  待确认: 'draft',
  待签收: 'draft',
  已下发: 'sent',
  已接收: 'closed',
  处理中: 'doing',
  待验收: 'doing',
  申诉中: 'doing',
  已关闭: 'closed',
  已闭环: 'closed',
}

function switchDocTab(tab) {
  if (docTab.value === tab) return
  docTab.value = tab
}

function openListDialog() {
  dialogDocTab.value = 'all'
  listDialogOpen.value = true
}

function buildNoticeSavePayload(draft) {
  const workType = draft.workType.trim()
  const workRequirement = draft.workRequirement.trim()
  const executor = (draft.executor || draft.executeDept || '').trim()
  const titleBase = workRequirement.slice(0, 24) || draft.title || '任务单'
  return {
    id: draft.adminRecordId,
    title: titleBase.length >= 24 ? `${titleBase}…` : titleBase,
    project: draft.project || '',
    type: workType,
    workType,
    workRequirement,
    workSource: '远程调度',
    executor,
    executeDept: executor,
    deadline: draft.deadline || defaultDeadline(),
    remark: draft.remark?.trim() || '',
    source: '远程调度',
    status: '待下发',
    issuer: DISPATCH_CURRENT_USER,
    issueTime: '—',
  }
}

function buildReminderSavePayload(draft) {
  const matterDescription = draft.matterDescription.trim()
  const executor = (draft.executor || draft.assignee || '').trim()
  const titleBase = matterDescription.slice(0, 24) || draft.title || '提示函'
  return {
    id: draft.adminRecordId,
    title: titleBase.length >= 24 ? `${titleBase}…` : titleBase,
    project: draft.project || '',
    matterDescription,
    assignee: executor,
    executor,
    deadline: draft.deadline || defaultDeadline(),
    status: '待下发',
    issuer: DISPATCH_CURRENT_USER,
    issueTime: '—',
  }
}

function buildPenaltySavePayload(draft) {
  const penaltyReason = draft.penaltyReason.trim()
  const penaltyContent = draft.penaltyContent.trim()
  const titleBase = penaltyReason.slice(0, 24) || draft.title || '处罚单'
  return {
    id: draft.adminRecordId,
    title: titleBase.length >= 24 ? `${titleBase}…` : titleBase,
    project: draft.project || '',
    unit: draft.unit?.trim() || '',
    penaltyReason,
    penaltyContent,
    handler: DISPATCH_CURRENT_USER,
    source: '远程调度',
    status: '待下发',
    issueTime: '—',
  }
}

function validateDraft() {
  if (docTab.value === 'notice') {
    if (!noticeDraft.value.project?.trim()) {
      ElMessage.warning('请填写项目名称')
      return false
    }
    if (!noticeDraft.value.workType?.trim()) {
      ElMessage.warning('请填写工作类型')
      return false
    }
    if (!noticeDraft.value.workRequirement?.trim()) {
      ElMessage.warning('请填写工作要求')
      return false
    }
    if (!noticeDraft.value.executor?.trim()) {
      ElMessage.warning('请填写执行人')
      return false
    }
    if (!noticeDraft.value.deadline) {
      ElMessage.warning('请选择完成时限')
      return false
    }
  } else if (docTab.value === 'reminder') {
    if (!reminderDraft.value.project?.trim()) {
      ElMessage.warning('请填写项目名称')
      return false
    }
    if (!reminderDraft.value.matterDescription?.trim()) {
      ElMessage.warning('请填写事项描述')
      return false
    }
    if (!reminderDraft.value.executor?.trim()) {
      ElMessage.warning('请填写指派人')
      return false
    }
    if (!reminderDraft.value.deadline) {
      ElMessage.warning('请选择完成时限')
      return false
    }
  } else {
    if (!penaltyDraft.value.project?.trim()) {
      ElMessage.warning('请填写项目名称')
      return false
    }
    if (!penaltyDraft.value.penaltyReason?.trim()) {
      ElMessage.warning('请填写事由')
      return false
    }
    if (!penaltyDraft.value.penaltyContent?.trim()) {
      ElMessage.warning('请填写内容')
      return false
    }
    if (!penaltyDraft.value.unit?.trim()) {
      ElMessage.warning('请填写责任单位')
      return false
    }
  }
  return true
}

function handleSave() {
  if (!validateDraft()) return
  if (docTab.value === 'notice') {
    const record = saveDispatchNoticeRecord(buildNoticeSavePayload(noticeDraft.value))
    noticeDraft.value.adminRecordId = record.id
    noticeDraft.value.status = 'draft'
    ElMessage.success(`已保存至 ${ADMIN_MENU_ROOT} · ${ADMIN_MENU_NOTICE}（待指挥部下发）`)
  } else if (docTab.value === 'reminder') {
    const record = saveDispatchReminderRecord(buildReminderSavePayload(reminderDraft.value))
    reminderDraft.value.adminRecordId = record.id
    reminderDraft.value.status = 'draft'
    ElMessage.success(`已保存至 ${ADMIN_MENU_ROOT} · ${ADMIN_MENU_REMINDER}（待指挥部下发）`)
  } else {
    const record = saveDispatchPenaltyRecord(buildPenaltySavePayload(penaltyDraft.value))
    penaltyDraft.value.adminRecordId = record.id
    penaltyDraft.value.status = 'draft'
    ElMessage.success(`已保存至 ${ADMIN_MENU_ROOT} · ${ADMIN_MENU_PENALTY}（待指挥部下发）`)
  }
}
</script>

<template>
  <div class="panel-card detail-panel doc-ticket-panel" :class="{ 'dispatch-hq-doc-panel': dispatchHqUi }">
    <DispatchHqPanelTitle v-if="dispatchHqUi" title="任务单">
      <template #actions>
        <button type="button" class="title-more-btn" @click="openListDialog">详情</button>
      </template>
    </DispatchHqPanelTitle>
    <div v-else class="panel-title compact doc-title-row title-left">
      <span class="doc-title-text">任务单</span>
      <button type="button" class="title-more-btn" @click="openListDialog">更多</button>
    </div>
    <div class="panel-body penalty-body">
      <div class="penalty-upper">
        <div class="section-head draft-head">
          <div class="doc-tabs">
            <button
              v-for="opt in docTabOptions"
              :key="opt.value"
              class="doc-tab-btn"
              :class="{ active: docTab === opt.value, notice: opt.value === 'notice', reminder: opt.value === 'reminder', penalty: opt.value === 'penalty' }"
              @click="switchDocTab(opt.value)"
            >
              {{ opt.label }}
            </button>
          </div>
        </div>

        <div class="draft-fields">
          <template v-if="docTab === 'notice'">
            <div class="field-row">
              <span class="field-label">项目名称</span>
              <el-select
                v-model="noticeDraft.project"
                filterable
                allow-create
                default-first-option
                size="small"
                :popper-class="DOC_POPPER_CLASS"
                placeholder="选择或输入项目名称"
              >
                <el-option v-for="item in projectOptions" :key="item" :label="item" :value="item" />
              </el-select>
            </div>
            <div class="field-row">
              <span class="field-label">工作类型</span>
              <el-input v-model="noticeDraft.workType" size="small" placeholder="如：安全检查、质量复检" />
            </div>
            <div class="field-row field-row-block">
              <span class="field-label">工作要求</span>
              <el-input
                v-model="noticeDraft.workRequirement"
                type="textarea"
                :rows="4"
                resize="none"
                placeholder="请描述工作要求，将作为任务单正文"
              />
            </div>
            <div class="field-row">
              <span class="field-label">执行人</span>
              <el-select
                v-model="noticeDraft.executor"
                filterable
                allow-create
                default-first-option
                size="small"
                :popper-class="DOC_POPPER_CLASS"
                placeholder="选择或输入执行人"
              >
                <el-option
                  v-for="item in executorOptions"
                  :key="item.value"
                  :label="item.value"
                  :value="item.value"
                />
              </el-select>
            </div>
            <div class="field-row">
              <span class="field-label">完成时限</span>
              <el-date-picker
                v-model="noticeDraft.deadline"
                type="date"
                value-format="YYYY-MM-DD"
                :popper-class="DOC_POPPER_CLASS"
                placeholder="选择完成时限"
                size="small"
                style="width: 100%"
              />
            </div>
            <div class="field-row field-row-block">
              <span class="field-label">备注</span>
              <el-input
                v-model="noticeDraft.remark"
                type="textarea"
                :rows="2"
                resize="none"
                placeholder="选填"
              />
            </div>
          </template>

          <template v-else-if="docTab === 'reminder'">
            <div class="field-row">
              <span class="field-label">项目名称</span>
              <el-select
                v-model="reminderDraft.project"
                filterable
                allow-create
                default-first-option
                size="small"
                :popper-class="DOC_POPPER_CLASS"
                placeholder="选择或输入项目名称"
              >
                <el-option v-for="item in projectOptions" :key="item" :label="item" :value="item" />
              </el-select>
            </div>
            <div class="field-row field-row-block">
              <span class="field-label">事项描述</span>
              <el-input
                v-model="reminderDraft.matterDescription"
                type="textarea"
                :rows="4"
                resize="none"
                placeholder="请描述提示事项，将作为提示函正文"
              />
            </div>
            <div class="field-row">
              <span class="field-label">指派人</span>
              <el-select
                v-model="reminderDraft.executor"
                filterable
                allow-create
                default-first-option
                size="small"
                :popper-class="DOC_POPPER_CLASS"
                placeholder="选择或输入指派人"
              >
                <el-option
                  v-for="item in executorOptions"
                  :key="item.value"
                  :label="item.value"
                  :value="item.value"
                />
              </el-select>
            </div>
            <div class="field-row">
              <span class="field-label">完成时限</span>
              <el-date-picker
                v-model="reminderDraft.deadline"
                type="date"
                value-format="YYYY-MM-DD"
                :popper-class="DOC_POPPER_CLASS"
                placeholder="选择完成时限"
                size="small"
                style="width: 100%"
              />
            </div>
          </template>

          <template v-else>
            <div class="field-row">
              <span class="field-label">项目名称</span>
              <el-select
                v-model="penaltyDraft.project"
                filterable
                allow-create
                default-first-option
                size="small"
                :popper-class="DOC_POPPER_CLASS"
                placeholder="选择或输入项目名称"
              >
                <el-option v-for="item in projectOptions" :key="item" :label="item" :value="item" />
              </el-select>
            </div>
            <div class="field-row">
              <span class="field-label">责任单位</span>
              <el-input v-model="penaltyDraft.unit" size="small" placeholder="如：中建三局（施工总承包）" />
            </div>
            <div class="field-row">
              <span class="field-label">事由</span>
              <el-input v-model="penaltyDraft.penaltyReason" size="small" placeholder="如：文明施工违规" />
            </div>
            <div class="field-row field-row-block">
              <span class="field-label">内容</span>
              <el-input
                v-model="penaltyDraft.penaltyContent"
                type="textarea"
                :rows="4"
                resize="none"
                placeholder="请描述处罚内容"
              />
            </div>
          </template>
        </div>

        <div class="draft-actions">
          <el-button type="primary" size="small" @click="handleSave">{{ dispatchHqUi ? '提交' : '保存' }}</el-button>
        </div>
      </div>
    </div>

    <DispatchDraggablePanel
      v-if="listDialogOpen"
      title="任务单"
      :width="820"
      placement="right"
      @close="listDialogOpen = false"
    >
      <div class="dialog-filter more-dialog-toolbar">
        <div class="dialog-tabs">
          <button
            v-for="opt in dialogTabOptions"
            :key="opt.value"
            type="button"
            class="dialog-tab-btn"
            :class="{ active: dialogDocTab === opt.value }"
            @click="dialogDocTab = opt.value"
          >
            {{ opt.label }}
          </button>
        </div>
        <span class="dialog-count more-count">共 {{ dialogList.length }} 条</span>
      </div>
      <div class="more-table-wrap">
        <table class="mini-table more-table">
          <thead>
            <tr>
              <th>类型</th>
              <th>{{ docSubjectLabel }}</th>
              <th>状态</th>
              <th>处理人</th>
              <th>发起人</th>
              <th>时间</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in dialogList" :key="row.id">
              <td>{{ row.docType }}</td>
              <td class="cell-subject col-subject" :title="docSubjectText(row)">{{ docSubjectText(row) }}</td>
              <td>
                <span class="ticket-status" :class="ticketStatusMap[row.status]">{{ row.status }}</span>
              </td>
              <td>{{ row.handler || '—' }}</td>
              <td>{{ row.issuer || '—' }}</td>
              <td>{{ row.time || '—' }}</td>
            </tr>
            <tr v-if="!dialogList.length">
              <td colspan="6" class="empty-row">暂无单据</td>
            </tr>
          </tbody>
        </table>
      </div>
    </DispatchDraggablePanel>
  </div>
</template>

<style scoped>
@import './dispatch-lower.css';

.doc-ticket-panel {
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.doc-ticket-panel .panel-title {
  border-left: 4px solid #909399;
}

.dispatch-hq-doc-panel .panel-title {
  border-left: none;
}

.doc-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.doc-title-text {
  flex-shrink: 0;
}

.doc-title-row .title-more-btn {
  margin-left: auto;
}

.title-more-btn {
  border: 1px solid var(--coc-border);
  border-radius: 6px;
  background: #fff;
  padding: 4px 12px;
  font-size: calc(12px + var(--coc-font-boost));
  font-weight: 600;
  color: var(--coc-accent);
  cursor: pointer;
  white-space: nowrap;
  line-height: 1.4;
  font-family: inherit;
}

.title-more-btn:hover {
  border-color: var(--coc-accent);
  background: rgba(201, 123, 99, 0.08);
}

.penalty-body {
  flex: 1;
  min-height: 0;
  gap: 8px;
  padding: 10px 12px !important;
  overflow: hidden;
}

.penalty-upper {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.draft-head {
  align-items: center;
  flex-shrink: 0;
}

.doc-tabs {
  display: flex;
  gap: 6px;
}

.doc-tab-btn {
  border: 1px solid var(--coc-border);
  border-radius: 6px;
  background: #faf8f6;
  font-size: calc(13px + var(--coc-font-boost));
  padding: 4px 12px;
  cursor: pointer;
  font-weight: 500;
  color: var(--coc-text-secondary);
}

.doc-tab-btn.active.notice {
  border-color: #409eff;
  background: rgba(64, 158, 255, 0.1);
  color: #409eff;
  font-weight: 600;
}

.doc-tab-btn.active.reminder {
  border-color: #909399;
  background: rgba(144, 147, 153, 0.12);
  color: #606266;
  font-weight: 600;
}

.doc-tab-btn.active.penalty {
  border-color: #f56c6c;
  background: rgba(245, 108, 108, 0.1);
  color: #f56c6c;
  font-weight: 600;
}

.draft-fields {
  flex: 1;
  min-height: 0;
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 10px;
  border: 1px solid var(--coc-border);
  border-radius: 8px;
  background: #faf8f6;
}

.field-row {
  display: grid;
  grid-template-columns: 88px minmax(0, 1fr);
  gap: 10px;
  align-items: start;
}

.field-row-block {
  align-items: stretch;
}

.field-label {
  font-size: calc(12px + var(--coc-font-boost));
  font-weight: 600;
  color: var(--coc-text-secondary);
  line-height: 32px;
}

.field-row-block .field-label {
  line-height: 1.5;
  padding-top: 6px;
}

.draft-fields :deep(.el-input),
.draft-fields :deep(.el-textarea),
.draft-fields :deep(.el-select),
.draft-fields :deep(.el-date-editor) {
  width: 100%;
}

.draft-fields :deep(.el-textarea__inner) {
  font-size: calc(12px + var(--coc-font-boost));
  line-height: 1.55;
}

.draft-actions {
  flex-shrink: 0;
  margin-top: 2px;
}

.empty-row {
  text-align: center;
  color: var(--coc-text-muted);
  font-size: calc(13px + var(--coc-font-boost));
  padding: 16px 8px !important;
}
</style>
