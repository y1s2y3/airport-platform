<script setup>
import { ref, computed } from 'vue'
import {
  SAFETY_HAZARDS,
  QUALITY_HAZARDS,
  DANGER_WORK_LIST,
  getProjectManagementPersonnel,
} from '../../../mock/data.js'
import DispatchDraggablePanel from './DispatchDraggablePanel.vue'
import DispatchRecordDetailBody from './DispatchRecordDetailBody.vue'

const props = defineProps({
  projectId: { type: String, required: true },
})

const hazardList = [
  ...SAFETY_HAZARDS.map((h) => ({ ...h, hazardCategory: '安全' })),
  ...QUALITY_HAZARDS.map((h) => ({ ...h, hazardCategory: '质量' })),
]
const dangerListPreview = DANGER_WORK_LIST.slice(0, 12)
const dangerListFull = DANGER_WORK_LIST

const hazardStatusFilter = ref('待整改')
const hazardMoreOpen = ref(false)
const dangerMoreOpen = ref(false)
const detailView = ref(null)

const managementList = computed(() => getProjectManagementPersonnel(props.projectId))

const hazardStatusOptions = [
  { label: '全部', value: '全部' },
  { label: '待整改', value: '待整改' },
  { label: '整改中', value: '整改中' },
  { label: '已闭合', value: '已闭合' },
]

const HAZARD_LEVEL_ORDER = { 重大: 0, 较大: 1, 一般: 2 }

const filteredHazardList = computed(() => {
  const list =
    hazardStatusFilter.value === '全部'
      ? [...hazardList]
      : hazardList.filter((row) => row.status === hazardStatusFilter.value)
  return list.sort(
    (a, b) => (HAZARD_LEVEL_ORDER[a.level] ?? 9) - (HAZARD_LEVEL_ORDER[b.level] ?? 9),
  )
})

const statusMap = { 待整改: 'pending', 整改中: 'doing', 已闭合: 'closed' }
const workStatusMap = { 待开工: 'pending', 作业中: 'doing', 已完工: 'closed', 已取消: 'cancelled' }

const detailTitle = computed(() => {
  if (!detailView.value) return ''
  if (detailView.value.kind === 'hazard') {
    const cat = detailView.value.data.hazardCategory || '安质'
    return `${cat}隐患详情`
  }
  return '危险作业详情'
})

function levelClass(level) {
  if (level === '重大') return 'major'
  if (level === '较大') return 'medium'
  return 'normal'
}

function openHazardDetail(row) {
  detailView.value = { kind: 'hazard', data: { ...row } }
}
function openDangerDetail(row) {
  detailView.value = { kind: 'danger', data: { ...row } }
}
function closeDetail() {
  detailView.value = null
}
</script>

