<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import {
  getDerivedDangerWorkList,
  DAILY_WORK_CHANGE_EVENT,
} from '../utils/dailyWorkStorage.js'

defineProps({
  title: { type: String, default: '高风险作业' },
  description: { type: String, default: '' },
})

const keyword = ref('')
const dateFilter = ref('')
const list = ref([])
const detailVisible = ref(false)
const current = ref(null)

const filtered = computed(() => {
  let rows = list.value
  if (dateFilter.value) rows = rows.filter((r) => r.date === dateFilter.value)
  const q = keyword.value.trim()
  if (!q) return rows
  return rows.filter((r) =>
    [r.projectName, r.type, r.subType, r.location, r.contractor]
      .some((f) => String(f || '').includes(q)),
  )
})

function load() {
  list.value = getDerivedDangerWorkList()
}

function openDetail(row) {
  current.value = row
  detailVisible.value = true
}

onMounted(() => {
  load()
  window.addEventListener(DAILY_WORK_CHANGE_EVENT, load)
})

onUnmounted(() => {
  window.removeEventListener(DAILY_WORK_CHANGE_EVENT, load)
})
</script>

<template>
  <div class="panel-card admin-page">
    <div class="panel-title simple-title">
      <span>高风险作业</span>
      <div class="title-actions">
        <el-date-picker
          v-model="dateFilter"
          type="date"
          placeholder="施工日期"
          value-format="YYYY-MM-DD"
          clearable
          class="date-filter" aria-label="施工日期"/>
        <el-input v-model="keyword" placeholder="搜索项目、类型、区域…" clearable class="search-input" aria-label="搜索项目、类型、区域…"/>
      </div>
    </div>
    <div class="panel-body page-body">
      <p class="page-desc">
        数据由「每日作业填报」自动解析生成（危险作业类别不为「不涉及危险作业」）。本页只读展示，请在每日作业填报中维护数据。
      </p>
      <el-table :data="filtered" stripe border empty-text="暂无高风险作业，请先在每日作业填报中添加或导入" @row-click="openDetail">
        <el-table-column type="index" label="序号" width="56" />
        <el-table-column prop="date" label="施工日期" width="108" />
        <el-table-column prop="projectName" label="施工项目" min-width="160" show-overflow-tooltip />
        <el-table-column prop="contractor" label="施工单位" min-width="140" show-overflow-tooltip />
        <el-table-column prop="type" label="作业类型" width="96" />
        <el-table-column prop="subType" label="当日施工内容" min-width="160" show-overflow-tooltip />
        <el-table-column prop="location" label="施工区域" min-width="120" show-overflow-tooltip />
        <el-table-column prop="status" label="状态" width="80" />
      </el-table>
    </div>

    <el-dialog v-model="detailVisible" title="高风险作业详情" width="640px" destroy-on-close>
      <template v-if="current">
        <el-descriptions :column="1" border size="small">
          <el-descriptions-item label="施工项目">{{ current.projectName || '—' }}</el-descriptions-item>
          <el-descriptions-item label="施工单位">{{ current.contractor || '—' }}</el-descriptions-item>
          <el-descriptions-item label="作业类型">{{ current.type }}</el-descriptions-item>
          <el-descriptions-item label="施工内容">{{ current.subType }}</el-descriptions-item>
          <el-descriptions-item label="施工区域">{{ current.location }}</el-descriptions-item>
        </el-descriptions>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.admin-page {
  min-height: calc(100vh - 120px);
}

.simple-title {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  font-size: 16px;
  border-left: 4px solid #e6a23c;
  padding-left: 12px;
}

.title-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.search-input {
  width: 220px;
}

.date-filter {
  width: 150px;
}

.page-body {
  padding: 16px 20px 24px !important;
}

.page-desc {
  margin: 0 0 16px;
  font-size: 13px;
  color: var(--coc-text-secondary);
  line-height: 1.6;
}
</style>
