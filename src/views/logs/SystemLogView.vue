<script setup>
import { ref, computed } from 'vue'
import { systemLogList, systemLogLevelOptions } from '../../mock/systemLogs'

const serviceFilter = ref('')
const levelFilter = ref('')
const dateRange = ref([])
const currentPage = ref(1)
const pageSize = ref(10)

const detailVisible = ref(false)
const detailRow = ref(null)

const levelOptions = systemLogLevelOptions.filter((item) => item.value)

const filteredList = computed(() => {
  const kw = serviceFilter.value.trim().toLowerCase()
  return systemLogList.filter((row) => {
    if (levelFilter.value && row.level !== levelFilter.value) return false
    if (dateRange.value?.length === 2) {
      if (row.logTime < dateRange.value[0] || row.logTime > dateRange.value[1]) return false
    }
    if (!kw) return true
    return row.serviceName.toLowerCase().includes(kw) || row.content.toLowerCase().includes(kw)
  })
})

const pagedList = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return filteredList.value.slice(start, start + pageSize.value)
})

function levelTagType(level) {
  if (level === 'ERROR') return 'danger'
  if (level === 'WARN') return 'warning'
  return 'info'
}

function handleSearch() {
  currentPage.value = 1
}

function handleReset() {
  serviceFilter.value = ''
  levelFilter.value = ''
  dateRange.value = []
  currentPage.value = 1
}

function openDetail(row) {
  detailRow.value = row
  detailVisible.value = true
}
</script>

<template>
  <div class="system-log-page page-card">
    <div class="filter-panel">
      <div class="filter-row">
        <span class="field-label">服务名称</span>
        <el-input
          v-model="serviceFilter"
          class="filter-input"
          placeholder="请输入服务名称"
          clearable
          @keyup.enter="handleSearch" aria-label="请输入服务名称"/>

        <span class="field-label">日志级别</span>
        <el-select v-model="levelFilter" placeholder="日志级别" clearable class="filter-select" aria-label="日志级别">
          <el-option
            v-for="opt in levelOptions"
            :key="opt.value || 'all'"
            :label="opt.label"
            :value="opt.value"
          />
        </el-select>

        <span class="field-label">日志时间</span>
        <el-date-picker
          v-model="dateRange"
          type="datetimerange"
          range-separator="-"
          start-placeholder="开始时间"
          end-placeholder="结束时间"
          value-format="YYYY-MM-DD HH:mm:ss"
          class="filter-date" aria-label="开始时间"/>

        <div class="filter-actions">
          <el-button type="primary" class="ap-btn-primary" @click="handleSearch">搜索</el-button>
          <el-button @click="handleReset">重置</el-button>
        </div>
      </div>
    </div>

    <el-table :data="pagedList" border stripe class="ap-table" empty-text="暂无系统日志">
      <el-table-column prop="serviceName" label="服务名称" min-width="220" show-overflow-tooltip />
      <el-table-column label="日志级别" width="100" align="center">
        <template #default="{ row }">
          <el-tag :type="levelTagType(row.level)" size="small" effect="plain">{{ row.level }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="content" label="日志内容" min-width="360" show-overflow-tooltip />
      <el-table-column prop="logTime" label="日志记录时间" width="170" align="center" />
      <el-table-column label="操作" width="80" fixed="right" align="center">
        <template #default="{ row }">
          <el-button link type="primary" @click="openDetail(row)">查看</el-button>
        </template>
      </el-table-column>
    </el-table>

    <div class="table-footer">
      <el-pagination
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :total="filteredList.length"
        :page-sizes="[10, 20, 50]"
        layout="total, sizes, prev, pager, next, jumper"
        background
      />
    </div>

    <el-dialog v-model="detailVisible" title="详情" width="720px" destroy-on-close>
      <div v-if="detailRow" class="detail-body">
        <div class="detail-row two-col">
          <div class="detail-item">
            <span class="detail-label">服务名称</span>
            <span class="detail-value">{{ detailRow.serviceName }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">日志级别</span>
            <span class="detail-value">{{ detailRow.level }}</span>
          </div>
        </div>
        <div class="detail-row">
          <div class="detail-item full">
            <span class="detail-label">日志时间</span>
            <span class="detail-value">{{ detailRow.logTime }}</span>
          </div>
        </div>
        <div class="detail-row">
          <div class="detail-item full">
            <span class="detail-label">日志内容</span>
            <span class="detail-value">{{ detailRow.content }}</span>
          </div>
        </div>
        <div class="detail-row">
          <div class="detail-item full">
            <span class="detail-label">异常堆栈</span>
            <span class="detail-value stack">{{ detailRow.stackTrace || '--' }}</span>
          </div>
        </div>
      </div>
      <template #footer>
        <el-button @click="detailVisible = false">取消</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.system-log-page {
  padding: 16px 20px 20px;
  display: flex;
  flex-direction: column;
  min-height: calc(100vh - 120px);
}

.filter-panel {
  margin-bottom: 14px;
}

.filter-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.field-label {
  font-size: 14px;
  color: var(--ap-text-secondary);
  white-space: nowrap;
}

.filter-input {
  width: 200px;
}

.filter-select {
  width: 140px;
}

.filter-date {
  width: 360px;
}

.filter-actions {
  display: flex;
  gap: 8px;
  margin-left: auto;
}

.ap-table {
  flex: 1;
}

.table-footer {
  margin-top: 14px;
  display: flex;
  justify-content: flex-end;
}

.detail-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.detail-row {
  display: flex;
  gap: 24px;
}

.detail-row.two-col .detail-item {
  flex: 1;
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.detail-item.full {
  width: 100%;
}

.detail-label {
  font-size: 14px;
  color: var(--ap-text-muted);
}

.detail-value {
  font-size: 14px;
  color: var(--ap-text-primary);
  line-height: 1.6;
  word-break: break-all;
}

.detail-value.stack {
  white-space: pre-wrap;
  font-family: Consolas, Monaco, monospace;
  font-size: 13px;
  color: var(--ap-text-secondary);
}
</style>
