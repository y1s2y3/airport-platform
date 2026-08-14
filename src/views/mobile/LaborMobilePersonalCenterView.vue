<script setup>
/**
 * 人员实名制 · 个人中心（移动端）
 * 样式对齐巡检「消息中心(移动端)」；数据同源 Web 个人中心人员预警；仅查看不可处置。
 */
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  listLaborPersonalTodos,
  listLaborPersonalDone,
  listLaborPersonalStarted,
  listLaborPersonalCc,
  listLaborPersonalNotices,
  ensureLaborPersonalCenterSeeds,
} from '../../mock/personalCenter.js'

const router = useRouter()
const route = useRoute()
const activeCenter = ref('流程中心')
const activeTab = ref('todo')
const keyword = ref('')
const showFilter = ref(false)
const nodeFilter = ref('')

onMounted(() => {
  ensureLaborPersonalCenterSeeds()
  document.querySelector('.page-viewport')?.scrollTo({ top: 0 })
  const tab = String(route.query.tab || '')
  if (tab === 'notice') {
    activeCenter.value = '消息提醒'
  } else if (['todo', 'done', 'initiated', 'copied'].includes(tab)) {
    activeTab.value = tab
  }
})

const todos = computed(() => listLaborPersonalTodos())
const doneList = computed(() => listLaborPersonalDone())
const startedList = computed(() => listLaborPersonalStarted())
const ccList = computed(() => listLaborPersonalCc())
const notices = computed(() => listLaborPersonalNotices())
const unreadNoticeCount = computed(() => notices.value.filter((n) => n.readStatus === '未读').length)

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

const flowMessages = computed(() => {
  const source = currentFlowSource.value
  const text = keyword.value.trim()
  return source.filter((item) => {
    const currentNode = resolveCurrentNode(item)
    if (nodeFilter.value && currentNode !== nodeFilter.value) return false
    if (!text) return true
    const hay = [
      item.processName,
      currentNode,
      item.applicant,
      item.detail?.name,
      item.detail?.ruleLabel,
      item.detail?.project,
      item.detail?.summary,
    ]
    return hay.some((value) => String(value || '').includes(text))
  })
})

const nodeOptions = computed(() => [
  ...new Set(currentFlowSource.value.map((item) => resolveCurrentNode(item)).filter(Boolean)),
])

const noticeMessages = computed(() => {
  const text = keyword.value.trim()
  return notices.value.filter((item) => {
    if (!text) return true
    return [item.title, item.content, item.module].some((value) => String(value || '').includes(text))
  })
})

function resolveCurrentNode(item) {
  if (activeTab.value === 'done' || item.handleLabel) return item.handleLabel || '已关闭'
  if (activeTab.value === 'initiated' && item.status) return item.status
  const flow = item.approvalFlow || []
  const current = flow.find((step) => step.status === 'current')
  if (current?.title) return current.title
  if (item.detail?.handleMode === '系统自动关闭') return '引导处理'
  if (activeTab.value === 'copied') return '抄送知悉'
  return '责任人处置'
}

function resolveStatus(item) {
  if (activeTab.value === 'done') return '已办结'
  if (activeTab.value === 'initiated') return item.status || '进行中'
  if (activeTab.value === 'copied') return item.readStatus === '未读' ? '未读' : '已读'
  return '待办'
}

function statusTagClass(item) {
  const status = resolveStatus(item)
  if (status === '待办' || status === '未读' || status === '审批中') return 'todo'
  if (status === '已办结' || status === '已通过' || status === '已读') return 'done'
  return 'moving'
}

function applyDate(item) {
  return String(item.applyTime || item.handleTime || item.endTime || '').slice(0, 10)
}

function openFlowDetail(item) {
  if (!item.laborWarningId) {
    return
  }
  const tab =
    activeTab.value === 'done'
      ? 'done'
      : activeTab.value === 'initiated'
        ? 'initiated'
        : activeTab.value === 'copied'
          ? 'copied'
          : 'todo'
  router.push({
    name: 'LaborMobileWarningDetail',
    params: { id: item.laborWarningId },
    query: { tab },
  })
}

function openNoticeDetail(item) {
  item.readStatus = '已读'
  if (!item.laborWarningId) return
  router.push({
    name: 'LaborMobileWarningDetail',
    params: { id: item.laborWarningId },
    query: { tab: 'notice' },
  })
}

