<script setup>
/**
 * 处罚单详情 · 方案 A：主信息 + 流程结果分区折叠
 * 管理端弹窗与个人中心待办详情共用
 */
import { computed, ref, watch } from 'vue'
import {
  PENALTY_STATUSES,
} from '../utils/dispatchMeetingStorage.js'
import {
  formatRedBlackPeriod,
} from '../utils/redBlackBoardStorage.js'
import { resolveExecutorDisplay } from '../utils/executorDisplay.js'
import DispatchImageAttachments from './DispatchImageAttachments.vue'

const props = defineProps({
  record: { type: Object, required: true },
  /** 紧凑模式：用于弹窗 */
  compact: { type: Boolean, default: false },
})

function displayValue(value) {
  return value?.trim?.() ? value : '—'
}

function statusTagType(status) {
  if (status === PENALTY_STATUSES.CLOSED) return 'info'
  if (status === PENALTY_STATUSES.PROCESSING) return 'warning'
  if (status === PENALTY_STATUSES.PENDING) return 'warning'
  if (status === PENALTY_STATUSES.APPEALING) return 'warning'
  if (status === PENALTY_STATUSES.PENDING_ACCEPTANCE) return 'success'
  return 'info'
}

const hasReport = computed(() => {
  const r = props.record
  return !!(r?.reportResult || r?.reportTime || r?.reportAttachments?.length || r?.acceptor)
})

const hasAppeal = computed(() => {
  const r = props.record
  return !!(
    r?.appealReason ||
    r?.appealTime ||
    r?.appealResolution ||
    r?.appealAttachments?.length ||
    r?.status === PENALTY_STATUSES.APPEALING
  )
})

/** 有验收结论、说明、驳回记录，或处于待验收 */
const hasAccept = computed(() => {
  const r = props.record
  return !!(
    r?.acceptedTime ||
    r?.acceptedBy ||
    r?.acceptRemark ||
    r?.acceptRejectedTime ||
    r?.status === PENALTY_STATUSES.PENDING_ACCEPTANCE
  )
})

const showReportPanel = computed(() => {
  if (props.record?.status === PENALTY_STATUSES.PENDING) return false
  return hasReport.value || props.record?.status === PENALTY_STATUSES.PROCESSING
})

const showAppealPanel = computed(() => hasAppeal.value)

const showAcceptPanel = computed(() => {
  if (props.record?.status === PENALTY_STATUSES.PENDING) return false
  if (props.record?.status === PENALTY_STATUSES.PROCESSING && !hasAccept.value) return false
  return hasAccept.value || props.record?.status === PENALTY_STATUSES.PENDING_ACCEPTANCE
})

const appealConclusion = computed(() => {
  const r = props.record
  if (r?.status === PENALTY_STATUSES.APPEALING && !r?.appealResolution) {
    return { label: '复核中', type: 'warning' }
  }
  if (r?.appealResolution === '通过') return { label: '通过', type: 'success' }
  if (r?.appealResolution === '驳回') return { label: '驳回', type: 'danger' }
  if (r?.appealResolution) return { label: r.appealResolution, type: 'info' }
  return null
})

const acceptConclusion = computed(() => {
  const r = props.record
  if (r?.status === PENALTY_STATUSES.PENDING_ACCEPTANCE) {
    return { label: '待验收', type: 'warning' }
  }
  if (r?.acceptRejectedTime && !r?.acceptedTime) {
    return { label: '驳回', type: 'danger' }
  }
  // 驳回后退回处理中：仍有驳回记录
  if (r?.acceptRejectedTime && r?.status === PENALTY_STATUSES.PROCESSING) {
    return { label: '驳回', type: 'danger' }
  }
  if (r?.acceptedTime || (r?.status === PENALTY_STATUSES.CLOSED && r?.acceptedBy)) {
    return { label: '通过', type: 'success' }
  }
  return null
})

/** 处罚单补充附件：含开单附件 + 现场截图（原关联材料） */
const supplementAttachments = computed(() => {
  const list = Array.isArray(props.record?.attachments) ? [...props.record.attachments] : []
  const snap = props.record?.snapshot
  if (snap && !list.some((item) => item?.url === snap)) {
    list.unshift({
      name: '处罚单补充附件-现场图片.svg',
      url: snap,
    })
  }
  return list
})

const CLOSE_TYPE_LABEL = {
  manual: '手动关闭',
  acceptance: '验收通过关闭',
  appeal: '申诉通过关闭',
}

const closeTypeLabel = computed(() => {
  const t = props.record?.closeType
  if (t && CLOSE_TYPE_LABEL[t]) return CLOSE_TYPE_LABEL[t]
  if (props.record?.status !== PENALTY_STATUSES.CLOSED) return ''
  if (props.record?.acceptedTime) return CLOSE_TYPE_LABEL.acceptance
  if (props.record?.appealResolution === '通过') return CLOSE_TYPE_LABEL.appeal
  if (props.record?.closedTime) return CLOSE_TYPE_LABEL.manual
  return ''
})

