<script setup>
import { computed, reactive, ref, watch, onMounted } from 'vue'
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
  WARNING_CENTER_TYPE_OPTIONS,
  WARNING_CENTER_STATUS_OPTIONS,
  ensureQmPersonalCenterSeeds,
  ensureLaborWarningCenterSeeds,
  listPersonalWarningCenter,
  markWarningCenterRead,
  dismissWarningCenter,
} from '../mock/personalCenter.js'
import '../mock/mat.js'
import '../mock/eq.js'

const route = useRoute()
const router = useRouter()

const TAB_NAMES = ['todo', 'done', 'started', 'cc', 'warning-center', 'notice']

onMounted(() => {
  ensureQmPersonalCenterSeeds()
  ensureLaborWarningCenterSeeds()
})

const activeTab = ref(
  TAB_NAMES.includes(String(route.query.tab || '')) ? String(route.query.tab) : 'todo',
)

watch(
  () => route.query.tab,
  (tab) => {
    if (TAB_NAMES.includes(String(tab || ''))) {
      activeTab.value = String(tab)
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
  warnType: '',
  warnStatus: '',
  warnKeyword: '',
})

const todos = computed(() => personalTodoStore.todos)
const doneList = computed(() => personalTodoStore.done)
const startedList = computed(() => personalStarted)
const ccList = computed(() => personalCc)
const notices = ref([...personalNotices])
const warningCenterTick = ref(0)
const warningCenterList = computed(() => {
  warningCenterTick.value
  return listPersonalWarningCenter()
})

const startedSelection = ref([])
const noticeSelection = ref([])
const warningSelection = ref([])

const page = ref(1)
const pageSize = ref(10)

function resetFilters() {
  filters.processName = ''
  filters.processStatus = ''
  filters.processCategory = ''
  filters.readStatus = ''
  filters.noticeTitle = ''
  filters.noticeModule = ''
  filters.warnType = ''
  filters.warnStatus = ''
  filters.warnKeyword = ''
  page.value = 1
}

function onSearch() {
  page.value = 1
  ElMessage.success('已按条件筛选')
}

function slicePage(rows) {
  const start = (page.value - 1) * pageSize.value
  return rows.slice(start, start + pageSize.value)
}

const filteredTodos = computed(() => {
  let rows = [...todos.value]
  if (filters.processCategory) rows = rows.filter((r) => r.category === filters.processCategory)
  const kw = filters.processName.trim()
  if (kw) rows = rows.filter((r) => r.processName.includes(kw))
  return rows
})

const filteredDone = computed(() => {
  let rows = [...doneList.value]
  if (filters.processCategory) rows = rows.filter((r) => r.category === filters.processCategory)
  const kw = filters.processName.trim()
  if (kw) rows = rows.filter((r) => r.processName.includes(kw))
  return rows
})

const filteredStarted = computed(() => {
  let rows = [...startedList.value]
  if (filters.processCategory) rows = rows.filter((r) => r.category === filters.processCategory)
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

const filteredWarningCenter = computed(() => {
  let rows = [...warningCenterList.value]
  if (filters.warnType) rows = rows.filter((r) => r.warnType === filters.warnType)
  if (filters.warnStatus) rows = rows.filter((r) => r.status === filters.warnStatus)
  const kw = filters.warnKeyword.trim()
  if (kw) {
    rows = rows.filter((r) =>
      [r.description, r.projectName, r.handler, r.module].some((v) => String(v || '').includes(kw)),
    )
  }
  return rows
})

const pagedTodos = computed(() => slicePage(filteredTodos.value))
const pagedDone = computed(() => slicePage(filteredDone.value))
const pagedStarted = computed(() => slicePage(filteredStarted.value))
const pagedCc = computed(() => slicePage(filteredCc.value))
const pagedNotices = computed(() => slicePage(filteredNotices.value))
const pagedWarningCenter = computed(() => slicePage(filteredWarningCenter.value))

const activeTotal = computed(() => {
  if (activeTab.value === 'todo') return filteredTodos.value.length
  if (activeTab.value === 'done') return filteredDone.value.length
  if (activeTab.value === 'started') return filteredStarted.value.length
  if (activeTab.value === 'cc') return filteredCc.value.length
  if (activeTab.value === 'warning-center') return filteredWarningCenter.value.length
  return filteredNotices.value.length
})

function ccIndexMethod(index) {
  return (page.value - 1) * pageSize.value + index + 1
}
function refreshWarningCenter() {
  warningCenterTick.value += 1
}

function openProcessDetail(row, from) {
  // 质量验评审批：跳转验评审批页（审批入口在个人中心）
  if (row?.type === 'qm_inspect' && row.approvePath && row.qmTaskId) {
    router.push({
      path: row.approvePath,
      query: { id: row.qmTaskId, from: 'personal-center', todoId: row.id },
    })
    return
  }
  // 质量验评整改：跳转整改详情页（提交整改入口在个人中心）
  if (row?.type === 'qm_rectify' && row.rectifyPath && row.qmRectifyId) {
    router.push({
      path: row.rectifyPath,
      query: { id: row.qmRectifyId, from: 'personal-center', todoId: row.id },
    })
    return
  }
  // 人员实名制预警：与预警清单「处置预警」详情页同一路由（兼容旧待办入口）
  if (row?.type === 'labor_warning' && row.laborWarningId) {
    router.push({
      name: 'LaborWarningDetail',
      params: { id: row.laborWarningId },
      query: {
        from: 'personal-center',
        tab: 'warning-center',
        todoId: row.id,
      },
    })
    return
  }
  router.push({
    path: '/personal-center/todo/handle',
    query: { id: row.id, from },
  })
}

function viewWarningCenter(row) {
  if (!row?.laborWarningId) {
    ElMessage.warning('未关联预警详情')
    return
  }
  router.push({
    name: 'LaborWarningDetail',
    params: { id: row.laborWarningId },
    query: {
      from: 'personal-center',
      tab: 'warning-center',
    },
  })
}

function batchMarkWarningRead() {
  if (!warningSelection.value.length) return ElMessage.warning('请先勾选要标为已读的预警')
  const n = markWarningCenterRead(warningSelection.value.map((r) => r.id))
  warningSelection.value = []
  refreshWarningCenter()
  if (!n) return ElMessage.warning('所选条目中没有可标为已读的「未读」通知')
  ElMessage.success(`已将 ${n} 条通知标为已读`)
}

function batchDismissWarning() {
  if (!warningSelection.value.length) return ElMessage.warning('请先勾选要消除的预警')
  const n = dismissWarningCenter(warningSelection.value.map((r) => r.id))
  warningSelection.value = []
  refreshWarningCenter()
  ElMessage.success(`已消除 ${n} 条预警（仅从预警中心移除，未关闭业务预警）`)
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
  warningSelection.value = []
  router.replace({ path: '/personal-center', query: name === 'todo' ? {} : { tab: name } })
}

watch([activeTotal, pageSize], () => {
  const maxPage = Math.max(1, Math.ceil(activeTotal.value / pageSize.value) || 1)
  if (page.value > maxPage) page.value = maxPage
})
</script>

<template>
  <div class="pc-page page-card">
    <h1 class="pc-title">个人中心</h1>

    <el-tabs v-model="activeTab" class="pc-tabs" @tab-change="onTabChange">
      <el-tab-pane label="我的待办" name="todo" />
      <el-tab-pane label="我的已办" name="done" />
      <el-tab-pane label="我发起的" name="started" />
      <el-tab-pane label="抄送我的" name="cc" />
      <el-tab-pane label="预警中心" name="warning-center" />
      <el-tab-pane label="通知信息" name="notice" />
    </el-tabs>

    <!-- 我的待办 -->
    <template v-if="activeTab === 'todo'">
      <div class="filter-bar">
        <span class="filter-label">所属模块</span>
        <el-select v-model="filters.processCategory" clearable placeholder="请选择" style="width: 150px">
          <el-option v-for="s in PROCESS_CATEGORY_OPTIONS" :key="s" :label="s" :value="s" />
        </el-select>
        <span class="filter-label">流程名称</span>
        <el-input v-model="filters.processName" clearable placeholder="请输入流程名称" style="width: 240px" />
        <el-button type="primary" :icon="Search" @click="onSearch">搜索</el-button>
        <el-button :icon="Refresh" @click="resetFilters">重置</el-button>
      </div>
      <div class="table-toolbar">
        <span class="count-text">共 {{ filteredTodos.length }} 条</span>
      </div>
      <el-table :data="pagedTodos" border stripe empty-text="暂无数据">
        <el-table-column prop="category" label="所属模块" width="110" />
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
        <span class="filter-label">所属模块</span>
        <el-select v-model="filters.processCategory" clearable placeholder="请选择" style="width: 150px">
          <el-option v-for="s in PROCESS_CATEGORY_OPTIONS" :key="s" :label="s" :value="s" />
        </el-select>
        <span class="filter-label">流程名称</span>
        <el-input v-model="filters.processName" clearable placeholder="请输入流程名称" style="width: 240px" />
        <el-button type="primary" :icon="Search" @click="onSearch">搜索</el-button>
        <el-button :icon="Refresh" @click="resetFilters">重置</el-button>
      </div>
      <div class="table-toolbar">
        <span class="count-text">共 {{ filteredDone.length }} 条</span>
      </div>
      <el-table :data="pagedDone" border stripe empty-text="暂无数据">
        <el-table-column prop="category" label="所属模块" width="110" />
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
        <span class="filter-label">所属模块</span>
        <el-select v-model="filters.processCategory" clearable placeholder="请选择" style="width: 150px">
          <el-option v-for="s in PROCESS_CATEGORY_OPTIONS" :key="s" :label="s" :value="s" />
        </el-select>
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
        :data="pagedStarted"
        border
        stripe
        empty-text="暂无数据"
        @selection-change="(rows) => (startedSelection = rows)"
      >
        <el-table-column type="selection" width="48" />
        <el-table-column prop="category" label="所属模块" width="110" />
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
        <span class="filter-label">所属模块</span>
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
      <el-table :data="pagedCc" border stripe empty-text="暂无数据">
        <el-table-column type="index" label="序号" width="64" :index="ccIndexMethod" />
        <el-table-column prop="category" label="所属模块" width="110" />
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

    <!-- 预警中心 -->
    <template v-else-if="activeTab === 'warning-center'">
      <div class="filter-bar">
        <span class="filter-label">类型</span>
        <el-select v-model="filters.warnType" clearable placeholder="请选择" style="width: 150px">
          <el-option v-for="s in WARNING_CENTER_TYPE_OPTIONS" :key="s" :label="s" :value="s" />
        </el-select>
        <span class="filter-label">状态</span>
        <el-select v-model="filters.warnStatus" clearable placeholder="请选择" style="width: 150px">
          <el-option v-for="s in WARNING_CENTER_STATUS_OPTIONS" :key="s" :label="s" :value="s" />
        </el-select>
        <span class="filter-label">预警描述</span>
        <el-input v-model="filters.warnKeyword" clearable placeholder="请输入关键词" style="width: 240px" />
        <el-button type="primary" :icon="Search" @click="onSearch">搜索</el-button>
        <el-button :icon="Refresh" @click="resetFilters">重置</el-button>
      </div>
      <div class="table-toolbar">
        <span class="count-text">共 {{ filteredWarningCenter.length }} 条</span>
        <div class="toolbar-actions">
          <el-button type="primary" plain @click="batchMarkWarningRead">批量已读</el-button>
          <el-button type="danger" plain @click="batchDismissWarning">批量消除预警</el-button>
        </div>
      </div>
      <el-table
        :data="pagedWarningCenter"
        border
        stripe
        empty-text="暂无数据"
        @selection-change="(rows) => (warningSelection = rows)"
      >
        <el-table-column type="selection" width="48" />
        <el-table-column prop="module" label="所属模块" width="110" />
        <el-table-column prop="projectName" label="项目名称" width="120" show-overflow-tooltip />
        <el-table-column prop="description" label="预警描述" min-width="280" show-overflow-tooltip />
        <el-table-column prop="handler" label="处理人" width="100" />
        <el-table-column prop="warnType" label="类型" width="120" />
        <el-table-column prop="status" label="状态" width="100" />
        <el-table-column prop="time" label="消息时间" width="170" />
        <el-table-column label="操作" width="90" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="viewWarningCenter(row)">详情</el-button>
          </template>
        </el-table-column>
      </el-table>
    </template>

    <!-- 通知信息 -->
    <template v-else-if="activeTab === 'notice'">
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
    </template>

    <div class="pager">
      <el-pagination
        v-model:current-page="page"
        v-model:page-size="pageSize"
        :total="activeTotal"
        :page-sizes="[10, 20, 50]"
        layout="total, sizes, prev, pager, next, jumper"
        background
      />
    </div>
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
