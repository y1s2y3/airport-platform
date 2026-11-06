<script setup>
/**
 * 周报章节卡片：总（总体说明） + 分（分项目统计表）
 * 由详情页按章节顺序渲染，列定义与数据均来自周报快照。
 */
import { DataLine } from '@element-plus/icons-vue'
import WeeklyChartPanel from './WeeklyChartPanel.vue'

const props = defineProps({
  section: { type: Object, required: true },
})

function displayValue(row, column) {
  const raw = row?.[column.prop]
  if (raw === null || raw === undefined || raw === '') return '--'
  if (column.format === 'pct') return `${raw}%`
  return raw
}

function isNumericColumn(column) {
  return column.align === 'center'
}
</script>

<template>
  <section v-if="section" class="weekly-section">
    <div class="section-head">
      <h3 class="section-title">{{ section.title }}</h3>
      <el-tag v-if="!section.rows?.length" size="small" type="info" effect="plain">本周无数据</el-tag>
    </div>

    <div class="section-summary">
      <el-icon class="summary-icon"><DataLine /></el-icon>
      <p>{{ section.summary || '--' }}</p>
    </div>

    <div v-if="section.columns?.length" class="section-table">
      <el-table
        :data="section.rows || []"
        stripe
        border
        size="small"
        :max-height="460"
        empty-text="本周无数据（空值统一显示 --）"
        :show-summary="Boolean(section.totals)"
        :summary-method="() => (section.columns || []).map((column, index) => {
          if (index === 0) return section.totals?.project || '合计'
          const value = section.totals?.[column.prop]
          if (value === null || value === undefined || value === '') return '--'
          if (column.format === 'pct') return `${value}%`
          if (column.unit && column.prop !== 'rank') return `${value} ${column.unit}`
          return value
        })"
      >
        <el-table-column
          v-for="column in section.columns"
          :key="column.prop"
          :prop="column.prop"
          :label="column.label"
          :width="column.width"
          :min-width="column.minWidth"
          :align="isNumericColumn(column) ? 'center' : 'left'"
          :show-overflow-tooltip="!column.detail"
        >
          <template #default="{ row }">
            <span v-if="column.detail" class="detail-cell">{{ displayValue(row, column) }}</span>
            <span v-else>{{ displayValue(row, column) }}</span>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <div v-for="table in section.extraTables || []" :key="table.title" class="section-extra">
      <div class="extra-head">
        <span class="extra-title">{{ table.title }}</span>
        <span class="extra-count">{{ (table.rows || []).length }} 条</span>
      </div>
      <p v-if="table.summary" class="extra-summary">{{ table.summary }}</p>
      <el-table
        :data="table.rows || []"
        stripe
        border
        size="small"
        :max-height="420"
        empty-text="本周无逾期隐患"
      >
        <el-table-column
          v-for="column in table.columns || []"
          :key="column.prop"
          :prop="column.prop"
          :label="column.label"
          :width="column.width"
          :min-width="column.minWidth"
          :align="isNumericColumn(column) ? 'center' : 'left'"
          :show-overflow-tooltip="!column.detail"
        >
          <template #default="{ row }">
            <span v-if="column.detail" class="detail-cell">{{ displayValue(row, column) }}</span>
            <span v-else>{{ displayValue(row, column) }}</span>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <WeeklyChartPanel v-for="chart in section.charts || []" :key="chart.key" :chart="chart" />
  </section>
</template>

<style scoped>
.weekly-section {
  border: 1px solid var(--ap-border, #ebeef5);
  border-radius: 10px;
  background: #fff;
  padding: 16px 18px 14px;
  margin-bottom: 14px;
}
.section-head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}
.section-title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: var(--ap-text, #303133);
}
.section-summary {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  padding: 10px 12px;
  margin-bottom: 12px;
  border-radius: 8px;
  background: #f7f8fa;
  border-left: 3px solid var(--ap-primary, #91003d);
}
.section-summary p {
  margin: 0;
  font-size: 13px;
  line-height: 1.7;
  color: #4a4f57;
}
.summary-icon {
  color: var(--ap-primary, #91003d);
  margin-top: 3px;
  flex: 0 0 auto;
}
.section-table :deep(.el-table__footer-wrapper td) {
  background: #fafafa;
  font-weight: 600;
}
.detail-cell {
  display: block;
  white-space: normal;
  line-height: 1.5;
  color: #4a4f57;
}
.section-extra {
  margin-top: 16px;
  padding-top: 14px;
  border-top: 1px dashed var(--ap-border, #ebeef5);
}
.extra-head {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin-bottom: 6px;
}
.extra-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--ap-text, #303133);
}
.extra-count {
  font-size: 12px;
  color: var(--ap-text-muted, #909399);
}
.extra-summary {
  margin: 0 0 8px;
  font-size: 12px;
  line-height: 1.6;
  color: var(--ap-text-muted, #909399);
}
</style>
