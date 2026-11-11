<script setup>
import { ref, computed, inject } from 'vue'
import { getDispatchDangerWorkToday, getDispatchMajorWorkToday } from '../../../utils/dailyWorkStorage.js'
import DispatchDraggablePanel from './DispatchDraggablePanel.vue'
import DispatchRecordDetailBody from './DispatchRecordDetailBody.vue'
import DispatchHqPanelTitle from './DispatchHqPanelTitle.vue'
import HqProjectDutyPanel from '../../hq/HqProjectDutyPanel.vue'

const dispatchHqUi = inject('dispatchHqUi', false)

const props = defineProps({
  projectId: { type: String, required: true },
  /** 项目对象（项目值班面板取当日值班人员所需） */
  project: { type: Object, required: true },
})

/** 危险作业模块两个切页：今日危险作业 / 今日危大工程 */
const PANEL_TABS = [
  { value: 'danger', label: '今日危险作业' },
  { value: 'major', label: '今日危大工程' },
]

const STATUS_OPTIONS = [
  { label: '全部', value: '全部' },
  { label: '未开始', value: '未开始' },
  { label: '进行中', value: '进行中' },
  { label: '已结束', value: '已结束' },
]

const activeTab = ref('danger')
const moreOpen = ref(false)
const moreKeyword = ref('')
const moreStatus = ref('全部')
const detailView = ref(null)

const dangerList = computed(() => getDispatchDangerWorkToday(props.projectId).list || [])
const majorList = computed(() => getDispatchMajorWorkToday(props.projectId).list || [])

const activeList = computed(() => (activeTab.value === 'major' ? majorList.value : dangerList.value))

const workStatusMap = { 未开始: 'pending', 进行中: 'doing', 已结束: 'closed' }

const moreTitle = computed(() => (activeTab.value === 'major' ? '危大工程清单' : '危险作业清单'))
const moreSearchPlaceholder = computed(() =>
  activeTab.value === 'major' ? '搜索项目/单位/危大类别/施工内容' : '搜索项目/单位/作业类型/区域/内容',
)

/** 「更多」全量清单：按当前切页取数，支持关键字 + 状态筛选 */
const moreList = computed(() => {
  const keyword = moreKeyword.value.trim().toLowerCase()
  return activeList.value.filter((row) => {
    if (moreStatus.value !== '全部' && row.status !== moreStatus.value) return false
    if (!keyword) return true
    const blob =
      activeTab.value === 'major'
        ? [row.date, row.projectName, row.contractor, row.category, row.workContent, row.time, row.status]
        : [row.date, row.projectName, row.projectShortName, row.contractor, row.type, row.subType, row.location, row.time, row.status, row.measures]
    return blob.filter(Boolean).join(' ').toLowerCase().includes(keyword)
  })
})

const detailTitle = computed(() => (detailView.value?.kind === 'major' ? '危大工程详情' : '危险作业详情'))

function openMore() {
  moreKeyword.value = ''
  moreStatus.value = '全部'
  moreOpen.value = true
}

function openDangerDetail(row) {
  detailView.value = { kind: 'danger', data: { ...row } }
}

function openMajorDetail(row) {
  detailView.value = { kind: 'major', data: { ...row } }
}

function closeDetail() {
  detailView.value = null
}
</script>

