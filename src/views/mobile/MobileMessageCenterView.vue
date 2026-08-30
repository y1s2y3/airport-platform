<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { mobileWorkflowMessages } from '../../composables/useMobileRectification'
import { useCurrentProject } from '../../composables/useCurrentProject'

const CENTER_MSG = '消息中心'
const CENTER_NOTICE = '通知信息'
const CENTER_WARN = '预警中心'

const router = useRouter()
const { isHqSelected } = useCurrentProject()
const activeCenter = ref(CENTER_MSG)
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
      <h1>{{ activeCenter }}</h1>
      <span class="header-count">{{ scopedWorkflowMessages.todo.length }} 条待办</span>
    </header>

    <section class="center-switcher">
      <button
        v-for="item in [{name:CENTER_MSG,icon:'⇄'},{name:CENTER_NOTICE,icon:'◷'},{name:CENTER_WARN,icon:'⚠'}]"
        :key="item.name"
        :class="{ active:activeCenter === item.name }"
        @click="activeCenter = item.name"
      >
        <span class="center-icon">{{ item.icon }}</span>
        <span>{{ item.name }}</span>
        <i v-if="item.name === CENTER_MSG && scopedWorkflowMessages.todo.length">{{ scopedWorkflowMessages.todo.length }}</i>
      </button>
    </section>

    <template v-if="activeCenter === CENTER_MSG">
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
      <span>{{ activeCenter === CENTER_NOTICE ? '◷' : '⚠' }}</span>
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
.center-switcher { display:grid; grid-template-columns:repeat(3,1fr); gap:8px; padding:12px; background:#fff; }
.center-switcher button { position:relative; display:flex; flex-direction:column; align-items:center; gap:4px; padding:10px 6px; border:1px solid #ebeef5; border-radius:10px; background:#fafafa; color:#606266; font-size:12px; cursor:pointer; }
.center-switcher button.active { border-color:#8f0045; background:#fce8f0; color:#8f0045; }
.center-icon { font-size:16px; }
.center-switcher i { position:absolute; top:4px; right:6px; min-width:16px; height:16px; padding:0 4px; border-radius:8px; background:#f56c6c; color:#fff; font-size:10px; line-height:16px; font-style:normal; }
.search-row { display:flex; gap:8px; padding:0 12px 10px; }
.search-box { flex:1; display:flex; align-items:center; gap:6px; padding:0 10px; height:36px; background:#fff; border-radius:8px; border:1px solid #e4e7ed; }
.search-box input { flex:1; border:0; outline:0; background:transparent; font-size:13px; }
.filter-button { height:36px; padding:0 12px; border:1px solid #e4e7ed; border-radius:8px; background:#fff; color:#606266; cursor:pointer; }
.filter-button.active { border-color:#8f0045; color:#8f0045; }
.filter-panel { display:flex; align-items:center; gap:8px; padding:0 12px 10px; font-size:13px; color:#606266; }
.filter-panel select { flex:1; height:32px; border:1px solid #dcdfe6; border-radius:6px; padding:0 8px; }
.flow-tabs { display:flex; gap:4px; padding:0 12px 8px; overflow-x:auto; }
.flow-tabs button { flex-shrink:0; height:32px; padding:0 12px; border:0; border-radius:16px; background:#fff; color:#606266; font-size:13px; cursor:pointer; }
.flow-tabs button.active { background:#8f0045; color:#fff; }
.flow-tabs i { margin-left:4px; font-style:normal; }
.message-list { padding:0 12px 24px; display:flex; flex-direction:column; gap:10px; }
.message-card { background:#fff; border-radius:10px; padding:12px; }
.message-card-head { display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; }
.message-card-head strong { font-size:14px; }
.status-tag { font-size:11px; padding:2px 6px; border-radius:4px; }
.status-tag.todo { background:#fef0f0; color:#f56c6c; }
.status-tag.done { background:#f0f9eb; color:#67c23a; }
.status-tag.moving { background:#f4f4f5; color:#909399; }
.message-field { font-size:12px; color:#909399; margin-top:4px; }
.message-field b { color:#303133; font-weight:500; }
.message-card footer { margin-top:10px; text-align:right; }
.message-card footer button { height:30px; padding:0 14px; border:0; border-radius:6px; background:#8f0045; color:#fff; font-size:13px; cursor:pointer; }
.empty-state, .empty-center { text-align:center; padding:48px 16px; color:#909399; }
.empty-center span { font-size:32px; display:block; margin-bottom:8px; }
.empty-center strong { display:block; color:#303133; margin-bottom:6px; }
</style>
