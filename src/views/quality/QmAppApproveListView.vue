<script setup>
/**
 * App 审批待办列表 — 字段/范围对齐「实体验收（深度集成）」
 */
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useQmProjectScope } from '../../composables/useCurrentProject'
import {
  ARCHIVE_STATUS,
  getNextApprovalRole,
  inspectionTasks,
  ORG_LABEL,
  resolveProjectName,
  TASK_STATUS,
  TASK_TYPE_LABEL,
  wbsNodes,
} from '../../mock/qm.js'

const router = useRouter()
const { isHqSelected, scopeProjectId } = useQmProjectScope()

const activeTab = ref('pending')
const keyword = ref('')
const typeFilter = ref('')
const refreshing = ref(false)
const pullY = ref(0)
let touchStartY = 0

const scopedTasks = computed(() => {
  let rows = [...inspectionTasks]
  if (!isHqSelected.value && scopeProjectId.value) {
    rows = rows.filter((t) => t.project_id === scopeProjectId.value)
  }
  return rows
})

const pendingList = computed(() => scopedTasks.value.filter((t) => Number(t.status) === 1))
const doneList = computed(() =>
  scopedTasks.value.filter((t) => [2, 3, 4, 5].includes(Number(t.status))).slice(0, 30),
)

const tabs = computed(() => [
  { key: 'pending', label: '待审批', count: pendingList.value.length },
  { key: 'done', label: '已处理', count: doneList.value.length },
])

const typeOptions = computed(() => {
  const set = new Set(
    (activeTab.value === 'pending' ? pendingList.value : doneList.value).map((t) => t.task_type),
  )
  return [...set]
    .sort((a, b) => a - b)
    .map((type) => ({
      value: String(type),
      label: TASK_TYPE_LABEL[type] || `类型${type}`,
    }))
})

const filtered = computed(() => {
  let rows = activeTab.value === 'pending' ? pendingList.value : doneList.value
  if (typeFilter.value) {
    rows = rows.filter((t) => String(t.task_type) === typeFilter.value)
  }
  const kw = keyword.value.trim()
  if (kw) {
    rows = rows.filter((t) => {
      const node = wbsNodes.find((n) => n.id === t.wbs_node_id)?.node_name || ''
      const proj = resolveProjectName(t.project_id)
      const org = ORG_LABEL[t.contractor_org_id] || ''
      return (
        t.task_no.includes(kw) ||
        node.includes(kw) ||
        proj.includes(kw) ||
        (t.location_name || '').includes(kw) ||
        (t.specialty || '').includes(kw) ||
        org.includes(kw)
      )
    })
  }
  return rows
})

function nodeName(task) {
  return wbsNodes.find((n) => n.id === task.wbs_node_id)?.node_name || task.location_name || '—'
}

function orgLabel(task) {
  return ORG_LABEL[task.contractor_org_id] || task.contractor_org_id || '—'
}

function formatFirstPass(flag) {
  if (flag == null || flag === '') return '—'
  return Number(flag) === 1 ? '是' : '否'
}

function statusTone(status) {
  if (status === 1) return 'warn'
  if (status === 2) return 'ok'
  if (status === 3 || status === 4) return 'danger'
  return 'muted'
}

function goDetail(row) {
  router.push({ path: '/qm/inspect/app/approve/detail', query: { id: row.id } })
}

function goBack() {
  if (window.history.length > 1) router.back()
  else router.push('/qm/inspect/form-fill-deep')
}

function onTouchStart(e) {
  if (refreshing.value) return
  const el = e.currentTarget
  if (el.scrollTop > 0) return
  touchStartY = e.touches[0].clientY
}

function onTouchMove(e) {
  if (refreshing.value || !touchStartY) return
  const dy = e.touches[0].clientY - touchStartY
  if (dy > 0) pullY.value = Math.min(72, dy * 0.45)
}