const isManualClosed = computed(
  () =>
    props.record?.status === PENALTY_STATUSES.CLOSED &&
    (props.record?.closeType === 'manual' ||
      (!props.record?.acceptedTime && props.record?.appealResolution !== '通过' && !!props.record?.closedTime)),
)

const showClosePanel = computed(() => isManualClosed.value)

const activeNames = ref([])

function defaultActiveNames() {
  const status = props.record?.status
  const names = ['basic']
  if (status === PENALTY_STATUSES.PENDING_ACCEPTANCE && showReportPanel.value) {
    names.push('report')
  } else if (status === PENALTY_STATUSES.APPEALING && showAppealPanel.value) {
    names.push('appeal')
  } else if (status === PENALTY_STATUSES.CLOSED) {
    if (isManualClosed.value) names.push('close')
    else if (showAcceptPanel.value) names.push('accept')
    else if (showAppealPanel.value) names.push('appeal')
    else if (showReportPanel.value) names.push('report')
    else if (showClosePanel.value) names.push('close')
  } else if (status === PENALTY_STATUSES.PROCESSING) {
    if (hasAccept.value) names.push('accept')
    else if (hasReport.value) names.push('report')
  }
  return names
}

watch(
  () => props.record?.id,
  () => {
    activeNames.value = defaultActiveNames()
  },
  { immediate: true },
)
</script>

<template>
  <div class="penalty-detail" :class="{ compact }">
    <!-- ① 页头摘要 -->
    <div class="summary-bar">
      <div class="summary-main">
        <span class="summary-id">{{ record.id }}</span>
        <el-tag :type="statusTagType(record.status)" size="small">{{ record.status }}</el-tag>
      </div>
      <div class="summary-meta">
        <span>{{ record.project || '—' }}</span>
        <span class="dot">·</span>
        <span>{{ record.unit || '—' }}</span>
      </div>
    </div>

    <el-collapse v-model="activeNames" class="detail-collapse">
      <!-- ② 基本信息 -->
      <el-collapse-item name="basic">
        <template #title>
          <span class="panel-title">基本信息</span>
          <span class="panel-sub">开单事实</span>
        </template>
        <el-descriptions :column="2" border size="small">
          <el-descriptions-item label="事由" :span="2">{{ record.penaltyReason || '—' }}</el-descriptions-item>
          <el-descriptions-item label="内容" :span="2">{{ record.penaltyContent || '—' }}</el-descriptions-item>
          <el-descriptions-item label="指派人">
            {{ resolveExecutorDisplay(record.assignee || record.executor) }}
          </el-descriptions-item>
          <el-descriptions-item label="完成时限">{{ record.deadline || '—' }}</el-descriptions-item>
          <el-descriptions-item label="条款" :span="2">{{ displayValue(record.penaltyClause) }}</el-descriptions-item>
          <el-descriptions-item label="金额">{{ displayValue(record.amount) }}</el-descriptions-item>
          <el-descriptions-item label="下发时间">{{ record.issueTime || '—' }}</el-descriptions-item>
          <el-descriptions-item label="处罚单补充附件" :span="2">
            <DispatchImageAttachments
              :model-value="supplementAttachments"
              name-prefix="处罚单补充附件"
              readonly
            />
          </el-descriptions-item>
          <el-descriptions-item v-if="record.blackBoardSynced" label="黑榜期数" :span="2">
            {{ formatRedBlackPeriod(record.blackBoardMonth) }}
          </el-descriptions-item>
        </el-descriptions>
      </el-collapse-item>

      <!-- ③A 上报结果详情 -->
      <el-collapse-item v-if="showReportPanel" name="report">
        <template #title>
          <span class="panel-title">上报结果详情</span>
          <el-tag v-if="hasReport" size="small" type="success" effect="plain">已上报</el-tag>
          <el-tag v-else size="small" type="info" effect="plain">尚未上报</el-tag>
        </template>
        <el-empty v-if="!hasReport" :image-size="48" description="责任单位尚未提交上报结果" />
        <el-descriptions v-else :column="2" border size="small">
          <el-descriptions-item label="上报时间">{{ record.reportTime || '—' }}</el-descriptions-item>
          <el-descriptions-item label="指定验收人">{{ record.acceptor || '—' }}</el-descriptions-item>
          <el-descriptions-item label="条款" :span="2">{{ displayValue(record.penaltyClause) }}</el-descriptions-item>
          <el-descriptions-item label="金额">{{ displayValue(record.amount) }}</el-descriptions-item>
          <el-descriptions-item label="上报结果" :span="2">
            <div class="multi-text">{{ record.reportResult || '—' }}</div>
          </el-descriptions-item>
          <el-descriptions-item label="上报结果附件" :span="2">
            <DispatchImageAttachments
              :model-value="record.reportAttachments || []"
              name-prefix="上报结果附件"
              readonly
            />
          </el-descriptions-item>
        </el-descriptions>
      </el-collapse-item>

      <!-- ③B 申诉详情 -->
      <el-collapse-item v-if="showAppealPanel" name="appeal">
        <template #title>
          <span class="panel-title">申诉详情</span>
          <el-tag
            v-if="appealConclusion"
            size="small"
            :type="appealConclusion.type"
            effect="plain"
          >
            {{ appealConclusion.label }}
          </el-tag>
        </template>
        <el-descriptions :column="2" border size="small">
          <el-descriptions-item label="申诉时间">{{ record.appealTime || '—' }}</el-descriptions-item>
          <el-descriptions-item label="申诉结论">
            <el-tag
              v-if="appealConclusion"
              size="small"
              :type="appealConclusion.type"
            >
              {{ appealConclusion.label }}
            </el-tag>
            <span v-else>—</span>
          </el-descriptions-item>
          <el-descriptions-item label="申诉理由" :span="2">
            <div class="multi-text">{{ record.appealReason || '—' }}</div>
          </el-descriptions-item>
          <el-descriptions-item label="申诉附件" :span="2">
            <DispatchImageAttachments
              :model-value="record.appealAttachments || []"
              name-prefix="申诉附件"
              readonly
            />
          </el-descriptions-item>
        </el-descriptions>
      </el-collapse-item>

      <!-- ③C 验收详情 -->
      <el-collapse-item v-if="showAcceptPanel" name="accept">
        <template #title>
          <span class="panel-title">验收详情</span>
          <el-tag
            v-if="acceptConclusion"
            size="small"
            :type="acceptConclusion.type"
            effect="plain"
          >
            {{ acceptConclusion.label }}
          </el-tag>
        </template>
        <el-descriptions :column="2" border size="small">
          <el-descriptions-item label="验收结论">
            <el-tag
              v-if="acceptConclusion"
              size="small"
              :type="acceptConclusion.type"
            >
              {{ acceptConclusion.label }}
            </el-tag>
            <span v-else>—</span>
          </el-descriptions-item>
          <el-descriptions-item label="验收人">
            {{ record.acceptedBy || record.acceptor || '—' }}
          </el-descriptions-item>
          <el-descriptions-item v-if="record.acceptedTime" label="验收时间">
            {{ record.acceptedTime }}
          </el-descriptions-item>
          <el-descriptions-item v-if="record.acceptRejectedTime" label="驳回时间">
            {{ record.acceptRejectedTime }}
          </el-descriptions-item>
          <el-descriptions-item v-if="record.acceptRejectedBy" label="驳回人">
            {{ record.acceptRejectedBy }}
          </el-descriptions-item>
          <el-descriptions-item v-if="record.closedTime" label="关闭时间">
            {{ record.closedTime }}
          </el-descriptions-item>
          <el-descriptions-item label="验收说明" :span="2">
            <div class="multi-text">{{ record.acceptRemark || '—' }}</div>
          </el-descriptions-item>
        </el-descriptions>
      </el-collapse-item>

      <!-- 关闭信息（含手动关闭） -->
      <el-collapse-item v-if="showClosePanel" name="close">
        <template #title>
          <span class="panel-title">关闭信息</span>
          <el-tag size="small" type="info" effect="plain">{{ closeTypeLabel || '已关闭' }}</el-tag>
        </template>
        <el-descriptions :column="2" border size="small">
          <el-descriptions-item label="关闭方式">{{ closeTypeLabel || '—' }}</el-descriptions-item>
          <el-descriptions-item label="关闭人">{{ record.closedBy || '—' }}</el-descriptions-item>
          <el-descriptions-item label="关闭时间" :span="2">{{ record.closedTime || '—' }}</el-descriptions-item>
          <el-descriptions-item v-if="isManualClosed || record.closeRemark" label="关闭说明" :span="2">
            <div class="multi-text">{{ record.closeRemark || '—' }}</div>
          </el-descriptions-item>
        </el-descriptions>
      </el-collapse-item>
    </el-collapse>
  </div>
