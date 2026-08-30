<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import {
  listLaborPersonalTodos,
  listLaborPersonalDone,
  listLaborPersonalStarted,
  listLaborPersonalCc,
  listLaborPersonalNotices,
  ensureLaborWarningCenterSeeds,
  listPersonalWarningCenter,
  markPersonalNoticesRead,
  markWarningCenterRead,
} from '../../mock/personalCenter.js'

/** 样式参考：消息中心(移动端) */
const CENTER_MSG = '消息中心'
const CENTER_NOTICE = '通知信息'
const CENTER_WARN = '预警中心'

const router = useRouter()
const route = useRoute()
const activeCenter = ref(CENTER_MSG)
const activeTab = ref('todo')
const keyword = ref('')
const showFilter = ref(false)
const nodeFilter = ref('')
const warnTypeFilter = ref('')
const warnStatusFilter = ref('')
const selectedNoticeIds = ref([])
const noticeTick = ref(0)
const warningTick = ref(0)

const pageTitle = computed(() => activeCenter.value)

onMounted(() => {
  ensureLaborWarningCenterSeeds()
  const tab = String(route.query.tab || '')
  if (tab === 'warning-center' || tab === 'warn') activeCenter.value = CENTER_WARN
  else if (tab === 'notice') activeCenter.value = CENTER_NOTICE
  else if (['todo', 'done', 'initiated', 'copied'].includes(tab)) {
    activeCenter.value = CENTER_MSG
    activeTab.value = tab
  }
})

watch(activeCenter, (name) => {
  const map = {
    [CENTER_MSG]: 'todo',
    [CENTER_NOTICE]: 'notice',
    [CENTER_WARN]: 'warning-center',
  }
  router.replace({ query: { ...route.query, tab: map[name] || 'todo' } })
})

const todos = computed(() => listLaborPersonalTodos())
const doneList = computed(() => listLaborPersonalDone())
const startedList = computed(() => listLaborPersonalStarted())
const ccList = computed(() => listLaborPersonalCc())
const notices = computed(() => {
  noticeTick.value
  return listLaborPersonalNotices()
})

const warningList = computed(() => {
  warningTick.value
  return listPersonalWarningCenter()
})

const unreadNoticeCount = computed(() => notices.value.filter((n) => n.readStatus === '未读').length)
const pendingWarningCount = computed(
  () => warningList.value.filter((w) => w.status === '待处理' || w.status === '未读').length,
)

const flowByTab = computed(() => ({
  todo: todos.value,
  initiated: startedList.value,
  done: doneList.value,
  copied: ccList.value,
}))

const tabItems = computed(() => [
  { key: 'todo', label: '我的待办', count: flowByTab.value.todo.length },
  { key: 'initiated', label: '我的发起', count: flowByTab.value.initiated.length },
  { key: 'done', label: '我的已办', count: flowByTab.value.done.length },
  { key: 'copied', label: '抄送我的', count: flowByTab.value.copied.length },
])

const currentFlowSource = computed(() => flowByTab.value[activeTab.value] || [])

function resolveCurrentNode(item) {
  if (activeTab.value === 'done' || item.handleLabel) return item.handleLabel || '已关闭'
  if (activeTab.value === 'initiated' && item.status) return item.status
  const flow = item.approvalFlow || []
  const current = flow.find((step) => step.status === 'current')
  if (current?.title) return current.title
  if (activeTab.value === 'copied') return '抄送知悉'
  return '待办理'
}

const nodeOptions = computed(() => [
  ...new Set(currentFlowSource.value.map((i) => resolveCurrentNode(i))),
])

const flowMessages = computed(() => {
  const text = keyword.value.trim()
  return currentFlowSource.value.filter((item) => {
    const currentNode = resolveCurrentNode(item)
    if (nodeFilter.value && currentNode !== nodeFilter.value) return false
    if (!text) return true
    return [item.processName, currentNode, item.applicant, item.detail?.project].some((v) =>
      String(v || '').includes(text),
    )
  })
})

const noticeMessages = computed(() => {
  const text = keyword.value.trim()
  return notices.value.filter((item) => {
    if (!text) return true
    return [item.title, item.content, item.module].some((v) => String(v || '').includes(text))
  })
})

const warningMessages = computed(() => {
  const text = keyword.value.trim()
  return warningList.value.filter((item) => {
    if (warnTypeFilter.value && item.warnType !== warnTypeFilter.value) return false
    if (warnStatusFilter.value && item.status !== warnStatusFilter.value) return false
    if (!text) return true
    return [item.description, item.module, item.projectName].some((v) =>
      String(v || '').includes(text),
    )
  })
})