async function onTouchEnd() {
  if (pullY.value > 48) {
    refreshing.value = true
    pullY.value = 48
    await new Promise((r) => setTimeout(r, 700))
    refreshing.value = false
    ElMessage.success('已刷新待办')
  }
  pullY.value = 0
  touchStartY = 0
}

function onTabChange(key) {
  activeTab.value = key
  typeFilter.value = ''
}
</script>

<template>
  <div class="app-page">
    <div class="phone">
      <div class="status-bar">
        <span>09:41</span>
        <span class="status-icons">5G · ████</span>
      </div>

      <header class="nav-bar">
        <button type="button" class="nav-back" aria-label="返回" @click="goBack">‹</button>
        <div class="nav-center">
          <h1 class="nav-title">验评审批待办</h1>
          <p class="nav-sub">同源 · 实体验收（深度集成）</p>
        </div>
        <span class="nav-avatar">审</span>
      </header>

      <div class="tabs">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          type="button"
          class="tab"
          :class="{ active: activeTab === tab.key }"
          @click="onTabChange(tab.key)"
        >
          {{ tab.label }}
          <span class="tab-count">{{ tab.count }}</span>
        </button>
      </div>

      <div class="filter-block">
        <div class="search-wrap">
          <span class="search-icon">⌕</span>
          <input
            v-model="keyword"
            class="search-input"
            type="search"
            placeholder="单号 / 节点 / 部位 / 项目"
            enterkeyhint="search"
          />
          <button v-if="keyword" type="button" class="search-clear" @click="keyword = ''">×</button>
        </div>
        <div v-if="typeOptions.length" class="chips">
          <button
            type="button"
            class="chip"
            :class="{ active: !typeFilter }"
            @click="typeFilter = ''"
          >
            全部类型
          </button>
          <button
            v-for="opt in typeOptions"
            :key="opt.value"
            type="button"
            class="chip"
            :class="{ active: typeFilter === opt.value }"
            @click="typeFilter = opt.value"
          >
            {{ opt.label }}
          </button>
        </div>
      </div>

      <div
        class="list-scroll"
        @touchstart.passive="onTouchStart"
        @touchmove.passive="onTouchMove"
        @touchend="onTouchEnd"
      >
        <div class="pull-tip" :style="{ height: `${pullY || (refreshing ? 48 : 0)}px` }">
          <span v-if="refreshing">刷新中…</span>
          <span v-else-if="pullY > 48">松手刷新</span>
          <span v-else-if="pullY > 8">下拉刷新</span>
        </div>

        <div v-if="!filtered.length" class="empty">
          <div class="empty-icon">✓</div>
          <p>{{ activeTab === 'pending' ? '暂无待审批任务' : '暂无已处理记录' }}</p>
          <span>与「实体验收（深度集成）」共用验评任务</span>
        </div>

        <article
          v-for="row in filtered"
          :key="row.id"
          class="todo-card"
          @click="goDetail(row)"
        >
          <div class="card-top">
            <div class="card-title-wrap">
              <strong class="card-no">{{ row.task_no }}</strong>
              <span class="type-tag">{{ TASK_TYPE_LABEL[row.task_type] || '验评' }}</span>
            </div>
            <span class="status-pill" :class="statusTone(row.status)">
              {{ TASK_STATUS[row.status] }}
            </span>
          </div>
          <div class="card-node">{{ nodeName(row) }}</div>
          <div class="card-fields">
            <div class="field"><span class="k">部位</span><span class="v">{{ row.location_name || '—' }}</span></div>
            <div class="field"><span class="k">节点</span><span class="v">{{ nodeName(row) }}</span></div>
            <div class="field"><span class="k">施工单位</span><span class="v">{{ orgLabel(row) }}</span></div>
            <div class="field"><span class="k">归档</span><span class="v">{{ ARCHIVE_STATUS[row.archive_status] || '—' }}</span></div>
            <div class="field"><span class="k">一次通过</span><span class="v">{{ formatFirstPass(row.first_pass_flag) }}</span></div>
          </div>
          <div class="card-meta">
            <span>{{ resolveProjectName(row.project_id) }}</span>
            <span v-if="row.specialty"> · {{ row.specialty }}</span>
          </div>
          <div class="card-foot">
            <span v-if="row.status === 1" class="role-tip">
              待审 · {{ getNextApprovalRole(row) || '—' }}
            </span>
            <span v-else class="role-tip muted">
              {{ row.finish_time || row.submit_time || row.updated_at || '—' }}
            </span>
            <span class="card-arrow">详情 ›</span>
          </div>
        </article>

        <p v-if="filtered.length" class="list-end">—— 没有更多了 ——</p>
      </div>

      <div class="home-indicator" />
    </div>
  </div>
