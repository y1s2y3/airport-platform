<script setup>
import { ref, computed, inject, watch } from 'vue'
import { ElMessage } from 'element-plus'
import {
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
  issueDispatchNoticeRecord,
  issueDispatchPenaltyRecord,
  issueDispatchReminderRecord,
  getDispatchNoticeRecords,
  getDispatchPenaltyRecords,
  getDispatchReminderRecords,
} from '../../../utils/dispatchMeetingStorage.js'
import { buildExecutorOptions } from '../../../utils/executorDisplay.js'
import { taskWorkTypeOptions } from '../../../config/screenshotTaskOrderFields.js'
import { TASK_EXECUTION_MODES, TASK_EXECUTION_MODE_OPTIONS, taskExecutors } from '../../../utils/dispatchTaskWorkflow.js'
import DispatchDraggablePanel from './DispatchDraggablePanel.vue'
import DispatchHqPanelTitle from './DispatchHqPanelTitle.vue'

const dispatchHqUi = inject('dispatchHqUi', false)

const ADMIN_MENU_ROOT = '调度后台管理'
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
  draft.executors = draft.executors?.length ? [...draft.executors] : (draft.executor ? [draft.executor] : [])
  draft.executionMode = TASK_EXECUTION_MODES.SINGLE
  return draft
}