function switchCenter(name) {
  activeCenter.value = name
  selectedNoticeIds.value = []
  keyword.value = ''
  showFilter.value = false
  nodeFilter.value = ''
  warnTypeFilter.value = ''
  warnStatusFilter.value = ''
}

function openTodo(item) {
  const tab =
    activeTab.value === 'done'
      ? 'done'
      : activeTab.value === 'initiated'
        ? 'started'
        : activeTab.value === 'copied'
          ? 'cc'
          : 'todo'

  if (item.type === 'labor_warning' && item.laborWarningId) {
    router.push({
      path: `/app/warning/${item.laborWarningId}`,
      query: { from: 'app', tab },
    })
    return
  }

  router.push({
    path: '/app/todo/handle',
    query: { id: item.id, from: tab },
  })
}

function openWarningDetail(item) {
  if (item.laborWarningId) {
    if (item.warnType === '通知' && item.status === '未读') {
      markWarningCenterRead([item.id])
      warningTick.value += 1
    }
    router.push({
      path: `/app/warning/${item.laborWarningId}`,
      query: { from: 'app', tab: 'warning-center' },
    })
    return
  }
  // AI / 机械 / 危大等模块预警：走 APP 处置页
  router.push({
    path: '/app/todo/handle',
    query: { id: item.id, from: 'warning-center' },
  })
}

function resolveStatus(item) {
  if (activeTab.value === 'done') return '已办结'
  if (activeTab.value === 'initiated') return item.status || '进行中'
  if (activeTab.value === 'copied') return item.readStatus === '未读' ? '未读' : '已读'
  return '待办'
}

function statusTagClass(item) {
  const status = resolveStatus(item)
  if (status === '待办' || status === '未读') return 'todo'
  if (status === '已办结' || status === '已读' || status === '已通过') return 'done'
  return 'moving'
}

function warnStatusTagClass(status) {
  if (status === '待处理' || status === '未读') return 'todo'
  if (status === '已关闭' || status === '已读') return 'done'
  return 'moving'
}

function applyDate(item) {
  return String(item.applyTime || item.handleTime || item.endTime || '').slice(0, 10)
}

function toggleNoticeSelect(id) {
  const idx = selectedNoticeIds.value.indexOf(id)
  if (idx >= 0) selectedNoticeIds.value.splice(idx, 1)
  else selectedNoticeIds.value.push(id)
}

function batchMarkNoticeRead() {
  const n = markPersonalNoticesRead(selectedNoticeIds.value)
  selectedNoticeIds.value = []
  noticeTick.value += 1
  ElMessage.success(n ? `已标记 ${n} 条已读` : '没有可标记的未读通知')
}

function handleMessage(item) {
  openTodo(item)
}
</script>