</template>

<style scoped>
.app-page {
  min-height: 100%;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding: 12px 8px 24px;
  background: linear-gradient(180deg, #f3e6eb 0%, #eef1f5 40%, #f5f6f8 100%);
}

.phone {
  width: 100%;
  max-width: 402px;
  height: min(844px, calc(100vh - 48px));
  max-height: calc(100vh - 48px);
  background: #f4f5f7;
  border-radius: 28px;
  overflow: hidden;
  box-shadow:
    0 0 0 10px #1c1c1e,
    0 0 0 12px #3a3a3c,
    0 24px 48px rgba(28, 28, 30, 0.28);
  display: flex;
  flex-direction: column;
  font-family: 'PingFang SC', 'SF Pro Text', -apple-system, BlinkMacSystemFont, sans-serif;
  position: relative;
}

.status-bar {
  display: flex;
  justify-content: space-between;
  padding: 10px 22px 4px;
  background: #8f0045;
  color: rgba(255, 255, 255, 0.92);
  font-size: 12px;
  font-weight: 600;
  flex-shrink: 0;
}

.status-icons {
  letter-spacing: 0.5px;
  font-size: 11px;
}

.nav-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 14px 14px;
  background: #8f0045;
  color: #fff;
  flex-shrink: 0;
}

.nav-back {
  width: 36px;
  height: 36px;
  border: none;
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
  font-size: 28px;
  line-height: 1;
  border-radius: 10px;
  cursor: pointer;
  padding: 0 0 2px;
}

.nav-center {
  flex: 1;
  min-width: 0;
}

.nav-title {
  margin: 0;
  font-size: 17px;
  font-weight: 650;
  letter-spacing: 0.2px;
}

.nav-sub {
  margin: 2px 0 0;
  font-size: 11px;
  opacity: 0.75;
}

.nav-avatar {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 700;
}

.tabs {
  display: flex;
  gap: 8px;
  padding: 12px 14px 0;
  background: #fff;
  flex-shrink: 0;
}

