<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { mobileWorkflowMessages } from '../../composables/useMobileRectification'
import { useCurrentProject } from '../../composables/useCurrentProject'

const router = useRouter()
const { isHqSelected } = useCurrentProject()
const activeCenter = ref('流程中心')
const activeTab = ref('todo')
const keyword = ref('')
const showFilter = ref(false)
const nodeFilter = ref('')
onMounted(() => document.querySelector('.page-viewport')?.scrollTo({ top:0 }))

const scopedWorkflowMessages = computed(() => {
  const messages = mobileWorkflowMessages.value
  return {
    ...messages,
    todo: isHqSelected.value
      ? messages.todo.filter(item => item.action !== 'execute')
      : messages.todo,
  }
})

const tabItems = computed(() => [
  { key:'todo', label:'我的待办', count:scopedWorkflowMessages.value.todo.length },
  { key:'initiated', label:'我的发起', count:scopedWorkflowMessages.value.initiated.length },
  { key:'done', label:'我的已办', count:scopedWorkflowMessages.value.done.length },
  { key:'copied', label:'抄送我的', count:scopedWorkflowMessages.value.copied.length },
])

const currentMessages = computed(() => {
  const source = scopedWorkflowMessages.value[activeTab.value] || []
  const text = keyword.value.trim()
  return source.filter(item => {
    if (nodeFilter.value && item.currentNode !== nodeFilter.value) return false
    if (!text) return true
    return [item.flowName, item.currentNode, item.owner, item.applicant].some(value => String(value || '').includes(text))
  })
})

const nodeOptions = computed(() => [...new Set((scopedWorkflowMessages.value[activeTab.value] || []).map(item => item.currentNode))])

function handleMessage(item) {
  if (item.action === 'task-execute') router.push(`/mobile/tasks/${item.recordId}/execute?from=message`)
  else if (item.action === 'execute') router.push(`/mobile/rectify/${item.recordId}/execute?from=message`)
  else if (item.action === 'review') router.push(`/mobile/rectify/${item.recordId}/review?from=message`)
  else if (item.action === 'approve') router.push(`/mobile/rectify/${item.recordId}/approval?from=message`)
  else router.push(`/mobile/rectify/${item.recordId}?from=message`)
}

function goBack() { router.push('/mobile/tasks') }
</script>

<template>
  <div class="message-page">
    <header class="mobile-header">
      <button class="back-button" @click="goBack">‹</button>
      <h1>消息中心</h1>
      <span class="header-count">{{ scopedWorkflowMessages.todo.length }} 条待办</span>
    </header>

    <section class="center-switcher">
      <button
        v-for="item in [{name:'流程中心',icon:'⇄'},{name:'消息提醒',icon:'◷'},{name:'告警中心',icon:'⚠'}]"
        :key="item.name"
        :class="{ active:activeCenter === item.name }"
        @click="activeCenter = item.name"
      >
        <span class="center-icon">{{ item.icon }}</span>
        <span>{{ item.name }}</span>
        <i v-if="item.name === '流程中心' && scopedWorkflowMessages.todo.length">{{ scopedWorkflowMessages.todo.length }}</i>
      </button>
    </section>

    <template v-if="activeCenter === '流程中心'">
      <section class="search-row">
        <div class="search-box">
          <span>⌕</span>
          <input v-model="keyword" placeholder="搜索流程名称、申请人、当前节点" />
        </div>
        <button class="filter-button" :class="{ active:showFilter }" @click="showFilter = !showFilter">筛选</button>
      </section>
      <section v-if="showFilter" class="filter-panel">
        <span>当前节点</span>
        <select v-model="nodeFilter">
          <option value="">全部</option>
          <option v-for="node in nodeOptions" :key="node" :value="node">{{ node }}</option>
        </select>
      </section>

      <nav class="flow-tabs">
        <button v-for="tab in tabItems" :key="tab.key" :class="{ active:activeTab === tab.key }" @click="activeTab = tab.key">
          {{ tab.label }}<i v-if="tab.count">{{ tab.count }}</i>
        </button>
      </nav>

      <main class="message-list">
        <article v-for="item in currentMessages" :key="item.id" class="message-card">
          <div class="message-card-head">
            <strong>{{ item.flowName }}</strong>
            <span :class="['status-tag', item.status === '待办' ? 'todo' : item.status === '已办结' ? 'done' : 'moving']">{{ item.status }}</span>
          </div>
          <div class="message-field"><span>当前节点：</span><b>{{ item.currentNode }}</b></div>
          <div class="message-field"><span>负责人：</span><b>{{ item.owner }}</b></div>
          <div class="message-field"><span>申请人：</span><b>{{ item.applicant }}</b></div>
          <div class="message-field"><span>申请日期：</span><b>{{ item.applyDate }}</b></div>
          <footer>
            <button @click="handleMessage(item)">{{ item.status === '待办' ? '处理' : '详情' }}</button>
          </footer>
        </article>
        <div v-if="currentMessages.length === 0" class="empty-state">暂无相关消息</div>
      </main>
    </template>

    <div v-else class="empty-center">
      <span>{{ activeCenter === '消息提醒' ? '◷' : '⚠' }}</span>
      <strong>{{ activeCenter }}</strong>
      <p>暂无新消息</p>
    </div>
  </div>