function goBack() {
  router.push('/labor/warning-list')
}
</script>

<template>
  <div class="message-page">
    <header class="mobile-header">
      <button class="back-button" type="button" @click="goBack">‹</button>
      <h1>个人中心</h1>
      <span class="header-count">{{ todos.length }} 条待办</span>
    </header>

    <section class="center-switcher">
      <button
        v-for="item in [
          { name: '流程中心', icon: '⇄' },
          { name: '消息提醒', icon: '◷' },
          { name: '告警中心', icon: '⚠' },
        ]"
        :key="item.name"
        type="button"
        :class="{ active: activeCenter === item.name }"
        @click="activeCenter = item.name"
      >
        <span class="center-icon">{{ item.icon }}</span>
        <span>{{ item.name }}</span>
        <i v-if="item.name === '流程中心' && todos.length">{{ todos.length }}</i>
        <i v-else-if="item.name === '消息提醒' && unreadNoticeCount">{{ unreadNoticeCount }}</i>
      </button>
    </section>

    <template v-if="activeCenter === '流程中心'">
      <section class="search-row">
        <div class="search-box">
          <span>⌕</span>
          <input v-model="keyword" placeholder="搜索预警名称、人员、项目" />
        </div>
        <button
          class="filter-button"
          type="button"
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
            <span :class="['status-tag', statusTagClass(item)]">
              {{ resolveStatus(item) }}
            </span>
          </div>
          <div class="message-field"><span>当前节点：</span><b>{{ resolveCurrentNode(item) }}</b></div>
          <div class="message-field"><span>处置方式：</span><b>{{ item.detail?.handleMode || '—' }}</b></div>
          <div class="message-field"><span>关联人员：</span><b>{{ item.detail?.name || '—' }}</b></div>
          <div class="message-field"><span>所属项目：</span><b>{{ item.detail?.project || '—' }}</b></div>
          <div class="message-field"><span>触发时间：</span><b>{{ applyDate(item) }}</b></div>
          <footer>
            <button type="button" @click="openFlowDetail(item)">详情</button>
          </footer>
        </article>
        <div v-if="flowMessages.length === 0" class="empty-state">暂无相关消息</div>
      </main>
    </template>

    <template v-else-if="activeCenter === '消息提醒'">
      <section class="search-row">
        <div class="search-box">
          <span>⌕</span>
          <input v-model="keyword" placeholder="搜索通知标题、内容" />
        </div>
      </section>
      <main class="message-list">
        <article
          v-for="item in noticeMessages"
          :key="item.id"
          class="message-card"
          :class="{ unread: item.readStatus === '未读' }"
        >
          <div class="message-card-head">
            <strong>{{ item.title }}</strong>
            <span :class="['status-tag', item.readStatus === '未读' ? 'todo' : 'moving']">
              {{ item.readStatus }}
            </span>
          </div>
          <div class="message-field"><span>所属模块：</span><b>{{ item.module }}</b></div>
          <div class="message-field notice-content"><span>通知内容：</span><b>{{ item.content }}</b></div>
          <div class="message-field"><span>通知时间：</span><b>{{ item.time }}</b></div>
          <footer>
            <button type="button" @click="openNoticeDetail(item)">详情</button>
          </footer>
        </article>
        <div v-if="noticeMessages.length === 0" class="empty-state">暂无相关消息</div>
      </main>
    </template>

    <div v-else class="empty-center">
      <span>⚠</span>
      <strong>告警中心</strong>
      <p>暂无新消息</p>
    </div>
  </div>
</template>