.tab {
  flex: 1;
  border: none;
  background: #f3f4f6;
  color: #666;
  font-size: 13px;
  padding: 9px 10px;
  border-radius: 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.tab.active {
  background: #fceef4;
  color: #8f0045;
  font-weight: 650;
}

.tab-count {
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 9px;
  background: rgba(0, 0, 0, 0.06);
  font-size: 11px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.tab.active .tab-count {
  background: rgba(143, 0, 69, 0.12);
}

.filter-block {
  padding: 12px 14px;
  background: #fff;
  border-bottom: 1px solid #eee;
  flex-shrink: 0;
}

.search-wrap {
  position: relative;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 12px;
  color: #999;
  font-size: 15px;
}

.search-input {
  width: 100%;
  box-sizing: border-box;
  border: none;
  outline: none;
  background: #f3f4f6;
  border-radius: 12px;
  padding: 10px 34px 10px 34px;
  font-size: 14px;
  color: #1f2329;
}

.search-clear {
  position: absolute;
  right: 8px;
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 50%;
  background: #dcdfe6;
  color: #fff;
  cursor: pointer;
  line-height: 1;
}

.chips {
  display: flex;
  gap: 8px;
  margin-top: 10px;
  overflow-x: auto;
  padding-bottom: 2px;
  scrollbar-width: none;
}

.chips::-webkit-scrollbar {
  display: none;
}

.chip {
  flex-shrink: 0;
  border: 1px solid #e5e7eb;
  background: #fff;
  color: #666;
  font-size: 12px;
  padding: 5px 12px;
  border-radius: 999px;
  cursor: pointer;
}

.chip.active {
  background: #8f0045;
  border-color: #8f0045;
  color: #fff;
  font-weight: 600;
}

.list-scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 12px 14px 20px;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;
}

.pull-tip {
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  color: #8f0045;
  font-size: 12px;
}

.todo-card {
  background: #fff;
  border-radius: 14px;
  padding: 14px 14px 12px;
  margin-bottom: 10px;
  box-shadow: 0 1px 4px rgba(15, 23, 42, 0.04);
  cursor: pointer;
  border: 1px solid rgba(0, 0, 0, 0.03);
}

.todo-card:active {
  transform: scale(0.985);
  background: #fbf5f7;
}

.card-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
}

.card-title-wrap {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  min-width: 0;
}

.card-no {
  font-size: 15px;
  color: #1f2329;
}

.type-tag {
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 4px;
  background: #eef2ff;
  color: #4338ca;
  font-weight: 600;
}

.status-pill {
  flex-shrink: 0;
  font-size: 11px;
  font-weight: 600;
  padding: 3px 8px;
  border-radius: 999px;
}

.status-pill.warn {
  background: #fff7e6;
  color: #d48806;
}

.status-pill.ok {
  background: #e8f5e9;
  color: #2e7d32;
}

.status-pill.danger {
  background: #ffebee;
  color: #c62828;
}

.status-pill.muted {
  background: #f0f0f0;
  color: #757575;
}

.card-node {
  margin-top: 8px;
  font-size: 14px;
  color: #303133;
  font-weight: 500;
  line-height: 1.4;
}

.card-fields {
  margin-top: 8px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px 10px;
}

.field {
  display: flex;
  gap: 6px;
  font-size: 12px;
  min-width: 0;
}

.field .k {
  color: #909399;
  flex-shrink: 0;
}

.field .v {
  color: #303133;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card-meta {
  margin-top: 6px;
  font-size: 12px;
  color: #909399;
}

.card-foot {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px dashed #eee;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.role-tip {
  font-size: 12px;
  color: #8f0045;
  font-weight: 500;
}

.role-tip.muted {
  color: #909399;
  font-weight: 400;
}

.card-arrow {
  font-size: 12px;
  color: #c0c4cc;
}

.empty {
  text-align: center;
  padding: 56px 20px;
  color: #909399;
}

.empty-icon {
  width: 56px;
  height: 56px;
  margin: 0 auto 12px;
  border-radius: 50%;
  background: #fceef4;
  color: #8f0045;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  font-weight: 700;
}

.empty p {
  margin: 0 0 6px;
  font-size: 15px;
  color: #606266;
}

.empty span {
  font-size: 12px;
}

.list-end {
  text-align: center;
  color: #c0c4cc;
  font-size: 12px;
  margin: 8px 0 0;
}

.home-indicator {
  height: 22px;
  background: #f4f5f7;
  position: relative;
  flex-shrink: 0;
}

.home-indicator::after {
  content: '';
  position: absolute;
  left: 50%;
  bottom: 8px;
  transform: translateX(-50%);
  width: 120px;
  height: 4px;
  border-radius: 2px;
  background: #1c1c1e;
  opacity: 0.85;
}

@media (max-width: 480px) {
  .app-page {
    padding: 0;
    background: #f4f5f7;
  }

  .phone {
    max-width: none;
    height: 100vh;
    max-height: 100vh;
    border-radius: 0;
    box-shadow: none;
  }
}
</style>