<template>
  <div class="message-page">
    <header class="mobile-header">
      <h1>{{ pageTitle }}</h1>
      <span class="header-count">{{ todos.length }} 条待办</span>
    </header>

    <section class="center-switcher">
      <button
        v-for="item in [
          { name: CENTER_MSG, icon: '⇄' },
          { name: CENTER_NOTICE, icon: '◷' },
          { name: CENTER_WARN, icon: '⚠' },
        ]"
        :key="item.name"
        type="button"
        :class="{ active: activeCenter === item.name }"
        @click="switchCenter(item.name)"
      >
        <span class="center-icon">{{ item.icon }}</span>
        <span>{{ item.name }}</span>
        <i v-if="item.name === CENTER_MSG && todos.length">{{ todos.length }}</i>
        <i v-else-if="item.name === CENTER_NOTICE && unreadNoticeCount">{{ unreadNoticeCount }}</i>
        <i v-else-if="item.name === CENTER_WARN && pendingWarningCount">{{ pendingWarningCount }}</i>
      </button>
    </section>

    <template v-if="activeCenter === CENTER_MSG">
      <section class="search-row">
        <div class="search-box">
          <span>⌕</span>
          <input v-model="keyword" placeholder="搜索流程名称、申请人、当前节点" />
        </div>
        <button
          type="button"
          class="filter-button"
          :class="{ active: showFilter }"
          @click="showFilter = !showFilter"
        >
          筛选
        </button>
      </section>
      <section v-if="showFilter" class="filter-panel">
        <span>当前节点</span>
        <select v-model="nodeFilter">
          <option value="">全部</option>
          <option v-for="node in nodeOptions" :key="node" :value="node">{{ node }}</option>
        </select>
      </section>

      <nav class="flow-tabs">
        <button
          v-for="tab in tabItems"
          :key="tab.key"
          type="button"
          :class="{ active: activeTab === tab.key }"
          @click="activeTab = tab.key"
        >
          {{ tab.label }}<i v-if="tab.count">{{ tab.count }}</i>
        </button>
      </nav>

      <main class="message-list">
        <article v-for="item in flowMessages" :key="item.id" class="message-card">
          <div class="message-card-head">
            <strong>{{ item.processName }}</strong>
            <span :class="['status-tag', statusTagClass(item)]">{{ resolveStatus(item) }}</span>
          </div>
          <div class="message-field"><span>当前节点：</span><b>{{ resolveCurrentNode(item) }}</b></div>
          <div class="message-field"><span>申请人：</span><b>{{ item.applicant || '—' }}</b></div>
          <div class="message-field"><span>所属项目：</span><b>{{ item.detail?.project || '—' }}</b></div>
          <div class="message-field"><span>申请日期：</span><b>{{ applyDate(item) }}</b></div>
          <footer>
            <button type="button" @click="handleMessage(item)">
              {{ resolveStatus(item) === '待办' ? '处理' : '详情' }}
            </button>
          </footer>
        </article>
        <div v-if="!flowMessages.length" class="empty-state">暂无相关消息</div>
      </main>
    </template>

    <template v-else-if="activeCenter === CENTER_NOTICE">
      <section class="search-row">
        <div class="search-box">
          <span>⌕</span>
          <input v-model="keyword" placeholder="搜索通知标题、内容" />
        </div>
      </section>
      <main class="message-list">
        <article v-for="item in noticeMessages" :key="item.id" class="message-card">
          <div class="message-card-head">
            <label class="select-row">
              <input
                type="checkbox"
                :checked="selectedNoticeIds.includes(item.id)"
                @change="toggleNoticeSelect(item.id)"
              />
              <strong>{{ item.title }}</strong>
            </label>
            <span :class="['status-tag', item.readStatus === '未读' ? 'todo' : 'done']">
              {{ item.readStatus }}
            </span>
          </div>
          <div class="message-field"><span>模块：</span><b>{{ item.module || '—' }}</b></div>
          <div class="message-field"><span>时间：</span><b>{{ item.time || '—' }}</b></div>
          <p class="notice-body">{{ item.content }}</p>
        </article>
        <div v-if="!noticeMessages.length" class="empty-center">
          <span>◷</span>
          <strong>{{ CENTER_NOTICE }}</strong>
          <p>暂无新消息</p>
        </div>
      </main>
      <div v-if="selectedNoticeIds.length" class="batch-action-bar">
        <span>已选 {{ selectedNoticeIds.length }} 条</span>
        <button type="button" class="plain" @click="batchMarkNoticeRead">批量已读</button>
      </div>
    </template>

    <template v-else>
      <section class="search-row">
        <div class="search-box">
          <span>⌕</span>
          <input v-model="keyword" placeholder="搜索预警描述" />
        </div>
        <button
          type="button"
          class="filter-button"
          :class="{ active: showFilter }"
          @click="showFilter = !showFilter"
        >
          筛选
        </button>
      </section>
      <section v-if="showFilter" class="filter-panel dual">
        <label>
          <span>类型</span>
          <select v-model="warnTypeFilter">
            <option value="">全部</option>
            <option value="处置任务">处置任务</option>
            <option value="通知">通知</option>
          </select>
        </label>
        <label>
          <span>状态</span>
          <select v-model="warnStatusFilter">
            <option value="">全部</option>
            <option value="待处理">待处理</option>
            <option value="已关闭">已关闭</option>
            <option value="未读">未读</option>
            <option value="已读">已读</option>
          </select>
        </label>
      </section>
      <main class="message-list">
        <article v-for="item in warningMessages" :key="item.id" class="message-card">
          <div class="message-card-head">
            <strong>{{ item.description }}</strong>
            <span :class="['status-tag', warnStatusTagClass(item.status)]">{{ item.status }}</span>
          </div>
          <div class="message-field"><span>模块：</span><b>{{ item.module }}</b></div>
          <div class="message-field"><span>项目：</span><b>{{ item.projectName || '—' }}</b></div>
          <footer>
            <button type="button" @click="openWarningDetail(item)">详情</button>
          </footer>
        </article>
        <div v-if="!warningMessages.length" class="empty-center">
          <span>⚠</span>
          <strong>{{ CENTER_WARN }}</strong>
          <p>暂无新消息</p>
        </div>
      </main>
    </template>
  </div>
</template>

