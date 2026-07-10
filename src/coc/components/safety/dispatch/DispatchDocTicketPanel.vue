<script setup>
import { ref, computed, inject } from 'vue'
import { ElMessage } from 'element-plus'
import {
  DISPATCH_DOC_TICKET_LIST,
  DISPATCH_CURRENT_USER,
  buildPenaltyDraft,
  buildReminderDraft,
  buildSamplingNoticeDraft,
} from '../../../mock/data.js'
import {
  saveDispatchNoticeRecord,
  saveDispatchPenaltyRecord,
  saveDispatchReminderRecord,
} from '../../../utils/dispatchMeetingStorage.js'
import DispatchDraggablePanel from './DispatchDraggablePanel.vue'
import DispatchHqPanelTitle from './DispatchHqPanelTitle.vue'

const dispatchHqUi = inject('dispatchHqUi', false)

const ADMIN_MENU_ROOT = 'COC后台管理'
const ADMIN_MENU_NOTICE = '任务单'
const ADMIN_MENU_REMINDER = '提示函'
const ADMIN_MENU_PENALTY = '处罚单'

const props = defineProps({
  device: { type: Object, required: true },
  compact: { type: Boolean, default: true },
})

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
const noticeDraft = ref(buildSamplingNoticeDraft(props.device))
const reminderDraft = ref(buildReminderDraft(props.device))
const penaltyDraft = ref(buildPenaltyDraft(props.device))

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
  待确认: 'draft',
  待签收: 'draft',
  已下发: 'sent',
  处理中: 'doing',
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
  const titleBase = workRequirement.slice(0, 24) || draft.title || '任务单'
  return {
    id: draft.adminRecordId,
    title: titleBase.length >= 24 ? `${titleBase}…` : titleBase,
    project: draft.project || '',
    type: workType,
    workType,
    workRequirement,
    workSource: '远程调度',
    executeDept: draft.executeDept || '',
    deadline: draft.deadline || '',
    ledgerHandling: draft.ledgerHandling || '纳入任务单台账',
    source: '远程调度',
    status: '待确认',
    issuer: DISPATCH_CURRENT_USER,
    issueTime: new Date().toLocaleString('zh-CN', { hour12: false }),
  }
}

function buildReminderSavePayload(draft) {
  const matterDescription = draft.matterDescription.trim()
  const titleBase = matterDescription.slice(0, 24) || draft.title || '提示函'
  return {
    id: draft.adminRecordId,
    title: titleBase.length >= 24 ? `${titleBase}…` : titleBase,
    project: draft.project || '',
    matterDescription,
    assignee: draft.assignee || draft.executor || '项目经理',
    executor: draft.assignee || draft.executor || '项目经理',
    deadline: draft.deadline || '',
    status: '待确认',
    issuer: DISPATCH_CURRENT_USER,
    issueTime: new Date().toLocaleString('zh-CN', { hour12: false }),
  }
}

function buildPenaltySavePayload(draft) {
  const penaltyReason = draft.penaltyReason.trim()
  const penaltyContent = draft.penaltyContent.trim()
  const penaltyClause = draft.penaltyClause?.trim() || ''
  const amount = draft.amount.trim()
  const titleBase = penaltyReason.slice(0, 24) || draft.title || '处罚单'
  return {
    id: draft.adminRecordId,
    title: titleBase.length >= 24 ? `${titleBase}…` : titleBase,
    project: draft.project || '',
    unit: draft.unit || '',
    penaltyReason,
    penaltyContent,
    penaltyClause,
    amount,
    handler: DISPATCH_CURRENT_USER,
    source: '远程调度',
    status: '待确认',
    issueTime: new Date().toLocaleString('zh-CN', { hour12: false }),
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
  } else if (docTab.value === 'reminder') {
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
    if (!penaltyDraft.value.unit?.trim()) {
      ElMessage.warning('请填写责任单位')
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
    if (!penaltyDraft.value.amount?.trim()) {
      ElMessage.warning('请填写金额')
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
    ElMessage.success(`已保存至 ${ADMIN_MENU_ROOT} · ${ADMIN_MENU_NOTICE}`)
  } else if (docTab.value === 'reminder') {
    const record = saveDispatchReminderRecord(buildReminderSavePayload(reminderDraft.value))
    reminderDraft.value.adminRecordId = record.id
    reminderDraft.value.status = 'draft'
    ElMessage.success(`已保存至 ${ADMIN_MENU_ROOT} · ${ADMIN_MENU_REMINDER}`)
  } else {
    const record = saveDispatchPenaltyRecord(buildPenaltySavePayload(penaltyDraft.value))
    penaltyDraft.value.adminRecordId = record.id
    penaltyDraft.value.status = 'draft'
    ElMessage.success(`已保存至 ${ADMIN_MENU_ROOT} · ${ADMIN_MENU_PENALTY}`)
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
              <el-input v-model="noticeDraft.project" size="small" placeholder="如：捷运线延长段" />
            </div>
            <div class="field-row">
              <span class="field-label">工作类型</span>
              <el-input v-model="noticeDraft.workType" size="small" placeholder="如：质量复检" />
            </div>
            <div class="field-row field-row-block">
              <span class="field-label">工作要求</span>
              <el-input
                v-model="noticeDraft.workRequirement"
                type="textarea"
                :rows="5"
                resize="none"
                placeholder="请描述工作要求"
              />
            </div>
          </template>

          <template v-else-if="docTab === 'reminder'">
            <div class="field-row field-row-block">
              <span class="field-label">事项描述</span>
              <el-input
                v-model="reminderDraft.matterDescription"
                type="textarea"
                :rows="5"
                resize="none"
                placeholder="请描述提示事项"
              />
            </div>
            <div class="field-row">
              <span class="field-label">指派人</span>
              <el-input v-model="reminderDraft.executor" size="small" placeholder="默认：项目经理" />
            </div>
            <div class="field-row">
              <span class="field-label">完成时限</span>
              <el-date-picker
                v-model="reminderDraft.deadline"
                type="date"
                value-format="YYYY-MM-DD"
                placeholder="选择完成时限"
                size="small"
                style="width: 100%"
              />
            </div>
          </template>

          <template v-else>
            <div class="field-row">
              <span class="field-label">项目名称</span>
              <el-input v-model="penaltyDraft.project" size="small" placeholder="如：捷运线延长段" />
            </div>
            <div class="field-row">
              <span class="field-label">责任单位</span>
              <el-input v-model="penaltyDraft.unit" size="small" placeholder="如：中建三局" />
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
            <div class="field-row">
              <span class="field-label">金额</span>
              <el-input v-model="penaltyDraft.amount" size="small" placeholder="如 5000 元" />
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
  grid-template-columns: 72px minmax(0, 1fr);
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
.draft-fields :deep(.el-textarea) {
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
