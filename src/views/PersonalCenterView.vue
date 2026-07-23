<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Search, Refresh, ArrowDown } from '@element-plus/icons-vue'
import {
  personalTodoStore,
  personalStarted,
  personalCc,
  personalNotices,
  PROCESS_STATUS_OPTIONS,
  PROCESS_CATEGORY_OPTIONS,
  READ_STATUS_OPTIONS,
  NOTICE_MODULE_OPTIONS,
} from '../mock/personalCenter.js'

const route = useRoute()
const router = useRouter()

const activeTab = ref(
  ['todo', 'done', 'started', 'cc', 'notice'].includes(String(route.query.tab || ''))
    ? String(route.query.tab)
    : 'todo',
)

watch(
  () => route.query.tab,
  (tab) => {
    if (tab === 'todo' || tab === 'done' || tab === 'started' || tab === 'cc' || tab === 'notice') {
      activeTab.value = tab
    }
  },
)

const filters = reactive({
  processName: '',
  processStatus: '',
  processCategory: '',
  readStatus: '',
  noticeTitle: '',
  noticeModule: '',
})

const todos = computed(() => personalTodoStore.todos)
const doneList = computed(() => personalTodoStore.done)
const startedList = computed(() => personalStarted)
const ccList = computed(() => personalCc)
const notices = ref([...personalNotices])

const startedSelection = ref([])
const noticeSelection = ref([])

const noticePage = ref(1)
const noticePageSize = ref(10)

function resetFilters() {
  filters.processName = ''
  filters.processStatus = ''
  filters.processCategory = ''
  filters.readStatus = ''
  filters.noticeTitle = ''
  filters.noticeModule = ''
  noticePage.value = 1
}

function onSearch() {
  noticePage.value = 1
  ElMessage.success('已按条件筛选')
}

const filteredTodos = computed(() => {
  const kw = filters.processName.trim()
  if (!kw) return todos.value
  return todos.value.filter((r) => r.processName.includes(kw))
})

const filteredDone = computed(() => {
  const kw = filters.processName.trim()
  if (!kw) return doneList.value
  return doneList.value.filter((r) => r.processName.includes(kw))
})

const filteredStarted = computed(() => {
  let rows = [...startedList.value]
  const kw = filters.processName.trim()
  if (kw) rows = rows.filter((r) => r.processName.includes(kw))
  if (filters.processStatus) rows = rows.filter((r) => r.status === filters.processStatus)
  return rows
})

const filteredCc = computed(() => {
  let rows = [...ccList.value]
  if (filters.processCategory) rows = rows.filter((r) => r.category === filters.processCategory)
  if (filters.readStatus) rows = rows.filter((r) => r.readStatus === filters.readStatus)
  const kw = filters.processName.trim()
  if (kw) rows = rows.filter((r) => r.processName.includes(kw))
  return rows
})

const filteredNotices = computed(() => {
  let rows = [...notices.value]
  const kw = filters.noticeTitle.trim()
  if (kw) rows = rows.filter((r) => `${r.title}${r.content}`.includes(kw))
  if (filters.noticeModule) rows = rows.filter((r) => r.module === filters.noticeModule)
  if (filters.readStatus) rows = rows.filter((r) => r.readStatus === filters.readStatus)
  return rows
})

const pagedNotices = computed(() => {
  const start = (noticePage.value - 1) * noticePageSize.value
  return filteredNotices.value.slice(start, start + noticePageSize.value)
})

function openProcessDetail(row, from) {
  router.push({
    path: '/personal-center/todo/handle',
    query: { id: row.id, from },
  })
}

function handleTodo(row) {
  openProcessDetail(row, 'todo')
}

function viewDone(row) {
  openProcessDetail(row, 'done')
}

function urgeStarted() {
  if (!startedSelection.value.length) return ElMessage.warning('请先勾选需要催办的流程')
  ElMessage.success(`已对 ${startedSelection.value.length} 条流程发起催办`)
}

function viewStarted(row) {
  openProcessDetail(row, 'started')
}

function markAllCcRead() {
  personalCc.forEach((r) => {
    r.readStatus = '已读'
  })
  ElMessage.success('抄送消息已全部标为已读')
}

function viewCc(row) {
  row.readStatus = '已读'
  openProcessDetail(row, 'cc')
}

function markAllNoticesRead() {
  notices.value.forEach((r) => {
    r.readStatus = '已读'
  })
  ElMessage.success('通知已全部标为已读')
}

function batchDeleteNotices() {
  if (!noticeSelection.value.length) return ElMessage.warning('请先勾选要删除的通知')
  const ids = new Set(noticeSelection.value.map((r) => r.id))
  notices.value = notices.value.filter((r) => !ids.has(r.id))
  noticeSelection.value = []
  ElMessage.success('已批量删除')
}

function viewNotice(row) {
  row.readStatus = '已读'
  ElMessage.info(`通知详情：${row.title}`)
}

function onTabChange(name) {
  resetFilters()
  startedSelection.value = []
  noticeSelection.value = []
  router.replace({ path: '/personal-center', query: name === 'todo' ? {} : { tab: name } })
}
</script>