<template>
  <section class="detail-lower project-dispatch-lower">
    <div class="panel-card detail-panel list-panel hazard-panel">
      <div class="panel-title compact hazard-title-row title-left">
        <span class="hazard-title-text">安质隐患清单</span>
        <div class="title-actions">
          <el-select
            v-model="hazardStatusFilter"
            size="small"
            class="hazard-status-select"
          >
            <el-option
              v-for="opt in hazardStatusOptions"
              :key="opt.value"
              :label="opt.label"
              :value="opt.value"
            />
          </el-select>
          <button type="button" class="title-more-btn" @click="hazardMoreOpen = true">
            更多
          </button>
        </div>
      </div>
      <div class="panel-body list-table-body list-wrap">
        <div class="table-scroll">
          <table class="mini-table">
            <thead>
              <tr>
                <th>类别</th>
                <th>日期</th>
                <th>描述</th>
                <th>隐患等级</th>
                <th>状态</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="row in filteredHazardList"
                :key="`${row.hazardCategory}-${row.id}`"
                class="clickable-row"
                @click="openHazardDetail(row)"
              >
                <td>
                  <span class="cat-tag" :class="row.hazardCategory === '安全' ? 'safety' : 'quality'">
                    {{ row.hazardCategory }}
                  </span>
                </td>
                <td>{{ row.date.slice(5) }}</td>
                <td class="desc" :title="row.desc">{{ row.desc }}</td>
                <td>
                  <span class="level-tag" :class="levelClass(row.level)">{{ row.level }}</span>
                </td>
                <td><span class="status-tag" :class="statusMap[row.status]">{{ row.status }}</span></td>
              </tr>
              <tr v-if="!filteredHazardList.length">
                <td colspan="5" class="empty-row">暂无符合条件的隐患记录</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <div class="panel-card detail-panel list-panel danger-panel">
      <div class="panel-title compact danger-title-row title-left">
        <span class="danger-title-text">危险作业清单</span>
        <button type="button" class="title-more-btn" @click="dangerMoreOpen = true">
          更多
        </button>
      </div>
      <div class="panel-body list-table-body list-wrap">
        <div class="table-scroll">
          <table class="mini-table">
            <thead><tr><th>类型</th><th>地点</th><th>状态</th></tr></thead>
            <tbody>
              <tr
                v-for="row in dangerListPreview"
                :key="row.id"
                class="clickable-row"
                @click="openDangerDetail(row)"
              >
                <td>{{ row.type }}</td>
                <td class="desc" :title="row.location">{{ row.location }}</td>
                <td><span class="status-tag" :class="workStatusMap[row.status]">{{ row.status }}</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <div class="panel-card detail-panel list-panel mgmt-panel">
      <div class="panel-title compact mgmt-title-row title-left">
        <span class="mgmt-title-text">管理人员清单</span>
        <span class="mgmt-count">共 {{ managementList.length }} 人</span>
      </div>
      <div class="panel-body list-table-body list-wrap">
        <div class="table-scroll">
          <table class="mini-table">
            <thead>
              <tr>
                <th>姓名</th>
                <th>岗位</th>
                <th>单位</th>
                <th>在岗</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in managementList" :key="row.id">
                <td>{{ row.name }}</td>
                <td>{{ row.role }}</td>
                <td class="desc" :title="row.unit">{{ row.unit }}</td>
                <td>
                  <span class="status-tag" :class="row.onSite ? 'closed' : 'pending'">
                    {{ row.onSite ? '在岗' : '离岗' }}
                  </span>
                </td>
              </tr>
              <tr v-if="!managementList.length">
                <td colspan="4" class="empty-row">暂无管理人员记录</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <DispatchDraggablePanel
      v-if="hazardMoreOpen"
      title="安质隐患清单"
      :width="760"
      @close="hazardMoreOpen = false"
    >
      <div class="more-dialog-toolbar">
        <span class="more-count">共 {{ filteredHazardList.length }} 条</span>
        <el-select v-model="hazardStatusFilter" size="small" class="hazard-status-select more-filter">
          <el-option
            v-for="opt in hazardStatusOptions"
            :key="opt.value"
            :label="opt.label"
            :value="opt.value"
          />
        </el-select>
      </div>
      <div class="more-table-wrap">
        <table class="mini-table more-table">
          <thead>
            <tr>
              <th>类别</th>
              <th>日期</th>
              <th>描述</th>
              <th>施工部位</th>
              <th>隐患等级</th>
              <th>状态</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in filteredHazardList"
              :key="`more-${row.hazardCategory}-${row.id}`"
              class="clickable-row"
              @click="openHazardDetail(row)"
            >
              <td>
                <span class="cat-tag" :class="row.hazardCategory === '安全' ? 'safety' : 'quality'">
                  {{ row.hazardCategory }}
                </span>
              </td>
              <td>{{ row.date }}</td>
              <td class="desc" :title="row.desc">{{ row.desc }}</td>
              <td>{{ row.location }}</td>
              <td>
                <span class="level-tag" :class="levelClass(row.level)">{{ row.level }}</span>
              </td>
              <td><span class="status-tag" :class="statusMap[row.status]">{{ row.status }}</span></td>
            </tr>
            <tr v-if="!filteredHazardList.length">
              <td colspan="6" class="empty-row">暂无符合条件的隐患记录</td>
            </tr>
          </tbody>
        </table>
      </div>
    </DispatchDraggablePanel>

    <DispatchDraggablePanel
      v-if="dangerMoreOpen"
      title="危险作业清单"
      :width="720"
      @close="dangerMoreOpen = false"
    >
      <div class="more-dialog-toolbar">
        <span class="more-count">共 {{ dangerListFull.length }} 条</span>
      </div>
      <div class="more-table-wrap">
        <table class="mini-table more-table">
          <thead>
            <tr>
              <th>类型</th>
              <th>子类</th>
              <th>日期</th>
              <th>时间</th>
              <th>地点</th>
              <th>许可</th>
              <th>状态</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in dangerListFull"
              :key="`more-${row.id}`"
              class="clickable-row"
              @click="openDangerDetail(row)"
            >
              <td>{{ row.type }}</td>
              <td>{{ row.subType }}</td>
              <td>{{ row.date }}</td>
              <td>{{ row.time }}</td>
              <td class="desc" :title="row.location">{{ row.location }}</td>
              <td>{{ row.permitStatus }}</td>
              <td><span class="status-tag" :class="workStatusMap[row.status]">{{ row.status }}</span></td>
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
      @close="closeDetail"
    >
      <DispatchRecordDetailBody :kind="detailView.kind" :record="detailView.data" />
    </DispatchDraggablePanel>
  </section>