<template>
  <section class="detail-lower project-dispatch-lower">
    <div class="panel-card detail-panel list-panel danger-panel" :class="{ 'dispatch-hq-list-panel': dispatchHqUi }">
      <DispatchHqPanelTitle v-if="dispatchHqUi" title="危险作业清单">
        <template #title>
          <div class="danger-tabs" role="tablist" aria-label="危险作业与危大工程切页">
            <button
              v-for="tab in PANEL_TABS"
              :key="tab.value"
              type="button"
              role="tab"
              class="danger-tab-btn"
              :class="{ active: activeTab === tab.value }"
              :aria-selected="activeTab === tab.value"
              @click="activeTab = tab.value"
            >
              {{ tab.label }}
            </button>
          </div>
        </template>
        <template #actions>
          <button type="button" class="title-more-btn" @click="openMore">更多</button>
        </template>
      </DispatchHqPanelTitle>
      <div v-else class="panel-title compact danger-title-row title-left">
        <div class="danger-tabs" role="tablist" aria-label="危险作业与危大工程切页">
          <button
            v-for="tab in PANEL_TABS"
            :key="tab.value"
            type="button"
            role="tab"
            class="danger-tab-btn"
            :class="{ active: activeTab === tab.value }"
            :aria-selected="activeTab === tab.value"
            @click="activeTab = tab.value"
          >
            {{ tab.label }}
          </button>
        </div>
        <button type="button" class="title-more-btn" @click="openMore">更多</button>
      </div>
      <div class="panel-body list-table-body list-wrap">
        <div class="table-scroll">
          <table v-if="activeTab === 'danger'" class="mini-table">
            <thead>
              <tr>
                <th>类型</th>
                <th>施工区域</th>
                <th>时段</th>
                <th>状态</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="row in dangerList"
                :key="row.id"
                class="clickable-row"
                @click="openDangerDetail(row)"
              >
                <td>{{ row.type }}</td>
                <td class="desc" :title="row.location">{{ row.location || '--' }}</td>
                <td class="desc" :title="row.time">{{ row.time || '--' }}</td>
                <td>
                  <span class="status-tag" :class="workStatusMap[row.status] || 'pending'">
                    {{ row.status }}
                  </span>
                </td>
              </tr>
              <tr v-if="!dangerList.length">
                <td colspan="4" class="empty-row">当日暂无危险作业</td>
              </tr>
            </tbody>
          </table>

          <table v-else class="mini-table major-table">
            <thead>
              <tr>
                <th>危大类别</th>
                <th>施工内容</th>
                <th>时段</th>
                <th>状态</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="row in majorList"
                :key="row.id"
                class="clickable-row"
                @click="openMajorDetail(row)"
              >
                <td class="category-cell" :title="row.category">{{ row.category || '--' }}</td>
                <td class="desc" :title="row.workContent">{{ row.workContent || '--' }}</td>
                <td class="desc" :title="row.time">{{ row.time || '--' }}</td>
                <td>
                  <span class="status-tag" :class="workStatusMap[row.status] || 'pending'">
                    {{ row.status }}
                  </span>
                </td>
              </tr>
              <tr v-if="!majorList.length">
                <td colspan="4" class="empty-row">当日暂无危大工程作业</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <HqProjectDutyPanel :project="project" />

    <DispatchDraggablePanel
      v-if="moreOpen"
      :title="moreTitle"
      :width="1240"
      placement="right"
      opaque
      @close="moreOpen = false"
    >
      <div class="more-dialog-toolbar">
        <span class="more-count">共 {{ moreList.length }} 条</span>
        <div class="more-filters">
          <el-input
            v-model="moreKeyword"
            clearable
            size="small"
            class="more-search"
            :placeholder="moreSearchPlaceholder"
          />
          <el-select v-model="moreStatus" size="small" class="more-status-select">
            <el-option v-for="opt in STATUS_OPTIONS" :key="opt.value" :label="opt.label" :value="opt.value" />
          </el-select>
        </div>
      </div>
      <div class="more-table-wrap">
        <table v-if="activeTab === 'danger'" class="mini-table more-table split-more-table">
          <thead>
            <tr>
              <th>施工日期</th>
              <th>施工项目</th>
              <th>施工单位</th>
              <th>作业类型</th>
              <th>当日施工内容</th>
              <th>施工区域</th>
              <th>时段</th>
              <th>状态</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in moreList"
              :key="`more-danger-${row.id}`"
              class="clickable-row"
              @click="openDangerDetail(row)"
            >
              <td>{{ row.date || '--' }}</td>
              <td :title="row.projectName || row.projectShortName">
                <span class="cell-ellipsis">{{ row.projectShortName || row.projectName || '--' }}</span>
              </td>
              <td class="col-desc" :title="row.contractor">
                <span class="cell-ellipsis">{{ row.contractor || '--' }}</span>
              </td>
              <td>{{ row.type || '--' }}</td>
              <td class="col-desc" :title="row.subType">
                <span class="cell-ellipsis">{{ row.subType || '--' }}</span>
              </td>
              <td class="col-desc" :title="row.location">
                <span class="cell-ellipsis">{{ row.location || '--' }}</span>
              </td>
              <td>{{ row.time || '--' }}</td>
              <td>
                <span class="status-tag" :class="workStatusMap[row.status] || 'pending'">
                  {{ row.status }}
                </span>
              </td>
            </tr>
            <tr v-if="!moreList.length">
              <td colspan="8" class="empty-row">暂无符合条件的危险作业</td>
            </tr>
          </tbody>
        </table>
        <table v-else class="mini-table more-table split-more-table">
          <thead>
            <tr>
              <th>施工日期</th>
              <th>施工项目</th>
              <th>施工单位</th>
              <th>危大工程类别</th>
              <th>施工具体内容</th>
              <th>时段</th>
              <th>状态</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in moreList"
              :key="`more-major-${row.id}`"
              class="clickable-row"
              @click="openMajorDetail(row)"
            >
              <td>{{ row.date || '--' }}</td>
              <td class="col-desc" :title="row.projectName">
                <span class="cell-ellipsis">{{ row.projectName || '--' }}</span>
              </td>
              <td class="col-desc" :title="row.contractor">
                <span class="cell-ellipsis">{{ row.contractor || '--' }}</span>
              </td>
              <td class="col-desc" :title="row.category">
                <span class="cell-ellipsis">{{ row.category || '--' }}</span>
              </td>
              <td class="col-desc" :title="row.workContent">
                <span class="cell-ellipsis">{{ row.workContent || '--' }}</span>
              </td>
              <td>{{ row.time || '--' }}</td>
              <td>
                <span class="status-tag" :class="workStatusMap[row.status] || 'pending'">
                  {{ row.status }}
                </span>
              </td>
            </tr>
            <tr v-if="!moreList.length">
              <td colspan="7" class="empty-row">暂无符合条件的危大工程</td>
            </tr>
          </tbody>
        </table>
      </div>
    </DispatchDraggablePanel>

    <DispatchDraggablePanel
      v-if="detailView"
      :title="detailTitle"
      :width="560"
      :z-index="120010"
      placement="right"
      opaque
      @close="closeDetail"
    >
      <DispatchRecordDetailBody :kind="detailView.kind" :record="detailView.data" />
    </DispatchDraggablePanel>
  </section>