<template>
  <div class="pc-page page-card">
    <h1 class="pc-title">个人中心</h1>

    <el-tabs v-model="activeTab" class="pc-tabs" @tab-change="onTabChange">
      <el-tab-pane label="我的待办" name="todo" />
      <el-tab-pane label="我的已办" name="done" />
      <el-tab-pane label="我发起的" name="started" />
      <el-tab-pane label="抄送我的" name="cc" />
      <el-tab-pane label="通知信息" name="notice" />
    </el-tabs>

    <!-- 我的待办 -->
    <template v-if="activeTab === 'todo'">
      <div class="filter-bar">
        <span class="filter-label">流程名称</span>
        <el-input v-model="filters.processName" clearable placeholder="请输入流程名称" style="width: 240px" />
        <el-button type="primary" :icon="Search" @click="onSearch">搜索</el-button>
        <el-button :icon="Refresh" @click="resetFilters">重置</el-button>
      </div>
      <el-table :data="filteredTodos" border stripe empty-text="暂无数据">
        <el-table-column prop="processName" label="流程名称" min-width="220" show-overflow-tooltip />
        <el-table-column prop="applicant" label="申请人" width="110" />
        <el-table-column prop="dept" label="申请人部门" width="140" />
        <el-table-column prop="applyTime" label="申请时间" width="170" />
        <el-table-column label="操作" width="90" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="handleTodo(row)">处理</el-button>
          </template>
        </el-table-column>
      </el-table>
    </template>

    <!-- 我的已办 -->
    <template v-else-if="activeTab === 'done'">
      <div class="filter-bar">
        <span class="filter-label">流程名称</span>
        <el-input v-model="filters.processName" clearable placeholder="请输入流程名称" style="width: 240px" />
        <el-button type="primary" :icon="Search" @click="onSearch">搜索</el-button>
        <el-button :icon="Refresh" @click="resetFilters">重置</el-button>
      </div>
      <div class="table-toolbar">
        <span class="count-text">共 {{ filteredDone.length }} 条</span>
      </div>
      <el-table :data="filteredDone" border stripe empty-text="暂无数据">
        <el-table-column prop="processName" label="流程名称" min-width="220" show-overflow-tooltip />
        <el-table-column prop="applicant" label="申请人" width="110" />
        <el-table-column prop="dept" label="申请人部门" width="140" />
        <el-table-column prop="applyTime" label="申请时间" width="170" />
        <el-table-column prop="handleTime" label="处理时间" width="170" />
        <el-table-column label="操作" width="90" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="viewDone(row)">详情</el-button>
          </template>
        </el-table-column>
      </el-table>
    </template>

    <!-- 我发起的 -->
    <template v-else-if="activeTab === 'started'">
      <div class="filter-bar">
        <span class="filter-label">流程名称</span>
        <el-input v-model="filters.processName" clearable placeholder="请输入流程名称" style="width: 220px" />
        <span class="filter-label">处理状态</span>
        <el-select v-model="filters.processStatus" clearable placeholder="请选择" style="width: 160px">
          <el-option v-for="s in PROCESS_STATUS_OPTIONS" :key="s" :label="s" :value="s" />
        </el-select>
        <el-button type="primary" :icon="Search" @click="onSearch">搜索</el-button>
        <el-button :icon="Refresh" @click="resetFilters">重置</el-button>
      </div>
      <div class="table-toolbar">
        <span class="count-text">共 {{ filteredStarted.length }} 条</span>
        <el-button type="primary" plain @click="urgeStarted">批量催办</el-button>
      </div>
      <el-table
        :data="filteredStarted"
        border
        stripe
        empty-text="暂无数据"
        @selection-change="(rows) => (startedSelection = rows)"
      >
        <el-table-column type="selection" width="48" />
        <el-table-column prop="status" label="处理状态" width="110" />
        <el-table-column prop="processName" label="流程名称" min-width="220" show-overflow-tooltip />
        <el-table-column prop="applyTime" label="申请时间" width="170" />
        <el-table-column prop="endTime" label="结束时间" width="170">
          <template #default="{ row }">{{ row.endTime || '—' }}</template>
        </el-table-column>
        <el-table-column label="操作" width="90" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="viewStarted(row)">详情</el-button>
          </template>
        </el-table-column>
      </el-table>
    </template>

    <!-- 抄送我的 -->
    <template v-else-if="activeTab === 'cc'">
      <div class="filter-bar">
        <span class="filter-label">流程类别</span>
        <el-select v-model="filters.processCategory" clearable placeholder="请选择" style="width: 150px">
          <el-option v-for="s in PROCESS_CATEGORY_OPTIONS" :key="s" :label="s" :value="s" />
        </el-select>
        <span class="filter-label">阅读状态</span>
        <el-select v-model="filters.readStatus" clearable placeholder="请选择阅读状态" style="width: 160px">
          <el-option v-for="s in READ_STATUS_OPTIONS" :key="s" :label="s" :value="s" />
        </el-select>
        <el-input v-model="filters.processName" clearable placeholder="请输入流程名称" style="width: 220px" />
        <el-button type="primary" :icon="Search" @click="onSearch">搜索</el-button>
        <el-button :icon="Refresh" @click="resetFilters">重置</el-button>
      </div>
      <div class="table-toolbar">
        <span class="count-text">共 {{ filteredCc.length }} 条</span>
        <el-button type="primary" @click="markAllCcRead">全部已读</el-button>
      </div>
      <el-table :data="filteredCc" border stripe empty-text="暂无数据">
        <el-table-column type="index" label="序号" width="64" />
        <el-table-column prop="category" label="流程类别" width="110" />
        <el-table-column prop="processName" label="流程名称" min-width="180" show-overflow-tooltip />
        <el-table-column prop="projectName" label="项目名称" min-width="140" show-overflow-tooltip />
        <el-table-column prop="applicant" label="申请人" width="100" />
        <el-table-column prop="readStatus" label="阅读状态" width="100" />
        <el-table-column prop="applyTime" label="申请时间" width="170" />
        <el-table-column prop="endTime" label="结束时间" width="170">
          <template #default="{ row }">{{ row.endTime || '—' }}</template>
        </el-table-column>
        <el-table-column label="操作" width="90" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="viewCc(row)">详情</el-button>
          </template>
        </el-table-column>
      </el-table>
    </template>

    <!-- 通知信息 -->
    <template v-else>
      <div class="filter-bar filter-bar-notice">
        <span class="filter-label">消息名称</span>
        <el-input v-model="filters.noticeTitle" clearable placeholder="请输入消息名称" style="width: 200px" />
        <span class="filter-label">所属模块</span>
        <el-select v-model="filters.noticeModule" clearable placeholder="请选择所属模块" style="width: 160px">
          <el-option v-for="s in NOTICE_MODULE_OPTIONS" :key="s" :label="s" :value="s" />
        </el-select>
        <span class="filter-label">阅读状态</span>
        <el-select v-model="filters.readStatus" clearable placeholder="请选择阅读状态" style="width: 160px">
          <el-option v-for="s in READ_STATUS_OPTIONS" :key="s" :label="s" :value="s" />
        </el-select>
        <span class="expand-link">
          展开
          <el-icon><ArrowDown /></el-icon>
        </span>
        <el-button type="primary" :icon="Search" @click="onSearch">搜索</el-button>
        <el-button :icon="Refresh" @click="resetFilters">重置</el-button>
      </div>
      <div class="table-toolbar">
        <span class="count-text">共 {{ filteredNotices.length }} 条</span>
        <div class="toolbar-actions">
          <el-button type="primary" plain @click="batchDeleteNotices">批量删除</el-button>
          <el-button type="primary" @click="markAllNoticesRead">全部已读</el-button>
        </div>
      </div>
      <el-table
        :data="pagedNotices"
        border
        stripe
        empty-text="暂无数据"
        @selection-change="(rows) => (noticeSelection = rows)"
      >
        <el-table-column type="selection" width="48" />
        <el-table-column prop="module" label="所属模块" width="120" />
        <el-table-column prop="title" label="消息名称" min-width="160" show-overflow-tooltip />
        <el-table-column prop="content" label="消息内容" min-width="280" show-overflow-tooltip />
        <el-table-column prop="time" label="消息时间" width="170" />
        <el-table-column prop="readStatus" label="阅读状态" width="100" />
        <el-table-column label="操作" width="90" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="viewNotice(row)">详情</el-button>
          </template>
        </el-table-column>
      </el-table>
      <div class="pager">
        <el-pagination
          v-model:current-page="noticePage"
          v-model:page-size="noticePageSize"
          :total="filteredNotices.length"
          :page-sizes="[10, 20, 50]"
          layout="total, sizes, prev, pager, next, jumper"
          background
        />
      </div>
    </template>
  </div>
</template>

<style scoped>
.pc-page {
  display: flex;
  flex-direction: column;
  gap: 0;
  min-height: 100%;
  background: #fff;
  padding: 16px 20px 24px;
}

.pc-title {
  margin: 0 0 8px;
  font-size: 18px;
  font-weight: 600;
  color: var(--el-color-primary, #409eff);
}

.pc-tabs {
  margin-bottom: 12px;
}

.pc-tabs :deep(.el-tabs__header) {
  margin-bottom: 0;
}

.pc-tabs :deep(.el-tabs__nav-wrap::after) {
  height: 1px;
}

.filter-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  margin: 16px 0;
  padding: 12px 14px;
  background: #f5f7fa;
  border-radius: 4px;
}

.filter-label {
  font-size: 13px;
  color: #606266;
  white-space: nowrap;
}

.expand-link {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  font-size: 13px;
  color: #409eff;
  cursor: pointer;
  margin-left: 4px;
}

.table-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.count-text {
  font-size: 13px;
  color: #606266;
}

.toolbar-actions {
  display: flex;
  gap: 8px;
}

.pager {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}
</style>
