<script setup>
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import {
  DISPATCH_DOC_TICKET_LIST,
  buildPenaltyDraft,
  buildSamplingNoticeDraft,
} from '../../../mock/data.js'

const props = defineProps({
  device: { type: Object, required: true },
  compact: { type: Boolean, default: true },
})

const docTab = ref('notice')
const listDialogOpen = ref(false)
const dialogDocTab = ref('all')
const docTabOptions = [
  { value: 'notice', label: '告知单' },
  { value: 'penalty', label: '处罚单' },
]
const dialogTabOptions = [
  { value: 'all', label: '全部' },
  { value: 'notice', label: '告知单' },
  { value: 'penalty', label: '处罚单' },
]
const noticeDraft = ref(buildSamplingNoticeDraft(props.device))
const penaltyDraft = ref(buildPenaltyDraft(props.device))
const editingNotice = ref(false)
const editingPenalty = ref(false)

const activeDraft = computed(() => (docTab.value === 'notice' ? noticeDraft.value : penaltyDraft.value))
const isEditingDraft = computed(() => (docTab.value === 'notice' ? editingNotice.value : editingPenalty.value))
const draftContent = computed({
  get: () => activeDraft.value.content,
  set: (val) => {
    if (docTab.value === 'notice') noticeDraft.value.content = val
    else penaltyDraft.value.content = val
  },
})

const dialogList = computed(() => {
  if (dialogDocTab.value === 'all') return DISPATCH_DOC_TICKET_LIST
  const type = dialogDocTab.value === 'notice' ? '告知单' : '处罚单'
  return DISPATCH_DOC_TICKET_LIST.filter((t) => t.docType === type)
})

const ticketStatusMap = {
  待确认: 'draft',
  待签收: 'draft',
  已下发: 'sent',
  处理中: 'doing',
  已闭环: 'closed',
}

function switchDocTab(tab) {
  if (docTab.value === tab) return
  editingNotice.value = false
  editingPenalty.value = false
  docTab.value = tab
}

function openListDialog() {
  dialogDocTab.value = 'all'
  listDialogOpen.value = true
}

function startEditDraft() {
  if (docTab.value === 'notice') editingNotice.value = true
  else editingPenalty.value = true
}

function saveDraft() {
  if (docTab.value === 'notice') editingNotice.value = false
  else editingPenalty.value = false
  ElMessage.success('草稿已保存')
}

function confirmDraft() {
  activeDraft.value.status = 'sent'
  if (docTab.value === 'notice') editingNotice.value = false
  else editingPenalty.value = false
  ElMessage.success(docTab.value === 'notice' ? '告知单已确认下发' : '处罚单已确认下发')
}
</script>

<template>
  <div class="panel-card detail-panel doc-ticket-panel">
    <div class="panel-title compact doc-title-row">
      <span class="doc-title-text">告知单 &amp; 处罚单</span>
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
              :class="{ active: docTab === opt.value, notice: opt.value === 'notice', penalty: opt.value === 'penalty' }"
              @click="switchDocTab(opt.value)"
            >
              {{ opt.label }}
            </button>
          </div>
          <span class="ai-tag">AI 自动生成</span>
        </div>
        <el-input v-if="isEditingDraft" v-model="draftContent" type="textarea" class="draft-textarea" resize="none" />
        <pre v-else class="draft-content">{{ activeDraft.content }}</pre>
        <div class="draft-actions">
          <el-button v-if="!isEditingDraft" size="small" @click="startEditDraft">编辑</el-button>
          <el-button v-else size="small" @click="saveDraft">保存</el-button>
          <el-button type="primary" size="small" @click="confirmDraft">确认下发</el-button>
        </div>
      </div>
    </div>

    <el-dialog v-model="listDialogOpen" title="告知单 & 处罚单" width="760px" class="doc-list-dialog">
      <div class="dialog-filter">
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
        <span class="dialog-count">共 {{ dialogList.length }} 条</span>
      </div>
      <el-table :data="dialogList" border stripe max-height="420" empty-text="暂无单据">
        <el-table-column prop="docType" label="类型" width="88" align="center" />
        <el-table-column prop="title" label="标题" min-width="200" show-overflow-tooltip />
        <el-table-column label="状态" width="96" align="center">
          <template #default="{ row }">
            <span class="ticket-status" :class="ticketStatusMap[row.status]">{{ row.status }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="handler" label="处理人" width="110" />
        <el-table-column prop="issuer" label="发起人" width="110" />
        <el-table-column prop="time" label="时间" width="148" />
      </el-table>
    </el-dialog>
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

.doc-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.doc-title-text {
  flex-shrink: 0;
}

.title-more-btn {
  margin-left: auto;
  border: none;
  background: transparent;
  padding: 0;
  font-size: 13px;
  color: #1677ff;
  cursor: pointer;
  font-family: inherit;
}

.title-more-btn:hover {
  text-decoration: underline;
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
  gap: 6px;
}

.draft-content {
  flex: 1;
  min-height: 0;
}

.draft-textarea {
  flex: 1;
  min-height: 0;
  display: flex;
}

.draft-textarea :deep(.el-textarea__inner) {
  flex: 1;
  min-height: 140px;
  height: 100% !important;
  box-sizing: border-box;
  font-size: 12px;
  resize: none;
}

.draft-head {
  align-items: center;
}

.doc-tabs {
  display: flex;
  gap: 6px;
}

.doc-tab-btn {
  border: 1px solid var(--coc-border);
  border-radius: 6px;
  background: #faf8f6;
  font-size: 13px;
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

.doc-tab-btn.active.penalty {
  border-color: #f56c6c;
  background: rgba(245, 108, 108, 0.1);
  color: #f56c6c;
  font-weight: 600;
}

.draft-actions {
  flex-shrink: 0;
  margin-top: 2px;
}

.dialog-filter {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.dialog-tab-btn {
  border: 1px solid var(--coc-border);
  border-radius: 999px;
  background: #fff;
  padding: 4px 12px;
  font-size: 12px;
  cursor: pointer;
  color: var(--coc-text-secondary);
}

.dialog-tab-btn.active {
  border-color: var(--coc-accent);
  background: rgba(201, 123, 99, 0.1);
  color: var(--coc-accent);
  font-weight: 600;
}

.dialog-count {
  margin-left: auto;
  font-size: 12px;
  color: var(--coc-text-muted);
}

.doc-list-dialog :deep(.ticket-status) {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
}

.doc-list-dialog :deep(.ticket-status.draft) {
  background: rgba(230, 162, 60, 0.15);
  color: #e6a23c;
}

.doc-list-dialog :deep(.ticket-status.sent) {
  background: rgba(64, 158, 255, 0.12);
  color: #409eff;
}

.doc-list-dialog :deep(.ticket-status.doing) {
  background: rgba(201, 123, 99, 0.12);
  color: var(--coc-accent);
}

.doc-list-dialog :deep(.ticket-status.closed) {
  background: rgba(103, 194, 58, 0.12);
  color: #67c23a;
}
</style>