</template>

<style scoped>
.penalty-detail {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.summary-bar {
  padding: 10px 12px;
  border-radius: 8px;
  background: #faf8f6;
  border: 1px solid var(--coc-border, #ebeef5);
}

.summary-main {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.summary-id {
  font-size: 15px;
  font-weight: 600;
  color: var(--coc-text, #303133);
}

.summary-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: var(--coc-text-secondary, #606266);
}

.summary-meta .dot {
  color: #c0c4cc;
}

.detail-collapse :deep(.el-collapse-item__header) {
  height: auto;
  min-height: 44px;
  line-height: 1.4;
  padding: 8px 0;
  font-weight: 500;
}

.detail-collapse :deep(.el-collapse-item__wrap) {
  border-bottom: none;
}

.detail-collapse :deep(.el-collapse-item__content) {
  padding-bottom: 14px;
}

.panel-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--coc-text, #303133);
  margin-right: 8px;
}

.panel-sub {
  font-size: 12px;
  font-weight: 400;
  color: var(--coc-text-muted, #909399);
}

.multi-text {
  white-space: pre-wrap;
  line-height: 1.6;
  word-break: break-word;
}

.muted {
  color: var(--coc-text-muted, #909399);
  font-size: 13px;
}

.compact .summary-bar {
  padding: 8px 10px;
}
</style>