</template>

<style scoped>
@import './dispatch-lower.css';

.hazard-panel .panel-title { border-left: 4px solid #e6a23c; }

.hazard-title-row,
.danger-title-row,
.mgmt-title-row {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 8px;
}

.hazard-title-text,
.danger-title-text,
.mgmt-title-text {
  flex-shrink: 0;
  text-align: left;
}

.title-actions {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.danger-title-row .title-more-btn,
.mgmt-title-row .mgmt-count {
  margin-left: auto;
}

.mgmt-count {
  font-size: 12px;
  color: var(--coc-text-muted);
  font-weight: 500;
}

.title-more-btn {
  border: 1px solid var(--coc-border);
  border-radius: 6px;
  background: #fff;
  padding: 4px 12px;
  font-size: 12px;
  font-weight: 600;
  color: var(--coc-accent);
  cursor: pointer;
  white-space: nowrap;
  line-height: 1.4;
}

.title-more-btn:hover {
  border-color: var(--coc-accent);
  background: rgba(201, 123, 99, 0.08);
}

.hazard-status-select {
  width: 96px;
}

.hazard-status-select :deep(.el-input__wrapper) {
  padding: 0 8px;
}

.hazard-status-select :deep(.el-input__inner) {
  font-size: 13px;
}

.more-filter {
  width: 108px;
}

.more-dialog-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}

.more-count {
  font-size: 13px;
  color: var(--coc-text-secondary);
  font-weight: 600;
}

.more-table-wrap {
  max-height: min(58vh, 520px);
  overflow: auto;
  border: 1px solid var(--coc-border);
  border-radius: 8px;
}

.more-table .desc {
  max-width: 200px;
}

.level-tag {
  display: inline-block;
  padding: 2px 7px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
}

.level-tag.normal {
  background: rgba(103, 194, 58, 0.12);
  color: #67c23a;
}

.level-tag.medium {
  background: rgba(230, 162, 60, 0.15);
  color: #e6a23c;
}

.level-tag.major {
  background: rgba(245, 108, 108, 0.15);
  color: #f56c6c;
}

.empty-row {
  text-align: center;
  color: var(--coc-text-muted);
  font-size: 13px;
  padding: 16px 8px !important;
}

.danger-panel .panel-title { border-left: 4px solid #f56c6c; }
.mgmt-panel .panel-title { border-left: 4px solid #67c23a; }

.cat-tag {
  display: inline-block;
  padding: 2px 7px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
}

.cat-tag.safety {
  background: rgba(230, 162, 60, 0.12);
  color: #e6a23c;
}

.cat-tag.quality {
  background: rgba(64, 158, 255, 0.12);
  color: #409eff;
}

.status-tag.cancelled { background: rgba(144, 147, 153, 0.12); color: #909399; }

.project-dispatch-lower :deep(.desc) {
  max-width: none;
}
</style>