function createReminderDraft() {
  const draft = buildReminderDraft(props.device)
  const projectName = resolveProjectName()
  if (projectName) draft.project = projectName
  draft.assignees = draft.assignees?.length ? [...draft.assignees] : (draft.assignee || draft.executor ? [draft.assignee || draft.executor] : [])
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

const dialogRefresh = ref(0)

function timeText(value) {
  return value && value !== '--' ? value : '--'
}

function noticeDialogRow(record) {
  return {
    id: record.id,
    docType: '任务单',
    title: record.title,
    workRequirement: record.workRequirement,
    status: record.status,
    handler: taskExecutors(record).join('、') || record.handler || '--',
    issuer: record.issuer || record.createdBy || '--',
    time: timeText(record.issueTime !== '--' ? record.issueTime : record.createdAt),
  }
}

function reminderDialogRow(record) {
  return {
    id: record.id,
    docType: '提示函',
    title: record.title,
    matterDescription: record.matterDescription,
    status: record.status,
    handler: (Array.isArray(record.assignees) && record.assignees.length
      ? record.assignees.join('、') : record.assignee || record.executor) || '--',
    issuer: record.issuer || '--',
    time: timeText(record.issueTime),
  }
}

function penaltyDialogRow(record) {
  return {
    id: record.id,
    docType: '处罚单',
    title: record.title,
    penaltyContent: record.penaltyContent,
    status: record.status,
    handler: record.assignee || record.executor || '--',
    issuer: record.handler || record.issuer || '--',
    time: timeText(record.issueTime),
  }
}

/** 清单直接读三类单据存储，保存/直接下发后的新单据即时可见 */
const dialogList = computed(() => {
  dialogRefresh.value
  const rows = [
    ...getDispatchNoticeRecords().map(noticeDialogRow),
    ...getDispatchReminderRecords().map(reminderDialogRow),
    ...getDispatchPenaltyRecords().map(penaltyDialogRow),
  ]
  const filtered = dialogDocTab.value === 'all'
    ? rows
    : rows.filter((row) => row.docType === DOC_TYPE_LABELS[dialogDocTab.value])
  return filtered.sort((a, b) => String(b.time).localeCompare(String(a.time)))
})

const docSubjectLabel = computed(() => {
  if (dialogDocTab.value === 'notice') return '工作要求'
  if (dialogDocTab.value === 'reminder') return '事项描述'
  if (dialogDocTab.value === 'penalty') return '处罚内容'
  return '工作要求/处罚内容'
})

function docSubjectText(row) {
  if (row.docType === '任务单') return row.workRequirement || row.title || '--'
  if (row.docType === '提示函') return row.matterDescription || row.title || '--'
  return row.penaltyContent || row.title || '--'
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
  已完成: 'closed',
  无需执行: 'closed',
  已关闭: 'closed',
  已闭环: 'closed',
  已作废: 'closed',
}

function switchDocTab(tab) {
  if (docTab.value === tab) return
  docTab.value = tab
}

function openListDialog() {
  dialogDocTab.value = 'all'
  dialogRefresh.value += 1
  listDialogOpen.value = true
}

function buildNoticeSavePayload(draft) {
  const workType = draft.workType.trim()
  const workRequirement = draft.workRequirement.trim()
  const executors = (Array.isArray(draft.executors) ? draft.executors : [])
    .map((value) => String(value || '').trim()).filter(Boolean)
  const executor = executors.join('、')
  const titleBase = workRequirement.slice(0, 24) || draft.title || '任务单'
  return {
    id: draft.adminRecordId,
    title: titleBase.length >= 24 ? `${titleBase}…` : titleBase,
    project: draft.project || '',
    type: workType,
    workType,
    workRequirement,
    workSource: '远程调度',
    executors,
    executor,
    executeDept: executor,
    executionMode: draft.executionMode || TASK_EXECUTION_MODES.SINGLE,
    deadline: draft.deadline || defaultDeadline(),
    remark: draft.remark?.trim() || '',
    source: '远程调度',
    status: '待下发',
    issuer: DISPATCH_CURRENT_USER,
    issueTime: '--',
  }
}

function buildReminderSavePayload(draft) {
  const matterDescription = draft.matterDescription.trim()
  const assignees = (Array.isArray(draft.assignees) ? draft.assignees : [])
    .map((value) => String(value || '').trim()).filter(Boolean)
  const assignee = assignees.join('、')
  const titleBase = matterDescription.slice(0, 24) || draft.title || '提示函'
  return {
    id: draft.adminRecordId,
    title: titleBase.length >= 24 ? `${titleBase}…` : titleBase,
    project: draft.project || '',
    matterDescription,
    assignees,
    assignee,
    executor: assignee,
    deadline: draft.deadline || defaultDeadline(),
    status: '待下发',
    issuer: DISPATCH_CURRENT_USER,
    issueTime: '--',
  }
}

function buildPenaltySavePayload(draft) {
  const workType = draft.workType.trim()
  const penaltyContent = draft.penaltyContent.trim()
  const assignee = (draft.assignee || draft.executor || '').trim()
  const titleBase = penaltyContent.slice(0, 24) || draft.title || '处罚单'
  return {
    id: draft.adminRecordId,
    title: titleBase.length >= 24 ? `${titleBase}…` : titleBase,
    project: draft.project || '',
    workType,
    penaltyReason: workType,
    penaltyContent,
    assignee,
    executor: assignee,
    deadline: draft.deadline || defaultDeadline(),
    handler: DISPATCH_CURRENT_USER,
    source: '远程调度',
    status: '待下发',
    issueTime: '--',
  }
}

function validateDraft() {
  if (docTab.value === 'notice') {
    if (!noticeDraft.value.project?.trim()) {
      ElMessage.warning('请填写项目名称')
      return false
    }
    if (!noticeDraft.value.workType?.trim()) {
      ElMessage.warning('请选择工作类型')
      return false
    }
    if (!noticeDraft.value.workRequirement?.trim()) {
      ElMessage.warning('请填写工作要求')
      return false
    }
    if (!noticeDraft.value.executors?.length) {
      ElMessage.warning('请选择执行人')
      return false
    }
    if (!TASK_EXECUTION_MODE_OPTIONS.includes(noticeDraft.value.executionMode)) {
      ElMessage.warning('请选择执行模式')
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
    if (!reminderDraft.value.assignees?.length) {
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
    if (!penaltyDraft.value.workType?.trim()) {
      ElMessage.warning('请选择类型')
      return false
    }
    if (!penaltyDraft.value.penaltyContent?.trim()) {
      ElMessage.warning('请填写处罚内容')
      return false
    }
    if (!(penaltyDraft.value.assignee || penaltyDraft.value.executor)?.trim()) {
      ElMessage.warning('请填写指派人')
      return false
    }
    if (!penaltyDraft.value.deadline) {
      ElMessage.warning('请选择完成时限')
      return false
    }
  }
  return true
}

function handleSave(issueNow = false) {
  if (!validateDraft()) return
  if (docTab.value === 'notice') {
    const record = saveDispatchNoticeRecord(buildNoticeSavePayload(noticeDraft.value))
    noticeDraft.value.adminRecordId = record.id
    noticeDraft.value.status = 'draft'
    if (issueNow) {
      issueDispatchNoticeRecord(record.id)
      ElMessage.success(`任务单已保存并直接下发（编号 ${record.id}）`)
    } else {
      ElMessage.success(`任务单已保存（编号 ${record.id}），可在${ADMIN_MENU_ROOT} · ${ADMIN_MENU_NOTICE}点击下发操作`)
    }
  } else if (docTab.value === 'reminder') {
    const record = saveDispatchReminderRecord(buildReminderSavePayload(reminderDraft.value))
    reminderDraft.value.adminRecordId = record.id
    reminderDraft.value.status = 'draft'
    if (issueNow) {
      issueDispatchReminderRecord(record.id)
      ElMessage.success(`提示函已保存并直接下发（编号 ${record.id}）`)
    } else {
      ElMessage.success(`提示函已保存（编号 ${record.id}），可在${ADMIN_MENU_ROOT} · ${ADMIN_MENU_REMINDER}点击下发操作`)
    }
  } else {
    const record = saveDispatchPenaltyRecord(buildPenaltySavePayload(penaltyDraft.value))
    penaltyDraft.value.adminRecordId = record.id
    penaltyDraft.value.status = 'draft'
    if (issueNow) {
      issueDispatchPenaltyRecord(record.id)
      ElMessage.success(`处罚单已保存并直接下发（编号 ${record.id}）`)
    } else {
      ElMessage.success(`处罚单已保存（编号 ${record.id}），可在${ADMIN_MENU_ROOT} · ${ADMIN_MENU_PENALTY}点击下发操作`)
    }
  }
  dialogRefresh.value += 1
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
        <div class="doc-tabs-row">
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
                placeholder="选择或输入项目名称" aria-label="选择或输入项目名称">
                <el-option v-for="item in projectOptions" :key="item" :label="item" :value="item" />
              </el-select>
            </div>
            <div class="field-row">
              <span class="field-label">工作类型</span>
              <el-select
                v-model="noticeDraft.workType"
                size="small"
                filterable
                :popper-class="DOC_POPPER_CLASS"
                placeholder="请选择工作类型"
                aria-label="选择工作类型">
                <el-option v-for="item in taskWorkTypeOptions" :key="item.value" :label="item.label" :value="item.value" />
              </el-select>
            </div>
            <div class="field-row field-row-block">
              <span class="field-label">工作要求</span>
              <el-input
                v-model="noticeDraft.workRequirement"
                type="textarea"
                :rows="4"
                resize="none"
                placeholder="请描述工作要求，将作为任务单正文" aria-label="请描述工作要求，将作为任务单正文"/>
            </div>
            <div class="field-row">
              <span class="field-label">执行人</span>
              <el-select
                v-model="noticeDraft.executors"
                multiple
                filterable
                allow-create
                default-first-option
                size="small"
                :popper-class="DOC_POPPER_CLASS"
                placeholder="选择或输入执行人（可多选）" aria-label="选择或输入执行人">
                <el-option
                  v-for="item in executorOptions"
                  :key="item.value"
                  :label="item.value"
                  :value="item.value"
                />
              </el-select>
            </div>
            <div class="field-row">
              <span class="field-label">执行模式</span>
              <el-radio-group v-model="noticeDraft.executionMode" size="small" class="execution-mode-tags">
                <el-radio v-for="mode in TASK_EXECUTION_MODE_OPTIONS" :key="mode" :value="mode">{{ mode }}</el-radio>
              </el-radio-group>
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
                style="width: 100%" aria-label="选择完成时限"/>
            </div>
            <div class="field-row field-row-block">
              <span class="field-label">备注</span>
              <el-input
                v-model="noticeDraft.remark"
                type="textarea"
                :rows="2"
                resize="none"
                placeholder="选填" aria-label="选填"/>
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
                placeholder="选择或输入项目名称" aria-label="选择或输入项目名称">
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
                placeholder="请描述提示事项，将作为提示函正文" aria-label="请描述提示事项，将作为提示函正文"/>
            </div>
            <div class="field-row">
              <span class="field-label">指派人</span>
              <el-select
                v-model="reminderDraft.assignees"
                multiple
                filterable
                allow-create
                default-first-option
                size="small"
                :popper-class="DOC_POPPER_CLASS"
                placeholder="选择或输入指派人（可多选）" aria-label="选择或输入指派人">
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
                style="width: 100%" aria-label="选择完成时限"/>
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
                placeholder="选择或输入项目名称" aria-label="选择或输入项目名称">
                <el-option v-for="item in projectOptions" :key="item" :label="item" :value="item" />
              </el-select>
            </div>
            <div class="field-row">
              <span class="field-label">类型</span>
              <el-select
                v-model="penaltyDraft.workType"
                size="small"
                filterable
                :popper-class="DOC_POPPER_CLASS"
                placeholder="请选择类型"
                aria-label="选择类型">
                <el-option v-for="item in taskWorkTypeOptions" :key="item.value" :label="item.label" :value="item.value" />
              </el-select>
            </div>
            <div class="field-row field-row-block">
              <span class="field-label">处罚内容</span>
              <el-input
                v-model="penaltyDraft.penaltyContent"
                type="textarea"
                :rows="4"
                resize="none"
                placeholder="请描述处罚内容" aria-label="请描述处罚内容"/>
            </div>
            <div class="field-row">
              <span class="field-label">指派人</span>
              <el-select
                v-model="penaltyDraft.assignee"
                filterable
                allow-create
                default-first-option
                size="small"
                :popper-class="DOC_POPPER_CLASS"
                placeholder="选择或输入指派人" aria-label="选择或输入指派人">
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
                v-model="penaltyDraft.deadline"
                type="date"
                value-format="YYYY-MM-DD"
                :popper-class="DOC_POPPER_CLASS"
                placeholder="选择完成时限"
                size="small"
                style="width: 100%" aria-label="选择完成时限"/>
            </div>
          </template>
        </div>

        <div class="draft-actions">
          <el-button size="small" @click="handleSave(false)">保存</el-button>
          <el-button type="primary" size="small" @click="handleSave(true)">直接下发</el-button>
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
              <td>{{ row.handler || '--' }}</td>
              <td>{{ row.issuer || '--' }}</td>
              <td>{{ row.time || '--' }}</td>
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

/* 任务单/提示函/处罚单 标签行：
   用本组件独有的类名，避免与平台共享壳类 .section-head 撞名
   （siteConstruction/engineering-work-page.css 里的 .section-head 是裸全局规则，
   单文件构建会把浅色渐变底 + 16/18/12 内边距套到 COC 深色面板上） */
.doc-tabs-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
  gap: 12px;
  font-size: calc(13px + var(--coc-font-boost));
  font-weight: 600;
  color: var(--coc-text-secondary);
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
  grid-template-columns: 96px minmax(0, 1fr);
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

.execution-mode-tags {
  display: inline-flex;
  align-items: center;
  gap: 4px 12px;
  flex-wrap: wrap;
  min-height: 28px;
}

.work-type-tags {
  display: inline-flex;
  gap: 8px;
  --work-type-color: var(--coc-accent, var(--ap-primary, var(--el-color-primary)));
}

.work-type-tags :deep(.el-radio-button__inner) {
  height: 28px;
  padding: 0 14px;
  border-radius: 999px !important;
  border: 1px solid var(--coc-border, var(--el-border-color, #dcdfe6)) !important;
  background: transparent;
  box-shadow: none;
  color: var(--coc-text-secondary, var(--ap-text-secondary, #606266));
  font-weight: 500;
  transition: color 0.2s ease, border-color 0.2s ease;
}

.work-type-tags :deep(.el-radio-button:first-child .el-radio-button__inner),
.work-type-tags :deep(.el-radio-button:last-child .el-radio-button__inner) {
  border-radius: 999px !important;
}

.work-type-tags :deep(.el-radio-button__inner:hover) {
  color: var(--work-type-color);
  border-color: var(--work-type-color) !important;
}

.work-type-tags :deep(.el-radio-button__original-radio:checked + .el-radio-button__inner) {
  background: transparent;
  border-color: var(--work-type-color) !important;
  color: var(--work-type-color);
  box-shadow: none;
  font-weight: 600;
}
</style>
