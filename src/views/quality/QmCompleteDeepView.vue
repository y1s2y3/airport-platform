<script setup>
/**
 * 竣工验收 — 本页直接展示填报表单
 * 右上角：驳回记录（有记录才显）/ 重新报审（已驳回才显）
 */
import { computed, defineAsyncComponent, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useQmProjectScope } from '../../composables/useCurrentProject'
import {
  buildCompleteGate,
  displayTaskLocationName,
  findTask,
  getCompleteRejectOpinion,
  getOrCreateCompleteDraft,
  listCompleteRejectRecords,
  reDeclareCompleteAcceptance,
} from '../../mock/qm.js'
import QmCompletePrereqPanel from './components/QmCompletePrereqPanel.vue'

/** 填报组件体积大，仅有任务时再加载 */
const QmTaskEdit = defineAsyncComponent(() => import('./components/QmTaskEdit.vue'))

const { isHqSelected, scopeProjectId, scopeProjectLabel } = useQmProjectScope()
const tick = ref(0)
const draftTaskId = ref('')

const rejectListVisible = ref(false)
const rejectDetailVisible = ref(false)
const detailTaskId = ref('')

const gate = computed(() => {
  void tick.value
  return buildCompleteGate(isHqSelected.value ? '' : scopeProjectId.value)
})

const rejectRecords = computed(() => {
  void tick.value
  if (isHqSelected.value || !scopeProjectId.value) return []
  return listCompleteRejectRecords(scopeProjectId.value)
})

const currentTask = computed(() => {
  void tick.value
  if (!draftTaskId.value) return null
  return findTask(draftTaskId.value)
})

const isRejected = computed(() => Number(currentTask.value?.status) === 3)

function refreshDraft() {
  draftTaskId.value = ''
  if (isHqSelected.value || !scopeProjectId.value) {
    tick.value += 1
    return
  }
  const r = getOrCreateCompleteDraft(scopeProjectId.value)
  if (r.task) draftTaskId.value = r.task.id
  tick.value += 1
}

watch([scopeProjectId, isHqSelected], refreshDraft, { immediate: true })

watch(
  () => gate.value.canStart,
  (ok, prev) => {
    if (ok && !prev && !draftTaskId.value) refreshDraft()
  },
)

async function onReDeclare() {
  const task = currentTask.value
  if (!task || Number(task.status) !== 3) return
  try {
    await ElMessageBox.confirm(
      `将基于「${task.task_no}」复制表单新建报审单，原单保留为驳回记录。确认重新报审？`,
      '重新报审',
      { type: 'warning', confirmButtonText: '重新报审', cancelButtonText: '取消' },
    )
  } catch {
    return
  }
  const r = reDeclareCompleteAcceptance(task)
  if (!r.ok) return ElMessage.error(r.msg)
  draftTaskId.value = r.task.id
  tick.value += 1
  ElMessage.success(`已复制建新单 ${r.task.task_no}，请完善后提交报审`)
}

function openRejectList() {
  tick.value += 1
  rejectListVisible.value = true
}

function openRejectDetail(row) {
  detailTaskId.value = row?.id || ''
  rejectDetailVisible.value = true
}
</script>

