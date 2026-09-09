<script setup>
import { computed } from 'vue'
import '../styles/todoHandleBlocks.css'
import { getAsbuilt, asbuiltReportFileTypeLabel } from '../../../mock/asbuilt.js'
import { formatBrandApproverSnapshot } from '../../../mock/brand.js'

const props = defineProps({
  todo: { type: Object, required: true },
})

const acceptance = computed(() => {
  const id = props.todo?.asbuiltAcceptanceId || props.todo?.detail?.acceptanceId
  return id ? getAsbuilt(id) : null
})

const nodePaths = computed(() => {
  if (acceptance.value?.nodes?.length) {
    return acceptance.value.nodes.map((n) => n.wbs_node_path || n.wbs_node_id).join('；')
  }
  return props.todo.detail?.nodePaths || '—'
})

const reportFiles = computed(() => {
  if (acceptance.value?.files?.length) return acceptance.value.files
  const names = String(props.todo.detail?.reportNames || '')
    .split(/[；;]/)
    .map((s) => s.trim())
    .filter(Boolean)
  return names.map((file_name, i) => ({ id: `todo-abf-${i}`, file_name }))
})

function fileSizeLabel(size) {
  if (!size) return ''
  const kb = Math.max(1, Math.round(size / 1024))
  if (kb >= 1024) return `${(kb / 1024).toFixed(1)} MB`
  return `${kb} KB`
}
</script>

<template>
  <div class="asbuilt-todo-blocks">
    <section class="block block--panel">
      <div class="block-head">
        <div class="block-title">基本信息</div>
        <el-tag size="small" type="warning" effect="light">
          {{
            todo.detail?.currentNode ||
            (todo.asbuiltNode === 'pm' ? '待项目经理终审' : '待监理审')
          }}
        </el-tag>
      </div>
      <el-descriptions :column="2" border size="small" class="desc-panel">
        <el-descriptions-item label="验收单号">
          {{ todo.detail?.bizNo || todo.asbuiltAcceptanceId || '—' }}
        </el-descriptions-item>
        <el-descriptions-item label="项目">
          {{ todo.detail?.project || '—' }}
        </el-descriptions-item>
        <el-descriptions-item label="任务名称" :span="2">
          {{ acceptance?.title || todo.detail?.title || '—' }}
        </el-descriptions-item>
        <el-descriptions-item
          v-if="acceptance?.copy_from_biz_no || todo.detail?.copyFromBizNo"
          label="重新申报来源"
          :span="2"
        >
          {{ acceptance?.copy_from_biz_no || todo.detail?.copyFromBizNo }}
        </el-descriptions-item>
        <el-descriptions-item label="备注" :span="2">
          {{ acceptance?.remark || todo.detail?.remark || '—' }}
        </el-descriptions-item>
        <el-descriptions-item label="监理单位审批">
          {{
            acceptance
              ? formatBrandApproverSnapshot(acceptance, 'supervisor')
              : todo.detail?.supervisorApprover || '—'
          }}
        </el-descriptions-item>
        <el-descriptions-item label="项目经理审批">
          {{
            acceptance
              ? formatBrandApproverSnapshot(acceptance, 'pm')
              : todo.detail?.pmApprover || '—'
          }}
        </el-descriptions-item>
        <el-descriptions-item label="申请人">
          {{ todo.applicant || '—' }}
        </el-descriptions-item>
        <el-descriptions-item label="提交时间">
          {{ todo.applyTime || '—' }}
        </el-descriptions-item>
      </el-descriptions>
    </section>

    <section class="block block--panel">
      <div class="block-head">
        <div class="block-title">所选实体工程节点</div>
      </div>
      <div v-if="acceptance?.nodes?.length" class="node-list">
        <div v-for="(n, idx) in acceptance.nodes" :key="n.id || idx" class="node-row">
          <span class="node-idx">{{ idx + 1 }}</span>
          <span>{{ n.wbs_node_path || n.wbs_node_id || '—' }}</span>
        </div>
      </div>
      <div v-else class="empty-inline">{{ nodePaths }}</div>
    </section>

    <section class="block block--panel">
      <div class="block-head">
        <div class="block-title">实模一致性报告</div>
        <el-tag size="small" type="info" effect="plain">共 {{ reportFiles.length }} 份</el-tag>
      </div>
      <div v-if="reportFiles.length" class="file-list">
        <div v-for="f in reportFiles" :key="f.id || f.file_name" class="file-row">
          <span
            class="file-badge"
            :class="{ 'is-word': asbuiltReportFileTypeLabel(f) === 'WORD' }"
          >
            {{ asbuiltReportFileTypeLabel(f) }}
          </span>
          <div class="file-main">
            <div class="file-name">{{ f.file_name }}</div>
            <div v-if="f.file_size || f.uploaded_at" class="file-meta">
              <span v-if="f.file_size">{{ fileSizeLabel(f.file_size) }}</span>
              <span v-if="f.file_size && f.uploaded_at"> · </span>
              <span v-if="f.uploaded_at">{{ f.uploaded_at }}</span>
            </div>
          </div>
        </div>
      </div>
      <div v-else class="empty-inline">无报告附件</div>
    </section>
  </div>
</template>

<style scoped>
.asbuilt-todo-blocks {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.node-list,
.file-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.node-row,
.file-row {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 12px;
  border: 1px solid #eef0f3;
  border-radius: 8px;
  background: #fafbfc;
  font-size: 13px;
  color: #303133;
  line-height: 1.5;
}

.node-idx {
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  background: var(--el-color-primary-light-9, #fde8f0);
  color: var(--el-color-primary, #8f0045);
}

.file-badge {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 700;
  color: #c45656;
  background: #fef0f0;
  border: 1px solid #fde2e2;
}

.file-badge.is-word {
  color: #2b5bb8;
  background: #ecf2ff;
  border-color: #d6e4ff;
}

.file-main {
  flex: 1;
  min-width: 0;
}

.file-name {
  font-weight: 500;
  word-break: break-all;
}

.file-meta {
  margin-top: 2px;
  font-size: 12px;
  color: #909399;
}

.empty-inline {
  padding: 12px 0;
  text-align: center;
  font-size: 13px;
  color: #909399;
}
</style>