</template>

<style scoped>
.message-page { width:100%; max-width:402px; min-height:100vh; margin:0 auto; background:#f4f5f7; font-family:'PingFang SC',-apple-system,sans-serif; color:#1f2329; }
.mobile-header { display:flex; align-items:center; padding:12px 16px; background:#8f0045; color:#fff; position:sticky; top:0; z-index:10; }
.mobile-header h1 { flex:1; margin:0; font-size:18px; }
.back-button { padding:0 6px 0 0; border:0; background:transparent; color:#fff; font-size:28px; line-height:1; cursor:pointer; }
.header-count { font-size:12px; opacity:.8; }
.center-switcher { display:grid; grid-template-columns:repeat(3,1fr); padding:16px 12px 14px; background:linear-gradient(180deg,#fceef4 0,#fff 100%); }
.center-switcher button { position:relative; display:flex; flex-direction:column; align-items:center; gap:7px; border:0; background:transparent; color:#333; font-size:14px; cursor:pointer; }
.center-switcher button.active { color:#8f0045; font-weight:600; }
.center-icon { display:flex; align-items:center; justify-content:center; width:44px; height:44px; border-radius:10px; background:#fff; box-shadow:0 2px 8px rgba(143,0,69,.12); color:#8f0045; font-size:24px; }
.center-switcher button.active .center-icon { background:#8f0045; color:#fff; }
.center-switcher i { position:absolute; top:-5px; left:calc(50% + 12px); min-width:18px; height:18px; padding:0 4px; box-sizing:border-box; border-radius:9px; background:#f04438; color:#fff; font-size:10px; font-style:normal; line-height:18px; }
.search-row { display:flex; gap:8px; padding:10px 14px; background:#fff; border-bottom:1px solid #eee; }
.search-box { flex:1; display:flex; align-items:center; gap:6px; padding:0 10px; border:1px solid #e4e7ed; border-radius:8px; background:#fafafa; color:#8f0045; }
.search-box input { width:100%; padding:9px 0; border:0; outline:0; background:transparent; font-size:12px; }
.filter-button { border:0; background:transparent; color:#666; font-size:13px; cursor:pointer; }
.filter-button.active { color:#8f0045; font-weight:600; }
.filter-panel { display:flex; align-items:center; gap:10px; padding:8px 14px; background:#fff; border-bottom:1px solid #eee; color:#666; font-size:12px; }
.filter-panel select { flex:1; padding:7px 8px; border:1px solid #ddd; border-radius:7px; background:#fff; }
.flow-tabs { display:grid; grid-template-columns:repeat(4,1fr); background:#fff; border-bottom:1px solid #eee; }
.flow-tabs button { position:relative; padding:12px 2px; border:0; border-bottom:2px solid transparent; background:transparent; color:#444; font-size:13px; cursor:pointer; }
.flow-tabs button.active { border-bottom-color:#8f0045; color:#8f0045; font-weight:600; }
.flow-tabs i { position:absolute; top:2px; margin-left:1px; color:#f04438; font-size:9px; font-style:normal; }
.message-list { display:flex; flex-direction:column; gap:12px; padding:12px 14px 24px; }
.message-card { padding:14px 16px; border-radius:10px; background:#fff; box-shadow:0 1px 4px rgba(0,0,0,.05); }
.message-card-head { display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; }
.message-card-head strong { font-size:16px; }
.status-tag { padding:2px 7px; border-radius:4px; font-size:11px; }
.status-tag.todo { background:#fff4e5; color:#f5a623; }
.status-tag.done { background:#e8f5e9; color:#34a853; }
.status-tag.moving { background:#fceef4; color:#8f0045; }
.message-field { display:flex; margin:6px 0; font-size:12px; line-height:1.5; }
.message-field span { width:66px; color:#999; flex:none; }
.message-field b { color:#555; font-weight:400; }
.message-card footer { display:flex; justify-content:flex-end; margin-top:12px; padding-top:10px; border-top:1px solid #eee; }
.message-card footer button { min-width:78px; padding:8px 15px; border:0; border-radius:6px; background:#8f0045; color:#fff; font-size:13px; cursor:pointer; }
.empty-state,.empty-center { padding:56px 0; text-align:center; color:#aaa; font-size:13px; }
.empty-center { display:flex; flex-direction:column; align-items:center; gap:8px; }
.empty-center > span { font-size:38px; color:#8f0045; opacity:.45; }
.empty-center strong { color:#555; }
.empty-center p { margin:0; }
</style>