<template>
  <div class="qm-page page-card">
    <div class="page-header page-header--actions">
      <div class="page-header-main">
        <div class="page-breadcrumb">质量验评 / 竣工验收</div>
        <h1 class="page-title">竣工验收</h1>
        <p class="page-tip">
          当前：{{ isHqSelected ? '请切换到具体项目' : scopeProjectLabel }}
          · 实体工程验收与专项验收均全部完成后，可在本页直接填报
        </p>
      </div>
      <div v-if="!isHqSelected" class="page-header-actions">
        <el-button v-if="rejectRecords.length" @click="openRejectList">驳回记录</el-button>
        <el-button v-if="isRejected" type="primary" @click="onReDeclare">重新报审</el-button>
      </div>
    </div>

    <el-alert
      v-if="isHqSelected"
      type="warning"
      :closable="false"
      show-icon
      title="竣工验收仅项目级可用，请先在顶部切换到具体项目"
      class="mb"
    />

    <template v-else>
      <div class="section-title">前置完成情况</div>
      <QmCompletePrereqPanel :gate="gate" class="mb" />

      <el-alert
        v-if="isRejected"
        type="warning"
        :closable="false"
        show-icon
        class="mb"
        title="当前为已驳回存档单（只读）。可点击右上角「重新报审」复制表单新建报审。"
      />

      <QmTaskEdit
        v-if="draftTaskId"
        :key="draftTaskId"
        :task-id="draftTaskId"
        title="竣工填报/报验"
        list-path="/qm/inspect/complete-deep"
        embedded
        hide-prereq
      />
      <el-empty
        v-else
        description="实体工程与专项验收均全部完成后，本页将自动展开竣工填报表单"
        :image-size="72"
      />
    </template>

    <!-- 驳回记录列表 -->
    <el-dialog
      v-model="rejectListVisible"
      title="驳回记录"
      width="720px"
      destroy-on-close
      append-to-body
    >
      <el-table :data="rejectRecords" border size="small" empty-text="暂无驳回记录">
        <el-table-column prop="task_no" label="验收单号" width="130" />
        <el-table-column label="工程/部位" min-width="140" show-overflow-tooltip>
          <template #default="{ row }">{{ displayTaskLocationName(row) || '—' }}</template>
        </el-table-column>
        <el-table-column label="申请时间" width="160">
          <template #default="{ row }">{{ row.submit_time || '—' }}</template>
        </el-table-column>
        <el-table-column label="驳回时间" width="160">
          <template #default="{ row }">
            {{ getCompleteRejectOpinion(row.id)?.action_time || row.finish_time || row.updated_at || '—' }}
          </template>
        </el-table-column>
        <el-table-column label="驳回意见" min-width="160" show-overflow-tooltip>
          <template #default="{ row }">
            {{ getCompleteRejectOpinion(row.id)?.opinion || row.remark || '—' }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="88" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openRejectDetail(row)">查看详情</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-dialog>

    <!-- 驳回记录详情：与填报/只读详情同组件、同字段与资料区布局 -->
    <el-dialog
      v-model="rejectDetailVisible"
      title="驳回记录详情"
      width="960px"
      top="4vh"
      destroy-on-close
      append-to-body
      class="qm-reject-detail-dialog"
    >
      <QmTaskEdit
        v-if="detailTaskId"
        :key="`reject-${detailTaskId}`"
        :task-id="detailTaskId"
        title="驳回记录详情"
        list-path="/qm/inspect/complete-deep"
        embedded
        hide-prereq
      />
    </el-dialog>
  </div>
</template>

<style scoped>
.qm-page { display: flex; flex-direction: column; gap: 12px; }
.page-header--actions {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}
.page-header-main { flex: 1; min-width: 0; }
.page-header-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  flex-shrink: 0;
  padding-top: 4px;
}
.page-breadcrumb { font-size: 12px; color: #909399; }
.page-title { margin: 4px 0; font-size: 20px; }
.page-tip { margin: 0; font-size: 13px; color: #606266; }
.section-title {
  margin: 4px 0 8px;
  font-size: 15px;
  font-weight: 600;
  color: #303133;
}
.mb { margin-bottom: 12px; }
</style>

<style>
/* append-to-body 弹窗：限制高度，内容区滚动，避免超出视口 */
.qm-reject-detail-dialog.el-dialog {
  max-height: 92vh;
  display: flex;
  flex-direction: column;
  margin-bottom: 4vh;
}
.qm-reject-detail-dialog .el-dialog__body {
  flex: 1;
  overflow: auto;
  max-height: calc(92vh - 54px);
  padding-top: 8px;
}
</style>
