<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import {
  getDerivedMajorProjectList,
  DAILY_WORK_CHANGE_EVENT,
} from '../utils/dailyWorkStorage.js'

defineProps({
  title: { type: String, default: '危大工程' },
  description: { type: String, default: '' },
})

const keyword = ref('')
const dateFilter = ref('')
const list = ref([])
const detailVisible = ref(false)
const current = ref(null)

const filtered = computed(() => {
  let rows = list.value
  if (dateFilter.value) rows = rows.filter((r) => r.lastCheck === dateFilter.value)
  const q = keyword.value.trim()
  if (!q) return rows
  return rows.filter((r) =>
    [r.name, r.projectName, r.category, r.scheme]
      .some((f) => String(f || '').includes(q)),
  )
})

function load() {
  list.value = getDerivedMajorProjectList()
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
      <span>危大工程</span>
      <div class="title-actions">
        <el-date-picker
          v-model="dateFilter"
          type="date"
          placeholder="施工日期"
          value-format="YYYY-MM-DD"
          clearable
          class="date-filter"
        />
        <el-input v-model="keyword" placeholder="搜索工程名称、项目、类别…" clearable class="search-input" />
      </div>
    </div>
    <div class="panel-body page-body">
      <p class="page-desc">
        数据由「每日作业填报」自动解析生成（填写了危大工程作业类别）。本页只读展示，请在每日作业填报中维护数据。
      </p>
      <el-table :data="filtered" stripe border empty-text="暂无危大工程，请先在每日作业填报中添加或导入" @row-click="openDetail">
        <el-table-column type="index" label="序号" width="56" />
        <el-table-column prop="name" label="工程名称/内容" min-width="200" show-overflow-tooltip />
        <el-table-column prop="category" label="危大类别" width="110" />
        <el-table-column prop="projectName" label="施工项目" min-width="160" show-overflow-tooltip />
        <el-table-column prop="status" label="状态" width="80" />
        <el-table-column prop="confirmStatus" label="远程确认" width="88" />
        <el-table-column prop="lastCheck" label="施工日期" width="108" />
      </el-table>
    </div>

    <el-dialog v-model="detailVisible" title="危大工程详情" width="640px" destroy-on-close>
      <template v-if="current">
        <el-descriptions :column="1" border size="small">
          <el-descriptions-item label="工程名称">{{ current.name }}</el-descriptions-item>
          <el-descriptions-item label="危大类别">{{ current.category }}</el-descriptions-item>
          <el-descriptions-item label="施工项目">{{ current.projectName || '—' }}</el-descriptions-item>
          <el-descriptions-item label="施工内容">{{ current.detail?.workContent || '—' }}</el-descriptions-item>
          <el-descriptions-item label="专项方案">{{ current.scheme }}</el-descriptions-item>
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
  border-left: 4px solid #409eff;
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
