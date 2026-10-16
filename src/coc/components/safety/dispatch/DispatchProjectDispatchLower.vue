<script setup>
import { ref, computed, inject } from 'vue'
import { getDispatchDangerWorkToday } from '../../../utils/dailyWorkStorage.js'
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

const dangerMoreOpen = ref(false)
const detailView = ref(null)
const dangerKeyword = ref('')
const dangerStatusFilter = ref('全部')

const dangerBundle = computed(() => getDispatchDangerWorkToday(props.projectId))
const dangerListFull = computed(() => dangerBundle.value.list || [])
const dangerReportDate = computed(() => dangerBundle.value.reportDate || '')
const dangerUsingFallback = computed(() => Boolean(dangerBundle.value.usingFallbackDate))

const dangerStatusOptions = [
  { label: '全部', value: '全部' },
  { label: '未开始', value: '未开始' },
  { label: '进行中', value: '进行中' },
  { label: '已结束', value: '已结束' },
]

const filteredDangerList = computed(() => {
  const kw = dangerKeyword.value.trim().toLowerCase()
  return dangerListFull.value.filter((row) => {
    if (dangerStatusFilter.value !== '全部' && row.status !== dangerStatusFilter.value) return false
    if (!kw) return true
    const blob = [
      row.date,
      row.projectName,
      row.projectShortName,
      row.contractor,
      row.type,
      row.subType,
      row.location,
      row.time,
      row.status,
      row.measures,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
    return blob.includes(kw)
  })
})

const dangerListPreview = computed(() => dangerListFull.value.slice(0, 12))

const workStatusMap = { 未开始: 'pending', 进行中: 'doing', 已结束: 'closed' }

const detailTitle = computed(() => {
  if (!detailView.value) return ''
  return '危险作业详情'
})

function openDangerDetail(row) {
  detailView.value = { kind: 'danger', data: { ...row } }
}

function closeDetail() {
  detailView.value = null
}

function openDangerMore() {
  dangerKeyword.value = ''
  dangerStatusFilter.value = '全部'
  dangerMoreOpen.value = true
}
</script>

<template>
  <section class="detail-lower project-dispatch-lower">
    <div class="panel-card detail-panel list-panel danger-panel" :class="{ 'dispatch-hq-list-panel': dispatchHqUi }">
      <DispatchHqPanelTitle v-if="dispatchHqUi" title="危险作业清单">
        <template #actions>
          <span v-if="dangerReportDate" class="danger-date-tag" :title="dangerUsingFallback ? '无系统当日数据，按最近填报施工日期展示' : '按系统当日施工日期展示'">
            {{ dangerUsingFallback ? '最近填报' : '施工日期' }} {{ dangerReportDate }}
          </span>
          <button type="button" class="title-more-btn" @click="openDangerMore">更多</button>
        </template>
      </DispatchHqPanelTitle>
      <div v-else class="panel-title compact danger-title-row title-left">
        <span class="danger-title-text">危险作业清单</span>
        <span v-if="dangerReportDate" class="danger-date-tag" :title="dangerUsingFallback ? '无系统当日数据，按最近填报施工日期展示' : '按系统当日施工日期展示'">
          {{ dangerUsingFallback ? '最近填报' : '施工日期' }} {{ dangerReportDate }}
        </span>
        <button type="button" class="title-more-btn" @click="openDangerMore">
          更多
        </button>
      </div>
      <div class="panel-body list-table-body list-wrap">
        <div class="table-scroll">
          <table class="mini-table">
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
                v-for="row in dangerListPreview"
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
              <tr v-if="!dangerListPreview.length">
                <td colspan="4" class="empty-row">当日暂无危险作业</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <HqProjectDutyPanel :project="project" />

    <DispatchDraggablePanel
      v-if="dangerMoreOpen"
      title="危险作业清单"
      :width="960"
      placement="right"
      opaque
      @close="dangerMoreOpen = false"
    >
      <div class="more-dialog-toolbar">
        <span class="more-count">
          共 {{ filteredDangerList.length }} 条
          <template v-if="dangerReportDate">
            · {{ dangerUsingFallback ? '最近填报日' : '施工日期' }} {{ dangerReportDate }}
          </template>
        </span>
        <div class="more-filters">
          <el-input
            v-model="dangerKeyword"
            clearable
            size="small"
            class="more-search"
            placeholder="搜索项目/单位/类型/区域/内容"
          />
          <el-select v-model="dangerStatusFilter" size="small" class="more-status-select">
            <el-option
              v-for="opt in dangerStatusOptions"
              :key="opt.value"
              :label="opt.label"
              :value="opt.value"
            />
          </el-select>
        </div>
      </div>
      <p v-if="dangerUsingFallback" class="more-tip">
        系统当日（{{ dangerBundle.calendarToday }}）暂无填报数据，当前按最近施工填报日展示。
      </p>
      <div class="more-table-wrap">
        <table class="mini-table more-table">
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
              v-for="row in filteredDangerList"
              :key="`more-${row.id}`"
              class="clickable-row"
              @click="openDangerDetail(row)"
            >
              <td>{{ row.date || '--' }}</td>
              <td class="desc col-desc" :title="row.projectName || row.projectShortName">
                {{ row.projectShortName || row.projectName || '--' }}
              </td>
              <td class="desc col-desc" :title="row.contractor">{{ row.contractor || '--' }}</td>
              <td>{{ row.type || '--' }}</td>
              <td class="desc col-desc" :title="row.subType">{{ row.subType || '--' }}</td>
              <td class="desc col-desc" :title="row.location">{{ row.location || '--' }}</td>
              <td>{{ row.time || '--' }}</td>
              <td>
                <span class="status-tag" :class="workStatusMap[row.status] || 'pending'">
                  {{ row.status }}
                </span>
              </td>
            </tr>
            <tr v-if="!filteredDangerList.length">
              <td colspan="8" class="empty-row">暂无符合条件的危险作业</td>
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

/* 下部两块：危险作业清单（1/3）+ 项目值班（2/3，占原管理人员清单与实名制预警两格） */
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

.danger-title-text {
  flex-shrink: 0;
}

.danger-date-tag {
  margin-left: auto;
  font-size: calc(12px + var(--coc-font-boost));
  color: var(--coc-text-muted);
  font-weight: 500;
  white-space: nowrap;
}

.danger-date-tag {
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.title-more-btn {
  margin-left: 0;
}

.more-filters {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.more-search {
  width: 220px;
}

.more-status-select {
  width: 110px;
}

.more-tip {
  margin: 0 0 8px;
  font-size: calc(12px + var(--coc-font-boost));
  color: var(--coc-text-muted);
  line-height: 1.4;
}
</style>