</template>

<style scoped>
@import './dispatch-lower.css';

.danger-panel .panel-title {
  border-left: 4px solid #e6a23c;
}

/* 下部两块：危险作业（1/3）+ 项目值班（2/3） */
.project-dispatch-lower {
  grid-template-columns: minmax(0, 1fr) minmax(0, 2fr);
}

.project-dispatch-lower :deep(.duty-project-panel) {
  min-height: 0;
}

.danger-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.danger-title-row .title-more-btn {
  margin-left: auto;
}

.danger-tabs {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.danger-tab-btn {
  border: 1px solid var(--coc-border, #dcdfe6);
  border-radius: 6px;
  background: transparent;
  padding: 3px 10px;
  font-size: calc(12px + var(--coc-font-boost));
  font-weight: 500;
  line-height: 1.3;
  color: var(--coc-text-muted, #909399);
  cursor: pointer;
  white-space: nowrap;
  transition: border-color 0.2s, color 0.2s, background 0.2s;
}

.danger-tab-btn:hover {
  border-color: rgba(94, 238, 255, 0.6);
  color: var(--coc-text, #303133);
}

.danger-tab-btn.active {
  border-color: rgba(94, 238, 255, 0.8);
  background: rgba(94, 238, 255, 0.1);
  color: #5eeeff;
  font-weight: 600;
}

.mini-table .category-cell {
  font-weight: 600;
  line-height: 1.35;
}

/* 危大工程切页：固定列宽，避免「危大类别 / 状态」被挤成多行 */
.major-table {
  table-layout: fixed;
}

.major-table th:nth-child(1) {
  width: 32%;
}

.major-table th:nth-child(2) {
  width: 19%;
}

.major-table th:nth-child(3) {
  width: 25%;
}

.major-table th:nth-child(4) {
  width: 86px;
}

.major-table td {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.major-table .status-tag {
  padding: 2px 8px;
  white-space: nowrap;
}
</style>