<style scoped>
.message-page {
  width: 100%;
  min-height: 100%;
  background: #f4f5f7;
  color: #1f2329;
  box-sizing: border-box;
}
.mobile-header {
  display: flex;
  align-items: center;
  padding: 28px 36px;
  background: #8f0045;
  color: #fff;
  position: sticky;
  top: 0;
  z-index: 10;
}
.mobile-header h1 {
  flex: 1;
  margin: 0;
  font-size: 40px;
  font-weight: 600;
}
.header-count {
  font-size: 24px;
  opacity: 0.85;
}
.center-switcher {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  padding: 24px;
  background: #fff;
}
.center-switcher button {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 22px 12px;
  border: 1px solid #ebeef5;
  border-radius: 20px;
  background: #fafafa;
  color: #606266;
  font-size: 26px;
  cursor: pointer;
}
.center-switcher button.active {
  border-color: #8f0045;
  background: #fce8f0;
  color: #8f0045;
}
.center-icon {
  font-size: 34px;
}
.center-switcher i {
  position: absolute;
  top: 8px;
  right: 12px;
  min-width: 32px;
  height: 32px;
  padding: 0 8px;
  border-radius: 16px;
  background: #f56c6c;
  color: #fff;
  font-size: 20px;
  line-height: 32px;
  font-style: normal;
}
.search-row {
  display: flex;
  gap: 16px;
  padding: 0 24px 20px;
}
.search-box {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 20px;
  height: 72px;
  background: #fff;
  border-radius: 16px;
  border: 1px solid #e4e7ed;
  font-size: 28px;
  color: #909399;
}
.search-box input {
  flex: 1;
  border: 0;
  outline: 0;
  background: transparent;
  font-size: 28px;
}
.filter-button {
  height: 72px;
  padding: 0 28px;
  border: 1px solid #e4e7ed;
  border-radius: 16px;
  background: #fff;
  color: #606266;
  font-size: 28px;
  cursor: pointer;
}
.filter-button.active {
  border-color: #8f0045;
  color: #8f0045;
}
.filter-panel {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 0 24px 20px;
  font-size: 28px;
  color: #606266;
}
.filter-panel.dual {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}
.filter-panel.dual label {
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 24px;
  color: #909399;
}
.filter-panel select {
  flex: 1;
  height: 64px;
  border: 1px solid #dcdfe6;
  border-radius: 12px;
  padding: 0 16px;
  font-size: 26px;
}
.flow-tabs {
  display: flex;
  gap: 12px;
  padding: 0 24px 16px;
  overflow-x: auto;
}
.flow-tabs button {
  flex-shrink: 0;
  height: 64px;
  padding: 0 28px;
  border: 0;
  border-radius: 32px;
  background: #fff;
  color: #606266;
  font-size: 26px;
  cursor: pointer;
}
.flow-tabs button.active {
  background: #8f0045;
  color: #fff;
}
.flow-tabs i {
  margin-left: 8px;
  font-style: normal;
}
.message-list {
  padding: 0 24px 40px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.message-card {
  background: #fff;
  border-radius: 20px;
  padding: 28px;
}
.message-card-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 16px;
}
.message-card-head strong {
  font-size: 30px;
  line-height: 1.4;
}
.status-tag {
  font-size: 22px;
  padding: 6px 14px;
  border-radius: 8px;
  white-space: nowrap;
}
.status-tag.todo {
  background: #fef0f0;
  color: #f56c6c;
}
.status-tag.done {
  background: #f0f9eb;
  color: #67c23a;
}
.status-tag.moving {
  background: #f4f4f5;
  color: #909399;
}
.message-field {
  font-size: 26px;
  color: #909399;
  margin-top: 10px;
}
.message-field b {
  color: #303133;
  font-weight: 500;
}
.notice-body {
  margin: 16px 0 0;
  font-size: 28px;
  color: #606266;
  line-height: 1.5;
}
.message-card footer {
  margin-top: 20px;
  text-align: right;
}
.message-card footer button {
  height: 60px;
  padding: 0 28px;
  border: 0;
  border-radius: 12px;
  background: #8f0045;
  color: #fff;
  font-size: 26px;
  cursor: pointer;
}
.empty-state,
.empty-center {
  text-align: center;
  padding: 96px 32px;
  color: #909399;
  font-size: 28px;
}
.empty-center span {
  font-size: 64px;
  display: block;
  margin-bottom: 16px;
}
.empty-center strong {
  display: block;
  color: #303133;
  margin-bottom: 12px;
  font-size: 32px;
}
.select-row {
  display: flex;
  gap: 16px;
  align-items: flex-start;
  flex: 1;
}
.select-row input {
  width: 28px;
  height: 28px;
  margin-top: 6px;
}
.batch-action-bar {
  position: sticky;
  bottom: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 32px;
  background: #fff;
  border-top: 1px solid #ebeef5;
  font-size: 28px;
}
.batch-action-bar .plain {
  border: none;
  background: #8f0045;
  color: #fff;
  border-radius: 12px;
  padding: 16px 28px;
  font-size: 26px;
  cursor: pointer;
}
</style>