<style scoped>
.message-page {
  width: 100%;
  max-width: 402px;
  min-height: 100vh;
  margin: 0 auto;
  background: #f4f5f7;
  font-family: 'PingFang SC', -apple-system, sans-serif;
  color: #1f2329;
}
.mobile-header {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  background: #8f0045;
  color: #fff;
  position: sticky;
  top: 0;
  z-index: 10;
}
.mobile-header h1 {
  flex: 1;
  margin: 0;
  font-size: 18px;
}
.back-button {
  padding: 0 6px 0 0;
  border: 0;
  background: transparent;
  color: #fff;
  font-size: 28px;
  line-height: 1;
  cursor: pointer;
}
.header-count {
  font-size: 12px;
  opacity: 0.8;
}
.center-switcher {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  padding: 16px 12px 14px;
  background: linear-gradient(180deg, #fceef4 0, #fff 100%);
}
.center-switcher button {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 7px;
  border: 0;
  background: transparent;
  color: #333;
  font-size: 14px;
  cursor: pointer;
}
.center-switcher button.active {
  color: #8f0045;
  font-weight: 600;
}
.center-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 10px;
  background: #fff;
  box-shadow: 0 2px 8px rgba(143, 0, 69, 0.12);
  color: #8f0045;
  font-size: 24px;
}
.center-switcher button.active .center-icon {
  background: #8f0045;
  color: #fff;
}
.center-switcher i {
  position: absolute;
  top: -5px;
  left: calc(50% + 12px);
  min-width: 18px;
  height: 18px;
  padding: 0 4px;
  box-sizing: border-box;
  border-radius: 9px;
  background: #f04438;
  color: #fff;
  font-size: 10px;
  font-style: normal;
  line-height: 18px;
}
.search-row {
  display: flex;
  gap: 8px;
  padding: 10px 14px;
  background: #fff;
  border-bottom: 1px solid #eee;
}
.search-box {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 10px;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  background: #fafafa;
  color: #8f0045;
}
.search-box input {
  width: 100%;
  padding: 9px 0;
  border: 0;
  outline: 0;
  background: transparent;
  font-size: 12px;
}
.filter-button {
  border: 0;
  background: transparent;
  color: #666;
  font-size: 13px;
  cursor: pointer;
}
.filter-button.active {
  color: #8f0045;
  font-weight: 600;
}
.filter-panel {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 14px;
  background: #fff;
  border-bottom: 1px solid #eee;
  color: #666;
  font-size: 12px;
}
.filter-panel select {
  flex: 1;
  padding: 7px 8px;
  border: 1px solid #ddd;
  border-radius: 7px;
  background: #fff;
}
.flow-tabs {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  background: #fff;
  border-bottom: 1px solid #eee;
}
.flow-tabs button {
  position: relative;
  padding: 12px 2px;
  border: 0;
  border-bottom: 2px solid transparent;
  background: transparent;
  color: #444;
  font-size: 13px;
  cursor: pointer;
}
.flow-tabs button.active {
  border-bottom-color: #8f0045;
  color: #8f0045;
  font-weight: 600;
}
.flow-tabs i {
  position: absolute;
  top: 2px;
  margin-left: 1px;
  color: #f04438;
  font-size: 9px;
  font-style: normal;
}
.message-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px 14px 24px;
}
.message-card {
  padding: 14px 16px;
  border-radius: 10px;
  background: #fff;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
}
.message-card.unread {
  box-shadow: 0 1px 4px rgba(143, 0, 69, 0.12);
}
.message-card-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px;
  margin-bottom: 10px;
}
.message-card-head strong {
  font-size: 15px;
  line-height: 1.4;
}
.status-tag {
  flex: none;
  padding: 2px 7px;
  border-radius: 4px;
  font-size: 11px;
}
.status-tag.todo {
  background: #fff4e5;
  color: #f5a623;
}
.status-tag.done {
  background: #e8f5e9;
  color: #34a853;
}
.status-tag.moving {
  background: #fceef4;
  color: #8f0045;
}
.message-field {
  display: flex;
  margin: 6px 0;
  font-size: 12px;
  line-height: 1.5;
}
.message-field span {
  width: 66px;
  color: #999;
  flex: none;
}
.message-field b {
  color: #555;
  font-weight: 400;
  word-break: break-all;
}
.notice-content b {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.message-card footer {
  display: flex;
  justify-content: flex-end;
  margin-top: 12px;
  padding-top: 10px;
  border-top: 1px solid #eee;
}
.message-card footer button {
  min-width: 78px;
  padding: 8px 15px;
  border: 0;
  border-radius: 6px;
  background: #8f0045;
  color: #fff;
  font-size: 13px;
  cursor: pointer;
}
.empty-state,
.empty-center {
  padding: 56px 0;
  text-align: center;
  color: #aaa;
  font-size: 13px;
}
.empty-center {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}
.empty-center > span {
  font-size: 38px;
  color: #8f0045;
  opacity: 0.45;
}
.empty-center strong {
  color: #555;
}
.empty-center p {
  margin: 0;
}
</style>
