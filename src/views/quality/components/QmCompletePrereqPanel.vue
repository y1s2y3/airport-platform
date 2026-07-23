<script setup>
/**
 * 竣工前置：实体验收情况 / 专项验收情况
 */
defineProps({
  gate: { type: Object, required: true },
  /** compact：填报页顶部简版 */
  compact: { type: Boolean, default: false },
})
</script>

<template>
  <div class="prereq" :class="{ compact }">
    <div class="prereq-grid">
      <div class="prereq-card" :class="{ ok: gate.physical.done, bad: !gate.physical.done }">
        <div class="prereq-head">
          <span class="prereq-title">实体验收情况</span>
          <el-tag :type="gate.physical.done ? 'success' : 'warning'" size="small">
            {{ gate.physical.done ? '全部完成' : '未完成' }}
          </el-tag>
        </div>
        <p class="prereq-summary">{{ gate.physical.summary }}</p>
        <el-table
          v-if="gate.physical.rows.length"
          :data="compact ? gate.physical.rows.slice(0, 5) : gate.physical.rows"
          size="small"
          border
          max-height="220"
        >
          <el-table-column prop="name" label="节点/部位" min-width="160" show-overflow-tooltip />
          <el-table-column prop="specialty" label="专业" width="90" />
          <el-table-column label="状态" width="100">
            <template #default="{ row }">
              <el-tag :type="row.passed ? 'success' : 'info'" size="small">{{ row.statusLabel }}</el-tag>
            </template>
          </el-table-column>
        </el-table>
        <p v-else class="prereq-empty">暂无实体验收节点</p>
        <p v-if="compact && gate.physical.rows.length > 5" class="prereq-more">
          另有 {{ gate.physical.rows.length - 5 }} 项…
        </p>
      </div>

      <div class="prereq-card" :class="{ ok: gate.special.done, bad: !gate.special.done }">
        <div class="prereq-head">
          <span class="prereq-title">专项验收情况</span>
          <el-tag :type="gate.special.done ? 'success' : 'warning'" size="small">
            {{ gate.special.done ? '全部完成' : '未完成' }}
          </el-tag>
        </div>
        <p class="prereq-summary">{{ gate.special.summary }}</p>
        <el-table
          v-if="gate.special.rows.length"
          :data="compact ? gate.special.rows.slice(0, 5) : gate.special.rows"
          size="small"
          border
          max-height="220"
        >
          <el-table-column prop="name" label="专项名称" min-width="140" show-overflow-tooltip />
          <el-table-column prop="specialty" label="类型" width="100" />
          <el-table-column v-if="!compact" prop="task_no" label="单号" width="120" />
          <el-table-column label="状态" width="100">
            <template #default="{ row }">
              <el-tag :type="row.passed ? 'success' : 'info'" size="small">{{ row.statusLabel }}</el-tag>
            </template>
          </el-table-column>
        </el-table>
        <p v-else class="prereq-empty">暂无专项验收记录（不阻塞竣工）</p>
        <p v-if="compact && gate.special.rows.length > 5" class="prereq-more">
          另有 {{ gate.special.rows.length - 5 }} 项…
        </p>
      </div>
    </div>

    <el-alert
      v-if="!gate.canStart"
      type="warning"
      :closable="false"
      show-icon
      class="prereq-alert"
      :title="gate.blockReason || '实体与专项验收均须全部完成后，方可发起竣工验收'"
    />
    <el-alert
      v-else
      type="success"
      :closable="false"
      show-icon
      class="prereq-alert"
      title="实体验收、专项验收均已完成，可发起竣工验收"
    />
  </div>
</template>

<style scoped>
.prereq { display: flex; flex-direction: column; gap: 12px; }
.prereq-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
@media (max-width: 960px) {
  .prereq-grid { grid-template-columns: 1fr; }
}
.prereq-card {
  border: 1px solid #ebeef5;
  border-radius: 8px;
  padding: 12px;
  background: #fff;
}
.prereq-card.ok { border-color: #b3e19d; background: #f0f9eb; }
.prereq-card.bad { border-color: #f5dab1; background: #fdf6ec; }
.prereq-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 6px;
}
.prereq-title { font-size: 15px; font-weight: 600; color: #303133; }
.prereq-summary { margin: 0 0 8px; font-size: 13px; color: #606266; }
.prereq-empty { margin: 0; font-size: 13px; color: #909399; }
.prereq-more { margin: 6px 0 0; font-size: 12px; color: #909399; }
.prereq-alert { margin: 0; }
.compact .prereq-card { padding: 10px; }
</style>
